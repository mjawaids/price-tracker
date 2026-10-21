// Still-to-buy reminders (hourly): one push to each person whose list items have
// waited 2+ days, between 10:00 and 20:00 their time, and then nothing until their
// list changes. Who is due, and the claim that stops a second send, are in claim.sql;
// this file hands the claimed reminders to OneSignal and records what happened
// (record.sql). The message says only how many things are left, and on how many lists
// when it's more than one.
//
//   SUPABASE_DB_URL=… ONESIGNAL_REST_API_KEY=… VITE_ONESIGNAL_APP_ID=… \
//     node --experimental-strip-types scripts/push/reminders.ts [--send]
//
// Without --send it's a dry run: who would be due is worked out and rolled back,
// nothing is sent or written (and the OneSignal settings aren't needed). Run by
// .github/workflows/push-reminders.yml. The log is public: counts and HTTP statuses
// only, never push aliases or OneSignal's answers (they can list aliases).
import { appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { lastJson, psql, runWithJson } from '../import/db.ts';

/** Items must have waited this long before a reminder. */
const MIN_AGE_HOURS = 48;
/** At least this long between two reminders, even when the list changed. */
const GAP_HOURS = 48;
/** Only from HOUR_FROM:00 to HOUR_TO:00 in the person's time zone. */
const HOUR_FROM = 10;
const HOUR_TO = 20;
const MAX_CLAIMS = 2000;
/** People per OneSignal request (each request carries one message). */
const CHUNK = 500;
/** Stop starting new sends after this; what's left is released for the next hour. */
const DEADLINE_MS = 5 * 60 * 1000;
const SITE_URL = 'https://spendless.ibexoft.com/';
/** OneSignal's answer when no one in the request has a live subscription. */
const ALL_UNSUBSCRIBED = 'All included players are not subscribed';

interface Due {
  log_id: number;
  push_alias: string;
  open_count: number;
  list_count: number;
}
type Outcome = 'sent' | 'failed' | 'release' | 'ambiguous';
interface Result {
  id: number;
  outcome: Outcome;
  onesignal_id?: string;
  error?: string;
}
type Sent =
  | { kind: 'sent'; id: string }
  | { kind: 'failed' | 'release' | 'ambiguous'; error: string };

function fail(msg: string): never {
  console.error(`push-reminders: ${msg}`);
  process.exit(1);
}

const send = process.argv.includes('--send');
const dbUrl = process.env.SUPABASE_DB_URL;
const appId = process.env.VITE_ONESIGNAL_APP_ID;
const apiKey = process.env.ONESIGNAL_REST_API_KEY;
// Tests point this at a local stand-in; production always uses OneSignal.
const apiUrl = process.env.ONESIGNAL_API_URL || 'https://api.onesignal.com/notifications';
if (!dbUrl) fail('SUPABASE_DB_URL must be set');
if (send && (!appId || !apiKey)) fail('VITE_ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY must be set to send');

const message = (n: number, lists: number) =>
  `You still have ${n} ${n === 1 ? 'thing' : 'things'} to buy${lists > 1 ? ` on ${lists} lists` : ''}. Shopping today?`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt: number) => Math.min(2000 * 2 ** attempt, 8000);

async function post(aliases: string[], text: string, deadline: number): Promise<Sent> {
  // The same key on every retry of this request, so a retry can't send it twice.
  const body = JSON.stringify({
    app_id: appId,
    target_channel: 'push',
    include_aliases: { external_id: aliases },
    headings: { en: 'SpendLess' },
    contents: { en: text },
    url: SITE_URL,
    // A newer reminder replaces an older one instead of stacking.
    web_push_topic: 'still_to_buy',
    data: { kind: 'still_to_buy' },
    idempotency_key: randomUUID(),
  });
  let last = 'unknown';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (Date.now() > deadline) return attempt === 0 ? { kind: 'release', error: 'out of time' } : { kind: 'ambiguous', error: last };
    let res: Response;
    try {
      res = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(8000),
      });
    } catch (e) {
      // It may or may not have reached OneSignal.
      last = `network: ${e instanceof Error ? e.name : 'error'}`;
      await sleep(backoff(attempt));
      continue;
    }
    if (res.status === 429) {
      // Refused, so nothing went out.
      last = 'http 429';
      const wait = Math.max((Number(res.headers.get('Retry-After')) || 0) * 1000, backoff(attempt));
      if (Date.now() + wait > deadline) return { kind: 'release', error: last };
      await sleep(wait);
      continue;
    }
    if (res.status >= 500) {
      last = `http ${res.status}`;
      await sleep(backoff(attempt));
      continue;
    }
    const payload = (await res.json().catch(() => ({}))) as { id?: unknown; errors?: unknown };
    if (res.ok && typeof payload.id === 'string' && payload.id) return { kind: 'sent', id: payload.id };
    if (res.ok) {
      const none = Array.isArray(payload.errors) && payload.errors.includes(ALL_UNSUBSCRIBED);
      return { kind: 'failed', error: none ? 'no subscribed device' : `not created: ${JSON.stringify(payload.errors ?? null)}` };
    }
    return { kind: 'failed', error: `http ${res.status}: ${JSON.stringify(payload)}` };
  }
  return { kind: 'ambiguous', error: last };
}

const here = resolve(import.meta.dirname);
const vars: Record<string, string | number> = {
  commit: send ? 'on' : 'off',
  min_age_hours: MIN_AGE_HOURS,
  gap_hours: GAP_HOURS,
  hour_from: HOUR_FROM,
  hour_to: HOUR_TO,
  max_claims: MAX_CLAIMS,
};
const out = await psql(dbUrl as string, [...Object.entries(vars).flatMap(([k, v]) => ['-v', `${k}=${v}`]), '-f', join(here, 'claim.sql')]).catch((e: Error) =>
  fail(e.message),
);
const claim = lastJson<{ checked: number; due: Due[] }>(out);
if (!claim || !Array.isArray(claim.due)) fail('no result from the database');

const lines: string[] = [];
if (!send) {
  lines.push('Still-to-buy reminders (dry run — rolled back, nothing sent)');
  lines.push(`With reminders on and awake now: ${claim.checked} · would get a reminder: ${claim.due.length}`);
} else {
  const deadline = Date.now() + DEADLINE_MS;
  const results: Result[] = [];
  const statuses = new Map<string, number>();
  // One message per text, so people with the same counts share a request.
  const byText = new Map<string, Due[]>();
  for (const d of claim.due) {
    const text = message(d.open_count, d.list_count);
    byText.set(text, [...(byText.get(text) ?? []), d]);
  }
  for (const [text, people] of byText) {
    for (let i = 0; i < people.length; i += CHUNK) {
      const batch = people.slice(i, i + CHUNK);
      const r = Date.now() > deadline ? ({ kind: 'release', error: 'out of time' } as const) : await post(batch.map((p) => p.push_alias), text, deadline);
      const label = r.kind === 'sent' ? 'sent' : `${r.kind} (${r.error.split(':')[0]})`;
      statuses.set(label, (statuses.get(label) ?? 0) + batch.length);
      for (const p of batch)
        results.push(r.kind === 'sent' ? { id: p.log_id, outcome: 'sent', onesignal_id: r.id } : { id: p.log_id, outcome: r.kind, error: r.error });
    }
  }
  const rec = results.length
    ? lastJson<Record<string, number>>(
        await runWithJson(dbUrl as string, '../push/record.sql', 'results.json', results).catch((e: Error) =>
          fail(`sent, but couldn't record the outcome: ${e.message}`),
        ),
      )
    : { sent: 0, failed: 0, released: 0, ambiguous: 0, swept: 0 };
  lines.push('Still-to-buy reminders');
  lines.push(`With reminders on and awake now: ${claim.checked} · due: ${claim.due.length}`);
  lines.push(`Sent: ${rec.sent} · refused: ${rec.failed} · released for next time: ${rec.released} · unknown (kept, not resent): ${rec.ambiguous} · old log rows removed: ${rec.swept}`);
  if (statuses.size) lines.push(`Outcomes: ${[...statuses].map(([k, v]) => `${k} ${v}`).join(' · ')}`);
}
console.log(lines.join('\n'));
const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) appendFileSync(summary, `### ${lines[0]}\n\n${lines.slice(1).join('  \n')}\n`);

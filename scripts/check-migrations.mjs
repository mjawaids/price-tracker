// Guardrail: SpendLess shares its Supabase project with other apps, so every
// migration must only create/alter/drop objects in the `spendless` schema.
// Usage: node scripts/check-migrations.mjs   (exits 1 on a violation)
//
// A file may opt out ONLY with an explicit marker comment explaining why:
//   -- migration-guard: allow-public <reason>
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = ['supabase/migrations', 'supabase/post-deploy'];
// Older files were applied by the old Bolt workflow and are skipped by the runner.
const LEGACY_BEFORE = '20261003000000';
const MARKER = /--\s*migration-guard:\s*allow-public\s+\S/i;

const STATEMENT =
  /\b(create|alter|drop)\s+(?:or\s+replace\s+)?(table|view|function|trigger|index|policy|type|sequence|schema)\b([^;]*)/gi;
const NAME_AFTER = /^\s*(?:if\s+(?:not\s+)?exists\s+)?("?[\w$]+"?)(\.)?/i;

const stripComments = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');

let violations = 0;
let checked = 0;

for (const dir of DIRS) {
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (file.slice(0, 14) < LEGACY_BEFORE) continue;
    const raw = readFileSync(join(dir, file), 'utf8');
    checked++;
    if (MARKER.test(raw)) {
      console.log(`skip ${dir}/${file} (allow-public marker)`);
      continue;
    }
    const sql = stripComments(raw);
    for (const m of sql.matchAll(STATEMENT)) {
      const [whole, verb, kind, rest] = m;
      const k = kind.toLowerCase();
      let ok;
      if (k === 'schema') {
        ok = /^\s*(?:if\s+(?:not\s+)?exists\s+)?spendless\b/i.test(rest);
      } else if (k === 'index' || k === 'policy' || k === 'trigger') {
        ok = /\bon\s+(?:only\s+)?spendless\./i.test(rest);
      } else {
        const n = rest.match(NAME_AFTER);
        ok = !!n && n[1].replace(/"/g, '').toLowerCase() === 'spendless' && n[2] === '.';
      }
      if (!ok) {
        violations++;
        const line = sql.slice(0, m.index).split('\n').length;
        console.log(`FAIL ${dir}/${file}:${line} ${verb.toUpperCase()} ${kind.toUpperCase()} must target the spendless schema:`);
        console.log(`     ${whole.trim().split('\n')[0].slice(0, 120)}`);
      }
    }
  }
}

console.log(`${checked} migration file(s) checked, ${violations} violation(s).`);
process.exit(violations ? 1 : 0);

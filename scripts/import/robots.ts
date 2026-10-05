// A small robots.txt reader (RFC 9309): the group for our product token, else `*`;
// the longest matching rule wins and Allow wins a tie; `*` and `$` are supported.

interface Rule {
  allow: boolean;
  path: string;
  re: RegExp;
}

export interface Robots {
  allowed: (path: string) => boolean;
  /** Seconds, if the group asks for one. */
  crawlDelay: number | null;
  /** Which group applied, for the log. */
  group: string;
}

const toRegExp = (path: string) =>
  new RegExp(
    '^' +
      path
        .split('')
        .map((ch, i) => (ch === '*' ? '.*' : ch === '$' && i === path.length - 1 ? '$' : ch.replace(/[.+?^${}()|[\]\\/]/g, '\\$&')))
        .join(''),
  );

export function parseRobots(text: string, token: string): Robots {
  // Groups: one or more user-agent lines, then rules.
  const groups: { agents: string[]; rules: Rule[]; delay: number | null }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [], delay: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === 'allow' || key === 'disallow') {
      if (!value) continue; // an empty Disallow allows everything
      current.rules.push({ allow: key === 'allow', path: value, re: toRegExp(value) });
    } else if (key === 'crawl-delay') {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) current.delay = n;
    }
  }
  // `token` is our product token ("SpendLessBot"); a group names it exactly.
  const t = token.toLowerCase();
  const mine = groups.filter((g) => g.agents.includes(t));
  const chosen = mine.length ? mine : groups.filter((g) => g.agents.includes('*'));
  const rules = chosen.flatMap((g) => g.rules);
  const delay = chosen.map((g) => g.delay).find((d) => d != null) ?? null;
  return {
    group: mine.length ? mine[0].agents.join(',') : chosen.length ? '*' : 'none',
    crawlDelay: delay,
    allowed(path: string) {
      let best: Rule | null = null;
      for (const r of rules) {
        if (!r.re.test(path)) continue;
        if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
      }
      return !best || best.allow;
    },
  };
}

// A small robots.txt reader (RFC 9309): the group for our product token, else `*`;
// the longest matching rule wins and Allow wins a tie; `*` and `$` are supported.
// Paths and rules are compared in one normal form (RFC 9309 §2.2.2), so "/%61pi/"
// can't slip past "Disallow: /api/".

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

const UNRESERVED = /^[A-Za-z0-9\-._~]$/;

/**
 * RFC 9309 §2.2.2: characters outside printable ASCII are percent-encoded (UTF-8);
 * percent-encoded unreserved characters are decoded ("%61" → "a", "%7E" → "~");
 * every other percent-encoding stays encoded, in upper-case hex ("%2f" → "%2F", which
 * is not "/"). Applied to both the rule patterns and the path being checked.
 */
export function normalizePath(path: string): string {
  let out = '';
  for (const ch of path) {
    const c = ch.codePointAt(0)!;
    if (c > 0x20 && c < 0x7f) out += ch;
    else {
      try {
        out += encodeURIComponent(ch);
      } catch {
        out += '%EF%BF%BD'; // a lone surrogate: U+FFFD
      }
    }
  }
  return out.replace(/%([0-9a-fA-F]{2})/g, (_m, hex: string) => {
    const decoded = String.fromCharCode(parseInt(hex, 16));
    return UNRESERVED.test(decoded) ? decoded : `%${hex.toUpperCase()}`;
  });
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
      const pattern = normalizePath(value);
      current.rules.push({ allow: key === 'allow', path: pattern, re: toRegExp(pattern) });
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
    allowed(rawPath: string) {
      const path = normalizePath(rawPath);
      let best: Rule | null = null;
      for (const r of rules) {
        if (!r.re.test(path)) continue;
        if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
      }
      return !best || best.allow;
    },
  };
}

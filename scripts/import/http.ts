// Polite HTTP for the importer: an honest user agent, robots.txt obeyed (and its
// Crawl-delay), one request at a time per site with a minimum gap, and a hard
// stop for the day when a site refuses us (403/429/captcha). We never work around
// a block: no other user agents, proxies or retries past a refusal.
//
// Redirects are followed by hand, one hop at a time, and each target is checked
// BEFORE it is requested: same site only, and only paths robots.txt allows.
import { parseRobots, type Robots } from './robots.ts';

export const BOT_TOKEN = 'SpendLessBot';
export const USER_AGENT = `${BOT_TOKEN}/1.0 (+https://spendless.ibexoft.com/bot)`;

/** The site refused us; stop this source for today. */
export class Blocked extends Error {
  code: string;
  constructor(code: string) {
    super(`blocked: ${code}`);
    this.code = code;
  }
}

/** robots.txt says no; the caller skips this URL. */
export class Disallowed extends Error {}

/** Our own per-run request limit (a backstop; adapters stop before it). */
export class CapReached extends Error {}

const CHALLENGE = /px-captcha|cf-chl-|<title>\s*(Just a moment|Attention Required|Access denied|Access to this page has been denied)/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_REDIRECTS = 5;
const isRedirect = (status: number) => status >= 300 && status < 400 && status !== 304;

/** Statuses we make up: the request wasn't (or couldn't be) completed. */
export const OFF_SITE = 598; // a redirect pointed at another site; not followed
export const TOO_MANY_REDIRECTS = 597;
export const NETWORK_ERROR = 599;

export interface Response {
  status: number;
  text: string;
  url: string;
  /** Redirect target, for a 3xx answer (never followed by raw()). */
  location?: string | null;
}

type Init = RequestInit & { headers?: Record<string, string> };

export class PoliteClient {
  readonly origin: string;
  private robots: Robots | null = null;
  private gapMs: number;
  private last = 0;
  private opts: { minGapMs?: number; timeoutMs?: number; maxRequests?: number };
  requests = 0;

  constructor(origin: string, opts: { minGapMs?: number; timeoutMs?: number; maxRequests?: number } = {}) {
    this.origin = new URL(origin).origin;
    this.opts = opts;
    this.gapMs = opts.minGapMs ?? 1000;
  }

  /**
   * Read robots.txt once. A missing file allows everything; a refusal is a block.
   * RFC 9309 says to follow up to five redirects for it (even to another host);
   * more than that, and we stop for the day rather than guess.
   */
  async init(log: (s: string) => void) {
    let res = await this.raw(`${this.origin}/robots.txt`);
    for (let hop = 0; isRedirect(res.status); hop++) {
      const next = res.location ? new URL(res.location, res.url) : null;
      if (hop >= MAX_REDIRECTS || !next || !/^https?:$/.test(next.protocol)) throw new Blocked('robots-redirects');
      res = await this.raw(next.toString());
    }
    if (res.status === 403 || res.status === 429 || res.status === 401) throw new Blocked(`robots-${res.status}`);
    if (res.status >= 500) throw new Blocked(`robots-${res.status}`); // RFC 9309: unreachable = assume disallowed
    this.robots = res.status === 200 ? parseRobots(res.text, BOT_TOKEN) : parseRobots('', BOT_TOKEN);
    const delay = this.robots.crawlDelay;
    if (delay != null) this.gapMs = Math.max(this.gapMs, Math.ceil(delay * 1000));
    log(`robots.txt ${res.status}: group "${this.robots.group}", gap ${this.gapMs} ms`);
  }

  allowed(url: string) {
    const u = new URL(url, this.origin);
    return u.origin === this.origin && (this.robots?.allowed(u.pathname + u.search) ?? false);
  }

  async get(url: string, headers: Record<string, string> = {}) {
    return this.request(url, { method: 'GET', headers });
  }

  async post(url: string, body: string | FormData, headers: Record<string, string> = {}) {
    return this.request(url, { method: 'POST', body, headers });
  }

  private async request(url: string, init: Init & { headers: Record<string, string> }): Promise<Response> {
    if (!this.robots) throw new Error('init() first');
    let target = new URL(url, this.origin).toString();
    let res: Response | null = null;
    for (let hop = 0; ; hop++) {
      // Checked before every request, redirect targets included.
      if (new URL(target).origin !== this.origin) return { status: OFF_SITE, text: '', url: target };
      if (!this.allowed(target)) throw new Disallowed(target);
      if (this.opts.maxRequests && this.requests >= this.opts.maxRequests) throw new CapReached('request-cap');
      res = await this.raw(target, init);
      if (res.status >= 500 && res.status !== 503) {
        await sleep(5000); // one quiet retry for a server hiccup
        res = await this.raw(target, init);
      }
      if (!isRedirect(res.status) || !res.location) break;
      if (hop >= MAX_REDIRECTS) return { status: TOO_MANY_REDIRECTS, text: '', url: target };
      // 303, and 301/302 after a POST, continue as a GET without the body (as browsers do).
      if (res.status === 303 || ((res.status === 301 || res.status === 302) && init.method === 'POST')) {
        init = { ...init, method: 'GET', body: undefined };
      }
      target = new URL(res.location, target).toString();
    }
    if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 503) throw new Blocked(`http-${res.status}`);
    if (CHALLENGE.test(res.text.slice(0, 5000))) throw new Blocked('challenge');
    return res;
  }

  /** Exactly one request (never follows a redirect), after the polite gap. */
  private async raw(url: string, init: Init = {}): Promise<Response> {
    const wait = this.last + this.gapMs - Date.now();
    if (wait > 0) await sleep(wait);
    this.last = Date.now();
    this.requests++;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.opts.timeoutMs ?? 30000);
    try {
      const r = await fetch(url, {
        ...init,
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/json;q=0.9,*/*;q=0.8', ...(init.headers || {}) },
        redirect: 'manual',
        signal: ctrl.signal,
      });
      if (isRedirect(r.status)) {
        await r.body?.cancel();
        return { status: r.status, text: '', url, location: r.headers.get('location') };
      }
      return { status: r.status, text: await r.text(), url };
    } catch (e) {
      return { status: NETWORK_ERROR, text: '', url: `${url} (${e instanceof Error ? e.name : 'error'})` };
    } finally {
      clearTimeout(timer);
      this.last = Date.now();
    }
  }
}

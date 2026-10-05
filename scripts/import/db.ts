// psql helpers for the importer. Data goes in as a JSON file read by a fixed SQL
// file (`\set x \`cat file\`` + `:'x'::jsonb`), never by building SQL strings.
// Errors carry psql's own message only: the command line holds the database URL.
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const here = resolve(import.meta.dirname);

export function psql(dbUrl: string, args: string[], cwd?: string): Promise<string> {
  return new Promise((ok, fail) => {
    execFile(
      'psql',
      [dbUrl, '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', ...args],
      { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) fail(new Error(`psql: ${(stderr || '').trim().split('\n').slice(0, 3).join(' | ').slice(0, 400) || 'failed'}`));
        else ok(stdout);
      },
    );
  });
}

/** The last non-empty output line, parsed as JSON. */
export const lastJson = <T>(out: string): T => JSON.parse(out.trim().split('\n').filter(Boolean).pop() ?? 'null') as T;

/** Run one of our SQL files with a JSON file beside it, in one transaction. */
export async function runWithJson(dbUrl: string, sqlFile: string, jsonName: string, data: unknown, vars: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'spendless-import-'));
  try {
    writeFileSync(join(dir, jsonName), JSON.stringify(data));
    const v = Object.entries(vars).flatMap(([k, val]) => ['-v', `${k}=${val}`]);
    return await psql(dbUrl, ['--single-transaction', ...v, '-f', join(here, sqlFile)], dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export const runFile = (dbUrl: string, sqlFile: string, vars: Record<string, string> = {}) =>
  psql(dbUrl, [...Object.entries(vars).flatMap(([k, val]) => ['-v', `${k}=${val}`]), '-f', join(here, sqlFile)]);

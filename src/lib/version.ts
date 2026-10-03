// Release version, injected at build time by the CI/CD pipeline
// (.github/workflows/ci-cd.yml). CalVer: YEAR.MONTH.N, e.g. 2026.10.0.
// Local builds show "dev".
export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION || 'dev';

/** Short git commit of the build, if known. */
export const APP_COMMIT: string = (import.meta.env.VITE_APP_COMMIT || '').slice(0, 7);

/** e.g. "v2026.10.0 (a1b2c3d)" or "dev". */
export const versionLabel = () =>
  APP_VERSION === 'dev' ? 'dev' : `v${APP_VERSION}${APP_COMMIT ? ` (${APP_COMMIT})` : ''}`;

/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_GA_ENABLE_IN_DEV?: string;
  /** Set by CI/CD: CalVer release, e.g. 2026.10.0 */
  readonly VITE_APP_VERSION?: string;
  /** Set by CI/CD: git commit SHA of the build */
  readonly VITE_APP_COMMIT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

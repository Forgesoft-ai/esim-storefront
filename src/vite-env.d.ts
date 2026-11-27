/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `production` to start there instead of Sandbox. See src/config.ts. */
  readonly VITE_ATLI_ENV?: string;
  /** `direct` to call Atli's API from the browser instead of through the proxy. */
  readonly VITE_ATLI_API?: string;
}

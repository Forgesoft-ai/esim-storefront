/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `sandbox` to start there instead of Production. See src/config.ts. */
  readonly VITE_ATLI_ENV?: string;
  /** `off` hides the Sandbox / Production switch and keeps the store on its default. */
  readonly VITE_ATLI_ENV_SWITCH?: string;
  /** `direct` to call Atli's API from the browser instead of through the proxy. */
  readonly VITE_ATLI_API?: string;
}

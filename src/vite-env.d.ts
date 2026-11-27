/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `staging` (the default) or `production`. See src/config.ts. */
  readonly VITE_ATLI_ENV?: string;
  /** Another API address for the development server to forward /api to (vite.config.ts). */
  readonly VITE_ATLI_API_BASE?: string;
  /** Overrides the environment's referral code. */
  readonly VITE_ATLI_REFERRAL_CODE?: string;
}

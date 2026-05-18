// ============================================================
// App Configuration
// ============================================================

/** Whether the app is in development mode */
export const IS_DEV = import.meta.env.DEV;

/** Whether the app is in production mode */
export const IS_PROD = import.meta.env.PROD;

/** API base URL */
export const API_BASE = "/api";

/** Auth token storage keys */
export const TOKEN_KEY = "foxybot_token";
export const TOKEN_EXPIRY_KEY = "foxybot_token_expiry";

/** Token expiry duration (7 days in seconds) */
export const TOKEN_DURATION_S = 7 * 24 * 60 * 60;

/** React Query defaults */
export const QUERY_DEFAULTS = {
  staleTime: 30_000,
  retry: 1,
} as const;

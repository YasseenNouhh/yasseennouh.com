declare global {
  interface Env {
    DB: D1Database;
    ASSETS: Fetcher;
    SPOONACULAR_KEY?: string;
    DEV_ADMIN_KEY?: string;
    CF_ACCESS_TEAM_DOMAIN?: string;
    CF_ACCESS_AUD?: string;
  }
}
export {};

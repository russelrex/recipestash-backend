export const CACHE_TTL = {
  // Recipes
  RECIPE_DETAIL: 30 * 60, // 30 minutes
  RECIPE_LIST: 5 * 60, // 5 minutes
  RECIPE_SEARCH: 60 * 60, // 1 hour
  RECIPE_TRENDING: 10 * 60, // 10 minutes

  // Users
  USER_PROFILE: 10 * 60, // 10 minutes
  USER_STATS: 5 * 60, // 5 minutes
  USER_RECIPES: 15 * 60, // 15 minutes
  USER_FOLLOWERS: 30 * 60, // 30 minutes

  // Posts/Feed
  POST_FEED: 2 * 60, // 2 minutes
  POST_DETAIL: 10 * 60, // 10 minutes

  // Auth
  JWT_BLACKLIST: 24 * 60 * 60, // 24 hours (max JWT TTL)
  OTP: 5 * 60, // 5 minutes
  RATE_LIMIT: 60, // 1 minute
  SESSION: 7 * 24 * 60 * 60, // 7 days

  // Config
  APP_CONFIG: 24 * 60 * 60, // 24 hours
  FEATURE_FLAGS: 10 * 60, // 10 minutes

  // Search
  SEARCH_RESULTS: 60 * 60, // 1 hour
  SEARCH_SUGGESTIONS: 24 * 60 * 60, // 24 hours
} as const;

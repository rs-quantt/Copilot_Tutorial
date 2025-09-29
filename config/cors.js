/**
 * CORS Configuration
 * Cross-Origin Resource Sharing settings for the application
 */

// Load environment variables
require("dotenv").config();

/**
 * Get allowed origins from environment variables
 * @returns {array|boolean} Array of allowed origins or true for all origins
 */
function getAllowedOrigins() {
  const environment = process.env.NODE_ENV || "development";

  if (environment === "development" || environment === "test") {
    return true; // Allow all origins in development and test
  }

  // Get origins from environment variable
  const corsOrigins = process.env.CORS_ORIGINS;
  if (corsOrigins) {
    return corsOrigins.split(",").map((origin) => origin.trim());
  }

  // Fallback to single origin
  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    return [corsOrigin];
  }

  // Default production origins (update these for your domains)
  return [
    "https://your-domain.com",
    "https://www.your-domain.com",
    "https://admin.your-domain.com",
  ];
}

const corsConfig = {
  development: {
    origin: true, // Allow all origins in development
    credentials: process.env.CORS_CREDENTIALS === "true" || true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cache-Control",
      "X-API-Key",
      "Access-Control-Allow-Origin",
    ],
    exposedHeaders: ["X-Total-Count", "X-Page-Count", "X-Request-ID"],
    maxAge: parseInt(process.env.CORS_MAX_AGE) || 86400, // 24 hours
  },

  production: {
    origin: getAllowedOrigins(),
    credentials: process.env.CORS_CREDENTIALS === "true" || true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cache-Control",
      "X-API-Key",
    ],
    exposedHeaders: ["X-Total-Count", "X-Page-Count", "X-Request-ID"],
    maxAge: parseInt(process.env.CORS_MAX_AGE) || 86400,
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  },

  test: {
    origin: true, // Allow all origins in test environment
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cache-Control",
      "X-API-Key",
    ],
    maxAge: 3600, // 1 hour for tests
  },
};

/**
 * Get CORS options based on environment
 * @param {string} environment - The current environment (development, production, test)
 * @returns {object} CORS configuration object
 */
function getCorsOptions(environment = "development") {
  const env = environment || process.env.NODE_ENV || "development";
  return corsConfig[env] || corsConfig.development;
}

/**
 * Custom origin validation function for more complex origin checking
 * @param {string} origin - The origin of the request
 * @param {function} callback - Callback function
 */
function validateOrigin(origin, callback) {
  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) return callback(null, true);

  const environment = process.env.NODE_ENV || "development";

  // In development, allow all origins
  if (environment === "development") {
    return callback(null, true);
  }

  // In production, check against whitelist
  const config = corsConfig[environment];
  if (config && config.origin && Array.isArray(config.origin)) {
    if (config.origin.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  } else {
    callback(new Error("CORS configuration error"));
  }
}

module.exports = {
  getCorsOptions,
  validateOrigin,
  corsConfig,
};

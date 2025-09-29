module.exports = {
  // Test environment
  testEnvironment: "node",

  // Test patterns
  testMatch: ["**/test/unit/**/*.test.js"],

  // Coverage configuration
  collectCoverageFrom: [
    "test/unit/**/*.test.js",
    "!**/node_modules/**",
    "!**/coverage/**",
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Coverage reporter
  coverageReporters: ["text", "lcov", "html"],

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,
};

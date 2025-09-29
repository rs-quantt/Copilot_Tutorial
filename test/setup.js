// Global test setup - suppress console output during tests
const originalConsole = { ...console };
global.console = {
  ...console,
  // Suppress console output in tests unless needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017/test_inventory";
process.env.JWT_SECRET = "test_jwt_secret";

// Global test utilities
global.mockRequest = (overrides = {}) => ({
  query: {},
  params: {},
  body: {},
  user: { name: "TestUser" },
  ...overrides,
});

global.mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// Mock next function
global.mockNext = () => jest.fn();

// Setup and teardown
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Global test setup
process.env.NODE_ENV = "test";
process.env.SECRET_KEY = "test-secret-key-for-testing-only-must-be-64-chars-long-minimum-guaranteed";
process.env.CONN_STRING = "mongodb://localhost:27017/julo_test";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.PORT_NUMBER = "3001";

export const testConfig = {
  port: 3001,
  secretKey: process.env.SECRET_KEY,
  connString: process.env.CONN_STRING,
  clientUrl: process.env.CLIENT_URL,
};
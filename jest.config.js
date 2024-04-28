/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testTimeout: 30000,
  testMatch: [
    '<rootDir>/pages/**/__test__/**/*.spec.js'
  ],
  globalSetup: "<rootDir>/scripts/setup.js",
  globalTeardown: "<rootDir>/scripts/teardown.js",
};

module.exports = config;
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  maxWorkers: '50%',
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/test/jest-unit-setup.ts'],
  verbose: false,
  silent: true,
  noStackTrace: true,
  detectOpenHandles: false,
  forceExit: true,
  moduleNameMapping: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/test/',
  ],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/test/',
    '<rootDir>/src/main.ts',
    '<rootDir>/src/app.module.ts',
  ],
};

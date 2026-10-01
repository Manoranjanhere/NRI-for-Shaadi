import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    // Type checking is done by `tsc`; full ts-jest type checking exhausts the heap.
    '^.+\\.(t|j)s$': ['ts-jest', { isolatedModules: true }],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/index.ts'],
  coverageDirectory: 'coverage',
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
};

export default config;

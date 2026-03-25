import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js'],
  testTimeout: 30000,
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  moduleNameMapper: {
    '^uuid$': '<rootDir>/tests/mocks/uuid.ts',
    '^@aws-sdk/client-s3$': '<rootDir>/tests/mocks/aws-s3.ts',
    '^@aws-sdk/s3-request-presigner$': '<rootDir>/tests/mocks/aws-s3-presigner.ts',
    '^@aws-sdk/client-sns$': '<rootDir>/tests/mocks/aws-sns.ts',
  },
};

export default config;

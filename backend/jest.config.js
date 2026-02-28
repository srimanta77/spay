module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
  '^.+\\.tsx?$': 'ts-jest',
  },
  transformIgnorePatterns: [
    // Explicitly transform all problematic ESM packages
    '/node_modules/(?!(uuid|@scure|@otplib|argon2|bcrypt|ioredis)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
};
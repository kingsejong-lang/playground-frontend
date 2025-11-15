const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/lib/grpc/generated/**',
    '!src/**/__tests__/**',
    '!src/app/**',
    '!src/components/**',
    '!src/contexts/**',
    '!src/lib/api.ts',
    '!src/lib/api-client.ts',
    '!src/lib/ansi-parser.tsx',
    '!src/lib/csp.ts',
    '!src/lib/history.ts',
    '!src/lib/errors/**',
    '!src/lib/grpc/**',
    '!src/lib/schemas/**',
    '!src/lib/types/**',
    '!src/lib/websocket/**',
    '!src/mocks/**',
    '!src/hooks/useCodeExecution.ts',
    '!src/hooks/useKeyboardShortcut.ts',
    '!src/hooks/useShare.ts',
    '!src/hooks/useToast.ts',
    '!src/hooks/useWebSocket.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 75,
      functions: 85,
      lines: 85,
    },
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/*.(test|spec).(ts|tsx|js|jsx)',
  ],
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config)

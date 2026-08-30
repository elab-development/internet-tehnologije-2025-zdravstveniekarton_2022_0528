const nextJest = require('next/jest');

/**
 * next/jest sam podesava sve sto Next.js aplikacija trazi:
 * prevodjenje TypeScript-a i JSX-a, ucitavanje .env fajlova, CSS module
 * i @/ putanje iz tsconfig.json. Zato konfiguracija ostaje ovako kratka.
 */
const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  // jsdom simulira browser, sto je neophodno za testiranje React komponenti.
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'components/**/*.tsx',
    '!lib/prisma.ts', // samo konekcija na bazu, nema logike za testiranje
  ],
};

module.exports = createJestConfig(config);

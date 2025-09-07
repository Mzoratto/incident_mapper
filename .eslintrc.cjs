module.exports = {
  root: true,
  ignorePatterns: ['**/dist/**', '**/.next/**', '**/out/**', '**/node_modules/**'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended']
    }
  ]
};


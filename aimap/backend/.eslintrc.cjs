module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: ['eslint:recommended'],
  ignorePatterns: ['node_modules'],
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
}

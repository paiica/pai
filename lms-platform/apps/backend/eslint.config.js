// ESLint v9 flat config — the backend never had one (only a stale
// @eslint/^9.0.0 pin with no eslint.config.js to match), so `npm run lint`
// failed outright rather than reporting anything. Kept intentionally
// minimal and non-blocking (`warn`, not `error`) rather than pulling in a
// full recommended-ruleset preset from a specific @typescript-eslint
// version's API and potentially surfacing a large backlog of pre-existing
// violations across the whole codebase in one go — `tsc --noEmit` in the
// type-check step already covers real type errors; this just catches the
// handful of things that doesn't (unused vars/imports).
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
      },
      globals: {
        process: "readonly",
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-unused-vars": "off", // superseded by the TS-aware version above
      "no-undef": "off", // TypeScript's own compiler already catches this, and this rule doesn't understand TS types/ambient globals
    },
  },
];

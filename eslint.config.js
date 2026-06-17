import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".actions-runner/**",
      "axelmond-mobile/**",
      "scripts/**",
      "scratch/**",
      "public/**",
      "*.cjs",
      "scan-secrets.js",
      "prisma/migrations/**",
      "tests/run-*.ts",
      "tests/load-report.ts",
      "tests/seed-*.ts",
      "tests/live-multi-user.spec.ts",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}", "server.ts", "vite.config.ts", "vitest.config.ts"],
    plugins: {
      "unused-imports": unusedImports,
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "prefer-const": "warn",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
);

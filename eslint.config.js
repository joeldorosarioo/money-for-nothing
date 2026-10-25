import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

const coreDependencyPatterns = [
  {
    group: [
      "react",
      "react/*",
      "react-dom",
      "react-dom/*",
      "@tanstack/*",
      "axios",
      "msw",
      "msw/*",
      "@mswjs/*",
      "socket.io-client",
      "idb"
    ],

    message: "Business types, rules and application services depend only on pure code and ports.",
  }, {
    group: [
      "**/api/**",
      "**/storage/**",
      "**/components/**",
      "**/hooks/**",
      "**/pages/**",
      "**/helpers/**",
      "**/mocks/**",
      "**/app/**"
    ],

    message: "Dependencies must point toward business rules and types.",
  },
];

export default defineConfig(
  {
    ignores: [
      ".cache/**",
      ".rebuild-checkpoints/**",
      "dist/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "public/mockServiceWorker.js"
    ]
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,

  {
    files: ["**/*.{ts,tsx}"],

    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },

    rules: {
      ...reactHooks.configs.recommended.rules,

      "react-refresh/only-export-components": [
        "warn", {
          allowConstantExport: true
        }
      ],

      "@typescript-eslint/no-unused-vars": [
        "error", {
          argsIgnorePattern: "^_"
        }
      ],

      "@typescript-eslint/consistent-type-imports": [
        "error", {
          prefer: "type-imports",
          fixStyle: "inline-type-imports"
        }
      ],

      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },

  {
    files: ["src/features/**/types/**/*.ts", "src/features/**/rules/**/*.ts", "src/features/**/application/**/*.ts"],

    rules: {
      "no-restricted-imports": [
        "error", {
          patterns: coreDependencyPatterns,
        }
      ],
    },
  },

  {
    files: ["src/features/**/rules/**/*.ts"],

    rules: {
      "no-restricted-imports": [
        "error", {
          patterns: [
            ...coreDependencyPatterns, {
              group: ["**/application/**"],
              message: "Business rules cannot depend on application services."
            },
          ],
        }
      ],
    },
  },

  {
    files: ["src/features/**/types/**/*.ts"],

    rules: {
      "no-restricted-imports": [
        "error", {
          patterns: [
            ...coreDependencyPatterns, {
              group: ["**/application/**", "**/rules/**"],
              message: "Business types cannot depend on executable rules or services."
            },
          ],
        }
      ],
    },
  },

  {
    files: ["src/shared/**/*.{ts,tsx}"],

    rules: {
      "no-restricted-imports": [
        "error", {
          patterns: [
            {
              group: ["**/features/**", "**/app/**"],
              message: "Shared primitives cannot depend on features or composition."
            }
          ],
        }
      ],
    },
  },

  {
    files: ["src/shared/ui/*.tsx"],

    rules: {
      "react-refresh/only-export-components": [
        "warn", {
          allowConstantExport: true,
          allowExportNames: ["buttonVariants", "tabsListVariants"],
        }
      ],
    },
  },

  {
    files: ["src/app/router.tsx"],

    rules: {
      "react-refresh/only-export-components": "off"
    },
  },

  {
    files: ["**/*.{js,mjs,cjs}"],
    ...tseslint.configs.disableTypeChecked,

    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly"
      }
    },
  }
);

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,

  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "visual",
      testMatch: /visual-regression.spec.ts/,

      use: {
        browserName: "chromium"
      }
    }, {
      name: "desktop",
      testIgnore: /visual-regression.spec.ts/,

      use: {
        browserName: "chromium",

        viewport: {
          width: 1440,
          height: 900
        }
      }
    }, {
      name: "mobile",
      testIgnore: /visual-regression.spec.ts/,

      use: {
        browserName: "chromium",

        viewport: {
          width: 390,
          height: 844
        },

        isMobile: true
      }
    },
  ],

  webServer: {
    command: "npm run dev -- --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});

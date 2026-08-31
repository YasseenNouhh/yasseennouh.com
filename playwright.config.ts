import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: /.*\.spec\.ts/,
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.TEST_BASE ?? "http://127.0.0.1:8787",
    viewport: { width: 1280, height: 1000 },
    trace: "retain-on-failure",
  },
});

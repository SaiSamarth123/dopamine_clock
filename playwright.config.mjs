import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = __dirname;

export default defineConfig({
  testDir: path.join(__dirname, "tests/e2e"),
  timeout: 60_000,
  retries: 0,
  use: {
    ...devices["Desktop Chrome"],
    headless: false,
  },
  projects: [
    {
      name: "chromium-extension",
      use: {
        launchOptions: {
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
          ],
        },
      },
    },
  ],
});

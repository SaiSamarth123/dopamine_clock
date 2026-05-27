import path from "path";
import { fileURLToPath } from "url";
import { test, expect, chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, "../..");

test.describe("Memento extension", () => {
  let context;
  let extensionId;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker", { timeout: 15_000 });
    }
    extensionId = background.url().split("/")[2];
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test("loads new tab page and shows setup or dashboard", async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/index.html`);
    await expect(page.locator("#dashboard")).toBeVisible();
    const drawer = page.locator("#settings-drawer");
    const gate = page.locator("#mission-gate");
    await expect(drawer.or(gate)).toBeVisible();
  });

  test("completes setup and shows mission gate", async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/index.html`);

    await page.locator("#input-birth").fill("1990-06-15");
    await page.locator("#input-life").fill("85");
    await page.locator("#settings-done-btn").click();

    await expect(page.locator("#settings-drawer")).toBeHidden({ timeout: 5000 });
    await expect(page.locator("#mission-gate")).toBeVisible();
    await expect(page.locator("#mission-input")).toBeVisible();
    await expect(page.locator("#life-grid")).toBeVisible();
    await expect(page.locator("#age-clock")).toBeVisible();
  });

  test("mission gate requires text before focus", async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/index.html`);

    await page.locator("#input-birth").fill("1995-03-20");
    await page.locator("#settings-done-btn").click();
    await expect(page.locator("#mission-gate")).toBeVisible({ timeout: 5000 });

    const startBtn = page.locator("#gate-start-focus");
    await expect(startBtn).toBeDisabled();

    await page.locator("#mission-input").fill("Write tests");
    await expect(startBtn).toBeEnabled();
  });

  test("block page validates host param", async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/block.html?host=not%20valid&delay=3`);
    await expect(page.locator("#block-open")).toBeDisabled();
    await expect(page.locator("#block-host")).toContainText("this site");
  });

  test("block page allows open after countdown for valid host", async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/block.html?host=youtube.com&delay=3`);
    await expect(page.locator("#block-host")).toContainText("youtube.com");
    await expect(page.locator("#block-open")).toBeDisabled();
    await page.waitForTimeout(3500);
    await expect(page.locator("#block-open")).toBeEnabled();
  });
});

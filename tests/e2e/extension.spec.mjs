import path from "path";
import { fileURLToPath } from "url";
import { test, expect, chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, "../..");

function extensionUrl(extensionId, page = "index.html") {
  return `chrome-extension://${extensionId}/${page}`;
}

/** Track console errors and uncaught exceptions during a test. */
function attachErrorCollector(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

function assertNoErrors(errors, label) {
  const filtered = errors.filter(
    (e) =>
      !e.includes("Failed to load resource") &&
      !e.includes("net::ERR_") &&
      !e.includes("dev.to")
  );
  expect(filtered, `${label} should have no page errors`).toEqual([]);
}

async function clearExtensionStorage(page) {
  await page.evaluate(() => chrome.storage.local.clear());
}

/** Complete first-run setup when the settings drawer is open; no-op if already configured. */
async function ensureSetupComplete(page, birthDate = "1990-06-15") {
  const drawerOpen = await page.locator("#settings-drawer.is-open").isVisible();
  if (drawerOpen) {
    await page.locator("#input-birth").fill(birthDate);
    await page.locator("#input-life").fill("85");
    await page.locator("#settings-done-btn").click();
    await expect(page.locator("#settings-drawer")).toBeHidden({ timeout: 5000 });
  }
  await expect(page.locator("#dashboard")).toBeVisible({ timeout: 5000 });
}

async function goToTimerView(page) {
  await page.locator("#view-nav-timer").click();
  await expect(page.locator("#view-timer")).toBeVisible();
}

async function openSettings(page) {
  await page.locator("#edit-btn").click();
  await expect(page.locator("#settings-drawer.is-open")).toBeVisible();
}

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

  test("loads new tab page without JS errors", async () => {
    const page = await context.newPage();
    const errors = attachErrorCollector(page);
    await page.goto(extensionUrl(extensionId));
    await expect(page.locator("#dashboard")).toBeVisible();
    await expect(page.locator("#view-clock")).toBeVisible();
    await expect(page.locator(".view-nav")).toBeVisible();
    assertNoErrors(errors, "dashboard load");
  });

  test("completes setup and shows clock view", async () => {
    const page = await context.newPage();
    const errors = attachErrorCollector(page);
    await page.goto(extensionUrl(extensionId));
    await ensureSetupComplete(page, "1990-06-15");
    await expect(page.locator("#life-grid")).toBeVisible();
    await expect(page.locator("#age-clock")).toBeVisible();
    await expect(page.locator("#macro-remaining")).toBeVisible();
    await expect(page.locator("#today-remaining")).toBeVisible();
    assertNoErrors(errors, "setup flow");
  });

  test("clock view fills the viewport", async () => {
    const page = await context.newPage();
    await page.goto(extensionUrl(extensionId));
    await ensureSetupComplete(page);

    const dashboardHeight = await page.locator("#dashboard").evaluate((el) =>
      Math.round(el.getBoundingClientRect().height)
    );
    const viewportHeight = await page.evaluate(() => Math.round(window.innerHeight));
    expect(Math.abs(dashboardHeight - viewportHeight)).toBeLessThanOrEqual(2);
  });

  test("nav switches between clock, timer, and insights views", async () => {
    const page = await context.newPage();
    await page.goto(extensionUrl(extensionId));
    await ensureSetupComplete(page);

    await page.locator("#view-nav-timer").click();
    await expect(page.locator("#view-timer")).toBeVisible();
    await expect(page.locator("#mission-input")).toBeVisible();

    await page.locator("#view-nav-insights").click();
    await expect(page.locator("#view-insights")).toBeVisible();
    await expect(page.locator("#trinode-panel")).toBeVisible();
    await expect(page.locator("#view-timer")).toBeHidden();

    await page.locator("#view-nav-clock").click();
    await expect(page.locator("#view-clock")).toBeVisible();
    await expect(page.locator("#view-insights")).toBeHidden();
  });

  test("settings validation shows errors on the life tab", async () => {
    const page = await context.newPage();
    await page.goto(extensionUrl(extensionId));
    await ensureSetupComplete(page);
    await openSettings(page);

    await page.locator("#input-birth").fill("");
    await page.locator("#settings-done-btn").click();
    await expect(page.locator("#setup-error")).toBeVisible();
    await expect(page.locator("#setup-error")).toContainText(/birth date/i);
    await expect(page.locator("#settings-panel-life")).toBeVisible();

    const futureYear = new Date().getFullYear() + 2;
    await page.locator("#input-birth").fill(`${futureYear}-01-01`);
    await page.locator("#settings-done-btn").click();
    await expect(page.locator("#setup-error")).toContainText(/future/i);

    await page.locator("#input-birth").fill("1990-01-01");
    await page.locator("#input-life").fill("30");
    await page.locator("#settings-done-btn").click();
    await expect(page.locator("#setup-error")).toContainText(/life expectancy/i);
  });

  test("appearance settings apply theme live", async () => {
    const page = await context.newPage();
    await page.goto(extensionUrl(extensionId));
    await ensureSetupComplete(page);
    await openSettings(page);

    await page.locator("#settings-tab-appearance").click();
    await page.locator('[data-theme-id="forest"]').click();
    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()
    );
    expect(bg.toLowerCase()).toBe("#0d1210");

    await page.locator('[data-font-id="mono"]').click();
    const fontFamily = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily
    );
    expect(fontFamily.toLowerCase()).toMatch(/mono|menlo|ui-monospace/);

    await page.locator("#settings-done-btn").click();
    await expect(page.locator("#settings-drawer")).toBeHidden({ timeout: 5000 });
  });

  test("timer view requires mission text before focus", async () => {
    const page = await context.newPage();
    await page.goto(extensionUrl(extensionId));
    await ensureSetupComplete(page);

    await page.locator("#view-nav-timer").click();
    await expect(page.locator("#view-timer")).toBeVisible();

    const startBtn = page.locator("#gate-start-focus");
    await expect(startBtn).toBeDisabled();

    await page.locator("#mission-input").fill("Write tests");
    await expect(startBtn).toBeEnabled();
  });

  test("intentional browse shows grace banner", async () => {
    const page = await context.newPage();
    await page.goto(extensionUrl(extensionId));
    await ensureSetupComplete(page);
    await goToTimerView(page);

    await page.locator("#gate-intentional-browse").click();
    await expect(page.locator("#browse-grace-banner")).toBeVisible();
    await expect(page.locator("#browse-grace-time")).toContainText(/\d:\d{2}/);
  });

  test("timer presets switch duration display", async () => {
    const page = await context.newPage();
    await page.goto(extensionUrl(extensionId));
    await ensureSetupComplete(page);
    await goToTimerView(page);

    await page.locator('[data-preset="extreme"]').click();
    await expect(page.locator("#micro-display")).toContainText("50:00");

    await page.locator('[data-preset="break"]').click();
    await expect(page.locator("#micro-display")).toContainText("5:00");

    await page.locator('[data-preset="deep"]').click();
    await expect(page.locator("#micro-display")).toContainText("25:00");
  });

  test("timer start, pause, and reset work", async () => {
    const page = await context.newPage();
    const errors = attachErrorCollector(page);
    await page.goto(extensionUrl(extensionId));
    await ensureSetupComplete(page);
    await goToTimerView(page);

    await page.locator("#micro-reset").click();
    await page.locator("#micro-start").click();
    await expect(page.locator("#micro-display")).toHaveClass(/is-running/, {
      timeout: 10_000,
    });
    await expect(page.locator("#micro-start")).toBeDisabled();

    await page.locator("#micro-pause").click();
    await expect(page.locator("#micro-display")).not.toHaveClass(/is-running/);

    await page.locator("#micro-reset").click();
    await expect(page.locator("#micro-display")).toContainText("25:00");
    assertNoErrors(errors, "timer controls");
  });

  test("focus session completion updates stats via background", async () => {
    const page = await context.newPage();
    await page.goto(extensionUrl(extensionId));
    await ensureSetupComplete(page);

    await page.evaluate(async () => {
      const { mementoConfig } = await chrome.storage.local.get("mementoConfig");
      if (mementoConfig) {
        mementoConfig.mission = "Ship feature";
        await chrome.storage.local.set({ mementoConfig });
      }
      await chrome.storage.local.set({
        mementoMicroTimer: {
          status: "running",
          presetSeconds: 1500,
          remainingMs: 0,
          endTimestamp: Date.now() - 1000,
          completedAt: null,
        },
      });
    });

    await page.reload();
    await goToTimerView(page);
    await expect(page.locator("#focus-stats")).toContainText(/focus block/i, {
      timeout: 15_000,
    });
    await expect(page.locator("#focus-stats")).toContainText(/25 min/i);
  });

  test("insights view is unlocked without a focus gate", async () => {
    const page = await context.newPage();
    await page.goto(extensionUrl(extensionId));
    await ensureSetupComplete(page);

    await page.locator("#view-nav-insights").click();
    await expect(page.locator("#trinode-panel")).not.toHaveClass(/is-locked/);
    await expect(page.locator("#trinode-reshuffle")).toBeEnabled();
    await expect(page.locator("#trinode-content")).not.toBeEmpty();
  });

  test("legacy dopamineClockConfig migrates on load", async () => {
    const page = await context.newPage();
    await page.goto(extensionUrl(extensionId));
    await clearExtensionStorage(page);
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        dopamineClockConfig: {
          setupComplete: true,
          currentAge: 35,
          lifeExpectancy: 85,
        },
      });
    });
    await page.reload();

    await expect(page.locator("#settings-drawer.is-open")).toBeHidden({ timeout: 5000 });
    await expect(page.locator("#view-clock")).toBeVisible();
    await expect(page.locator("#life-grid")).toBeVisible();

    const keys = await page.evaluate(async () => {
      const all = await chrome.storage.local.get(null);
      return Object.keys(all);
    });
    expect(keys).toContain("mementoConfig");
    expect(keys).not.toContain("dopamineClockConfig");
  });

  test("timer state syncs across two tabs", async () => {
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await pageA.goto(extensionUrl(extensionId));
    await pageB.goto(extensionUrl(extensionId));
    await ensureSetupComplete(pageA);
    await ensureSetupComplete(pageB);

    await pageA.locator("#view-nav-timer").click();
    await pageA.locator("#mission-input").fill("Sync test");
    await pageA.locator("#micro-start").click();
    await expect(pageA.locator("#micro-display")).toHaveClass(/is-running/);

    await pageB.locator("#view-nav-timer").click();
    await expect(pageB.locator("#micro-display")).toHaveClass(/is-running/, {
      timeout: 5000,
    });
  });

  test("running timer storage matches badge display rules", async () => {
    const page = await context.newPage();
    await page.goto(extensionUrl(extensionId));
    await ensureSetupComplete(page);
    await goToTimerView(page);
    await page.locator("#micro-reset").click();
    await page.locator("#micro-start").click();
    await expect(page.locator("#micro-display")).toHaveClass(/is-running/, {
      timeout: 10_000,
    });

    const badgeText = await page.evaluate(async () => {
      const S = globalThis.MementoShared;
      const { mementoMicroTimer: micro } = await chrome.storage.local.get(
        "mementoMicroTimer"
      );
      if (!micro || micro.status !== "running") return "";
      const remaining = S.getMicroRemaining(micro);
      return S.shouldShowBadge(micro, remaining) ? S.formatBadgeText(remaining) : "";
    });

    expect(badgeText).not.toBe("");
    expect(Number.parseInt(badgeText, 10)).toBeGreaterThan(0);
  });
});

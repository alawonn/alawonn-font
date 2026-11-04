import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

async function open(page) {
  await page.goto("./");
  await page.evaluate(() => document.fonts.ready);
}

test("the hero is live text in the packaged font", async ({ page }) => {
  await open(page);
  const hero = page.getByRole("heading", { level: 1 });
  await expect(hero).toHaveText("alawonn");
  expect(await page.evaluate(() => document.fonts.check('48px "Alawonn"'))).toBe(true);
  const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.family.replace(/"/g, "") === "Alawonn").map((f) => f.status));
  expect(loaded).toEqual(["loaded"]);
  // Rendering with the font must differ from the fallback.
  const widths = await page.evaluate(() => {
    const measure = (family) => {
      const span = document.createElement("span");
      span.style.cssText = `font: 100px ${family}; position: absolute; white-space: nowrap`;
      span.textContent = "alawonn";
      document.body.append(span);
      const width = span.getBoundingClientRect().width;
      span.remove();
      return width;
    };
    return [measure('"Alawonn", monospace'), measure("monospace")];
  });
  expect(Math.abs(widths[0] - widths[1])).toBeGreaterThan(20);
});

test("version, license and downloads are accurate", async ({ page }) => {
  await open(page);
  await expect(page.locator(".hero-meta")).toContainText(`Version ${pkg.version}`);
  await expect(page.locator(".hero-meta")).toContainText("SIL Open Font License 1.1");
  const base = `https://github.com/alawonn/alawonn-font/releases/download/v${pkg.version}/`;
  await expect(page.locator("[data-download=ttf]")).toHaveAttribute("href", `${base}Alawonn-Regular.ttf`);
  await expect(page.locator("[data-download=woff2]")).toHaveAttribute("href", `${base}Alawonn-Regular.woff2`);
  await expect(page.locator("[data-download=zip]")).toHaveAttribute("href", `${base}alawonn-font-${pkg.version}.zip`);
});

test("the type tester takes any text and the size control changes it", async ({ page }) => {
  await open(page);
  const tester = page.getByLabel("Your text, shown in Alawonn");
  await tester.fill("Hello Łódź €12");
  await expect(tester).toHaveValue("Hello Łódź €12");
  await expect(tester).toHaveCSS("font-family", /Alawonn/);
  const slider = page.getByRole("slider", { name: "Size" });
  await slider.evaluate((input) => {
    input.value = "40";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(tester).toHaveCSS("font-size", "40px");
  await expect(page.locator("#size-output")).toHaveText("40 px");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(tester).toHaveCSS("font-size", "41px");
});

test("every character is listed and searchable", async ({ page }) => {
  await open(page);
  const grid = page.getByRole("list", { name: "Characters" });
  await expect(grid.getByRole("button")).toHaveCount(378);
  await expect(page.locator("#char-count")).toHaveText("378 characters");
  const search = page.getByLabel("Find a character");
  await search.fill("euro");
  await expect(grid.getByRole("button")).toHaveCount(1);
  await expect(grid.getByRole("button")).toHaveText("€");
  await search.fill("U+00E9");
  await expect(grid.getByRole("button")).toHaveText("é");
  await search.fill("é");
  await expect(grid.getByRole("button", { name: /e with acute, U\+00E9/ })).toBeVisible();
  await search.fill("");
  await page.getByRole("button", { name: "Combining marks" }).click();
  await expect(grid.getByRole("button")).toHaveCount(15);
  await grid.getByRole("button").first().click();
  await expect(page.locator("#char-detail-code")).toHaveText("U+0300");
  await expect(page.locator("#char-detail-name")).toHaveText("combining grave accent");
});

test("package manager tabs work with the keyboard", async ({ page }) => {
  await open(page);
  const npm = page.getByRole("tab", { name: "npm", exact: true });
  await npm.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "pnpm", exact: true })).toBeFocused();
  await expect(page.locator("#pm-command")).toHaveText("pnpm add alawonn-font");
  await page.keyboard.press("End");
  await expect(page.locator("#pm-command")).toHaveText("deno add npm:alawonn-font");
});

test("copy buttons confirm or ask for a manual copy", async ({ page, browserName, context }) => {
  if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  const button = page.locator(".hero .copy");
  await button.click();
  await expect(button).toHaveText(/Copied|Press Ctrl\+C/);
  if (browserName === "chromium") expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("npm install alawonn-font");
});

test("theme buttons switch and remember the theme", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("the theme change rises in with React Theme Tide", async ({ page, browserName }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  await open(page);
  await page.getByRole("button", { name: "Dark" }).click();
  if (browserName === "chromium") {
    // Chromium animates the tide through a View Transition.
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBeGreaterThan(0);
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(0, 0, 0)", { timeout: 10_000 });
});

test("the phone menu opens, moves focus and closes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 760 });
  await open(page);
  const button = page.getByRole("button", { name: "Menu" });
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const menu = page.locator("#menu-list");
  await expect(menu.getByRole("link")).toHaveCount(3);
  await expect(menu.getByRole("link", { name: "Try it" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("link", { name: "Characters" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(button).toBeFocused();
  await button.click();
  await menu.getByRole("link", { name: "Install" }).click();
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/#install$/);
});

test("the desktop header shows links, not the menu", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page);
  await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
  await expect(page.locator(".bar-nav").getByRole("link", { name: "Characters" })).toBeVisible();
});

test("no sideways scrolling at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await open(page);
  await page.evaluate(() => window.scrollTo(400, 0));
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
  const hero = await page.locator(".hero-word").evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return range.getBoundingClientRect().right;
  });
  expect(hero).toBeLessThanOrEqual(320);
});

test("keyboard users can reach the tester first", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "WebKit doesn't tab to links by default");
  await open(page);
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to the type tester" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
});

test("reduced motion turns off smooth scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
});

test("the font downloads once and the page stays small", async ({ page }) => {
  const responses = [];
  page.on("response", (response) => responses.push(response));
  await open(page);
  await page.waitForLoadState("networkidle");
  const fonts = responses.filter((r) => r.url().endsWith(".woff2"));
  expect(fonts).toHaveLength(1);
  let js = 0;
  let css = 0;
  for (const response of responses) {
    const size = (await response.body().catch(() => Buffer.alloc(0))).length;
    if (response.url().endsWith(".js")) js += size;
    if (response.url().endsWith(".css")) css += size;
  }
  expect(js).toBeLessThan(40_000);
  expect(css).toBeLessThan(16_000);
  expect((await fonts[0].body()).length).toBeLessThan(60_000);
});

for (const theme of ["light", "dark"]) {
  test(`no accessibility violations in the ${theme} theme`, async ({ page }) => {
    test.setTimeout(120_000); // axe walks every character button
    await page.emulateMedia({ colorScheme: theme });
    await open(page);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
}

test("no accessibility violations with more contrast", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ contrast: "more" });
  await open(page);
  const results = await new AxeBuilder({ page }).withTags(["wcag2aa"]).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test.describe("visual", () => {
  test.skip(({ browserName, isMobile }) => browserName !== "chromium" || isMobile, "snapshots are taken in desktop Chromium");
  for (const theme of ["light", "dark"]) {
    test(`specimens in the ${theme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page);
      await expect(page.locator(".hero-word")).toHaveScreenshot(`hero-${theme}.png`);
      await expect(page.locator("#alphabet-title + p")).toHaveScreenshot(`uppercase-${theme}.png`);
      await expect(page.locator(".accents")).toHaveScreenshot(`accents-${theme}.png`);
      await expect(page.locator(".combining")).toHaveScreenshot(`combining-${theme}.png`);
    });
  }
});

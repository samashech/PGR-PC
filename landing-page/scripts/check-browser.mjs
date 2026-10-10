import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_PATH || undefined,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const artifacts = process.env.QA_ARTIFACTS || "/tmp/pgr-website-qa";
await mkdir(artifacts, { recursive: true });
try {
  await page.goto(process.env.QA_URL || "http://127.0.0.1:5174");
  await page
    .getByRole("heading", { name: "Pgame Launcher", level: 1 })
    .waitFor();
  await page.keyboard.press("Tab");
  assert.equal(
    await page
      .getByRole("link", { name: "Skip to content" })
      .evaluate((el) => document.activeElement === el),
    true,
  );
  await page.keyboard.press("Enter");
  await page.getByRole("link", { name: "Preview", exact: true }).click();
  assert.equal(new URL(page.url()).hash, "#preview");
  for (const name of ["Dark Mono", "Modern OLED", "Wood & Stereo"]) {
    await page.getByRole("button", { name, exact: true }).click();
    assert.equal(
      await page
        .getByRole("button", { name, exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.waitForFunction(() => {
      const image = document.querySelector(".showcase-window img");
      return image.complete && image.naturalWidth > 0;
    });
    assert.match(
      await page.locator(".showcase-window img").getAttribute("alt"),
      new RegExp(name),
    );
  }
  const question = page
    .locator("summary")
    .filter({ hasText: "Does it include games?" });
  await question.focus();
  await page.keyboard.press("Enter");
  assert.equal(await question.evaluate((el) => el.parentElement.open), true);
  await page.keyboard.press("Enter");
  assert.equal(await question.evaluate((el) => el.parentElement.open), false);
  for (const link of await page.locator('a[target="_blank"]').all()) {
    assert.match(await link.getAttribute("rel"), /noopener/);
    assert.match(
      await link.getAttribute("href"),
      /^https:\/\/github.com\/samashech\/PGR-PC/,
    );
  }
  assert.equal(await page.locator("h1").count(), 1);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: `${artifacts}/desktop.png`, fullPage: true });
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => scrollTo(0, 0));
    assert.equal(
      await page.evaluate(
        () =>
          [...document.querySelectorAll("main *, nav *")].filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width && (r.right > innerWidth + 1 || r.left < -1);
          }).length,
      ),
      0,
      `overflow at ${width}`,
    );
    await page.screenshot({
      path: `${artifacts}/mobile-${width}.png`,
      fullPage: true,
    });
  }
  assert.deepEqual(errors, []);
  console.log(`Website checks passed. Screenshots: ${artifacts}`);
} finally {
  await browser.close();
}

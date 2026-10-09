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
  viewport: { width: 1280, height: 820 },
  reducedMotion: "reduce",
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const artifacts = process.env.QA_ARTIFACTS || "/tmp/retrox-qa";
await mkdir(artifacts, { recursive: true });
try {
  await page.goto(process.env.QA_URL || "http://127.0.0.1:1420");
  await page.getByText("An empty shelf. Endless possibilities.").waitFor();
  await page.getByRole("button", { name: "Add your first game" }).click();
  await page.getByText(/Open the desktop app/).waitFor();
  // Only the native bridge is mocked; these checks exercise the rendered app.
  await page.addInitScript(() => {
    window.isTauri = true;
    const titles = [
      "Celeste",
      "Disco Elysium",
      "Hollow Knight",
      "Outer Wilds",
      "Portal 2",
      "Stardew Valley",
      "Tunic",
      "Hades",
    ];
    let games =
      JSON.parse(localStorage.getItem("test-games") || "null") ||
      titles.map((title, i) => ({
        id: String(i),
        title,
        path: String(i),
        imageHeight: 250,
        cover_url: null,
        playtime: i * 1.75,
        completion: 0,
        is_steam: i % 2 === 0,
        favorite: i === 2,
        last_played: i === 3 ? 100 : null,
      }));
    window.testCalls = [];
    window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} };
    window.__TAURI_INTERNALS__ = {
      transformCallback: () => 1,
      convertFileSrc: (path) => path,
      invoke: async (cmd, args) => {
        window.testCalls.push({ cmd, args });
        if (cmd === "get_games") return structuredClone(games);
        if (cmd === "get_settings")
          return { grid_size: 200, pre_launch_path: null };
        if (cmd === "set_game_favorite") {
          games.find((g) => g.id === args.id).favorite = args.favorite;
          localStorage.setItem("test-games", JSON.stringify(games));
        }
        if (cmd === "launch_game")
          throw "Could not launch game: executable is missing";
        if (cmd === "scan_steam_games") {
          await new Promise((r) => setTimeout(r, 200));
          return 0;
        }
        if (cmd === "remove_game")
          games = games.filter((g) => g.id !== args.id);
        if (cmd === "update_game_position")
          Object.assign(
            games.find((g) => g.id === args.id),
            { x: args.x, y: args.y },
          );
        if (cmd === "update_game_size")
          Object.assign(
            games.find((g) => g.id === args.id),
            { imageWidth: args.width, imageHeight: args.height },
          );
        return null;
      },
    };
  });
  await page.reload();
  await page.locator(".library-card").nth(7).waitFor();
  await page.screenshot({ path: `${artifacts}/library-desktop.png` });
  const search = page.getByRole("textbox", { name: "Search games" });
  await search.fill(" PORTAL ");
  assert.equal(await page.locator(".library-card").count(), 1);
  await page.getByRole("button", { name: "Local", exact: true }).click();
  await page.getByText("No games match this view.").waitFor();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page
    .getByRole("button", { name: "Favorite Celeste", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Unfavorite Celeste", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Unfavorite Celeste", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  assert.equal(await page.locator(".library-card").count(), 2);
  await page.getByRole("button", { name: "All games", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Sort games" })
    .selectOption("playtime");
  assert.equal(
    await page.locator(".card-details h2").first().textContent(),
    "Hades",
  );
  await page
    .getByRole("combobox", { name: "Sort games" })
    .selectOption("recent");
  assert.equal(
    await page.locator(".card-details h2").first().textContent(),
    "Outer Wilds",
  );
  await page
    .getByRole("button", { name: "Play Outer Wilds", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("alert")
    .filter({ hasText: "executable is missing" })
    .waitFor();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.getByRole("button", { name: "Scan Steam" }).click();
  await page.getByText("No new games added.", { exact: false }).waitFor();
  await page.keyboard.press("Control+k");
  assert.equal(
    await search.evaluate((e) => document.activeElement === e),
    true,
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Modern OLED" }).click();
  await page.reload();
  assert.match(await page.locator(".tv-case").getAttribute("class"), /theme-3/);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Dark Mono" }).click();
  await page.screenshot({ path: `${artifacts}/settings-dark.png` });
  await page.getByRole("button", { name: "Wood & Stereo" }).click();
  await page.getByRole("button", { name: "Library", exact: true }).click();
  for (const width of [800, 480, 390]) {
    await page.setViewportSize({ width, height: 800 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `page overflow at ${width}`,
    );
    assert.equal(
      await page
        .locator(".crt-content")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
      true,
      `library overflow at ${width}`,
    );
    await page.screenshot({ path: `${artifacts}/library-${width}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.getByRole("button", { name: "Arrange", exact: true }).click();
  const bounds = await page
    .locator(".layout-canvas > div")
    .first()
    .boundingBox();
  await page.mouse.move(bounds.x + 70, bounds.y + 65);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 95, bounds.y + 95, { steps: 5 });
  await page.mouse.up();
  await page.waitForFunction(() =>
    window.testCalls.some((call) => call.cmd === "update_game_position"),
  );
  await page.getByRole("button", { name: "Done arranging" }).click();
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .locator(".library-card")
    .first()
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll(".library-card").length === 7,
  );
  assert.equal(
    await page.evaluate(() =>
      window.testCalls.some((call) => call.cmd === "read_image_file"),
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(`Browser checks passed. Screenshots: ${artifacts}`);
} finally {
  await browser.close();
}

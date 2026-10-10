# PGR-PC website

The landing page keeps the original monochrome grid, centered download card, retro headings, and stacked feature cards. It includes a three-theme launcher preview, installation guide, and native expandable FAQs.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

Download buttons link to GitHub Releases so visitors can choose an available installer. Preview images in `public/previews/` show the actual launcher with a sample library; games are not bundled. Only the selected screenshot is rendered, and images load lazily with reserved dimensions.

## Browser checks

Start a development or preview server, then run:

```sh
QA_URL=http://127.0.0.1:5173 node scripts/check-browser.mjs
```

The check requires Playwright. Set `PLAYWRIGHT_MODULE` to an existing Playwright module path and `BROWSER_PATH` to an installed Chromium browser if needed. It checks theme previews, image loading, keyboard access, FAQ expansion, outgoing links, and layouts down to 320px. Screenshots are saved under `/tmp/pgr-website-qa`; override with `QA_ARTIFACTS`.

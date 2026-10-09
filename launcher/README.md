# Pgame Launcher 📺

[![Website](https://img.shields.io/badge/Website-pgr--pc56.vercel.app-blue?style=for-the-badge)](https://pgr-pc56.vercel.app)

Welcome to **Pgame Launcher**—a blazing-fast, lightweight game library manager that abandons boring generic UI in favor of highly immersive, physical display themes. 

Whether you want to launch your games through the warm glow of a 70s wooden television set or a sleek modern metallic monitor, Pgame Launcher turns your game library into a tactile, interactive experience.

## ✨ Features

- **Immersive Physical Themes:** Cycle through beautifully crafted, shader-driven display aesthetics:
  - 🪵 **Theme 1:** Vintage Wooden TV (Warm, retro 70s/80s vibe)
  - 📻 **Theme 2:** Classic 90s CRT Monitor (Nostalgic plastic casing)
  - 💻 **Theme 3:** Modern Metallic Display (Sleek, minimalist, and clean)
- **Universal Compatibility:** Seamlessly integrates with official Steam games as well as independent, DRM-free, or standalone executables. If it runs on your PC, you can add it.
- **Auto-Scanning:** Import games from standard Steam install locations or scan a chosen folder for Windows executables. 
- **Playtime Tracking:** Record time spent in directly launched local game processes.
- **Custom Cover Art:** Upload custom box art for any game to make your library uniquely yours.
- **Efficient Cover Loading:** Lazy-loaded cover images use the native asset protocol, without repeatedly encoding the collection into base64.

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Rust, Tauri v2
- **Styling:** Vanilla CSS (Custom shaders, overlays, and dynamic UI elements)

## 📥 Download & Installation

Head over to the **[Releases](../../releases)** tab on GitHub to grab the latest version!

1. Download the executable for your OS (e.g., `.exe` for Windows, `.AppImage` for Linux).
2. Run the installer or standalone file.
3. Click "Auto Scan" to instantly populate your library, or manually add your standalone titles!

*(Developers can also clone this repository and run `npm install` followed by `npm run tauri dev` to run the project locally).*

## Library update

- Responsive cover grid, title search (`Ctrl/Cmd + K`), favorites, Steam/local filters, and sorting by title, last launch, or playtime.
- Last-played shortcut, persistent display theme, inline errors, keyboard-accessible play buttons, and reduced-motion support.
- **Arrange** retains custom drag/resize layouts; turning it off returns to the responsive grid without deleting your arrangement.
- Covers load lazily through Tauri's asset protocol. Library refreshes no longer re-read and base64-encode every cover. Settings load separately, and cover-size changes save after interaction rather than on every slider movement.
- Favorites and last-launch timestamps are stored alongside existing games. Older library files remain readable.

Playtime measures the lifetime of directly launched processes while the launcher remains open. Steam launches record recency but do not measure Steam session duration. A game that starts a separate process may report only its bootstrap process's duration. **Back up library metadata** exports `games.json`; it does not copy game saves or cover files.

### Development and validation

Run commands from `launcher/`:

```sh
npm ci
npm run build
npm test
cargo test --locked --manifest-path src-tauri/Cargo.toml --lib
npm run tauri dev
```

`npm test` requires Node 22.18+ for native TypeScript support. `npm run dev` runs an empty browser preview; file dialogs, scanning, and launching require the desktop app.

Browser interaction checks use Playwright with a mocked native bridge. Start `npm run dev`, then run `npm run test:browser` in an environment with Playwright installed. `PLAYWRIGHT_MODULE` can point to an existing Playwright module; `BROWSER_PATH` can select an installed Chromium browser. Screenshots go to `/tmp/retrox-qa` (override with `QA_ARTIFACTS`). These tests do not launch real games or exercise OS file dialogs.

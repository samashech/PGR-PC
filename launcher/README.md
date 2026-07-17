# Pgame Launcher

A beautiful, highly customizable, and fully drag-and-drop game launcher built with **Tauri v2**, **React 19**, and **Rust**. 

Pgame Launcher breaks away from traditional grid-based libraries by giving you a freeform desktop experience. You can drag your game cards anywhere on the screen, resize them in 8 different directions, and customize the entire app's aesthetic with dynamic TV themes.

## ✨ Features

- **Freeform Drag & Drop:** Click and drag any game card to place it exactly where you want it on your launcher "desktop."
- **8-Directional Resizing:** Grab any edge or corner of a game card to dynamically stretch and resize it.
- **Dynamic Theming:** Choose between vintage CRT/wooden TV bezels or sleek, modern metallic monitors. The game card resize handles automatically shape-shift to match your theme (retro tactile grips vs sleek modern lines).
- **Auto Steam Scanning:** Automatically detects your installed Steam games and adds them to your library.
- **Custom Cover Art:** Upload custom box art for any game. The Rust backend automatically compresses and normalizes images for ultra-fast loading without hogging system memory.
- **Pre-Launch Hooks:** Set a global pre-launch script (like SteamTools) that automatically executes before a game boots up.
- **Blazing Fast Backend:** Powered by a Tauri + Rust engine, ensuring minimal RAM usage, instantaneous hot-reloading, and robust system-level file management.

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Rust, Tauri v2
- **Styling:** Vanilla CSS with custom vintage overlay shaders and modern glows.
- **Icons:** Lucide React

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Rust & Cargo
- Tauri CLI dependencies (see [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites))

### Installation

1. Clone the repository
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run tauri dev
   ```
4. Build for production:
   ```bash
   npm run tauri build
   ```

## 💾 Data Storage

Your game library configuration (`games.json`), launcher settings (`settings.json`), and custom compressed cover art are stored safely in your OS's native AppData folder (e.g., `~/.config/com.samash.launcher` on Linux, or `%APPDATA%\com.samash.launcher` on Windows).

## 🎮 Usage
- **Add a Game:** Click the "Add Game" icon to manually select a game executable.
- **Scan Steam:** Click the "Auto Scan" icon to magically import your Steam library.
- **Edit Cover:** Hover over a game card, click the `⋮` menu, and upload a new image. (Supports PNG, JPG, GIF, WEBP).
- **Customize Theme:** Use the TV icon in the top right to cycle through different bezel themes.

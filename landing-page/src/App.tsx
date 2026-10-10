import { useState } from "react";
import {
  Download,
  MonitorPlay,
  Zap,
  HardDrive,
  Gamepad2,
  ArrowUpRight,
  ArrowDown,
  Check,
  Code2,
  Plus,
  Play,
} from "lucide-react";

const repository = "https://github.com/samashech/PGR-PC";
const themes = [
  {
    id: "wood",
    name: "Wood & Stereo",
    description: "Warm wood, stereo speakers, and a familiar green glow.",
  },
  {
    id: "mono",
    name: "Dark Mono",
    description: "A classic dark frame that keeps your collection in focus.",
  },
  {
    id: "oled",
    name: "Modern OLED",
    description: "Clean edges and a minimal frame. The same personal arcade.",
  },
];

function App() {
  const [theme, setTheme] = useState(0);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="grid-overlay" aria-hidden="true" />
      <nav className="nav" aria-label="Main navigation">
        <a className="logo" href="#main" aria-label="PGR-PC home">
          <Gamepad2 size={28} aria-hidden="true" />
          PGR-PC
        </a>
        <div className="nav-links">
          <a href="#preview">Preview</a>
          <a href="#features">Features</a>
          <a
            className="github-link"
            href={repository}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </nav>

      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="main-card">
            <div className="main-icon">
              <Download size={30} aria-hidden="true" />
            </div>
            <span className="eyebrow">YOUR GAMES. YOUR SPACE.</span>
            <h1 id="hero-title">Pgame Launcher</h1>
            <p>
              A familiar place for your next adventure. Bring your Steam and
              local games together, wrapped in the warmth of a retro display.
            </p>
            <a
              href={`${repository}/releases/`}
              className="download-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download size={18} aria-hidden="true" /> DOWNLOAD FOR WINDOWS{" "}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <span className="download-note">
              Choose a Windows installer on GitHub Releases.
            </span>
            <div className="hero-benefits">
              <span>
                <Check size={13} aria-hidden="true" /> No launcher account
              </span>
              <span>
                <Check size={13} aria-hidden="true" /> Local library
              </span>
              <span>
                <Check size={13} aria-hidden="true" /> Open source
              </span>
            </div>
          </div>
          <a className="preview-link" href="#preview">
            Take a look inside <ArrowDown size={14} aria-hidden="true" />
          </a>
        </section>

        <section
          className="showcase"
          id="preview"
          aria-labelledby="preview-title"
        >
          <div className="section-heading">
            <span className="eyebrow">SAME LIBRARY. DIFFERENT FEEL.</span>
            <h2 id="preview-title">Find your frequency.</h2>
            <p>Three displays. One collection that feels like yours.</p>
          </div>
          <div
            className="theme-picker"
            role="group"
            aria-label="Preview a launcher theme"
          >
            {themes.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={theme === index}
                aria-controls="theme-preview"
                onClick={() => setTheme(index)}
              >
                <span className={`theme-dot ${item.id}`} aria-hidden="true" />
                {item.name}
              </button>
            ))}
          </div>
          <figure className="showcase-window" id="theme-preview">
            <div className="window-header">
              <span className="window-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>RETRO-X / LIBRARY</span>
              <span className="preview-tag">PREVIEW</span>
            </div>
            <img
              src={`/previews/${themes[theme].id}.png`}
              width="1232"
              height="1032"
              alt={`The Retro-X game library in the ${themes[theme].name} theme, showing four example games.`}
              loading="lazy"
              decoding="async"
            />
            <figcaption aria-live="polite">
              <strong>{themes[theme].name}</strong>
              <span>{themes[theme].description}</span>
            </figcaption>
          </figure>
          <p className="preview-caption">
            Actual launcher interface with an example library. Games are not
            included.
          </p>
        </section>

        <section
          id="features"
          className="features-section"
          aria-labelledby="features-title"
        >
          <div className="section-heading">
            <span className="eyebrow">LESS FRICTION. MORE PLAY.</span>
            <h2 id="features-title">
              A little nostalgia.
              <br />
              Everyday essentials.
            </h2>
          </div>
          <div className="features-grid">
            <article className="feature-card">
              <div className="feature-icon">
                <MonitorPlay size={23} aria-hidden="true" />
              </div>
              <div className="feature-text">
                <span className="feature-number">01 / MAKE IT YOURS</span>
                <h3>Physical CRT themes</h3>
                <p>
                  Switch between wooden stereo, dark mono, and modern OLED
                  frames. Pick your cover art and arrange your collection just
                  how you like it.
                </p>
              </div>
            </article>
            <article className="feature-card">
              <div className="feature-icon">
                <Zap size={23} aria-hidden="true" />
              </div>
              <div className="feature-text">
                <span className="feature-number">02 / FIND YOUR NEXT GAME</span>
                <h3>Your library, organized</h3>
                <p>
                  Add Steam and local games, search by title, and keep favorites
                  close. Sort by recent launches or playtime, then jump back in.
                </p>
                <span className="feature-hint">
                  Quick search <kbd>Ctrl / ⌘ K</kbd>
                </span>
              </div>
            </article>
            <article className="feature-card">
              <div className="feature-icon">
                <HardDrive size={23} aria-hidden="true" />
              </div>
              <div className="feature-text">
                <span className="feature-number">03 / KEEP IT PERSONAL</span>
                <h3>Local by design</h3>
                <p>
                  Your library, favorites, and local-game playtime stay on your
                  device. No launcher account required. Export library metadata
                  when you need a backup.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="setup-section" aria-labelledby="setup-title">
          <div className="section-heading">
            <span className="eyebrow">FROM DOWNLOAD TO PLAY</span>
            <h2 id="setup-title">Settle in. Start playing.</h2>
          </div>
          <ol className="setup-steps">
            <li>
              <span className="step-icon">
                <Download size={18} aria-hidden="true" />
              </span>
              <div>
                <h3>Install the launcher</h3>
                <p>
                  Open GitHub Releases and choose the installer for your system.
                </p>
              </div>
            </li>
            <li>
              <span className="step-icon">
                <Plus size={18} aria-hidden="true" />
              </span>
              <div>
                <h3>Bring your games</h3>
                <p>
                  Use Scan Steam, scan a folder, or add an executable yourself.
                </p>
              </div>
            </li>
            <li>
              <span className="step-icon">
                <Play size={18} aria-hidden="true" />
              </span>
              <div>
                <h3>Make yourself at home</h3>
                <p>Pick a display, star a favorite, and press Play.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="faq-section" aria-labelledby="faq-title">
          <div className="section-heading">
            <span className="eyebrow">BEFORE YOU PRESS PLAY</span>
            <h2 id="faq-title">A few useful details.</h2>
          </div>
          <div className="faq-list">
            <details>
              <summary>Does it include games?</summary>
              <p>
                No. Pgame Launcher organizes and launches games you already
                have. Steam games still use your installed Steam client.
              </p>
            </details>
            <details>
              <summary>Does it need an internet connection?</summary>
              <p>
                Your library and preferences are stored locally. Steam cover art
                loads online, and individual games or Steam may require their
                own internet connection.
              </p>
            </details>
            <details>
              <summary>How does playtime tracking work?</summary>
              <p>
                The launcher tracks directly launched local game processes while
                it stays open. Steam launches record recency, but Steam session
                duration is not tracked. Games that start a separate process may
                report only the initial process’s duration.
              </p>
            </details>
            <details>
              <summary>What does a library backup include?</summary>
              <p>
                The backup exports your library metadata, including favorites
                and playtime. It does not copy game save files, installed games,
                or cover images.
              </p>
            </details>
            <details>
              <summary>
                Where can I find other builds or report an issue?
              </summary>
              <p>
                Check{" "}
                <a
                  href={`${repository}/releases/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub Releases
                </a>{" "}
                for available builds. For development instructions or a bug
                report, visit the{" "}
                <a href={repository} target="_blank" rel="noopener noreferrer">
                  project repository
                </a>
                .
              </p>
            </details>
          </div>
        </section>
        <section className="closing-card" aria-labelledby="closing-title">
          <Gamepad2 size={30} aria-hidden="true" />
          <h2 id="closing-title">Your collection is waiting.</h2>
          <p>Give it a place that feels like home.</p>
          <a
            className="download-btn"
            href={`${repository}/releases/`}
            target="_blank"
            rel="noopener noreferrer"
          >
            GET THE LAUNCHER <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </section>
      </main>
      <footer className="footer">
        <a className="footer-brand" href="#main">
          <Gamepad2 size={18} aria-hidden="true" /> PGR-PC
        </a>
        <span>Made for the games you already love.</span>
        <a href={repository} target="_blank" rel="noopener noreferrer">
          <Code2 size={16} aria-hidden="true" /> View the source{" "}
          <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </footer>
    </>
  );
}
export default App;

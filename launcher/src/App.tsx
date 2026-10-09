import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Play,
  TrendingUp,
  Settings,
  Plus,
  Gamepad2,
  FolderSearch,
  Search,
  Star,
  X,
  ScanLine,
  Library,
  ArrowUpRight,
  SlidersHorizontal,
  LoaderCircle,
  Check,
  Monitor,
} from "lucide-react";
import { invoke, isTauri, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import DraggableResizable from "./DraggableResizable";
import { Game, Filter, Sort, selectGames, formatPlaytime } from "./library";
import "./App.css";

const desktop = isTauri();
type Tab = "home" | "progress" | "settings";
type Theme = "theme-1" | "theme-2" | "theme-3";
function savedTheme(): Theme {
  try {
    const value = localStorage.getItem("retrox-theme");
    if (value === "theme-1" || value === "theme-2" || value === "theme-3")
      return value;
  } catch {
    /* storage unavailable */
  }
  return "theme-1";
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [games, setGames] = useState<Game[]>([]);
  const [hookPath, setHookPath] = useState<string | null>(null);
  const [tvTheme, setTvTheme] = useState<Theme>(savedTheme);
  const [gridSize, setGridSize] = useState(200);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("title");
  const [editLayout, setEditLayout] = useState(false);
  const [loading, setLoading] = useState(desktop);
  const [busy, setBusy] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const [coverVersions, setCoverVersions] = useState<Record<string, number>>(
    {},
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const refreshVersion = useRef(0);

  const fetchGames = useCallback(async () => {
    if (!desktop) return;
    const version = ++refreshVersion.current;
    const library = await invoke<Game[]>("get_games");
    if (version === refreshVersion.current) setGames(library);
  }, []);

  useEffect(() => {
    if (!desktop) return;
    let disposed = false;
    Promise.all([
      fetchGames(),
      invoke<{ pre_launch_path: string | null; grid_size: number }>(
        "get_settings",
      ),
    ])
      .then(([, settings]) => {
        if (!disposed) {
          setHookPath(settings.pre_launch_path);
          setGridSize(Math.min(320, Math.max(150, settings.grid_size)));
        }
      })
      .catch((error) => {
        if (!disposed)
          setNotice({
            text: `Could not load your library: ${String(error)}`,
            error: true,
          });
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    const unlisten = listen("refresh-games", () => {
      void fetchGames().catch((error) =>
        setNotice({ text: String(error), error: true }),
      );
    });
    return () => {
      disposed = true;
      void unlisten.then((stop) => stop()).catch(console.error);
    };
  }, [fetchGames]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setActiveTab("home");
        requestAnimationFrame(() => searchRef.current?.focus());
      }
      if (event.key === "Escape") {
        setQuery("");
        setNotice(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = async (label: string, action: () => Promise<void>) => {
    if (busyRef.current) return;
    if (!desktop) {
      setNotice({
        text: "Open the desktop app to add, scan, or launch games. This is a browser preview.",
      });
      return;
    }
    busyRef.current = true;
    setBusy(label);
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setNotice({ text: String(error), error: true });
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };
  const scan = (command: string) =>
    run("Scanning library", async () => {
      const count = await invoke<number>(command);
      await fetchGames();
      setNotice({
        text: count
          ? `Added ${count} new game${count === 1 ? "" : "s"} to your library.`
          : "No new games added. Existing games are kept in your library.",
      });
    });
  const addGame = () =>
    run("Adding game", async () => {
      const game = await invoke<Game | null>("add_game");
      if (game) {
        await fetchGames();
        setNotice({ text: `${game.title} added to your library.` });
      }
    });
  const launch = (game: Game) =>
    run(`Launching ${game.title}`, async () => {
      await invoke("launch_game", { id: game.id });
      await fetchGames();
      setNotice({
        text: game.is_steam
          ? `${game.title} sent to Steam. Steam session time is not tracked.`
          : `${game.title} launched. Playtime updates when the process exits.`,
      });
    });
  const favorite = (game: Game) =>
    run("Saving favorite", async () => {
      await invoke("set_game_favorite", {
        id: game.id,
        favorite: !game.favorite,
      });
      await fetchGames();
    });
  const setCover = (game: Game) =>
    run("Updating cover", async () => {
      if (await invoke<string | null>("set_cover_art", { id: game.id })) {
        setCoverVersions((prev) => ({ ...prev, [game.id]: Date.now() }));
        await fetchGames();
      }
    });
  const remove = (game: Game) => {
    if (
      !window.confirm(
        `Remove ${game.title} from the library? Your game files will stay on disk.`,
      )
    )
      return;
    void run("Removing game", async () => {
      await invoke("remove_game", { id: game.id });
      await fetchGames();
    });
  };
  const visibleGames = useMemo(
    () => selectGames(games, query, filter, sort),
    [games, query, filter, sort],
  );
  const totalHours = useMemo(
    () => games.reduce((sum, game) => sum + game.playtime, 0),
    [games],
  );
  const maxPlaytime = useMemo(
    () => games.reduce((max, game) => Math.max(max, game.playtime), 1),
    [games],
  );
  const favorites = games.filter((game) => game.favorite).length;
  const recent = useMemo(
    () =>
      selectGames(
        games.filter((game) => game.last_played),
        "",
        "all",
        "recent",
      )[0],
    [games],
  );
  const changeTheme = (theme: Theme) => {
    setTvTheme(theme);
    try {
      localStorage.setItem("retrox-theme", theme);
    } catch {
      /* session only */
    }
  };
  const persistLayout = (game: Game, changes: Partial<Game>) => {
    void run("Saving layout", async () => {
      if (changes.imageWidth)
        await invoke("update_game_size", {
          id: game.id,
          width: changes.imageWidth,
          height: changes.imageHeight,
        });
      await invoke("update_game_position", {
        id: game.id,
        x: changes.x,
        y: changes.y,
      });
      await fetchGames();
    });
  };

  const renderCard = (game: Game, index: number) => {
    const cover = game.cover_url
      ? /^https?:\/\//.test(game.cover_url)
        ? game.cover_url
        : `${convertFileSrc(game.cover_url)}?v=${coverVersions[game.id] || 0}`
      : undefined;
    return (
      <article className="library-card" key={game.id}>
        <div className={`cover-art cover-tone-${index % 4}`}>
          <div className="cover-placeholder">
            <Gamepad2 size={40} strokeWidth={1} />
            <span>{game.title}</span>
            <small>RETRO-X COLLECTION</small>
          </div>
          {cover && (
            <img
              key={cover}
              src={cover}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}
          <span className="source-badge">
            {game.is_steam ? "STEAM" : "LOCAL"}
          </span>
          <button
            className={`favorite-button ${game.favorite ? "selected" : ""}`}
            disabled={!!busy}
            aria-label={`${game.favorite ? "Unfavorite" : "Favorite"} ${game.title}`}
            aria-pressed={!!game.favorite}
            onClick={() => void favorite(game)}
          >
            <Star size={16} fill={game.favorite ? "currentColor" : "none"} />
          </button>
          {!editLayout && (
            <button
              className="cover-play"
              disabled={!!busy}
              onClick={() => void launch(game)}
              aria-label={`Play ${game.title}`}
            >
              <Play size={20} fill="currentColor" /> Play now
            </button>
          )}
        </div>
        <div className="card-details">
          <h2 title={game.title}>{game.title}</h2>
          <p>{formatPlaytime(game.playtime)}</p>
          <div className="card-actions">
            <button disabled={!!busy} onClick={() => void setCover(game)}>
              Edit cover
            </button>
            <button disabled={!!busy} onClick={() => remove(game)}>
              Remove
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="desk-environment">
      <div className={`tv-case ${tvTheme}`}>
        {tvTheme === "theme-1" && (
          <div className="tv-left-panel" aria-hidden="true">
            <div className="theme-1-grill" />
            <span className="speaker-label">
              STEREO
              <br />
              HI-FI
            </span>
            <div className="theme-1-grill" />
          </div>
        )}
        <div className="crt-screen-wrapper">
          <main className="crt-content">
            <div className="station-header">
              <span>
                <span className="signal-dot" /> RETRO-X <b>/</b> PERSONAL ARCADE
              </span>
              <span>{desktop ? "LOCAL LIBRARY" : "BROWSER PREVIEW"}</span>
            </div>
            <header className="library-header">
              <div>
                <p className="eyebrow">
                  CHANNEL{" "}
                  {activeTab === "home"
                    ? "01"
                    : activeTab === "progress"
                      ? "02"
                      : "03"}
                </p>
                <h1>
                  {activeTab === "home"
                    ? "Your next adventure."
                    : activeTab === "progress"
                      ? "Time well played."
                      : "Make it yours."}
                </h1>
                <p className="subtitle">
                  {activeTab === "home"
                    ? "All your games. One familiar place."
                    : activeTab === "progress"
                      ? "A little perspective on your collection."
                      : "Tune your display and launch preferences."}
                </p>
              </div>
              {activeTab === "home" && (
                <button
                  className="primary-button"
                  disabled={!!busy || loading}
                  onClick={() => void addGame()}
                >
                  <Plus size={17} /> Add game
                </button>
              )}
            </header>
            {notice && (
              <div
                className={`notice ${notice.error ? "error" : ""}`}
                role={notice.error ? "alert" : "status"}
              >
                <span>{notice.text}</span>
                <button
                  aria-label="Dismiss notification"
                  onClick={() => setNotice(null)}
                >
                  <X size={17} />
                </button>
              </div>
            )}
            {busy && (
              <div className="busy-status" role="status">
                <LoaderCircle className="spinner" size={16} /> {busy}…
              </div>
            )}
            {activeTab === "home" && (
              <>
                <div className="library-overview">
                  <div>
                    <Library size={18} />
                    <strong>{games.length}</strong>
                    <span>games collected</span>
                  </div>
                  <div>
                    <Star size={18} />
                    <strong>{favorites}</strong>
                    <span>favorites</span>
                  </div>
                  <div>
                    <TrendingUp size={18} />
                    <strong>
                      {totalHours.toFixed(1)}
                      <small> h</small>
                    </strong>
                    <span>tracked playtime</span>
                  </div>
                </div>
                {recent && !query && filter === "all" && !editLayout && (
                  <div className="recent-strip">
                    <div>
                      <span className="eyebrow">LAST PLAYED</span>
                      <strong>{recent.title}</strong>
                    </div>
                    <button
                      disabled={!!busy}
                      onClick={() => void launch(recent)}
                    >
                      Jump back in <ArrowUpRight size={17} />
                    </button>
                  </div>
                )}
                <div className="collection-heading">
                  <h2>
                    The collection{" "}
                    <span>
                      {visibleGames.length.toString().padStart(2, "0")}
                    </span>
                  </h2>
                  <div className="scan-actions">
                    <button
                      disabled={!!busy || loading}
                      onClick={() => void scan("scan_steam_games")}
                    >
                      <ScanLine size={16} /> Scan Steam
                    </button>
                    <button
                      disabled={!!busy || loading}
                      onClick={() => void scan("scan_local_folder")}
                    >
                      <FolderSearch size={16} /> Scan folder
                    </button>
                  </div>
                </div>
                <div className="library-toolbar">
                  <label className="search-field">
                    <Search size={17} />
                    <input
                      ref={searchRef}
                      aria-label="Search games"
                      placeholder="Find a game…"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                    <kbd>Ctrl K</kbd>
                    {query && (
                      <button
                        aria-label="Clear search"
                        onClick={() => setQuery("")}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <label className="sort-field">
                    <span>Sort</span>
                    <select
                      aria-label="Sort games"
                      value={sort}
                      onChange={(event) => setSort(event.target.value as Sort)}
                    >
                      <option value="title">Title A–Z</option>
                      <option value="recent">Recently played</option>
                      <option value="playtime">Most played</option>
                    </select>
                  </label>
                </div>
                <div className="filter-row">
                  <div className="filter-tabs">
                    {(["all", "favorites", "steam", "local"] as Filter[]).map(
                      (value) => (
                        <button
                          key={value}
                          aria-pressed={filter === value}
                          className={filter === value ? "active" : ""}
                          onClick={() => setFilter(value)}
                        >
                          {value === "all"
                            ? "All games"
                            : value[0].toUpperCase() + value.slice(1)}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    className={`layout-toggle ${editLayout ? "active" : ""}`}
                    aria-pressed={editLayout}
                    onClick={() => setEditLayout(!editLayout)}
                  >
                    <SlidersHorizontal size={15} />
                    {editLayout ? "Done arranging" : "Arrange"}
                  </button>
                </div>
                {editLayout && (
                  <p className="layout-help">
                    Drag covers to arrange them; drag their edges to resize.
                    Switch off Arrange to return to the responsive grid.
                  </p>
                )}
                {loading ? (
                  <div className="empty-state" role="status">
                    <LoaderCircle className="spinner" />
                    <h2>Loading your collection…</h2>
                  </div>
                ) : visibleGames.length === 0 ? (
                  <div className="empty-state">
                    <Gamepad2 size={46} strokeWidth={1} />
                    <h2>
                      {games.length
                        ? "No games match this view."
                        : "An empty shelf. Endless possibilities."}
                    </h2>
                    <p>
                      {games.length
                        ? "Try a different title or clear your filters."
                        : "Add your first game, or scan your Steam library to get started."}
                    </p>
                    {games.length ? (
                      <button
                        onClick={() => {
                          setQuery("");
                          setFilter("all");
                        }}
                      >
                        Clear filters
                      </button>
                    ) : (
                      <button
                        className="primary-button"
                        disabled={!!busy}
                        onClick={() => void addGame()}
                      >
                        <Plus size={16} /> Add your first game
                      </button>
                    )}
                  </div>
                ) : editLayout ? (
                  <div
                    className="layout-canvas"
                    style={{
                      height: Math.max(
                        600,
                        ...visibleGames.map(
                          (game, index) =>
                            (game.y ?? Math.floor(index / 3) * 390) +
                            (game.imageWidth ? game.imageHeight : 370) +
                            30,
                        ),
                      ),
                    }}
                  >
                    {visibleGames.map((game, index) => (
                      <DraggableResizable
                        key={game.id}
                        theme={tvTheme}
                        defaultX={game.x ?? (index % 3) * 240}
                        defaultY={game.y ?? Math.floor(index / 3) * 390}
                        defaultWidth={game.imageWidth || 220}
                        defaultHeight={game.imageWidth ? game.imageHeight : 370}
                        onDragStop={(x: number, y: number) =>
                          persistLayout(game, {
                            x: Math.max(0, Math.round(x)),
                            y: Math.max(0, Math.round(y)),
                          })
                        }
                        onResizeStop={(
                          w: number,
                          h: number,
                          x: number,
                          y: number,
                        ) =>
                          persistLayout(game, {
                            imageWidth: Math.max(160, Math.round(w)),
                            imageHeight: Math.max(240, Math.round(h)),
                            x: Math.max(0, Math.round(x)),
                            y: Math.max(0, Math.round(y)),
                          })
                        }
                      >
                        {renderCard(game, index)}
                      </DraggableResizable>
                    ))}
                  </div>
                ) : (
                  <div
                    className="library-grid"
                    style={
                      { "--card-size": `${gridSize}px` } as React.CSSProperties
                    }
                  >
                    {visibleGames.map(renderCard)}
                  </div>
                )}
              </>
            )}
            {activeTab === "progress" && (
              <section className="progress-section">
                <div className="stat-heading">
                  <strong>
                    {totalHours.toFixed(1)}
                    <span> hours tracked</span>
                  </strong>
                  <p>
                    Local game sessions are recorded when their process exits.
                    Steam session time is not tracked.
                  </p>
                </div>
                {games.length === 0 && (
                  <div className="empty-state">
                    <TrendingUp size={38} />
                    <h2>Your story starts with a game.</h2>
                    <button onClick={() => setActiveTab("home")}>
                      Go to library
                    </button>
                  </div>
                )}
                {selectGames(games, "", "all", "playtime").map((game) => (
                  <div className="playtime-row" key={game.id}>
                    <div>
                      <strong>{game.title}</strong>
                      <span>{formatPlaytime(game.playtime)}</span>
                    </div>
                    <meter
                      min={0}
                      max={maxPlaytime}
                      value={game.playtime}
                      aria-label={`${game.title} playtime`}
                    />
                  </div>
                ))}
              </section>
            )}
            {activeTab === "settings" && (
              <div className="settings-sections">
                <section>
                  <div className="section-heading">
                    <Monitor size={20} />
                    <h2>Your display</h2>
                  </div>
                  <p>Three familiar frames. Pick your favorite.</p>
                  <div className="theme-options">
                    {(["theme-1", "theme-2", "theme-3"] as Theme[]).map(
                      (theme, index) => (
                        <button
                          className={tvTheme === theme ? "selected" : ""}
                          key={theme}
                          aria-pressed={tvTheme === theme}
                          onClick={() => changeTheme(theme)}
                        >
                          <span className={`theme-swatch ${theme}`} />
                          <span>
                            {
                              ["Wood & Stereo", "Dark Mono", "Modern OLED"][
                                index
                              ]
                            }
                          </span>
                          {tvTheme === theme && <Check size={15} />}
                        </button>
                      ),
                    )}
                  </div>
                  <label className="density-label" htmlFor="density">
                    Cover size <span>{gridSize}px</span>
                  </label>
                  <input
                    id="density"
                    type="range"
                    min="150"
                    max="320"
                    step="10"
                    value={gridSize}
                    disabled={!!busy}
                    onChange={(event) =>
                      setGridSize(Number(event.target.value))
                    }
                    onPointerUp={() =>
                      void run("Saving cover size", async () => {
                        await invoke("update_grid_size", { size: gridSize });
                      })
                    }
                    onKeyUp={(event) => {
                      if (
                        [
                          "ArrowLeft",
                          "ArrowRight",
                          "ArrowUp",
                          "ArrowDown",
                          "Home",
                          "End",
                          "PageUp",
                          "PageDown",
                        ].includes(event.key)
                      )
                        void run("Saving cover size", async () => {
                          await invoke("update_grid_size", { size: gridSize });
                        });
                    }}
                  />
                  <button
                    disabled={!!busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Reset all custom cover sizes and positions?",
                        )
                      )
                        void run("Resetting layout", async () => {
                          await invoke("reset_all_game_layouts");
                          await fetchGames();
                        });
                    }}
                  >
                    Reset custom layout
                  </button>
                </section>
                <section>
                  <h2>Before you play</h2>
                  <p>Optionally start an executable before launching a game.</p>
                  <p className="hook-path">
                    {hookPath || "No pre-launch executable selected."}
                  </p>
                  <div className="button-row">
                    <button
                      disabled={!!busy}
                      onClick={() =>
                        void run("Selecting executable", async () => {
                          const path = await invoke<string | null>(
                            "set_pre_launch_hook",
                          );
                          if (path) setHookPath(path);
                        })
                      }
                    >
                      Choose executable
                    </button>
                    {hookPath && (
                      <button
                        disabled={!!busy}
                        onClick={() =>
                          void run("Clearing executable", async () => {
                            await invoke("clear_pre_launch_hook");
                            setHookPath(null);
                          })
                        }
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </section>
                <section>
                  <h2>Keep your collection safe</h2>
                  <p>
                    Export your library metadata, including favorites and
                    playtime. This does not back up game save files or cover
                    images.
                  </p>
                  <button
                    disabled={!!busy}
                    onClick={() =>
                      void run("Backing up library", async () => {
                        setNotice({
                          text: await invoke<string>("backup_saves"),
                        });
                      })
                    }
                  >
                    Back up library metadata
                  </button>
                </section>
              </div>
            )}
            <footer className="screen-footer">
              <span>YOUR GAMES. YOUR SPACE.</span>
              <span>
                RETRO-X /{" "}
                {activeTab === "home" ? "LIBRARY" : activeTab.toUpperCase()}
              </span>
            </footer>
          </main>
        </div>
        <nav className="tv-control-panel" aria-label="Main navigation">
          <div className="tv-brand">
            RETRO<span>—</span>X<small>PERSONAL ARCADE</small>
          </div>
          {(
            [
              { id: "home", label: "Library", icon: Library },
              { id: "progress", label: "Playtime", icon: TrendingUp },
              { id: "settings", label: "Settings", icon: Settings },
            ] as const
          ).map(({ id, label, icon: Icon }, index) => (
            <button
              key={id}
              className={`tv-button ${activeTab === id ? "active" : ""}`}
              onClick={() => setActiveTab(id)}
              aria-label={label}
              aria-current={activeTab === id ? "page" : undefined}
            >
              <Icon size={22} />
              <span>{label}</span>
              <small>0{index + 1}</small>
            </button>
          ))}
          <div className="panel-bottom">
            <div className="theme-1-grill" />
            <span>
              <span className="signal-dot" /> SYSTEM READY
            </span>
          </div>
        </nav>
      </div>
    </div>
  );
}
export default App;

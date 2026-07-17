import { useState, useEffect } from 'react';
import { Play, TrendingUp, Settings, PlusCircle, MonitorPlay, Gamepad2, FolderSearch } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './App.css';

type Game = {
  id: string;
  title: string;
  imageHeight: number;
  imageWidth?: number;
  completion: number;
  playtime: number;
  path: string;
  cover_url: string | null;
  is_steam: boolean;
};

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'progress' | 'settings'>('home');
  const [games, setGames] = useState<Game[]>([]);
  const [hookPath, setHookPath] = useState<string | null>(null);
  const [tvTheme, setTvTheme] = useState<'theme-1' | 'theme-2' | 'theme-3'>('theme-1');
  const [isChangingChannel, setIsChangingChannel] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [gridSize, setGridSize] = useState(250);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [covers, setCovers] = useState<Record<string, string>>({});

  const fetchGames = async () => {
    try {
      const g = await invoke<Game[]>('get_games');
      setGames(g);
      const s = await invoke<{pre_launch_path: string | null}>('get_settings');
      setHookPath(s.pre_launch_path);

      const newCovers: Record<string, string> = {};
      for (const game of g) {
        if (game.cover_url) {
          if (game.cover_url.startsWith('http')) {
            newCovers[game.id] = game.cover_url;
          } else {
            try {
              const b64 = await invoke<string>('read_image_file', { path: game.cover_url });
              newCovers[game.id] = b64;
            } catch(e) {
              console.error("Failed to load cover", e);
            }
          }
        }
      }
      setCovers(prev => ({...prev, ...newCovers}));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchGames();
    const unlisten = listen('refresh-games', () => {
      fetchGames();
    });
    return () => {
      unlisten.then(f => f());
    };
  }, []);

  const handleAutoScan = async () => {
    try {
      const count = await invoke<number>('scan_steam_games');
      alert(`Auto-scan complete! Added ${count} new Steam game(s).`);
      fetchGames();
    } catch (e) {
      console.error(e);
      alert("Failed to scan games");
    }
  };

  const handleScanFolder = async () => {
    try {
      const count = await invoke<number>('scan_local_folder');
      alert(`Folder scan complete! Added ${count} new game(s).`);
      fetchGames();
    } catch (e) {
      console.error(e);
      alert("Failed to scan folder");
    }
  };

  const handleSetCover = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const path = await invoke<string | null>('set_cover_art', { id });
      if (path) {
        fetchGames();
      }
    } catch (e) {
      console.error("Failed to set cover", e);
    }
  };

  const handleRemoveGame = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (window.confirm(`Are you sure you want to remove ${title} from your library?`)) {
      try {
        await invoke('remove_game', { id });
        fetchGames();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleAddGame = async () => {
    try {
      const newGame = await invoke<Game | null>('add_game');
      if (newGame) {
        setGames([...games, newGame]);
      }
    } catch (e) {
      console.error("Failed to add game", e);
    }
  };

  const handleBackup = async () => {
    try {
      const msg = await invoke<string>('backup_saves');
      alert(msg);
    } catch (e) {
      console.error("Backup failed", e);
    }
  };

  const handleSetHook = async () => {
    try {
      const path = await invoke<string | null>('set_pre_launch_hook');
      if (path) setHookPath(path);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearHook = async () => {
    try {
      await invoke('clear_pre_launch_hook');
      setHookPath(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTabChange = (tab: 'home' | 'progress' | 'settings') => {
    if (tab === activeTab) return;
    setIsChangingChannel(true);
    const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
    audio.volume = 0.1;
    audio.play().catch(()=> { /* ignore */ });
    
    setTimeout(() => {
      setActiveTab(tab);
      setIsChangingChannel(false);
    }, 300);
  };

  const launchGame = async (id: string) => {
    try {
      setIsLaunching(true);
      await invoke('launch_game', { id });
      setTimeout(() => {
        setIsLaunching(false);
      }, 1500);
    } catch (e) {
      console.error("Failed to launch game", e);
      setIsLaunching(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <>
            <div className="screen-header">
              <h1 className="screen-title">Library</h1>
              <div style={{display: 'flex', gap: '10px'}}>
                <button className="add-game-btn" onClick={handleAutoScan}>
                  <Settings size={18} />Auto Scan
                </button>
                <button className="add-game-btn" onClick={handleAddGame}>
                  <PlusCircle size={18} />Add Game
                </button>
                <button onClick={handleScanFolder} className="settings-btn" style={{background: '#b026ff', border: 'none', color: '#fff'}}>
                  <FolderSearch size={18} />Scan Folder
                </button>
              </div>
            </div>
            {games.length === 0 ? (
              <div style={{textAlign: 'center', color: '#666', marginTop: '50px'}}>
                <MonitorPlay size={64} style={{opacity: 0.2, marginBottom: '20px'}} />
                <p>No games in your library yet.</p>
                <p>Click "Add Game" or "Auto Scan" to get started.</p>
              </div>
            ) : (
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start'}}>
                {games.map(g => (
                  <div 
                    key={g.id} 
                    className="game-card resizable-card" 
                    style={{width: g.imageWidth || gridSize, height: g.imageHeight || gridSize * 1.4}}
                    onClick={() => launchGame(g.id)}
                    onMouseUp={(e) => {
                      const target = e.currentTarget;
                      if (target.offsetWidth !== (g.imageWidth || gridSize) || target.offsetHeight !== (g.imageHeight || gridSize * 1.4)) {
                        invoke('update_game_size', { id: g.id, width: target.offsetWidth, height: target.offsetHeight });
                      }
                    }}
                  >
                    {covers[g.id] ? (
                      <img src={covers[g.id]} alt={g.title} className="game-cover-img" />
                    ) : (
                      <div style={{padding: '20px', textAlign: 'center', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                        <Gamepad2 size={48} style={{opacity: 0.5, marginBottom: '10px'}} />
                        <h3 style={{fontSize: '1.2rem', color: '#fff'}}>{g.title}</h3>
                      </div>
                    )}
                    <div className="game-overlay">
                      <div style={{textAlign: 'center', pointerEvents: 'none'}}>
                        <h3 style={{color: '#fff', marginBottom: '5px'}}>{g.title}</h3>
                        <p style={{color: '#39ff14', fontSize: '0.9rem', marginBottom: '10px'}}>Ready to Play</p>
                      </div>
                    </div>
                    
                    <div className="game-card-menu-container" onClick={(e) => e.stopPropagation()}>
                      <button className="game-menu-btn" onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === g.id ? null : g.id);
                      }}>
                        ⋮
                      </button>
                      
                      {openMenuId === g.id && (
                        <div className="game-menu-dropdown">
                          <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleSetCover(g.id, e); }}>Edit Cover</button>
                          <button onClick={(e) => handleRemoveGame(g.id, g.title, e)} style={{color: '#ff5f56'}}>Remove Game</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      case 'progress':
        return (
          <>
            <div className="screen-header">
              <h1 className="screen-title">Progress Tracking</h1>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
              {games.length === 0 ? <p style={{color: '#888'}}>Play some games to see progress.</p> : null}
              {games.map(game => (
                <div key={game.id} style={{background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                    <strong style={{color: '#fff', fontSize: '18px'}}>{game.title}</strong>
                    <span style={{color: '#3ae190'}}>{game.playtime.toFixed(1)} hrs</span>
                  </div>
                  <div style={{width: '100%', height: '8px', background: '#000', borderRadius: '4px', overflow: 'hidden'}}>
                    <div style={{width: `${Math.min((game.playtime / 50) * 100, 100)}%`, height: '100%', background: '#3ae190'}} />
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      case 'settings':
        return (
          <>
            <div className="screen-header">
              <h1 className="screen-title">Settings</h1>
            </div>
            <div style={{color: '#a8a29e'}}>
              <div style={{marginTop: '30px', padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333'}}>
                <h3 style={{color: '#fff', marginBottom: '10px'}}>Global Pre-Launch Hook</h3>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <button className="add-game-btn" onClick={handleSetHook}>Select Executable</button>
                  {hookPath && <button className="add-game-btn" onClick={handleClearHook} style={{borderColor: '#ef4444', color: '#ef4444'}}>Clear</button>}
                </div>
                {hookPath && <div style={{marginTop: '10px', fontSize: '12px', color: '#3ae190'}}>Active Hook: {hookPath}</div>}
              </div>
              <div style={{marginTop: '30px', padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333'}}>
                <h3 style={{color: '#fff', marginBottom: '10px'}}>TV Design Theme</h3>
                <p style={{fontSize: '0.8rem', color: '#888', marginBottom: '15px'}}>Change the physical appearance of the launcher.</p>
                <div style={{display: 'flex', gap: '10px'}}>
                  <button onClick={() => setTvTheme('theme-1')} style={{background: tvTheme === 'theme-1' ? '#c68a47' : '#333', border: 'none', color: '#fff', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', flex: 1}}>Wood & Stereo</button>
                  <button onClick={() => setTvTheme('theme-2')} style={{background: tvTheme === 'theme-2' ? '#333' : '#222', border: tvTheme === 'theme-2' ? '1px solid #666' : '1px solid #333', color: '#fff', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', flex: 1}}>Dark Mono</button>
                  <button onClick={() => setTvTheme('theme-3')} style={{background: tvTheme === 'theme-3' ? '#000' : '#222', border: tvTheme === 'theme-3' ? '1px solid #00f0ff' : '1px solid #333', color: '#fff', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', flex: 1}}>Modern OLED</button>
                </div>
              </div>
              <div style={{marginTop: '30px', padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333'}}>
                <h3 style={{color: '#fff', marginBottom: '10px'}}>Grid Size</h3>
                <p style={{fontSize: '0.8rem', color: '#888', marginBottom: '15px'}}>Adjust the size of the game covers in your library.</p>
                <input type="range" min="150" max="400" value={gridSize} onChange={(e) => setGridSize(Number(e.target.value))} style={{width: '100%', cursor: 'pointer'}} />
              </div>
              <div style={{marginTop: '30px'}}>
                <h2 style={{color: '#fff', marginBottom: '20px'}}>Data Management</h2>
                <button className="add-game-btn" onClick={handleBackup}>Backup Save Data</button>
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="desk-environment">
      <div className={`tv-case ${tvTheme}`}>
        {tvTheme !== 'theme-3' && (
          <div className="tv-left-panel">
            {tvTheme === 'theme-1' && (
              <>
                <div className="theme-1-grill"></div>
                <div className="theme-1-grill" style={{flexGrow: 1}}></div>
              </>
            )}
          </div>
        )}

        <div className="crt-screen-wrapper">
          <div className={`channel-static ${isChangingChannel ? 'active' : ''}`}></div>
          <div className={`crt-content ${isLaunching ? 'launching' : ''}`}>
            {renderContent()}
          </div>
        </div>

        <div className="tv-control-panel">
          {tvTheme !== 'theme-3' && <div className="tv-brand">RETRO-X LAUNCHER</div>}
          <button className={`tv-button ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabChange('home')}>
            <Play size={24} />
            {tvTheme !== 'theme-3' && <>Channel 1<span style={{fontSize: '0.6rem', color: '#a8a29e'}}>Library</span></>}
          </button>
          <button className={`tv-button ${activeTab === 'progress' ? 'active' : ''}`} onClick={() => handleTabChange('progress')}>
            <TrendingUp size={24} />
            {tvTheme !== 'theme-3' && <>Channel 2<span style={{fontSize: '0.6rem', color: '#a8a29e'}}>Progress</span></>}
          </button>
          <button className={`tv-button ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => handleTabChange('settings')}>
            <Settings size={24} />
            {tvTheme !== 'theme-3' && <>Channel 3<span style={{fontSize: '0.6rem', color: '#a8a29e'}}>Tuning</span></>}
          </button>
          {tvTheme === 'theme-1' && <div className="theme-1-grill" style={{marginTop: 'auto', height: '100px'}}></div>}
        </div>
      </div>
      <div className="desk-surface"></div>
    </div>
  );
}

export default App;

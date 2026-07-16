import { useState, useEffect } from 'react';
import { Play, TrendingUp, Settings, PlusCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './App.css';

type Game = {
  id: string;
  title: string;
  imageHeight: number;
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
  const [tvTheme, setTvTheme] = useState<'theme-1' | 'theme-2'>('theme-1');

  const fetchGames = async () => {
    try {
      const g = await invoke<Game[]>('get_games');
      setGames(g);
      const s = await invoke<{pre_launch_path: string | null}>('get_settings');
      setHookPath(s.pre_launch_path);
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

  const handleScanSteam = async () => {
    try {
      const count = await invoke<number>('scan_steam_games');
      if (count > 0) {
        fetchGames();
        alert(`Successfully found and added ${count} Steam games!`);
      } else {
        alert('No new Steam games found.');
      }
    } catch (e) {
      console.error("Failed to scan", e);
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

  const launchGame = async (id: string) => {
    try {
      await invoke('launch_game', { id });
    } catch (e) {
      console.error("Failed to launch game", e);
    }
  };

  const convertToDirect = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const success = await invoke<boolean>('convert_to_direct_launch', { id });
      if (success) fetchGames();
    } catch (e) {
      console.error(e);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <>
            <div className="screen-header">
              <h1 className="screen-title">Library</h1>
              <div>
                <button className="add-game-btn" onClick={handleScanSteam} style={{marginRight: '10px'}}>
                  <Settings size={18} style={{marginRight: '8px', verticalAlign: 'middle'}}/>Auto Scan
                </button>
                <button className="add-game-btn" onClick={handleAddGame}>
                  <PlusCircle size={18} style={{marginRight: '8px', verticalAlign: 'middle'}}/>Add Game
                </button>
              </div>
            </div>
            {games.length === 0 ? (
              <div style={{textAlign: 'center', marginTop: '100px', color: '#a8a29e'}}>
                <h2>No Games Found</h2>
                <p>Click "Add Game" or "Auto Scan" to populate your library.</p>
              </div>
            ) : (
              <div className="masonry-grid">
                {games.map(game => (
                  <div key={game.id} className="game-card" onClick={() => launchGame(game.id)}>
                    <div 
                      className="game-card-img" 
                      style={{ 
                        height: `${game.imageHeight}px`, 
                        background: game.cover_url ? 'none' : `linear-gradient(45deg, #1a1a1a, #2a2a2a)`,
                        backgroundImage: game.cover_url ? `url(${game.cover_url})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {game.is_steam && (
                        <button 
                          onClick={(e) => convertToDirect(e, game.id)}
                          style={{
                            position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.7)', 
                            border: '1px solid #444', color: '#fff', fontSize: '10px', padding: '4px', cursor: 'pointer'
                          }}
                          title="Convert to Direct Launch (.exe)"
                        >
                          Unlink Steam
                        </button>
                      )}
                    </div>
                    <div className="game-card-title">{game.title}</div>
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
                  <div style={{marginTop: '5px', fontSize: '12px', color: '#666'}}>Assumes 50hrs for 100%</div>
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
              <p>Configure your Retro-X launcher settings here.</p>
              
              <div style={{marginTop: '30px', padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333'}}>
                <h3 style={{color: '#fff', marginBottom: '10px'}}>Global Pre-Launch Hook</h3>
                <p style={{fontSize: '14px', marginBottom: '15px'}}>
                  Automatically start a background program (like SteamTools) before launching any game. 
                  If it's already running, we won't start a duplicate.
                </p>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <button className="add-game-btn" onClick={handleSetHook}>Select Executable</button>
                  {hookPath && <button className="add-game-btn" onClick={handleClearHook} style={{borderColor: '#ef4444', color: '#ef4444'}}>Clear</button>}
                </div>
                {hookPath && <div style={{marginTop: '10px', fontSize: '12px', color: '#3ae190'}}>Active Hook: {hookPath}</div>}
              </div>

              <div style={{marginTop: '30px', padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333'}}>
                <h3 style={{color: '#fff', marginBottom: '10px'}}>TV Design Theme</h3>
                <p style={{fontSize: '14px', marginBottom: '15px'}}>Choose the physical design of your virtual CRT television.</p>
                <div style={{display: 'flex', gap: '15px'}}>
                  <button 
                    className="add-game-btn" 
                    onClick={() => setTvTheme('theme-1')}
                    style={{borderColor: tvTheme === 'theme-1' ? '#3ae190' : '#444', color: tvTheme === 'theme-1' ? '#3ae190' : '#fff'}}
                  >
                    Theme 1 (Wood & Stereo)
                  </button>
                  <button 
                    className="add-game-btn" 
                    onClick={() => setTvTheme('theme-2')}
                    style={{borderColor: tvTheme === 'theme-2' ? '#3ae190' : '#444', color: tvTheme === 'theme-2' ? '#3ae190' : '#fff'}}
                  >
                    Theme 2 (Dark Mono)
                  </button>
                </div>
              </div>

              <div style={{marginBottom: '20px', marginTop: '20px'}}>
                <label style={{display: 'block', marginBottom: '10px', color: '#3ae190', fontFamily: 'VT323', fontSize: '1.2rem'}}>Phosphor Glow</label>
                <input type="range" min="1" max="100" defaultValue="75" style={{width: '100%'}} />
              </div>

              <div style={{marginTop: '40px'}}>
                <h2 style={{color: '#fff', marginBottom: '20px'}}>Data Management</h2>
                <button className="add-game-btn" style={{marginRight: '15px'}} onClick={handleBackup}>Backup Save Data</button>
                <button className="add-game-btn" style={{borderColor: '#ef4444', color: '#ef4444'}}>Reset All Progress</button>
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {/* Left Hi-Fi Speaker */}
      <div className="hifi-speaker">
        <div className="speaker-grill-mesh">
          <div className="speaker-cone-small"></div>
          <div className="speaker-cone-large"></div>
        </div>
        <div className="speaker-brand">SONY</div>
      </div>

      <div className={`tv-case ${tvTheme}`}>
        <div className="tv-left-panel">
          {tvTheme === 'theme-1' && (
            <>
              <div className="theme-1-grill"></div>
              <div className="theme-1-grill" style={{flexGrow: 0.5}}></div>
            </>
          )}
        </div>

        <div className="crt-screen-wrapper">
          <div className="crt-content">
            {renderContent()}
          </div>
        </div>

        <div className="tv-control-panel">
          <div className="tv-brand">RETRO-X LAUNCHER</div>
          
          <button 
            className={`tv-button ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <Play size={24} />
            Channel 1
            <span style={{fontSize: '0.6rem', color: '#a8a29e'}}>Library</span>
          </button>

          <button 
            className={`tv-button ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            <TrendingUp size={24} />
            Channel 2
            <span style={{fontSize: '0.6rem', color: '#a8a29e'}}>Progress</span>
          </button>

          <button 
            className={`tv-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={24} />
            Channel 3
            <span style={{fontSize: '0.6rem', color: '#a8a29e'}}>Tuning</span>
          </button>

          <div className="tv-knob-container">
            <div className="tv-knob"></div>
            <span className="tv-knob-label">Volume</span>
          </div>
          
          {tvTheme === 'theme-1' && <div className="theme-1-grill" style={{height: '120px', flexGrow: 0, marginTop: '20px'}}></div>}
        </div>
      </div>

      {/* Right Hi-Fi Speaker */}
      <div className="hifi-speaker">
        <div className="speaker-grill-mesh">
          <div className="speaker-cone-small"></div>
          <div className="speaker-cone-large"></div>
        </div>
        <div className="speaker-brand">SONIC</div>
      </div>

      {/* Desk Surface for the TV to sit on */}
      <div className="desk-surface"></div>
    </div>
  );
}

export default App;

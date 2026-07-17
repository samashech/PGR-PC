import { Download, MonitorPlay, Zap, HardDrive, Gamepad2 } from 'lucide-react';

function App() {
  return (
    <>
      <div className="grid-overlay"></div>
      
      <nav className="nav">
        <div className="logo">
          <Gamepad2 size={32} />
          RETRO-X
        </div>
        <div>
          <a href="#features" style={{color: '#fff', textDecoration: 'none', marginRight: '20px'}}>Features</a>
          <a href="https://github.com/samashech/PGR-PC" style={{color: '#fff', textDecoration: 'none'}}>GitHub</a>
        </div>
      </nav>

      <main className="hero">
        <h1>Outrun The<br/>Modern Launcher.</h1>
        <p>
          A completely local, CRT-styled game launcher built with Rust. 
          Unleash the nostalgia with authentic physical TV themes, automatic playtime tracking, 
          and zero cloud telemetry.
        </p>
        <a href="https://github.com/samashech/PGR-PC/releases/latest/download/launcher_0.1.0_x64-setup.exe" className="download-btn">
          <Download size={24} />
          DOWNLOAD FOR WINDOWS
        </a>
        <p style={{marginTop: '15px', fontSize: '0.9rem', color: '#555'}}>Requires Windows 10/11 (64-bit)</p>
      </main>

      <section className="showcase">
        <div className="showcase-window">
          <div className="window-header">
            <div className="dot r"></div>
            <div className="dot y"></div>
            <div className="dot g"></div>
          </div>
          <div className="window-body">
            <p>&gt; initializing Retro-X...</p>
            <p>&gt; loading custom CRT shaders...</p>
            <p>&gt; scanning local directories...</p>
            <p style={{color: '#fff'}}>&gt; 145 LOCAL EXECUTABLES FOUND.</p>
            <p className="blink" style={{marginTop: '20px'}}>_</p>
          </div>
        </div>
      </section>

      <section id="features" className="features-section">
        <h2 style={{fontFamily: 'Audiowide', fontSize: '3rem', textAlign: 'center', marginBottom: '20px'}}>SYSTEM SPECS</h2>
        
        <div className="features-grid">
          <div className="feature-card">
            <MonitorPlay size={40} color="#b026ff" style={{marginBottom: '20px'}}/>
            <h3>Physical CRT Themes</h3>
            <p>Don't just launch games—interact with a beautifully rendered virtual television. Switch between authentic wooden casings or sleek dark mono designs instantly.</p>
          </div>
          
          <div className="feature-card">
            <Zap size={40} color="#39ff14" style={{marginBottom: '20px'}}/>
            <h3>Steam Hooking</h3>
            <p>Our advanced Rust backend instantly scans your Steam libraries. Launch your existing Steam games directly through the OS while maintaining full DRM compatibility.</p>
          </div>

          <div className="feature-card">
            <HardDrive size={40} color="#b026ff" style={{marginBottom: '20px'}}/>
            <h3>100% Offline & Local</h3>
            <p>No forced logins, no cloud syncing, no data harvesting. Your playtime stats and save backups live completely locally on your hard drive.</p>
          </div>
        </div>
      </section>
    </>
  );
}

export default App;

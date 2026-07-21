import { Download, MonitorPlay, Zap, HardDrive, Gamepad2 } from 'lucide-react';

function App() {
  return (
    <>
      <div className="grid-overlay"></div>
      <nav className="nav">
        <div className="logo">
          <Gamepad2 size={32} />
          PGR-PC
        </div>
        <div>
          <a href="#features" style={{color: '#fff', textDecoration: 'none', marginRight: '20px'}}>Features</a>
          <a href="https://github.com/samashech/PGR-PC" style={{color: '#fff', textDecoration: 'none'}}>GitHub</a>
        </div>
      </nav>

      <main className="hero">
        <div className="main-card">
          <div className="main-icon">
            <Download size={32} color="#000" />
          </div>
          <h1>Pgame Launcher</h1>
          <p>
            Experience authentic physical TV themes, automatic playtime tracking, 
            and zero cloud telemetry in a sleek modern package.
          </p>
          <a href="https://github.com/samashech/PGR-PC/releases/" className="download-btn" target="_blank" rel="noopener noreferrer">
            DOWNLOAD FOR WINDOWS
          </a>
        </div>
      </main>

      <section id="features" className="features-section">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <MonitorPlay size={24} color="#000" />
            </div>
            <div className="feature-text">
              <h3>Physical CRT Themes</h3>
              <p>Don't just launch games—interact with a beautifully rendered virtual television. Switch between authentic wooden casings or sleek dark mono designs instantly.</p>
            </div>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <Zap size={24} color="#000" />
            </div>
            <div className="feature-text">
              <h3>Steam Hooking</h3>
              <p>Our advanced Rust backend instantly scans your Steam libraries. Launch your existing Steam games directly through the OS while maintaining full DRM compatibility.</p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <HardDrive size={24} color="#000" />
            </div>
            <div className="feature-text">
              <h3>100% Offline & Local</h3>
              <p>No forced logins, no cloud syncing, no data harvesting. Your playtime stats and save backups live completely locally on your hard drive.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default App;

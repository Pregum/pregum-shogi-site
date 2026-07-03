import { useState } from 'react';
import { FoxMark } from './components/FoxMark';
import { Link, usePath } from './lib/router';
import { playMove, setSoundEnabled, soundEnabled } from './lib/sound';
import { Cpu } from './pages/Cpu';
import { Home } from './pages/Home';
import { KifuList, KifuView } from './pages/Kifu';
import { Practice } from './pages/Practice';
import { Room } from './pages/Room';
import { Rules } from './pages/Rules';
import { Study } from './pages/Study';

function SoundToggle() {
  const [on, setOn] = useState(soundEnabled());
  return (
    <button
      className="nav-link sound-toggle"
      title={on ? '効果音ON' : '効果音OFF'}
      onClick={() => {
        setSoundEnabled(!on);
        setOn(!on);
        if (!on) playMove(); // ONにしたら試し鳴らし
      }}
    >
      {on ? '🔊' : '🔇'}
    </button>
  );
}

export function App() {
  const path = usePath();

  const roomMatch = path.match(/^\/room\/([a-z0-9-]+)$/i);
  const kifuMatch = path.match(/^\/kifu\/([^/]+)$/);

  let page: React.ReactNode;
  let isHome = false;
  if (roomMatch) {
    page = <Room roomId={roomMatch[1]} key={roomMatch[1]} />;
  } else if (kifuMatch) {
    page = <KifuView id={decodeURIComponent(kifuMatch[1])} key={kifuMatch[1]} />;
  } else if (path === '/kifu') {
    page = <KifuList />;
  } else if (path === '/cpu') {
    page = <Cpu />;
  } else if (path === '/practice') {
    page = <Practice />;
  } else if (path === '/rules') {
    page = <Rules />;
  } else if (path === '/study') {
    page = <Study />;
  } else {
    page = <Home />;
    isHome = true;
  }

  return (
    <div className="app">
      {!isHome && (
        <header className="app-header">
          <Link to="/" className="brand">
            <FoxMark size={28} />
            <span className="brand-name">狐将棋</span>
          </Link>
          <nav className="header-nav">
            <Link to="/kifu" className="nav-link">
              棋譜庫
            </Link>
            <SoundToggle />
          </nav>
        </header>
      )}
      <main className="app-main">{page}</main>
    </div>
  );
}

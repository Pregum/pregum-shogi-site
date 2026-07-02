import { FoxMark } from './components/FoxMark';
import { Link, usePath } from './lib/router';
import { Home } from './pages/Home';
import { KifuList, KifuView } from './pages/Kifu';
import { Room } from './pages/Room';

export function App() {
  const path = usePath();

  const roomMatch = path.match(/^\/room\/([a-z0-9-]+)$/i);
  const kifuMatch = path.match(/^\/kifu\/([^/]+)$/);

  let page: React.ReactNode;
  if (roomMatch) {
    page = <Room roomId={roomMatch[1]} key={roomMatch[1]} />;
  } else if (kifuMatch) {
    page = <KifuView id={decodeURIComponent(kifuMatch[1])} key={kifuMatch[1]} />;
  } else if (path === '/kifu') {
    page = <KifuList />;
  } else {
    page = <Home />;
  }

  const isHome = !roomMatch && !kifuMatch && path !== '/kifu';

  return (
    <div className="app">
      {!isHome && (
        <header className="app-header">
          <Link to="/" className="brand">
            <FoxMark size={28} />
            <span className="brand-name">狐将棋</span>
          </Link>
          <nav>
            <Link to="/kifu" className="nav-link">
              棋譜庫
            </Link>
          </nav>
        </header>
      )}
      <main className="app-main">{page}</main>
    </div>
  );
}

import { useState } from 'react';
import { FoxMark, ToriiMark } from '../components/FoxMark';
import { Link, navigate } from '../lib/router';
import { getPlayerName, listKifu, setPlayerName } from '../lib/storage';

const TIME_CHOICES: { label: string; value: number | null }[] = [
  { label: 'なし', value: null },
  { label: '5分', value: 5 },
  { label: '10分', value: 10 },
  { label: '30分', value: 30 },
];

export function Home() {
  const [name, setName] = useState(getPlayerName());
  const [joinId, setJoinId] = useState('');
  const [timeControl, setTimeControl] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const kifuCount = listKifu().length;

  const createRoom = async () => {
    setPlayerName(name.trim() || '名無しの狐');
    setCreating(true);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = (await res.json()) as { roomId: string };
      if (timeControl) {
        sessionStorage.setItem('kitsune-shogi:pending-tc', String(timeControl));
      } else {
        sessionStorage.removeItem('kitsune-shogi:pending-tc');
      }
      navigate(`/room/${data.roomId}`);
    } catch {
      setCreating(false);
      alert('部屋の作成に失敗しました。時間をおいて再度お試しください。');
    }
  };

  const joinRoom = () => {
    const raw = joinId.trim();
    if (!raw) return;
    setPlayerName(name.trim() || '名無しの狐');
    // URL でも ID 単体でも受け付ける
    const m = raw.match(/room\/([a-z0-9-]+)/) ?? raw.match(/^([a-z0-9-]+)$/i);
    if (m) navigate(`/room/${m[1]}`);
  };

  return (
    <div className="home">
      <div className="embers" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="ember" style={{ ['--i' as string]: i }} />
        ))}
      </div>

      <section className="hero">
        <div className="hero-mark reveal" style={{ ['--d' as string]: '0ms' }}>
          <FoxMark size={96} />
        </div>
        <h1 className="hero-title reveal" style={{ ['--d' as string]: '80ms' }}>
          狐将棋
        </h1>
        <p className="hero-sub reveal" style={{ ['--d' as string]: '160ms' }}>
          こんこんと、一局。<span className="hero-sub-break" />
          狐の社で指すオンライン将棋 — URLを送るだけで友だちと対局。
        </p>

        <div className="hero-card reveal" style={{ ['--d' as string]: '240ms' }}>
          <label className="field">
            <span className="field-label">あなたの名前</span>
            <input
              type="text"
              value={name}
              maxLength={24}
              placeholder="名無しの狐"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className="field">
            <span className="field-label">持ち時間（切れ負け）</span>
            <div className="segmented">
              {TIME_CHOICES.map((c) => (
                <button
                  key={c.label}
                  className={timeControl === c.value ? 'is-active' : ''}
                  onClick={() => setTimeControl(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-lg" onClick={createRoom} disabled={creating}>
            {creating ? '社を建てています…' : '⛩ 対局部屋を作る'}
          </button>

          <div className="divider">
            <span>または</span>
          </div>

          <div className="join-row">
            <input
              type="text"
              value={joinId}
              placeholder="招待URL または 部屋ID"
              onChange={(e) => setJoinId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            />
            <button className="btn btn-ghost" onClick={joinRoom}>
              入室
            </button>
          </div>
        </div>

        <div className="mode-links reveal" style={{ ['--d' as string]: '320ms' }}>
          <Link to="/cpu" className="mode-card">
            <span className="mode-icon">🤖</span>
            <span className="mode-name">CPUと対局</span>
            <span className="mode-desc">1人で腕試し</span>
          </Link>
          <Link to="/practice" className="mode-card">
            <span className="mode-icon">🎓</span>
            <span className="mode-name">練習盤</span>
            <span className="mode-desc">自由に駒を動かす</span>
          </Link>
          <Link to="/rules" className="mode-card">
            <span className="mode-icon">📖</span>
            <span className="mode-name">遊び方</span>
            <span className="mode-desc">ルールと操作方法</span>
          </Link>
        </div>

        <div className="hero-links reveal" style={{ ['--d' as string]: '400ms' }}>
          <Link to="/kifu" className="kifu-link">
            📜 棋譜庫を開く{kifuCount > 0 ? `（${kifuCount}局）` : ''}
          </Link>
        </div>
      </section>

      <footer className="home-footer">
        <div className="torii-row" aria-hidden="true">
          <ToriiMark size={22} />
          <ToriiMark size={30} />
          <ToriiMark size={22} />
        </div>
        <p>
          対人戦・CPU対戦・待った・持ち時間・棋譜保存（KIF形式）対応 ／ 棋譜はブラウザに保存されます
        </p>
      </footer>
    </div>
  );
}

import { useMemo, useState } from 'react';
import type { Move } from '../../shared/shogi';
import { SENTE, isInCheck, outcome, replayAll } from '../../shared/shogi';
import { movesToJp } from '../../shared/kif';
import { Board } from '../components/Board';
import { Link } from '../lib/router';
import { playMove } from '../lib/sound';

// 1人で両陣営を自由に動かせる練習盤
export function Practice() {
  const [moves, setMoves] = useState<Move[]>([]);
  const positions = useMemo(() => replayAll(moves), [moves]);
  const pos = positions[positions.length - 1];
  const jpMoves = useMemo(() => movesToJp(moves), [moves]);

  const oc = outcome(pos);
  const check = !oc.over && isInCheck(pos, pos.turn);
  const lastTo = moves.length > 0 ? moves[moves.length - 1].to : null;

  const statusText = oc.over
    ? `詰み！ ${oc.winner === SENTE ? '先手' : '後手'}の勝ちです`
    : `${pos.turn === SENTE ? '☗ 先手' : '☖ 後手'}の番です${check ? '（王手！）' : ''}`;

  return (
    <div className="room">
      <div className="room-main">
        <div className="practice-note">
          🎓 練習盤 — 先手も後手も自由に動かせます。タップで駒を選び、光ったマスへ動かしてみましょう。
        </div>

        <Board
          pos={pos}
          viewpoint={SENTE}
          interactive={!oc.over}
          lastTo={lastTo}
          onMove={(m) => {
            setMoves([...moves, m]);
            playMove();
          }}
        />

        <div className="replay-controls">
          <button
            className="btn btn-ghost"
            disabled={moves.length === 0}
            onClick={() => setMoves(moves.slice(0, -1))}
          >
            ↩ 1手戻す
          </button>
          <button className="btn btn-ghost" disabled={moves.length === 0} onClick={() => setMoves([])}>
            盤を初期化
          </button>
        </div>
      </div>

      <aside className="room-side">
        <div className={`status-banner ${check ? 'is-check' : ''}`}>{statusText}</div>

        <div className="move-list-card">
          <h2>棋譜</h2>
          <ol className="move-list">
            {jpMoves.length === 0 && <li className="move-empty">まだ指し手はありません</li>}
            {jpMoves.map((m, i) => (
              <li key={i} className={i === jpMoves.length - 1 ? 'is-current' : ''}>
                <span className="move-no">{i + 1}</span>
                <span className="move-mark">{i % 2 === 0 ? '☗' : '☖'}</span>
                {m}
              </li>
            ))}
          </ol>
        </div>

        <div className="action-col">
          <Link to="/rules" className="btn btn-ghost">
            📖 ルールを確認する
          </Link>
          <Link to="/" className="btn btn-ghost">
            ホームへ
          </Link>
        </div>
      </aside>
    </div>
  );
}

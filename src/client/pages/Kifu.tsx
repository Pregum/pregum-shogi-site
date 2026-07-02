import { useMemo, useState } from 'react';
import { SENTE, replayAll } from '../../shared/shogi';
import { movesToJp } from '../../shared/kif';
import { Board } from '../components/Board';
import { Link, navigate } from '../lib/router';
import {
  deleteKifu,
  downloadKif,
  getKifu,
  listKifu,
  resultLabel,
} from '../lib/storage';
import { useEffect } from 'react';

export function KifuList() {
  const [records, setRecords] = useState(listKifu());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div className="kifu-page">
      <h1 className="page-title">📜 棋譜庫</h1>
      <p className="page-sub">このブラウザに保存された対局の記録です</p>

      {records.length === 0 && (
        <div className="kifu-empty">
          <p>まだ棋譜がありません。</p>
          <Link to="/" className="btn btn-primary">
            対局をはじめる
          </Link>
        </div>
      )}

      <ul className="kifu-list">
        {records.map((r) => (
          <li key={r.id} className="kifu-item">
            <button className="kifu-item-body" onClick={() => navigate(`/kifu/${r.id}`)}>
              <span className="kifu-date">{r.date.slice(0, 10)}</span>
              <span className="kifu-players">
                ☗{r.sente} <em>vs</em> ☖{r.gote}
              </span>
              <span className="kifu-result">{resultLabel(r)}</span>
              <span className="kifu-plies">{r.moves.length}手</span>
            </button>
            <div className="kifu-item-actions">
              <button className="btn btn-sm btn-ghost" onClick={() => downloadKif(r)}>
                KIF
              </button>
              {confirmDelete === r.id ? (
                <>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => {
                      deleteKifu(r.id);
                      setRecords(listKifu());
                      setConfirmDelete(null);
                    }}
                  >
                    削除する
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(null)}>
                    ×
                  </button>
                </>
              ) : (
                <button className="btn btn-sm btn-danger-ghost" onClick={() => setConfirmDelete(r.id)}>
                  削除
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function KifuView({ id }: { id: string }) {
  const record = useMemo(() => getKifu(id), [id]);
  const positions = useMemo(() => (record ? replayAll(record.moves) : []), [record]);
  const jpMoves = useMemo(() => (record ? movesToJp(record.moves) : []), [record]);
  const [index, setIndex] = useState(0);

  // 矢印キーで手を進める
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, positions.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [positions.length]);

  if (!record) {
    return (
      <div className="kifu-page">
        <p>棋譜が見つかりませんでした。</p>
        <Link to="/kifu" className="btn btn-ghost">
          棋譜庫へ戻る
        </Link>
      </div>
    );
  }

  const lastTo = index > 0 ? record.moves[index - 1].to : null;

  return (
    <div className="room kifu-view">
      <div className="room-main">
        <div className="kifu-view-header">
          <span>
            ☗{record.sente} <em>vs</em> ☖{record.gote}
          </span>
          <span className="kifu-result">{resultLabel(record)}</span>
        </div>

        <Board pos={positions[index]} viewpoint={SENTE} interactive={false} lastTo={lastTo} />

        <div className="replay-controls">
          <button className="btn btn-ghost" onClick={() => setIndex(0)} disabled={index === 0}>
            ⏮
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={index === 0}
          >
            ◀
          </button>
          <span className="replay-counter">
            {index} / {positions.length - 1} 手
          </span>
          <button
            className="btn btn-ghost"
            onClick={() => setIndex((i) => Math.min(i + 1, positions.length - 1))}
            disabled={index >= positions.length - 1}
          >
            ▶
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setIndex(positions.length - 1)}
            disabled={index >= positions.length - 1}
          >
            ⏭
          </button>
        </div>
      </div>

      <aside className="room-side">
        <div className="move-list-card">
          <h2>棋譜</h2>
          <ol className="move-list">
            {jpMoves.map((m, i) => (
              <li
                key={i}
                className={i + 1 === index ? 'is-current' : ''}
                onClick={() => setIndex(i + 1)}
                role="button"
              >
                <span className="move-no">{i + 1}</span>
                <span className="move-mark">{i % 2 === 0 ? '☗' : '☖'}</span>
                {m}
              </li>
            ))}
          </ol>
        </div>
        <div className="action-col">
          <button className="btn btn-primary" onClick={() => downloadKif(record)}>
            📜 KIF形式でダウンロード
          </button>
          <Link to="/kifu" className="btn btn-ghost">
            棋譜庫へ戻る
          </Link>
        </div>
      </aside>
    </div>
  );
}

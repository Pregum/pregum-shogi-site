import { useEffect, useMemo, useRef, useState } from 'react';
import type { Color, Move } from '../../shared/shogi';
import { GOTE, SENTE, isInCheck, replay } from '../../shared/shogi';
import { movesToJp } from '../../shared/kif';
import { Board } from '../components/Board';
import { FoxMark } from '../components/FoxMark';
import { Link } from '../lib/router';
import { playCheck, playEnd, playMove } from '../lib/sound';
import {
  REASON_JP,
  downloadKif,
  getPlayerName,
  saveKifu,
  setPlayerName,
  type KifuRecord,
} from '../lib/storage';
import { useRoom } from '../lib/useRoom';

export function Room({ roomId }: { roomId: string }) {
  const [name, setName] = useState(getPlayerName());
  const [joined, setJoined] = useState(!!getPlayerName());

  if (!joined) {
    return (
      <div className="join-screen">
        <div className="hero-card">
          <div className="join-fox">
            <FoxMark size={64} />
          </div>
          <p className="join-title">対局部屋に招待されています</p>
          <label className="field">
            <span className="field-label">あなたの名前</span>
            <input
              type="text"
              value={name}
              maxLength={24}
              placeholder="名無しの狐"
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPlayerName(name.trim() || '名無しの狐');
                  setJoined(true);
                }
              }}
            />
          </label>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              setPlayerName(name.trim() || '名無しの狐');
              setJoined(true);
            }}
          >
            入室する
          </button>
        </div>
      </div>
    );
  }

  return <RoomInner roomId={roomId} name={name.trim() || '名無しの狐'} />;
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function RoomInner({ roomId, name }: { roomId: string; name: string }) {
  // 部屋の作成者だけが持ち時間の設定を持ってくる(ホームで選択)
  const [timeControl] = useState<number | null>(() => {
    const raw = sessionStorage.getItem('kitsune-shogi:pending-tc');
    sessionStorage.removeItem('kitsune-shogi:pending-tc');
    return raw ? Number(raw) : null;
  });
  const { game, you, connected, error, send } = useRoom(roomId, name, timeControl);
  const [copied, setCopied] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);

  const pos = useMemo(() => (game ? replay(game.moves) : null), [game]);
  const jpMoves = useMemo(() => (game ? movesToJp(game.moves) : []), [game]);

  // 時計: スナップショット受信時刻を覚えて残り時間を進める
  const clockInfo = useMemo(
    () => (game?.clock ? { ...game.clock, receivedAt: Date.now() } : null),
    [game],
  );
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!clockInfo || game?.status !== 'playing') return;
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [clockInfo, game?.status]);

  const remainingMs = (color: Color): number | null => {
    if (!clockInfo || !game || !pos) return null;
    let ms = clockInfo.remaining[color];
    if (game.status === 'playing' && pos.turn === color) {
      const elapsedAtServer = clockInfo.serverNow - clockInfo.turnStartedAt;
      ms -= elapsedAtServer + (Date.now() - clockInfo.receivedAt);
    }
    return Math.max(0, ms);
  };

  // 効果音
  const prevRef = useRef<{ len: number; status: string } | null>(null);
  useEffect(() => {
    if (!game || !pos) return;
    const prev = prevRef.current;
    prevRef.current = { len: game.moves.length, status: game.status };
    if (!prev) return;
    if (game.moves.length > prev.len) {
      playMove();
      if (game.status === 'playing' && isInCheck(pos, pos.turn)) playCheck();
    }
    if (game.status === 'ended' && prev.status !== 'ended' && game.result) {
      playEnd(you !== null && game.result.winner === you);
    }
  }, [game, pos, you]);

  // 対局終了時に棋譜を自動保存
  useEffect(() => {
    if (!game || game.status !== 'ended' || !game.result || game.moves.length === 0) return;
    const record: KifuRecord = {
      id: `${game.roomId}-${game.gameNo}`,
      roomId: game.roomId,
      gameNo: game.gameNo,
      date: game.startedAt,
      sente: game.players[SENTE]?.name ?? '先手',
      gote: game.players[GOTE]?.name ?? '後手',
      moves: game.moves,
      winner: game.result.winner,
      reason: game.result.reason,
    };
    saveKifu(record);
  }, [game]);

  if (!game || !pos) {
    return (
      <div className="room-loading">
        <FoxMark size={56} />
        <p>{connected ? '社に入っています…' : '接続しています…'}</p>
      </div>
    );
  }

  const isPlayer = you !== null;
  const myTurn = isPlayer && game.status === 'playing' && pos.turn === you;
  const viewpoint: Color = you ?? SENTE;
  const lastTo = game.moves.length > 0 ? game.moves[game.moves.length - 1].to : null;
  const check = game.status === 'playing' && isInCheck(pos, pos.turn);

  const opponent = isPlayer ? game.players[(1 - you) as Color] : null;
  const waiting = game.status === 'waiting';

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード不可の環境では手動コピーしてもらう
    }
  };

  const onMove = (move: Move) => send({ type: 'move', move });

  const myMoveCount = you === null ? 0 : game.moves.filter((_, i) => i % 2 === you).length;
  const canMatta =
    isPlayer && game.status === 'playing' && myMoveCount > 0 && !game.pending;

  const statusText = (() => {
    if (waiting) return '対戦相手を待っています…';
    if (game.status === 'ended' && game.result) {
      const w = game.result.winner;
      const how = REASON_JP[game.result.reason] ?? game.result.reason;
      if (w === null) return `引き分けです（${how}）`;
      const winnerName = game.players[w]?.name ?? (w === SENTE ? '先手' : '後手');
      if (you !== null && w === you) return `🎉 あなたの勝ちです（${how}）`;
      if (you !== null) return `負けました…（${how}）`;
      return `${winnerName} の勝ち（${how}）`;
    }
    if (myTurn) return check ? '⚠️ 王手されています！ あなたの番です' : 'あなたの番です';
    if (isPlayer) return check ? '王手！ 相手の番です' : '相手の番です';
    return `観戦中 — ${pos.turn === SENTE ? '先手' : '後手'}番`;
  })();

  return (
    <div className="room">
      <div className="room-main">
        <PlayerBar
          name={opponent?.name ?? (waiting ? '（待機中）' : game.players[(1 - viewpoint) as Color]?.name ?? '—')}
          color={(1 - viewpoint) as Color}
          online={game.online[(1 - viewpoint) as Color]}
          active={game.status === 'playing' && pos.turn !== viewpoint}
          clockMs={remainingMs((1 - viewpoint) as Color)}
        />

        <Board
          pos={pos}
          viewpoint={viewpoint}
          interactive={myTurn}
          lastTo={lastTo}
          onMove={onMove}
        />

        <PlayerBar
          name={isPlayer ? `${name}（あなた）` : (game.players[viewpoint]?.name ?? '—')}
          color={viewpoint}
          online={isPlayer ? true : game.online[viewpoint]}
          active={game.status === 'playing' && pos.turn === viewpoint}
          clockMs={remainingMs(viewpoint)}
        />
      </div>

      <aside className="room-side">
        <div className={`status-banner ${myTurn ? 'is-turn' : ''} ${check ? 'is-check' : ''}`}>
          {statusText}
        </div>

        {waiting && (
          <div className="invite-card">
            <p>
              このURLを相手に送ると対局が始まります
              {game.timeControl ? `（持ち時間 ${game.timeControl}分）` : ''}
            </p>
            <div className="invite-url">{location.href}</div>
            <button className="btn btn-primary" onClick={copyUrl}>
              {copied ? '✓ コピーしました' : 'URLをコピー'}
            </button>
          </div>
        )}

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

        {isPlayer && game.status === 'playing' && (
          <div className="action-row">
            <button
              className="btn btn-ghost"
              disabled={!canMatta}
              onClick={() => send({ type: 'matta', action: 'request' })}
            >
              待った
            </button>
            {!confirmResign ? (
              <button className="btn btn-danger-ghost" onClick={() => setConfirmResign(true)}>
                投了
              </button>
            ) : (
              <span className="confirm-resign">
                本当に投了？
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    send({ type: 'resign' });
                    setConfirmResign(false);
                  }}
                >
                  はい
                </button>
                <button className="btn btn-ghost" onClick={() => setConfirmResign(false)}>
                  いいえ
                </button>
              </span>
            )}
          </div>
        )}

        {game.status === 'ended' && (
          <div className="action-col">
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!game.result) return;
                downloadKif({
                  id: `${game.roomId}-${game.gameNo}`,
                  roomId: game.roomId,
                  gameNo: game.gameNo,
                  date: game.startedAt,
                  sente: game.players[SENTE]?.name ?? '先手',
                  gote: game.players[GOTE]?.name ?? '後手',
                  moves: game.moves,
                  winner: game.result.winner,
                  reason: game.result.reason,
                });
              }}
            >
              📜 KIF形式でダウンロード
            </button>
            {isPlayer && (
              <button
                className="btn btn-ghost"
                disabled={!!game.pending}
                onClick={() => send({ type: 'rematch', action: 'request' })}
              >
                🔄 もう一局（先後入替）
              </button>
            )}
            <Link to="/kifu" className="btn btn-ghost">
              棋譜庫を見る
            </Link>
            <Link to="/" className="btn btn-ghost">
              ホームへ
            </Link>
          </div>
        )}

        {!connected && <div className="toast toast-warn">再接続しています…</div>}
        {error && <div className="toast toast-error">{error}</div>}
      </aside>

      {/* 待った・再戦の承認モーダル */}
      {game.pending && you !== null && game.pending.by !== you && (
        <div className="modal-backdrop">
          <div className="modal">
            <p className="modal-title">
              {game.pending.kind === 'matta'
                ? '相手が「待った」を申請しています'
                : '相手が「もう一局」を希望しています'}
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={() =>
                  send({ type: game.pending!.kind, action: 'accept' })
                }
              >
                承認する
              </button>
              <button
                className="btn btn-ghost"
                onClick={() =>
                  send({ type: game.pending!.kind, action: 'reject' })
                }
              >
                断る
              </button>
            </div>
          </div>
        </div>
      )}

      {game.pending && you !== null && game.pending.by === you && (
        <div className="toast toast-info">
          {game.pending.kind === 'matta' ? '待った' : 'もう一局'}を申請中 — 相手の返事を待っています…
        </div>
      )}
    </div>
  );
}

function PlayerBar({
  name,
  color,
  online,
  active,
  clockMs,
}: {
  name: string;
  color: Color;
  online: boolean;
  active: boolean;
  clockMs?: number | null;
}) {
  return (
    <div className={`player-bar ${active ? 'is-active' : ''}`}>
      <span className="player-mark">{color === SENTE ? '☗ 先手' : '☖ 後手'}</span>
      <span className="player-name">{name}</span>
      {clockMs !== null && clockMs !== undefined && (
        <span className={`player-clock ${clockMs < 30_000 ? 'is-danger' : ''}`}>
          {formatClock(clockMs)}
        </span>
      )}
      <span className={`online-dot ${online ? 'is-on' : ''}`} title={online ? 'オンライン' : 'オフライン'} />
    </div>
  );
}

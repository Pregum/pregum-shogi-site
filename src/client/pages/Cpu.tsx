import { useEffect, useMemo, useRef, useState } from 'react';
import type { Color, Move } from '../../shared/shogi';
import {
  GOTE,
  SENTE,
  checkRepetition,
  isInCheck,
  outcome,
  replayAll,
} from '../../shared/shogi';
import { movesToJp } from '../../shared/kif';
import { AI_NAMES, chooseMove, type AiLevel } from '../lib/ai';
import { Board } from '../components/Board';
import { useFormationBanner } from '../components/FormationBanner';
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
import type { GameResult } from '../../shared/protocol';

export function Cpu() {
  const [level, setLevel] = useState<AiLevel | null>(null);
  const [name, setName] = useState(getPlayerName() || '');

  if (level === null) {
    return (
      <div className="join-screen">
        <div className="hero-card">
          <div className="join-fox">
            <FoxMark size={64} />
          </div>
          <p className="join-title">🤖 CPUと対局（あなたが先手）</p>
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
          <div className="level-cards">
            {([1, 2, 3] as AiLevel[]).map((lv) => (
              <button
                key={lv}
                className="level-card"
                onClick={() => {
                  setPlayerName(name.trim() || '名無しの狐');
                  setLevel(lv);
                }}
              >
                <span className="level-icon">{lv === 1 ? '🦊' : lv === 2 ? '🦊🦊' : '👹'}</span>
                <span className="level-name">{AI_NAMES[lv]}</span>
              </button>
            ))}
          </div>
          <Link to="/" className="btn btn-ghost">
            ホームへ戻る
          </Link>
        </div>
      </div>
    );
  }

  return <CpuGame level={level} name={name.trim() || '名無しの狐'} onExit={() => setLevel(null)} />;
}

function CpuGame({ level, name, onExit }: { level: AiLevel; name: string; onExit: () => void }) {
  const [moves, setMoves] = useState<Move[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [thinking, setThinking] = useState(false);
  const gameIdRef = useRef(`cpu-${Math.random().toString(36).slice(2, 8)}`);
  const savedRef = useRef(false);
  const startedAtRef = useRef(new Date().toISOString());

  const positions = useMemo(() => replayAll(moves), [moves]);
  const pos = positions[positions.length - 1];
  const jpMoves = useMemo(() => movesToJp(moves), [moves]);
  const aiName = `CPU ${AI_NAMES[level]}`;

  const check = !result && isInCheck(pos, pos.turn);
  const humanTurn = !result && pos.turn === SENTE && !thinking;

  // 囲い完成エフェクト(もう一局でリセット)
  const formationBanner = useFormationBanner(pos, gameIdRef.current, [name, aiName]);

  // 終局判定(詰み・千日手)
  const judge = (nextPositions: typeof positions): GameResult | null => {
    const last = nextPositions[nextPositions.length - 1];
    const oc = outcome(last);
    if (oc.over) return { winner: oc.winner, reason: oc.reason ?? 'checkmate' };
    const rep = checkRepetition(nextPositions);
    if (rep.repetition) {
      if (rep.perpetual !== null) return { winner: (1 - rep.perpetual) as Color, reason: 'perpetual' };
      return { winner: null, reason: 'sennichite' };
    }
    return null;
  };

  const applyHumanMove = (move: Move) => {
    if (!humanTurn) return;
    const next = [...moves, move];
    setMoves(next);
    playMove();
    const r = judge(replayAll(next));
    if (r) {
      setResult(r);
      playEnd(r.winner === SENTE);
    }
  };

  // AIの手番
  useEffect(() => {
    if (result || pos.turn !== GOTE) return;
    let cancelled = false;
    setThinking(true);
    const delay = setTimeout(async () => {
      const move = await chooseMove(pos, level);
      if (cancelled) return;
      setThinking(false);
      if (!move) return; // 合法手なし(judgeで検出済みのはず)
      const next = [...moves, move];
      setMoves(next);
      playMove();
      const r = judge(replayAll(next));
      if (r) {
        setResult(r);
        playEnd(r.winner === SENTE);
      } else if (isInCheck(replayAll(next)[next.length], SENTE)) {
        playCheck();
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(delay);
      setThinking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves, result]);

  // 終局時に棋譜を保存
  useEffect(() => {
    if (!result || moves.length === 0 || savedRef.current) return;
    savedRef.current = true;
    const record: KifuRecord = {
      id: gameIdRef.current,
      roomId: gameIdRef.current,
      gameNo: 1,
      date: startedAtRef.current,
      sente: name,
      gote: aiName,
      moves,
      winner: result.winner,
      reason: result.reason,
    };
    saveKifu(record);
  }, [result, moves, name, aiName]);

  const undo = () => {
    if (moves.length === 0 || thinking) return;
    // 自分の手番に戻るまで戻す(CPU戦なので承認不要)
    const pops = moves.length % 2 === 1 ? 1 : 2;
    setMoves(moves.slice(0, moves.length - pops));
    setResult(null);
    savedRef.current = false;
  };

  const resign = () => {
    if (result) return;
    const r: GameResult = { winner: GOTE, reason: 'resign' };
    setResult(r);
    playEnd(false);
  };

  const lastTo = moves.length > 0 ? moves[moves.length - 1].to : null;

  const statusText = (() => {
    if (result) {
      const how = REASON_JP[result.reason] ?? result.reason;
      if (result.winner === null) return `引き分けです（${how}）`;
      return result.winner === SENTE ? `🎉 あなたの勝ちです（${how}）` : `負けました…（${how}）`;
    }
    if (thinking) return `${aiName} が考えています…`;
    return check ? '⚠️ 王手されています！ あなたの番です' : 'あなたの番です';
  })();

  return (
    <div className="room">
      <div className="room-main">
        <div className={`player-bar ${!result && pos.turn === GOTE ? 'is-active' : ''}`}>
          <span className="player-mark">☖ 後手</span>
          <span className="player-name">
            🤖 {aiName}
            {thinking && <span className="thinking-dots" />}
          </span>
        </div>

        <Board pos={pos} viewpoint={SENTE} interactive={humanTurn} lastTo={lastTo} onMove={applyHumanMove} />

        <div className={`player-bar ${!result && pos.turn === SENTE ? 'is-active' : ''}`}>
          <span className="player-mark">☗ 先手</span>
          <span className="player-name">{name}（あなた）</span>
        </div>
      </div>

      <aside className="room-side">
        <div className={`status-banner ${humanTurn ? 'is-turn' : ''} ${check && !result ? 'is-check' : ''}`}>
          {statusText}
        </div>

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

        {!result && (
          <div className="action-row">
            <button className="btn btn-ghost" disabled={moves.length === 0 || thinking} onClick={undo}>
              待った
            </button>
            <button className="btn btn-danger-ghost" onClick={resign}>
              投了
            </button>
          </div>
        )}

        {result && (
          <div className="action-col">
            <button
              className="btn btn-primary"
              onClick={() =>
                downloadKif({
                  id: gameIdRef.current,
                  roomId: gameIdRef.current,
                  gameNo: 1,
                  date: startedAtRef.current,
                  sente: name,
                  gote: aiName,
                  moves,
                  winner: result.winner,
                  reason: result.reason,
                })
              }
            >
              📜 KIF形式でダウンロード
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setMoves([]);
                setResult(null);
                savedRef.current = false;
                gameIdRef.current = `cpu-${Math.random().toString(36).slice(2, 8)}`;
                startedAtRef.current = new Date().toISOString();
              }}
            >
              🔄 もう一局
            </button>
            <button className="btn btn-ghost" onClick={onExit}>
              強さを選び直す
            </button>
            <Link to="/" className="btn btn-ghost">
              ホームへ
            </Link>
          </div>
        )}
      </aside>

      {formationBanner}
    </div>
  );
}

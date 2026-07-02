import { describe, expect, it } from 'vitest';
import {
  GOTE,
  SENTE,
  applyMove,
  checkRepetition,
  emptyHand,
  idx,
  initialPosition,
  legalMoves,
  outcome,
  replay,
  replayAll,
  type Move,
  type Position,
} from './shogi';
import { movesToJp, toKif } from './kif';

function emptyPosition(turn: 0 | 1 = SENTE): Position {
  return {
    board: new Array(81).fill(null),
    hands: [emptyHand(), emptyHand()],
    turn,
    ply: 0,
  };
}

describe('初期局面', () => {
  it('先手の合法手は30手', () => {
    expect(legalMoves(initialPosition())).toHaveLength(30);
  });

  it('1手指すと後手も30手', () => {
    const pos = applyMove(initialPosition(), {
      from: { file: 7, rank: 7 },
      to: { file: 7, rank: 6 },
      promote: false,
    });
    expect(pos.turn).toBe(GOTE);
    expect(legalMoves(pos)).toHaveLength(30);
  });
});

describe('詰みの判定', () => {
  it('頭金の詰み', () => {
    // 後手玉 5一、先手龍 5三、先手の持ち駒に金 → ５二金打で詰み
    const pos = emptyPosition();
    pos.board[idx(5, 1)] = { type: 'OU', color: GOTE };
    pos.board[idx(5, 3)] = { type: 'RY', color: SENTE };
    pos.board[idx(9, 9)] = { type: 'OU', color: SENTE };
    pos.hands[SENTE].KI = 1;

    const drop: Move = { to: { file: 5, rank: 2 }, drop: 'KI' };
    expect(legalMoves(pos).some((m) => m.drop === 'KI' && m.to.file === 5 && m.to.rank === 2)).toBe(true);

    const next = applyMove(pos, drop);
    const oc = outcome(next);
    expect(oc.over).toBe(true);
    expect(oc.winner).toBe(SENTE);
    expect(oc.reason).toBe('checkmate');
  });
});

describe('禁じ手', () => {
  it('二歩は指せない', () => {
    const pos = emptyPosition();
    pos.board[idx(5, 1)] = { type: 'OU', color: GOTE };
    pos.board[idx(9, 9)] = { type: 'OU', color: SENTE };
    pos.board[idx(5, 7)] = { type: 'FU', color: SENTE };
    pos.hands[SENTE].FU = 1;

    const drops = legalMoves(pos).filter((m) => m.drop === 'FU');
    expect(drops.some((m) => m.to.file === 5)).toBe(false);
    expect(drops.some((m) => m.to.file === 4)).toBe(true);
  });

  it('打ち歩詰めは指せない', () => {
    // 後手玉 1一、先手龍 3二 → １二歩打は詰みなので反則、１三歩打は合法
    const pos = emptyPosition();
    pos.board[idx(1, 1)] = { type: 'OU', color: GOTE };
    pos.board[idx(3, 2)] = { type: 'RY', color: SENTE };
    pos.board[idx(9, 9)] = { type: 'OU', color: SENTE };
    pos.hands[SENTE].FU = 1;

    const drops = legalMoves(pos).filter((m) => m.drop === 'FU');
    expect(drops.some((m) => m.to.file === 1 && m.to.rank === 2)).toBe(false);
    expect(drops.some((m) => m.to.file === 1 && m.to.rank === 3)).toBe(true);
  });

  it('行き所のない駒(1段目の歩)は不成で進めない', () => {
    const pos = emptyPosition();
    pos.board[idx(5, 9)] = { type: 'OU', color: SENTE };
    pos.board[idx(1, 1)] = { type: 'OU', color: GOTE };
    pos.board[idx(5, 2)] = { type: 'FU', color: SENTE };

    const moves = legalMoves(pos).filter(
      (m) => m.from?.file === 5 && m.from.rank === 2 && m.to.rank === 1,
    );
    expect(moves).toHaveLength(1);
    expect(moves[0].promote).toBe(true);
  });

  it('王手放置は指せない', () => {
    // 先手玉 5九 に後手飛車 5一 から王手 → 玉を逃げる/合駒する手のみ
    const pos = emptyPosition();
    pos.board[idx(5, 9)] = { type: 'OU', color: SENTE };
    pos.board[idx(5, 1)] = { type: 'HI', color: GOTE };
    pos.board[idx(1, 1)] = { type: 'OU', color: GOTE };
    pos.board[idx(9, 8)] = { type: 'KI', color: SENTE };

    const moves = legalMoves(pos);
    // 金を関係ない場所に動かす手は王手放置になるので存在しない
    expect(moves.every((m) => !(m.from?.file === 9 && m.from.rank === 8 && m.to.file === 9))).toBe(true);
  });
});

describe('棋譜表記', () => {
  it('日本語表記とKIF出力', () => {
    const moves: Move[] = [
      { from: { file: 7, rank: 7 }, to: { file: 7, rank: 6 }, promote: false },
      { from: { file: 3, rank: 3 }, to: { file: 3, rank: 4 }, promote: false },
      { from: { file: 8, rank: 8 }, to: { file: 2, rank: 2 }, promote: true },
    ];
    const jp = movesToJp(moves);
    expect(jp[0]).toBe('７六歩(77)');
    expect(jp[1]).toBe('３四歩(33)');
    expect(jp[2]).toBe('２二角成(88)');

    const kif = toKif(moves, {
      senteName: 'こん太',
      goteName: '白ぎつね',
      startedAt: '2026-07-02T12:00:00',
      winner: SENTE,
      endReason: 'resign',
    });
    expect(kif).toContain('先手：こん太');
    expect(kif).toContain('１ ７六歩(77)'.replace('１', '1'));
    expect(kif).toContain('投了');
    expect(kif).toContain('まで4手で先手の勝ち');
  });

  it('同〜表記', () => {
    const moves: Move[] = [
      { from: { file: 7, rank: 7 }, to: { file: 7, rank: 6 }, promote: false },
      { from: { file: 3, rank: 3 }, to: { file: 3, rank: 4 }, promote: false },
      { from: { file: 8, rank: 8 }, to: { file: 3, rank: 3 }, promote: false },
      { from: { file: 2, rank: 2 }, to: { file: 3, rank: 3 }, promote: false },
    ];
    const jp = movesToJp(moves);
    expect(jp[3]).toBe('同　角(22)');
  });
});

describe('千日手', () => {
  it('同一局面4回で千日手(引き分け)', () => {
    // 両者の玉を往復させて初期局面を4回出現させる
    const cycle: Move[] = [
      { from: { file: 5, rank: 9 }, to: { file: 5, rank: 8 }, promote: false }, // ▲５八玉
      { from: { file: 5, rank: 1 }, to: { file: 5, rank: 2 }, promote: false }, // △５二玉
      { from: { file: 5, rank: 8 }, to: { file: 5, rank: 9 }, promote: false }, // ▲５九玉
      { from: { file: 5, rank: 2 }, to: { file: 5, rank: 1 }, promote: false }, // △５一玉
    ];
    const moves = [...cycle, ...cycle, ...cycle];
    const positions = replayAll(moves);
    const rep = checkRepetition(positions);
    expect(rep.repetition).toBe(true);
    expect(rep.perpetual).toBe(null);

    // 3回目まで(8手)では千日手にならない
    expect(checkRepetition(replayAll(moves.slice(0, 8))).repetition).toBe(false);
  });

  it('連続王手の千日手は王手側の負け', () => {
    // 後手玉５一、先手飛４九。飛が５筋⇔４筋で王手を繰り返し、玉が往復する
    const start = emptyPosition();
    start.board[idx(5, 1)] = { type: 'OU', color: GOTE };
    start.board[idx(4, 9)] = { type: 'HI', color: SENTE };
    start.board[idx(9, 9)] = { type: 'OU', color: SENTE };

    const cycle: Move[] = [
      { from: { file: 4, rank: 9 }, to: { file: 5, rank: 9 }, promote: false }, // ▲５九飛(王手)
      { from: { file: 5, rank: 1 }, to: { file: 4, rank: 1 }, promote: false }, // △４一玉
      { from: { file: 5, rank: 9 }, to: { file: 4, rank: 9 }, promote: false }, // ▲４九飛(王手)
      { from: { file: 4, rank: 1 }, to: { file: 5, rank: 1 }, promote: false }, // △５一玉
    ];
    const positions: Position[] = [start];
    for (const m of [...cycle, ...cycle, ...cycle]) {
      positions.push(applyMove(positions[positions.length - 1], m));
    }
    const rep = checkRepetition(positions);
    expect(rep.repetition).toBe(true);
    expect(rep.perpetual).toBe(SENTE); // 王手をかけ続けた先手の負け
  });
});

describe('replay', () => {
  it('棋譜から局面を再現できる', () => {
    const moves: Move[] = [
      { from: { file: 7, rank: 7 }, to: { file: 7, rank: 6 }, promote: false },
      { from: { file: 3, rank: 3 }, to: { file: 3, rank: 4 }, promote: false },
      { from: { file: 8, rank: 8 }, to: { file: 2, rank: 2 }, promote: true },
    ];
    const pos = replay(moves);
    expect(pos.ply).toBe(3);
    expect(pos.board[idx(2, 2)]).toEqual({ type: 'UM', color: SENTE });
    expect(pos.hands[SENTE].KA).toBe(1); // 角を取っている
  });
});

// 将棋ルールエンジン(クライアント・サーバー共用)
// 座標系: file(筋) 1-9 / rank(段) 1-9。先手は rank が小さくなる方向へ進む。
// 盤配列 index = (rank - 1) * 9 + (file - 1)

export type Color = 0 | 1;
export const SENTE: Color = 0;
export const GOTE: Color = 1;

export type Base = 'FU' | 'KY' | 'KE' | 'GI' | 'KI' | 'KA' | 'HI' | 'OU';
export type PieceType = Base | 'TO' | 'NY' | 'NK' | 'NG' | 'UM' | 'RY';

export interface Piece {
  type: PieceType;
  color: Color;
}

export interface Sq {
  file: number;
  rank: number;
}

export interface Move {
  from?: Sq;
  to: Sq;
  drop?: Base;
  promote?: boolean;
}

export type Hand = Record<Base, number>;

export interface Position {
  board: (Piece | null)[];
  hands: [Hand, Hand];
  turn: Color;
  ply: number;
}

export const PROMOTE: Partial<Record<PieceType, PieceType>> = {
  FU: 'TO',
  KY: 'NY',
  KE: 'NK',
  GI: 'NG',
  KA: 'UM',
  HI: 'RY',
};

export const DEMOTE: Partial<Record<PieceType, Base>> = {
  TO: 'FU',
  NY: 'KY',
  NK: 'KE',
  NG: 'GI',
  UM: 'KA',
  RY: 'HI',
};

export const HAND_ORDER: Base[] = ['HI', 'KA', 'KI', 'GI', 'KE', 'KY', 'FU'];

const GOLD_STEPS = [
  [0, -1],
  [-1, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
];

const STEPS: Record<PieceType, number[][]> = {
  FU: [[0, -1]],
  KY: [],
  KE: [
    [-1, -2],
    [1, -2],
  ],
  GI: [
    [0, -1],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  KI: GOLD_STEPS,
  TO: GOLD_STEPS,
  NY: GOLD_STEPS,
  NK: GOLD_STEPS,
  NG: GOLD_STEPS,
  KA: [],
  HI: [],
  OU: [
    [0, -1],
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [0, 1],
    [-1, 1],
    [1, 1],
  ],
  UM: [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ],
  RY: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
};

const DIAG = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];
const ORTH = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

const SLIDES: Record<PieceType, number[][]> = {
  FU: [],
  KY: [[0, -1]],
  KE: [],
  GI: [],
  KI: [],
  TO: [],
  NY: [],
  NK: [],
  NG: [],
  OU: [],
  KA: DIAG,
  HI: ORTH,
  UM: DIAG,
  RY: ORTH,
};

export function idx(file: number, rank: number): number {
  return (rank - 1) * 9 + (file - 1);
}

export function inBoard(file: number, rank: number): boolean {
  return file >= 1 && file <= 9 && rank >= 1 && rank <= 9;
}

export function emptyHand(): Hand {
  return { FU: 0, KY: 0, KE: 0, GI: 0, KI: 0, KA: 0, HI: 0, OU: 0 };
}

export function initialPosition(): Position {
  const board: (Piece | null)[] = new Array(81).fill(null);
  const backRank: PieceType[] = ['KY', 'KE', 'GI', 'KI', 'OU', 'KI', 'GI', 'KE', 'KY'];
  for (let file = 1; file <= 9; file++) {
    board[idx(file, 1)] = { type: backRank[file - 1], color: GOTE };
    board[idx(file, 9)] = { type: backRank[file - 1], color: SENTE };
    board[idx(file, 3)] = { type: 'FU', color: GOTE };
    board[idx(file, 7)] = { type: 'FU', color: SENTE };
  }
  board[idx(8, 2)] = { type: 'HI', color: GOTE };
  board[idx(2, 2)] = { type: 'KA', color: GOTE };
  board[idx(2, 8)] = { type: 'HI', color: SENTE };
  board[idx(8, 8)] = { type: 'KA', color: SENTE };
  return { board, hands: [emptyHand(), emptyHand()], turn: SENTE, ply: 0 };
}

export function clonePosition(pos: Position): Position {
  return {
    board: pos.board.slice(),
    hands: [{ ...pos.hands[0] }, { ...pos.hands[1] }],
    turn: pos.turn,
    ply: pos.ply,
  };
}

// STEPS/SLIDES は先手視点(前進 = dy: -1)で定義しているので、
// 後手はベクトルの向きを反転させる
function orient(color: Color): number {
  return color === SENTE ? 1 : -1;
}

// 敵陣(成れるゾーン)
export function inPromotionZone(rank: number, color: Color): boolean {
  return color === SENTE ? rank <= 3 : rank >= 7;
}

// その段に置く(進める)と一生動けなくなる駒か
function isDeadSquare(type: Base | PieceType, rank: number, color: Color): boolean {
  const last = color === SENTE ? 1 : 9;
  const secondLast = color === SENTE ? 2 : 8;
  if (type === 'FU' || type === 'KY') return rank === last;
  if (type === 'KE') return rank === last || rank === secondLast;
  return false;
}

export function findKing(pos: Position, color: Color): Sq | null {
  for (let r = 1; r <= 9; r++) {
    for (let f = 1; f <= 9; f++) {
      const p = pos.board[idx(f, r)];
      if (p && p.type === 'OU' && p.color === color) return { file: f, rank: r };
    }
  }
  return null;
}

// sq が color 側の駒に利いているか
export function isAttacked(pos: Position, sq: Sq, by: Color): boolean {
  const dir = orient(by);
  for (let r = 1; r <= 9; r++) {
    for (let f = 1; f <= 9; f++) {
      const p = pos.board[idx(f, r)];
      if (!p || p.color !== by) continue;
      for (const [dx, dy] of STEPS[p.type]) {
        if (f + dx === sq.file && r + dy * dir === sq.rank) return true;
      }
      for (const [dx, dy] of SLIDES[p.type]) {
        let tf = f + dx;
        let tr = r + dy * dir;
        while (inBoard(tf, tr)) {
          if (tf === sq.file && tr === sq.rank) return true;
          if (pos.board[idx(tf, tr)]) break;
          tf += dx;
          tr += dy * dir;
        }
      }
    }
  }
  return false;
}

export function isInCheck(pos: Position, color: Color): boolean {
  const king = findKing(pos, color);
  if (!king) return false;
  return isAttacked(pos, king, (1 - color) as Color);
}

// 合法性チェックなしで着手を適用する
export function applyMove(pos: Position, move: Move): Position {
  const next = clonePosition(pos);
  const me = pos.turn;
  if (move.drop) {
    next.board[idx(move.to.file, move.to.rank)] = { type: move.drop, color: me };
    next.hands[me][move.drop]--;
  } else if (move.from) {
    const from = idx(move.from.file, move.from.rank);
    const to = idx(move.to.file, move.to.rank);
    const piece = next.board[from];
    if (!piece) throw new Error('移動元に駒がありません');
    const captured = next.board[to];
    if (captured) {
      const base = (DEMOTE[captured.type] ?? captured.type) as Base;
      if (base !== 'OU') next.hands[me][base]++;
    }
    next.board[to] = move.promote
      ? { type: PROMOTE[piece.type] as PieceType, color: piece.color }
      : piece;
    next.board[from] = null;
  }
  next.turn = (1 - me) as Color;
  next.ply = pos.ply + 1;
  return next;
}

function pseudoBoardMoves(pos: Position): Move[] {
  const me = pos.turn;
  const dir = orient(me);
  const out: Move[] = [];
  for (let r = 1; r <= 9; r++) {
    for (let f = 1; f <= 9; f++) {
      const p = pos.board[idx(f, r)];
      if (!p || p.color !== me) continue;
      const targets: Sq[] = [];
      for (const [dx, dy] of STEPS[p.type]) {
        const tf = f + dx;
        const tr = r + dy * dir;
        if (!inBoard(tf, tr)) continue;
        const occ = pos.board[idx(tf, tr)];
        if (!occ || occ.color !== me) targets.push({ file: tf, rank: tr });
      }
      for (const [dx, dy] of SLIDES[p.type]) {
        let tf = f + dx;
        let tr = r + dy * dir;
        while (inBoard(tf, tr)) {
          const occ = pos.board[idx(tf, tr)];
          if (!occ) {
            targets.push({ file: tf, rank: tr });
          } else {
            if (occ.color !== me) targets.push({ file: tf, rank: tr });
            break;
          }
          tf += dx;
          tr += dy * dir;
        }
      }
      const from = { file: f, rank: r };
      for (const to of targets) {
        const canPromote =
          !!PROMOTE[p.type] &&
          (inPromotionZone(from.rank, me) || inPromotionZone(to.rank, me));
        const mustPromote = isDeadSquare(p.type, to.rank, me);
        if (canPromote) out.push({ from, to, promote: true });
        if (!mustPromote) out.push({ from, to, promote: false });
      }
    }
  }
  return out;
}

function pseudoDrops(pos: Position): Move[] {
  const me = pos.turn;
  const out: Move[] = [];
  const pawnFiles = new Set<number>();
  for (let r = 1; r <= 9; r++) {
    for (let f = 1; f <= 9; f++) {
      const p = pos.board[idx(f, r)];
      if (p && p.color === me && p.type === 'FU') pawnFiles.add(f);
    }
  }
  for (const base of HAND_ORDER) {
    if (pos.hands[me][base] <= 0) continue;
    for (let r = 1; r <= 9; r++) {
      for (let f = 1; f <= 9; f++) {
        if (pos.board[idx(f, r)]) continue;
        if (isDeadSquare(base, r, me)) continue;
        if (base === 'FU' && pawnFiles.has(f)) continue; // 二歩
        out.push({ to: { file: f, rank: r }, drop: base });
      }
    }
  }
  return out;
}

// 自殺手・打ち歩詰めを除外しない高速な候補手生成(AIの探索用)。
// 王を取る手が生成されうる前提で使うこと。
export function pseudoMoves(pos: Position): Move[] {
  return [...pseudoBoardMoves(pos), ...pseudoDrops(pos)];
}

export function legalMoves(pos: Position, checkUchifuzume = true): Move[] {
  const me = pos.turn;
  const opp = (1 - me) as Color;
  const all = [...pseudoBoardMoves(pos), ...pseudoDrops(pos)];
  return all.filter((m) => {
    const next = applyMove(pos, m);
    const king = findKing(next, me);
    if (king && isAttacked(next, king, opp)) return false; // 自殺手・王手放置
    if (checkUchifuzume && m.drop === 'FU' && isInCheck(next, opp)) {
      // 打ち歩詰め: 歩を打った瞬間に相手が詰むのは反則
      if (legalMoves(next, false).length === 0) return false;
    }
    return true;
  });
}

export function moveEquals(a: Move, b: Move): boolean {
  const sq = (x?: Sq, y?: Sq) =>
    (!x && !y) || (!!x && !!y && x.file === y.file && x.rank === y.rank);
  return (
    sq(a.from, b.from) &&
    sq(a.to, b.to) &&
    (a.drop ?? null) === (b.drop ?? null) &&
    (a.promote ?? false) === (b.promote ?? false)
  );
}

export interface GameOutcome {
  over: boolean;
  winner: Color | null;
  reason: 'checkmate' | 'stalemate' | null;
}

// 手番側に合法手がなければ負け(詰み)
export function outcome(pos: Position): GameOutcome {
  if (legalMoves(pos).length > 0) return { over: false, winner: null, reason: null };
  const winner = (1 - pos.turn) as Color;
  return {
    over: true,
    winner,
    reason: isInCheck(pos, pos.turn) ? 'checkmate' : 'stalemate',
  };
}

// 棋譜(moves)を先頭から適用して局面を得る。不正な手があれば例外。
export function replay(moves: Move[]): Position {
  let pos = initialPosition();
  for (const m of moves) pos = applyMove(pos, m);
  return pos;
}

// 千日手判定用の局面キー(盤面+持ち駒+手番)
export function positionKey(pos: Position): string {
  const cells: string[] = [];
  for (let i = 0; i < 81; i++) {
    const p = pos.board[i];
    cells.push(p ? `${p.color}${p.type}` : '.');
  }
  const hands = pos.hands
    .map((h) => HAND_ORDER.map((b) => h[b]).join(','))
    .join('/');
  return `${cells.join(',')}|${hands}|${pos.turn}`;
}

export interface RepetitionResult {
  repetition: boolean;
  // 連続王手の千日手を仕掛けた側(=負ける側)。通常の千日手なら null
  perpetual: Color | null;
}

// 最終局面と同一の局面が4回出現したら千日手。
// その間、一方の指し手がすべて王手なら「連続王手の千日手」でその側の負け。
export function checkRepetition(positions: Position[]): RepetitionResult {
  const last = positions.length - 1;
  if (last < 1) return { repetition: false, perpetual: null };
  const key = positionKey(positions[last]);
  const occurrences: number[] = [];
  for (let i = 0; i <= last; i++) {
    if (positionKey(positions[i]) === key) occurrences.push(i);
  }
  if (occurrences.length < 4) return { repetition: false, perpetual: null };

  const from = occurrences[0];
  for (const color of [SENTE, GOTE] as Color[]) {
    let moved = false;
    let allChecks = true;
    for (let i = from; i < last; i++) {
      if (i % 2 !== color) continue; // i手目(0始まり)の手番
      moved = true;
      if (!isInCheck(positions[i + 1], (1 - color) as Color)) {
        allChecks = false;
        break;
      }
    }
    if (moved && allChecks) return { repetition: true, perpetual: color };
  }
  return { repetition: true, perpetual: null };
}

export function replayAll(moves: Move[]): Position[] {
  const out: Position[] = [initialPosition()];
  for (const m of moves) out.push(applyMove(out[out.length - 1], m));
  return out;
}

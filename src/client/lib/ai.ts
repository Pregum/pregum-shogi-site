// CPU対戦用のAI(ネガマックス + アルファベータ探索)
// 探索中は自殺手を除外しない pseudoMoves を使い、王を取られたら大負けと
// 評価することで高速化する(ルートだけ厳密な legalMoves を使う)。
import type { Color, Move, PieceType, Position } from '../../shared/shogi';
import {
  HAND_ORDER,
  applyMove,
  idx,
  legalMoves,
  pseudoMoves,
} from '../../shared/shogi';

export type AiLevel = 1 | 2 | 3;

export const AI_NAMES: Record<AiLevel, string> = {
  1: 'こぎつね（弱い）',
  2: 'きつね（ふつう）',
  3: '妖狐（強い）',
};

const VAL: Record<PieceType, number> = {
  FU: 90,
  KY: 315,
  KE: 405,
  GI: 495,
  KI: 540,
  KA: 855,
  HI: 990,
  OU: 20000,
  TO: 560,
  NY: 560,
  NK: 560,
  NG: 560,
  UM: 1050,
  RY: 1190,
};

const INF = 1_000_000;

// pos.turn 側から見た評価値
function evaluate(pos: Position): number {
  let score = 0;
  for (let i = 0; i < 81; i++) {
    const p = pos.board[i];
    if (!p) continue;
    const sign = p.color === pos.turn ? 1 : -1;
    score += sign * VAL[p.type];
    // わずかに前進を評価する(玉以外)
    if (p.type !== 'OU') {
      const rank = Math.floor(i / 9) + 1;
      const advance = p.color === 0 ? 9 - rank : rank - 1;
      score += sign * advance * 2;
    }
  }
  for (const color of [0, 1] as Color[]) {
    const sign = color === pos.turn ? 1 : -1;
    for (const base of HAND_ORDER) {
      score += sign * pos.hands[color][base] * VAL[base];
    }
  }
  return score;
}

function captureValue(pos: Position, m: Move): number {
  const target = pos.board[idx(m.to.file, m.to.rank)];
  return target ? VAL[target.type] : 0;
}

interface SearchCtx {
  nodes: number;
  budget: number;
}

function negamax(
  pos: Position,
  depth: number,
  alpha: number,
  beta: number,
  ctx: SearchCtx,
): number {
  if (depth === 0 || ctx.nodes >= ctx.budget) return evaluate(pos);
  const moves = pseudoMoves(pos);
  if (moves.length === 0) return -INF;
  // 駒得の大きい手から調べて枝刈りを効かせる
  moves.sort((a, b) => captureValue(pos, b) - captureValue(pos, a));

  let best = -INF;
  for (const m of moves) {
    // 相手の王を取れる = 前の手が違法(王手放置)だったということ
    const target = pos.board[idx(m.to.file, m.to.rank)];
    if (target?.type === 'OU') return INF;
    ctx.nodes++;
    const score = -negamax(applyMove(pos, m), depth - 1, -beta, -alpha, ctx);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function chooseMoveSync(pos: Position, level: AiLevel): Move | null {
  const moves = legalMoves(pos);
  if (moves.length === 0) return null;

  const depth = level; // Lv1: 1手読み / Lv2: 2手読み / Lv3: 3手読み
  const noise = level === 1 ? 260 : level === 2 ? 40 : 0;
  const ctx: SearchCtx = { nodes: 0, budget: 400_000 };

  let best: Move = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    ctx.nodes++;
    let score = -negamax(applyMove(pos, m), depth - 1, -INF, INF, ctx);
    score += noise > 0 ? (Math.random() * 2 - 1) * noise : Math.random(); // 同点はランダムに
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

// UIを固めないように1フレーム譲ってから思考する
export function chooseMove(pos: Position, level: AiLevel): Promise<Move | null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(chooseMoveSync(pos, level)), 30);
  });
}

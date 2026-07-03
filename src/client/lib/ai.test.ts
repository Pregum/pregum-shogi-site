import { describe, expect, it } from 'vitest';
import {
  GOTE,
  SENTE,
  applyMove,
  emptyHand,
  idx,
  initialPosition,
  legalMoves,
  moveEquals,
  outcome,
  type Position,
} from '../../shared/shogi';
import { chooseMove } from './ai';

describe('CPU AI', () => {
  it('初期局面で合法手を返す(全レベル)', async () => {
    const pos = initialPosition();
    const legal = legalMoves(pos);
    for (const level of [1, 2, 3] as const) {
      const move = await chooseMove(pos, level);
      expect(move).not.toBeNull();
      expect(legal.some((m) => moveEquals(m, move!))).toBe(true);
    }
  });

  it('Lv.3は1手で勝ちになる手を見つける', async () => {
    const pos: Position = {
      board: new Array(81).fill(null),
      hands: [emptyHand(), emptyHand()],
      turn: SENTE,
      ply: 0,
    };
    // 龍は４三(王手はかかっていない)。５二金打の頭金など1手勝ちが複数ある局面
    pos.board[idx(5, 1)] = { type: 'OU', color: GOTE };
    pos.board[idx(4, 3)] = { type: 'RY', color: SENTE };
    pos.board[idx(9, 9)] = { type: 'OU', color: SENTE };
    pos.hands[SENTE].KI = 1;

    const move = await chooseMove(pos, 3);
    expect(move).not.toBeNull();
    const oc = outcome(applyMove(pos, move!));
    expect(oc.over, 'AIの選んだ手が1手勝ちになっていない').toBe(true);
    expect(oc.winner).toBe(SENTE);
  });
});

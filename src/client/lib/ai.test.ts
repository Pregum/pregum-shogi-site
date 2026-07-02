import { describe, expect, it } from 'vitest';
import {
  GOTE,
  SENTE,
  emptyHand,
  idx,
  initialPosition,
  legalMoves,
  moveEquals,
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

  it('Lv.3は頭金の1手詰みを見つける', async () => {
    const pos: Position = {
      board: new Array(81).fill(null),
      hands: [emptyHand(), emptyHand()],
      turn: SENTE,
      ply: 0,
    };
    // 龍は４三(王手はかかっていない)。５二金打で頭金の詰み
    pos.board[idx(5, 1)] = { type: 'OU', color: GOTE };
    pos.board[idx(4, 3)] = { type: 'RY', color: SENTE };
    pos.board[idx(9, 9)] = { type: 'OU', color: SENTE };
    pos.hands[SENTE].KI = 1;

    const move = await chooseMove(pos, 3);
    expect(move).toEqual({ to: { file: 5, rank: 2 }, drop: 'KI' });
  });
});

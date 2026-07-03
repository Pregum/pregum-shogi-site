import { describe, expect, it } from 'vitest';
import { GOTE, SENTE, applyMove, idx, initialPosition, legalMoves } from './shogi';
import { detectFormations } from './formations';
import { LESSONS } from '../client/lib/lessons';

describe('囲いの検出', () => {
  it('初期局面では何も検出されない', () => {
    expect(detectFormations(initialPosition())).toEqual([]);
  });

  it('先手の美濃囲いを検出する', () => {
    const pos = initialPosition();
    const move = (ff: number, fr: number, tf: number, tr: number) => {
      pos.board[idx(tf, tr)] = pos.board[idx(ff, fr)];
      pos.board[idx(ff, fr)] = null;
    };
    move(2, 8, 6, 8); // 飛
    move(5, 9, 2, 8); // 玉
    move(3, 9, 3, 8); // 銀
    move(6, 9, 5, 8); // 金
    const found = detectFormations(pos);
    expect(found).toEqual([{ id: 'mino', name: '美濃囲い', color: SENTE }]);
  });

  it('後手の矢倉囲いを鏡映しで検出する', () => {
    const pos = initialPosition();
    const move = (ff: number, fr: number, tf: number, tr: number) => {
      pos.board[idx(tf, tr)] = pos.board[idx(ff, fr)];
      pos.board[idx(ff, fr)] = null;
    };
    // 先手視点(88玉/78金/77銀/67金)の点対称: 22玉/32金/33銀/43金
    move(2, 2, 4, 2); // 角をどける
    move(5, 1, 2, 2); // 玉
    move(4, 1, 3, 2); // 金
    move(3, 1, 3, 3); // 銀
    move(6, 1, 4, 3); // 金
    const found = detectFormations(pos);
    expect(found).toEqual([{ id: 'yagura', name: '矢倉囲い', color: GOTE }]);
  });
});

describe('レッスンデータの整合性', () => {
  it('全レッスンにステップがある', () => {
    for (const lesson of LESSONS) {
      expect(lesson.steps.length).toBeGreaterThan(1);
      for (const step of lesson.steps) {
        expect(step.pos.board).toHaveLength(81);
        expect(step.caption.length).toBeGreaterThan(0);
      }
    }
  });

  it('囲いレッスンの最終形は検出パターンと一致する', () => {
    for (const id of ['yagura', 'mino', 'anaguma', 'ginkanmuri', 'takamino']) {
      const lesson = LESSONS.find((l) => l.id === id)!;
      const last = lesson.steps[lesson.steps.length - 1].pos;
      const found = detectFormations(last);
      expect(found.some((f) => f.id === id && f.color === SENTE)).toBe(true);
    }
  });

  it('手筋・戦法レッスンの指し手はすべて合法手', () => {
    for (const lesson of LESSONS.filter((l) => l.category !== '囲い')) {
      for (let i = 1; i < lesson.steps.length; i++) {
        const prev = lesson.steps[i - 1].pos;
        const cur = lesson.steps[i].pos;
        if (cur === prev) continue; // 解説だけのステップ(局面は同じ)
        const target = JSON.stringify(cur.board) + JSON.stringify(cur.hands);
        const reachable = legalMoves(prev).some((m) => {
          const next = applyMove(prev, m);
          return JSON.stringify(next.board) + JSON.stringify(next.hands) === target;
        });
        expect(reachable, `${lesson.id} の ${i} 手目が合法手で再現できない`).toBe(true);
      }
    }
  });
});

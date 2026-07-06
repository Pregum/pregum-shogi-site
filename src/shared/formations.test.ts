import { describe, expect, it } from 'vitest';
import {
  GOTE,
  SENTE,
  applyMove,
  idx,
  initialPosition,
  isAttacked,
  legalMoves,
  outcome,
} from './shogi';
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
    for (const id of ['yagura', 'mino', 'anaguma', 'ginkanmuri', 'takamino', 'tenshukaku', 'diamond-mino']) {
      const lesson = LESSONS.find((l) => l.id === id)!;
      const last = lesson.steps[lesson.steps.length - 1].pos;
      const found = detectFormations(last);
      expect(found.some((f) => f.id === id && f.color === SENTE)).toBe(true);
    }
  });

  it('必至・腹銀レッスン: 開始局面に即詰みは存在しない(だからこそ縛りに価値がある)', () => {
    for (const id of ['hisshi', 'haragin']) {
      const lesson = LESSONS.find((l) => l.id === id)!;
      const start = lesson.steps[0].pos;
      const immediateMate = legalMoves(start).some((m) => outcome(applyMove(start, m)).over);
      expect(immediateMate, `${id}: 開始局面に1手詰みがあり、必至/縛りをかける意味がない`).toBe(false);
    }
  });

  it('必至・腹銀レッスン: 後手のどんな受け・逃げにも1手詰みが存在する', () => {
    // どちらも「決め手を放った直後(後手番)」の局面が対象
    for (const id of ['hisshi', 'haragin']) {
      const lesson = LESSONS.find((l) => l.id === id)!;
      const pos = lesson.steps[1].pos;
      const defenses = legalMoves(pos);
      expect(defenses.length).toBeGreaterThan(0);
      for (const d of defenses) {
        const afterDefense = applyMove(pos, d);
        const mateExists = legalMoves(afterDefense).some(
          (m) => outcome(applyMove(afterDefense, m)).over,
        );
        expect(mateExists, `${id}: 受け ${JSON.stringify(d)} に対する詰みがない`).toBe(true);
      }
    }
  });

  it('両取りレッスン: 打ち込んだ駒・出た駒が相手に取られない', () => {
    // 割り打ちの銀(▲4一銀)・十字飛車(▲5五飛)・ふんどしの桂(▲4三桂)
    const checks: [string, number, number][] = [
      ['wariuchi-gin', 4, 1],
      ['juji-bisha', 5, 5],
      ['fundoshi-kei', 4, 3],
    ];
    for (const [id, file, rank] of checks) {
      const lesson = LESSONS.find((l) => l.id === id)!;
      const pos = lesson.steps[1].pos;
      expect(
        isAttacked(pos, { file, rank }, GOTE),
        `${id}: ${file}${rank} の駒が後手に取られてしまう`,
      ).toBe(false);
    }
  });

  it('「詰み」と解説しているレッスンの最終局面は本当に詰み', () => {
    for (const id of [
      'atama-kin',
      'haragin',
      'chudan-gyoku',
      'mino-kuzushi',
      'hisshi',
      'ikken-ryu',
      'aki-oute',
    ]) {
      const lesson = LESSONS.find((l) => l.id === id)!;
      const last = lesson.steps[lesson.steps.length - 1].pos;
      const oc = outcome(last);
      expect(oc.over, `${id} の最終局面が詰んでいない`).toBe(true);
      expect(oc.reason).toBe('checkmate');
      expect(oc.winner).toBe(SENTE);
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

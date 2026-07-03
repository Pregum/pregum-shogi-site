// 囲い(陣形)の検出
// パターンは先手視点の絶対座標で定義し、後手は盤を点対称に反転して照合する。
import type { Color, PieceType, Position } from './shogi';
import { GOTE, SENTE, idx } from './shogi';

export interface Formation {
  id: string;
  name: string;
  // [file, rank, 駒種] がすべて自分の駒で揃ったら完成(歩は問わない)
  pieces: [number, number, PieceType][];
}

export const FORMATIONS: Formation[] = [
  {
    id: 'yagura',
    name: '矢倉囲い',
    pieces: [
      [8, 8, 'OU'],
      [7, 8, 'KI'],
      [7, 7, 'GI'],
      [6, 7, 'KI'],
    ],
  },
  {
    id: 'mino',
    name: '美濃囲い',
    pieces: [
      [2, 8, 'OU'],
      [3, 8, 'GI'],
      [5, 8, 'KI'],
      [4, 9, 'KI'],
    ],
  },
  {
    id: 'anaguma',
    name: '穴熊囲い',
    pieces: [
      [9, 9, 'OU'],
      [9, 8, 'KY'],
      [8, 8, 'GI'],
      [7, 9, 'KI'],
    ],
  },
  {
    id: 'takamino',
    name: '高美濃囲い',
    pieces: [
      [2, 8, 'OU'],
      [3, 8, 'GI'],
      [4, 9, 'KI'],
      [4, 7, 'KI'],
    ],
  },
  {
    // 金の配置は5八型・4七型の両方があるため、共通の3枚で判定する
    id: 'ginkanmuri',
    name: '銀冠',
    pieces: [
      [2, 8, 'OU'],
      [2, 7, 'GI'],
      [3, 8, 'KI'],
    ],
  },
  {
    id: 'tenshukaku',
    name: '天守閣美濃',
    pieces: [
      [8, 7, 'OU'],
      [7, 8, 'GI'],
      [8, 8, 'KA'],
    ],
  },
  {
    id: 'diamond-mino',
    name: 'ダイヤモンド美濃',
    pieces: [
      [2, 8, 'OU'],
      [3, 8, 'GI'],
      [4, 7, 'GI'],
      [4, 9, 'KI'],
      [5, 8, 'KI'],
    ],
  },
];

export interface DetectedFormation {
  id: string;
  name: string;
  color: Color;
}

export function detectFormations(pos: Position): DetectedFormation[] {
  const out: DetectedFormation[] = [];
  for (const color of [SENTE, GOTE] as Color[]) {
    for (const f of FORMATIONS) {
      const ok = f.pieces.every(([file, rank, type]) => {
        const tf = color === SENTE ? file : 10 - file;
        const tr = color === SENTE ? rank : 10 - rank;
        const p = pos.board[idx(tf, tr)];
        return !!p && p.color === color && p.type === type;
      });
      if (ok) out.push({ id: f.id, name: f.name, color });
    }
  }
  return out;
}

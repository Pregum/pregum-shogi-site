// 棋譜表記(日本語)と KIF 形式エクスポート
import type { Color, Move, PieceType, Position } from './shogi';
import { SENTE, initialPosition, applyMove } from './shogi';

export const PIECE_JP: Record<PieceType, string> = {
  FU: '歩',
  KY: '香',
  KE: '桂',
  GI: '銀',
  KI: '金',
  KA: '角',
  HI: '飛',
  OU: '玉',
  TO: 'と',
  NY: '成香',
  NK: '成桂',
  NG: '成銀',
  UM: '馬',
  RY: '龍',
};

// 盤面表示用の1文字表記
export const PIECE_CHAR: Record<PieceType, string> = {
  FU: '歩',
  KY: '香',
  KE: '桂',
  GI: '銀',
  KI: '金',
  KA: '角',
  HI: '飛',
  OU: '王',
  TO: 'と',
  NY: '杏',
  NK: '圭',
  NG: '全',
  UM: '馬',
  RY: '龍',
};

const FILE_FULL = ['１', '２', '３', '４', '５', '６', '７', '８', '９'];
const RANK_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

export function squareJp(file: number, rank: number): string {
  return FILE_FULL[file - 1] + RANK_KANJI[rank - 1];
}

// 1手を日本語表記にする(pos は着手前の局面)
export function moveToJp(pos: Position, move: Move, prevTo?: { file: number; rank: number }): string {
  const same = prevTo && prevTo.file === move.to.file && prevTo.rank === move.to.rank;
  const dest = same ? '同　' : squareJp(move.to.file, move.to.rank);
  if (move.drop) {
    return `${dest}${PIECE_JP[move.drop]}打`;
  }
  const from = move.from!;
  const piece = pos.board[(from.rank - 1) * 9 + (from.file - 1)];
  const name = piece ? PIECE_JP[piece.type] : '?';
  const promote = move.promote ? '成' : '';
  return `${dest}${name}${promote}(${from.file}${from.rank})`;
}

// 全手を日本語表記の配列にする
export function movesToJp(moves: Move[]): string[] {
  let pos = initialPosition();
  let prevTo: { file: number; rank: number } | undefined;
  const out: string[] = [];
  for (const m of moves) {
    out.push(moveToJp(pos, m, prevTo));
    pos = applyMove(pos, m);
    prevTo = m.to;
  }
  return out;
}

export interface KifMeta {
  senteName: string;
  goteName: string;
  startedAt?: string; // ISO 文字列
  winner?: Color | null;
  endReason?: 'checkmate' | 'stalemate' | 'resign' | null;
}

export function toKif(moves: Move[], meta: KifMeta): string {
  const date = meta.startedAt ? new Date(meta.startedAt) : null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = date
    ? `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    : '';
  const lines: string[] = [];
  lines.push('# ---- 狐将棋 棋譜ファイル ----');
  if (dateStr) lines.push(`開始日時：${dateStr}`);
  lines.push('手合割：平手');
  lines.push(`先手：${meta.senteName || '先手'}`);
  lines.push(`後手：${meta.goteName || '後手'}`);
  lines.push('手数----指手---------消費時間--');

  const jp = movesToJp(moves);
  for (let i = 0; i < jp.length; i++) {
    lines.push(`${String(i + 1).padStart(4, ' ')} ${jp[i]}   ( 0:00/00:00:00)`);
  }

  if (meta.endReason === 'resign') {
    lines.push(`${String(jp.length + 1).padStart(4, ' ')} 投了   ( 0:00/00:00:00)`);
  } else if (meta.endReason === 'checkmate' || meta.endReason === 'stalemate') {
    lines.push(`${String(jp.length + 1).padStart(4, ' ')} 詰み   ( 0:00/00:00:00)`);
  }
  if (meta.winner === 0 || meta.winner === 1) {
    const n = meta.endReason === 'resign' || meta.endReason ? jp.length + 1 : jp.length;
    lines.push(`まで${n}手で${meta.winner === SENTE ? '先手' : '後手'}の勝ち`);
  }
  return lines.join('\n') + '\n';
}

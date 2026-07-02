// localStorage への棋譜・プレイヤー情報の保存
import type { Color, Move } from '../../shared/shogi';
import { toKif } from '../../shared/kif';

const KIFU_KEY = 'kitsune-shogi:kifu';
const NAME_KEY = 'kitsune-shogi:name';
const TOKEN_KEY = 'kitsune-shogi:token';

export interface KifuRecord {
  id: string;
  roomId: string;
  gameNo: number;
  date: string; // ISO
  sente: string;
  gote: string;
  moves: Move[];
  winner: Color | null;
  reason: 'checkmate' | 'stalemate' | 'resign';
}

export function listKifu(): KifuRecord[] {
  try {
    const raw = localStorage.getItem(KIFU_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as KifuRecord[];
    return list.sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch {
    return [];
  }
}

export function getKifu(id: string): KifuRecord | null {
  return listKifu().find((k) => k.id === id) ?? null;
}

// 同じ対局(roomId + gameNo)は上書き保存する
export function saveKifu(record: KifuRecord) {
  const list = listKifu().filter(
    (k) => !(k.roomId === record.roomId && k.gameNo === record.gameNo),
  );
  list.unshift(record);
  localStorage.setItem(KIFU_KEY, JSON.stringify(list.slice(0, 200)));
}

export function deleteKifu(id: string) {
  localStorage.setItem(
    KIFU_KEY,
    JSON.stringify(listKifu().filter((k) => k.id !== id)),
  );
}

export function downloadKif(record: KifuRecord) {
  const kif = toKif(record.moves, {
    senteName: record.sente,
    goteName: record.gote,
    startedAt: record.date,
    winner: record.winner,
    endReason: record.reason,
  });
  const blob = new Blob([kif], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kitsune-shogi_${record.date.slice(0, 10)}_${record.roomId}-${record.gameNo}.kif`;
  a.click();
  URL.revokeObjectURL(url);
}

export function getPlayerName(): string {
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function setPlayerName(name: string) {
  localStorage.setItem(NAME_KEY, name);
}

export function getToken(): string {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function resultLabel(record: {
  winner: Color | null;
  reason: string;
}): string {
  const reasonJp =
    record.reason === 'resign'
      ? '投了'
      : record.reason === 'checkmate'
        ? '詰み'
        : '手詰まり';
  if (record.winner === 0) return `先手勝ち（${reasonJp}）`;
  if (record.winner === 1) return `後手勝ち（${reasonJp}）`;
  return '引き分け';
}

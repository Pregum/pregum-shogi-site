// WebSocket メッセージ定義(クライアント・サーバー共用)
import type { Color, Move } from './shogi';

export interface PlayerInfo {
  name: string;
}

export type RoomStatus = 'waiting' | 'playing' | 'ended';

export interface PendingRequest {
  kind: 'matta' | 'rematch';
  by: Color;
}

export interface GameResult {
  winner: Color | null;
  reason: 'checkmate' | 'stalemate' | 'resign';
}

export interface GameSnapshot {
  roomId: string;
  moves: Move[];
  players: [PlayerInfo | null, PlayerInfo | null]; // [先手, 後手]
  online: [boolean, boolean];
  status: RoomStatus;
  pending: PendingRequest | null;
  result: GameResult | null;
  startedAt: string;
  gameNo: number; // 再戦のたびに増える
}

export type ClientMsg =
  | { type: 'join'; token: string; name: string }
  | { type: 'move'; move: Move }
  | { type: 'matta'; action: 'request' | 'accept' | 'reject' }
  | { type: 'rematch'; action: 'request' | 'accept' | 'reject' }
  | { type: 'resign' };

export type ServerMsg =
  | { type: 'state'; game: GameSnapshot; you: Color | null }
  | { type: 'error'; message: string };

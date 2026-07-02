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

export type EndReason =
  | 'checkmate'
  | 'stalemate'
  | 'resign'
  | 'timeout'
  | 'sennichite' // 千日手(引き分け)
  | 'perpetual'; // 連続王手の千日手(王手側の負け)

export interface GameResult {
  winner: Color | null;
  reason: EndReason;
}

export interface ClockState {
  remaining: [number, number]; // 残り時間(ms) [先手, 後手]
  turnStartedAt: number; // 現在の手番が始まったサーバー時刻(epoch ms)
  serverNow: number; // スナップショット送信時のサーバー時刻(クロックずれ補正用)
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
  timeControl: number | null; // 持ち時間(分)。null = 時間無制限
  clock: ClockState | null;
}

export type ClientMsg =
  | { type: 'join'; token: string; name: string; timeControl?: number | null }
  | { type: 'move'; move: Move }
  | { type: 'matta'; action: 'request' | 'accept' | 'reject' }
  | { type: 'rematch'; action: 'request' | 'accept' | 'reject' }
  | { type: 'resign' };

export type ServerMsg =
  | { type: 'state'; game: GameSnapshot; you: Color | null }
  | { type: 'error'; message: string };

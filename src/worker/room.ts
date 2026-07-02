// 対局ルーム Durable Object
// 1ルーム = 1オブジェクト。WebSocket Hibernation API で接続を管理し、
// 対局状態(棋譜)はサーバー側で検証・保持する。
import type { Color, Move } from '../shared/shogi';
import { SENTE, GOTE, legalMoves, moveEquals, outcome, replay } from '../shared/shogi';
import type {
  ClientMsg,
  GameResult,
  GameSnapshot,
  PendingRequest,
  PlayerInfo,
  RoomStatus,
  ServerMsg,
} from '../shared/protocol';

interface Seat extends PlayerInfo {
  token: string;
}

interface GameState {
  roomId: string;
  moves: Move[];
  seats: [Seat | null, Seat | null];
  status: RoomStatus;
  pending: PendingRequest | null;
  result: GameResult | null;
  startedAt: string;
  gameNo: number;
}

interface Attachment {
  token: string;
}

export interface Env {
  ROOM: DurableObjectNamespace;
}

export class ShogiRoom {
  private ctx: DurableObjectState;
  private game: GameState | null = null;

  constructor(ctx: DurableObjectState, _env: Env) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('WebSocket 接続が必要です', { status: 426 });
    }
    const url = new URL(request.url);
    const roomId = url.searchParams.get('roomId') ?? 'unknown';
    await this.load(roomId);

    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  private async load(roomId?: string): Promise<GameState> {
    if (!this.game) {
      this.game =
        (await this.ctx.storage.get<GameState>('game')) ?? {
          roomId: roomId ?? 'unknown',
          moves: [],
          seats: [null, null],
          status: 'waiting',
          pending: null,
          result: null,
          startedAt: new Date().toISOString(),
          gameNo: 1,
        };
      if (roomId && this.game.roomId === 'unknown') this.game.roomId = roomId;
    }
    return this.game;
  }

  private async save() {
    if (this.game) await this.ctx.storage.put('game', this.game);
  }

  private colorOf(token: string): Color | null {
    const g = this.game!;
    if (g.seats[SENTE]?.token === token) return SENTE;
    if (g.seats[GOTE]?.token === token) return GOTE;
    return null;
  }

  private snapshot(): GameSnapshot {
    const g = this.game!;
    const online: [boolean, boolean] = [false, false];
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as Attachment | null;
      if (!att) continue;
      const color = this.colorOf(att.token);
      if (color !== null) online[color] = true;
    }
    return {
      roomId: g.roomId,
      moves: g.moves,
      players: [
        g.seats[SENTE] ? { name: g.seats[SENTE]!.name } : null,
        g.seats[GOTE] ? { name: g.seats[GOTE]!.name } : null,
      ],
      online,
      status: g.status,
      pending: g.pending,
      result: g.result,
      startedAt: g.startedAt,
      gameNo: g.gameNo,
    };
  }

  private broadcast() {
    const snap = this.snapshot();
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as Attachment | null;
      const you = att ? this.colorOf(att.token) : null;
      this.sendTo(ws, { type: 'state', game: snap, you });
    }
  }

  private sendTo(ws: WebSocket, msg: ServerMsg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // 切断済みソケットは無視
    }
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== 'string') return;
    const g = await this.load();
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'join') {
      const name = String(msg.name ?? '').slice(0, 24) || '名無しの狐';
      const token = String(msg.token ?? '');
      if (!token) {
        this.sendTo(ws, { type: 'error', message: '不正な接続です' });
        return;
      }
      ws.serializeAttachment({ token } satisfies Attachment);
      let color = this.colorOf(token);
      if (color === null) {
        if (!g.seats[SENTE]) {
          g.seats[SENTE] = { token, name };
          color = SENTE;
        } else if (!g.seats[GOTE]) {
          g.seats[GOTE] = { token, name };
          color = GOTE;
        }
        // 満席なら観戦者として扱う(color = null)
      } else {
        g.seats[color]!.name = name; // 再接続時に名前を更新
      }
      if (g.status === 'waiting' && g.seats[SENTE] && g.seats[GOTE]) {
        g.status = 'playing';
        g.startedAt = new Date().toISOString();
      }
      await this.save();
      this.broadcast();
      return;
    }

    const att = ws.deserializeAttachment() as Attachment | null;
    const color = att ? this.colorOf(att.token) : null;
    if (color === null) {
      this.sendTo(ws, { type: 'error', message: '対局者のみ操作できます' });
      return;
    }

    switch (msg.type) {
      case 'move': {
        if (g.status !== 'playing') {
          this.sendTo(ws, { type: 'error', message: '対局中ではありません' });
          return;
        }
        const pos = replay(g.moves);
        if (pos.turn !== color) {
          this.sendTo(ws, { type: 'error', message: 'あなたの手番ではありません' });
          return;
        }
        const legal = legalMoves(pos).find((m) => moveEquals(m, msg.move));
        if (!legal) {
          this.sendTo(ws, { type: 'error', message: 'その手は指せません' });
          return;
        }
        g.moves.push(legal);
        g.pending = null;
        const next = replay(g.moves);
        const oc = outcome(next);
        if (oc.over) {
          g.status = 'ended';
          g.result = { winner: oc.winner, reason: oc.reason ?? 'checkmate' };
        }
        break;
      }
      case 'matta': {
        if (g.status !== 'playing') return;
        if (msg.action === 'request') {
          // 自分の指した手が1手以上あるときだけ待ったできる
          const myMoves = g.moves.filter((_, i) => i % 2 === color).length;
          if (myMoves === 0 || g.pending) return;
          g.pending = { kind: 'matta', by: color };
        } else {
          if (!g.pending || g.pending.kind !== 'matta' || g.pending.by === color) return;
          if (msg.action === 'accept') {
            const requester = g.pending.by;
            // 直近の手が申請者の手なら1手、相手が指した後なら2手戻す
            const lastMover = ((g.moves.length - 1) % 2) as Color;
            const pops = lastMover === requester ? 1 : 2;
            g.moves.splice(g.moves.length - Math.min(pops, g.moves.length));
          }
          g.pending = null;
        }
        break;
      }
      case 'resign': {
        if (g.status !== 'playing') return;
        g.status = 'ended';
        g.pending = null;
        g.result = { winner: (1 - color) as Color, reason: 'resign' };
        break;
      }
      case 'rematch': {
        if (g.status !== 'ended') return;
        if (msg.action === 'request') {
          if (g.pending) return;
          g.pending = { kind: 'rematch', by: color };
        } else {
          if (!g.pending || g.pending.kind !== 'rematch' || g.pending.by === color) return;
          if (msg.action === 'accept') {
            g.moves = [];
            g.result = null;
            g.status = 'playing';
            g.seats = [g.seats[GOTE], g.seats[SENTE]]; // 先後入れ替え
            g.startedAt = new Date().toISOString();
            g.gameNo += 1;
          }
          g.pending = null;
        }
        break;
      }
      default:
        return;
    }

    await this.save();
    this.broadcast();
  }

  async webSocketClose() {
    await this.load();
    this.broadcast(); // オンライン状態を更新
  }

  async webSocketError() {
    await this.load();
    this.broadcast();
  }
}

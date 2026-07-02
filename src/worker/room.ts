// 対局ルーム Durable Object
// 1ルーム = 1オブジェクト。WebSocket Hibernation API で接続を管理し、
// 対局状態(棋譜・持ち時間)はサーバー側で検証・保持する。
import type { Color, Move } from '../shared/shogi';
import {
  SENTE,
  GOTE,
  applyMove,
  checkRepetition,
  legalMoves,
  moveEquals,
  outcome,
  replayAll,
} from '../shared/shogi';
import type {
  ClientMsg,
  GameResult,
  GameSnapshot,
  PendingRequest,
  RoomStatus,
  ServerMsg,
} from '../shared/protocol';

interface Seat {
  token: string;
  name: string;
}

interface ClockData {
  remaining: [number, number]; // 残り時間(ms)
  turnStartedAt: number; // 現在の手番の開始時刻(epoch ms)
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
  timeControl: number | null; // 持ち時間(分)
  clock: ClockData | null;
}

interface Attachment {
  token: string;
}

export interface Env {
  ROOM: DurableObjectNamespace;
}

const TIME_CONTROL_CHOICES = [5, 10, 30];

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
      const stored = await this.ctx.storage.get<GameState>('game');
      this.game = stored ?? {
        roomId: roomId ?? 'unknown',
        moves: [],
        seats: [null, null],
        status: 'waiting',
        pending: null,
        result: null,
        startedAt: new Date().toISOString(),
        gameNo: 1,
        timeControl: null,
        clock: null,
      };
      // 旧バージョンで保存されたルームとの後方互換
      this.game.timeControl ??= null;
      this.game.clock ??= null;
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

  private currentTurn(): Color {
    return (this.game!.moves.length % 2) as Color;
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
      timeControl: g.timeControl,
      clock: g.clock
        ? { remaining: g.clock.remaining, turnStartedAt: g.clock.turnStartedAt, serverNow: Date.now() }
        : null,
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

  private async endGame(result: GameResult) {
    const g = this.game!;
    g.status = 'ended';
    g.result = result;
    g.pending = null;
    g.clock = null;
    await this.ctx.storage.deleteAlarm();
  }

  private startClock() {
    const g = this.game!;
    if (g.timeControl) {
      const ms = g.timeControl * 60_000;
      g.clock = { remaining: [ms, ms], turnStartedAt: Date.now() };
    } else {
      g.clock = null;
    }
    void this.scheduleFlagFall();
  }

  // 現在の手番の残り時間が尽きる時刻にアラームを仕掛ける
  private async scheduleFlagFall() {
    const g = this.game!;
    if (g.status !== 'playing' || !g.clock) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    const turn = this.currentTurn();
    await this.ctx.storage.setAlarm(g.clock.turnStartedAt + g.clock.remaining[turn] + 100);
  }

  // 時間切れなら対局を終了させる。終了させたら true
  private async settleTimeout(): Promise<boolean> {
    const g = this.game!;
    if (g.status !== 'playing' || !g.clock) return false;
    const turn = this.currentTurn();
    const elapsed = Date.now() - g.clock.turnStartedAt;
    if (elapsed < g.clock.remaining[turn]) return false;
    await this.endGame({ winner: (1 - turn) as Color, reason: 'timeout' });
    return true;
  }

  // DOアラーム: 手番側の持ち時間が切れた
  async alarm() {
    const g = await this.load();
    if (await this.settleTimeout()) {
      await this.save();
      this.broadcast();
    } else if (g.status === 'playing' && g.clock) {
      await this.scheduleFlagFall();
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
          // 最初の入室者(部屋の作成者)が持ち時間を決める
          const tc = msg.timeControl;
          if (typeof tc === 'number' && TIME_CONTROL_CHOICES.includes(tc)) {
            g.timeControl = tc;
          }
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
        this.startClock();
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

    // どの操作でも、まず時間切れが起きていないか確認する
    if (await this.settleTimeout()) {
      await this.save();
      this.broadcast();
      return;
    }

    switch (msg.type) {
      case 'move': {
        if (g.status !== 'playing') {
          this.sendTo(ws, { type: 'error', message: '対局中ではありません' });
          return;
        }
        const positions = replayAll(g.moves);
        const pos = positions[positions.length - 1];
        if (pos.turn !== color) {
          this.sendTo(ws, { type: 'error', message: 'あなたの手番ではありません' });
          return;
        }
        const legal = legalMoves(pos).find((m) => moveEquals(m, msg.move));
        if (!legal) {
          this.sendTo(ws, { type: 'error', message: 'その手は指せません' });
          return;
        }
        // 消費時間を差し引いてから手を進める
        if (g.clock) {
          const now = Date.now();
          g.clock.remaining[color] = Math.max(
            0,
            g.clock.remaining[color] - (now - g.clock.turnStartedAt),
          );
          g.clock.turnStartedAt = now;
        }
        g.moves.push(legal);
        g.pending = null;
        positions.push(applyMove(pos, legal));
        const oc = outcome(positions[positions.length - 1]);
        if (oc.over) {
          await this.endGame({ winner: oc.winner, reason: oc.reason ?? 'checkmate' });
          break;
        }
        const rep = checkRepetition(positions);
        if (rep.repetition) {
          if (rep.perpetual !== null) {
            await this.endGame({ winner: (1 - rep.perpetual) as Color, reason: 'perpetual' });
          } else {
            await this.endGame({ winner: null, reason: 'sennichite' });
          }
          break;
        }
        await this.scheduleFlagFall();
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
            // 手番が変わるので時計を仕切り直す(消費済みの時間は戻さない)
            if (g.clock) g.clock.turnStartedAt = Date.now();
            await this.scheduleFlagFall();
          }
          g.pending = null;
        }
        break;
      }
      case 'resign': {
        if (g.status !== 'playing') return;
        await this.endGame({ winner: (1 - color) as Color, reason: 'resign' });
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
            this.startClock();
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

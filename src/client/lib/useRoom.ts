import { useCallback, useEffect, useRef, useState } from 'react';
import type { Color } from '../../shared/shogi';
import type { ClientMsg, GameSnapshot, ServerMsg } from '../../shared/protocol';
import { getToken } from './storage';

export interface RoomState {
  game: GameSnapshot | null;
  you: Color | null;
  connected: boolean;
  error: string | null;
  send: (msg: ClientMsg) => void;
}

export function useRoom(roomId: string, name: string): RoomState {
  const [game, setGame] = useState<GameSnapshot | null>(null);
  const [you, setYou] = useState<Color | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closed = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${location.host}/api/rooms/${roomId}/ws`);
      wsRef.current = ws;
      ws.onopen = () => {
        retry = 0;
        setConnected(true);
        ws.send(JSON.stringify({ type: 'join', token: getToken(), name } satisfies ClientMsg));
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(String(e.data)) as ServerMsg;
          if (msg.type === 'state') {
            setGame(msg.game);
            setYou(msg.you);
          } else if (msg.type === 'error') {
            setError(msg.message);
          }
        } catch {
          // 不正なメッセージは無視
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) {
          timer = setTimeout(connect, Math.min(500 * 2 ** retry, 8000));
          retry += 1;
        }
      };
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      wsRef.current?.close();
    };
  }, [roomId, name]);

  // エラートーストは数秒で消す
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3500);
    return () => clearTimeout(t);
  }, [error]);

  const send = useCallback((msg: ClientMsg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { game, you, connected, error, send };
}

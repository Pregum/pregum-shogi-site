// Cloudflare Worker エントリポイント
// 静的アセットは wrangler の assets 設定が配信し、/api/* のみここに届く
import type { Env } from './room';

export { ShogiRoom } from './room';

const ID_WORDS = [
  'kon',
  'inari',
  'kitsune',
  'momiji',
  'tsukimi',
  'yako',
  'tenko',
  'byakko',
  'kohaku',
  'suzu',
];

function generateRoomId(): string {
  const word = ID_WORDS[Math.floor(Math.random() * ID_WORDS.length)];
  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31])
    .join('');
  return `${word}-${suffix}`;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      return json({ roomId: generateRoomId() });
    }

    const wsMatch = url.pathname.match(/^\/api\/rooms\/([a-z0-9-]{1,64})\/ws$/);
    if (wsMatch) {
      const roomId = wsMatch[1];
      const stub = env.ROOM.get(env.ROOM.idFromName(roomId));
      const forwarded = new URL(request.url);
      forwarded.searchParams.set('roomId', roomId);
      return stub.fetch(new Request(forwarded.toString(), request));
    }

    return json({ error: 'not found' }, 404);
  },
};

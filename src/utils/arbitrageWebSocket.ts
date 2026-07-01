/**
 * Arbitrage WebSocket URL (served by the NestJS api). Override with
 * NEXT_PUBLIC_TR_API_WS_URL if the api is proxied elsewhere.
 */
export function getArbitrageWebSocketUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TR_API_WS_URL) {
    return String(process.env.NEXT_PUBLIC_TR_API_WS_URL);
  }
  return 'ws://api.traken-trade.ru/ws/';
}

/** Message the client sends after the socket opens to start receiving snapshots. */
export const ARBITRAGE_SUBSCRIBE = { type: 'arbitrage_subscribe' } as const;

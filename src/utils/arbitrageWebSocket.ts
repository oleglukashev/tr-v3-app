/**
 * Prices for the arbitrage page come from the klines service price store.
 * Live updates: klines WebSocket (`subscribePrices`, one message per pairId on each 5m close).
 * Initial seed: HTTP snapshot of the whole store (`GET /prices`), keyed by pairId.
 */

/** klines WebSocket URL. Override with NEXT_PUBLIC_TR_KLINES_WS_URL. */
export function getKlinesPricesWebSocketUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TR_KLINES_WS_URL) {
    return String(process.env.NEXT_PUBLIC_TR_KLINES_WS_URL);
  }
  return 'ws://klines.traken-trade.ru/ws/';
}

/** HTTP snapshot of all current prices ({ [pairId]: price }). */
export function getKlinesPricesSnapshotUrl(): string {
  const base = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TR_KLINES_DOMAIN) || '';
  return `${String(base).replace(/\/$/, '')}/prices`;
}

/** Message the client sends after the socket opens to receive every price update. */
export const SUBSCRIBE_PRICES = { type: 'subscribePrices' } as const;

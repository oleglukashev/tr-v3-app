/**
 * Prices for the arbitrage page come from the klines service price store, delivered over the
 * klines WebSocket as one full snapshot ({ [pairId]: price }) — immediately on subscribe and then
 * every few seconds — via the `subscribeAllPrices` / `pricesSnapshot` protocol.
 */

/** klines WebSocket URL. Override with NEXT_PUBLIC_TR_KLINES_WS_URL. */
export function getKlinesPricesWebSocketUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TR_KLINES_WS_URL) {
    return String(process.env.NEXT_PUBLIC_TR_KLINES_WS_URL);
  }
  return 'ws://klines.traken-trade.ru/ws/';
}

/** Message the client sends after the socket opens to receive the whole price store at once. */
export const SUBSCRIBE_ALL_PRICES = { type: 'subscribeAllPrices' } as const;

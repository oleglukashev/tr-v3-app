/**
 * Executable-liquidity (order-book depth) for the arbitrage page comes from the tr-v3-orderbook
 * service, delivered as one full snapshot ({ [pairId]: DepthProfile }) via `subscribeAllDepth` /
 * `depthSnapshot` — immediately on subscribe and then every few seconds.
 */

/** Orderbook WebSocket URL. Override with NEXT_PUBLIC_TR_ORDERBOOKS_WS_URL. */
export function getOrderbookDepthWebSocketUrl(): string {
  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_TR_ORDERBOOKS_WS_URL
  ) {
    return String(process.env.NEXT_PUBLIC_TR_ORDERBOOKS_WS_URL);
  }
  return 'ws://orderbooks.traken-trade.ru/ws/';
}

/** Message the client sends after the socket opens to receive the whole depth store at once. */
export const SUBSCRIBE_ALL_DEPTH = { type: 'subscribeAllDepth' } as const;

/** Slippage bands the orderbook service precomputes (percent). Must match SLIPPAGE_BANDS there. */
export const SLIPPAGE_BANDS = [0.1, 0.25, 0.5, 1] as const;

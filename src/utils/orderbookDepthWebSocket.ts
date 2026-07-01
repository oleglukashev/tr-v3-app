/**
 * Order-book depth for the arbitrage page comes from the tr-v3-orderbook service, delivered as one
 * full snapshot ({ [pairId]: { bids, asks } }, raw top-N ladders) via `subscribeAllDepth` /
 * `depthSnapshot` — immediately on subscribe and then every few seconds. The client walks the
 * ladder to get the effective (VWAP) price for a chosen entry volume.
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

/**
 * Bidasks WebSocket URL. Override with NEXT_PUBLIC_TR_BIDASKS_WS_URL if needed.
 */
export function getBidasksWebSocketUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TR_BIDASKS_WS_URL) {
    return String(process.env.NEXT_PUBLIC_TR_BIDASKS_WS_URL).replace(/\/$/, '');
  }
  return 'ws://bidasks.traken-trade.ru/ws';
}

/** Cluster TF in bidasks service (AppService, Map clusters fetch). */
export const BIDASK_CLUSTER_TF = 5;

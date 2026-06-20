/**
 * Range-XV reversal backtest.
 *
 * Strategy: a 2-brick reversal pattern (candle A then candle B).
 *  - Candle A (the brick before the reversal) must itself NOT be a reversal — it
 *    continues the direction of the brick before it.
 *  - Candle A must be quiet — its volume at or below an absolute threshold.
 *  - Candle B (the reversal brick) flips direction and must be heavy — its volume
 *    at or above an absolute threshold.
 *  - Enter at B's CLOSE, in B's direction (bullish reversal → long, bearish → short).
 *  - Stop behind B: low (long) / high (short).
 *  - Take at a configurable R:R from entry.
 */

export type XvKline = {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type XvBacktestSettings = {
  /** Candle A qualifies if its (absolute) volume <= this. 0 disables it. */
  aVolumeMax: number;
  /** Candle A max wick (on A's own direction side: high-close if A is up,
   *  close-low if A is down) as a PERCENT of A's body |close-open|. 0 means A
   *  must close at its extreme — no wick. Always applied. */
  aMaxWickBodyPct: number;
  /** Candle B qualifies if its (absolute) volume >= this. 0 disables it. */
  bVolumeMin: number;
  /** Take distance as a multiple of risk (R:R). */
  riskReward: number;
  /** '' = both, 'long' = bullish reversals only, 'short' = bearish only. */
  direction?: '' | 'long' | 'short';
  /** Bricks to wait for take/stop before marking the trade unresolved. */
  maxBarsToHold: number;
};

export type XvTradeStatus = 'finished' | 'finished_by_lose' | 'finished_by_length';

export type XvTrade = {
  id: number;
  direction: 'up' | 'down'; // up = long, down = short
  status: XvTradeStatus;
  startTs: number; // candle B ts (entry bar)
  entry: number;
  stop: number;
  take: number;
  risk: number;
  rr: number;
  exitTs: number | null;
  exitPrice: number | null;
  // Mirrors the dhm session shape enough for the shared UI/overlays.
  data: { kline1: XvKline; high: number; low: number };
};

const DEFAULTS: XvBacktestSettings = {
  aVolumeMax: 0,
  aMaxWickBodyPct: 0,
  bVolumeMin: 0,
  riskReward: 2,
  direction: '',
  maxBarsToHold: 50,
};

/** Run the reversal backtest over an ascending series of XV bricks. */
export function runXvBacktest(klines: XvKline[], settings: Partial<XvBacktestSettings>): XvTrade[] {
  const s: XvBacktestSettings = { ...DEFAULTS, ...settings };
  const maxBars = Math.max(1, Math.floor(s.maxBarsToHold) || 1);
  const trades: XvTrade[] = [];
  let id = 1;

  for (let i = 2; i < klines.length; i += 1) {
    const beforeA = klines[i - 2]; // brick before A — to confirm A is not a reversal
    const a = klines[i - 1]; // candle A — the quiet brick before the reversal
    const b = klines[i]; // candle B — the reversal brick
    if (!beforeA || !a || !b) continue;

    const beforeAUp = beforeA.close >= beforeA.open;
    const aUp = a.close >= a.open;
    const bUp = b.close >= b.open;
    if (beforeAUp !== aUp) continue; // A must continue the prior brick (A is NOT a reversal)
    if (aUp === bUp) continue; // B must reverse A's direction

    // Absolute volume filters (0 = off).
    if (s.aVolumeMax > 0 && a.volume > s.aVolumeMax) continue; // A must be quiet
    if (s.bVolumeMin > 0 && b.volume < s.bVolumeMin) continue; // B must be heavy

    // Candle A wick on its own direction side (high-close if A is up, close-low if
    // A is down) must not exceed aMaxWickBodyPct% of A's body. 0 = no wick allowed.
    const aBody = Math.abs(a.close - a.open);
    const aWick = aUp ? a.high - a.close : a.close - a.low;
    if (aWick > (s.aMaxWickBodyPct / 100) * aBody) continue;

    const direction: 'up' | 'down' = bUp ? 'up' : 'down';
    if (s.direction === 'long' && direction !== 'up') continue;
    if (s.direction === 'short' && direction !== 'down') continue;

    const entry = b.close;
    let stop: number;
    let risk: number;
    let take: number;
    if (direction === 'up') {
      stop = b.low;
      risk = entry - stop;
      take = entry + s.riskReward * risk;
    } else {
      stop = b.high;
      risk = stop - entry;
      take = entry - s.riskReward * risk;
    }
    if (!(risk > 0)) continue; // degenerate (entry == extreme)

    // Walk forward; stop is checked first within a brick (conservative).
    let status: XvTradeStatus = 'finished_by_length';
    let exitTs: number | null = null;
    let exitPrice: number | null = null;
    for (let j = i + 1; j < klines.length && j - i <= maxBars; j += 1) {
      const k = klines[j];
      if (direction === 'up') {
        if (k.low <= stop) { status = 'finished_by_lose'; exitTs = k.ts; exitPrice = stop; break; }
        if (k.high >= take) { status = 'finished'; exitTs = k.ts; exitPrice = take; break; }
      } else {
        if (k.high >= stop) { status = 'finished_by_lose'; exitTs = k.ts; exitPrice = stop; break; }
        if (k.low <= take) { status = 'finished'; exitTs = k.ts; exitPrice = take; break; }
      }
    }

    trades.push({
      id: id++,
      direction,
      status,
      startTs: b.ts,
      entry,
      stop,
      take,
      risk,
      rr: s.riskReward,
      exitTs,
      exitPrice,
      data: {
        kline1: b,
        high: Math.max(entry, stop, take),
        low: Math.min(entry, stop, take),
      },
    });
  }

  return trades;
}

/** Fetch XV bricks for the range and run the backtest (UI entry point). */
export async function runXvBacktestForUI({
  pairId,
  r,
  startTs,
  finishTs,
  settings,
  klinesApiBase,
}: {
  pairId: number;
  r: string;
  startTs: number;
  finishTs: number | null;
  settings: Partial<XvBacktestSettings>;
  klinesApiBase: string;
}): Promise<XvTrade[]> {
  const endTs = finishTs ?? Date.now();
  const url = `${klinesApiBase}/klines?type=xv&pairId=${pairId}&r=${r}&startTs=${startTs}&endTs=${endTs}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();
  const klines: XvKline[] = (Array.isArray(raw) ? raw : [])
    .map((it: any) => ({
      ts: parseInt(it.ts, 10),
      open: parseFloat(it.open),
      high: parseFloat(it.high),
      low: parseFloat(it.low),
      close: parseFloat(it.close),
      volume: parseFloat(it.volume),
    }))
    .filter((k: XvKline) => Number.isFinite(k.ts) && Number.isFinite(k.open));
  return runXvBacktest(klines, settings);
}

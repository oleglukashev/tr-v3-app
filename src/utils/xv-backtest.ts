/**
 * Range-XV reversal backtest.
 *
 * Strategy: a 2-brick reversal pattern (candle A then candle B).
 *  - There must be a trend of >= minTrendCandles same-direction bricks ending at
 *    candle A (so A continues the trend and is never itself a reversal).
 *  - Candle A must be quiet — its volume at or below an absolute threshold.
 *  - Candle B (the reversal brick) flips direction and must be heavy — its volume
 *    at or above an absolute threshold.
 *  - Enter at B's CLOSE, in B's direction (bullish reversal → long, bearish → short).
 *  - Stop behind B's wick: low (long) / high (short) — this is the actual risk.
 *  - Take = riskReward × B's BODY (wick excluded), so the target is whole bricks.
 *    (PnL/R is still measured against the real risk, so reward:risk < riskReward
 *    whenever B has a wick.)
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
  /** Candle A max wick — the tail against the move, (high-low) - body — as a
   *  PERCENT of A's body |close-open|. 0 = a clean marubozu (no wick). Always
   *  applied. (XV bricks always close at their direction extreme, so this tail
   *  is the only non-zero wick.) */
  aMaxWickBodyPct: number;
  /** Candle B qualifies if its (absolute) volume >= this. 0 disables it. */
  bVolumeMin: number;
  /** Minimum consecutive same-direction bricks ending at A (the trend before B;
   *  A itself counts). >= 2, so A is always a continuation, never a reversal. */
  minTrendCandles: number;
  /** Take distance as a multiple of B's BODY (wick excluded). The stop (and the
   *  risk used for PnL) is B's full range, so the realised reward:risk is this
   *  times body/range. */
  riskReward: number;
  /** Move the stop to break-even — a level that nets zero after entry+exit fees,
   *  not raw entry — once price runs this many bars (×R) in the position's favour
   *  after entry. 0 disables it. */
  breakEvenAfterBars: number;
  /** Entry fee as a percent of the entry price. */
  entryFeePct: number;
  /** Exit fee as a percent of the exit price. */
  exitFeePct: number;
  /** Notional entered per position, in $ (for the $ PnL). */
  positionSize: number;
  /** '' = both, 'long' = bullish reversals only, 'short' = bearish only. */
  direction?: '' | 'long' | 'short';
  /** Bricks to wait for take/stop before marking the trade unresolved. */
  maxBarsToHold: number;
};

export type XvTradeStatus =
  | 'finished'
  | 'finished_by_lose'
  | 'finished_by_be'
  | 'finished_by_length';

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
  /** Realised PnL in R units, net of entry+exit fees. null while unresolved. */
  pnlR: number | null;
  /** Realised PnL in $ for the configured position size, net of fees. */
  pnlUsd: number | null;
  // Mirrors the dhm session shape enough for the shared UI/overlays.
  data: { kline1: XvKline; high: number; low: number };
};

const DEFAULTS: XvBacktestSettings = {
  aVolumeMax: 0,
  aMaxWickBodyPct: 0,
  bVolumeMin: 0,
  minTrendCandles: 2,
  riskReward: 2,
  breakEvenAfterBars: 0,
  entryFeePct: 0.055,
  exitFeePct: 0.02,
  positionSize: 100,
  direction: '',
  maxBarsToHold: 50,
};

/** Run the reversal backtest over an ascending series of XV bricks. `r` (the
 *  range size) is only needed for the break-even-after-N-bars rule. */
export function runXvBacktest(
  klines: XvKline[],
  settings: Partial<XvBacktestSettings>,
  r = 0,
): XvTrade[] {
  const s: XvBacktestSettings = { ...DEFAULTS, ...settings };
  const maxBars = Math.max(1, Math.floor(s.maxBarsToHold) || 1);
  // Favourable price distance (in price) that arms the break-even stop.
  const beDist = s.breakEvenAfterBars > 0 && r > 0 ? s.breakEvenAfterBars * r : 0;
  const minTrend = Math.max(2, Math.floor(s.minTrendCandles) || 2);
  const trades: XvTrade[] = [];
  let id = 1;

  for (let i = 1; i < klines.length; i += 1) {
    const a = klines[i - 1]; // candle A — the last trend brick before the reversal
    const b = klines[i]; // candle B — the reversal brick
    if (!a || !b) continue;

    const aUp = a.close >= a.open;
    const bUp = b.close >= b.open;
    if (aUp === bUp) continue; // B must reverse A's direction

    // Trend length: consecutive same-direction bricks ending at A (A counts).
    // Requiring >= minTrend (>= 2) also makes A a continuation, never a reversal.
    let trendLen = 1;
    for (let t = i - 2; t >= 0; t -= 1) {
      if ((klines[t].close >= klines[t].open) !== aUp) break;
      trendLen += 1;
    }
    if (trendLen < minTrend) continue;

    // Absolute volume filters (0 = off).
    if (s.aVolumeMax > 0 && a.volume > s.aVolumeMax) continue; // A must be quiet
    if (s.bVolumeMin > 0 && b.volume < s.bVolumeMin) continue; // B must be heavy

    // Candle A wick must not exceed aMaxWickBodyPct% of A's body. XV bricks close
    // exactly at their direction extreme (high==close up / low==close down), so
    // the only real wick is the tail against the move = (high-low) - body. 0 = a
    // clean marubozu (no wick).
    const aBody = Math.abs(a.close - a.open);
    const aWick = a.high - a.low - aBody;
    if (aWick > (s.aMaxWickBodyPct / 100) * aBody) continue;

    const direction: 'up' | 'down' = bUp ? 'up' : 'down';
    if (s.direction === 'long' && direction !== 'up') continue;
    if (s.direction === 'short' && direction !== 'down') continue;

    const entry = b.close;
    // Stop goes behind B's wick (full range = actual risk); the take is measured
    // from B's BODY only (wick excluded) — whole bricks, no tail.
    const bodySize = Math.abs(b.close - b.open);
    let stop: number;
    let risk: number;
    let take: number;
    if (direction === 'up') {
      stop = b.low;
      risk = entry - stop;
      take = entry + s.riskReward * bodySize;
    } else {
      stop = b.high;
      risk = stop - entry;
      take = entry - s.riskReward * bodySize;
    }
    if (!(risk > 0) || !(bodySize > 0)) continue; // degenerate

    // Break-even stop is placed so that exiting there nets ZERO after both fees
    // (not at raw entry): long  beStop = entry·(1+ef)/(1-xf); short the mirror.
    const ef = s.entryFeePct / 100;
    const xf = s.exitFeePct / 100;
    const beStop = direction === 'up'
      ? (entry * (1 + ef)) / (1 - xf)
      : (entry * (1 - ef)) / (1 + xf);

    // Walk forward; stop is checked first within a brick (conservative). The
    // break-even rule moves the live stop (curStop) to beStop once price has run
    // beDist in favour — a later touch then exits net-flat ('finished_by_be').
    let status: XvTradeStatus = 'finished_by_length';
    let exitTs: number | null = null;
    let exitPrice: number | null = null;
    let curStop = stop;
    let movedToBE = false;
    for (let j = i + 1; j < klines.length && j - i <= maxBars; j += 1) {
      const k = klines[j];
      if (direction === 'up') {
        if (k.low <= curStop) { status = movedToBE ? 'finished_by_be' : 'finished_by_lose'; exitTs = k.ts; exitPrice = curStop; break; }
        if (k.high >= take) { status = 'finished'; exitTs = k.ts; exitPrice = take; break; }
        if (beDist && !movedToBE && k.high >= entry + beDist) { curStop = beStop; movedToBE = true; }
      } else {
        if (k.high >= curStop) { status = movedToBE ? 'finished_by_be' : 'finished_by_lose'; exitTs = k.ts; exitPrice = curStop; break; }
        if (k.low <= take) { status = 'finished'; exitTs = k.ts; exitPrice = take; break; }
        if (beDist && !movedToBE && k.low <= entry - beDist) { curStop = beStop; movedToBE = true; }
      }
    }

    // Realised PnL net of fees (only for closed trades; length stays null). $ PnL
    // assumes a fixed `positionSize` notional entered at `entry` (qty = size/entry).
    let pnlR: number | null = null;
    let pnlUsd: number | null = null;
    if (exitPrice != null) {
      const gross = direction === 'up' ? exitPrice - entry : entry - exitPrice;
      const fees = entry * (s.entryFeePct / 100) + exitPrice * (s.exitFeePct / 100);
      pnlR = (gross - fees) / risk;
      pnlUsd = (s.positionSize / entry) * (gross - fees);
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
      pnlR,
      pnlUsd,
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
  return runXvBacktest(klines, settings, Number(r) || 0);
}

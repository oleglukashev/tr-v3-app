// Client-side FPP pattern detection.
//
// Ported from tr-v3-bidasks/src/modules/generate-fpp/generate-fpp.service.ts
// (the cron service that fills the `fpp` table). We re-run the same checks
// in the browser on every (cluster1, cluster2, kline1, kline2) pair so the
// FPP-mode backtest doesn't depend on the server cron having processed
// the historical period.
//
// klines-footprint-patterns npm package has the same boolean checks but
// throws away the direction (up/down) of the detected reversal. The
// backtest needs the direction to filter against the session direction,
// so we keep the if/else with direction inline here.

import type { Kline } from './dhm-backtest';

export type FppType =
  | 'interception'
  | 'reverse'
  | 'locked_volume'
  | 'locked_delta'
  | 'locked_imbalance'
  | 'low_last_price_volume'
  | 'weakness'
  | 'test_volume'
  | 'resistance';

export type ClusterRow = {
  p: string;
  v: number | string;
  bv: number | string;
  sv: number | string;
};

export type Cluster = {
  ts: string | number;
  pairId?: number;
  tf?: number;
  data: Record<string, ClusterRow>;
  v?: number | string;
};

export type Detection = {
  ts: string | number;
  type: FppType;
  direction: 'up' | 'down';
  // Closing price of the kline that produced the pattern. The backtest
  // uses this to gate the FPP against the session's enterLevel /
  // stopLossLevel zone — i.e. an FPP only counts when its price falls
  // inside the fib entry band.
  price: string | number;
};

function klineDirection(k: Kline): 'up' | 'down' | 'neutral' {
  const o = parseFloat(String(k.open));
  const c = parseFloat(String(k.close));
  if (c > o) return 'up';
  if (c < o) return 'down';
  return 'neutral';
}

function pocRow(cluster: Cluster): ClusterRow | null {
  const rows = Object.values(cluster.data ?? {});
  if (!rows.length) return null;
  let max = rows[0];
  for (const r of rows) {
    if (parseFloat(String(r.v)) > parseFloat(String(max.v))) max = r;
  }
  return max;
}

function delta(row: ClusterRow): number {
  return parseFloat(String(row.bv)) - parseFloat(String(row.sv));
}

function sortedRows(cluster: Cluster, asc = true): ClusterRow[] {
  return Object.values(cluster.data ?? {}).sort((a, b) =>
    asc ? parseFloat(a.p) - parseFloat(b.p) : parseFloat(b.p) - parseFloat(a.p),
  );
}

// ─── single-kline patterns ──────────────────────────────────────────────

function detectLockedVolume(c: Cluster, k: Kline): Detection | null {
  const poc = pocRow(c);
  if (!poc) return null;
  const d = klineDirection(k);
  const p = parseFloat(poc.p);
  const open = parseFloat(String(k.open));
  if (d === 'down' && p > open) {
    return { ts: k.ts, type: 'locked_volume', direction: 'down', price: k.close };
  }
  if (d === 'up' && p < open) {
    return { ts: k.ts, type: 'locked_volume', direction: 'up', price: k.close };
  }
  return null;
}

function detectLockedDelta(c: Cluster, k: Kline): Detection | null {
  const poc = pocRow(c);
  if (!poc) return null;
  const d = klineDirection(k);
  const open = parseFloat(String(k.open));
  const rows = sortedRows(c, d !== 'down');
  const d1 = rows[0] ? delta(rows[0]) : null;
  const d2 = rows[1] ? delta(rows[1]) : null;
  const d3 = rows[2] ? delta(rows[2]) : null;
  if (!d1 || !d2 || !d3 || d1 <= 0 || d2 <= 0 || d3 <= 0) return null;
  const third = parseFloat(rows[2].p);
  if (d === 'down' && third > open) {
    return { ts: k.ts, type: 'locked_delta', direction: 'down', price: k.close };
  }
  if (d !== 'down' && third < open) {
    return { ts: k.ts, type: 'locked_delta', direction: 'up', price: k.close };
  }
  return null;
}

function detectLockedImbalance(c: Cluster, k: Kline): Detection | null {
  const poc = pocRow(c);
  if (!poc) return null;
  const d = klineDirection(k);
  const open = parseFloat(String(k.open));
  const rows = sortedRows(c, d !== 'down');
  if (rows.length < 3) return null;
  const [r1, r2, r3] = rows;
  const deltas = [delta(r1), delta(r2), delta(r3)];
  if (deltas.some((x) => !x || x <= 0)) return null;
  const oneSide = d === 'down' ? 'bv' : 'sv';
  const zeros = [r1, r2, r3].every((r) => parseFloat(String(r[oneSide])) === 0);
  if (!zeros) return null;
  const third = parseFloat(r3.p);
  if (d === 'down' && third > open) {
    return { ts: k.ts, type: 'locked_imbalance', direction: 'down', price: k.close };
  }
  if (d !== 'down' && third < open) {
    return { ts: k.ts, type: 'locked_imbalance', direction: 'up', price: k.close };
  }
  return null;
}

function detectLowLastPriceVolume(c: Cluster, k: Kline): Detection | null {
  const poc = pocRow(c);
  if (!poc) return null;
  const d = klineDirection(k);
  const close = parseFloat(String(k.close));
  const closeRow = c.data?.[close.toString()] ?? c.data?.[String(k.close)];
  if (!closeRow) return null;
  const closeV = parseFloat(String(closeRow.v));
  const pocV = parseFloat(String(poc.v));
  if (pocV <= 0 || closeV / pocV > 0.1) return null;
  if (d === 'down') {
    return { ts: k.ts, type: 'low_last_price_volume', direction: 'down', price: k.close };
  }
  if (d === 'up') {
    return { ts: k.ts, type: 'low_last_price_volume', direction: 'up', price: k.close };
  }
  return null;
}

function detectWeakness(c: Cluster, k: Kline): Detection | null {
  const poc = pocRow(c);
  if (!poc) return null;
  const d = klineDirection(k);
  const open = parseFloat(String(k.open));
  const close = parseFloat(String(k.close));
  const high = parseFloat(String(k.high));
  const low = parseFloat(String(k.low));
  const topWick = high - (d === 'up' ? close : open);
  const bottomWick = (d === 'up' ? open : close) - low;
  const body = d === 'up' ? close - open : open - close;
  if (body <= 0 || topWick <= 0 || bottomWick <= 0) return null;
  const wickRatio = topWick / bottomWick > 4 || bottomWick / topWick > 4;
  const bodyRatio = (topWick + bottomWick) / body > 6;
  if (!wickRatio || !bodyRatio) return null;
  const p = parseFloat(poc.p);
  if (d === 'down' && p > open) {
    return { ts: k.ts, type: 'weakness', direction: 'down', price: k.close };
  }
  if (d === 'up' && p < open) {
    return { ts: k.ts, type: 'weakness', direction: 'up', price: k.close };
  }
  return null;
}

// ─── two-kline patterns ─────────────────────────────────────────────────

function detectInterception(
  c1: Cluster,
  c2: Cluster,
  k1: Kline,
  k2: Kline,
): Detection | null {
  const p1 = pocRow(c1);
  const p2 = pocRow(c2);
  if (!p1 || !p2) return null;
  const d1 = klineDirection(k1);
  const d2 = klineDirection(k2);
  if (d1 === d2) return null;
  const p1Val = parseFloat(p1.p);
  const p2Val = parseFloat(p2.p);
  if (d1 === 'up') {
    if (p1Val > parseFloat(String(k1.close)) && p2Val > parseFloat(String(k2.close))) {
      return { ts: k2.ts, type: 'interception', direction: 'down', price: k2.close };
    }
  } else {
    if (p1Val < parseFloat(String(k1.close)) && p2Val < parseFloat(String(k2.close))) {
      return { ts: k2.ts, type: 'interception', direction: 'up', price: k2.close };
    }
  }
  return null;
}

function detectReverse(
  c1: Cluster,
  c2: Cluster,
  k1: Kline,
  k2: Kline,
): Detection | null {
  const p1 = pocRow(c1);
  const p2 = pocRow(c2);
  if (!p1 || !p2) return null;
  const d1 = klineDirection(k1);
  const d2 = klineDirection(k2);
  if (d1 === d2) return null;
  const p1Val = parseFloat(p1.p);
  const p2Val = parseFloat(p2.p);
  if (d1 === 'up') {
    if (p1Val > parseFloat(String(k1.open)) && p2Val < parseFloat(String(k2.open))) {
      return { ts: k2.ts, type: 'reverse', direction: 'down', price: k2.close };
    }
  } else {
    if (p1Val < parseFloat(String(k1.open)) && p2Val > parseFloat(String(k2.open))) {
      return { ts: k2.ts, type: 'reverse', direction: 'up', price: k2.close };
    }
  }
  return null;
}

function detectTestVolume(c1: Cluster, k2: Kline): Detection | null {
  const poc = pocRow(c1);
  if (!poc) return null;
  const p = parseFloat(poc.p);
  const close = parseFloat(String(k2.close));
  const open = parseFloat(String(k2.open));
  const high = parseFloat(String(k2.high));
  const low = parseFloat(String(k2.low));
  if (p > close && p > open && p < high) {
    return { ts: k2.ts, type: 'test_volume', direction: 'down', price: k2.close };
  }
  if (p < close && p < open && p > low) {
    return { ts: k2.ts, type: 'test_volume', direction: 'up', price: k2.close };
  }
  return null;
}

function detectResistance(k1: Kline, k2: Kline): Detection | null {
  const d1 = klineDirection(k1);
  const d2 = klineDirection(k2);
  if (d1 === d2) return null;
  if (d1 === 'up') {
    if (parseFloat(String(k1.open)) > parseFloat(String(k2.close))) {
      return { ts: k2.ts, type: 'resistance', direction: 'down', price: k2.close };
    }
  } else {
    if (parseFloat(String(k1.open)) < parseFloat(String(k2.close))) {
      return { ts: k2.ts, type: 'resistance', direction: 'up', price: k2.close };
    }
  }
  return null;
}

// Run all detectors on a (cluster, kline) pair and the previous one.
// kline1/cluster1 may be null/undefined for the very first kline in the
// series — the two-kline patterns will simply skip in that case.
export function detectFppPatterns(
  cluster1: Cluster | null | undefined,
  cluster2: Cluster,
  kline1: Kline | null | undefined,
  kline2: Kline,
): Detection[] {
  const out: Detection[] = [];
  const push = (d: Detection | null) => {
    if (d) out.push(d);
  };

  if (cluster1 && kline1) {
    push(detectInterception(cluster1, cluster2, kline1, kline2));
    push(detectReverse(cluster1, cluster2, kline1, kline2));
    push(detectTestVolume(cluster1, kline2));
    push(detectResistance(kline1, kline2));
  }
  push(detectLockedVolume(cluster2, kline2));
  push(detectLockedDelta(cluster2, kline2));
  push(detectLockedImbalance(cluster2, kline2));
  push(detectLowLastPriceVolume(cluster2, kline2));
  push(detectWeakness(cluster2, kline2));
  return out;
}

export function detectFppForSeries(
  clustersByTs: Map<number, Cluster>,
  klinesAscByTs: Kline[],
): Detection[] {
  const result: Detection[] = [];
  for (let i = 0; i < klinesAscByTs.length; i++) {
    const k2 = klinesAscByTs[i];
    const k1 = i > 0 ? klinesAscByTs[i - 1] : null;
    const c2 = clustersByTs.get(Number(k2.ts));
    if (!c2) continue;
    const c1 = k1 ? clustersByTs.get(Number(k1.ts)) ?? null : null;
    const detected = detectFppPatterns(c1, c2, k1, k2);
    for (const d of detected) result.push(d);
  }
  return result;
}

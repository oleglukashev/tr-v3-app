// HTTP shims around the shared dhm-strategy engine: paginated klines
// and clusters fetchers, plus a `runDhmBacktestForUI` wrapper that
// orchestrates the network calls and feeds the in-process backtest.
//
// The actual DHM math, FPP detectors and per-tick simulation live in
// the npm `dhm-strategy` package — both tr-v2 (server-side) and the
// Next.js client use the same source there.

import {
  KLINE_TS_SIZE_BY_TF,
  MAX_SESSION_LENGTH,
  detectFppForSeries,
  runDhmBacktest,
  type Cluster,
  type DhmSession,
  type DhmSettings,
  type Fpp,
  type Kline,
} from 'dhm-strategy';

export {
  KLINE_TS_SIZE_BY_TF,
  runDhmBacktest,
};
export type { DhmSession, DhmSettings, Fpp, Kline };

const KLINES_FETCH_LIMIT = 1000;
const KLINES_FETCH_MAX_PAGES = 1000;

export async function fetchKlines({
  baseUrl,
  pairId,
  tf,
  startTs,
  endTs,
}: {
  baseUrl: string;
  pairId: number;
  tf: number;
  startTs: number;
  endTs: number;
}): Promise<Kline[]> {
  const base = baseUrl.replace(/\/$/, '');
  const out: Kline[] = [];
  let cursor = startTs;
  for (let page = 0; page < KLINES_FETCH_MAX_PAGES; page++) {
    if (cursor >= endTs) break;
    const url =
      `${base}/klines` +
      `?pairId=${pairId}&tf=${tf}` +
      `&startTs=${cursor}&endTs=${endTs}` +
      `&limit=${KLINES_FETCH_LIMIT}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`klines fetch failed (${res.status})`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    for (let k = 0; k < data.length; k++) out.push(data[k]);
    if (data.length < KLINES_FETCH_LIMIT) break;
    const lastTs = Number(data[data.length - 1].ts);
    if (!Number.isFinite(lastTs) || lastTs < cursor) break;
    // API uses ts: { gte: startTs, lt: endTs } — advance past last to
    // avoid refetching the boundary kline.
    cursor = lastTs + 1;
  }
  return out;
}

export async function fetchClusters({
  baseUrl,
  pairId,
  tf,
  startTs,
  endTs,
}: {
  baseUrl: string;
  pairId: number;
  tf: number;
  startTs: number;
  endTs: number;
}): Promise<Cluster[]> {
  const base = baseUrl.replace(/\/$/, '');
  const out: Cluster[] = [];
  // Controller returns rows by ts DESC and ignores `page` in this code
  // path, so we cursor by shrinking the upper bound after each page.
  let cursor = endTs;
  for (let page = 0; page < KLINES_FETCH_MAX_PAGES; page++) {
    if (cursor < startTs) break;
    const url =
      `${base}/clusters` +
      `?pairId=${pairId}&tf=${tf}` +
      `&startTs=${startTs}&endTs=${cursor}` +
      `&limit=${KLINES_FETCH_LIMIT}&page=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`clusters fetch failed (${res.status})`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    for (let i = 0; i < data.length; i++) out.push(data[i] as Cluster);
    if (data.length < KLINES_FETCH_LIMIT) break;
    const oldestTs = Number(data[data.length - 1].ts);
    if (!Number.isFinite(oldestTs) || oldestTs >= cursor) break;
    cursor = oldestTs - 1;
  }
  return out;
}

export async function runDhmBacktestForUI({
  pairId,
  tf,
  startTs,
  finishTs,
  settings,
  klinesApiBase,
  clustersApiBase,
  fpps,
}: {
  pairId: number;
  tf: number;
  startTs: number;
  finishTs: number | null;
  settings: DhmSettings;
  klinesApiBase: string;
  clustersApiBase?: string;
  fpps?: Fpp[];
}): Promise<DhmSession[]> {
  const tfSize = KLINE_TS_SIZE_BY_TF[tf];
  if (!tfSize) throw new Error(`Unsupported tf=${tf}`);

  const maxSessionLength = Number(settings.maxSessionLength ?? MAX_SESSION_LENGTH);
  const fiveMinSize = KLINE_TS_SIZE_BY_TF[5];
  const effectiveFinishTs = finishTs ?? Date.now();

  // Need 2 prior klines for first detection at startTs.
  const tfRangeStart = startTs - 2 * tfSize;
  // Half-open [startTs, endTs); add 1 to include finishTs boundary.
  const tfRangeEnd = effectiveFinishTs + 1;

  // 5m klines must cover up to (last detection ts) + maxSessionLength*20 5m steps.
  const fiveMinRangeStart = startTs;
  const fiveMinRangeEnd =
    effectiveFinishTs + maxSessionLength * 20 * fiveMinSize + 1;

  const wantsClusterFpps =
    settings.entryMode === 'fpp' && !fpps && !!clustersApiBase;

  const [klinesTf, klines5m, clusters] = await Promise.all([
    fetchKlines({ baseUrl: klinesApiBase, pairId, tf, startTs: tfRangeStart, endTs: tfRangeEnd }),
    fetchKlines({ baseUrl: klinesApiBase, pairId, tf: 5, startTs: fiveMinRangeStart, endTs: fiveMinRangeEnd }),
    wantsClusterFpps
      ? fetchClusters({
          baseUrl: clustersApiBase!,
          pairId,
          tf,
          startTs: tfRangeStart,
          endTs: tfRangeEnd,
        })
      : Promise.resolve(null as Cluster[] | null),
  ]);

  let effectiveFpps: Fpp[] | undefined = fpps;
  if (wantsClusterFpps && clusters) {
    const clustersByTs = new Map<number, Cluster>();
    for (const c of clusters) {
      const t = Number(c.ts);
      if (Number.isFinite(t)) clustersByTs.set(t, c);
    }
    effectiveFpps = detectFppForSeries(clustersByTs, klinesTf);
  }

  return runDhmBacktest({
    pairId,
    tf,
    klinesTf,
    klines5m,
    settings: { ...settings, maxSessionLength },
    fpps: effectiveFpps,
  });
}

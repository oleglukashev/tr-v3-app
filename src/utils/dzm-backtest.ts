// HTTP shims around the shared dzm-strategy engine. Mirrors
// dhm-backtest.ts — same paginated klines/clusters fetchers, same
// runtime orchestration — only the underlying strategy engine
// differs.

import {
  KLINE_TS_SIZE_BY_TF,
  MAX_SESSION_LENGTH,
  detectFppForSeries,
  runDzmBacktest,
  type Cluster,
  type DzmSession,
  type DzmSettings,
  type Fpp,
  type Kline,
} from 'tr-strategies-dzm';

export {
  KLINE_TS_SIZE_BY_TF,
  runDzmBacktest,
};
export type { DzmSession, DzmSettings, Fpp, Kline };

const KLINES_FETCH_LIMIT = 5000;
const KLINES_FETCH_MAX_PAGES = 1000;
const PARALLEL_TIME_WINDOWS = 4;

async function fetchKlinesWindow(
  baseUrl: string,
  pairId: number,
  tf: number,
  startTs: number,
  endTs: number,
): Promise<Kline[]> {
  const out: Kline[] = [];
  let cursor = startTs;
  for (let page = 0; page < KLINES_FETCH_MAX_PAGES; page++) {
    if (cursor >= endTs) break;
    const url =
      `${baseUrl}/klines` +
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
    cursor = lastTs + 1;
  }
  return out;
}

async function fetchClustersWindow(
  baseUrl: string,
  pairId: number,
  tf: number,
  startTs: number,
  endTs: number,
): Promise<Cluster[]> {
  const out: Cluster[] = [];
  let cursor = endTs;
  for (let page = 0; page < KLINES_FETCH_MAX_PAGES; page++) {
    if (cursor < startTs) break;
    const url =
      `${baseUrl}/clusters` +
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

async function fetchInParallel<T>(
  startTs: number,
  endTs: number,
  inclusiveEnd: boolean,
  fetchWindow: (winStart: number, winEnd: number) => Promise<T[]>,
): Promise<T[]> {
  const span = endTs - startTs;
  if (span <= 0) return [];
  const windowCount = Math.max(1, Math.min(PARALLEL_TIME_WINDOWS, Math.floor(span / 1000) || 1));
  const windowSize = Math.ceil(span / windowCount);
  const tasks: Promise<T[]>[] = [];
  for (let i = 0; i < windowCount; i++) {
    const winStart = startTs + i * windowSize;
    const winEndRaw = Math.min(endTs, winStart + windowSize);
    if (winStart >= winEndRaw) break;
    const winEnd = inclusiveEnd ? winEndRaw - 1 : winEndRaw;
    if (winEnd < winStart) continue;
    tasks.push(fetchWindow(winStart, winEnd));
  }
  const chunks = await Promise.all(tasks);
  const out: T[] = [];
  for (const c of chunks) for (const x of c) out.push(x);
  return out;
}

export async function fetchKlines({
  baseUrl, pairId, tf, startTs, endTs,
}: {
  baseUrl: string; pairId: number; tf: number; startTs: number; endTs: number;
}): Promise<Kline[]> {
  const base = baseUrl.replace(/\/$/, '');
  return fetchInParallel(startTs, endTs, false, (winStart, winEnd) =>
    fetchKlinesWindow(base, pairId, tf, winStart, winEnd),
  );
}

export async function fetchClusters({
  baseUrl, pairId, tf, startTs, endTs,
}: {
  baseUrl: string; pairId: number; tf: number; startTs: number; endTs: number;
}): Promise<Cluster[]> {
  const base = baseUrl.replace(/\/$/, '');
  return fetchInParallel(startTs, endTs, true, (winStart, winEnd) =>
    fetchClustersWindow(base, pairId, tf, winStart, winEnd),
  );
}

export async function runDzmBacktestForUI({
  pairId, tf, startTs, finishTs, settings, klinesApiBase, clustersApiBase, fpps,
}: {
  pairId: number;
  tf: number;
  startTs: number;
  finishTs: number | null;
  settings: DzmSettings;
  klinesApiBase: string;
  clustersApiBase?: string;
  fpps?: Fpp[];
}): Promise<DzmSession[]> {
  const tfSize = KLINE_TS_SIZE_BY_TF[tf];
  if (!tfSize) throw new Error(`Unsupported tf=${tf}`);

  const maxSessionLength = Number(settings.maxSessionLength ?? MAX_SESSION_LENGTH);
  const fiveMinSize = KLINE_TS_SIZE_BY_TF[5];
  const effectiveFinishTs = finishTs ?? Date.now();

  // Pull a generous prefix of the requested range so the zigzag pivot
  // detector has enough left-side history to confirm pivots near the
  // start of the window. 50 tf-bars (≈ 2 days for hourly) is more than
  // the default depth=5 needs.
  const tfRangeStart = startTs - 50 * tfSize;
  const tfRangeEnd = effectiveFinishTs + 1;

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
          tf: 5,
          startTs: fiveMinRangeStart,
          endTs: fiveMinRangeEnd,
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
    effectiveFpps = detectFppForSeries(clustersByTs, klines5m);
  }

  return runDzmBacktest({
    pairId,
    tf,
    klinesTf,
    klines5m,
    settings: { ...settings, maxSessionLength },
    fpps: effectiveFpps,
    fppTf: 5,
  });
}

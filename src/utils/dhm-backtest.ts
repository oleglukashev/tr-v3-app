// Client-side port of the tr-v2 DHM backtest pipeline. The function names,
// branching, and math follow:
//   tr-v2/src/modules/strategies/dhm/dhm.strategy.service.ts
//   tr-v2/src/modules/strategies/dhm/dhm.strategy.backtest.service.ts
// NestJS DI, Prisma writes, the session logger and the Telegram bot calls
// are stripped — they do not affect the algorithm.

import { getFibRetracement } from './fib';
import {
  detectFppForSeries,
  type Cluster as FppCluster,
} from './fpp-detectors';

export const KLINE_TS_SIZE_BY_TF: Record<number, number> = {
  1: 60000,
  5: 300000,
  15: 900000,
  30: 1800000,
  60: 3600000,
  240: 14400000,
  1440: 86400000,
};

const MAX_SESSION_LENGTH = 1000;

export type Kline = {
  id?: any;
  ts: string | number;
  pairId?: number;
  interval?: number;
  open: string | number;
  high: string | number;
  low: string | number;
  close: string | number;
  volume?: any;
};

export type DhmSettings = {
  direction?: string | null;
  minPriceSize: number | string;
  maxSessionLength?: number;
  enterLevel1?: string | number | null;
  enterLevel2?: string | number | null;
  enterLevel3?: string | number | null;
  takeProfitLevel1?: string | number | null;
  takeProfitLevel2?: string | number | null;
  takeProfitLevel3?: string | number | null;
  triggerLevel?: string | number | null;
  stopLossLevel?: string | number | null;
  finishLevel?: string | number | null;
  // Adds an extra gate on top of the original waiting → triggered
  // transition:
  // 'levels' (default) — fib enterLevel only, original DHM logic.
  // 'fpp'              — same fib check PLUS at least one FPP record
  //   of one of the `fppEntryTypes` types and matching session
  //   direction must have been seen by the current tick (i.e. its
  //   source kline has closed at FPP.ts + sessionTfMs ≤ tick.ts).
  entryMode?: 'levels' | 'fpp';
  fppEntryTypes?: string[];
};

export type Fpp = {
  ts: string | number;
  pairId?: number;
  tf?: number;
  direction: 'up' | 'down';
  type: string;
};

export type DhmStatus =
  | 'created'
  | 'waiting'
  | 'triggered'
  | 'finished'
  | 'finished_by_size'
  | 'finished_by_lose'
  | 'finished_by_length'
  | 'closed_by_length';

export type DhmSession = {
  id: number;
  pairId: number;
  strategyId: 1;
  confirmed: false;
  startTs: string | number;
  kline1Ts: string | number;
  kline2Ts: string | number;
  status: DhmStatus;
  direction: 'up' | 'down';
  settings: DhmSettings;
  tf: number;
  kline1: Kline;
  kline2: Kline;
  low: string | number;
  high: string | number;
  data: any;
  finishTs?: any;
  triggeredAt?: any;
  // FPP-mode only: actionable timestamp of the earliest matching FPP
  // record after kline2.ts. Computed once at session creation.
  fppTriggerTs?: number | null;
};

// ───────────────────────────────────────────────────────────────────────────
// DhmStrategyService — pure math
// ───────────────────────────────────────────────────────────────────────────

function getFib(session: DhmSession, key: string | number): string {
  return getFibRetracement({
    levels: {
      0: session.direction === 'up' ? session.high : session.low,
      1: session.direction === 'up' ? session.low : session.high,
    },
    answerLevels: [key],
  })[key as any].toString();
}

function isEnoughSetupSizeToBuy(session: DhmSession): boolean {
  const price1 = parseFloat(getFib(session, '1'));
  const price0 = parseFloat(getFib(session, '0'));
  const priceDif =
    session.direction === 'up' ? price0 - price1 : price1 - price0;
  return (
    (priceDif / (session.direction === 'up' ? price1 : price0)) * 100 >
    parseFloat(String(session.settings.minPriceSize))
  );
}

function fibLevelIsTriggered(session: DhmSession, price: any, level: any): boolean {
  if (session.direction === 'up') {
    return parseFloat(getFib(session, level)) >= parseFloat(price);
  } else {
    return parseFloat(getFib(session, level)) <= parseFloat(price);
  }
}

function updateHighLowPriceCondition(session: DhmSession, price: any): boolean {
  return session.direction === 'up'
    ? parseFloat(price) > parseFloat(String(session.high))
    : parseFloat(price) < parseFloat(String(session.low));
}

function updateHighLowPrice(session: DhmSession, price: any, kline: Kline | null = null) {
  if (session.direction === 'up') {
    session.high = price;
    if (kline) (session as any).highKline = kline;
  } else {
    session.low = price;
    if (kline) (session as any).lowKline = kline;
  }
}

function checkAndSetWaitingStatus(session: DhmSession) {
  if (session.status === 'created' && isEnoughSetupSizeToBuy(session)) {
    session.status = 'waiting';
  }
}

function checkAndSetTriggeredStatus(session: DhmSession, price: any, ts: any) {
  const triggerLevel = session.settings.enterLevel1
    ? session.settings.enterLevel1
    : session.settings.enterLevel2
    ? session.settings.enterLevel2
    : session.settings.enterLevel3
    ? session.settings.enterLevel3
    : null;
  if (
    session.status === 'waiting' &&
    triggerLevel != null &&
    fibLevelIsTriggered(session, price, triggerLevel)
  ) {
    session.status = 'triggered';
    session.triggeredAt = ts;
  }
}

function checkAndSetFinishedBySizeStatus(session: DhmSession, price: any) {
  if (
    session.status === 'created' &&
    !isEnoughSetupSizeToBuy(session) &&
    session.settings.enterLevel1 != null &&
    fibLevelIsTriggered(session, price, session.settings.enterLevel1)
  ) {
    session.status = 'finished_by_size';
  }
}

function checkAndSetFinishedStatus(session: DhmSession, price: any, ts: any) {
  if (session.status !== 'triggered') return;
  const key = session.direction === 'up' ? 'buy' : 'sell';
  const orders = session.data?.orders ?? {};
  const takeProfitLevel = orders?.[key]?.[String(session.settings?.enterLevel3)]
    ? session.settings.takeProfitLevel3
    : orders?.[key]?.[String(session.settings?.enterLevel2)]
    ? session.settings.takeProfitLevel2
    : session.settings.enterLevel1
    ? session.settings.takeProfitLevel1
    : null;
  if (takeProfitLevel != null && !fibLevelIsTriggered(session, price, takeProfitLevel)) {
    session.status = 'finished';
    session.finishTs = ts;
  }
}

function checkAndSetFinishedByLoseStatus(session: DhmSession, price: any, ts: any) {
  if (
    session.status === 'triggered' &&
    session.settings.stopLossLevel != null &&
    fibLevelIsTriggered(session, price, session.settings.stopLossLevel)
  ) {
    session.status = 'finished_by_lose';
    session.finishTs = ts;
  }
}

function checkAndSetFinishedByLengthStatus(session: DhmSession, ts: any) {
  const tfSize = KLINE_TS_SIZE_BY_TF[session.tf];
  const limit = Number(session.kline1.ts) + MAX_SESSION_LENGTH * tfSize;
  if (Number(ts) > limit && session.status === 'triggered') {
    session.status = 'finished_by_length';
    session.finishTs = ts;
  }
}

function checkAndSetClosedByLengthStatus(session: DhmSession, ts: any) {
  const tfSize = KLINE_TS_SIZE_BY_TF[session.tf];
  const limit = Number(session.kline1.ts) + MAX_SESSION_LENGTH * tfSize;
  if (
    Number(ts) > limit &&
    (session.status === 'created' || session.status === 'waiting')
  ) {
    session.status = 'closed_by_length';
    session.finishTs = ts;
  }
}

function isTriggeredCondition(
  kline1: Kline,
  kline2: Kline,
  direction: 'up' | 'down' = 'up',
  triggerLevel: any = '0.5',
): boolean {
  if (direction === 'up') {
    if (parseFloat(String(kline2.high)) <= parseFloat(String(kline1.high))) {
      return false;
    }
    const fib = getFibRetracement({
      levels: { 0: kline1.high, 1: kline1.low },
      answerLevels: [triggerLevel],
    });
    return parseFloat(String(fib[triggerLevel])) <= parseFloat(String(kline2.low));
  } else {
    if (parseFloat(String(kline2.low)) >= parseFloat(String(kline1.low))) {
      return false;
    }
    const fib = getFibRetracement({
      levels: { 0: kline1.low, 1: kline1.high },
      answerLevels: [triggerLevel],
    });
    return parseFloat(String(fib[triggerLevel])) >= parseFloat(String(kline2.high));
  }
}

function detectDhm(
  pairId: number,
  tf: number,
  kline1: Kline,
  kline2: Kline,
  settings: DhmSettings,
  idCounter: { v: number },
): DhmSession | null {
  if (settings.direction) {
    if (!isTriggeredCondition(kline1, kline2, settings.direction as 'up' | 'down')) {
      return null;
    }
  } else {
    if (
      !isTriggeredCondition(kline1, kline2, 'up') &&
      !isTriggeredCondition(kline1, kline2, 'down')
    ) {
      return null;
    }
  }

  const strategyDirection: 'up' | 'down' =
    parseFloat(String(kline2.high)) > parseFloat(String(kline1.high)) ? 'up' : 'down';

  if (settings.direction && strategyDirection !== settings.direction) {
    return null;
  }

  const id = ++idCounter.v;
  const low = strategyDirection === 'up' ? kline1.low : kline2.low;
  const high = strategyDirection === 'up' ? kline2.high : kline1.high;
  const orders = { buy: {} as any, sell: {} as any };

  return {
    id,
    pairId,
    confirmed: false,
    strategyId: 1,
    startTs: kline1.ts,
    kline1Ts: kline1.ts,
    kline2Ts: kline2.ts,
    status: 'created',
    direction: strategyDirection,
    settings,
    tf,
    kline1,
    kline2,
    low,
    high,
    data: { kline1, kline2, low, high, orders },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// DhmStrategyBacktestService — simulation
// ───────────────────────────────────────────────────────────────────────────

function minuteHighLowPrices(session: DhmSession, kline: Kline) {
  const minuteHighPrice = session.direction === 'up' ? kline.high : kline.low;
  const minuteLowPrice = session.direction === 'up' ? kline.low : kline.high;
  return { minuteHighPrice, minuteLowPrice, minuteClosePrice: kline.close };
}

function tryCreateFuture(
  tickerPrice: any,
  levelToCreateOrder: any,
  session: DhmSession,
  enterLevel: any,
) {
  const key = session.direction === 'up' ? 'buy' : 'sell';
  if (
    fibLevelIsTriggered(session, tickerPrice, levelToCreateOrder) &&
    (session.status === 'waiting' || session.status === 'triggered') &&
    !session.data.orders?.[key]?.[String(enterLevel)]?.id
  ) {
    if (!session.data.orders[key]) session.data.orders[key] = {};
    session.data.orders[key][String(enterLevel)] = { id: enterLevel };
  }
}

function tryCreateOrders(session: DhmSession, minuteLowPrice: any, minuteHighPrice: any) {
  const tickerPrice = session.direction === 'up' ? minuteLowPrice : minuteHighPrice;
  if (session.settings.enterLevel1 != null) {
    tryCreateFuture(tickerPrice, session.settings.enterLevel1, session, session.settings.enterLevel1);
  }
  if (session.settings.enterLevel2 != null) {
    tryCreateFuture(tickerPrice, session.settings.enterLevel2, session, session.settings.enterLevel2);
  }
  if (session.settings.enterLevel3 != null) {
    tryCreateFuture(tickerPrice, session.settings.enterLevel3, session, session.settings.enterLevel3);
  }
}

function cancelOrders(session: DhmSession) {
  const key = session.direction === 'up' ? 'buy' : 'sell';
  session.data.orders[key] = {};
}

function createdProcess(kline: Kline, session: DhmSession, minuteLowPrice: any, minuteHighPrice: any) {
  if (session.settings.enterLevel1 != null) {
    checkAndSetFinishedBySizeStatus(
      session,
      session.direction === 'up' ? minuteLowPrice : minuteHighPrice,
    );
  }
  checkAndSetWaitingStatus(session);
  checkAndSetClosedByLengthStatus(session, kline.ts);
}

function waitingProcess(kline: Kline, session: DhmSession, minuteLowPrice: any, minuteHighPrice: any) {
  tryCreateOrders(session, minuteLowPrice, minuteHighPrice);
  // In FPP mode the fib-level trigger only fires once at least one
  // matching FPP record has been observed by the current tick. The
  // earliest matching FPP.ts + tfSize is precomputed into
  // session.fppTriggerTs at session creation.
  const fppGate =
    session.settings.entryMode !== 'fpp' ||
    (session.fppTriggerTs != null && Number(kline.ts) >= session.fppTriggerTs);
  if (fppGate) {
    checkAndSetTriggeredStatus(
      session,
      session.direction === 'up' ? minuteLowPrice : minuteHighPrice,
      kline.ts,
    );
  }
  checkAndSetClosedByLengthStatus(session, kline.ts);
}

function triggerProcess(
  kline: Kline,
  session: DhmSession,
  minuteLowPrice: any,
  minuteHighPrice: any,
  minuteClosePrice: any,
) {
  tryCreateOrders(session, minuteLowPrice, minuteHighPrice);

  checkAndSetFinishedStatus(
    session,
    session.triggeredAt === kline.ts
      ? minuteClosePrice
      : session.direction === 'up'
      ? minuteHighPrice
      : minuteLowPrice,
    kline.ts,
  );

  checkAndSetFinishedByLoseStatus(
    session,
    session.direction === 'up' ? minuteLowPrice : minuteHighPrice,
    kline.ts,
  );

  checkAndSetFinishedByLengthStatus(session, kline.ts);
}

function klineProcess(kline: Kline, session: DhmSession) {
  const { minuteHighPrice, minuteLowPrice, minuteClosePrice } = minuteHighLowPrices(session, kline);

  if (session.status === 'created' || session.status === 'waiting') {
    const price = session.direction === 'up' ? minuteHighPrice : minuteLowPrice;
    if (updateHighLowPriceCondition(session, price)) {
      updateHighLowPrice(session, price, kline);
      if (session.status === 'waiting') {
        cancelOrders(session);
      }
    }
  }

  if (session.status === 'created') {
    createdProcess(kline, session, minuteLowPrice, minuteHighPrice);
  }
  if (session.status === 'waiting') {
    waitingProcess(kline, session, minuteLowPrice, minuteHighPrice);
  }
  if (session.status === 'triggered') {
    triggerProcess(kline, session, minuteLowPrice, minuteHighPrice, minuteClosePrice);
  }

  if (session.data) {
    session.data.low = session.low ?? session.data.low;
    session.data.high = session.high ?? session.data.high;
    session.data.orders = session.data.orders;
  }
}

function lowerBoundIdx(arr: Kline[], ts: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (Number(arr[mid].ts) < ts) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function findEarliestMatchingFppTs(
  fpps: Fpp[],
  direction: 'up' | 'down',
  types: string[] | undefined,
  afterTs: number,
): number | null {
  if (!types?.length) return null;
  const typeSet = new Set(types);
  let earliest: number | null = null;
  for (const f of fpps) {
    if (f.direction !== direction) continue;
    if (!typeSet.has(f.type)) continue;
    const t = Number(f.ts);
    if (!Number.isFinite(t)) continue;
    if (t < afterTs) continue;
    if (earliest === null || t < earliest) earliest = t;
  }
  return earliest;
}

function processForDirection(
  pairId: number,
  tf: number,
  klinesTf: Kline[],
  klines5m: Kline[],
  fpps: Fpp[],
  settings: DhmSettings,
  result: DhmSession[],
  idCounter: { v: number },
) {
  const tfSize = KLINE_TS_SIZE_BY_TF[tf];
  const maxSessionLength = Number(settings.maxSessionLength ?? MAX_SESSION_LENGTH);
  const direction = settings.direction;
  const isFppMode = settings.entryMode === 'fpp';

  for (let i = 2; i < klinesTf.length; i++) {
    const kline1 = klinesTf[i - 2];
    const kline2 = klinesTf[i - 1];
    const session = detectDhm(pairId, tf, kline1, kline2, settings, idCounter);
    if (!session) continue;
    if (direction && session.direction !== direction) continue;

    if (isFppMode) {
      const earliest = findEarliestMatchingFppTs(
        fpps,
        session.direction,
        settings.fppEntryTypes,
        Number(kline2.ts),
      );
      // The FPP only becomes actionable after its source kline closes,
      // i.e. at FPP.ts + tfSize. If no matching FPP exists in this
      // pair's stream after kline2, the session can never trigger and
      // will eventually transition via closedByLength.
      session.fppTriggerTs = earliest === null ? null : earliest + tfSize;
    }

    const startProcessTs = Number(kline2.ts) + tfSize;
    const startIdx = lowerBoundIdx(klines5m, startProcessTs);
    const endIdx = Math.min(klines5m.length, startIdx + maxSessionLength * 20);

    for (let j = startIdx; j < endIdx; j++) {
      if (
        session.status !== 'created' &&
        session.status !== 'waiting' &&
        session.status !== 'triggered'
      ) {
        break;
      }
      try {
        klineProcess(klines5m[j], session);
      } catch (e) {
        console.error(`klineProcess error for session ${session.id}:`, e);
        break;
      }
    }

    result.push(session);
  }
}

export type RunDhmBacktestArgs = {
  pairId: number;
  tf: number;
  klinesTf: Kline[];
  klines5m: Kline[];
  settings: DhmSettings;
  fpps?: Fpp[];
};

export function runDhmBacktest({
  pairId,
  tf,
  klinesTf,
  klines5m,
  settings,
  fpps,
}: RunDhmBacktestArgs): DhmSession[] {
  const result: DhmSession[] = [];
  const idCounter = { v: 0 };
  const fppList = fpps ?? [];

  if (settings.direction) {
    processForDirection(pairId, tf, klinesTf, klines5m, fppList, settings, result, idCounter);
  } else {
    processForDirection(
      pairId, tf, klinesTf, klines5m, fppList,
      { ...settings, direction: 'up' }, result, idCounter,
    );
    processForDirection(
      pairId, tf, klinesTf, klines5m, fppList,
      { ...settings, direction: 'down' }, result, idCounter,
    );
  }

  return result;
}

// ───────────────────────────────────────────────────────────────────────────
// Klines fetching helper
// ───────────────────────────────────────────────────────────────────────────

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
    // API uses ts: { gte: startTs, lt: endTs } — advance past last to avoid
    // refetching the boundary kline.
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
}): Promise<FppCluster[]> {
  const base = baseUrl.replace(/\/$/, '');
  const out: FppCluster[] = [];
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
    for (let i = 0; i < data.length; i++) out.push(data[i] as FppCluster);
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
  // Required for entryMode='fpp' — the bidasks server origin so we can
  // pull raw clusters and run pattern detection client-side.
  clustersApiBase?: string;
  // Optional override: skip the clusters fetch + detection and use this
  // pre-built list instead. Mostly useful for tests.
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
    fetchKlines({
      baseUrl: klinesApiBase,
      pairId,
      tf,
      startTs: tfRangeStart,
      endTs: tfRangeEnd,
    }),
    fetchKlines({
      baseUrl: klinesApiBase,
      pairId,
      tf: 5,
      startTs: fiveMinRangeStart,
      endTs: fiveMinRangeEnd,
    }),
    wantsClusterFpps
      ? fetchClusters({
          baseUrl: clustersApiBase!,
          pairId,
          tf,
          startTs: tfRangeStart,
          endTs: tfRangeEnd,
        })
      : Promise.resolve(null as FppCluster[] | null),
  ]);

  // If running in FPP mode without an explicit `fpps` override, derive
  // detections from the just-fetched clusters using the same logic that
  // tr-v3-bidasks/generate-fpp runs server-side as a cron.
  let effectiveFpps: Fpp[] | undefined = fpps;
  if (wantsClusterFpps && clusters) {
    const clustersByTs = new Map<number, FppCluster>();
    for (const c of clusters) {
      const t = Number(c.ts);
      if (Number.isFinite(t)) clustersByTs.set(t, c);
    }
    effectiveFpps = detectFppForSeries(clustersByTs, klinesTf as any);
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

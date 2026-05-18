import {useCallback} from "react";

export function drawHeatmap(chart: any, klines: any[], orderbooks: any[]) {
  chart.removeOverlay({ name: `heatmapItem` });
  for (const orderbook of orderbooks) {
    const raw = orderbook?.data;
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const prices = Object.keys(raw)
      .map((item) => parseFloat(item))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    if (prices.length < 1) {
      continue;
    }

    const points =
      [prices[0], prices[prices.length - 1]].map((item) => ({
        timestamp: parseInt(String(orderbook.ts), 10),
        value: item,
      }));

    chart.createOverlay({
      name: `heatmapItem`,
      extendData: raw,
      points,
    });
  }
}

/** Same bar threshold as Map cluster click / zoom cleanup. */
const MIN_BAR_FOR_CLUSTER_KLINE_AUTO = 25;
/** Bidasks clusters are loaded with tf=5 minutes. */
const BIDASK_CLUSTER_STEP_MS = 5 * 60 * 1000;

/**
 * Draw `clusterKline` for every visible candle that has bidask cluster data (via `extendData`).
 */
export function drawClusterKlinesForVisible(
  chart: any,
  bidaskClustersByTs: Record<string, any>,
  options?: { minBarWidth?: number; showSpike?: boolean; spikeMultiplier?: number },
): void {
  if (!chart) {
    return;
  }
  chart.removeOverlay({ name: 'clusterKline' });
  const minBar = options?.minBarWidth ?? MIN_BAR_FOR_CLUSTER_KLINE_AUTO;
  const bar = chart.getBarSpace?.()?.bar;
  if (!Number.isFinite(bar) || bar < minBar) {
    return;
  }
  const dataList = chart.getDataList?.();
  const visibleRange = chart.getVisibleRange?.();
  if (!dataList?.length || !visibleRange) {
    return;
  }
  const visibleFrom = Number.isFinite(visibleRange.realFrom)
    ? visibleRange.realFrom
    : visibleRange.from;
  const visibleToExclusive = Number.isFinite(visibleRange.realTo)
    ? visibleRange.realTo
    : visibleRange.to;
  for (let i = 0; i < dataList.length; i += 1) {
    if (i < visibleFrom || i >= visibleToExclusive) {
      continue;
    }
    const kline = dataList[i];
    const exactKey = String(kline.timestamp);
    const bucketTs = Math.floor(Number(kline.timestamp) / BIDASK_CLUSTER_STEP_MS) * BIDASK_CLUSTER_STEP_MS;
    const bucketKey = String(bucketTs);
    const cluster = bidaskClustersByTs[exactKey] ?? bidaskClustersByTs[bucketKey];
    const raw = cluster?.data;
    if (!raw || typeof raw !== 'object' || !Object.keys(raw).length) {
      continue;
    }
    chart.createOverlay({
      name: 'clusterKline',
      extendData: options?.showSpike
        ? { levels: raw, showSpike: true, spikeMultiplier: options.spikeMultiplier ?? 3 }
        : raw,
      points: [
        { timestamp: kline.timestamp, value: parseFloat(kline.high) },
        { timestamp: kline.timestamp, value: parseFloat(kline.low) },
      ],
    });
  }
}


export function drawFppPatterns(chart: any, klines: any[], fpp: any, tdaPoints = [], fppFilters: any[], combine: boolean = false): void {
  if (!fpp?.length) { return }
  for (const kline of klines) {
    const selectedTypes: string[] = Array.isArray(fppFilters) ? fppFilters : [];
    const includeTda: boolean = selectedTypes.includes('tda');
    const filtersExcludingTda = selectedTypes.filter(t => t !== 'tda');

    const fppAtTs: any[] = (fpp as any[]).filter((item: any) => parseInt(item.ts) === kline.timestamp);
    const tdaAtTs: any[] = (tdaPoints as any[] || []).filter((item: any) => parseInt(item.ts) === kline.timestamp);

    if (combine) {
      // Require that for each selected filter, there is a matching item on the direction
      const hasAllForDirection = (dir: 'up'|'down') => {
        // All non-tda filters present on fpp with same direction
        const okFpp = filtersExcludingTda.every(t => fppAtTs.some(it => it.type === t && it.direction === dir));
        const okTda = includeTda ? tdaAtTs.some(it => it.side === dir) : true;
        return okFpp && okTda;
      };

      if (hasAllForDirection('up')) {
        chart.createOverlay({
          name: `up${filtersExcludingTda.length + (includeTda ? 1 : 0)}Circle`,
          points: [
            {
              timestamp: parseInt(kline.timestamp),
              value: parseFloat(kline.low),
            },
          ]
        });
      }
      if (hasAllForDirection('down')) {
        chart.createOverlay({
          name: `down${filtersExcludingTda.length + (includeTda ? 1 : 0)}Circle`,
          points: [
            {
              timestamp: parseInt(kline.timestamp),
              value: parseFloat(kline.high),
            }
          ]
        });
      }
    } else {
      // OR mode (existing behavior): count matches by direction
      const r: any = {up: { s: 0, v: parseFloat(kline.low)}, down: { s: 0, v: parseFloat(kline.high) }};
      for (const fppItem of fppAtTs) {
        if (selectedTypes.includes(fppItem.type)) {
          r[fppItem.direction].s += 1;
        }
      }
      if (includeTda) {
        for (const tdaPoint of tdaAtTs) {
          r[tdaPoint.side].s += 1;
        }
      }
      if (r.up.s) {
        chart.createOverlay({
          name: `up${r.up.s}Circle`,
          points: [
            {
              timestamp: parseInt(kline.timestamp),
              value: r.up.v,
            }
          ]
        });
      }
      if (r.down.s) {
        chart.createOverlay({
          name: `down${r.down.s}Circle`,
          points: [
            {
              timestamp: parseInt(kline.timestamp),
              value: r.down.v,
            }
          ]
        });
      }
    }
  }
}

export function direction(kline: any) {
  return parseFloat(kline.close) > parseFloat(kline.open) ? 'up' : 'down';
}

export function clearFppPatterns(chart: any) {
  for (const item of [1,2,3,4,5,6,7]) {
    chart.removeOverlay({ name: `up${item}Circle` });
    chart.removeOverlay({ name: `down${item}Circle` });
  }
}
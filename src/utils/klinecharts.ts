import {useCallback} from "react";

export function drawHeatmap(chart: any, klines: any[], orderbooks: any[]) {
  chart.removeOverlay({ name: `heatmapItem` });
  for (const orderbook of orderbooks) {
    if (parseInt(orderbook.ts) < 1769956974000) {
      continue;
    }

    const prices = Object.keys(orderbook.data)
      .map(item => parseFloat(item))
      .sort()

    const points =
      [prices[0], prices[prices.length - 1]]
      .map(item => { return { timestamp: parseInt(orderbook.ts), value: item }})

    chart.createOverlay({
      name: `heatmapItem`,
      extendData: orderbook.data,
      points,
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
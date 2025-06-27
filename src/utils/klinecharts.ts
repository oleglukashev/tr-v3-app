import {useCallback} from "react";

export function drawFppPatterns(chart: any, klines: any[], fpp: any, fppFilters: any[]): void {
  if (!fpp?.length) { return }
  for (const kline of klines) {
    const fppItems: any[] = fpp.filter(item => parseInt(item.ts) === kline.timestamp && fppFilters.includes(item.type));
    const r: any = {up: { s: 0, v: parseFloat(kline.low)}, down: { s: 0, v: parseFloat(kline.high) }};
    for (const fppItem of fppItems) {
      r[fppItem.direction].s += 1;
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

export function clearFppPatterns(chart: any) {
  for (const item of [1,2,3,4,5,6,7]) {
    chart.removeOverlay({ name: `up${item}Circle` });
    chart.removeOverlay({ name: `down${item}Circle` });
  }
}
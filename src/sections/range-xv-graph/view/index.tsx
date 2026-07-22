'use client'

import { useCallback, useEffect, useRef, useState } from "react";
import { init, dispose, registerIndicator, registerOverlay } from "klinecharts";
import { Box, Drawer, Button, Tabs, Tab, Chip, Typography, Divider } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import moment from "moment";
import CustomDialog from "src/components/custom-dialog/custom-dialog";
import { resizeChart, strongLevel, clusterKline, testDhmUp, testDhmDown } from "@/src/helpers/klinecharts.helper";
import { drawStrongLevels, drawClusterKlinesForVisible } from "@/src/utils/klinecharts";
import { RangeXvSettingsForm } from "@/src/sections/range-xv-graph/range-xv-settings-form";
import { XvBacktestForm, DEFAULT_XV_BACKTEST_VALUES } from "@/src/sections/range-xv-graph-test/xv-backtest-form";
import { runXvBacktestForUI } from "@/src/utils/xv-backtest";
import { getBidasksWebSocketUrl } from "@/src/utils/bidasksWebSocket";
import MapTools from "@/src/components/map-tools/map-tools";
import { useMapDrawingOverlayRef } from "@/src/components/map-tools/use-map-drawing-overlay-ref";

// Strong levels (S/R) + cluster footprint overlays — reused as-is from the dhm graph.
registerOverlay(strongLevel);
registerOverlay(clusterKline());
// Backtest entry markers — reused from the dhm graph.
registerOverlay(testDhmUp);
registerOverlay(testDhmDown);

// Highlight overlay for reversal bricks with a strong bid/ask imbalance: recolors
// the brick body, coloured by the dominant side.
const IMBALANCE_COLOR = 'rgba(156,39,176,0.92)'; // purple (fallback)
const IMBALANCE_BID_COLOR = 'rgba(33,150,243,0.92)'; // blue — buy (bid) dominant
const IMBALANCE_ASK_COLOR = 'rgba(255,152,0,0.92)'; // orange — sell (ask) dominant
const xvImbalanceMark: any = {
  name: 'xvImbalanceMark',
  totalStep: 2,
  needDefaultPointFigure: false,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false,
  createPointFigures: ({ chart, coordinates, overlay }: any) => {
    if (!coordinates || coordinates.length < 2) return [];
    const x = coordinates[0].x;
    const yOpen = coordinates[0].y;
    const yClose = coordinates[1].y;
    const color = overlay?.extendData?.color || IMBALANCE_COLOR;
    let w = 6;
    try { w = Math.max(2, (chart.getBarSpace?.()?.bar || 8) * 0.9); } catch {}
    const top = Math.min(yOpen, yClose);
    let h = Math.abs(yOpen - yClose);
    if (h < 2) h = 2;
    return [{
      type: 'rect',
      ignoreEvent: true,
      attrs: { x: x - w / 2, y: top, width: w, height: h },
      styles: { style: 'fill', color },
    }];
  },
};
registerOverlay(xvImbalanceMark);

/** Total buy (bid) vs sell (ask) volume across a footprint's price levels. */
function footprintSideTotals(data: Record<string, any>): { bid: number; ask: number } {
  let bid = 0;
  let ask = 0;
  for (const k in data) {
    bid += Number(data[k]?.bv) || 0;
    ask += Number(data[k]?.sv) || 0;
  }
  return { bid, ask };
}

/** Passes the bid/ask imbalance filter: total imbalance >= ratioN, side ok. */
function passesImbalanceFilter(
  bid: number,
  ask: number,
  bUp: boolean,
  ratioN: number,
  side: string,
): boolean {
  if (!(ratioN > 0) || bid === ask) return false;
  const dominant = bid > ask ? 'bid' : 'ask';
  const ratio = dominant === 'bid'
    ? (ask > 0 ? bid / ask : Infinity)
    : (bid > 0 ? ask / bid : Infinity);
  if (!(ratio >= ratioN)) return false;
  const withTrend = bUp ? dominant === 'bid' : dominant === 'ask';
  if (side === 'trend' && !withTrend) return false;
  if (side === 'counter' && withTrend) return false;
  return true;
}

/**
 * Passes the stacked filter: runN consecutive price levels with the imbalance
 * all on the SAME side — each level is strong when buys exceed sells BY M
 * (buy side) OR sells exceed buys BY M (sell side); M is a volume amount, not a
 * ratio. The run breaks when a level isn't strong or flips side.
 */
function passesStackedFilter(data: Record<string, any>, runN: number, minDiff: number): boolean {
  if (!(runN >= 1) || !(minDiff > 0)) return false;
  const keys = Object.keys(data)
    .filter((k) => Number.isFinite(parseFloat(k)))
    .sort((x, y) => parseFloat(x) - parseFloat(y));
  let run = 0;
  let runDir = 0; // +1 = buy-dominant, -1 = sell-dominant
  for (const k of keys) {
    const lvl = data[k];
    const bv = Number(lvl?.bv) || 0;
    const sv = Number(lvl?.sv) || 0;
    const buyExceeds = bv - sv >= minDiff; // buys greater than sells by >= M
    const sellExceeds = sv - bv >= minDiff; // sells greater than buys by >= M
    const dir = buyExceeds ? 1 : (sellExceeds ? -1 : 0);
    if (dir === 0) {
      run = 0;
      runDir = 0;
      continue;
    }
    run = dir === runDir ? run + 1 : 1;
    runDir = dir;
    if (run >= runN) return true;
  }
  return false;
}

/**
 * Highlight visible *reversal* bricks that pass the enabled footprint filters.
 * Two independent sub-filters (each toggled via opts.*Enabled); a brick must
 * pass EVERY enabled filter (AND). The brick is recoloured by its dominant side
 * (blue = bid/buy, orange = ask/sell), reusing the imbalance marking style.
 */
function drawXvReversalHighlight(
  chart: any,
  clustersByTs: Record<string, any>,
  opts: {
    imbalanceEnabled: boolean;
    imbalanceRatio: number;
    imbalanceSide: string;
    stackedEnabled: boolean;
    stackedRunN: number;
    stackedRatioM: number;
  },
) {
  if (!chart) return;
  chart.removeOverlay({ name: 'xvImbalanceMark' });
  if (!opts.imbalanceEnabled && !opts.stackedEnabled) return; // no active filter
  const dataList = chart.getDataList?.();
  const vr = chart.getVisibleRange?.();
  if (!dataList?.length || !vr) return;
  const from = Number.isFinite(vr.realFrom) ? vr.realFrom : vr.from;
  const to = Number.isFinite(vr.realTo) ? vr.realTo : vr.to;
  for (let i = Math.max(1, from); i < Math.min(dataList.length, to); i += 1) {
    const b = dataList[i];
    const a = dataList[i - 1];
    if (!b || !a) continue;
    const bUp = b.close >= b.open; // reversal brick's own direction
    if (bUp === (a.close >= a.open)) continue; // only reversal bricks
    const data = clustersByTs[String(b.timestamp)]?.data;
    if (!data || typeof data !== 'object') continue;
    const { bid, ask } = footprintSideTotals(data);
    // Every enabled filter must pass.
    if (opts.imbalanceEnabled && !passesImbalanceFilter(bid, ask, bUp, opts.imbalanceRatio, opts.imbalanceSide)) continue;
    if (opts.stackedEnabled && !passesStackedFilter(data, opts.stackedRunN, opts.stackedRatioM)) continue;
    const color = bid >= ask ? IMBALANCE_BID_COLOR : IMBALANCE_ASK_COLOR;
    chart.createOverlay({
      name: 'xvImbalanceMark',
      extendData: { color },
      points: [
        { timestamp: b.timestamp, value: Number(b.open) },
        { timestamp: b.timestamp, value: Number(b.close) },
      ],
    });
  }
}

/** Backtest status → MUI chip/Label color. */
function xvStatusColor(status: string): 'success' | 'error' | 'info' | 'default' {
  if (status === 'finished') return 'success';
  if (status === 'finished_by_lose') return 'error';
  if (status === 'finished_by_be') return 'default';
  return 'info';
}

const XV_STATUS_LABEL: Record<string, string> = {
  finished: 'Тейк',
  finished_by_lose: 'Стоп',
  finished_by_be: 'Безубыток',
  finished_by_length: 'Не закрыта',
};

// Cluster (volume-by-price footprint) defaults, mirroring the dhm graph.
const DEFAULT_CLUSTERS = {
  showClusters: false,
  showClusterSpike: false,
  clusterSpikeMultiplier: 3,
};

// Reversal-brick footprint highlight: a master toggle (showReversal) over two
// independent sub-filters — total bid/ask imbalance and stacked per-level
// imbalance. A brick must pass every enabled sub-filter.
const DEFAULT_IMBALANCE = {
  showReversal: false, // master on/off for the whole highlight
  showImbalance: true, // sub-filter: total bid/ask imbalance
  imbalanceRatio: 3,
  imbalanceSide: '', // '' = any, 'trend' = with reversal, 'counter' = against
};

// Sub-filter: N consecutive footprint levels each imbalanced >= M times.
const DEFAULT_STACKED = {
  showStacked: false,
  stackedRunN: 3,
  stackedRatioM: 3,
};

function xvClusterHasLevels(it: any): boolean {
  const d = it?.data;
  return d != null && typeof d === 'object' && Object.keys(d).length > 0;
}

// RSI sub-pane defaults (built-in klinecharts indicator).
const DEFAULT_RSI = {
  showRsi: true,
  rsiPeriod: 14,
};
// Overbought / oversold reference bands drawn on the RSI pane.
const RSI_BANDS = [80, 20];

// Footprint delta sub-pane defaults.
const DEFAULT_DELTA = {
  showDelta: false,
};

// Liquidation counts (up/down per brick) defaults.
const DEFAULT_LIQUIDATIONS = {
  showLiquidations: true,
};

// Sweep markers (up/down per brick) defaults.
const DEFAULT_SWEEPS = {
  showSweeps: true,
};

// Draw the 20/80 reference lines on the RSI pane. Returns false so the default
// RSI line(s) still render on top (klinecharts skips defaults only when draw
// returns true). The pane scale is pinned to 0–100 so the bands stay in view.
function drawRsiBands({ ctx, bounding, yAxis }: any): boolean {
  ctx.save();
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(150,150,150,0.55)';
  for (const lv of RSI_BANDS) {
    const y = yAxis.convertToPixel(lv);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(bounding.width, y);
    ctx.stroke();
  }
  ctx.restore();
  return false;
}

// Strong-levels (S/R) defaults, mirroring the dhm graph.
const DEFAULT_STRONG_LEVELS = {
  showStrongLevels: true,
  strongLevelsLookback: 5,
  strongLevelsTolerance: 0.2,
  strongLevelsMinTouches: 2,
  strongLevelsMaxCount: 20,
};

// XV is served by the bidasks service (NEXT_PUBLIC_TR_CLUSTERS_DOMAIN), type=xv, by r (range size).
const KLINES_API_BASE =
  (process.env.NEXT_PUBLIC_TR_CLUSTERS_DOMAIN as string) || 'http://bidasks.traken-trade.ru/api/v1';
// XV is sparse, so page by COUNT (cursor over ts) instead of fixed time windows:
// each page is the newest PAGE_SIZE bricks before the cursor. No empty-window
// scanning, bounded payloads, fewer requests.
const PAGE_SIZE = 500;
const UP = '#26a69a';
const DOWN = '#ef5350';

// Mutable config read by the (globally registered) custom indicator draw.
const xvConfig = { volumeWidth: false, volP5: 0, volP95: 1 };

// Per-brick delta (Σbv − Σsv) keyed by bar ts, read by the XV_DELTA indicator.
const xvDeltaConfig: { byTs: Record<string, number> } = { byTs: {} };

// Per-brick liquidation counts keyed by bar ts, read by the XV_LIQUIDATIONS
// indicator. up = long liqs (buy side), down = short liqs (sell side).
const xvLiqConfig: { byTs: Record<string, { up: number; down: number }> } = { byTs: {} };
const LIQ_UP_COLOR = '#26a69a';   // up count, drawn below the brick low
const LIQ_DOWN_COLOR = '#ef5350'; // down count, drawn above the brick high

// Per-brick sweep counts keyed by bar ts, read by the XV_SWEEPS indicator.
// up = buy sweeps (taker bought through levels → price up), down = sell sweeps.
const xvSweepConfig: { byTs: Record<string, { up: number; down: number }> } = { byTs: {} };
const SWEEP_UP_COLOR = '#00897b';   // buy sweep marker, below the brick low
const SWEEP_DOWN_COLOR = '#d32f2f'; // sell sweep marker, above the brick high

function pct(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.max(0, Math.min(s.length - 1, Math.floor((p / 100) * (s.length - 1))))];
}

let indicatorRegistered = false;
function registerRangeXvIndicator() {
  if (indicatorRegistered) return;
  indicatorRegistered = true;
  registerIndicator({
    name: 'RANGE_XV',
    shortName: 'RangeXV',
    series: 'price',
    calc: (dataList: any[]) => dataList.map(() => ({})),
    draw: ({ ctx, chart, xAxis, yAxis }: any) => {
      const dataList = chart.getDataList();
      const vr = chart.getVisibleRange();
      const slot = chart.getBarSpace().bar;
      ctx.save();
      ctx.setLineDash([]);
      ctx.lineCap = 'butt';
      for (let i = vr.from; i < vr.to; i++) {
        const d = dataList[i];
        if (!d) continue;
        const x = xAxis.convertToPixel(i);
        const yH = yAxis.convertToPixel(d.high);
        const yL = yAxis.convertToPixel(d.low);
        const yO = yAxis.convertToPixel(d.open);
        const yC = yAxis.convertToPixel(d.close);
        const up = d.close >= d.open;
        const col = up ? UP : DOWN;
        let t = (Number(d.volume) - xvConfig.volP5) / (xvConfig.volP95 - xvConfig.volP5);
        t = Math.max(0, Math.min(1, t));
        const w = Math.max(1, Math.min(slot * 0.96, slot * (0.14 + 0.84 * Math.sqrt(t))));
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yH);
        ctx.lineTo(x, yL);
        ctx.stroke();
        let top = Math.min(yO, yC);
        let h = Math.abs(yO - yC);
        if (h < 1) h = 1;
        ctx.fillRect(x - w / 2, top, w, h);
      }
      ctx.restore();
      return true;
    },
  } as any);
}

// Footprint delta sub-pane: per-brick delta (Σbv − Σsv) histogram coloured by
// sign + a cumulative-delta line. Values come from xvDeltaConfig.byTs (built
// from the loaded footprints); calc feeds the pane's auto y-range, draw renders.
let deltaIndicatorRegistered = false;
function registerXvDeltaIndicator() {
  if (deltaIndicatorRegistered) return;
  deltaIndicatorRegistered = true;
  registerIndicator({
    name: 'XV_DELTA',
    shortName: 'Delta',
    // Footprint deltas live outside klinecharts' data, so an explicit
    // overrideIndicator() must always recompute (default would no-op).
    shouldUpdate: () => true,
    calc: (dataList: any[]) => {
      let cum = 0;
      return dataList.map((d) => {
        const delta = xvDeltaConfig.byTs[String(d.timestamp)] ?? 0;
        cum += delta;
        return { delta, cum };
      });
    },
    figures: [
      { key: 'delta', title: 'Δ: ', type: 'bar' },
      { key: 'cum', title: 'ΣΔ: ', type: 'line' },
    ],
    draw: ({ ctx, chart, indicator, xAxis, yAxis, bounding }: any) => {
      // Use the precomputed calc result (refreshed via overrideIndicator) rather
      // than rebuilding the cumulative array every frame — keeps resize cheap.
      const vals = indicator?.result || [];
      const vr = chart.getVisibleRange();
      const slot = chart.getBarSpace().bar;
      const y0 = yAxis.convertToPixel(0);
      ctx.save();
      // zero line
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(150,150,150,0.45)';
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(bounding.width, y0);
      ctx.stroke();
      ctx.setLineDash([]);
      // per-brick delta histogram
      const w = Math.max(1, slot * 0.7);
      for (let i = vr.from; i < vr.to; i++) {
        const rr = vals[i];
        if (!rr) continue;
        const x = xAxis.convertToPixel(i);
        const yv = yAxis.convertToPixel(rr.delta);
        ctx.fillStyle = rr.delta >= 0 ? UP : DOWN;
        const top = Math.min(y0, yv);
        let h = Math.abs(yv - y0);
        if (h < 1) h = 1;
        ctx.fillRect(x - w / 2, top, w, h);
      }
      // cumulative delta line
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#2962ff';
      let started = false;
      for (let i = vr.from; i < vr.to; i++) {
        const rr = vals[i];
        if (!rr) continue;
        const x = xAxis.convertToPixel(i);
        const y = yAxis.convertToPixel(rr.cum);
        if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
      }
      ctx.stroke();
      ctx.restore();
      return true;
    },
  } as any);
}

// Liquidation counts drawn on the candle pane: for each brick, the number of
// DOWN liquidations above its high (red) and UP liquidations below its low
// (green). Counts come from xvLiqConfig.byTs (bucketed from loaded liquidations);
// calc is trivial, draw renders text over the visible bricks.
let liqIndicatorRegistered = false;
function registerXvLiquidationsIndicator() {
  if (liqIndicatorRegistered) return;
  liqIndicatorRegistered = true;
  registerIndicator({
    name: 'XV_LIQUIDATIONS',
    shortName: 'Liq',
    series: 'price',
    // Counts live outside klinecharts' data, so overrideIndicator() must always
    // recompute/redraw (default would no-op when the bar data is unchanged).
    shouldUpdate: () => true,
    calc: (dataList: any[]) => dataList.map(() => ({})),
    draw: ({ ctx, chart, xAxis, yAxis }: any) => {
      const dataList = chart.getDataList();
      const vr = chart.getVisibleRange();
      ctx.save();
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      for (let i = vr.from; i < vr.to; i++) {
        const d = dataList[i];
        if (!d) continue;
        const counts = xvLiqConfig.byTs[String(d.timestamp)];
        if (!counts) continue;
        const x = xAxis.convertToPixel(i);
        if (counts.down > 0) {
          const yH = yAxis.convertToPixel(d.high);
          ctx.fillStyle = LIQ_DOWN_COLOR;
          ctx.textBaseline = 'bottom';
          ctx.fillText(String(counts.down), x, yH - 3);
        }
        if (counts.up > 0) {
          const yL = yAxis.convertToPixel(d.low);
          ctx.fillStyle = LIQ_UP_COLOR;
          ctx.textBaseline = 'top';
          ctx.fillText(String(counts.up), x, yL + 3);
        }
      }
      ctx.restore();
      return true;
    },
  } as any);
}

// Sweep markers drawn on the candle pane: a small triangle per brick where a
// single market order swept several price levels — buy sweeps (△, green) below
// the low, sell sweeps (▽, red) above the high, with the sweep count. Drawn
// further from the wick than the liquidation counts so they don't overlap.
let sweepIndicatorRegistered = false;
function registerXvSweepsIndicator() {
  if (sweepIndicatorRegistered) return;
  sweepIndicatorRegistered = true;
  const triangle = (ctx: any, x: number, y: number, size: number, up: boolean) => {
    ctx.beginPath();
    if (up) {
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size, y + size);
      ctx.lineTo(x + size, y + size);
    } else {
      ctx.moveTo(x, y + size);
      ctx.lineTo(x - size, y - size);
      ctx.lineTo(x + size, y - size);
    }
    ctx.closePath();
    ctx.fill();
  };
  registerIndicator({
    name: 'XV_SWEEPS',
    shortName: 'Sweep',
    series: 'price',
    shouldUpdate: () => true,
    calc: (dataList: any[]) => dataList.map(() => ({})),
    draw: ({ ctx, chart, xAxis, yAxis }: any) => {
      const dataList = chart.getDataList();
      const vr = chart.getVisibleRange();
      ctx.save();
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      for (let i = vr.from; i < vr.to; i++) {
        const d = dataList[i];
        if (!d) continue;
        const counts = xvSweepConfig.byTs[String(d.timestamp)];
        if (!counts) continue;
        const x = xAxis.convertToPixel(i);
        if (counts.down > 0) {
          const yH = yAxis.convertToPixel(d.high);
          ctx.fillStyle = SWEEP_DOWN_COLOR;
          triangle(ctx, x, yH - 16, 4, false);
          if (counts.down > 1) {
            ctx.textBaseline = 'bottom';
            ctx.fillText(String(counts.down), x, yH - 22);
          }
        }
        if (counts.up > 0) {
          const yL = yAxis.convertToPixel(d.low);
          ctx.fillStyle = SWEEP_UP_COLOR;
          triangle(ctx, x, yL + 16, 4, true);
          if (counts.up > 1) {
            ctx.textBaseline = 'top';
            ctx.fillText(String(counts.up), x, yL + 22);
          }
        }
      }
      ctx.restore();
      return true;
    },
  } as any);
}

export default function RangeXvGraphView({ pairId, r: rFromUrl }: any) {
  // Chart display/indicator settings are shared across ALL pairs (one global
  // key), so RSI/delta/clusters/imbalance prefs carry over when switching pair.
  // Only R (the range size) stays per-pair — it's price-scale specific to each
  // symbol (BTC R=100 vs KAS R=0.001), so it can't be shared.
  const SETTINGS_STORAGE_KEY = `rangeXvGraphSettings`;
  const R_STORAGE_KEY = `rangeXvGraphR_${pairId}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const xvIndicatorOnRef = useRef<boolean>(false);
  const allBarsRef = useRef<Map<number, any>>(new Map());
  // klinecharts feeds realtime bars only through the data loader's subscribeBar
  // callback (there's no public updateData in v10). We capture it here and push
  // bars from our own XV websocket into it.
  const barCallbackRef = useRef<((bar: any) => void) | null>(null);

  const [r, setR] = useState<string>('');           // range size R, set in settings
  const rRef = useRef<string>('');
  rRef.current = r;

  const [volumeWidth, setVolumeWidth] = useState<boolean>(false);
  // RSI sub-pane (built-in klinecharts indicator) — toggle + period from settings.
  const [showRsi, setShowRsi] = useState<boolean>(DEFAULT_RSI.showRsi);
  const [rsiPeriod, setRsiPeriod] = useState<number>(DEFAULT_RSI.rsiPeriod);
  // Footprint delta sub-pane (uses footprints, like the imbalance highlight).
  const [showDelta, setShowDelta] = useState<boolean>(DEFAULT_DELTA.showDelta);
  // Liquidation counts per brick (up below / down above). Deduped by a composite
  // key so a liquidation seen over both REST and the live WS is counted once.
  const [showLiquidations, setShowLiquidations] = useState<boolean>(DEFAULT_LIQUIDATIONS.showLiquidations);
  const liquidationsRef = useRef<Map<string, { ts: number; position: string }>>(new Map());
  const [liqVersion, setLiqVersion] = useState<number>(0);
  // Sweep markers per brick (buy below / sell above). Deduped by composite key so
  // a sweep seen over both REST and the live WS is counted once.
  const [showSweeps, setShowSweeps] = useState<boolean>(DEFAULT_SWEEPS.showSweeps);
  const sweepsRef = useRef<Map<string, { ts: number; side: string }>>(new Map());
  const [sweepVersion, setSweepVersion] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [openChartSettings, setOpenChartSettings] = useState<boolean>(false);

  // Strong levels (S/R) — same feature/settings as the dhm graph.
  const [showStrongLevels, setShowStrongLevels] = useState<boolean>(DEFAULT_STRONG_LEVELS.showStrongLevels);
  const [strongLevelsLookback, setStrongLevelsLookback] = useState<number>(DEFAULT_STRONG_LEVELS.strongLevelsLookback);
  const [strongLevelsTolerance, setStrongLevelsTolerance] = useState<number>(DEFAULT_STRONG_LEVELS.strongLevelsTolerance);
  const [strongLevelsMinTouches, setStrongLevelsMinTouches] = useState<number>(DEFAULT_STRONG_LEVELS.strongLevelsMinTouches);
  const [strongLevelsMaxCount, setStrongLevelsMaxCount] = useState<number>(DEFAULT_STRONG_LEVELS.strongLevelsMaxCount);
  // Bumped when the dataset changes (batch load / closed brick) so derived
  // overlays like strong levels recompute — but not on every forming tick.
  const [klinesVersion, setKlinesVersion] = useState<number>(0);

  // Cluster footprints (volume-by-price per brick) — same feature/render as dhm.
  const [showClusters, setShowClusters] = useState<boolean>(DEFAULT_CLUSTERS.showClusters);
  const [showClusterSpike, setShowClusterSpike] = useState<boolean>(DEFAULT_CLUSTERS.showClusterSpike);
  const [clusterSpikeMultiplier, setClusterSpikeMultiplier] = useState<number>(DEFAULT_CLUSTERS.clusterSpikeMultiplier);
  // Reversal-brick footprint highlight: master toggle + two sub-filters.
  const [showReversal, setShowReversal] = useState<boolean>(DEFAULT_IMBALANCE.showReversal);
  const [showImbalance, setShowImbalance] = useState<boolean>(DEFAULT_IMBALANCE.showImbalance);
  const [imbalanceRatio, setImbalanceRatio] = useState<number>(DEFAULT_IMBALANCE.imbalanceRatio);
  const [imbalanceSide, setImbalanceSide] = useState<string>(DEFAULT_IMBALANCE.imbalanceSide);
  // Highlight reversal bricks with N consecutive strongly-imbalanced footprint levels.
  const [showStacked, setShowStacked] = useState<boolean>(DEFAULT_STACKED.showStacked);
  const [stackedRunN, setStackedRunN] = useState<number>(DEFAULT_STACKED.stackedRunN);
  const [stackedRatioM, setStackedRatioM] = useState<number>(DEFAULT_STACKED.stackedRatioM);
  // Footprint per brick, keyed by the bar timestamp — the same real ts the brick
  // and its footprint are both born with, over REST and WS alike. Redraw is
  // index-based via drawClusterKlinesForVisible, so this key matches each candle.
  const [clustersByTs, setClustersByTs] = useState<Record<string, any>>({});
  const [clustersTick, setClustersTick] = useState<number>(0);

  // MapTools needs the chart as a reactive value (the ref above does not re-render),
  // plus a "first bars loaded" gate before it creates/restores drawing overlays.
  const [chart, setChart] = useState<any>(null);
  const [chartReady, setChartReady] = useState<boolean>(false);
  const { onDrawingInteractionChange } = useMapDrawingOverlayRef();

  // --- Backtest (Test) panel — reversal strategy on XV bricks ---
  const theme = useTheme();
  const BACKTEST_STORAGE_KEY = `rangeXvBacktest_${pairId}`;
  const [isTestPanelOpen, setIsTestPanelOpen] = useState<boolean>(false);
  const [panelHeight, setPanelHeight] = useState<number>(340);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);
  const [testSessions, setTestSessions] = useState<any[]>([]);
  const [testSessionsTab, setTestSessionsTab] = useState<string>('all');
  const [backtestDefaults, setBacktestDefaults] = useState<any>(DEFAULT_XV_BACKTEST_VALUES);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(340);

  // One XV klines page. With `limit` it's cursor pagination (newest `limit`
  // bricks before `endTs`, chronological); without it, a plain ts-range fetch.
  const fetchXvPage = useCallback(async (
    rv: string,
    opts: { startTs?: number; endTs?: number; limit?: number },
  ) => {
    const params = new URLSearchParams({ type: 'xv', pairId: String(pairId), r: String(rv) });
    if (opts.startTs != null) params.set('startTs', String(opts.startTs));
    if (opts.endTs != null) params.set('endTs', String(opts.endTs));
    if (opts.limit != null) params.set('limit', String(opts.limit));
    const res = await fetch(`${KLINES_API_BASE}/klines?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: any[] = await res.json();
    return raw
      .map((it) => ({
        timestamp: parseInt(it.ts, 10),
        open: parseFloat(it.open),
        high: parseFloat(it.high),
        low: parseFloat(it.low),
        close: parseFloat(it.close),
        volume: parseFloat(it.volume),
        // The API appends the still-forming brick to the newest page; it must not
        // count towards the "more pages" check below.
        forming: Boolean(it.forming),
      }))
      .filter((b) => Number.isFinite(b.timestamp) && Number.isFinite(b.open));
  }, [pairId]);

  const mergeBars = useCallback((bars: any[]) => {
    if (bars.length) setChartReady(true);
    for (const b of bars) allBarsRef.current.set(b.timestamp, b);
    const vols = Array.from(allBarsRef.current.values()).map((b) => Number(b.volume));
    xvConfig.volP5 = pct(vols, 5);
    xvConfig.volP95 = pct(vols, 95);
    if (xvConfig.volP95 <= xvConfig.volP5) xvConfig.volP95 = xvConfig.volP5 + 1;
  }, []);

  // Per-brick footprints from the bidasks service (same host/auth as XV klines).
  const fetchXvClusters = useCallback(async (rv: string, startTs: number, endTs: number) => {
    const url = `${KLINES_API_BASE}/clusters?type=xv&pairId=${pairId}&r=${rv}&startTs=${startTs}&endTs=${endTs}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    return Array.isArray(raw) ? raw : [];
  }, [pairId]);

  // Merge footprints into clustersByTs under a caller-provided key, preserving a
  // good footprint when a later/overlapping payload arrives empty (mirrors dhm).
  const mergeClusters = useCallback((items: any[], keyOf: (it: any) => string) => {
    if (!items.length) return;
    setClustersByTs((prev) => {
      const next = { ...prev };
      for (const it of items) {
        const key = keyOf(it);
        if (!key) continue;
        const merged = { ...it, ts: key };
        if (!xvClusterHasLevels(merged) && xvClusterHasLevels(prev[key])) continue;
        next[key] = merged;
      }
      return next;
    });
    setClustersTick((t) => t + 1);
  }, []);

  // Liquidations for a ts range (raw events; the graph buckets them per brick).
  const fetchLiquidations = useCallback(async (startTs: number, endTs: number) => {
    const url = `${KLINES_API_BASE}/liquidations?pairId=${pairId}&startTs=${startTs}&endTs=${endTs}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    return Array.isArray(raw) ? raw : [];
  }, [pairId]);

  // Add liquidations to the deduped store (REST + live WS share the same key),
  // then bump the version so counts recompute. Filters out foreign pairs.
  const addLiquidations = useCallback((items: any[]) => {
    if (!items?.length) return;
    let changed = false;
    for (const it of items) {
      if (Number(it.pairId) !== Number(pairId)) continue;
      const ts = Number(it.ts);
      const position = String(it.position);
      if (!Number.isFinite(ts)) continue;
      const key = `${ts}:${it.price}:${it.contracts}:${position}`;
      if (!liquidationsRef.current.has(key)) {
        liquidationsRef.current.set(key, { ts, position });
        changed = true;
      }
    }
    if (changed) setLiqVersion((v) => v + 1);
  }, [pairId]);

  // Sweeps for a ts range (the graph buckets them per brick).
  const fetchSweeps = useCallback(async (startTs: number, endTs: number) => {
    const url = `${KLINES_API_BASE}/sweeps?pairId=${pairId}&startTs=${startTs}&endTs=${endTs}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    return Array.isArray(raw) ? raw : [];
  }, [pairId]);

  // Add sweeps to the deduped store (REST + live WS share the same key), then
  // bump the version so counts recompute. Filters out foreign pairs.
  const addSweeps = useCallback((items: any[]) => {
    if (!items?.length) return;
    let changed = false;
    for (const it of items) {
      if (Number(it.pairId) !== Number(pairId)) continue;
      const ts = Number(it.ts);
      const side = String(it.side);
      if (!Number.isFinite(ts)) continue;
      const key = `${ts}:${side}:${it.priceStart}:${it.priceEnd}:${it.levels}`;
      if (!sweepsRef.current.has(key)) {
        sweepsRef.current.set(key, { ts, side });
        changed = true;
      }
    }
    if (changed) setSweepVersion((v) => v + 1);
  }, [pairId]);

  // setDataLoader getBars: cursor pagination by COUNT (init/forward = older,
  // backward = newer). Each older page is the newest PAGE_SIZE bricks before the
  // oldest loaded bar — sparse XV pages cleanly, no empty-window scanning.
  const getBars = useCallback((d: any) => {
    const chart = chartRef.current;
    const rv = rRef.current;
    if (!chart || !rv) { d.callback([], false); return; }
    const now = Date.now();
    const dl = chart.getDataList();

    // 'backward' = newer bricks (rarely needed; the live WS owns the newest slot).
    if (d.type === 'backward') {
      const last = Number(dl?.[dl.length - 1]?.timestamp);
      if (!Number.isFinite(last) || last >= now) { d.callback([], false); return; }
      setLoading(true);
      fetchXvPage(rv, { startTs: last + 1, endTs: now })
        .then((page) => {
          // klinecharts concats a 'backward' page onto the data list as-is (only
          // the single-bar 'update' path merges by ts), so anything not strictly
          // newer than the last bar would show up as a second candle on the same
          // ts — e.g. the forming brick we already hold from the WS.
          const bars = page.filter((b) => b.timestamp > last);
          mergeBars(bars);
          if (bars.length) { setKlinesVersion((v) => v + 1); }
          d.callback(bars, false);
        })
        .catch((e) => { console.error('xv load failed:', e?.message); d.callback([], false); })
        .finally(() => setLoading(false));
      return;
    }

    // 'init' = latest page; 'forward' = the page strictly older than the oldest
    // loaded bar (ts cursor). A short page means we reached the series start.
    let cursorEnd: number | undefined;
    if (d.type === 'init') {
      cursorEnd = undefined;
    } else {
      const first = Number(dl?.[0]?.timestamp);
      if (!Number.isFinite(first)) { d.callback([], false); return; }
      cursorEnd = first;
    }
    setLoading(true);
    fetchXvPage(rv, { endTs: cursorEnd, limit: PAGE_SIZE })
      .then((bars) => {
        mergeBars(bars);
        if (bars.length) { setKlinesVersion((v) => v + 1); }
        // A full page implies more older bricks remain; a short page is the start.
        // The forming brick the API appends to the newest page is not a stored
        // brick, so it must not inflate the count.
        const more = bars.filter((b) => !b.forming).length >= PAGE_SIZE;
        d.callback(bars, more);
      })
      .catch((e) => { console.error('xv load failed:', e?.message); d.callback([], false); })
      .finally(() => setLoading(false));
  }, [fetchXvPage, mergeBars]);

  // Init chart once.
  useEffect(() => {
    if (!containerRef.current) return;
    registerRangeXvIndicator();
    registerXvDeltaIndicator();
    registerXvLiquidationsIndicator();
    registerXvSweepsIndicator();
    const chart = init(containerRef.current);
    chartRef.current = chart;
    setChart(chart);
    chart?.setStyles({ indicator: { tooltip: { show: false } } } as any);
    // klinecharts only invokes the data loader once symbol+period are set
    // (see StoreImp._processDataLoad). XV is range-based, not time-based, so
    // the period is a placeholder — bars carry their own real timestamps.
    chart?.setSymbol({ ticker: String(pairId), pricePrecision: 5 } as any);
    chart?.setPeriod({ span: 1, type: 'minute' } as any);
    chart?.setDataLoader({
      getBars,
      subscribeBar: (params: any) => { barCallbackRef.current = params.callback; },
      unsubscribeBar: () => { barCallbackRef.current = null; },
    } as any);
    // Adapt to window resize (same as dhm Map).
    const resizeCleanup = resizeChart(chart);
    return () => {
      if (resizeCleanup) resizeCleanup();
      if (containerRef.current) dispose(containerRef.current);
      chartRef.current = null;
      setChart(null);
      setChartReady(false);
      xvIndicatorOnRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when R changes (set in settings).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    allBarsRef.current.clear();
    // Footprints are per (pair, r); drop them so a new R starts clean.
    setClustersByTs({});
    // Liquidations are per pair (R-independent), but the brick buckets change
    // with R, so drop them too and refetch for the new brick range.
    liquidationsRef.current.clear();
    setLiqVersion((v) => v + 1);
    sweepsRef.current.clear();
    setSweepVersion((v) => v + 1);
    chart.setDataLoader({
      getBars,
      subscribeBar: (params: any) => { barCallbackRef.current = params.callback; },
      unsubscribeBar: () => { barCallbackRef.current = null; },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);

  // Live XV bars: subscribe to the bidasks WS for (pairId, r) and feed freshly
  // closed bars into klinecharts via the captured subscribeBar callback.
  useEffect(() => {
    if (!pairId || !r) { return; }
    const wsUrl = getBidasksWebSocketUrl();
    let socket: WebSocket | null = null;
    let cancelled = false;
    let reconnectTimer: number | undefined;

    const connect = () => {
      if (cancelled) { return; }
      try {
        socket = new WebSocket(wsUrl);
      } catch {
        reconnectTimer = window.setTimeout(connect, 3000);
        return;
      }
      socket.onopen = () => {
        socket?.send(JSON.stringify({
          type: 'subscribeXvByPairIdAndR',
          pairId: Number(pairId),
          r: String(r),
        }));
        socket?.send(JSON.stringify({
          type: 'subscribeXvClustersByPairIdAndR',
          pairId: Number(pairId),
          r: String(r),
        }));
        socket?.send(JSON.stringify({
          type: 'subscribeLiquidationsByPairId',
          pairId: Number(pairId),
        }));
        socket?.send(JSON.stringify({
          type: 'subscribeSweepsByPairId',
          pairId: Number(pairId),
        }));
      };
      socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const isFinal = msg.type === 'xv';
          const isForming = msg.type === 'xvForming';
          const isCluster = msg.type === 'xvCluster' || msg.type === 'xvClusterForming';
          const isLiquidation = msg.type === 'liquidations';
          if (isLiquidation && Array.isArray(msg.data)) {
            addLiquidations(msg.data);
            return;
          }
          const isSweep = msg.type === 'sweeps';
          if (isSweep && Array.isArray(msg.data)) {
            addSweeps(msg.data);
            return;
          }
          if ((!isFinal && !isForming && !isCluster) || !Array.isArray(msg.data)) { return; }
          // A footprint carries the same ts as its brick (both fixed when the brick
          // opened), so it keys straight into clustersByTs — no correlation needed.
          if (isCluster) {
            const out = msg.data.filter(
              (it: any) => Number(it.pairId) === Number(pairId) && String(it.r) === String(r),
            );
            mergeClusters(out, (it: any) => String(it.ts));
            return;
          }
          for (const it of msg.data) {
            if (Number(it.pairId) !== Number(pairId) || String(it.r) !== String(r)) { continue; }
            const o = parseFloat(it.open);
            const h = parseFloat(it.high);
            const l = parseFloat(it.low);
            const c = parseFloat(it.close);
            const v = parseFloat(it.volume);
            if (![o, h, l, c].every(Number.isFinite)) { continue; }
            const ts = parseInt(it.ts, 10);
            if (!Number.isFinite(ts)) { continue; }
            // A brick keeps the ts it opened with, so the forming ticks and the
            // final bar share it — klinecharts replaces the bar in place.
            const bar = { timestamp: ts, open: o, high: h, low: l, close: c, volume: v };
            mergeBars([bar]);
            barCallbackRef.current?.(bar);
            // A closed brick can add a new swing → recompute strong levels.
            // Forming ticks don't (they update the same bar), so skip those.
            if (isFinal) { setKlinesVersion((v2) => v2 + 1); }
          }
        } catch {
          /* ignore */
        }
      };
      socket.onclose = () => {
        if (!cancelled) {
          reconnectTimer = window.setTimeout(connect, 3000);
        }
      };
      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [pairId, r, mergeBars, mergeClusters, addLiquidations, addSweeps]);

  // Render mode: OFF = native candles (always render); ON = custom variable-width draw.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    xvConfig.volumeWidth = volumeWidth;
    if (volumeWidth) {
      chart.setStyles({
        candle: {
          bar: {
            upColor: 'rgba(0,0,0,0)', downColor: 'rgba(0,0,0,0)', noChangeColor: 'rgba(0,0,0,0)',
            upBorderColor: 'rgba(0,0,0,0)', downBorderColor: 'rgba(0,0,0,0)', noChangeBorderColor: 'rgba(0,0,0,0)',
            upWickColor: 'rgba(0,0,0,0)', downWickColor: 'rgba(0,0,0,0)', noChangeWickColor: 'rgba(0,0,0,0)',
          },
        },
      } as any);
      if (!xvIndicatorOnRef.current) {
        chart.createIndicator('RANGE_XV', true, { id: 'candle_pane' });
        xvIndicatorOnRef.current = true;
      }
    } else {
      if (xvIndicatorOnRef.current) {
        chart.removeIndicator?.({ paneId: 'candle_pane', name: 'RANGE_XV' });
        xvIndicatorOnRef.current = false;
      }
      chart.setStyles({
        candle: {
          bar: {
            upColor: UP, downColor: DOWN, noChangeColor: '#888888',
            upBorderColor: UP, downBorderColor: DOWN, noChangeBorderColor: '#888888',
            upWickColor: UP, downWickColor: DOWN, noChangeWickColor: '#888888',
          },
        },
      } as any);
    }
  }, [volumeWidth]);

  // RSI in its own sub-pane. Recreated on period change (calcParams), removed
  // when toggled off. Built-in klinecharts 'RSI' indicator — no registration.
  useEffect(() => {
    if (!chart) { return; }
    // removeIndicator takes a FILTER object; a bare string matches every
    // indicator and would wipe the candle-pane bars (RANGE_XV) too.
    chart.removeIndicator?.({ paneId: 'rsi_pane', name: 'RSI' });
    if (showRsi) {
      chart.createIndicator?.(
        { name: 'RSI', calcParams: [rsiPeriod], minValue: 0, maxValue: 100, draw: drawRsiBands },
        false,
        { id: 'rsi_pane' },
      );
    }
  }, [chart, showRsi, rsiPeriod]);

  // Footprint delta sub-pane: create/remove on toggle only. Recreating the
  // indicator on data changes would destroy the pane (and its resized height)
  // and force a full relayout — so data refreshes go through overrideIndicator.
  useEffect(() => {
    if (!chart) { return; }
    if (showDelta) {
      chart.createIndicator?.('XV_DELTA', false, { id: 'xv_delta_pane' });
    } else {
      chart.removeIndicator?.({ paneId: 'xv_delta_pane', name: 'XV_DELTA' });
    }
  }, [chart, showDelta]);

  // Liquidation counts overlay on the candle pane: create/remove on toggle only.
  useEffect(() => {
    if (!chart) { return; }
    if (showLiquidations) {
      chart.createIndicator?.('XV_LIQUIDATIONS', true, { id: 'candle_pane' });
    } else {
      chart.removeIndicator?.({ paneId: 'candle_pane', name: 'XV_LIQUIDATIONS' });
    }
  }, [chart, showLiquidations]);

  // Sweep markers overlay on the candle pane: create/remove on toggle only.
  useEffect(() => {
    if (!chart) { return; }
    if (showSweeps) {
      chart.createIndicator?.('XV_SWEEPS', true, { id: 'candle_pane' });
    } else {
      chart.removeIndicator?.({ paneId: 'candle_pane', name: 'XV_SWEEPS' });
    }
  }, [chart, showSweeps]);

  // Rebuild the per-ts delta map from footprints (cheap, no layout) on every
  // change, but THROTTLE the recompute+relayout: live xvClusterForming ticks
  // arrive continuously, and overrideIndicator triggers a full chart layout —
  // doing that per websocket message is what re-renders the whole chart. The
  // forming-bar redraw (mergeBars) already refreshes the pane between throttles.
  const deltaThrottleRef = useRef<{ last: number; timer: any }>({ last: 0, timer: null });
  useEffect(() => {
    if (!chart || !showDelta) { return; }
    const map: Record<string, number> = {};
    for (const ts in clustersByTs) {
      const data = clustersByTs[ts]?.data;
      if (!data || typeof data !== 'object') { continue; }
      let bid = 0;
      let ask = 0;
      for (const k in data) {
        bid += Number(data[k]?.bv) || 0;
        ask += Number(data[k]?.sv) || 0;
      }
      map[ts] = bid - ask;
    }
    xvDeltaConfig.byTs = map;
    const th = deltaThrottleRef.current;
    const fire = () => {
      th.last = Date.now();
      th.timer = null;
      chart.overrideIndicator?.({ name: 'XV_DELTA' });
    };
    const elapsed = Date.now() - th.last;
    if (elapsed >= 700) {
      fire();
    } else if (th.timer == null) {
      th.timer = setTimeout(fire, 700 - elapsed);
    }
  }, [chart, showDelta, clustersByTs, klinesVersion]);

  // Clear any pending throttled delta recompute on unmount.
  useEffect(() => () => {
    const th = deltaThrottleRef.current;
    if (th.timer != null) { clearTimeout(th.timer); th.timer = null; }
  }, []);

  // The header's R selector drives `r` through the /{pairId}/{r} path segment.
  // When present it wins over the saved value; selecting a different R re-runs
  // this and retriggers the reload effect below.
  useEffect(() => {
    if (rFromUrl != null && rFromUrl !== '') { setR(String(rFromUrl)); }
  }, [rFromUrl]);

  // Restore saved settings on mount / pair change. Setting `r` retriggers the
  // reload effect below, so the chart loads with the persisted range size.
  // Skip restoring `r` when the URL already specifies it.
  useEffect(() => {
    if (typeof window === 'undefined') { return; }
    try {
      // Per-pair R (price-scale specific). Skip when the URL already specifies it.
      if (rFromUrl == null || rFromUrl === '') {
        const savedR = localStorage.getItem(R_STORAGE_KEY);
        if (savedR != null) {
          const parsedR = JSON.parse(savedR);
          setR(parsedR && parsedR.r != null ? String(parsedR.r) : '');
        }
      }
      // Global display/indicator settings (shared across all pairs).
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!saved) { return; }
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        setVolumeWidth(!!parsed.volumeWidth);
        setShowRsi(parsed.showRsi !== false);
        setRsiPeriod(Number(parsed.rsiPeriod) || DEFAULT_RSI.rsiPeriod);
        setShowDelta(!!parsed.showDelta);
        setShowLiquidations(parsed.showLiquidations !== false);
        setShowSweeps(parsed.showSweeps !== false);
        setShowStrongLevels(parsed.showStrongLevels !== false);
        setStrongLevelsLookback(Number(parsed.strongLevelsLookback) || DEFAULT_STRONG_LEVELS.strongLevelsLookback);
        setStrongLevelsTolerance(Number(parsed.strongLevelsTolerance) || DEFAULT_STRONG_LEVELS.strongLevelsTolerance);
        setStrongLevelsMinTouches(Number(parsed.strongLevelsMinTouches) || DEFAULT_STRONG_LEVELS.strongLevelsMinTouches);
        setStrongLevelsMaxCount(Number(parsed.strongLevelsMaxCount) || DEFAULT_STRONG_LEVELS.strongLevelsMaxCount);
        setShowClusters(!!parsed.showClusters);
        setShowClusterSpike(!!parsed.showClusterSpike);
        setClusterSpikeMultiplier(Number(parsed.clusterSpikeMultiplier) || DEFAULT_CLUSTERS.clusterSpikeMultiplier);
        setShowReversal(!!parsed.showReversal);
        setShowImbalance(parsed.showImbalance !== false);
        setImbalanceRatio(Number(parsed.imbalanceRatio) || DEFAULT_IMBALANCE.imbalanceRatio);
        setImbalanceSide(typeof parsed.imbalanceSide === 'string' ? parsed.imbalanceSide : DEFAULT_IMBALANCE.imbalanceSide);
        setShowStacked(!!parsed.showStacked);
        setStackedRunN(Number(parsed.stackedRunN) || DEFAULT_STACKED.stackedRunN);
        setStackedRatioM(Number(parsed.stackedRatioM) || DEFAULT_STACKED.stackedRatioM);
      }
    } catch {}
  }, [SETTINGS_STORAGE_KEY, R_STORAGE_KEY, rFromUrl]);

  // Chart settings is opened from the header's chart-line icon (same as dhm graph).
  useEffect(() => {
    const onOpenChartSettings = () => setOpenChartSettings(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('open-chart-settings-dialog', onOpenChartSettings);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-chart-settings-dialog', onOpenChartSettings);
      }
    };
  }, []);

  // Draw strong levels (S/R) — reuses drawStrongLevels from the dhm graph.
  // Recomputes on settings change and whenever the dataset version bumps.
  useEffect(() => {
    if (!chart) { return; }
    if (!showStrongLevels) {
      chart.removeOverlay({ name: 'strongLevel' });
      return;
    }
    const klines = chart.getDataList();
    if (!klines?.length) { return; }
    drawStrongLevels(chart, klines, {
      lookback: strongLevelsLookback,
      tolerance: strongLevelsTolerance,
      minTouches: strongLevelsMinTouches,
      maxCount: strongLevelsMaxCount,
    });
  }, [
    chart,
    klinesVersion,
    showStrongLevels,
    strongLevelsLookback,
    strongLevelsTolerance,
    strongLevelsMinTouches,
    strongLevelsMaxCount,
  ]);

  // Fetch footprints for the currently loaded brick range whenever the dataset
  // changes or clusters are toggled on. REST footprints share the brick ts, so
  // they key straight into clustersByTs; live updates arrive via the WS stream.
  useEffect(() => {
    if (!chart || !(showClusters || showReversal || showDelta) || !r) { return; }
    const dl = chart.getDataList?.();
    if (!dl?.length) { return; }
    const minTs = Number(dl[0].timestamp);
    const maxTs = Number(dl[dl.length - 1].timestamp);
    if (!Number.isFinite(minTs) || !Number.isFinite(maxTs)) { return; }
    fetchXvClusters(r, minTs, maxTs + 1)
      .then((items) => mergeClusters(items, (it) => String(it.ts)))
      .catch((e) => console.error('xv clusters load failed:', e?.message));
  }, [chart, showClusters, showReversal, showDelta, klinesVersion, r, fetchXvClusters, mergeClusters]);

  // Fetch liquidations for the loaded brick range whenever the dataset changes
  // or the overlay is toggled on. Deduped in addLiquidations, so overlapping
  // refetches (and the live WS) don't double-count.
  useEffect(() => {
    if (!chart || !showLiquidations || !pairId) { return; }
    const dl = chart.getDataList?.();
    if (!dl?.length) { return; }
    const minTs = Number(dl[0].timestamp);
    const maxTs = Number(dl[dl.length - 1].timestamp);
    if (!Number.isFinite(minTs) || !Number.isFinite(maxTs)) { return; }
    fetchLiquidations(minTs, Date.now() + 1)
      .then((items) => addLiquidations(items))
      .catch((e) => console.error('liquidations load failed:', e?.message));
  }, [chart, showLiquidations, klinesVersion, pairId, fetchLiquidations, addLiquidations]);

  // Bucket liquidations into bricks (ts interval [brick.ts, nextBrick.ts)) and
  // push the per-ts counts into xvLiqConfig, then redraw the overlay. Runs on new
  // liquidations or a changed brick set; the draw itself follows zoom/scroll.
  useEffect(() => {
    if (!chart || !showLiquidations) { return; }
    const dl = chart.getDataList?.();
    const byTs: Record<string, { up: number; down: number }> = {};
    if (dl?.length) {
      // Brick open timestamps, ascending — binary-search each liquidation into
      // the brick whose interval contains it (last brick catches the tail).
      const times = dl.map((b: any) => Number(b.timestamp));
      for (const { ts, position } of liquidationsRef.current.values()) {
        if (ts < times[0]) { continue; }
        let lo = 0;
        let hi = times.length - 1;
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          if (times[mid] <= ts) { lo = mid; } else { hi = mid - 1; }
        }
        const key = String(times[lo]);
        const bucket = byTs[key] ?? (byTs[key] = { up: 0, down: 0 });
        if (position === 'down') { bucket.down += 1; } else { bucket.up += 1; }
      }
    }
    xvLiqConfig.byTs = byTs;
    chart.overrideIndicator?.({ name: 'XV_LIQUIDATIONS' });
  }, [chart, showLiquidations, liqVersion, klinesVersion]);

  // Fetch sweeps for the loaded brick range (deduped in addSweeps).
  useEffect(() => {
    if (!chart || !showSweeps || !pairId) { return; }
    const dl = chart.getDataList?.();
    if (!dl?.length) { return; }
    const minTs = Number(dl[0].timestamp);
    if (!Number.isFinite(minTs)) { return; }
    fetchSweeps(minTs, Date.now() + 1)
      .then((items) => addSweeps(items))
      .catch((e) => console.error('sweeps load failed:', e?.message));
  }, [chart, showSweeps, klinesVersion, pairId, fetchSweeps, addSweeps]);

  // Bucket sweeps into bricks (same [brick.ts, nextBrick.ts) logic as liquidations)
  // and push per-ts counts into xvSweepConfig, then redraw the overlay.
  useEffect(() => {
    if (!chart || !showSweeps) { return; }
    const dl = chart.getDataList?.();
    const byTs: Record<string, { up: number; down: number }> = {};
    if (dl?.length) {
      const times = dl.map((b: any) => Number(b.timestamp));
      for (const { ts, side } of sweepsRef.current.values()) {
        if (ts < times[0]) { continue; }
        let lo = 0;
        let hi = times.length - 1;
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          if (times[mid] <= ts) { lo = mid; } else { hi = mid - 1; }
        }
        const key = String(times[lo]);
        const bucket = byTs[key] ?? (byTs[key] = { up: 0, down: 0 });
        if (side === 'sell') { bucket.down += 1; } else { bucket.up += 1; }
      }
    }
    xvSweepConfig.byTs = byTs;
    chart.overrideIndicator?.({ name: 'XV_SWEEPS' });
  }, [chart, showSweeps, sweepVersion, klinesVersion]);

  // Cluster overlays are per visible candle, so redraw on zoom/scroll too.
  useEffect(() => {
    if (!chart) { return; }
    const bump = () => setClustersTick((t) => t + 1);
    chart.subscribeAction?.('onZoom', bump);
    chart.subscribeAction?.('onScroll', bump);
    return () => {
      chart.unsubscribeAction?.('onZoom', bump);
      chart.unsubscribeAction?.('onScroll', bump);
    };
  }, [chart]);

  // Draw cluster footprints — reuses drawClusterKlinesForVisible from the dhm graph.
  useEffect(() => {
    if (!chart) { return; }
    if (!showClusters) {
      chart.removeOverlay({ name: 'clusterKline' });
      return;
    }
    drawClusterKlinesForVisible(chart, clustersByTs, {
      showSpike: showClusterSpike,
      spikeMultiplier: clusterSpikeMultiplier,
    });
  }, [
    chart,
    clustersByTs,
    clustersTick,
    klinesVersion,
    showClusters,
    showClusterSpike,
    clusterSpikeMultiplier,
  ]);

  // Highlight reversal bricks passing the enabled footprint sub-filters
  // (bid/ask imbalance and/or stacked imbalance), under the master toggle.
  useEffect(() => {
    if (!chart) { return; }
    if (!showReversal) {
      chart.removeOverlay({ name: 'xvImbalanceMark' });
      return;
    }
    drawXvReversalHighlight(chart, clustersByTs, {
      imbalanceEnabled: showImbalance,
      imbalanceRatio,
      imbalanceSide,
      stackedEnabled: showStacked,
      stackedRunN,
      stackedRatioM,
    });
  }, [
    chart,
    clustersByTs,
    clustersTick,
    klinesVersion,
    showReversal,
    showImbalance,
    imbalanceRatio,
    imbalanceSide,
    showStacked,
    stackedRunN,
    stackedRatioM,
  ]);

  const onSaveChartSettings = useCallback((values: any) => {
    const nextVolumeWidth = !!values.volumeWidth;
    const nextShowRsi = !!values.showRsi;
    const nextRsiPeriod = Number(values.rsiPeriod) || DEFAULT_RSI.rsiPeriod;
    const nextShowDelta = !!values.showDelta;
    const nextShowLiquidations = values.showLiquidations !== false;
    const nextShowSweeps = values.showSweeps !== false;
    const nextR = values.r != null ? String(values.r) : '';
    const nextShowStrongLevels = values.showStrongLevels !== false;
    const nextLookback = Number(values.strongLevelsLookback) || DEFAULT_STRONG_LEVELS.strongLevelsLookback;
    const nextTolerance = Number(values.strongLevelsTolerance) || DEFAULT_STRONG_LEVELS.strongLevelsTolerance;
    const nextMinTouches = Number(values.strongLevelsMinTouches) || DEFAULT_STRONG_LEVELS.strongLevelsMinTouches;
    const nextMaxCount = Number(values.strongLevelsMaxCount) || DEFAULT_STRONG_LEVELS.strongLevelsMaxCount;
    const nextShowClusters = !!values.showClusters;
    const nextShowClusterSpike = !!values.showClusterSpike;
    const nextClusterSpikeMultiplier = Number(values.clusterSpikeMultiplier) || DEFAULT_CLUSTERS.clusterSpikeMultiplier;
    const nextShowReversal = !!values.showReversal;
    const nextShowImbalance = values.showImbalance !== false;
    const nextImbalanceRatio = Number(values.imbalanceRatio) || DEFAULT_IMBALANCE.imbalanceRatio;
    const nextImbalanceSide = typeof values.imbalanceSide === 'string' ? values.imbalanceSide : DEFAULT_IMBALANCE.imbalanceSide;
    const nextShowStacked = !!values.showStacked;
    const nextStackedRunN = Number(values.stackedRunN) || DEFAULT_STACKED.stackedRunN;
    const nextStackedRatioM = Number(values.stackedRatioM) || DEFAULT_STACKED.stackedRatioM;
    setVolumeWidth(nextVolumeWidth);
    setShowRsi(nextShowRsi);
    setRsiPeriod(nextRsiPeriod);
    setShowDelta(nextShowDelta);
    setShowLiquidations(nextShowLiquidations);
    setShowSweeps(nextShowSweeps);
    setR(nextR);
    setShowStrongLevels(nextShowStrongLevels);
    setStrongLevelsLookback(nextLookback);
    setStrongLevelsTolerance(nextTolerance);
    setStrongLevelsMinTouches(nextMinTouches);
    setStrongLevelsMaxCount(nextMaxCount);
    setShowClusters(nextShowClusters);
    setShowClusterSpike(nextShowClusterSpike);
    setClusterSpikeMultiplier(nextClusterSpikeMultiplier);
    setShowReversal(nextShowReversal);
    setShowImbalance(nextShowImbalance);
    setImbalanceRatio(nextImbalanceRatio);
    setImbalanceSide(nextImbalanceSide);
    setShowStacked(nextShowStacked);
    setStackedRunN(nextStackedRunN);
    setStackedRatioM(nextStackedRatioM);
    setOpenChartSettings(false);
    if (typeof window !== 'undefined') {
      try {
        // R is per-pair (price-scale specific).
        localStorage.setItem(R_STORAGE_KEY, JSON.stringify({ r: nextR }));
        // Everything else is shared across all pairs (global key).
        localStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify({
            volumeWidth: nextVolumeWidth,
            showRsi: nextShowRsi,
            showDelta: nextShowDelta,
            showLiquidations: nextShowLiquidations,
            showSweeps: nextShowSweeps,
            rsiPeriod: nextRsiPeriod,
            showStrongLevels: nextShowStrongLevels,
            strongLevelsLookback: nextLookback,
            strongLevelsTolerance: nextTolerance,
            strongLevelsMinTouches: nextMinTouches,
            strongLevelsMaxCount: nextMaxCount,
            showClusters: nextShowClusters,
            showClusterSpike: nextShowClusterSpike,
            clusterSpikeMultiplier: nextClusterSpikeMultiplier,
            showReversal: nextShowReversal,
            showImbalance: nextShowImbalance,
            imbalanceRatio: nextImbalanceRatio,
            imbalanceSide: nextImbalanceSide,
            showStacked: nextShowStacked,
            stackedRunN: nextStackedRunN,
            stackedRatioM: nextStackedRatioM,
          }),
        );
      } catch {}
    }
  }, [SETTINGS_STORAGE_KEY, R_STORAGE_KEY]);

  // Restore saved backtest settings (per pair).
  useEffect(() => {
    if (typeof window === 'undefined') { return; }
    try {
      const saved = localStorage.getItem(BACKTEST_STORAGE_KEY);
      if (saved) { setBacktestDefaults({ ...DEFAULT_XV_BACKTEST_VALUES, ...JSON.parse(saved) }); }
    } catch {}
  }, [BACKTEST_STORAGE_KEY]);

  // Resize the bottom Test drawer by dragging its handle.
  const onDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;
    const onMove = (ev: MouseEvent) => {
      if (dragStartY.current === null) { return; }
      const delta = dragStartY.current - ev.clientY;
      setPanelHeight(Math.max(160, Math.min(window.innerHeight * 0.85, dragStartHeight.current + delta)));
    };
    const onUp = () => {
      dragStartY.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelHeight]);

  // Run the reversal backtest over the (pair, r) XV series.
  const onRunTestSubmit = useCallback(async (values: any) => {
    if (!r) { return; }
    try { localStorage.setItem(BACKTEST_STORAGE_KEY, JSON.stringify(values)); } catch {}
    setIsRunningTest(true);
    try {
      const trades = await runXvBacktestForUI({
        pairId: Number(pairId),
        r: String(r),
        startTs: Number(values.startTs),
        finishTs: values.finishTs ? Number(values.finishTs) : null,
        settings: {
          aVolumeMax: Number(values.aVolumeMax),
          aMaxWickBodyPct: Number(values.aMaxWickBodyPct),
          bVolumeMin: Number(values.bVolumeMin),
          minTrendCandles: Number(values.minTrendCandles),
          riskReward: Number(values.riskReward),
          breakEvenAfterBars: Number(values.breakEvenAfterBars),
          entryFeePct: Number(values.entryFeePct),
          exitFeePct: Number(values.exitFeePct),
          positionSize: Number(values.positionSize),
          direction: values.direction || '',
          maxBarsToHold: Number(values.maxBarsToHold),
        },
        klinesApiBase: KLINES_API_BASE,
      });
      setTestSessions(trades);
      setTestSessionsTab('all');
    } catch (e: any) {
      console.error('xv backtest failed:', e?.message);
    } finally {
      setIsRunningTest(false);
    }
  }, [pairId, r, BACKTEST_STORAGE_KEY]);

  // Draw entry markers for the (filtered) backtest trades on the chart.
  useEffect(() => {
    if (!chart) { return; }
    chart.removeOverlay({ name: 'testDhmUp' });
    chart.removeOverlay({ name: 'testDhmDown' });
    if (!isTestPanelOpen || !testSessions.length) { return; }
    const visible = testSessionsTab === 'all'
      ? testSessions
      : testSessions.filter((t) => t.status === testSessionsTab);
    for (const t of visible) {
      const k = t.data?.kline1;
      if (!k) { continue; }
      const anchor = t.direction === 'up' ? k.low : k.high;
      chart.createOverlay({
        name: t.direction === 'up' ? 'testDhmUp' : 'testDhmDown',
        extendData: { ts: k.ts, tf: r, status: t.status },
        points: [{ timestamp: Number(k.ts), value: Number(anchor) }],
      });
    }
  }, [chart, r, isTestPanelOpen, testSessions, testSessionsTab]);

  // Derived backtest stats for the results panel.
  const wins = testSessions.filter((t) => t.status === 'finished').length;
  const losses = testSessions.filter((t) => t.status === 'finished_by_lose').length;
  const breakEvens = testSessions.filter((t) => t.status === 'finished_by_be').length;
  const winRate = wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0;
  // ΣR / Σ$ use the realised, fee-net PnL per trade (null while unresolved).
  const totalR = testSessions.reduce(
    (a, t) => a + (Number.isFinite(t.pnlR) ? Number(t.pnlR) : 0),
    0,
  );
  const totalUsd = testSessions.reduce(
    (a, t) => a + (Number.isFinite(t.pnlUsd) ? Number(t.pnlUsd) : 0),
    0,
  );
  const uniqueStatuses = Array.from(new Set(testSessions.map((t) => t.status)));
  const visibleSessions = testSessionsTab === 'all'
    ? testSessions
    : testSessions.filter((t) => t.status === testSessionsTab);

  return (
    <main style={{ position: 'relative' }}>
      <Box ref={containerRef} sx={{ width: '100%' }} />

      <MapTools
        chart={chart}
        pairId={pairId}
        showDrawingElements
        chartReady={chartReady}
        onDrawingInteractionChange={onDrawingInteractionChange}
      />

      <CustomDialog
        open={openChartSettings}
        onClose={() => setOpenChartSettings(false)}
        title="Chart settings"
        actions={null}
        maxWidth="sm"
        content={(
          <RangeXvSettingsForm
            defaultValues={{
              r,
              volumeWidth,
              showRsi,
              rsiPeriod,
              showDelta,
              showLiquidations,
              showSweeps,
              showStrongLevels,
              strongLevelsLookback,
              strongLevelsTolerance,
              strongLevelsMinTouches,
              strongLevelsMaxCount,
              showClusters,
              showClusterSpike,
              clusterSpikeMultiplier,
              showReversal,
              showImbalance,
              imbalanceRatio,
              imbalanceSide,
              showStacked,
              stackedRunN,
              stackedRatioM,
            }}
            onSubmit={onSaveChartSettings}
          />
        )}
      />

      {!isTestPanelOpen && (
        <Button
          variant="contained"
          size="small"
          onClick={() => setIsTestPanelOpen(true)}
          sx={{
            position: 'fixed',
            zIndex: 2,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            minWidth: 80,
            px: 2,
          }}
        >
          Test
        </Button>
      )}

      <Drawer
        variant="persistent"
        anchor="bottom"
        open={isTestPanelOpen}
        sx={{
          '& .MuiDrawer-paper': {
            height: panelHeight,
            left: 0,
            right: 0,
            marginLeft: 'auto',
            marginRight: 'auto',
            maxWidth: 'lg',
            p: 2,
            pt: 0,
            borderTop: `1px solid ${theme.palette.divider}`,
            borderLeft: `1px solid ${theme.palette.divider}`,
            borderRight: `1px solid ${theme.palette.divider}`,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <Box
          onMouseDown={onDragHandleMouseDown}
          sx={{ height: 20, cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mb: 0.5, userSelect: 'none' }}
        >
          <Box sx={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.palette.divider }} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexShrink: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Test — разворотная стратегия (R: {r || '—'})
          </Typography>
          <Button size="small" onClick={() => setIsTestPanelOpen(false)}>Скрыть</Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>
          {/* left: settings form */}
          <Box sx={{ width: 320, flexShrink: 0, overflowY: 'auto', pr: 1 }}>
            <XvBacktestForm
              defaultValues={backtestDefaults}
              onSubmit={onRunTestSubmit}
              isRunning={isRunningTest}
            />
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* right: positions */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1, flexShrink: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                Позиции ({testSessions.length})
              </Typography>
              <Chip size="small" color="success" variant="outlined" label={`Тейк: ${wins}`} />
              <Chip size="small" color="error" variant="outlined" label={`Стоп: ${losses}`} />
              <Chip size="small" color="default" variant="outlined" label={`Безубыток: ${breakEvens}`} />
              <Chip size="small" variant="outlined" label={`Winrate: ${winRate}%`} />
              <Chip
                size="small"
                color={totalR >= 0 ? 'success' : 'error'}
                variant="outlined"
                label={`Σ R: ${totalR.toFixed(2)}`}
              />
              <Chip
                size="small"
                color={totalUsd >= 0 ? 'success' : 'error'}
                variant="outlined"
                label={`Σ $: ${totalUsd.toFixed(2)}`}
              />
            </Box>

            <Tabs
              value={testSessionsTab}
              onChange={(_, v) => setTestSessionsTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ minHeight: 32, mb: 0.5, flexShrink: 0 }}
            >
              <Tab label={`Все (${testSessions.length})`} value="all" sx={{ minHeight: 32, py: 0, fontSize: 12 }} />
              {uniqueStatuses.map((status) => (
                <Tab
                  key={status}
                  value={status}
                  sx={{ minHeight: 32, py: 0, fontSize: 12 }}
                  label={`${XV_STATUS_LABEL[status] ?? status} (${testSessions.filter((t) => t.status === status).length})`}
                />
              ))}
            </Tabs>

            <Box sx={{ overflowY: 'auto', flex: 1 }}>
              {visibleSessions.map((t) => (
                <Box
                  key={t.id}
                  onClick={() => chart?.scrollToTimestamp?.(Number(t.startTs))}
                  sx={{
                    px: 1, py: 0.75,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: theme.palette.action.hover },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: t.direction === 'up' ? '#4caf50' : '#f44336' }} />
                    <Typography variant="caption" sx={{ color: theme.palette.text.disabled, minWidth: 28 }}>#{t.id}</Typography>
                    <Chip size="small" color={xvStatusColor(t.status)} variant="outlined" label={XV_STATUS_LABEL[t.status] ?? t.status} sx={{ fontSize: 11 }} />
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      {t.direction === 'up' ? 'Long' : 'Short'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>R:R {Number(t.rr).toFixed(1)}</Typography>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>{moment(Number(t.startTs)).format('MM-DD HH:mm')}</Typography>
                  </Box>
                </Box>
              ))}
              {testSessions.length === 0 && (
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, py: 2 }}>
                  Нет позиций. Настройте параметры слева и запустите тест.
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Drawer>
    </main>
  );
}

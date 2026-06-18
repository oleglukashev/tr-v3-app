'use client'

import { useCallback, useEffect, useRef, useState } from "react";
import { init, dispose, registerIndicator, registerOverlay } from "klinecharts";
import { Box } from "@mui/material";
import CustomDialog from "src/components/custom-dialog/custom-dialog";
import { resizeChart, strongLevel, clusterKline } from "@/src/helpers/klinecharts.helper";
import { drawStrongLevels, drawClusterKlinesForVisible } from "@/src/utils/klinecharts";
import { RangeXvSettingsForm } from "@/src/sections/range-xv-graph/range-xv-settings-form";
import { getBidasksWebSocketUrl } from "@/src/utils/bidasksWebSocket";
import MapTools from "@/src/components/map-tools/map-tools";
import { useMapDrawingOverlayRef } from "@/src/components/map-tools/use-map-drawing-overlay-ref";

// Strong levels (S/R) + cluster footprint overlays — reused as-is from the dhm graph.
registerOverlay(strongLevel);
registerOverlay(clusterKline());

// Cluster (volume-by-price footprint) defaults, mirroring the dhm graph.
const DEFAULT_CLUSTERS = {
  showClusters: false,
  showClusterSpike: false,
  clusterSpikeMultiplier: 3,
};

function xvClusterHasLevels(it: any): boolean {
  const d = it?.data;
  return d != null && typeof d === 'object' && Object.keys(d).length > 0;
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
const WINDOW_MS = 30 * 24 * 3600 * 1000; // ts window per page (XV is sparse)
// A single empty window does NOT mean history ended (sparse XV has brick-less
// gaps). Keep walking older windows until bricks appear or this much empty span
// has been crossed — only then is it genuinely the start of the series.
const MAX_EMPTY_WALK_MS = 180 * 24 * 3600 * 1000;
const UP = '#26a69a';
const DOWN = '#ef5350';

// Mutable config read by the (globally registered) custom indicator draw.
const xvConfig = { volumeWidth: false, volP5: 0, volP95: 1 };

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

export default function RangeXvGraphView({ pairId, r: rFromUrl }: any) {
  // Persist chart settings per pair (R is price-scale specific to each pair),
  // mirroring how the dhm graph stores its global settings in localStorage.
  const SETTINGS_STORAGE_KEY = `rangeXvGraphSettings_${pairId}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const xvIndicatorOnRef = useRef<boolean>(false);
  const allBarsRef = useRef<Map<number, any>>(new Map());
  // klinecharts feeds realtime bars only through the data loader's subscribeBar
  // callback (there's no public updateData in v10). We capture it here and push
  // bars from our own XV websocket into it.
  const barCallbackRef = useRef<((bar: any) => void) | null>(null);
  // Display ts of the last *finalized* live brick. The forming brick is shown one
  // slot ahead (lastFinalTs + 1); on close it replaces that slot and we advance.
  // klinecharts spaces bars by index, so using +1 sequential ts keeps the live
  // brick updating in place (replace on equal ts) without disturbing layout.
  const lastFinalTsRef = useRef<number>(0);

  const [r, setR] = useState<string>('');           // range size R, set in settings
  const rRef = useRef<string>('');
  rRef.current = r;

  const [volumeWidth, setVolumeWidth] = useState<boolean>(false);
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
  // Footprint per brick, keyed by the *bar timestamp* the chart uses (real ts for
  // REST bricks, synthetic slot ts for live WS bricks). Redraw is index-based via
  // drawClusterKlinesForVisible, so this key matches each visible candle.
  const [clustersByTs, setClustersByTs] = useState<Record<string, any>>({});
  const [clustersTick, setClustersTick] = useState<number>(0);
  // Live WS delivers brick and footprint as separate messages; correlate them by
  // the brick's position so the footprint lands on the same slot ts as its bar.
  const slotByPositionRef = useRef<Record<number, number>>({});

  // MapTools needs the chart as a reactive value (the ref above does not re-render),
  // plus a "first bars loaded" gate before it creates/restores drawing overlays.
  const [chart, setChart] = useState<any>(null);
  const [chartReady, setChartReady] = useState<boolean>(false);
  const { onDrawingInteractionChange } = useMapDrawingOverlayRef();

  const fetchXv = useCallback(async (r: string, startTs: number, endTs: number) => {
    const url = `${KLINES_API_BASE}/klines?type=xv&pairId=${pairId}&r=${r}&startTs=${startTs}&endTs=${endTs}`;
    const res = await fetch(url);
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

  // setDataLoader getBars: paginated XV by ts window (init / forward=older / backward=newer).
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
      const startTs = last + 1;
      const endTs = Math.min(last + WINDOW_MS, now);
      setLoading(true);
      fetchXv(rv, startTs, endTs)
        .then((bars) => {
          mergeBars(bars);
          for (const b of bars) {
            if (b.timestamp > lastFinalTsRef.current) { lastFinalTsRef.current = b.timestamp; }
          }
          if (bars.length) { setKlinesVersion((v) => v + 1); }
          d.callback(bars, bars.length > 0);
        })
        .catch((e) => { console.error('xv load failed:', e?.message); d.callback([], false); })
        .finally(() => setLoading(false));
      return;
    }

    // 'init' and 'forward' both load *older* bricks ending at a cursor. XV is sparse,
    // so a single empty window does not mean history ended — walk back window-by-window
    // until bricks appear or the empty-walk floor is crossed (then there is no more).
    let cursorEnd: number;
    if (d.type === 'init') {
      cursorEnd = now;
    } else {
      const first = Number(dl?.[0]?.timestamp);
      if (!Number.isFinite(first)) { d.callback([], false); return; }
      cursorEnd = first;
    }
    const floor = cursorEnd - MAX_EMPTY_WALK_MS;
    setLoading(true);
    (async () => {
      let bars: any[] = [];
      let end = cursorEnd;
      while (end > floor) {
        const start = end - WINDOW_MS;
        const page = await fetchXv(rv, start, end);
        if (page.length) { bars = page; break; }
        end = start;
      }
      mergeBars(bars);
      if (bars.length) { setKlinesVersion((v) => v + 1); }
      // Anchor the live-brick slot to the newest loaded bar.
      let newest: any = null;
      for (const b of bars) {
        if (b.timestamp > lastFinalTsRef.current) { lastFinalTsRef.current = b.timestamp; }
        if (!newest || b.timestamp > newest.timestamp) { newest = b; }
      }
      // More older data is likely whenever this page found bricks; only the
      // floor-crossing empty walk reports the genuine start (more=false).
      const more = bars.length > 0;
      // REST only has *closed* bricks; the current forming brick is WS-only and
      // may lag until the next tick. Seed a flat placeholder at the forming slot
      // (lastFinal + 1) from the newest close so a "current" bar shows immediately.
      // The WS forming/final update reuses the same slot and replaces it in place.
      if (d.type === 'init' && newest) {
        const seed = {
          timestamp: lastFinalTsRef.current + 1,
          open: newest.close, high: newest.close, low: newest.close, close: newest.close,
          volume: 0,
        };
        d.callback([...bars, seed], more);
        return;
      }
      d.callback(bars, more);
    })()
      .catch((e) => { console.error('xv load failed:', e?.message); d.callback([], false); })
      .finally(() => setLoading(false));
  }, [fetchXv, mergeBars]);

  // Init chart once.
  useEffect(() => {
    if (!containerRef.current) return;
    registerRangeXvIndicator();
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
    lastFinalTsRef.current = 0;
    // Footprints are per (pair, r); drop them so a new R starts clean.
    setClustersByTs({});
    slotByPositionRef.current = {};
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
      };
      socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const isFinal = msg.type === 'xv';
          const isForming = msg.type === 'xvForming';
          const isCluster = msg.type === 'xvCluster' || msg.type === 'xvClusterForming';
          if ((!isFinal && !isForming && !isCluster) || !Array.isArray(msg.data)) { return; }
          // Footprints arrive after their brick (backend emits brick then cluster),
          // so the position→slot map is already set; key the footprint to that slot.
          if (isCluster) {
            const out: any[] = [];
            for (const it of msg.data) {
              if (Number(it.pairId) !== Number(pairId) || String(it.r) !== String(r)) { continue; }
              const slot = slotByPositionRef.current[Number(it.position)];
              if (slot == null) { continue; }
              out.push({ data: it.data, ts: String(slot) });
            }
            mergeClusters(out, (it) => it.ts);
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
            // Anchor the live slot to real time on the first bar if no history loaded.
            if (lastFinalTsRef.current <= 0) {
              const realTs = parseInt(it.ts, 10);
              lastFinalTsRef.current = Number.isFinite(realTs) && realTs > 0 ? realTs : 1;
            }
            // Forming brick sits in the next slot; the final brick replaces that
            // same slot (equal ts → klinecharts replaces in place) and advances.
            const slotTs = lastFinalTsRef.current + 1;
            const bar = { timestamp: slotTs, open: o, high: h, low: l, close: c, volume: v };
            mergeBars([bar]);
            barCallbackRef.current?.(bar);
            // Correlate this brick's position with its slot ts so the matching
            // footprint (separate xvCluster* message) lands on the same bar.
            const pos = Number(it.position);
            if (Number.isFinite(pos)) { slotByPositionRef.current[pos] = slotTs; }
            // A closed brick can add a new swing → recompute strong levels.
            // Forming ticks don't (they reuse the same slot), so skip those.
            if (isFinal) { lastFinalTsRef.current = slotTs; setKlinesVersion((v2) => v2 + 1); }
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
  }, [pairId, r, mergeBars, mergeClusters]);

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
        chart.removeIndicator?.('candle_pane', 'RANGE_XV');
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
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!saved) { return; }
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        if (rFromUrl == null || rFromUrl === '') {
          setR(parsed.r != null ? String(parsed.r) : '');
        }
        setVolumeWidth(!!parsed.volumeWidth);
        setShowStrongLevels(parsed.showStrongLevels !== false);
        setStrongLevelsLookback(Number(parsed.strongLevelsLookback) || DEFAULT_STRONG_LEVELS.strongLevelsLookback);
        setStrongLevelsTolerance(Number(parsed.strongLevelsTolerance) || DEFAULT_STRONG_LEVELS.strongLevelsTolerance);
        setStrongLevelsMinTouches(Number(parsed.strongLevelsMinTouches) || DEFAULT_STRONG_LEVELS.strongLevelsMinTouches);
        setStrongLevelsMaxCount(Number(parsed.strongLevelsMaxCount) || DEFAULT_STRONG_LEVELS.strongLevelsMaxCount);
        setShowClusters(!!parsed.showClusters);
        setShowClusterSpike(!!parsed.showClusterSpike);
        setClusterSpikeMultiplier(Number(parsed.clusterSpikeMultiplier) || DEFAULT_CLUSTERS.clusterSpikeMultiplier);
      }
    } catch {}
  }, [SETTINGS_STORAGE_KEY, rFromUrl]);

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
    if (!chart || !showClusters || !r) { return; }
    const dl = chart.getDataList?.();
    if (!dl?.length) { return; }
    const minTs = Number(dl[0].timestamp);
    const maxTs = Number(dl[dl.length - 1].timestamp);
    if (!Number.isFinite(minTs) || !Number.isFinite(maxTs)) { return; }
    fetchXvClusters(r, minTs, maxTs + 1)
      .then((items) => mergeClusters(items, (it) => String(it.ts)))
      .catch((e) => console.error('xv clusters load failed:', e?.message));
  }, [chart, showClusters, klinesVersion, r, fetchXvClusters, mergeClusters]);

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

  const onSaveChartSettings = useCallback((values: any) => {
    const nextVolumeWidth = !!values.volumeWidth;
    const nextR = values.r != null ? String(values.r) : '';
    const nextShowStrongLevels = values.showStrongLevels !== false;
    const nextLookback = Number(values.strongLevelsLookback) || DEFAULT_STRONG_LEVELS.strongLevelsLookback;
    const nextTolerance = Number(values.strongLevelsTolerance) || DEFAULT_STRONG_LEVELS.strongLevelsTolerance;
    const nextMinTouches = Number(values.strongLevelsMinTouches) || DEFAULT_STRONG_LEVELS.strongLevelsMinTouches;
    const nextMaxCount = Number(values.strongLevelsMaxCount) || DEFAULT_STRONG_LEVELS.strongLevelsMaxCount;
    const nextShowClusters = !!values.showClusters;
    const nextShowClusterSpike = !!values.showClusterSpike;
    const nextClusterSpikeMultiplier = Number(values.clusterSpikeMultiplier) || DEFAULT_CLUSTERS.clusterSpikeMultiplier;
    setVolumeWidth(nextVolumeWidth);
    setR(nextR);
    setShowStrongLevels(nextShowStrongLevels);
    setStrongLevelsLookback(nextLookback);
    setStrongLevelsTolerance(nextTolerance);
    setStrongLevelsMinTouches(nextMinTouches);
    setStrongLevelsMaxCount(nextMaxCount);
    setShowClusters(nextShowClusters);
    setShowClusterSpike(nextShowClusterSpike);
    setClusterSpikeMultiplier(nextClusterSpikeMultiplier);
    setOpenChartSettings(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify({
            r: nextR,
            volumeWidth: nextVolumeWidth,
            showStrongLevels: nextShowStrongLevels,
            strongLevelsLookback: nextLookback,
            strongLevelsTolerance: nextTolerance,
            strongLevelsMinTouches: nextMinTouches,
            strongLevelsMaxCount: nextMaxCount,
            showClusters: nextShowClusters,
            showClusterSpike: nextShowClusterSpike,
            clusterSpikeMultiplier: nextClusterSpikeMultiplier,
          }),
        );
      } catch {}
    }
  }, [SETTINGS_STORAGE_KEY]);

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
              showStrongLevels,
              strongLevelsLookback,
              strongLevelsTolerance,
              strongLevelsMinTouches,
              strongLevelsMaxCount,
              showClusters,
              showClusterSpike,
              clusterSpikeMultiplier,
            }}
            onSubmit={onSaveChartSettings}
          />
        )}
      />
    </main>
  );
}

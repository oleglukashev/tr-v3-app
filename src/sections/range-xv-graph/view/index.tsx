'use client'

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { init, dispose, registerIndicator } from "klinecharts";
import { Box } from "@mui/material";
import CustomDialog from "src/components/custom-dialog/custom-dialog";
import { resizeChart } from "@/src/helpers/klinecharts.helper";
import { RangeXvSettingsForm } from "@/src/sections/range-xv-graph/range-xv-settings-form";
import { getBidasksWebSocketUrl } from "@/src/utils/bidasksWebSocket";
import MapTools from "@/src/components/map-tools/map-tools";
import { useMapDrawingOverlayRef } from "@/src/components/map-tools/use-map-drawing-overlay-ref";

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

export default function RangeXvGraphView({ pairId }: any) {
  // Persist chart settings per pair (R is price-scale specific to each pair),
  // mirroring how the dhm graph stores its global settings in localStorage.
  const SETTINGS_STORAGE_KEY = `rangeXvGraphSettings_${pairId}`;
  const searchParams = useSearchParams();
  const rFromUrl = searchParams.get('r');
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
      };
      socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const isFinal = msg.type === 'xv';
          const isForming = msg.type === 'xvForming';
          if ((!isFinal && !isForming) || !Array.isArray(msg.data)) { return; }
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
            if (isFinal) { lastFinalTsRef.current = slotTs; }
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
  }, [pairId, r, mergeBars]);

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

  // The header's R selector drives `r` through the ?r= query param. When present
  // it wins over the saved value; selecting a different R re-runs this and
  // retriggers the reload effect below.
  useEffect(() => {
    if (rFromUrl != null && rFromUrl !== '') { setR(rFromUrl); }
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

  const onSaveChartSettings = useCallback((values: any) => {
    const nextVolumeWidth = !!values.volumeWidth;
    const nextR = values.r != null ? String(values.r) : '';
    setVolumeWidth(nextVolumeWidth);
    setR(nextR);
    setOpenChartSettings(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify({ r: nextR, volumeWidth: nextVolumeWidth }),
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
            defaultValues={{ r, volumeWidth }}
            onSubmit={onSaveChartSettings}
          />
        )}
      />
    </main>
  );
}

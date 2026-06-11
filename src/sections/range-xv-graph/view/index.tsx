'use client'

import { useCallback, useEffect, useRef, useState } from "react";
import { init, dispose, registerIndicator } from "klinecharts";
import {
  Box, Stack, TextField, Switch, FormControlLabel, IconButton, Button, Typography, CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useRouter } from "next/navigation";
import { getBidasksWebSocketUrl } from "@/src/utils/bidasksWebSocket";

// Our 1s klines API lives on the bidasks service (NEXT_PUBLIC_TR_CLUSTERS_DOMAIN).
// interval convention: tf = -1 means 1-second candles.
const KLINES_API_BASE =
  (process.env.NEXT_PUBLIC_TR_CLUSTERS_DOMAIN as string) || 'http://bidasks.traken-trade.ru/api/v1';
const SECOND_TF = -1;

// Mutable config read by the (globally registered) custom indicator draw.
const xvConfig = { volumeWidth: true, volP5: 0, volP95: 1 };

const UP = '#26a69a';
const DOWN = '#ef5350';

function trimNum(n: number): string {
  return Number(n.toFixed(8)).toString();
}

function pct(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.max(0, Math.min(s.length - 1, Math.floor((p / 100) * (s.length - 1))))];
}

// Pick a sensible default R for the instrument's price scale, so a chart isn't
// blank (e.g. R=100 is fine for BTC but absurd for KAS ~0.01). ~25x the median
// 1s range, rounded to a tidy value.
function computeDefaultR(klines: any[]): number {
  if (!klines.length) return 100;
  const ranges = klines
    .map((k) => Number(k.high) - Number(k.low))
    .filter((x) => x > 0)
    .sort((a, b) => a - b);
  let r = ranges.length ? ranges[Math.floor(ranges.length / 2)] * 25 : 0;
  if (!(r > 0)) {
    const px = Number(klines[klines.length - 1]?.close) || 0;
    r = px * 0.0015;
  }
  if (!(r > 0)) return 100;
  const mag = Math.pow(10, Math.floor(Math.log10(r)));
  return Math.max(mag, Math.round(r / mag) * mag);
}

// Renko-style Range XV with reversal (body 2R) and wicks, built from 1s klines.
// Same logic as range_xv_renko_v10.html.
function buildRangeXvBars(klines: any[], R: number): any[] {
  const out: any[] = [];
  let dir = 0;
  let lastClose = NaN;
  let started = false;
  let runLow = Infinity;
  let runHigh = -Infinity;
  let vacc = 0;
  let prevTs = 0;

  const push = (open: number, high: number, low: number, close: number, ts: number) => {
    const t = Math.max(prevTs + 1, ts);
    prevTs = t;
    out.push({
      timestamp: t,
      open: +open.toFixed(8),
      high: +high.toFixed(8),
      low: +low.toFixed(8),
      close: +close.toFixed(8),
      volume: +Number(trimNum(vacc)),
    });
    vacc = 0;
  };

  for (const k of klines) {
    const O = Number(k.open), H = Number(k.high), L = Number(k.low), C = Number(k.close);
    const V = Number(k.volume) || 0;
    const ts = Number(k.timestamp);
    if (!Number.isFinite(O) || !Number.isFinite(ts)) continue;
    if (!started) { lastClose = O; runLow = O; runHigh = O; started = true; }

    const seq = C >= O ? [O, L, H, C] : [O, H, L, C];
    const vPer = V / 4;

    for (const p of seq) {
      runLow = Math.min(runLow, p);
      runHigh = Math.max(runHigh, p);
      vacc += vPer;
      let guard = 0;
      while (guard++ < 100000) {
        if (dir >= 0 && p >= lastClose + R) {                 // up continuation (body R)
          const open = lastClose, close = lastClose + R;
          push(open, close, Math.min(open, runLow), close, ts);
          lastClose = close; dir = 1; runLow = close; runHigh = close; continue;
        }
        if (dir > 0 && p <= lastClose - 2 * R) {                // reversal down (body 2R)
          const open = lastClose, close = lastClose - 2 * R;
          push(open, Math.max(open, runHigh), close, close, ts);
          lastClose = close; dir = -1; runLow = close; runHigh = close; continue;
        }
        if (dir <= 0 && p <= lastClose - R) {                   // down continuation (body R)
          const open = lastClose, close = lastClose - R;
          push(open, Math.max(open, runHigh), close, close, ts);
          lastClose = close; dir = -1; runLow = close; runHigh = close; continue;
        }
        if (dir < 0 && p >= lastClose + 2 * R) {                // reversal up (body 2R)
          const open = lastClose, close = lastClose + 2 * R;
          push(open, close, Math.min(open, runLow), close, ts);
          lastClose = close; dir = 1; runLow = close; runHigh = close; continue;
        }
        break;
      }
    }
  }
  return out;
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
        let w: number;
        if (xvConfig.volumeWidth) {
          let t = (Number(d.volume) - xvConfig.volP5) / (xvConfig.volP95 - xvConfig.volP5);
          t = Math.max(0, Math.min(1, t));
          w = Math.max(1, Math.min(slot * 0.96, slot * (0.14 + 0.84 * Math.sqrt(t))));
        } else {
          w = Math.max(1, slot * 0.8);
        }
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
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const klinesRef = useRef<any[]>([]);          // cached raw 1s klines
  const barsRef = useRef<any[]>([]);            // built Range XV bars

  const [R, setR] = useState<number>(100);
  const [hours, setHours] = useState<number>(3);
  const [volumeWidth, setVolumeWidth] = useState<boolean>(false);
  const [live, setLive] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [barsCount, setBarsCount] = useState<number>(0);

  const applyBarsRef = useRef<() => void>(() => {});
  const rRef = useRef<number>(100);          // active R (read by the builder)
  const autoRRef = useRef<boolean>(true);    // auto-pick R until the user edits it
  const xvIndicatorOnRef = useRef<boolean>(false);

  // Recompute Range XV from cached 1s klines and (re)apply to the chart.
  const applyBars = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const bars = buildRangeXvBars(klinesRef.current, Math.max(0, rRef.current));
    const vols = bars.map((b) => Number(b.volume));
    xvConfig.volP5 = pct(vols, 5);
    xvConfig.volP95 = pct(vols, 95);
    if (xvConfig.volP95 <= xvConfig.volP5) xvConfig.volP95 = xvConfig.volP5 + 1;
    barsRef.current = bars;
    setBarsCount(bars.length);
    chart.setDataLoader({
      getBars: (d: any) => {
        d.callback(d.type === 'init' ? barsRef.current : [], false);
      },
    });
  }, []);

  // Fetch the recent 1s window from the API.
  const loadKlines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endTs = Date.now();
      const startTs = endTs - Math.max(1, hours) * 3600 * 1000;
      const url = `${KLINES_API_BASE}/klines?pairId=${pairId}&tf=${SECOND_TF}&startTs=${startTs}&endTs=${endTs}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: any[] = await res.json();
      const mapped = raw
        .map((it) => ({
          timestamp: parseInt(it.ts, 10),
          open: parseFloat(it.open),
          high: parseFloat(it.high),
          low: parseFloat(it.low),
          close: parseFloat(it.close),
          volume: parseFloat(it.volume),
        }))
        .filter((it) => Number.isFinite(it.timestamp) && Number.isFinite(it.open))
        .sort((a, b) => a.timestamp - b.timestamp);
      // dedup by ts
      const byTs = new globalThis.Map<number, any>();
      for (const it of mapped) byTs.set(it.timestamp, it);
      klinesRef.current = Array.from(byTs.values()).sort((a, b) => a.timestamp - b.timestamp);
      // Auto-pick R for the instrument scale on first load (until user edits R).
      if (autoRRef.current && klinesRef.current.length) {
        const defR = computeDefaultR(klinesRef.current);
        rRef.current = defR;
        setR(defR);
      }
      applyBars();
    } catch (e: any) {
      setError(e?.message || 'Failed to load klines');
    } finally {
      setLoading(false);
    }
  }, [pairId, hours, applyBars]);

  // Init chart once.
  useEffect(() => {
    if (!containerRef.current) return;
    registerRangeXvIndicator();
    const chart = init(containerRef.current);
    chartRef.current = chart;
    chart?.setStyles({ indicator: { tooltip: { show: false } } } as any);
    loadKlines();
    return () => {
      if (containerRef.current) dispose(containerRef.current);
      chartRef.current = null;
      xvIndicatorOnRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render mode:
  //  - OFF: native klinecharts candles (uniform width) — always renders.
  //  - ON:  hide native candles + custom variable-width-by-volume draw (EquiVolume).
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
    if (barsRef.current.length) applyBars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumeWidth]);

  // Keep a stable ref to the latest applyBars for the WS handler.
  useEffect(() => {
    applyBarsRef.current = applyBars;
  }, [applyBars]);

  // Live: stream closed 1s candles via the bidasks WS (subscribeKlines) and rebuild XV.
  useEffect(() => {
    if (!live || !pairId) return;
    let ws: WebSocket | null = null;
    let applyTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleApply = () => {
      if (applyTimer) return;
      applyTimer = setTimeout(() => {
        applyTimer = null;
        applyBarsRef.current();
      }, 700);
    };
    try {
      ws = new WebSocket(getBidasksWebSocketUrl());
      ws.onopen = () => {
        ws?.send(
          JSON.stringify({ type: 'subscribeKlines', pairId: Number(pairId), interval: SECOND_TF }),
        );
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type !== 'klines' || !Array.isArray(msg.data)) return;
          const byTs = new globalThis.Map<number, any>();
          for (const k of klinesRef.current) byTs.set(k.timestamp, k);
          for (const k of msg.data) {
            const ts = Number(k.ts);
            if (!Number.isFinite(ts)) continue;
            byTs.set(ts, {
              timestamp: ts,
              open: parseFloat(k.open),
              high: parseFloat(k.high),
              low: parseFloat(k.low),
              close: parseFloat(k.close),
              volume: parseFloat(k.volume),
            });
          }
          klinesRef.current = Array.from(byTs.values()).sort((a, b) => a.timestamp - b.timestamp);
          scheduleApply();
        } catch {
          /* ignore malformed frames */
        }
      };
    } catch {
      /* WS unavailable */
    }
    return () => {
      if (applyTimer) clearTimeout(applyTimer);
      try { ws?.close(); } catch { /* noop */ }
    };
  }, [pairId, live]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ p: 1.5, borderBottom: '1px solid #eceff1', flexWrap: 'wrap' }}
      >
        <IconButton size="small" onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>

        <TextField
          label="R (пунктов)"
          type="number"
          size="small"
          value={R}
          onChange={(e) => {
            const v = Math.max(0, Number(e.target.value) || 0);
            rRef.current = v;
            autoRRef.current = false;
            setR(v);
            if (chartRef.current && klinesRef.current.length) applyBars();
          }}
          sx={{ width: 130 }}
        />
        <TextField
          label="История, ч"
          type="number"
          size="small"
          value={hours}
          onChange={(e) => setHours(Math.max(1, Number(e.target.value) || 1))}
          sx={{ width: 110 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={volumeWidth}
              onChange={(e) => setVolumeWidth(e.target.checked)}
            />
          }
          label="Ширина по объёму"
        />
        <FormControlLabel
          control={
            <Switch
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
            />
          }
          label="Live"
        />
        <Button
          variant="contained"
          size="small"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
          disabled={loading}
          onClick={loadKlines}
        >
          Обновить
        </Button>

        <Typography variant="caption" color="text.secondary">
          {error
            ? `Ошибка: ${error}`
            : barsCount === 0
              ? `0 баров — R слишком велик для цены инструмента, уменьши R`
              : `${barsCount} баров (тело R, разворот 2R)`}
        </Typography>
      </Stack>

      <Box ref={containerRef} sx={{ flex: 1, width: '100%' }} />
    </Box>
  );
}

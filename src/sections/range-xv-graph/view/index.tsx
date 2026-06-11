'use client'

import { useCallback, useEffect, useRef, useState } from "react";
import { init, dispose, registerIndicator } from "klinecharts";
import {
  Box, IconButton, FormControlLabel, Switch, Typography, Button, CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SettingsIcon from "@mui/icons-material/Settings";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useSearchParams } from "next/navigation";
import CustomDialog from "src/components/custom-dialog/custom-dialog";

// XV is served by the bidasks service (NEXT_PUBLIC_TR_CLUSTERS_DOMAIN), type=xv, by r (range size).
const KLINES_API_BASE =
  (process.env.NEXT_PUBLIC_TR_CLUSTERS_DOMAIN as string) || 'http://bidasks.traken-trade.ru/api/v1';
const WINDOW_MS = 3 * 24 * 3600 * 1000; // ts window per page (XV is sparse)
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
  const theme = useTheme();
  const searchParams = useSearchParams();
  const urlR = searchParams?.get('r') ?? '';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const xvIndicatorOnRef = useRef<boolean>(false);
  const allBarsRef = useRef<Map<number, any>>(new Map());
  const urlRRef = useRef<string>(urlR);
  urlRRef.current = urlR;

  const [volumeWidth, setVolumeWidth] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [barsCount, setBarsCount] = useState<number>(0);
  const [openChartSettings, setOpenChartSettings] = useState<boolean>(false);

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
    for (const b of bars) allBarsRef.current.set(b.timestamp, b);
    const vols = Array.from(allBarsRef.current.values()).map((b) => Number(b.volume));
    xvConfig.volP5 = pct(vols, 5);
    xvConfig.volP95 = pct(vols, 95);
    if (xvConfig.volP95 <= xvConfig.volP5) xvConfig.volP95 = xvConfig.volP5 + 1;
    setBarsCount(allBarsRef.current.size);
  }, []);

  // setDataLoader getBars: paginated XV by ts window (init / forward=older / backward=newer).
  const getBars = useCallback((d: any) => {
    const chart = chartRef.current;
    const r = urlRRef.current;
    if (!chart || !r) { d.callback([], false); return; }
    const now = Date.now();
    const dl = chart.getDataList();
    let startTs: number;
    let endTs: number;
    if (d.type === 'init') {
      endTs = now; startTs = now - WINDOW_MS;
    } else if (d.type === 'forward') {
      const first = Number(dl?.[0]?.timestamp);
      if (!Number.isFinite(first)) { d.callback([], false); return; }
      endTs = first; startTs = first - WINDOW_MS;
    } else {
      const last = Number(dl?.[dl.length - 1]?.timestamp);
      if (!Number.isFinite(last) || last >= now) { d.callback([], false); return; }
      startTs = last + 1; endTs = Math.min(last + WINDOW_MS, now);
    }
    setLoading(true);
    setError(null);
    fetchXv(r, startTs, endTs)
      .then((bars) => { mergeBars(bars); d.callback(bars, bars.length > 0); })
      .catch((e) => { setError(e?.message || 'load failed'); d.callback([], false); })
      .finally(() => setLoading(false));
  }, [fetchXv, mergeBars]);

  // Init chart once.
  useEffect(() => {
    if (!containerRef.current) return;
    registerRangeXvIndicator();
    const chart = init(containerRef.current);
    chartRef.current = chart;
    chart?.setStyles({ indicator: { tooltip: { show: false } } } as any);
    chart?.setDataLoader({ getBars });
    return () => {
      if (containerRef.current) dispose(containerRef.current);
      chartRef.current = null;
      xvIndicatorOnRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when R (?r=) changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    allBarsRef.current.clear();
    setBarsCount(0);
    chart.setDataLoader({ getBars });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlR]);

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

  const reload = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    allBarsRef.current.clear();
    setBarsCount(0);
    chart.setDataLoader({ getBars });
  }, [getBars]);

  return (
    <Box sx={{ position: 'relative', height: '100vh' }}>
      <Box ref={containerRef} sx={{ position: 'absolute', inset: 0 }} />

      <IconButton
        key="settings"
        aria-label="settings"
        onClick={() => setOpenChartSettings(true)}
        sx={{
          position: 'absolute',
          zIndex: 1,
          left: '18px',
          top: '18px',
          background: theme.palette.grey[200],
          '&:hover': { background: theme.palette.grey[300] },
        }}
      >
        <SettingsIcon />
      </IconButton>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ position: 'absolute', zIndex: 1, left: '66px', top: '24px' }}
      >
        {!urlR
          ? 'Задай R в шапке'
          : error
            ? `Ошибка: ${error}`
            : loading
              ? 'Загрузка…'
              : `${barsCount} баров (R=${urlR})`}
      </Typography>

      <CustomDialog
        open={openChartSettings}
        onClose={() => setOpenChartSettings(false)}
        title="Chart settings"
        actions={null}
        maxWidth="sm"
        content={(
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={volumeWidth}
                  onChange={(e) => setVolumeWidth(e.target.checked)}
                />
              }
              label="Ширина по объёму"
            />
            <Button
              size="small"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
              disabled={loading}
              onClick={reload}
              sx={{ alignSelf: 'flex-start' }}
            >
              Обновить
            </Button>
          </Box>
        )}
      />
    </Box>
  );
}

'use client'

import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import { LineChart } from "@mui/x-charts/LineChart";
import { useAxesTooltip, ChartsTooltipContainer } from "@mui/x-charts/ChartsTooltip";
import Label from "src/components/label";
import { useSnackbar } from "notistack";
import { useGetAllQuery } from "@/lib/redux/api/pairApi";
import { useLazyGetAllQuery as useLazyGetKlinesQuery } from "@/lib/redux/api/klineApi";
import {
  useCreateMutation as useCreateArbitrageSession,
  useGetFundingQuery,
  useGetLimitsQuery,
} from "@/lib/redux/api/arbitrageSessionApi";
import {
  ARB_LEVERAGE_STORAGE_KEY,
  ARB_VOLUME_STORAGE_KEY,
  ArbitrageCombo,
  EnterButton,
  FundingCell,
  FundingMap,
  LegDepthPanel,
  LimitMap,
  buildCombo,
  fmtPct,
  fmtPrice,
  fmtUsd,
  useDepthSocket,
} from "../../arbitrage/shared";

const MINUTE = 60_000;
const INITIAL_MINUTES = 1000; // last ~16h of 1m candles on first load
const CHUNK_MINUTES = 1000; // how much history to prepend per lazy load
const LONG_COLOR = '#36B37E';
const SHORT_COLOR = '#FF5630';

interface ChartPoint {
  ts: number;
  longLow?: number; // LONG leg's low  (buy side)
  shortHigh?: number; // SHORT leg's high (sell side)
}

// Merge a freshly fetched chunk (long lows + short highs) into the existing points, keyed by ts.
function mergePoints(
  prev: ChartPoint[],
  longKlines: any[],
  shortKlines: any[],
): ChartPoint[] {
  const map = new Map<number, ChartPoint>();
  for (const p of prev) map.set(p.ts, { ...p });
  for (const k of longKlines || []) {
    const ts = Number(k.ts);
    const e = map.get(ts) || { ts };
    e.longLow = Number(k.low);
    map.set(ts, e);
  }
  for (const k of shortKlines || []) {
    const ts = Number(k.ts);
    const e = map.get(ts) || { ts };
    e.shortHigh = Number(k.high);
    map.set(ts, e);
  }
  return [...map.values()].sort((a, b) => a.ts - b.ts);
}

// Tooltip content: both line prices plus the % difference between them
// (buy at LONG low, sell at SHORT high → ((shortHigh - longLow) / longLow) * 100).
// Rendered inside the always-mounted ChartsTooltipContainer; returns null when not hovering.
function SpreadTooltipContent() {
  const tooltipData = useAxesTooltip();
  if (!tooltipData || tooltipData.length === 0) return null;
  const { axisFormattedValue, seriesItems } = tooltipData[0];

  const longVal = seriesItems.find((s) => s.seriesId === 'longLow')?.value as number | null;
  const shortVal = seriesItems.find((s) => s.seriesId === 'shortHigh')?.value as number | null;
  const diffPercent =
    longVal != null && shortVal != null && longVal > 0
      ? ((shortVal - longVal) / longVal) * 100
      : null;

  return (
    <Paper elevation={3} sx={{ p: 1, minWidth: 170 }}>
      <Typography variant='caption' color='text.secondary'>
        {axisFormattedValue}
      </Typography>
      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
        {seriesItems.map((s) => (
          <Stack
            key={String(s.seriesId)}
            direction='row'
            justifyContent='space-between'
            spacing={2}
            alignItems='center'
          >
            <Stack direction='row' spacing={1} alignItems='center'>
              <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: s.color }} />
              <Typography variant='body2'>{s.formattedLabel}</Typography>
            </Stack>
            <Typography variant='body2'>{s.formattedValue}</Typography>
          </Stack>
        ))}
        <Stack
          direction='row'
          justifyContent='space-between'
          spacing={2}
          sx={{ pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant='body2' fontWeight={600}>
            Разница
          </Typography>
          <Typography
            variant='body2'
            fontWeight={600}
            color={diffPercent != null && diffPercent >= 0 ? 'success.main' : 'error.main'}
          >
            {diffPercent != null ? `${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(2)}%` : '—'}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

// Custom tooltip slot: keep the default container (handles hover visibility + positioning),
// swap only the content so we can add the "Разница" row.
function SpreadTooltip() {
  return (
    <ChartsTooltipContainer trigger='axis'>
      <SpreadTooltipContent />
    </ChartsTooltipContainer>
  );
}

interface Props {
  name: string;
  longPairId: number;
  shortPairId: number;
}

export default function ArbitrageGraphView({ name, longPairId, shortPairId }: Props) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { data: pairs } = useGetAllQuery({ activated: true });
  const { data: fundingData } = useGetFundingQuery({} as any, { pollingInterval: 30000 });
  const funding: FundingMap = (fundingData as any) || {};
  const { data: limitsData } = useGetLimitsQuery({} as any, { pollingInterval: 300000 });
  const limits: LimitMap = (limitsData as any) || {};
  const [createSession, { isLoading: entering }] = useCreateArbitrageSession();

  const { depthRef } = useDepthSocket();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  // Entry volume / leverage — same persisted keys as /arbitrage.
  const [volumeUsd, setVolumeUsd] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const v = Number(window.localStorage.getItem(ARB_VOLUME_STORAGE_KEY));
      if (v > 0) return v;
    }
    return 1000;
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ARB_VOLUME_STORAGE_KEY, String(volumeUsd));
    }
  }, [volumeUsd]);
  const [leverage, setLeverage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const v = Number(window.localStorage.getItem(ARB_LEVERAGE_STORAGE_KEY));
      if (v > 0) return v;
    }
    return 1;
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ARB_LEVERAGE_STORAGE_KEY, String(leverage));
    }
  }, [leverage]);

  // Build the two "items" ({pair, service}) buildCombo expects, from the pairs list.
  const items = useMemo(() => {
    const list = (pairs as any[]) || [];
    const a = list.find((p) => p.id === longPairId);
    const b = list.find((p) => p.id === shortPairId);
    if (!a || !b) return null;
    return {
      a: { pair: a, service: a.tradingService },
      b: { pair: b, service: b.tradingService },
    };
  }, [pairs, longPairId, shortPairId]);

  // ---- combination picker: same coin, all LONG→SHORT trading-service combinations ----
  // Activated pairs of the current coin (pair.name), sorted by exchange name.
  const legOptions = useMemo(() => {
    const list = ((pairs as any[]) || []).filter(
      (p) => p?.name === name && p.tradingService && p.tradingService.activated !== false,
    );
    list.sort((a, b) =>
      String(a.tradingService?.name).localeCompare(String(b.tradingService?.name)),
    );
    return list;
  }, [pairs, name]);

  // Unordered pairs of exchanges for this coin: buildCombo picks LONG/SHORT direction from the
  // live book, so "Bybit ↔ HTX" and "HTX ↔ Bybit" are the same combination — list each once.
  // Value is the two pair ids sorted ascending, so it matches regardless of URL leg order.
  const comboOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let i = 0; i < legOptions.length; i++) {
      for (let j = i + 1; j < legOptions.length; j++) {
        const a = legOptions[i];
        const b = legOptions[j];
        const [lo, hi] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
        opts.push({
          value: `${lo}:${hi}`,
          label: `${a.tradingService?.name} ↔ ${b.tradingService?.name}`,
        });
      }
    }
    return opts;
  }, [legOptions]);

  const currentComboValue = useMemo(() => {
    const [lo, hi] =
      longPairId < shortPairId ? [longPairId, shortPairId] : [shortPairId, longPairId];
    return `${lo}:${hi}`;
  }, [longPairId, shortPairId]);

  const onComboChange = useCallback(
    (value: string) => {
      const [longId, shortId] = value.split(':').map(Number);
      router.push(
        `/arbitrage-graph?name=${encodeURIComponent(name)}&longPairId=${longId}&shortPairId=${shortId}`,
      );
    },
    [router, name],
  );

  // Live combo, recomputed from the latest order books every tick.
  const combo: ArbitrageCombo | null = useMemo(() => {
    if (!items) return null;
    return buildCombo(items.a, items.b, depthRef.current, volumeUsd, funding, limits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, tick, volumeUsd, fundingData, limitsData]);

  const handleEnter = async (c: ArbitrageCombo) => {
    const confirmed = window.confirm(
      `Открыть арбитраж на ${fmtUsd(volumeUsd)}/ногу ×${leverage}?\n` +
        `LONG ${c.long.tradingServiceName} (${fmtPrice(c.long.price)})\n` +
        `SHORT ${c.short.tradingServiceName} (${fmtPrice(c.short.price)})`,
    );
    if (!confirmed) return;
    try {
      const res: any = await createSession({
        longPairId: c.long.pairId,
        shortPairId: c.short.pairId,
        amountUsd: volumeUsd,
        leverage: leverage > 0 ? leverage : undefined,
        longExpectedPrice: c.long.effPrice ?? undefined,
        shortExpectedPrice: c.short.effPrice ?? undefined,
      }).unwrap();
      if (res?.status === 'failed') {
        enqueueSnackbar('Вход частично/не удался — см. статистику', { variant: 'warning' });
      } else {
        enqueueSnackbar('Позиции открыты', { variant: 'success' });
      }
    } catch (e: any) {
      enqueueSnackbar(`Ошибка входа: ${e?.data?.message || e?.error || 'unknown'}`, {
        variant: 'error',
      });
    }
  };

  // ---- spread chart: 1m klines, LONG low vs SHORT high, lazy history load ----
  const [triggerLong] = useLazyGetKlinesQuery();
  const [triggerShort] = useLazyGetKlinesQuery();
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const oldestRef = useRef<number>(0); // earliest ts window boundary loaded so far
  const loadingRef = useRef(false);

  const fetchRange = useCallback(
    async (startTs: number, endTs: number) => {
      const [longKlines, shortKlines] = await Promise.all([
        triggerLong({ pairId: longPairId, tf: 1, startTs, endTs, limit: CHUNK_MINUTES } as any).unwrap(),
        triggerShort({ pairId: shortPairId, tf: 1, startTs, endTs, limit: CHUNK_MINUTES } as any).unwrap(),
      ]);
      return { longKlines: longKlines as any[], shortKlines: shortKlines as any[] };
    },
    [triggerLong, triggerShort, longPairId, shortPairId],
  );

  // Initial window whenever the pair changes.
  useEffect(() => {
    if (!longPairId || !shortPairId) return;
    let cancelled = false;
    const endTs = Date.now();
    const startTs = endTs - INITIAL_MINUTES * MINUTE;
    setChartLoading(true);
    loadingRef.current = true;
    fetchRange(startTs, endTs)
      .then(({ longKlines, shortKlines }) => {
        if (cancelled) return;
        oldestRef.current = startTs;
        setPoints(mergePoints([], longKlines, shortKlines));
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        loadingRef.current = false;
        setChartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [longPairId, shortPairId, fetchRange]);

  // Load an older chunk and prepend it.
  const loadOlder = useCallback(() => {
    if (loadingRef.current || !oldestRef.current) return;
    const endTs = oldestRef.current;
    const startTs = endTs - CHUNK_MINUTES * MINUTE;
    loadingRef.current = true;
    setChartLoading(true);
    fetchRange(startTs, endTs)
      .then(({ longKlines, shortKlines }) => {
        oldestRef.current = startTs;
        setPoints((prev) => mergePoints(prev, longKlines, shortKlines));
      })
      .catch(() => {})
      .finally(() => {
        loadingRef.current = false;
        setChartLoading(false);
      });
  }, [fetchRange]);

  // Scroll up over the chart to pull older history (free x-charts has no built-in brush/zoom).
  const onWheelHistory = useCallback(
    (e: React.WheelEvent) => {
      if (e.deltaY < 0) loadOlder();
    },
    [loadOlder],
  );

  // x-charts time axis wants Date objects.
  const chartDataset = useMemo(
    () => points.map((p) => ({ ...p, date: new Date(p.ts) })),
    [points],
  );

  const numberFmt = (v: number | null) =>
    v == null ? '' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 8 });

  const spread = combo ? fmtPct(combo.priceDiffPercent) : '—';

  return (
    <Container maxWidth='xl' sx={{ mt: 10 }}>
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* LEFT (2) — spread chart */}
        <Box sx={{ flex: 2, minWidth: 0 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title={`${name} — спред (1м)`}
              subheader={
                <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                  <Label color='success'>LONG low · {combo?.long.tradingServiceName ?? '—'}</Label>
                  <Label color='error'>SHORT high · {combo?.short.tradingServiceName ?? '—'}</Label>
                  <Typography variant='caption' color='text.secondary'>
                    разница {spread}
                  </Typography>
                  {chartLoading && <CircularProgress size={14} />}
                </Stack>
              }
            />
            <CardContent>
              {/* Combination picker: same coin, other LONG→SHORT trading-service combos. */}
              <TextField
                select
                size='small'
                label={`Комбинация (${name})`}
                value={comboOptions.some((o) => o.value === currentComboValue) ? currentComboValue : ''}
                onChange={(e) => onComboChange(e.target.value)}
                sx={{ minWidth: 260, mb: 2 }}
              >
                {comboOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
              {points.length === 0 ? (
                <Box sx={{ height: 460, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {chartLoading ? <CircularProgress /> : (
                    <Typography variant='body2' color='text.secondary'>Нет данных</Typography>
                  )}
                </Box>
              ) : (
                <Box onWheel={onWheelHistory}>
                  <LineChart
                    dataset={chartDataset as any}
                    height={460}
                    margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
                    xAxis={[
                      {
                        dataKey: 'date',
                        scaleType: 'time',
                        valueFormatter: (v: any) => moment(v).format('DD.MM HH:mm'),
                      },
                    ]}
                    yAxis={[
                      {
                        valueFormatter: (v: number) =>
                          Number(v).toLocaleString('en-US', { maximumFractionDigits: 6 }),
                      },
                    ]}
                    series={[
                      {
                        id: 'longLow',
                        dataKey: 'longLow',
                        label: 'LONG low',
                        color: LONG_COLOR,
                        showMark: false,
                        connectNulls: true,
                        valueFormatter: (v: any) => numberFmt(v),
                      },
                      {
                        id: 'shortHigh',
                        dataKey: 'shortHigh',
                        label: 'SHORT high',
                        color: SHORT_COLOR,
                        showMark: false,
                        connectNulls: true,
                        valueFormatter: (v: any) => numberFmt(v),
                      },
                    ]}
                    slots={{ tooltip: SpreadTooltip }}
                  />
                </Box>
              )}
              <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between'>
                <Typography variant='caption' color='text.secondary'>
                  Прокрутите колесом вверх над графиком, чтобы подгрузить историю.
                </Typography>
                <Button size='small' onClick={loadOlder} disabled={chartLoading}>
                  Загрузить историю
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* RIGHT (1) — order books + entry */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack spacing={2}>
            {combo && (
              <Card>
                <CardContent>
                  <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' sx={{ mb: 1 }}>
                    <Typography variant='h6'>{name}</Typography>
                    <Label color='info'>Разница {fmtPct(combo.priceDiffPercent)}</Label>
                    <Label color={combo.netProfitPercent > 0 ? 'success' : 'error'}>
                      Профит {fmtPct(combo.netProfitPercent)}
                    </Label>
                    {combo.effProfitPercent != null && (
                      <Label color={combo.effProfitPercent > 0 ? 'success' : 'error'}>
                        На объём {fmtPct(combo.effProfitPercent)}
                      </Label>
                    )}
                  </Stack>
                  <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Typography variant='caption' color='text.secondary'>
                      Комиссии: LONG {fmtPct(combo.long.takerFee)} · SHORT {fmtPct(combo.short.takerFee)}
                    </Typography>
                    <FundingCell combo={combo} />
                  </Stack>
                </CardContent>
              </Card>
            )}

            {combo && (
              <>
                <LegDepthPanel leg={combo.long} book={depthRef.current[combo.long.pairId]} volumeUsd={volumeUsd} />
                <LegDepthPanel leg={combo.short} book={depthRef.current[combo.short.pairId]} volumeUsd={volumeUsd} />
              </>
            )}

            <Card>
              <CardContent>
                <Stack spacing={1.5}>
                  <Stack direction='row' spacing={1}>
                    <TextField
                      size='small'
                      label='Объём входа'
                      type='number'
                      value={volumeUsd}
                      onChange={(e) => setVolumeUsd(Math.max(0, Number(e.target.value) || 0))}
                      fullWidth
                      InputProps={{ endAdornment: <InputAdornment position='end'>USDT</InputAdornment> }}
                    />
                    <TextField
                      size='small'
                      label='Плечо'
                      type='number'
                      value={leverage}
                      onChange={(e) => setLeverage(Math.max(1, Number(e.target.value) || 1))}
                      sx={{ width: 110 }}
                      inputProps={{ min: 1, step: 1 }}
                      InputProps={{ endAdornment: <InputAdornment position='end'>×</InputAdornment> }}
                    />
                  </Stack>
                  {combo ? (
                    <EnterButton
                      combo={combo}
                      volumeUsd={volumeUsd}
                      entering={entering}
                      onEnter={handleEnter}
                      variant='contained'
                    />
                  ) : (
                    <Typography variant='body2' color='text.secondary'>
                      Ожидание стакана по обеим монетам…
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}

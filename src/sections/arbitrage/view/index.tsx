'use client'

import Container from "@mui/material/Container";
import {
  Card,
  CardContent,
  CardHeader,
  Collapse,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Label from "src/components/label";
import moment from "moment";
import { useGetAllQuery } from "@/lib/redux/api/pairApi";
import {
  getKlinesPricesWebSocketUrl,
  SUBSCRIBE_ALL_PRICES,
} from "@/src/utils/arbitrageWebSocket";
import {
  getOrderbookDepthWebSocketUrl,
  SUBSCRIBE_ALL_DEPTH,
  SLIPPAGE_BANDS,
} from "@/src/utils/orderbookDepthWebSocket";

interface DepthBand {
  base: number;
  notional: number;
}
interface DepthProfile {
  pairId: number;
  ts: number;
  bestBid: number;
  bestAsk: number;
  mid: number;
  spreadPct: number;
  ask: Record<string, DepthBand>;
  bid: Record<string, DepthBand>;
}

interface ArbitrageLeg {
  tradingServiceId: number;
  tradingServiceName: string;
  pairId: number;
  symbol: string;
  price: number;
  takerFee: number;
  direction: 'long' | 'short';
}

interface ArbitrageCombo {
  key: string;
  priceDiffPercent: number;
  long: ArbitrageLeg;
  short: ArbitrageLeg;
  netProfitPercent: number;
  // Max USDT executable on both legs within the selected slippage tolerance (min of the two books).
  liquidityUsd: number | null;
  // netProfitPercent minus a conservative slippage haircut (tolerance on each leg).
  netAfterSlippagePercent: number;
}

interface ArbitrageOpportunity {
  name: string;
  best: ArbitrageCombo;
  others: ArbitrageCombo[];
}

const fmtPrice = (value: number) =>
  value?.toLocaleString('en-US', { maximumFractionDigits: 8 });
const fmtPct = (value: number) => `${Number(value ?? 0).toFixed(3)}%`;
const fmtUsd = (value: number | null) => {
  if (value == null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
};

function toLeg(item: any, direction: 'long' | 'short'): ArbitrageLeg {
  return {
    tradingServiceId: item.pair.tradingServiceId,
    tradingServiceName: item.service.name,
    pairId: item.pair.id,
    symbol: item.pair.symbol,
    price: item.price,
    takerFee: Number(item.service.takerFee ?? 0),
    direction,
  };
}

function buildCombo(
  a: any,
  b: any,
  depth: Record<number, DepthProfile>,
  tol: number,
): ArbitrageCombo {
  const cheapest = a.price <= b.price ? a : b;
  const dearest = a.price <= b.price ? b : a;
  const priceDiffPercent =
    ((dearest.price - cheapest.price) / cheapest.price) * 100;
  const long = toLeg(cheapest, 'long');
  const short = toLeg(dearest, 'short');

  // Entering the arbitrage: BUY on the cheap leg (consume its asks), SELL on the dear leg
  // (consume its bids). Executable size within tolerance is the thinner of the two books.
  const tolKey = String(tol);
  const askUsd = depth[long.pairId]?.ask?.[tolKey]?.notional;
  const bidUsd = depth[short.pairId]?.bid?.[tolKey]?.notional;
  const liquidityUsd =
    askUsd != null && bidUsd != null ? Math.min(askUsd, bidUsd) : null;

  return {
    key: `${cheapest.pair.name}-${long.tradingServiceId}-${short.tradingServiceId}`,
    priceDiffPercent,
    long,
    short,
    netProfitPercent: priceDiffPercent - long.takerFee - short.takerFee,
    liquidityUsd,
    // Conservative: at max size each leg can slip up to `tol`, so subtract it from both legs.
    netAfterSlippagePercent:
      priceDiffPercent - long.takerFee - short.takerFee - tol * 2,
  };
}

function computeOpportunities(
  pairs: any,
  prices: Record<number, number>,
  depth: Record<number, DepthProfile>,
  tol: number,
): ArbitrageOpportunity[] {
  const byName = new Map<string, any[]>();
  for (const pair of pairs || []) {
    const service = pair.tradingService;
    if (!service || service.activated === false) continue;
    const price = prices[pair.id];
    if (!Number.isFinite(price) || price <= 0) continue;
    const list = byName.get(pair.name) || [];
    list.push({ pair, service, price });
    byName.set(pair.name, list);
  }

  const opportunities: ArbitrageOpportunity[] = [];
  for (const [name, list] of byName.entries()) {
    if (list.length < 2) continue;
    const combos: ArbitrageCombo[] = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].pair.id === list[j].pair.id) continue;
        combos.push(buildCombo(list[i], list[j], depth, tol));
      }
    }
    if (!combos.length) continue;
    combos.sort((a, b) => b.netProfitPercent - a.netProfitPercent);
    opportunities.push({ name, best: combos[0], others: combos.slice(1) });
  }

  return opportunities.sort(
    (a, b) => b.best.netProfitPercent - a.best.netProfitPercent,
  );
}

function LegCell({ leg }: { leg: ArbitrageLeg }) {
  const isLong = leg.direction === 'long';
  return (
    <Stack spacing={0.5}>
      <Stack direction='row' spacing={0.5} alignItems='center'>
        <Label color={isLong ? 'success' : 'error'}>
          {isLong ? 'LONG' : 'SHORT'}
        </Label>
        <Typography variant='subtitle2'>{leg.tradingServiceName}</Typography>
      </Stack>
      <Typography variant='caption' color='text.secondary'>
        {fmtPrice(leg.price)} · fee {fmtPct(leg.takerFee)}
      </Typography>
    </Stack>
  );
}

function ComboCells({ combo }: { combo: ArbitrageCombo }) {
  return (
    <>
      <TableCell sx={{ textAlign: 'right' }}>
        <Label color='info'>{fmtPct(combo.priceDiffPercent)}</Label>
      </TableCell>
      <TableCell>
        <LegCell leg={combo.long} />
      </TableCell>
      <TableCell>
        <LegCell leg={combo.short} />
      </TableCell>
      <TableCell sx={{ textAlign: 'right' }}>
        <Label color={combo.netProfitPercent > 0 ? 'success' : 'error'}>
          {fmtPct(combo.netProfitPercent)}
        </Label>
      </TableCell>
      <TableCell sx={{ textAlign: 'right' }}>
        <Tooltip title='Макс объём входа на обеих ногах в пределах допуска проскальзывания (тоньшая из двух книг)'>
          <span>
            {combo.liquidityUsd == null ? (
              <Typography variant='caption' color='text.secondary'>
                n/a
              </Typography>
            ) : (
              <Typography variant='body2'>{fmtUsd(combo.liquidityUsd)}</Typography>
            )}
          </span>
        </Tooltip>
      </TableCell>
      <TableCell sx={{ textAlign: 'right' }}>
        <Label color={combo.netAfterSlippagePercent > 0 ? 'success' : 'default'}>
          {fmtPct(combo.netAfterSlippagePercent)}
        </Label>
      </TableCell>
    </>
  );
}

function OpportunityRow({ item }: { item: ArbitrageOpportunity }) {
  const [open, setOpen] = useState(false);
  const hasOthers = item.others.length > 0;
  return (
    <>
      <TableRow hover>
        <TableCell sx={{ width: 48 }}>
          {hasOthers && (
            <IconButton size='small' onClick={() => setOpen((v) => !v)}>
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>
          <Typography variant='subtitle2'>{item.name}</Typography>
        </TableCell>
        <ComboCells combo={item.best} />
      </TableRow>
      {hasOthers && (
        <TableRow>
          <TableCell sx={{ py: 0, borderBottom: 'none' }} colSpan={8}>
            <Collapse in={open} timeout='auto' unmountOnExit>
              <Box sx={{ my: 1, mx: 2 }}>
                <Typography variant='caption' color='text.secondary'>
                  Другие комбинации площадок по паре {item.name}
                </Typography>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ textAlign: 'right' }}>Разница цен</TableCell>
                      <TableCell>Цена 1 (дешевле)</TableCell>
                      <TableCell>Цена 2 (дороже)</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>Чистый профит</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>Ликвидность</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>Профит − слип.</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {item.others.map((combo) => (
                      <TableRow key={combo.key}>
                        <ComboCells combo={combo} />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function ArbitrageIndexView() {
  const { data: pairs } = useGetAllQuery({ activated: true });

  const pricesRef = useRef<Record<number, number>>({});
  const depthRef = useRef<Record<number, DepthProfile>>({});
  const [tick, setTick] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  // Slippage tolerance used for the executable-size / net-after-slippage columns.
  const [slipTol, setSlipTol] = useState<number>(0.25);

  const { sendJsonMessage: sendPrices, readyState: pricesReady } = useWebSocket(
    getKlinesPricesWebSocketUrl(),
    {
      share: false,
      shouldReconnect: () => true,
      onMessage: (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg?.type === 'pricesSnapshot' && msg.data) {
            const next: Record<number, number> = {};
            for (const key of Object.keys(msg.data)) {
              const price = parseFloat(msg.data[key]);
              if (Number.isFinite(price)) next[Number(key)] = price;
            }
            pricesRef.current = next;
          }
        } catch {}
      },
    },
  );

  const { sendJsonMessage: sendDepth, readyState: depthReady } = useWebSocket(
    getOrderbookDepthWebSocketUrl(),
    {
      share: false,
      shouldReconnect: () => true,
      onMessage: (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg?.type === 'depthSnapshot' && msg.data) {
            const next: Record<number, DepthProfile> = {};
            for (const key of Object.keys(msg.data)) {
              next[Number(key)] = msg.data[key];
            }
            depthRef.current = next;
          }
        } catch {}
      },
    },
  );

  useEffect(() => {
    if (pricesReady === ReadyState.OPEN) sendPrices(SUBSCRIBE_ALL_PRICES);
  }, [pricesReady]);

  useEffect(() => {
    if (depthReady === ReadyState.OPEN) sendDepth(SUBSCRIBE_ALL_DEPTH);
  }, [depthReady]);

  // Recompute the table every 3 seconds from the latest prices + depth.
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setUpdatedAt(Date.now());
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const opportunities = useMemo(
    () =>
      computeOpportunities(
        pairs || [],
        pricesRef.current,
        depthRef.current,
        slipTol,
      ),
    [pairs, tick, slipTol],
  );

  const connectionLabel = useMemo(() => {
    const label = (state: number) =>
      state === ReadyState.OPEN
        ? 'success'
        : state === ReadyState.CONNECTING
        ? 'warning'
        : 'error';
    return (
      <Stack direction='row' spacing={1} alignItems='center'>
        <Label color={label(pricesReady) as any}>цены</Label>
        <Label color={label(depthReady) as any}>стакан</Label>
      </Stack>
    );
  }, [pricesReady, depthReady]);

  return (
    <Container maxWidth='xl' sx={{ mt: 10 }}>
      <Card>
        <CardHeader
          title='Арбитраж'
          subheader={
            updatedAt
              ? `Обновлено: ${moment(updatedAt).format('HH:mm:ss')}`
              : 'Ожидание данных…'
          }
          action={
            <Stack direction='row' spacing={2} alignItems='center' sx={{ mt: 1 }}>
              <Stack direction='row' spacing={1} alignItems='center'>
                <Typography variant='caption' color='text.secondary'>
                  Проскальз.
                </Typography>
                <ToggleButtonGroup
                  size='small'
                  exclusive
                  value={slipTol}
                  onChange={(_, v) => v != null && setSlipTol(v)}
                >
                  {SLIPPAGE_BANDS.map((b) => (
                    <ToggleButton key={b} value={b}>
                      {b}%
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>
              {connectionLabel}
            </Stack>
          }
        />
        <CardContent>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 48 }} />
                <TableCell>Пара</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>Разница цен</TableCell>
                <TableCell>Цена 1 (дешевле)</TableCell>
                <TableCell>Цена 2 (дороже)</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>Чистый профит</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  Ликвидность (≤{slipTol}%)
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>Профит − слип.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {opportunities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Нет арбитражных данных
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {opportunities.map((item) => (
                <OpportunityRow key={item.name} item={item} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Container>
  );
}

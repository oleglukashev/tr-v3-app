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
  getKlinesPricesSnapshotUrl,
  SUBSCRIBE_PRICES,
} from "@/src/utils/arbitrageWebSocket";

interface ArbitrageLeg {
  tradingServiceId: number;
  tradingServiceName: string;
  pairId: number;
  symbol: string;
  price: number;
  takerFee: number;
  direction: 'long' | 'short';
}

interface ArbitrageServiceQuote {
  tradingServiceId: number;
  tradingServiceName: string;
  pairId: number;
  price: number;
  takerFee: number;
  role: 'long' | 'short' | null;
}

interface ArbitrageOpportunity {
  name: string;
  priceDiffPercent: number;
  long: ArbitrageLeg;
  short: ArbitrageLeg;
  netProfitPercent: number;
  // Every trading service quoting this pair (for the expandable breakdown).
  services: ArbitrageServiceQuote[];
}

const fmtPrice = (value: number) =>
  value?.toLocaleString('en-US', { maximumFractionDigits: 8 });
const fmtPct = (value: number) => `${Number(value ?? 0).toFixed(3)}%`;

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

// Client-side matching: group active pairs by name, then for each name that exists on 2+ trading
// services keep the single most profitable spread (cheapest vs most expensive) plus the full list
// of every service quoting the pair for the expandable breakdown.
function computeOpportunities(
  pairs: any,
  prices: Record<number, number>,
): ArbitrageOpportunity[] {
  const byName = new Map<string, any[]>();
  for (const pair of pairs || []) {
    const service = pair.tradingService;
    if (!service || service.activated === false) {
      continue;
    }
    const price = prices[pair.id];
    if (!Number.isFinite(price) || price <= 0) {
      continue;
    }
    const list = byName.get(pair.name) || [];
    list.push({ pair, service, price });
    byName.set(pair.name, list);
  }

  const opportunities: ArbitrageOpportunity[] = [];
  for (const list of byName.values()) {
    if (list.length < 2) {
      continue;
    }
    let cheapest = list[0];
    let dearest = list[0];
    for (const item of list) {
      if (item.price < cheapest.price) cheapest = item;
      if (item.price > dearest.price) dearest = item;
    }
    if (cheapest.pair.id === dearest.pair.id || cheapest.price <= 0) {
      continue;
    }

    const priceDiffPercent =
      ((dearest.price - cheapest.price) / cheapest.price) * 100;
    const long = toLeg(cheapest, 'long');
    const short = toLeg(dearest, 'short');

    const services: ArbitrageServiceQuote[] = list
      .slice()
      .sort((a, b) => a.price - b.price)
      .map((item) => ({
        tradingServiceId: item.pair.tradingServiceId,
        tradingServiceName: item.service.name,
        pairId: item.pair.id,
        price: item.price,
        takerFee: Number(item.service.takerFee ?? 0),
        role:
          item.pair.id === cheapest.pair.id
            ? 'long'
            : item.pair.id === dearest.pair.id
            ? 'short'
            : null,
      }));

    opportunities.push({
      name: cheapest.pair.name,
      priceDiffPercent,
      long,
      short,
      netProfitPercent: priceDiffPercent - long.takerFee - short.takerFee,
      services,
    });
  }

  return opportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent);
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

function OpportunityRow({ item }: { item: ArbitrageOpportunity }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover>
        <TableCell sx={{ width: 48 }}>
          <IconButton size='small' onClick={() => setOpen((v) => !v)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant='subtitle2'>{item.name}</Typography>
        </TableCell>
        <TableCell sx={{ textAlign: 'right' }}>
          <Label color='info'>{fmtPct(item.priceDiffPercent)}</Label>
        </TableCell>
        <TableCell>
          <LegCell leg={item.long} />
        </TableCell>
        <TableCell>
          <LegCell leg={item.short} />
        </TableCell>
        <TableCell sx={{ textAlign: 'right' }}>
          <Label color={item.netProfitPercent > 0 ? 'success' : 'error'}>
            {fmtPct(item.netProfitPercent)}
          </Label>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell sx={{ py: 0, borderBottom: 'none' }} colSpan={6}>
          <Collapse in={open} timeout='auto' unmountOnExit>
            <Box sx={{ my: 1, mx: 2 }}>
              <Typography variant='caption' color='text.secondary'>
                Все площадки по паре {item.name}
              </Typography>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Trading service</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>Цена</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>Taker fee</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>Роль</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {item.services.map((s) => (
                    <TableRow key={s.tradingServiceId}>
                      <TableCell>{s.tradingServiceName}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {fmtPrice(s.price)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {fmtPct(s.takerFee)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {s.role === 'long' && <Label color='success'>LONG</Label>}
                        {s.role === 'short' && <Label color='error'>SHORT</Label>}
                        {!s.role && (
                          <Typography variant='caption' color='text.secondary'>
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function ArbitrageIndexView() {
  // Pairs (with their trading service + maker/taker fees) come from the api.
  const { data: pairs } = useGetAllQuery({ activated: true });

  // Live prices keyed by pairId, kept in a ref so incoming WS messages don't re-render on every tick.
  const pricesRef = useRef<Record<number, number>>({});
  const [tick, setTick] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const { sendJsonMessage, readyState } = useWebSocket(
    getKlinesPricesWebSocketUrl(),
    {
      share: false,
      shouldReconnect: () => true,
      onMessage: (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg?.type === 'price' && msg.data) {
            const price = parseFloat(msg.data.price);
            if (Number.isFinite(price)) {
              pricesRef.current[Number(msg.data.pairId)] = price;
            }
          }
        } catch {}
      },
    },
  );

  // Subscribe to all price updates once the socket is open.
  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      sendJsonMessage(SUBSCRIBE_PRICES);
    }
  }, [readyState]);

  // Seed the price map from the klines snapshot so the table isn't empty until the next 5m close.
  useEffect(() => {
    let cancelled = false;
    fetch(getKlinesPricesSnapshotUrl())
      .then((r) => r.json())
      .then((store: Record<string, string>) => {
        if (cancelled || !store) return;
        for (const key of Object.keys(store)) {
          const price = parseFloat(store[key]);
          if (Number.isFinite(price)) {
            pricesRef.current[Number(key)] = price;
          }
        }
        setTick((t) => t + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Recompute the table every 3 seconds from the latest prices.
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setUpdatedAt(Date.now());
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const opportunities = useMemo(
    () => computeOpportunities(pairs || [], pricesRef.current),
    [pairs, tick],
  );

  const connectionLabel = useMemo(() => {
    switch (readyState) {
      case ReadyState.OPEN:
        return <Label color='success'>ONLINE</Label>;
      case ReadyState.CONNECTING:
        return <Label color='warning'>CONNECTING</Label>;
      default:
        return <Label color='error'>OFFLINE</Label>;
    }
  }, [readyState]);

  return (
    <Container maxWidth='lg' sx={{ mt: 10 }}>
      <Card>
        <CardHeader
          title='Арбитраж'
          subheader={
            updatedAt
              ? `Обновлено: ${moment(updatedAt).format('HH:mm:ss')}`
              : 'Ожидание данных…'
          }
          action={<Box sx={{ mt: 1 }}>{connectionLabel}</Box>}
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
              </TableRow>
            </TableHead>
            <TableBody>
              {opportunities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
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

'use client'

import Container from "@mui/material/Container";
import {
  Card,
  CardContent,
  CardHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
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

interface ArbitrageOpportunity {
  name: string;
  priceDiffPercent: number;
  long: ArbitrageLeg;
  short: ArbitrageLeg;
  netProfitPercent: number;
}

const fmtPrice = (value: number) =>
  value?.toLocaleString('en-US', { maximumFractionDigits: 8 });
const fmtPct = (value: number) => `${Number(value ?? 0).toFixed(3)}%`;

// Client-side matching: group active pairs by name, then for each name that exists on 2+ trading
// services compare the live prices (by pairId) and compute the net possible profit.
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
    if (cheapest.pair.id === dearest.pair.id) {
      continue;
    }

    const priceDiffPercent =
      ((dearest.price - cheapest.price) / cheapest.price) * 100;
    const long: ArbitrageLeg = {
      tradingServiceId: cheapest.pair.tradingServiceId,
      tradingServiceName: cheapest.service.name,
      pairId: cheapest.pair.id,
      symbol: cheapest.pair.symbol,
      price: cheapest.price,
      takerFee: Number(cheapest.service.takerFee ?? 0),
      direction: 'long',
    };
    const short: ArbitrageLeg = {
      tradingServiceId: dearest.pair.tradingServiceId,
      tradingServiceName: dearest.service.name,
      pairId: dearest.pair.id,
      symbol: dearest.pair.symbol,
      price: dearest.price,
      takerFee: Number(dearest.service.takerFee ?? 0),
      direction: 'short',
    };
    opportunities.push({
      name: cheapest.pair.name,
      priceDiffPercent,
      long,
      short,
      netProfitPercent: priceDiffPercent - long.takerFee - short.takerFee,
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
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Нет арбитражных данных
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {opportunities.map((item) => (
                <TableRow key={item.name} hover>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Container>
  );
}

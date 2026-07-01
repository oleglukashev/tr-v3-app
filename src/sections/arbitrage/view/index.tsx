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
import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Label from "src/components/label";
import moment from "moment";
import { getArbitrageWebSocketUrl, ARBITRAGE_SUBSCRIBE } from "@/src/utils/arbitrageWebSocket";

interface ArbitrageLeg {
  tradingServiceId: number;
  tradingServiceName: string;
  pairId: number;
  symbol: string;
  price: number;
  takerFee: number;
  makerFee: number;
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
const fmtPct = (value: number) =>
  `${Number(value ?? 0).toFixed(3)}%`;

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
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    getArbitrageWebSocketUrl(),
    {
      share: false,
      shouldReconnect: () => true,
    },
  );

  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      sendJsonMessage(ARBITRAGE_SUBSCRIBE);
    }
  }, [readyState]);

  useEffect(() => {
    const msg: any = lastJsonMessage;
    if (msg?.type === 'arbitrage' && Array.isArray(msg.data)) {
      setOpportunities(msg.data);
      setUpdatedAt(msg.updatedAt ?? null);
    }
  }, [lastJsonMessage]);

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

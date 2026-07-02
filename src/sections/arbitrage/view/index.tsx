'use client'

import Container from "@mui/material/Container";
import {
  Card,
  CardContent,
  CardHeader,
  Collapse,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
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
  getOrderbookDepthWebSocketUrl,
  SUBSCRIBE_ALL_DEPTH,
} from "@/src/utils/orderbookDepthWebSocket";

type Level = [number, number]; // [price, amount(base)]
interface DepthBook {
  pairId: number;
  ts: number;
  bids: Level[]; // best-first (descending)
  asks: Level[]; // best-first (ascending)
}

interface ArbitrageLeg {
  tradingServiceId: number;
  tradingServiceName: string;
  pairId: number;
  symbol: string;
  price: number; // best (top-of-book) price
  effPrice: number | null; // VWAP for the chosen volume (null = no book)
  effFilled: boolean; // could the book fully absorb the volume?
  takerFee: number;
  direction: 'long' | 'short';
}

interface ArbitrageCombo {
  key: string;
  priceDiffPercent: number;
  long: ArbitrageLeg;
  short: ArbitrageLeg;
  netProfitPercent: number; // from top prices
  effProfitPercent: number | null; // from effective (VWAP) prices, minus fees
}

interface ArbitrageOpportunity {
  name: string;
  best: ArbitrageCombo;
  others: ArbitrageCombo[];
}

const fmtPrice = (value: number | null) =>
  value == null ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: 8 });
const fmtPct = (value: number | null) =>
  value == null ? '—' : `${Number(value).toFixed(3)}%`;

/**
 * Walk one side of the book to spend `targetUsd` (quote notional) and return the volume-weighted
 * average price. asks → buying, bids → selling. `filled` is false if the top-N levels can't absorb
 * the whole target (vwap is then over what's available).
 */
function vwapForNotional(
  levels: Level[],
  targetUsd: number,
): { vwap: number; filled: boolean } | null {
  if (!levels || !levels.length || !(targetUsd > 0)) return null;
  let baseAcc = 0;
  let usdAcc = 0;
  for (const [price, amount] of levels) {
    if (!(price > 0) || !(amount > 0)) continue;
    const levelUsd = price * amount;
    const takeUsd = Math.min(levelUsd, targetUsd - usdAcc);
    if (takeUsd <= 0) break;
    baseAcc += takeUsd / price;
    usdAcc += takeUsd;
    if (usdAcc >= targetUsd) break;
  }
  if (baseAcc <= 0) return null;
  return { vwap: usdAcc / baseAcc, filled: usdAcc >= targetUsd * 0.999 };
}

function toLeg(
  item: any,
  direction: 'long' | 'short',
  book: DepthBook | undefined,
  volumeUsd: number,
): ArbitrageLeg {
  // long = buy → asks; short = sell → bids.
  const levels = direction === 'long' ? book?.asks : book?.bids;
  const eff = volumeUsd > 0 ? vwapForNotional(levels as Level[], volumeUsd) : null;
  // Reference price is the LIVE top-of-book on the side we'd actually trade (bestAsk to buy,
  // bestBid to sell) — not the klines `last` (which lags up to 5m). This keeps eff on the correct
  // side of it: eff(buy) >= bestAsk, eff(sell) <= bestBid. Fall back to `last` when no book yet.
  // The book side we'd trade is guaranteed present (computeOpportunities only keeps pairs with a
  // full book), so bookTop is the live bestAsk (buy) / bestBid (sell).
  const bookTop =
    levels && levels[0] && Number(levels[0][0]) > 0 ? Number(levels[0][0]) : 0;
  return {
    tradingServiceId: item.pair.tradingServiceId,
    tradingServiceName: item.service.name,
    pairId: item.pair.id,
    symbol: item.pair.symbol,
    price: bookTop,
    effPrice: eff ? eff.vwap : null,
    effFilled: eff ? eff.filled : false,
    takerFee: Number(item.service.takerFee ?? 0),
    direction,
  };
}

function bestSide(book: DepthBook | undefined, side: 'ask' | 'bid'): number | null {
  const lv = side === 'ask' ? book?.asks : book?.bids;
  return lv && lv[0] && Number(lv[0][0]) > 0 ? Number(lv[0][0]) : null;
}

function buildCombo(
  a: any,
  b: any,
  depth: Record<number, DepthBook>,
  volumeUsd: number,
): ArbitrageCombo {
  // Pick the profitable direction from the LIVE book: buy where the ask is low, sell where the bid
  // is high. Compare both directions' top-of-book spreads.
  const askA = bestSide(depth[a.pair.id], 'ask') as number;
  const bidA = bestSide(depth[a.pair.id], 'bid') as number;
  const askB = bestSide(depth[b.pair.id], 'ask') as number;
  const bidB = bestSide(depth[b.pair.id], 'bid') as number;
  const spreadLongA = (bidB - askA) / askA; // long A (buy A), short B (sell B)
  const spreadLongB = (bidA - askB) / askB; // long B (buy B), short A (sell A)
  const longItem = spreadLongA >= spreadLongB ? a : b;
  const shortItem = spreadLongA >= spreadLongB ? b : a;

  const long = toLeg(longItem, 'long', depth[longItem.pair.id], volumeUsd);
  const short = toLeg(shortItem, 'short', depth[shortItem.pair.id], volumeUsd);

  // Executable top-of-book spread: buy at long.price (bestAsk), sell at short.price (bestBid).
  const priceDiffPercent = ((short.price - long.price) / long.price) * 100;

  // Volume-adjusted spread (VWAP): buy at long.effPrice, sell at short.effPrice.
  let effProfitPercent: number | null = null;
  if (long.effPrice != null && short.effPrice != null && long.effPrice > 0) {
    const effDiff = ((short.effPrice - long.effPrice) / long.effPrice) * 100;
    effProfitPercent = effDiff - long.takerFee - short.takerFee;
  }

  return {
    key: `${longItem.pair.name}-${long.tradingServiceId}-${short.tradingServiceId}`,
    priceDiffPercent,
    long,
    short,
    netProfitPercent: priceDiffPercent - long.takerFee - short.takerFee,
    effProfitPercent,
  };
}

function computeOpportunities(
  pairs: any,
  depth: Record<number, DepthBook>,
  volumeUsd: number,
): ArbitrageOpportunity[] {
  const byName = new Map<string, any[]>();
  for (const pair of pairs || []) {
    const service = pair.tradingService;
    if (!service || service.activated === false) continue;
    // A pair is "live" when it has a full order book (both a bid and an ask). Prices come entirely
    // from the book now — no dependency on the klines price feed.
    const book = depth[pair.id];
    if (!bestSide(book, 'ask') || !bestSide(book, 'bid')) continue;
    const list = byName.get(pair.name) || [];
    list.push({ pair, service });
    byName.set(pair.name, list);
  }

  const opportunities: ArbitrageOpportunity[] = [];
  for (const [name, list] of byName.entries()) {
    if (list.length < 2) continue;
    const combos: ArbitrageCombo[] = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].pair.id === list[j].pair.id) continue;
        combos.push(buildCombo(list[i], list[j], depth, volumeUsd));
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
      {/* Effective (VWAP) price for the chosen volume. */}
      <Tooltip title={leg.effFilled ? 'Средняя цена исполнения на выбранный объём' : 'Стакана не хватает на весь объём — цена по доступной глубине'}>
        <Typography
          variant='caption'
          color={leg.effPrice == null ? 'text.disabled' : leg.effFilled ? 'primary.main' : 'warning.main'}
        >
          eff: {fmtPrice(leg.effPrice)}{leg.effPrice != null && !leg.effFilled ? ' ⚠' : ''}
        </Typography>
      </Tooltip>
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
        {combo.effProfitPercent == null ? (
          <Typography variant='caption' color='text.secondary'>
            n/a
          </Typography>
        ) : (
          <Label color={combo.effProfitPercent > 0 ? 'success' : 'error'}>
            {fmtPct(combo.effProfitPercent)}
          </Label>
        )}
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
          <TableCell sx={{ py: 0, borderBottom: 'none' }} colSpan={7}>
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
                      <TableCell sx={{ textAlign: 'right' }}>Профит (объём)</TableCell>
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

  const depthRef = useRef<Record<number, DepthBook>>({});
  const [tick, setTick] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  // Entry volume (USDT notional per leg) used to compute effective execution prices.
  const [volumeUsd, setVolumeUsd] = useState<number>(1000);

  const { sendJsonMessage: sendDepth, readyState: depthReady } = useWebSocket(
    getOrderbookDepthWebSocketUrl(),
    {
      share: false,
      shouldReconnect: () => true,
      onMessage: (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg?.type === 'depthSnapshot' && msg.data) {
            const next: Record<number, DepthBook> = {};
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
    if (depthReady === ReadyState.OPEN) sendDepth(SUBSCRIBE_ALL_DEPTH);
  }, [depthReady]);

  // Recompute the table every 3 seconds from the latest order books.
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setUpdatedAt(Date.now());
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const opportunities = useMemo(
    () => computeOpportunities(pairs || [], depthRef.current, volumeUsd),
    [pairs, tick, volumeUsd],
  );

  const connectionLabel = useMemo(() => {
    const color =
      depthReady === ReadyState.OPEN
        ? 'success'
        : depthReady === ReadyState.CONNECTING
        ? 'warning'
        : 'error';
    return <Label color={color as any}>стакан</Label>;
  }, [depthReady]);

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
              <TextField
                size='small'
                label='Объём входа'
                type='number'
                value={volumeUsd}
                onChange={(e) => setVolumeUsd(Math.max(0, Number(e.target.value) || 0))}
                sx={{ width: 160 }}
                InputProps={{
                  endAdornment: <InputAdornment position='end'>USDT</InputAdornment>,
                }}
              />
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
                <TableCell sx={{ textAlign: 'right' }}>Профит (объём)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {opportunities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
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

'use client'

import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useEffect, useRef, useState } from "react";
import Label from "src/components/label";
import {
  getOrderbookDepthWebSocketUrl,
  SUBSCRIBE_ALL_DEPTH,
} from "@/src/utils/orderbookDepthWebSocket";

export { SUBSCRIBE_ALL_DEPTH };

export const ARB_VOLUME_STORAGE_KEY = 'arbVolumeUsd';
export const ARB_LEVERAGE_STORAGE_KEY = 'arbLeverage';
export const ARB_SERVICE_FILTER_STORAGE_KEY = 'arbServiceFilter';
// Max number of "other combinations" shown in the expandable list under a pair.
export const MAX_OTHER_COMBOS = 10;

export type Level = [number, number]; // [price, amount(base)]
export interface DepthBook {
  pairId: number;
  ts: number;
  bids: Level[]; // best-first (descending)
  asks: Level[]; // best-first (ascending)
}

export interface FundingInfo {
  rate: number | null; // fraction per interval (0.0001 = 0.01%)
  intervalHours: number; // funding interval in hours
  nextFundingTime: number | null;
}
export type FundingMap = Record<number, FundingInfo>;

export interface LimitInfo {
  minAmount: number | null; // min order size in base coins
  minCost: number | null; // min order notional (quote)
  contractSize: number | null;
}
export type LimitMap = Record<number, LimitInfo>;

export interface ArbitrageLeg {
  tradingServiceId: number;
  tradingServiceName: string;
  pairId: number;
  symbol: string;
  price: number; // best (top-of-book) price
  effPrice: number | null; // VWAP for the chosen volume (null = no book)
  effFilled: boolean; // could the book fully absorb the volume?
  takerFee: number;
  direction: 'long' | 'short';
  fundingRate: number | null; // fraction per interval on this exchange
  fundingIntervalHours: number;
}

export interface ArbitrageCombo {
  key: string;
  priceDiffPercent: number;
  long: ArbitrageLeg;
  short: ArbitrageLeg;
  netProfitPercent: number; // from top prices
  effProfitPercent: number | null; // from effective (VWAP) prices, minus fees
  netFundingDayPct: number | null;
  daysToEatProfit: number | null;
  minVolumeUsd: number | null;
}

export interface ArbitrageOpportunity {
  name: string;
  best: ArbitrageCombo;
  others: ArbitrageCombo[];
}

export interface Selection {
  name: string;
  combo: ArbitrageCombo;
}

export const fmtPrice = (value: number | null) =>
  value == null ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: 8 });
export const fmtPct = (value: number | null) =>
  value == null ? '—' : `${Number(value).toFixed(3)}%`;
export const fmtUsd = (value: number | null) => {
  if (value == null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
};
export const fmtSignedPct = (value: number | null) =>
  value == null ? '—' : `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(3)}%`;

// Compact funding cell: net funding per day and, if adverse, how fast it eats the spread.
export function FundingCell({ combo }: { combo: ArbitrageCombo }) {
  const net = combo.netFundingDayPct;
  if (net == null) {
    return (
      <Typography variant='caption' color='text.secondary'>
        n/a
      </Typography>
    );
  }
  const days = combo.daysToEatProfit;
  const eatsFast = days != null && days <= 1; // funding eats the whole spread within a day
  return (
    <Tooltip
      title={
        `LONG ${combo.long.tradingServiceName}: ${fmtSignedPct((combo.long.fundingRate ?? 0) * 100)} /${combo.long.fundingIntervalHours}ч (платим)\n` +
        `SHORT ${combo.short.tradingServiceName}: ${fmtSignedPct((combo.short.fundingRate ?? 0) * 100)} /${combo.short.fundingIntervalHours}ч (получаем)\n` +
        `Нетто ${net >= 0 ? 'в плюс' : 'в минус'}, приведено к суткам`
      }
    >
      <Stack spacing={0.25} alignItems='flex-end'>
        <Label color={net >= 0 ? 'success' : eatsFast ? 'error' : 'warning'}>
          {fmtSignedPct(net)}/сут
        </Label>
        {days != null && (
          <Typography
            variant='caption'
            color={eatsFast ? 'error.main' : 'warning.main'}
          >
            {eatsFast ? '⚠ ' : ''}
            съест за {days < 1 ? '<1д' : `~${days.toFixed(1)}д`}
          </Typography>
        )}
      </Stack>
    </Tooltip>
  );
}

/**
 * Walk one side of the book to spend `targetUsd` (quote notional) and return the volume-weighted
 * average price. asks → buying, bids → selling. `filled` is false if the top-N levels can't absorb
 * the whole target (vwap is then over what's available).
 */
export function vwapForNotional(
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

export function toLeg(
  item: any,
  direction: 'long' | 'short',
  book: DepthBook | undefined,
  volumeUsd: number,
  funding?: FundingInfo,
): ArbitrageLeg {
  // long = buy → asks; short = sell → bids.
  const levels = direction === 'long' ? book?.asks : book?.bids;
  const eff = volumeUsd > 0 ? vwapForNotional(levels as Level[], volumeUsd) : null;
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
    fundingRate: funding?.rate ?? null,
    fundingIntervalHours: funding?.intervalHours ?? 8,
  };
}

export function bestSide(book: DepthBook | undefined, side: 'ask' | 'bid'): number | null {
  const lv = side === 'ask' ? book?.asks : book?.bids;
  return lv && lv[0] && Number(lv[0][0]) > 0 ? Number(lv[0][0]) : null;
}

// Minimum entry volume (USDT) for one leg = max(minAmount×price, minCost).
export function legMinVolume(leg: ArbitrageLeg, limits: LimitMap): number | null {
  const lim = limits[leg.pairId];
  if (!lim) return null;
  const byAmount = lim.minAmount != null && leg.price > 0 ? lim.minAmount * leg.price : 0;
  const byCost = lim.minCost != null ? lim.minCost : 0;
  const m = Math.max(byAmount, byCost);
  return m > 0 ? m : null;
}

export function buildCombo(
  a: any,
  b: any,
  depth: Record<number, DepthBook>,
  volumeUsd: number,
  funding: FundingMap,
  limits: LimitMap,
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

  const long = toLeg(longItem, 'long', depth[longItem.pair.id], volumeUsd, funding[longItem.pair.id]);
  const short = toLeg(shortItem, 'short', depth[shortItem.pair.id], volumeUsd, funding[shortItem.pair.id]);

  // Executable top-of-book spread: buy at long.price (bestAsk), sell at short.price (bestBid).
  const priceDiffPercent = ((short.price - long.price) / long.price) * 100;

  // Volume-adjusted spread (VWAP): buy at long.effPrice, sell at short.effPrice.
  let effProfitPercent: number | null = null;
  if (long.effPrice != null && short.effPrice != null && long.effPrice > 0) {
    const effDiff = ((short.effPrice - long.effPrice) / long.effPrice) * 100;
    effProfitPercent = effDiff - long.takerFee - short.takerFee;
  }

  const netProfitPercent = priceDiffPercent - long.takerFee - short.takerFee;

  // Net funding per DAY (% of notional). Long pays its rate each interval; short receives its rate.
  let netFundingDayPct: number | null = null;
  if (long.fundingRate != null && short.fundingRate != null) {
    const dailyLong = -long.fundingRate * (24 / long.fundingIntervalHours);
    const dailyShort = short.fundingRate * (24 / short.fundingIntervalHours);
    netFundingDayPct = (dailyShort + dailyLong) * 100;
  }

  // Days for adverse funding to eat the captured spread.
  let daysToEatProfit: number | null = null;
  if (netFundingDayPct != null && netFundingDayPct < 0 && netProfitPercent > 0) {
    daysToEatProfit = netProfitPercent / Math.abs(netFundingDayPct);
  }

  const legMins = [legMinVolume(long, limits), legMinVolume(short, limits)].filter(
    (v): v is number => v != null,
  );
  const minVolumeUsd = legMins.length ? Math.max(...legMins) : null;

  return {
    key: `${longItem.pair.name}-${long.tradingServiceId}-${short.tradingServiceId}`,
    priceDiffPercent,
    long,
    short,
    netProfitPercent,
    effProfitPercent,
    netFundingDayPct,
    daysToEatProfit,
    minVolumeUsd,
  };
}

export function computeOpportunities(
  pairs: any,
  depth: Record<number, DepthBook>,
  volumeUsd: number,
  funding: FundingMap,
  limits: LimitMap,
  serviceFilter: Set<number>,
): ArbitrageOpportunity[] {
  const byName = new Map<string, any[]>();
  for (const pair of pairs || []) {
    const service = pair.tradingService;
    if (!service || service.activated === false) continue;
    // When a filter is set, only keep pairs on the selected trading services (empty = all).
    if (serviceFilter.size && !serviceFilter.has(service.id)) continue;
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
        combos.push(buildCombo(list[i], list[j], depth, volumeUsd, funding, limits));
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

export function LegCell({ leg }: { leg: ArbitrageLeg }) {
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

export function ComboCells({ combo }: { combo: ArbitrageCombo }) {
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
      <TableCell sx={{ textAlign: 'right' }}>
        <FundingCell combo={combo} />
      </TableCell>
    </>
  );
}

// ---- order-book popup: how an entry of `volumeUsd` walks the book ----

interface WalkRow {
  price: number;
  size: number;
  levelUsd: number;
  cumUsd: number;
  fillFrac: number; // 0..1 — how much of THIS level the entry consumes
}
// Amounts already arrive in base coins (tr-v3-orderbook-client normalizes by contractSize), so no
// scaling is needed here. Kept as a constant in case a display scale is ever wanted.
export const SIZE_DIVISOR = 1;
export function walkBook(levels: Level[], targetUsd: number) {
  const rows: WalkRow[] = [];
  let cumUsd = 0;
  let filledUsd = 0;
  let filledBase = 0;
  for (const [price, rawSize] of levels || []) {
    const size = rawSize / SIZE_DIVISOR;
    if (!(price > 0) || !(size > 0)) continue;
    const levelUsd = price * size;
    const remaining = Math.max(0, targetUsd - cumUsd);
    const takenUsd = Math.min(levelUsd, remaining);
    if (takenUsd > 0) {
      filledUsd += takenUsd;
      filledBase += takenUsd / price;
    }
    cumUsd += levelUsd;
    rows.push({ price, size, levelUsd, cumUsd, fillFrac: levelUsd > 0 ? takenUsd / levelUsd : 0 });
  }
  const vwap = filledBase > 0 ? filledUsd / filledBase : null;
  return { rows, vwap, filledUsd, filledBase, filled: filledUsd >= targetUsd * 0.999 };
}

export const DEPTH_DIALOG_LEVELS = 14;

export function LegDepthPanel({ leg, book, volumeUsd }: { leg: ArbitrageLeg; book?: DepthBook; volumeUsd: number }) {
  const isLong = leg.direction === 'long';
  const side = isLong ? 'success' : 'error'; // buy=asks(green here as "long"), sell=bids(red as "short")
  const accent = isLong ? '#36B37E' : '#FF5630';
  const levels = ((isLong ? book?.asks : book?.bids) || []).slice(0, DEPTH_DIALOG_LEVELS);
  const walk = walkBook(levels, volumeUsd);
  const best = levels[0]?.[0] ?? null;
  const shiftPct =
    best && walk.vwap ? (isLong ? (walk.vwap / best - 1) * 100 : (1 - walk.vwap / best) * 100) : null;
  const maxUsd = Math.max(1, ...levels.map((l) => (l[0] * l[1]) / SIZE_DIVISOR));

  return (
    <Card variant='outlined' sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
          <Label color={side as any}>{isLong ? 'LONG · BUY' : 'SHORT · SELL'}</Label>
          <Typography variant='subtitle2'>{leg.tradingServiceName}</Typography>
        </Stack>

        <Table size='small' sx={{ '& td': { py: 0.25, border: 0 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ py: 0.5 }}>Цена</TableCell>
              <TableCell sx={{ py: 0.5, textAlign: 'right' }}>Объём</TableCell>
              <TableCell sx={{ py: 0.5, textAlign: 'right' }}>Σ USDT</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {levels.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} sx={{ textAlign: 'center', color: 'text.secondary' }}>
                  нет стакана
                </TableCell>
              </TableRow>
            )}
            {walk.rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell sx={{ position: 'relative' }}>
                  {/* depth bar */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: 2,
                      bottom: 2,
                      width: `${Math.min(100, (r.levelUsd / maxUsd) * 100)}%`,
                      bgcolor: accent,
                      opacity: r.fillFrac > 0 ? 0.28 : 0.1,
                      borderRadius: 0.5,
                    }}
                  />
                  <Typography
                    variant='caption'
                    sx={{ position: 'relative', fontWeight: r.fillFrac > 0 ? 700 : 400, color: accent }}
                  >
                    {fmtPrice(r.price)}
                    {r.fillFrac > 0 && r.fillFrac < 1 ? ' ◀' : ''}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <Typography variant='caption'>{r.size.toLocaleString('en-US', { maximumFractionDigits: 4 })}</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <Typography variant='caption' color='text.secondary'>{fmtUsd(r.cumUsd)}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Divider sx={{ my: 1 }} />
        <Stack spacing={0.5}>
          <Row label='Лучшая цена' value={fmtPrice(best)} />
          <Row
            label='Средняя цена входа'
            value={walk.vwap != null ? `${fmtPrice(walk.vwap)}${shiftPct != null ? `  (${isLong ? '+' : '−'}${Math.abs(shiftPct).toFixed(3)}%)` : ''}` : '—'}
            strong
          />
          <Row
            label='Наберётся'
            value={`${fmtUsd(walk.filledUsd)} · ${walk.filledBase.toLocaleString('en-US', { maximumFractionDigits: 4 })}`}
          />
          {!walk.filled && (
            <Typography variant='caption' color='warning.main'>
              ⚠ стакана не хватает на весь объём — цена по доступной глубине
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack direction='row' justifyContent='space-between' alignItems='center'>
      <Typography variant='caption' color='text.secondary'>{label}</Typography>
      <Typography variant={strong ? 'subtitle2' : 'caption'}>{value}</Typography>
    </Stack>
  );
}

// "Войти" button — warns (orange) when the entry volume is below the combo's market minimum, so the
// user can't unknowingly try a size that one leg would reject.
export function EnterButton({
  combo,
  volumeUsd,
  entering,
  onEnter,
  variant,
}: {
  combo: ArbitrageCombo;
  volumeUsd: number;
  entering: boolean;
  onEnter: (c: ArbitrageCombo) => void;
  variant: 'contained' | 'outlined';
}) {
  const belowMin = combo.minVolumeUsd != null && volumeUsd < combo.minVolumeUsd;
  return (
    <Tooltip title={belowMin ? `Объём ниже минимума ${fmtUsd(combo.minVolumeUsd)}/ногу — увеличьте вход` : ''}>
      <span>
        <Button
          size='small'
          variant={variant}
          color={belowMin ? 'warning' : 'success'}
          disabled={entering}
          onClick={(e) => {
            e.stopPropagation();
            onEnter(combo);
          }}
        >
          Войти{belowMin ? ' ⚠' : ''}
        </Button>
      </span>
    </Tooltip>
  );
}

// Shared depth WebSocket: subscribes to ALL order books and keeps the latest snapshot in a ref.
// The ref holds the raw data (no re-render on mutation); `depthUpdatedAt` bumps to a fresh
// timestamp on every snapshot so consumers re-render exactly when new data arrives.
export function useDepthSocket() {
  const depthRef = useRef<Record<number, DepthBook>>({});
  const [depthUpdatedAt, setDepthUpdatedAt] = useState<number | null>(null);
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
            setDepthUpdatedAt(Date.now());
          }
        } catch {}
      },
    },
  );
  useEffect(() => {
    if (depthReady === ReadyState.OPEN) sendDepth(SUBSCRIBE_ALL_DEPTH);
  }, [depthReady]);
  return { depthRef, depthReady, depthUpdatedAt, ReadyState };
}

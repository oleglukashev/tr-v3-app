'use client'

import Container from "@mui/material/Container";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
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
  useCreateMutation as useCreateArbitrageSession,
  useGetFundingQuery,
  useGetLimitsQuery,
} from "@/lib/redux/api/arbitrageSessionApi";
import { useSnackbar } from "notistack";
import {
  getOrderbookDepthWebSocketUrl,
  SUBSCRIBE_ALL_DEPTH,
} from "@/src/utils/orderbookDepthWebSocket";

const ARB_VOLUME_STORAGE_KEY = 'arbVolumeUsd';
const ARB_LEVERAGE_STORAGE_KEY = 'arbLeverage';
const ARB_SERVICE_FILTER_STORAGE_KEY = 'arbServiceFilter';

type Level = [number, number]; // [price, amount(base)]
interface DepthBook {
  pairId: number;
  ts: number;
  bids: Level[]; // best-first (descending)
  asks: Level[]; // best-first (ascending)
}

interface FundingInfo {
  rate: number | null; // fraction per interval (0.0001 = 0.01%)
  intervalHours: number; // funding interval in hours
  nextFundingTime: number | null;
}
type FundingMap = Record<number, FundingInfo>;

interface LimitInfo {
  minAmount: number | null; // min order size in base coins
  minCost: number | null; // min order notional (quote)
  contractSize: number | null;
}
type LimitMap = Record<number, LimitInfo>;

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
  fundingRate: number | null; // fraction per interval on this exchange
  fundingIntervalHours: number;
}

interface ArbitrageCombo {
  key: string;
  priceDiffPercent: number;
  long: ArbitrageLeg;
  short: ArbitrageLeg;
  netProfitPercent: number; // from top prices
  effProfitPercent: number | null; // from effective (VWAP) prices, minus fees
  // Net funding while holding the position, in % of notional. Positive = we EARN, negative = we PAY.
  // long pays fundingRate each interval; short receives it. Annualised to per-day here.
  netFundingDayPct: number | null;
  // Days for adverse funding to consume the captured spread (netProfitPercent). null when funding is
  // neutral/favorable or unknown.
  daysToEatProfit: number | null;
  // Minimum entry volume (USDT/leg) so BOTH legs clear their market minimum. null when unknown.
  minVolumeUsd: number | null;
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
const fmtUsd = (value: number | null) => {
  if (value == null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
};
const fmtSignedPct = (value: number | null) =>
  value == null ? '—' : `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(3)}%`;

// Compact funding cell: net funding per day and, if adverse, how fast it eats the spread.
function FundingCell({ combo }: { combo: ArbitrageCombo }) {
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
  funding?: FundingInfo,
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
    fundingRate: funding?.rate ?? null,
    fundingIntervalHours: funding?.intervalHours ?? 8,
  };
}

function bestSide(book: DepthBook | undefined, side: 'ask' | 'bid'): number | null {
  const lv = side === 'ask' ? book?.asks : book?.bids;
  return lv && lv[0] && Number(lv[0][0]) > 0 ? Number(lv[0][0]) : null;
}

// Minimum entry volume (USDT) for one leg = max(minAmount×price, minCost).
function legMinVolume(leg: ArbitrageLeg, limits: LimitMap): number | null {
  const lim = limits[leg.pairId];
  if (!lim) return null;
  const byAmount = lim.minAmount != null && leg.price > 0 ? lim.minAmount * leg.price : 0;
  const byCost = lim.minCost != null ? lim.minCost : 0;
  const m = Math.max(byAmount, byCost);
  return m > 0 ? m : null;
}

function buildCombo(
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
  //   dailyLong  = -rateLong  * (24 / intervalLong)   (a cost)
  //   dailyShort = +rateShort * (24 / intervalShort)  (income)
  // Positive net = we earn funding; negative = we pay. Neutral when rates match & cancel.
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

function computeOpportunities(
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
const SIZE_DIVISOR = 1;
function walkBook(levels: Level[], targetUsd: number) {
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

const DEPTH_DIALOG_LEVELS = 14;

function LegDepthPanel({ leg, book, volumeUsd }: { leg: ArbitrageLeg; book?: DepthBook; volumeUsd: number }) {
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

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack direction='row' justifyContent='space-between' alignItems='center'>
      <Typography variant='caption' color='text.secondary'>{label}</Typography>
      <Typography variant={strong ? 'subtitle2' : 'caption'}>{value}</Typography>
    </Stack>
  );
}

interface Selection {
  name: string;
  combo: ArbitrageCombo;
}

function ArbitrageDepthDialog({
  selection,
  depth,
  volumeUsd,
  onClose,
}: {
  selection: Selection | null;
  depth: Record<number, DepthBook>;
  volumeUsd: number;
  onClose: () => void;
}) {
  const combo = selection?.combo;
  return (
    <Dialog open={!!selection} onClose={onClose} maxWidth='md' fullWidth>
      {combo && (
        <>
          <DialogTitle>
            <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap'>
              <Typography variant='h6'>{selection!.name}</Typography>
              <Label color='info'>Разница {fmtPct(combo.priceDiffPercent)}</Label>
              <Label color={combo.netProfitPercent > 0 ? 'success' : 'error'}>
                Профит {fmtPct(combo.netProfitPercent)}
              </Label>
              {combo.effProfitPercent != null && (
                <Label color={combo.effProfitPercent > 0 ? 'success' : 'error'}>
                  Профит на объём {fmtPct(combo.effProfitPercent)}
                </Label>
              )}
              <Typography variant='caption' color='text.secondary'>
                вход {fmtUsd(volumeUsd)} на ногу
              </Typography>
              {combo.minVolumeUsd != null && (
                <Label color={volumeUsd < combo.minVolumeUsd ? 'error' : 'default'}>
                  мин. {fmtUsd(combo.minVolumeUsd)}/ногу
                  {volumeUsd < combo.minVolumeUsd ? ' ⚠ мало' : ''}
                </Label>
              )}
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                flexDirection: { xs: 'column', md: 'row' },
                mt: 0.5,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <LegDepthPanel leg={combo.long} book={depth[combo.long.pairId]} volumeUsd={volumeUsd} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <LegDepthPanel leg={combo.short} book={depth[combo.short.pairId]} volumeUsd={volumeUsd} />
              </Box>
            </Box>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}

// "Войти" button — warns (orange) when the entry volume is below the combo's market minimum, so the
// user can't unknowingly try a size that one leg would reject.
function EnterButton({
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

function OpportunityRow({
  item,
  onOpen,
  onEnter,
  entering,
  volumeUsd,
}: {
  item: ArbitrageOpportunity;
  onOpen: (name: string, combo: ArbitrageCombo) => void;
  onEnter: (c: ArbitrageCombo) => void;
  entering: boolean;
  volumeUsd: number;
}) {
  const [open, setOpen] = useState(false);
  const hasOthers = item.others.length > 0;
  return (
    <>
      <TableRow
        hover
        onClick={() => onOpen(item.name, item.best)}
        sx={{ cursor: 'pointer' }}
      >
        <TableCell sx={{ width: 48 }}>
          {hasOthers && (
            <IconButton
              size='small'
              onClick={(e) => {
                e.stopPropagation();
                setOpen((v) => !v);
              }}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>
          <Typography variant='subtitle2'>{item.name}</Typography>
        </TableCell>
        <ComboCells combo={item.best} />
        <TableCell sx={{ textAlign: 'right' }}>
          <EnterButton
            combo={item.best}
            volumeUsd={volumeUsd}
            entering={entering}
            onEnter={onEnter}
            variant='contained'
          />
        </TableCell>
      </TableRow>
      {hasOthers && (
        <TableRow>
          <TableCell sx={{ py: 0, borderBottom: 'none' }} colSpan={9}>
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
                      <TableCell sx={{ textAlign: 'right' }}>Фандинг/сут</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {item.others.map((combo) => (
                      <TableRow
                        key={combo.key}
                        hover
                        onClick={() => onOpen(item.name, combo)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <ComboCells combo={combo} />
                        <TableCell sx={{ textAlign: 'right' }}>
                          <EnterButton
                            combo={combo}
                            volumeUsd={volumeUsd}
                            entering={entering}
                            onEnter={onEnter}
                            variant='outlined'
                          />
                        </TableCell>
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
  // Funding rates per pairId (refetched server-side ≤60s; poll here every 30s).
  const { data: fundingData } = useGetFundingQuery({} as any, {
    pollingInterval: 30000,
  });
  const funding: FundingMap = (fundingData as any) || {};
  // Market min-order limits (change rarely; refetch every 5 min).
  const { data: limitsData } = useGetLimitsQuery({} as any, {
    pollingInterval: 300000,
  });
  const limits: LimitMap = (limitsData as any) || {};

  const { enqueueSnackbar } = useSnackbar();
  const [createSession, { isLoading: entering }] = useCreateArbitrageSession();

  const depthRef = useRef<Record<number, DepthBook>>({});
  const [tick, setTick] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  // Entry volume (USDT notional per leg). Persisted in localStorage.
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
  // Leverage used when opening positions. Persisted in localStorage.
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
  // Trading-service filter (empty = show all). Persisted in localStorage.
  const [serviceFilterIds, setServiceFilterIds] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(ARB_SERVICE_FILTER_STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        if (Array.isArray(arr)) return arr.map(Number).filter((n) => n > 0);
      } catch (_) {}
    }
    return [];
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        ARB_SERVICE_FILTER_STORAGE_KEY,
        JSON.stringify(serviceFilterIds),
      );
    }
  }, [serviceFilterIds]);
  const serviceFilter = useMemo(() => new Set(serviceFilterIds), [serviceFilterIds]);
  // Distinct trading services present in the pairs, for the filter dropdown.
  const services = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of (pairs as any[]) || []) {
      const s = p.tradingService;
      if (s?.id != null && !m.has(s.id)) m.set(s.id, s.name);
    }
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pairs]);
  // Opportunity whose order-book popup is open.
  const [selected, setSelected] = useState<Selection | null>(null);

  // Open a real arbitrage position: buy (long) on long.pairId, sell (short) on short.pairId.
  const handleEnter = async (combo: ArbitrageCombo) => {
    const confirmed = window.confirm(
      `Открыть арбитраж на ${fmtUsd(volumeUsd)}/ногу ×${leverage}?\n` +
        `LONG ${combo.long.tradingServiceName} (${fmtPrice(combo.long.price)})\n` +
        `SHORT ${combo.short.tradingServiceName} (${fmtPrice(combo.short.price)})`,
    );
    if (!confirmed) return;
    try {
      const res: any = await createSession({
        longPairId: combo.long.pairId,
        shortPairId: combo.short.pairId,
        amountUsd: volumeUsd,
        leverage: leverage > 0 ? leverage : undefined,
        // Expected fill = VWAP walking our order book for the entry volume (liquidity-aware).
        longExpectedPrice: combo.long.effPrice ?? undefined,
        shortExpectedPrice: combo.short.effPrice ?? undefined,
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
    () => computeOpportunities(pairs || [], depthRef.current, volumeUsd, funding, limits, serviceFilter),
    [pairs, tick, volumeUsd, fundingData, limitsData, serviceFilter],
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
              <TextField
                size='small'
                label='Плечо'
                type='number'
                value={leverage}
                onChange={(e) => setLeverage(Math.max(1, Number(e.target.value) || 1))}
                sx={{ width: 100 }}
                inputProps={{ min: 1, step: 1 }}
                InputProps={{
                  endAdornment: <InputAdornment position='end'>×</InputAdornment>,
                }}
              />
              <FormControl size='small' sx={{ width: 240 }}>
                <InputLabel id='arb-service-filter-label'>Площадки</InputLabel>
                <Select
                  labelId='arb-service-filter-label'
                  multiple
                  value={serviceFilterIds}
                  onChange={(e) => {
                    const v = e.target.value;
                    setServiceFilterIds(
                      (typeof v === 'string' ? v.split(',').map(Number) : v) as number[],
                    );
                  }}
                  input={<OutlinedInput label='Площадки' />}
                  renderValue={(selectedIds) =>
                    (selectedIds as number[]).length === 0
                      ? 'Все'
                      : services
                          .filter((s) => (selectedIds as number[]).includes(s.id))
                          .map((s) => s.name)
                          .join(', ')
                  }
                >
                  {services.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      <Checkbox checked={serviceFilterIds.includes(s.id)} />
                      <ListItemText primary={s.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                <TableCell sx={{ textAlign: 'right' }}>Фандинг/сут</TableCell>
                <TableCell sx={{ textAlign: 'right' }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {opportunities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Нет арбитражных данных
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {opportunities.map((item) => (
                <OpportunityRow
                  key={item.name}
                  item={item}
                  onOpen={(name, combo) => setSelected({ name, combo })}
                  onEnter={handleEnter}
                  entering={entering}
                  volumeUsd={volumeUsd}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ArbitrageDepthDialog
        selection={selected}
        depth={depthRef.current}
        volumeUsd={volumeUsd}
        onClose={() => setSelected(null)}
      />
    </Container>
  );
}

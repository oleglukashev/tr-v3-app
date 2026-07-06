'use client'

import Container from "@mui/material/Container";
import {
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
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
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { ReadyState } from 'react-use-websocket';
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  ARB_VOLUME_STORAGE_KEY,
  ARB_LEVERAGE_STORAGE_KEY,
  ARB_SERVICE_FILTER_STORAGE_KEY,
  MAX_OTHER_COMBOS,
  ArbitrageCombo,
  ArbitrageOpportunity,
  ComboCells,
  DepthBook,
  EnterButton,
  FundingMap,
  LegDepthPanel,
  LimitMap,
  Selection,
  computeOpportunities,
  fmtPct,
  fmtPrice,
  fmtUsd,
  useDepthSocket,
} from "../shared";

// Chart-link icon: opens the spread graph page for this combination's two legs.
function GraphLink({ name, combo }: { name: string; combo: ArbitrageCombo }) {
  const router = useRouter();
  return (
    <Tooltip title='График спреда'>
      <IconButton
        size='small'
        onClick={(e) => {
          e.stopPropagation();
          router.push(
            `/arbitrage-graph?name=${encodeURIComponent(name)}&longPairId=${combo.long.pairId}&shortPairId=${combo.short.pairId}`,
          );
        }}
      >
        <ShowChartIcon fontSize='small' />
      </IconButton>
    </Tooltip>
  );
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
          <Stack direction='row' spacing={0.5} justifyContent='flex-end' alignItems='center'>
            <GraphLink name={item.name} combo={item.best} />
            <EnterButton
              combo={item.best}
              volumeUsd={volumeUsd}
              entering={entering}
              onEnter={onEnter}
              variant='contained'
            />
          </Stack>
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
                    {item.others.slice(0, MAX_OTHER_COMBOS).map((combo) => (
                      <TableRow
                        key={combo.key}
                        hover
                        onClick={() => onOpen(item.name, combo)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <ComboCells combo={combo} />
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Stack direction='row' spacing={0.5} justifyContent='flex-end' alignItems='center'>
                            <GraphLink name={item.name} combo={combo} />
                            <EnterButton
                              combo={combo}
                              volumeUsd={volumeUsd}
                              entering={entering}
                              onEnter={onEnter}
                              variant='outlined'
                            />
                          </Stack>
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

  const { depthRef, depthReady } = useDepthSocket();
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

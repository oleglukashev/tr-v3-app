'use client'

import Container from "@mui/material/Container";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Box from "@mui/material/Box";
import Label from "src/components/label";
import moment from "moment";
import {
  useGetAllQuery,
  useRemoveMutation,
  useCloseSessionMutation,
} from "@/lib/redux/api/arbitrageSessionApi";
import { useSnackbar } from "notistack";

// Statuses where positions are (or may be) open, so a market close makes sense.
const CLOSABLE = new Set(['created', 'failed']);

const fmtPrice = (v: any) =>
  v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 8 });
const fmtPct = (v: any) => (v == null ? '—' : `${Number(v).toFixed(3)}%`);
const fmtUsd = (v: any) => (v == null ? '—' : `$${Number(v).toFixed(2)}`);

const STATUS_COLOR: Record<string, any> = {
  created: 'info',
  success: 'success',
  stoploss: 'warning',
  failed: 'error',
};

export default function ArbitrageStatsIndexView() {
  // Poll — PnL is computed live server-side from current prices.
  const { data: sessions, refetch } = useGetAllQuery({}, { pollingInterval: 5000 } as any);
  const list: any[] = Array.isArray(sessions) ? sessions : [];
  const { enqueueSnackbar } = useSnackbar();
  const [removeSession, { isLoading: removing }] = useRemoveMutation();
  const [closeSession, { isLoading: closing }] = useCloseSessionMutation();

  const totalPnl = list.reduce((acc, s) => acc + (Number(s.pnlUsd) || 0), 0);

  // Deletes only the DB record — does NOT close any open exchange positions.
  const handleDelete = async (s: any) => {
    if (
      !window.confirm(
        `Удалить сессию #${s.id} (${s.name})?\nЭто удалит только запись — открытые позиции на биржах НЕ закрываются.`,
      )
    )
      return;
    try {
      await removeSession(s.id).unwrap();
      enqueueSnackbar('Сессия удалена', { variant: 'success' });
      refetch(); // ensure the row disappears immediately
    } catch (e: any) {
      enqueueSnackbar(`Ошибка удаления: ${e?.data?.message || e?.error || 'unknown'}`, {
        variant: 'error',
      });
    }
  };

  // Closes BOTH legs by market (reduceOnly) and records realized PnL.
  const handleClose = async (s: any) => {
    if (
      !window.confirm(
        `Закрыть сессию #${s.id} (${s.name}) по рынку?\nБудут отправлены встречные маркет-ордера по обеим ногам.`,
      )
    )
      return;
    try {
      const res: any = await closeSession(s.id).unwrap();
      if (res?.status === 'failed') {
        enqueueSnackbar('Закрытие частично не удалось — проверьте позиции на биржах', {
          variant: 'warning',
        });
      } else {
        enqueueSnackbar('Позиции закрыты', { variant: 'success' });
      }
      refetch();
    } catch (e: any) {
      enqueueSnackbar(`Ошибка закрытия: ${e?.data?.message || e?.error || 'unknown'}`, {
        variant: 'error',
      });
    }
  };

  return (
    <Container maxWidth='xl' sx={{ mt: 10 }}>
      <Card>
        <CardHeader
          title='Арбитраж — статистика'
          subheader={`Сессий: ${list.length}`}
          action={
            <Box sx={{ mt: 1 }}>
              <Label color={totalPnl >= 0 ? 'success' : 'error'}>
                Итого PnL: {fmtUsd(totalPnl)}
              </Label>
            </Box>
          }
        />
        <CardContent>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Пара</TableCell>
                <TableCell>LONG</TableCell>
                <TableCell>SHORT</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>Вход L / текущая</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>Вход S / текущая</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>Объём</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>PnL %</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>PnL USD</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Создана</TableCell>
                <TableCell sx={{ textAlign: 'right' }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Нет сессий
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {list.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.id}</TableCell>
                  <TableCell>
                    <Typography variant='subtitle2'>{s.name}</Typography>
                  </TableCell>
                  <TableCell>{s.longExchange || s.pair1Id}</TableCell>
                  <TableCell>{s.shortExchange || s.pair2Id}</TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <Stack spacing={0}>
                      <Typography variant='caption'>{fmtPrice(s.pair1EntryPrice)}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {fmtPrice(s.currentLongPrice)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <Stack spacing={0}>
                      <Typography variant='caption'>{fmtPrice(s.pair2EntryPrice)}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {fmtPrice(s.currentShortPrice)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>{fmtUsd(s.amountUsd)}</TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <Label color={Number(s.pnlPct) >= 0 ? 'success' : 'error'}>
                      {fmtPct(s.pnlPct)}
                    </Label>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <Label color={Number(s.pnlUsd) >= 0 ? 'success' : 'error'}>
                      {fmtUsd(s.pnlUsd)}
                    </Label>
                  </TableCell>
                  <TableCell>
                    <Label color={STATUS_COLOR[s.status] || 'default'}>{s.status}</Label>
                  </TableCell>
                  <TableCell>
                    <Typography variant='caption' color='text.secondary'>
                      {moment(s.createdAt).format('DD.MM HH:mm')}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <Stack direction='row' spacing={0.5} justifyContent='flex-end' alignItems='center'>
                      {CLOSABLE.has(s.status) && (
                        <Tooltip title='Закрыть обе ноги по рынку'>
                          <span>
                            <Button
                              size='small'
                              variant='outlined'
                              color='warning'
                              disabled={closing}
                              onClick={() => handleClose(s)}
                            >
                              Закрыть
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                      <Tooltip title='Удалить запись (позиции не закрываются)'>
                        <span>
                          <IconButton
                            size='small'
                            color='error'
                            disabled={removing}
                            onClick={() => handleDelete(s)}
                          >
                            <DeleteOutlineIcon fontSize='small' />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
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

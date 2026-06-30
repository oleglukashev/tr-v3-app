import {Box, IconButton, MenuItem, TableCell, TableRow, Typography} from "@mui/material";
import Label from "src/components/label";
import Iconify from "@/src/components/iconify";
import CustomPopover, {usePopover} from "@/src/components/custom-popover";
import CustomEditRow from "@/src/components/custom-edit-row/custom-edit-row";
import CustomDialog from "@/src/components/custom-dialog/custom-dialog";
import {useCallback, useState} from "react";
import {useRemoveMutation, useUpdateMutation, useConnectMutation} from "@/lib/redux/api/exchangeApi";
import {onSubmitWrapper} from "@/src/utils/submit";
import CustomRemoveDialog from "@/src/components/custom-remove-dialog/custom-remove-dialog";
import CustomDeleteRow from "@/src/components/custom-delete-row/custom-delete-row";
import {enqueueSnackbar} from "notistack";
import ExchangeForm from "@/src/sections/admin/exchanges/exchanges-form";

type Props = {
  item: any,
  statuses?: Record<number, 'loading' | 'ok' | 'error'>
};

function StatusDot({ status }: { status?: 'loading' | 'ok' | 'error' }) {
  if (!status) return null;
  const color = status === 'ok' ? 'success.main' : status === 'error' ? 'error.main' : 'grey.400';
  return (
    <Box
      component='span'
      title={status === 'ok' ? 'Соединение OK' : status === 'error' ? 'Ошибка соединения' : 'Проверка...'}
      sx={{ ml: 1, display: 'inline-block', width: 10, height: 10, borderRadius: '50%', bgcolor: color, verticalAlign: 'middle' }}
    />
  );
}

function maskKey(value?: string) {
  if (!value) return '—';
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export default function ExchangesIndexRow({ item, statuses }: Props) {
  const [openUpdateForm, setOpenUpdateForm] = useState<boolean>(false);
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const [openConnect, setOpenConnect] = useState<boolean>(false);
  const [connectResult, setConnectResult] = useState<any>(null);
  const [localStatus, setLocalStatus] = useState<'loading' | 'ok' | 'error' | undefined>(undefined);
  const status = localStatus ?? statuses?.[item.id];
  const popover = usePopover();
  const [update, { isLoading: isUpdateLoading }] = useUpdateMutation();
  const [remove, { isLoading: isRemoveLoading }] = useRemoveMutation();
  const [connect, { isLoading: isConnectLoading }] = useConnectMutation();

  const onSubmitUpdate = useCallback((values) => {
    return onSubmitWrapper(() => update({ id: item.id, values: Object.assign({}, values) }), () => setOpenUpdateForm(false), 'Успешно обновлено');
  }, [item.id]);

  const onSubmitDelete = useCallback(() => {
    return onSubmitWrapper(() => remove(item.id), () => setOpenDelete(false), 'Успешно удалено');
  }, [item.id]);

  const onConnect = useCallback(async () => {
    setOpenConnect(true);
    setConnectResult(null);
    setLocalStatus('loading');
    const res: any = await connect(item.id);
    if (res.error) {
      const message = res.error?.data?.message || 'Ошибка подключения';
      enqueueSnackbar(typeof message === 'string' ? message : 'Ошибка подключения', { variant: 'error' });
      setConnectResult({ ok: false, error: typeof message === 'string' ? message : JSON.stringify(message) });
      setLocalStatus('error');
    } else {
      setConnectResult(res.data);
      if (res.data?.ok) {
        enqueueSnackbar('Успешное подключение к бирже');
        setLocalStatus('ok');
      } else {
        enqueueSnackbar(res.data?.error || 'Не удалось подключиться', { variant: 'error' });
        setLocalStatus('error');
      }
    }
  }, [item.id]);

  return (
    <TableRow key={item.id}>
      <TableCell>{item.id}</TableCell>
      <TableCell><Label color='success'>{item.name}</Label><StatusDot status={status} /></TableCell>
      <TableCell>{item.ccxtId}</TableCell>
      <TableCell>{item.defaultType || '—'}</TableCell>
      <TableCell>{item.timeframes || '—'}</TableCell>
      <TableCell>{maskKey(item.apiKey)}</TableCell>
      <TableCell><Label color={item.testnet ? 'warning' : 'default'}>{item.testnet ? 'Yes' : 'No'}</Label></TableCell>
      <TableCell><Label color={item.activated ? 'success' : 'error'}>{item.activated ? 'Yes' : 'No'}</Label></TableCell>
      <TableCell align='right'>
        <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
          <Iconify icon="eva:more-vertical-fill" />
        </IconButton>

        <CustomPopover
          open={popover.open}
          onClose={popover.onClose}
        >
          <MenuItem
            onClick={() => {
              onConnect();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:plug-circle-bold" />
            Подключиться
          </MenuItem>

          <CustomEditRow
            onMenuClick={() => {
              setOpenUpdateForm(true);
              popover.onClose();
            }}
          />

          <CustomDeleteRow
            onMenuClick={() => {
              setOpenDelete(true);
              popover.onClose();
            }}
          />
        </CustomPopover>

        <CustomDialog
          open={openUpdateForm}
          onClose={() => setOpenUpdateForm(false)}
          title='Редактирование биржи'
          content={(
            <ExchangeForm
              defaultValues={{ ...item, apiKey: item.apiKey || '', apiSecret: item.apiSecret || '', password: item.password || '', defaultType: item.defaultType || '' }}
              isLoading={isUpdateLoading}
              onSubmit={onSubmitUpdate}
            />
          )}
        />

        <CustomDialog
          open={openConnect}
          onClose={() => setOpenConnect(false)}
          title={`Подключение: ${item.name}`}
          content={(
            <Box sx={{ p: 3, pt: 0 }}>
              {isConnectLoading && <Typography>Подключение...</Typography>}
              {!isConnectLoading && connectResult && (
                <Box component='pre' sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13 }}>
                  {JSON.stringify(connectResult, null, 2)}
                </Box>
              )}
            </Box>
          )}
        />

        <CustomRemoveDialog
          open={openDelete}
          onClose={() => setOpenDelete(false)}
          onConfirm={onSubmitDelete}
        />
      </TableCell>
    </TableRow>
  )
}

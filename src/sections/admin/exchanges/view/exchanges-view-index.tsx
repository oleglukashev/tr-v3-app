import {useGetAllQuery, useCreateMutation, useConnectMutation} from "@/lib/redux/api/exchangeApi";
import ExchangesIndexRow from "@/src/sections/admin/exchanges/exchanges-index-row";
import ExchangeForm from "@/src/sections/admin/exchanges/exchanges-form";
import {useCallback, useState} from "react";
import {onSubmitWrapper} from "@/src/utils/submit";
import {LoadingButton} from "@mui/lab";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

const HEAD = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Name' },
  { id: 'ccxtId', label: 'CCXT id' },
  { id: 'defaultType', label: 'Type' },
  { id: 'timeframes', label: 'Timeframes' },
  { id: 'apiKey', label: 'API key' },
  { id: 'testnet', label: 'Testnet?' },
  { id: 'activated', label: 'Activated?' },
  { id: 'actions', label: '' },
];

export default function AdminExchangesIndexView({ }: any) {
  const { data: exchanges } = useGetAllQuery({}) as any;
  const [create] = useCreateMutation();
  const [connect] = useConnectMutation();
  const [statuses, setStatuses] = useState<Record<number, 'loading' | 'ok' | 'error'>>({});
  const [checking, setChecking] = useState<boolean>(false);
  const [openCreate, setOpenCreate] = useState<boolean>(false);

  const onSubmitCreate = useCallback(async (values: any) => {
    const res: any = await onSubmitWrapper(() => create(Object.assign({}, values)), null, 'Created');
    if (!res.error) {
      setOpenCreate(false);
    }
    return res;
  }, []);

  const onCheckAll = useCallback(async () => {
    if (!exchanges?.length) return;
    setChecking(true);
    setStatuses(Object.fromEntries(exchanges.map((e: any) => [e.id, 'loading'])));
    await Promise.all(exchanges.map(async (e: any) => {
      const res: any = await connect(e.id);
      const ok = !res.error && res.data?.ok;
      setStatuses((prev) => ({ ...prev, [e.id]: ok ? 'ok' : 'error' }));
    }));
    setChecking(false);
  }, [exchanges]);

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <LoadingButton
          variant='outlined'
          loading={checking}
          disabled={!exchanges?.length}
          onClick={onCheckAll}
        >
          Проверить все соединения
        </LoadingButton>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" onClick={() => setOpenCreate(true)}>
          Создать
        </Button>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            {HEAD.map((h) => (
              <TableCell key={h.id} align={h.id === 'actions' ? 'right' : 'left'}>
                {h.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {(exchanges || []).map((e: any) => (
            <ExchangesIndexRow key={e.id} item={e} statuses={statuses} />
          ))}
          {(exchanges || []).length === 0 && (
            <TableRow>
              <TableCell colSpan={HEAD.length} sx={{ color: 'text.secondary' }}>
                Данных нет
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog fullWidth maxWidth="sm" open={openCreate} onClose={() => setOpenCreate(false)}>
        <DialogTitle>Создание</DialogTitle>
        <ExchangeForm defaultValues={{}} onSubmit={onSubmitCreate} />
      </Dialog>
    </>
  )
}

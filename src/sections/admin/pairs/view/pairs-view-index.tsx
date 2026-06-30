import {useGetAllQuery, useCreateMutation} from "@/lib/redux/api/pairApi";
import PairsIndexRow from "@/src/sections/admin/pairs/pairs-index-row";
import PairForm from "@/src/sections/admin/pairs/pairs-form";
import {useCallback, useMemo, useState} from "react";
import {onSubmitWrapper} from "@/src/utils/submit";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

const HEAD = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Name' },
  { id: 'tradingService', label: 'Trading service' },
  { id: 'active', label: 'Activated?' },
  { id: 'isDhm', label: 'DHM/DZM?' },
  { id: 'getKlineData', label: 'Get kline data?' },
  { id: 'getBidasksData', label: 'Get orderbooks data?' },
  { id: 'actions', label: '' },
];

export default function AdminPairsIndexView({ }: any) {
  const { data: pairs } = useGetAllQuery({}) as any;
  const [create] = useCreateMutation();
  const [tradingServiceFilter, setTradingServiceFilter] = useState<string>("all");
  const [openCreate, setOpenCreate] = useState<boolean>(false);

  const onSubmitCreate = useCallback(async (values: any) => {
    const data = Object.assign({}, values);
    data.clusterPrecision = data.clusterPrecision.trim().length ? JSON.parse(data.clusterPrecision) : null;
    const res: any = await onSubmitWrapper(() => create(data), null, 'Created');
    if (!res.error) {
      setOpenCreate(false);
    }
    return res;
  }, []);

  // Distinct trading services present in the loaded pairs, for the filter selectbox.
  const tradingServiceOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of pairs || []) {
      if (p.tradingServiceId != null) {
        seen.set(String(p.tradingServiceId), p.tradingService?.name || `#${p.tradingServiceId}`);
      }
    }
    return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [pairs]);

  const filteredPairs = useMemo(
    () =>
      (pairs || []).filter(
        (p: any) =>
          tradingServiceFilter === "all" || String(p.tradingServiceId) === tradingServiceFilter,
      ),
    [pairs, tradingServiceFilter],
  );

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="pairs-trading-service-filter-label">Trading service</InputLabel>
          <Select
            labelId="pairs-trading-service-filter-label"
            label="Trading service"
            value={tradingServiceFilter}
            onChange={(e) => setTradingServiceFilter(e.target.value as string)}
          >
            <MenuItem value="all">All trading services</MenuItem>
            {tradingServiceOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
          {filteredPairs.map((p: any) => (
            <PairsIndexRow key={p.id} item={p} />
          ))}
          {filteredPairs.length === 0 && (
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
        <PairForm defaultValues={{}} onSubmit={onSubmitCreate} />
      </Dialog>
    </>
  )
}

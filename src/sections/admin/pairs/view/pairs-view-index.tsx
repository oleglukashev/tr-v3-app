import {useGetAllQuery} from "@/lib/redux/api/pairApi";
import PairsIndexRow from "@/src/sections/admin/pairs/pairs-index-row";
import CustomTablePage from "@/src/components/custom-table-page/custom-table-page";
import PairForm from "@/src/sections/admin/pairs/pairs-form";
import {useCallback, useMemo, useState} from "react";
import {onSubmitWrapper} from "@/src/utils/submit";
import {useCreateMutation} from "@/lib/redux/api/pairApi";
import {FormControl, InputLabel, MenuItem, Select} from "@mui/material";

export default function AdminPairsIndexView({ }: any) {
  const { data: pairs, isLoading } = useGetAllQuery({}) as any;
  const [create] = useCreateMutation();
  const [tradingServiceFilter, setTradingServiceFilter] = useState<string>("all");

  const onSubmitCreate = useCallback((values: any) => {
    const data = Object.assign({}, values);
    data.clusterPrecision = data.clusterPrecision.trim().length ? JSON.parse(data.clusterPrecision) : null;
    return onSubmitWrapper(() => create(data), null, 'Created');
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
    <CustomTablePage
      data={filteredPairs}
      isLoading={isLoading}
      tableHead={[
        { id: 'id', label: 'ID' },
        { id: 'name', label: 'Name' },
        { id: 'tradingService', label: 'Trading service' },
        { id: 'active', label: 'Activated?' },
        { id: 'isDhm', label: 'DHM/DZM?' },
        { id: 'getKlineData', label: 'Get kline data?' },
        { id: 'getBidasksData', label: 'Get orderbooks data?' },
        { id: 'actions', label: null}
      ]}
      CreateForm={PairForm}
      onSubmitCreate={onSubmitCreate}
      headerActions={(
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
      )}
      title='Pairs'
      RowComponent={PairsIndexRow}
    />
  )
}

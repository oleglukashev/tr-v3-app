import {useGetAllQuery, useCreateMutation, useConnectMutation} from "@/lib/redux/api/exchangeApi";
import ExchangesIndexRow from "@/src/sections/admin/exchanges/exchanges-index-row";
import CustomTablePage from "@/src/components/custom-table-page/custom-table-page";
import ExchangeForm from "@/src/sections/admin/exchanges/exchanges-form";
import {useCallback, useState} from "react";
import {onSubmitWrapper} from "@/src/utils/submit";
import {LoadingButton} from "@mui/lab";

export default function AdminExchangesIndexView({ }: any) {
  const { data: exchanges, isLoading } = useGetAllQuery({});
  const [create] = useCreateMutation();
  const [connect] = useConnectMutation();
  const [statuses, setStatuses] = useState<Record<number, 'loading' | 'ok' | 'error'>>({});
  const [checking, setChecking] = useState<boolean>(false);

  const onSubmitCreate = useCallback((values: any) => {
    return onSubmitWrapper(() => create(Object.assign({}, values)), null, 'Created');
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
    <CustomTablePage
      data={exchanges}
      isLoading={isLoading}
      tableHead={[
        { id: 'id', label: 'ID' },
        { id: 'name', label: 'Name' },
        { id: 'ccxtId', label: 'CCXT id' },
        { id: 'defaultType', label: 'Type' },
        { id: 'apiKey', label: 'API key' },
        { id: 'testnet', label: 'Testnet?' },
        { id: 'activated', label: 'Activated?' },
        { id: 'actions', label: null }
      ]}
      CreateForm={ExchangeForm}
      onSubmitCreate={onSubmitCreate}
      headerActions={(
        <LoadingButton
          size='mini'
          variant='outlined'
          loading={checking}
          disabled={!exchanges?.length}
          onClick={onCheckAll}
        >
          Проверить все соединения
        </LoadingButton>
      )}
      title='Exchanges'
      RowComponent={<ExchangesIndexRow statuses={statuses} />}
    />
  )
}

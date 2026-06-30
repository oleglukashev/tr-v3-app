import {useGetAllQuery, useCreateMutation} from "@/lib/redux/api/exchangeApi";
import ExchangesIndexRow from "@/src/sections/admin/exchanges/exchanges-index-row";
import CustomTablePage from "@/src/components/custom-table-page/custom-table-page";
import ExchangeForm from "@/src/sections/admin/exchanges/exchanges-form";
import {useCallback} from "react";
import {onSubmitWrapper} from "@/src/utils/submit";

export default function AdminExchangesIndexView({ }: any) {
  const { data: exchanges, isLoading } = useGetAllQuery({});
  const [create] = useCreateMutation();

  const onSubmitCreate = useCallback((values: any) => {
    return onSubmitWrapper(() => create(Object.assign({}, values)), null, 'Created');
  }, []);

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
      title='Exchanges'
      RowComponent={ExchangesIndexRow}
    />
  )
}

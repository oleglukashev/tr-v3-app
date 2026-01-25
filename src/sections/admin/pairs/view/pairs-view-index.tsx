import {useGetAllQuery} from "@/lib/redux/api/pairApi";
import PairsIndexRow from "@/src/sections/admin/pairs/pairs-index-row";
import CustomTablePage from "@/src/components/custom-table-page/custom-table-page";
import PairForm from "@/src/sections/admin/pairs/pairs-form";
import {useCallback} from "react";
import {onSubmitWrapper} from "@/src/utils/submit";
import {useCreateMutation} from "@/lib/redux/api/pairApi";

export default function AdminPairsIndexView({ }: any) {
  const { data: pairs, isLoading } = useGetAllQuery({});
  const [create] = useCreateMutation();

  const onSubmitCreate = useCallback((values: any) => {
    const data = Object.assign({}, values);
    data.clusterPrecision = data.clusterPrecision.trim().length ? JSON.parse(data.clusterPrecision) : null;
    return onSubmitWrapper(() => create(data), null, 'Created');
  }, []);

  return (
    <CustomTablePage
      data={pairs}
      isLoading={isLoading}
      tableHead={[
        { id: 'name', label: 'Name' },
        { id: 'active', label: 'Activated?' },
        { id: 'getKlineData', label: 'Get kline data?' },
        { id: 'getBidasksData', label: 'Get bidasks data?' },
        { id: 'actions', label: null}
      ]}
      CreateForm={PairForm}
      onSubmitCreate={onSubmitCreate}
      title='Pairs'
      RowComponent={PairsIndexRow}
    />
  )
}

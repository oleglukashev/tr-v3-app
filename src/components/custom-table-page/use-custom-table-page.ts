import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {useCallback, useMemo, useState} from "react";
import {useTable} from "@/src/components/table";
import qs from 'qs';
import { updateUrlParamsCallback } from "@/src/helpers/update-url-callback.helper";

export default function useCustomTablePage(params: any) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [openCreateForm, setOpenCreateForm] = useState(false);

  const customSearchParams = useMemo(() => {
    // it's a wrapper for useQuery. remove extra params from searchParams if needed
    const params: any = qs.parse(searchParams.toString());
    params.page = searchParams.get('page') ? parseInt((searchParams.get('page') as string)) : 1;
    return params;
  }, [searchParams]);

  const updateGetParams = useCallback((obj: any) => {
    const params =  { ...customSearchParams, ...obj };
    if (params.q === '') {
      delete params.q;
    }
    updateUrlParamsCallback(router, params);
  }, [customSearchParams])

  const table = useTable({ ...params, updateGetParams });

  return {
    searchParams,
    router,
    pathname,
    openCreateForm,
    setOpenCreateForm,
    table,
    customSearchParams,
    updateGetParams
  }
}

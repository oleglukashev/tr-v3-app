import { BaseApi } from "./baseApi";
import {customTrFetchBase} from "../../customFetchBase";

const collectionPath = 'dzm';
export const dzmApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrFetchBase,
  collectionPath,
  extraEndpoints: (builder) => {
    return {
      // @ts-ignore
      getAllTestDzm: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}/test/${params.pairId}/${params.tf}`,
          };
        },
      }),
      // @ts-ignore
      getAllDzm: builder.query<any[], any>({
        query(params: any) {
          const data: any = {
            url: `${collectionPath}/${params.pairId}/${params.tf}`,
          }

          if (params.statusFilters?.length) {
            data.params = { statuses: params.statusFilters.join(',') };
          }

          return data;
        },
      }),
      // @ts-ignore
      getAllActiveDzm: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}/active`,
          };
        },
      }),
      // @ts-ignore
      getSettingsDzm: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}/settings`,
            params: params,
          };
        },
      }),
      // @ts-ignore
      getSettingsDzmByPairIdAndTf: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}/settings/${params.pairId}/${params.tf}`
          };
        },
        providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      updateSettingsDzm: builder.mutation<any, any>({
        query(data: any) {
          return {
            url: `${collectionPath}/settings`,
            method: 'PATCH',
            body: data,
          };
        },
      }),
      // @ts-ignore
      runTestDzm: builder.mutation<any, any>({
        query(data: any) {
          return {
            url: `${collectionPath}/run_test`,
            method: 'POST',
            body: data,
          };
        },
      }),
      // @ts-ignore
      createDzm: builder.mutation<any, any>({
        query(data: any) {
          return {
            url: collectionPath,
            method: 'POST',
            body: data,
          };
        },
      }),
      // @ts-ignore
      updateDzm: builder.mutation<any, any>({
        query(params: any) {
          return {
            url: `${collectionPath}/${params.id}`,
            method: 'PATCH',
            body: params.values,
          };
        },
      }),
      // @ts-ignore
      removeDzm: builder.mutation<any, any>({
        query(id: any) {
          return {
            url: `${collectionPath}/${id}`,
            method: 'DELETE',
          };
        },
      }),
      // @ts-ignore
      deleteAllTestDzm: builder.mutation<any, any>({
        query() {
          return {
            url: `${collectionPath}/test`,
            method: 'DELETE',
          };
        },
      }),
      // @ts-ignore
      getBacktestSettings: builder.query<any, { pairId: number; tf: number }>({
        query({ pairId, tf }) {
          return { url: `${collectionPath}/backtest-settings/${pairId}/${tf}` };
        },
      }),
      // @ts-ignore
      saveBacktestSettings: builder.mutation<any, { pairId: number; tf: number; data: any }>({
        query({ pairId, tf, data }) {
          return {
            url: `${collectionPath}/backtest-settings/${pairId}/${tf}`,
            method: 'POST',
            body: data,
          };
        },
      }),
      // @ts-ignore
      getDzmFavorites: builder.query<any[], void>({
        query() {
          return { url: `${collectionPath}/favorites` };
        },
        providesTags: () => [{ type: collectionPath, id: 'FAVORITES' }],
      }),
      // @ts-ignore
      createDzmFavorite: builder.mutation<any, { pairId: number; tf: number; data: any }>({
        query(body: any) {
          return {
            url: `${collectionPath}/favorites`,
            method: 'POST',
            body,
          };
        },
        invalidatesTags: () => [{ type: collectionPath, id: 'FAVORITES' }],
      }),
      // @ts-ignore
      deleteDzmFavorite: builder.mutation<any, number>({
        query(id: any) {
          return {
            url: `${collectionPath}/favorites/${id}`,
            method: 'DELETE',
          };
        },
        invalidatesTags: () => [{ type: collectionPath, id: 'FAVORITES' }],
      }),
    }
  }
})).create();

export const {
  useGetAllDzmQuery,
  useGetAllActiveDzmQuery,
  useGetAllTestDzmQuery,
  useCreateDzmMutation,
  useUpdateDzmMutation,
  useRemoveDzmMutation,
  useGetSettingsDzmQuery,
  useGetSettingsDzmByPairIdAndTfQuery,
  useUpdateSettingsDzmMutation,
  useRunTestDzmMutation,
  useDeleteAllTestDzmMutation,
  useGetBacktestSettingsQuery,
  useSaveBacktestSettingsMutation,
  useGetDzmFavoritesQuery,
  useCreateDzmFavoriteMutation,
  useDeleteDzmFavoriteMutation,
} = dzmApi;

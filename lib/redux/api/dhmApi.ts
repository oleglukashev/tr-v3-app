import { BaseApi } from "./baseApi";
import {customTrFetchBase} from "../../customFetchBase";

const collectionPath = 'dhm';
export const dhmApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrFetchBase,
  collectionPath,
  extraEndpoints: (builder) => {
    return {
      // @ts-ignore
      getAllTestDhm: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}/test/${params.pairId}/${params.tf}`,
          };
        },
        //providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      getAllTestDhm2: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}2/test/${params.pairId}/${params.tf}`,
          };
        },
        //providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      getAllDhm: builder.query<any[], any>({
        query(params: any) {
          const data: any = {
            url: `${collectionPath}/${params.pairId}/${params.tf}`,
          }

          if (params.statusFilters?.length) {
            data.params = { statuses: params.statusFilters.join(',') };
          }

          return data;
        },
        //providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      getAllActiveDhm: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}/active`,
          };
        },
        //providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      getAllDhm2: builder.query<any[], any>({
        query(params: any) {
          const data: any = {
            url: `${collectionPath}2/${params.pairId}/${params.tf}`,
          }

          if (params.statusFilters?.length) {
            data.params = { statuses: params.statusFilters.join(',') };
          }

          return data;
        },
        //providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      getAllActiveDhm2: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}2/active`,
          };
        },
        //providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      getSettingsDhm: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}/settings`,
            params: params,
          };
        },
        //providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      getSettingsDhm2: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}2/settings`,
            params: params,
          };
        },
        //providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      getSettingsDhmByPairIdAndTf: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}/settings/${params.pairId}/${params.tf}`
          };
        },
        providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      getSettingsDhm2ByPairIdAndTf: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}2/settings/${params.pairId}/${params.tf}`
          };
        },
        providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      updateSettingsDhm: builder.mutation<any, any>({
        query(data: any) {
          return {
            url: `${collectionPath}/settings`,
            method: 'PATCH',
            body: data,
          };
        },
      }),
      // @ts-ignore
      updateSettingsDhm2: builder.mutation<any, any>({
        query(data: any) {
          return {
            url: `${collectionPath}2/settings`,
            method: 'PATCH',
            body: data,
          };
        },
      }),
      // @ts-ignore
      runTestDhm: builder.mutation<any, any>({
        query(data: any) {
          return {
            url: `${collectionPath}/run_test`,
            method: 'POST',
            body: data,
          };
        },
      }),
      // @ts-ignore
      runTestDhm2: builder.mutation<any, any>({
        query(data: any) {
          return {
            url: `${collectionPath}2/run_test`,
            method: 'POST',
            body: data,
          };
        },
      }),
      // @ts-ignore
      createDhm: builder.mutation<any, any>({
        query(data: any) {
          return {
            url: collectionPath,
            method: 'POST',
            body: data,
          };
        },
      }),
      // @ts-ignore
      createDhm2: builder.mutation<any, any>({
        query(data: any) {
          return {
            url: `${collectionPath}2`,
            method: 'POST',
            body: data,
          };
        },
      }),
      // @ts-ignore
      updateDhm: builder.mutation<any, any>({
        query(params: any) {
          return {
            url: `${collectionPath}/${params.id}`,
            method: 'PATCH',
            body: params.values,
          };
        },
      }),
      // @ts-ignore
      updateDhm2: builder.mutation<any, any>({
        query(params: any) {
          return {
            url: `${collectionPath}2/${params.id}`,
            method: 'PATCH',
            body: params.values,
          };
        },
      }),
      // @ts-ignore
      removeDhm: builder.mutation<any, any>({
        query(id: any) {
          return {
            url: `${collectionPath}/${id}`,
            method: 'DELETE',
          };
        },
      }),
      // @ts-ignore
      removeDhm2: builder.mutation<any, any>({
        query(id: any) {
          return {
            url: `${collectionPath}2/${id}`,
            method: 'DELETE',
          };
        },
      }),
      // @ts-ignore
      deleteAllTestDhm: builder.mutation<any, any>({
        query() {
          return {
            url: `${collectionPath}/test`,
            method: 'DELETE',
          };
        },
      }),
      // @ts-ignore
      deleteAllTestDhm2: builder.mutation<any, any>({
        query() {
          return {
            url: `${collectionPath}2/test`,
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
      getDhmFavorites: builder.query<any[], void>({
        query() {
          return { url: `${collectionPath}/favorites` };
        },
        providesTags: () => [{ type: collectionPath, id: 'FAVORITES' }],
      }),
      // @ts-ignore
      createDhmFavorite: builder.mutation<any, { pairId: number; tf: number; data: any }>({
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
      deleteDhmFavorite: builder.mutation<any, number>({
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
  useGetAllDhmQuery,
  useGetAllDhm2Query,
  useGetAllActiveDhmQuery,
  useGetAllActiveDhm2Query,
  useGetAllTestDhmQuery,
  useGetAllTestDhm2Query,
  useCreateDhmMutation,
  useCreateDhm2Mutation,
  useUpdateDhmMutation,
  useUpdateDhm2Mutation,
  useRemoveDhmMutation,
  useRemoveDhm2Mutation,
  useGetSettingsDhmQuery,
  useGetSettingsDhmByPairIdAndTfQuery,
  useGetSettingsDhm2Query,
  useGetSettingsDhm2ByPairIdAndTfQuery,
  useUpdateSettingsDhmMutation,
  useUpdateSettingsDhm2Mutation,
  useRunTestDhmMutation,
  useRunTestDhm2Mutation,
  useDeleteAllTestDhmMutation,
  useDeleteAllTestDhm2Mutation,
  useGetBacktestSettingsQuery,
  useSaveBacktestSettingsMutation,
  useGetDhmFavoritesQuery,
  useCreateDhmFavoriteMutation,
  useDeleteDhmFavoriteMutation,
} = dhmApi;

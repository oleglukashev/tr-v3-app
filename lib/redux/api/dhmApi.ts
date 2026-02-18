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
          return {
            url: `${collectionPath}/${params.pairId}/${params.tf}`,
            params: { statuses: params.statusFilters.join(',') },
          };
        },
        //providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      getAllDhm2: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}2/${params.pairId}/${params.tf}`,
            params: { statuses: params.statusFilters.join(',') },
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
            url: `${collectionPath}/test/run_dhm`,
            method: 'POST',
            body: data,
          };
        },
      }),
      // @ts-ignore
      runTestDhm2: builder.mutation<any, any>({
        query(data: any) {
          return {
            url: `${collectionPath}/test/run_dhm2`,
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
        query(data: any) {
          return {
            url: `${collectionPath}/:id`,
            method: 'DELETE',
          };
        },
      }),
      // @ts-ignore
      removeDhm2: builder.mutation<any, any>({
        query(data: any) {
          return {
            url: `${collectionPath}2/:id`,
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
    }
  }
})).create();

export const {
  useGetAllDhmQuery,
  useGetAllDhm2Query,
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
} = dhmApi;

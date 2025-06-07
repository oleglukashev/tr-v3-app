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
      getAllTest: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}/test/${params.pairId}/${params.tf}`,
          };
        },
        //providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      getAll: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}/${params.pairId}/${params.tf}`,
          };
        },
        //providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      getSettings: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}/settings`,
          };
        },
        //providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
      // @ts-ignore
      updateSettings: builder.mutation<any, any>({
        query(data: any) {
          return {
            url: `${collectionPath}/settings`,
            method: 'PATCH',
            body: data,
          };
        },
      }),
      // @ts-ignore
      run: builder.mutation<any, any>({
        query(data: any) {
          return {
            url: `${collectionPath}/test/run`,
            method: 'POST',
            body: data,
          };
        },
      }),
      // @ts-ignore
      deleteAllTest: builder.mutation<any, any>({
        query() {
          return {
            url: `${collectionPath}/test`,
            method: 'DELETE',
          };
        },
      }),
    }
  }
})).create();

export const {
  useGetAllQuery,
  useGetAllTestQuery,
  useCreateMutation,
  useUpdateMutation,
  useRemoveMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useRunMutation,
  useDeleteAllTestMutation,
} = dhmApi;

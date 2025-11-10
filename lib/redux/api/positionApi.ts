import { BaseApi } from "./baseApi";
import {customTrFetchBase} from "../../customFetchBase";

const collectionPath = 'positions';
export const positionApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrFetchBase,
  collectionPath,
  extraEndpoints: (builder: any) => {
    return {
      // @ts-ignore
      create: builder.mutation<any, any>({
        query({ pairId, ...rest}: any) {
          return {
            url: `${collectionPath}/${pairId}`,
            method: 'POST',
            body: rest,
          };
        },
      }),
      // @ts-ignore
      update: builder.mutation<any, any>({
        query({ pairId, ...rest}: any) {
          return {
            url: `${collectionPath}/${pairId}`,
            method: 'PATCH',
            body: rest,
          };
        },
      }),
      // @ts-ignore
      cancel: builder.mutation<any, any>({
        query(pairId: any) {
          return {
            url: `${collectionPath}/${pairId}/cancel`,
            method: 'POST',
          };
        },
      }),
      // @ts-ignore
      get: builder.query<any[], any>({
        query(pairId: number) {
          return {
            url: `${collectionPath}/${pairId}`,
          };
        },
      }),
    }
  }
})).create();

export const {
  useGetQuery,
  useCreateMutation,
  useUpdateMutation,
  useCancelMutation,
} = positionApi;

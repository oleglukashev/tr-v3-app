import { BaseApi } from "./baseApi";
import {customTrKlinesFetchBase} from "../../customFetchBase";

const collectionPath = 'prices/balance';
export const balanceApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrKlinesFetchBase,
  collectionPath,
  extraEndpoints: (builder: any) => {
    return {
      // @ts-ignore
      get: builder.query<any[], any>({
        query(params: any) {
          return {
            url: collectionPath
          };
        },
        providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
    }
  }
})).create();

export const {
  useGetQuery,
} = balanceApi;

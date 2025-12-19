import { BaseApi } from "./baseApi";
import {customTrFetchBase} from "../../customFetchBase";

const collectionPath = 'orders';
export const orderApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrFetchBase,
  collectionPath,
  extraEndpoints: (builder) => {
    return {
      // @ts-ignore
      getAll: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}/${params.pairId}/${params.status}`
          };
        },
        providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
    }
  }
})).create();

export const {
  useGetAllQuery,
} = orderApi;

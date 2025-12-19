import { BaseApi } from "./baseApi";
import {customTrFetchBase} from "../../customFetchBase";

const collectionPath = 'pnl';
export const pnlApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrFetchBase,
  collectionPath,
  extraEndpoints: (builder) => {
    return {
      // @ts-ignore
      get: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}?${params.sessionIds.map(i => `sessionIds[]=${i}`).join("&")}`,
          };
        },
        providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
    }
  }
})).create();

export const {
  useGetQuery,
} = pnlApi;

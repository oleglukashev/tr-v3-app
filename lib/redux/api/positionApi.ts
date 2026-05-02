import { BaseApi } from "./baseApi";
import {customTrApiFetchBase} from "../../customFetchBase";

const collectionPath = 'position';
export const positionApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrApiFetchBase,
  collectionPath,
  extraEndpoints: (builder) => {
    return {
      // @ts-ignore
      get: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}/${params.pairId}`
          };
        },
        providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
    }
  }
})).create();

export const {
  useGetQuery,
} = positionApi;

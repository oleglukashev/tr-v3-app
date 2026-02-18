import { BaseApi } from "./baseApi";
import {customTrClustersFetchBase} from "../../customFetchBase";

const collectionPath = 'orderbooks';
export const clusterApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrClustersFetchBase,
  collectionPath,
  extraEndpoints: (builder) => {
    return {
      // @ts-ignore
      getByPairIdAndTfAndTs: builder.query<any[], any>({
        query(params: any) {
          return {
            url: `${collectionPath}/by_pair_id_and_tf_and_ts`,
            params
          };
        },
        //providesTags: (result: any) => BaseApi.providesTags(result, collectionPath),
      }),
    }
  }
})).create();

export const {
  useGetAllQuery,
  useLazyGetByPairIdAndTfAndTsQuery,
} = clusterApi;

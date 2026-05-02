import { BaseApi } from "./baseApi";
import {customTrApiFetchBase} from "../../customFetchBase";

const collectionPath = 'tda_points';
export const tdaPointsApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrApiFetchBase,
  collectionPath,
  extraEndpoints: (builder) => {
    return {
      // @ts-ignore
      getAll: builder.query<any[], any>({
        query(params: any) {
          return {
            url: collectionPath,
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
} = tdaPointsApi;

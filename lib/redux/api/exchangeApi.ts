import { BaseApi } from "./baseApi";
import { customTrApiFetchBase } from "../../customFetchBase";

const collectionPath = 'exchanges';
export const exchangeApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrApiFetchBase,
  collectionPath,
  extraEndpoints: (builder: any) => ({
    connect: builder.mutation({
      query(id: number) {
        return {
          url: `${collectionPath}/${id}/connect`,
          method: 'POST',
        };
      },
    }),
  }),
})).create();

export const {
  useGetAllQuery,
  useCreateMutation,
  useUpdateMutation,
  useRemoveMutation,
  useConnectMutation,
} = exchangeApi;

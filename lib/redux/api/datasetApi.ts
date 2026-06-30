import { createApi } from "@reduxjs/toolkit/dist/query/react";
import { customTrClustersFetchBase, customTrApiFetchBase } from "../../customFetchBase";

export type DatasetRow = {
  kind: "klines" | "bidasks";
  type: "general" | "xv";
  table: "klines" | "xv_klines" | "clusters" | "xv_clusters";
  pairId: number;
  keyField: "interval" | "tf" | "r";
  key: string;
  count: number;
};

export type DatasetPair = {
  id: number;
  name: string;
  symbol: string;
};

// Typed as a plain string (not a literal) so the reducer/middleware types stay
// loose and compose with the other BaseApi slices in the store, same as them.
const reducerPath: string = "datasetApi";
const pairsReducerPath: string = "datasetPairsApi";

/** Admin datasets — grouped row counts + delete, served by the bidasks service.
 *  Rows carry only pairId; pair names are merged on the frontend (see datasetPairsApi). */
export const datasetApi = createApi({
  reducerPath,
  baseQuery: customTrClustersFetchBase,
  tagTypes: ["Dataset"],
  endpoints: (builder: any) => ({
    getDatasets: builder.query({
      query: () => ({ url: "datasets", method: "GET" }),
      providesTags: ["Dataset"],
    }),
    deleteDataset: builder.mutation({
      query: ({ table, pairId, key }: { table: string; pairId: number; key: string }) => ({
        url: `datasets/${table}/${pairId}/${encodeURIComponent(key)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Dataset"],
    }),
  }),
});

/** Pair names for dataset rows — served by api.traken-trade.ru (it reaches the general DB). */
export const datasetPairsApi = createApi({
  reducerPath: pairsReducerPath,
  baseQuery: customTrApiFetchBase,
  tagTypes: ["DatasetPairs"],
  endpoints: (builder: any) => ({
    getDatasetPairs: builder.query({
      query: () => ({ url: "datasets/pairs", method: "GET" }),
      providesTags: ["DatasetPairs"],
    }),
  }),
});

export const { useGetDatasetsQuery, useDeleteDatasetMutation } = datasetApi as any;
export const { useGetDatasetPairsQuery } = datasetPairsApi as any;

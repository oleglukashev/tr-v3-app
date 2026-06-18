import { createApi } from "@reduxjs/toolkit/dist/query/react";
import { customTrClustersFetchBase } from "../../customFetchBase";

export type DatasetRow = {
  kind: "klines" | "bidasks";
  type: "general" | "xv";
  table: "klines" | "xv_klines" | "clusters" | "xv_clusters";
  pairId: number;
  pairName: string;
  keyField: "interval" | "tf" | "r";
  key: string;
  count: number;
};

// Typed as a plain string (not a literal) so the reducer/middleware types stay
// loose and compose with the other BaseApi slices in the store, same as them.
const reducerPath: string = "datasetApi";

/** Admin datasets — grouped row counts + delete, served by the bidasks service. */
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

export const { useGetDatasetsQuery, useDeleteDatasetMutation } = datasetApi as any;

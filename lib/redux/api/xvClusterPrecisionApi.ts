import { createApi } from "@reduxjs/toolkit/dist/query/react";
import { customTrClustersFetchBase } from "../../customFetchBase";

export type XvClusterPrecisionRow = {
  id: string;
  pairId: number;
  pairName: string;
  r: string;
  clusterSize: string;
};

// String (not literal) so reducer/middleware types stay loose like the other slices.
const reducerPath: string = "xvClusterPrecisionApi";

/** Admin CRUD for per-(pair, R) XV footprint precision (bidasks service). */
export const xvClusterPrecisionApi: any = createApi({
  reducerPath,
  baseQuery: customTrClustersFetchBase,
  tagTypes: ["XvPrecision"],
  endpoints: (builder: any) => ({
    getXvPrecisions: builder.query({
      query: () => ({ url: "xv-cluster-precisions", method: "GET" }),
      providesTags: ["XvPrecision"],
    }),
    upsertXvPrecision: builder.mutation({
      query: (body: { pairId: number; r: string; clusterSize: number }) => ({
        url: "xv-cluster-precisions",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["XvPrecision"],
    }),
    deleteXvPrecision: builder.mutation({
      query: ({ pairId, r }: { pairId: number; r: string }) => ({
        url: `xv-cluster-precisions/${pairId}/${encodeURIComponent(r)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["XvPrecision"],
    }),
  }),
});

export const {
  useGetXvPrecisionsQuery,
  useUpsertXvPrecisionMutation,
  useDeleteXvPrecisionMutation,
} = xvClusterPrecisionApi as any;

import { BaseApi } from "./baseApi";
import { customTrApiFetchBase } from "../../customFetchBase";

const collectionPath = 'arbitrage-sessions';
export const arbitrageSessionApi = (new BaseApi({
  reducerPath: 'arbitrageSessions',
  baseQuery: customTrApiFetchBase,
  collectionPath,
  // Extra read-only endpoint on the SAME slice — avoids adding another createApi to the store's
  // reducer union (which RTK can no longer fully type past a certain size).
  // GET arbitrage-sessions/funding → { [pairId]: { rate, intervalHours, nextFundingTime } }
  extraEndpoints: (builder: any) => ({
    getFunding: builder.query({
      query: () => ({ url: `${collectionPath}/funding` }),
    }),
    getLimits: builder.query({
      query: () => ({ url: `${collectionPath}/limits` }),
    }),
  }),
})).create();

export const {
  useGetAllQuery,
  useCreateMutation,
  useRemoveMutation,
  useGetFundingQuery,
  useGetLimitsQuery,
} = arbitrageSessionApi as any;

import { BaseApi } from "./baseApi";
import { customTrApiFetchBase } from "../../customFetchBase";

const collectionPath = 'arbitrage-sessions';
export const arbitrageSessionApi = (new BaseApi({
  reducerPath: 'arbitrageSessions',
  baseQuery: customTrApiFetchBase,
  collectionPath,
})).create();

export const {
  useGetAllQuery,
  useCreateMutation,
} = arbitrageSessionApi;

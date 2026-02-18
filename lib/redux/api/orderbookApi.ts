import { BaseApi } from "./baseApi";
import { customTrOrderbooksFetchBase } from "../../customFetchBase";

const collectionPath = "orderbooks";
const reducerPath = "orderbook";

export const orderbookApi = (
  new BaseApi({
    reducerPath,
    baseQuery: customTrOrderbooksFetchBase,
    collectionPath,
  })
).create();

export const { useGetAllQuery } = orderbookApi;

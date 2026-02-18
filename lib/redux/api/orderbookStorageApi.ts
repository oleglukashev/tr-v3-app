import { BaseApi } from "./baseApi";
import { customTrOrderbooksFetchBase } from "../../customFetchBase";

const collectionPath = "storages/orderbooks";
const reducerPath = "orderbookStorage";

export const orderbookStorageApi = (
  new BaseApi({
    reducerPath,
    baseQuery: customTrOrderbooksFetchBase,
    collectionPath,
  })
).create();

export const { useGetAllQuery } = orderbookStorageApi;

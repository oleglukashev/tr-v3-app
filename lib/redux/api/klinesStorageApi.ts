import { BaseApi } from "./baseApi";
import { customTrKlinesFetchBase } from "../../customFetchBase";

const collectionPath = "storages";
const reducerPath = "klinesStorage";

export const klinesStorageApi = (
  new BaseApi({
    reducerPath,
    baseQuery: customTrKlinesFetchBase,
    collectionPath,
  })
).create();

export const { useGetAllQuery } = klinesStorageApi;

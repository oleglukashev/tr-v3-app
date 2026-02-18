import { BaseApi } from "./baseApi";
import { customTrClustersFetchBase } from "../../customFetchBase";

const collectionPath = "storages/bidasks";
const reducerPath = "bidaskStorage";

export const bidaskStorageApi = (
  new BaseApi({
    reducerPath,
    baseQuery: customTrClustersFetchBase,
    collectionPath,
  })
).create();

export const { useGetAllQuery } = bidaskStorageApi;

import { BaseApi } from "./baseApi";
import {customTrClustersFetchBase} from "../../customFetchBase";

const collectionPath = 'fpp';
export const fppApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrClustersFetchBase,
  collectionPath,
})).create();

export const {
  useGetAllQuery
} = fppApi;

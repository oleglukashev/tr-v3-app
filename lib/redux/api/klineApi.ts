import { BaseApi } from "./baseApi";
import {customTrKlinesFetchBase} from "../../customFetchBase";

const collectionPath = 'klines';
export const klineApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrKlinesFetchBase,
  collectionPath,
})).create();

export const {
  useGetAllQuery
} = klineApi;

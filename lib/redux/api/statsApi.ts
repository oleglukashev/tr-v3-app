import { BaseApi } from "./baseApi";
import {customTrApiAuthFetchBase} from "../../customFetchBase";

const collectionPath = 'stats';
export const statsApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrApiAuthFetchBase,
  collectionPath,
})).create();

export const {
  useGetAllQuery,
} = statsApi;

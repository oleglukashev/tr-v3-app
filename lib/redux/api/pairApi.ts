import { BaseApi } from "./baseApi";
import {customTrApiFetchBase} from "../../customFetchBase";

const collectionPath = 'pairs';
export const pairApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrApiFetchBase,
  collectionPath,
})).create();

export const {
  useGetAllQuery
} = pairApi;

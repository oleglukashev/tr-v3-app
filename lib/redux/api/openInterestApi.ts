import { BaseApi } from "./baseApi";
import {customTrKlinesFetchBase} from "../../customFetchBase";

const collectionPath = 'open-interest';
export const openInterestApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrKlinesFetchBase,
  collectionPath,
})).create();

export const {
  useGetAllQuery,
  useLazyGetAllQuery
} = openInterestApi;

import { BaseApi } from "./baseApi";
import {customTrFetchBase} from "../../customFetchBase";

const collectionPath = 'strategy_settings';
export const strategySettingsApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrFetchBase,
  collectionPath,
})).create();

export const {
  useGetAllQuery,
  useGetQuery,
} = strategySettingsApi;

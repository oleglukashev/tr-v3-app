import { BaseApi } from "./baseApi";
import {customTrClustersFetchBase} from "../../customFetchBase";

const collectionPath = 'clusters';
export const clusterApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrClustersFetchBase,
  collectionPath,
})).create();

export const {
  useGetAllQuery
} = clusterApi;

import { BaseApi } from "./baseApi";
import {customTrApiAuthFetchBase} from "../../customFetchBase";

const collectionPath = 'storages';
export const storageApi = (new BaseApi({
  reducerPath: collectionPath,
  baseQuery: customTrApiAuthFetchBase,
  collectionPath,
})).create();

export const {
  useGetAllQuery,
} = storageApi;

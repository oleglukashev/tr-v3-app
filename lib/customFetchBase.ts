import {
  BaseQueryFn,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';

const baseTrQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_TR_DOMAIN,
  //credentials: "include",
  prepareHeaders: (headers) => {
    headers.set('Authorization', `Bearer ${process.env.NEXT_PUBLIC_TR_API_BASIC_TOKEN}`);
    return headers;
  },
});

const baseTrApiQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_TR_API_DOMAIN,
  //credentials: "include",
});

const baseTrKlinesQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_TR_KLINES_DOMAIN,
  //credentials: "include",
});

const baseTrClustersQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_TR_CLUSTERS_DOMAIN,
  //credentials: "include",
});

const fetchBase = async (baseQuery, args: FetchArgs, api, extraOptions) => {
  return baseQuery(args, api, extraOptions);
}

export const customTrApiFetchBase: BaseQueryFn<
  FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args: FetchArgs, api, extraOptions) => {
  return fetchBase(baseTrApiQuery, args, api, extraOptions);
};

export const customTrFetchBase: BaseQueryFn<
  FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args: FetchArgs, api, extraOptions) => {
  return fetchBase(baseTrQuery, args, api, extraOptions);
};

export const customTrKlinesFetchBase: BaseQueryFn<
  FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args: FetchArgs, api, extraOptions) => {
  return fetchBase(baseTrKlinesQuery, args, api, extraOptions);
};

export const customTrClustersFetchBase: BaseQueryFn<
  FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args: FetchArgs, api, extraOptions) => {
  return fetchBase(baseTrClustersQuery, args, api, extraOptions);
};

import { configureStore } from "@reduxjs/toolkit";
import {klineApi} from "@/lib/redux/api/klineApi";
import {dhmApi} from "@/lib/redux/api/dhmApi";
import {pairApi} from "@/lib/redux/api/pairApi";
import {clusterApi} from "@/lib/redux/api/clusterApi";
import {fppApi} from "@/lib/redux/api/fppApi";
import {strategySettingsApi} from "@/lib/redux/api/strategySettingsApi";

export const reduxStore = configureStore({
  reducer: {
    [klineApi.reducerPath]: klineApi.reducer,
    [dhmApi.reducerPath]: dhmApi.reducer,
    [pairApi.reducerPath]: pairApi.reducer,
    [clusterApi.reducerPath]: clusterApi.reducer,
    [fppApi.reducerPath]: fppApi.reducer,
    [strategySettingsApi.reducerPath]: strategySettingsApi.reducer,
  },
  //devTools: process.env.NEXT_PUBLIC_ENV !== "production",
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({}).concat([
      klineApi.middleware,
      dhmApi.middleware,
      pairApi.middleware,
      clusterApi.middleware,
      fppApi.middleware,
      strategySettingsApi.middleware,
    ]),
});

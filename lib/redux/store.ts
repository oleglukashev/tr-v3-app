import { configureStore } from "@reduxjs/toolkit";
import {klineApi} from "@/lib/redux/api/klineApi";
import {dhmApi} from "@/lib/redux/api/dhmApi";
import {pairApi} from "@/lib/redux/api/pairApi";
import {clusterApi} from "@/lib/redux/api/clusterApi";
import {fppApi} from "@/lib/redux/api/fppApi";
import {positionApi} from "@/lib/redux/api/positionApi";
import {orderApi} from "@/lib/redux/api/orderApi";
import {tdaPointsApi} from "@/lib/redux/api/tdaPointsApi";
import { statsApi } from "./api/statsApi";
import {pnlApi} from "@/lib/redux/api/pnlApi";
import {storageApi} from "@/lib/redux/api/storageApi";
import { bidaskStorageApi } from "./api/bidaskStorageApi";
import { klinesStorageApi } from "./api/klinesStorageApi";
import { orderbookStorageApi } from "./api/orderbookStorageApi";
import { orderbookApi } from "./api/orderbookApi";
import {balanceApi} from "@/lib/redux/api/balanceApi";
import { drawingElementsApi } from "./api/drawingElementsApi";

export const reduxStore = configureStore({
  reducer: {
    [klineApi.reducerPath]: klineApi.reducer,
    [dhmApi.reducerPath]: dhmApi.reducer,
    [pairApi.reducerPath]: pairApi.reducer,
    [clusterApi.reducerPath]: clusterApi.reducer,
    [fppApi.reducerPath]: fppApi.reducer,
    [positionApi.reducerPath]: positionApi.reducer,
    [orderApi.reducerPath]: orderApi.reducer,
    [tdaPointsApi.reducerPath]: tdaPointsApi.reducer,
    [statsApi.reducerPath]: statsApi.reducer,
    [pnlApi.reducerPath]: pnlApi.reducer,
    [storageApi.reducerPath]: storageApi.reducer,
    [bidaskStorageApi.reducerPath]: bidaskStorageApi.reducer,
    [klinesStorageApi.reducerPath]: klinesStorageApi.reducer,
    [orderbookStorageApi.reducerPath]: orderbookStorageApi.reducer,
    [orderbookApi.reducerPath]: orderbookApi.reducer,
    [balanceApi.reducerPath]: balanceApi.reducer,
    [drawingElementsApi.reducerPath]: drawingElementsApi.reducer,
  },
  //devTools: process.env.NEXT_PUBLIC_ENV !== "production",
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({}).concat([
      klineApi.middleware,
      dhmApi.middleware,
      pairApi.middleware,
      clusterApi.middleware,
      fppApi.middleware,
      positionApi.middleware,
      orderApi.middleware,
      tdaPointsApi.middleware,
      statsApi.middleware,
      pnlApi.middleware,
      storageApi.middleware,
      bidaskStorageApi.middleware,
      klinesStorageApi.middleware,
      orderbookStorageApi.middleware,
      orderbookApi.middleware,
      balanceApi.middleware,
      drawingElementsApi.middleware,
    ]),
});

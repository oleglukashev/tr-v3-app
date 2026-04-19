'use client'

import {useCallback, useEffect, useMemo, useState} from "react";
import {registerFigure, registerOverlay, registerIndicator} from "klinecharts";
//import {useGetAllQuery as useGetAllKlinesQuery} from "@/lib/redux/api/klineApi";
import {
  useCreateDhmMutation,
  useGetAllDhmQuery, useRemoveDhmMutation, useUpdateDhmMutation, useGetAllActiveDhmQuery,
} from "@/lib/redux/api/dhmApi";
import { useGetAllQuery as useGetAllFppQuery } from "@/lib/redux/api/fppApi";
import {camelCase, delay} from 'lodash';
import CustomDialog from 'src/components/custom-dialog/custom-dialog';
import {onSubmitWrapper} from "@/src/utils/submit";
import {StrategiesDhmDialog} from "@/src/sections/strategies-graph/strategies.dhm-dialog";
import {IconButton} from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from "@mui/icons-material/Delete";
import {StrategiesDhmSettingsDialog} from "@/src/sections/strategies-graph/strategies.dhm-settings-dialog";
import {StrategiesDhmFppFiltersDialog} from "@/src/sections/strategies-graph/strategies.dhm-global-settings-dialog";
import {StrategiesDhmKlineFppsDialog} from "@/src/sections/strategies-graph/strategies.dhm-kline-fpps-dialog";
import moment from "moment/moment";
import {clearFppPatterns, drawFppPatterns, drawHeatmap} from "@/src/utils/klinecharts";
import MapTools from "@/src/components/map-tools/map-tools";
import {
  confirmedCircle,
  ema, finishedByLoseStartKline,
  finishedStartKline,
  godKline, triggeredStartKline,
  waitingStartKline, noneditableRect, clusterKline,
  upCircleBySize, downCircleBySize, bollingerBands, createdStartKline, dhmUp, dhmDown, heatmapItem,
  londonSession, drawLondonSessionOverlays, mintSession, drawMintSessionOverlays,
  blueSession, drawBlueSessionOverlays
} from "@/src/helpers/klinecharts.helper";
import Map from "@/src/components/map/map";
import {useTheme} from "@mui/material/styles";
import rect from "@/src/components/klinecharts-rect/klinecharts-rect";
import createPosition from "@/src/components/klinecharts-create-position/klinecharts-create-position";
import stopPosition from "@/src/components/klinecharts-stop-position/klinecharts-stop-position";
import takePosition from "@/src/components/klinecharts-take-position/klinecharts-take-position";
import enterPosition from "@/src/components/klinecharts-enter-position/klinecharts-enter-position";
import limitOrder from "@/src/components/klinecharts-limit-order/klinecharts-limit-order";
import klinechartPosition from "@/src/components/klinecharts-position/klinecharts-position";
import {useLazyGetByPairIdAndTfAndTsQuery} from "@/lib/redux/api/clusterApi";
import Label from "@/src/components/label";
import {
  //useGetQuery,
  // useCreateMutation as useCreatePositionMutation,
  // useCancelMutation as useCancelPositionMutation,
  // useUpdateMutation as useUpdatePositionMutation
} from "@/lib/redux/api/positionApi";
import {useGetAllQuery} from "@/lib/redux/api/tdaPointsApi";
import {useGetAllQuery as useGetAllOrdersQuery} from "@/lib/redux/api/orderApi";
import {useGetQuery as useGetPositionQuery} from "@/lib/redux/api/positionApi";
import {useRouter, useSearchParams} from "next/navigation";
import { useGetAllQuery as useGetAllOrderbooksQuery } from "@/lib/redux/api/orderbookApi";
import {
  Button,
  Chip,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import {useGetSettingsDhmByPairIdAndTfQuery} from "@/lib/redux/api/dhmApi";

const DEFAULT_GLOBAL_SETTINGS = {
  fppFilters: [
    'interception',
    'reverse',
    'locked_volume',
    'locked_delta',
    'locked_imbalance',
    'test_volume',
    'resistance',
    'weakness',
    'low_last_price_volume',
    //'tda'
  ],
  statusFilters: [
    'created',
    'waiting',
    'triggered',
    'finished',
    'finished_by_size',
    'finished_by_lose',
    'finished_by_trend_finish'
  ],
  fppCombine: false,
  showLiquidity: false,
  showSessions: true,
  showVolume: true,
  showDrawingElements: true,
  dhmVisibleStatuses: ['created', 'waiting', 'triggered', 'finished', 'finished_by_lose', 'finished_by_size'],
};

export default function DhmIndexView({ tf, pairId }: any) {
  const theme = useTheme();
  const router = useRouter();
  let searchParams = useSearchParams();
  const SETTINGS_STORAGE_KEY = 'dhmGraphGlobalSettings';
  const LEGACY_PAIR_SETTINGS_STORAGE_KEY = `settings${pairId}`;
  const LEGACY_FPP_FILTERS_STORAGE_KEY = `fppFilter${pairId}`;
  const [chart, setChart] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [klinesUpdatedAt, setKlinesUpdatedAt] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [currentCluster, setCurrentCuster] = useState(null);
  const [currentKlineFpp, setCurrentKlineFpp] = useState<any[]>(null);
  const [openSettings, setOpenSettings] = useState(false);
  const [openChartSettings, setOpenChartSettings] = useState(false);
  const [openKlineFpp, setOpenKlineFpp] = useState(false);
  const [isDhmSidebarOpen, setIsDhmSidebarOpen] = useState(false);
  const [currentDhm, setCurrentDhm] = useState(null);
  const [currentDhmKline, setCurrentDhmKline] = useState(null);
  const [currentClusterKline, setCurrentClusterKline] = useState(null);
  const [globalSettings, setGlobalSettings] = useState<any>(DEFAULT_GLOBAL_SETTINGS);
  const { fppFilters, statusFilters, fppCombine, showLiquidity, showSessions, showVolume, showDrawingElements, dhmVisibleStatuses } = globalSettings;
  const getLimitOrderPrice = useCallback((order: any, level: any) => {
    const candidates = [
      order?.data?.price,
      order?.price,
      order?.limitPrice,
      level,
    ];
    for (const candidate of candidates) {
      const value = Number(candidate);
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }
    return null;
  }, []);
  //const { data: klines } = useGetAllKlinesQuery({ pairId, page, limit: 5000, tf });
  const { data: orderbooks } = useGetAllOrderbooksQuery(
    { pairId, page, limit: 5000, tf: 5 },
    { skip: !showLiquidity },
  );
  const { data: dhmSettings } = useGetSettingsDhmByPairIdAndTfQuery({ tf, pairId });
  const [trigger] = useLazyGetByPairIdAndTfAndTsQuery();
  //const { data: position, refetch: refetchPosition } = useGetQuery(pairId);
  const { data: fpp } = useGetAllFppQuery({ pairId, page, limit: 5000, tf });
  const { data: dhm } = useGetAllDhmQuery(
    { pairId, tf: 60, statusFilters },
  );
  const { data: dhmSidebarItems } = useGetAllActiveDhmQuery({ });
  const { data: tdaPoints } = useGetAllQuery({ pairId });
  //const [createPositionRtk, { isLoading: isCreatePositionLoading }] = useCreatePositionMutation();
  //const [cancelPositionRtk, { isLoading: isCancelPositionLoading }] = useCancelPositionMutation();
  //const [updatePositionRtk, { isLoading: isUpdatePositionLoading }] = useUpdatePositionMutation();
  const [create, { isLoading: isCreateLoading }] = useCreateDhmMutation();
  const [update, { isLoading: isUpdateLoading }] = useUpdateDhmMutation();
  const [remove, { isLoading }] = useRemoveDhmMutation();
  const { data: orders } = useGetAllOrdersQuery({ pairId, status: 'open' });
  const { data: position } = useGetPositionQuery({ pairId });

  // const clustersAsHashByTs = useMemo(() => {
  //   if (!orderbooks) { return }
  //   const result: any = {};
  //   for (const item of orderbooks) {
  //     result[item.ts] = item;
  //   }
  //   return result;
  // }, [orderbooks]);

  const onSaveGlobalSettingsSubmit = useCallback(async (values: any) => {
    const nextSettings = {
      fppFilters: values.fppFilters,
      statusFilters: values.statusFilters,
      fppCombine: !!values.fppCombine,
      showLiquidity: !!values.showLiquidity,
      showSessions: !!values.showSessions,
      showVolume: values.showVolume !== false,
      showDrawingElements: values.showDrawingElements !== false,
      dhmVisibleStatuses: values.dhmVisibleStatuses || [],
    };
    setGlobalSettings(nextSettings);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
      } catch {}
    }
    setOpenChartSettings(false);
    clearFppPatterns(chart);
    drawFppPatterns(chart, chart.getDataList(), fpp, (tdaPoints || []), nextSettings.fppFilters, nextSettings.fppCombine);
  }, [SETTINGS_STORAGE_KEY, chart, fpp, tdaPoints]);

  useEffect(() => {
    if (typeof window === 'undefined') { return; }
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
        || localStorage.getItem(LEGACY_PAIR_SETTINGS_STORAGE_KEY)
        || localStorage.getItem(LEGACY_FPP_FILTERS_STORAGE_KEY);
      if (!saved) { return; }
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) {
        const nextSettings = {
          ...DEFAULT_GLOBAL_SETTINGS,
          fppFilters: parsed,
        };
        setGlobalSettings(nextSettings);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
        return;
      }
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.filters)) {
          const nextSettings = {
            ...DEFAULT_GLOBAL_SETTINGS,
            fppFilters: parsed.filters,
            fppCombine: !!parsed.combine,
          };
          setGlobalSettings(nextSettings);
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
          return;
        }
        if (Array.isArray(parsed.fppFilters) || Array.isArray(parsed.statusFilters)) {
          const nextSettings = {
            ...DEFAULT_GLOBAL_SETTINGS,
            ...parsed,
            fppCombine: !!parsed.fppCombine,
          };
          setGlobalSettings(nextSettings);
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
        }
      }
    } catch {}
  }, [SETTINGS_STORAGE_KEY, LEGACY_PAIR_SETTINGS_STORAGE_KEY, LEGACY_FPP_FILTERS_STORAGE_KEY]);

  useEffect(() => {
    const onOpenChartSettings = () => {
      setOpenChartSettings(true);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('open-chart-settings-dialog', onOpenChartSettings);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-chart-settings-dialog', onOpenChartSettings);
      }
    };
  }, []);

  const onCreateSubmit = useCallback(async (values: any) => {
    return onSubmitWrapper(() => create(values), (data) => {
      if (data.data) {
        setCurrentDhm(data.data);
      }
    }, 'Успешно создано');
  }, []);

  const onUpdateSubmit = useCallback(async (values: any) => {
    return onSubmitWrapper(() => update({ id: currentDhm.id, values }), null, 'Успешно создано');
  }, [currentDhm?.id, update]);

  const onRemoveSubmit = useCallback(async () => {
    return onSubmitWrapper(() => remove(currentDhm?.id), (data: any) => {
      if (!data?.data) {
        setCurrentDhm(null);
        setCurrentDhmKline(null);
        setCurrentClusterKline(null);
      }
    }, 'Успешно удалено');
  }, [currentDhm?.id, remove]);

  const onDhmSidebarItemClick = useCallback((item: any) => {
    setCurrentDhm(item);
    const targetPairId = item?.pairId;
    const targetTs = item?.kline1Ts ?? item?.kline1?.ts;
    if (!targetPairId || !targetTs) { return; }
    router.push(`/dhm-graph/${targetPairId}/60?ts=${targetTs}`);
  }, [router]);

  // const drawPosition = useCallback((enterPrice, stopPrice, takePrice) => {
  //   if (!chart) { return }
  //   chart.removeOverlay({ name: `enterPosition` })
  //   chart.removeOverlay({ name: `stopPosition` })
  //   chart.removeOverlay({ name: `takePosition` })
  //   chart.createOverlay({
  //     name: `enterPosition`,
  //     points: [{timestamp: null, value: enterPrice }],
  //   })
  //   chart.createOverlay({
  //     name: `stopPosition`,
  //     points: [{timestamp: null, value: stopPrice }],
  //   })
  //   chart.createOverlay({
  //     name: `takePosition`,
  //     points: [{timestamp: null, value: takePrice }],
  //   })
  // }, [chart]);

  // const drawPosition = useCallback(() => {
  //   if (!chart) { return }
  //   if (!position) { return }
  //   chart.removeOverlay({ name: `stopPosition` })
  //   chart.removeOverlay({ name: `takePosition` })
  //   chart.removeOverlay({ name: `position` })
  //   if (position.side === 'long') {
  //     chart.createOverlay({
  //       name: `position`,
  //       points: [{timestamp: null, value: parseFloat(position.data.entryPrice) }],
  //     })
  //     if (position.data.stopLossPrice) {
  //       chart.createOverlay({
  //         name: `stopPosition`,
  //         points: [{timestamp: null, value: parseFloat(position.data.stopLossPrice) }],
  //       })
  //     }
  //     if (position.data.takeProfitPrice) {
  //       chart.createOverlay({
  //         name: `takePosition`,
  //         points: [{timestamp: null, value: parseFloat(position.data.takeProfitPrice) }],
  //       })
  //     }
  //   }
  // }, [chart, position]);

  // const drawOrders = useCallback(() => {
  //   if (!chart) { return }
  //   if (!orders?.length) { return }
  //   chart.removeOverlay({ name: `limitOrder` })
  //   for (const order of orders) {
  //     chart.createOverlay({
  //       name: `limitOrder`,
  //       points: [{timestamp: null, value: parseFloat(order.data.price) }],
  //     })
  //   }
  // }, [chart, orders]);

  // const drawCreatePosition = useCallback(async () => {
  //   if (!chart) { return }
  //   const klines = chart.getDataList();
  //   if (!klines?.length)  { return }
  //   chart.removeOverlay({ name: `createPosition` })
  //   chart.createOverlay({
  //     name: `createPosition`,
  //     points: [{timestamp: null, value: parseFloat(klines[klines.length - 1].close)}],
  //   })
  // }, [chart, chart?.getDataList()]);

  const setDataLoaderCallback = useCallback(() => {
    if (!klinesUpdatedAt) {
      setKlinesUpdatedAt(moment().utc().valueOf());
    }
    if (fpp && drawFppPatterns) {
      const klines = chart.getDataList();
      drawFppPatterns(chart, klines, fpp, (tdaPoints || []), fppFilters, fppCombine);
    }
  }, [klinesUpdatedAt, fpp, chart, tdaPoints, fppFilters, fppCombine])

  useEffect((): void => {
    if (!chart) { return; }
    if (!fpp?.length) { return; }
    if (!dhm?.length) { return; }
    const klines = chart.getDataList();
    if (!klines?.length) { return }
    clearFppPatterns(chart);
    drawFppPatterns(chart, klines, fpp, (tdaPoints || []), fppFilters, fppCombine);
  }, [chart, dhm, fpp, tdaPoints, fppFilters, fppCombine, klinesUpdatedAt]);

  useEffect((): void => {
    if (!chart) { return; }
    if (!showLiquidity) {
      chart.removeOverlay({ name: `heatmapItem` });
      return;
    }
    const klines = chart.getDataList();
    if (!klines?.length) { return }
    if (!orderbooks?.length) { return; }
    drawHeatmap(chart, klines, orderbooks);
  }, [chart, klinesUpdatedAt, orderbooks, showLiquidity]);

  useEffect((): void => {
    if (!chart) { return; }
    if (!showSessions) {
      chart.removeOverlay({ name: 'londonSession' });
      chart.removeOverlay({ name: 'mintSession' });
      chart.removeOverlay({ name: 'blueSession' });
      return;
    }
    const klines = chart.getDataList();
    if (!klines?.length) { return; }
    drawLondonSessionOverlays(chart, klines);
    drawMintSessionOverlays(chart, klines);
    drawBlueSessionOverlays(chart, klines);
  }, [chart, klinesUpdatedAt, showSessions]);

  useEffect((): void => {
    if (!chart) { return; }
    if (!showVolume) {
      chart.removeIndicator('vol_pane', 'VOL');
      return;
    }
    const klines = chart.getDataList();
    if (!klines?.length) { return; }
    chart.createIndicator('VOL', false, { id: 'vol_pane', height: 80 });
  }, [chart, klinesUpdatedAt, showVolume]);

  const onClickClusterHandle = useCallback(async (e: any, kline: any) => {
    console.log('e', e);
    //console.log('currentClusterKline', currentClusterKline);
    const res = await trigger({ pairId, tf, ts: kline.timestamp });
    if (res?.data?.data) {
      setCurrentCuster(res.data.data);
      registerOverlay(clusterKline(res?.data?.data))
      chart.removeOverlay({ name: `clusterKline` });
      chart.createOverlay({
        name: 'clusterKline',
        points: [
          {timestamp: kline.timestamp, value: parseFloat(kline.high)},
          {timestamp: kline.timestamp, value: parseFloat(kline.low)}
        ],
      })
    }
    // console.log(currentClusterKline);
    // console.log('e', e);
  }, [chart, trigger, pairId, tf])

  useEffect(() => {
    if (!chart) {return}
    if (!dhm) {return}
    //if (!fpp) {return}
    //if (!clustersAsHashByTs) {return}
    const klines = chart.getDataList();

    chart.removeOverlay({ name: `dhmUp` })
    chart.removeOverlay({ name: `dhmDown` })
    chart.removeOverlay({ name: `limitOrder` })

    for (const item of dhm) {
      if (!(dhmVisibleStatuses || []).includes(item.status)) { continue; }
      //if (['created', 'waiting', 'triggered', 'finished', 'finished_by_lose', 'finished_by_length'].includes(item.status)) {
        chart.createOverlay({
          name: item.direction === 'up' ? 'dhmUp' : 'dhmDown',
          extendData: {
            ts: item.direction === 'up' ? item.kline1.low : item.kline1.high,
            confirmed: item.confirmed,
            tf: item.tf,
            status: item.status,
          },
          points: [{timestamp: parseInt(item.kline1.ts), value: parseFloat(item.direction === 'up' ? item.kline1.low : item.kline1.high)}],
        })

        if (
          ['up', 'down'].includes(item?.direction)
          && ['triggered', 'waiting'].includes(item?.status)
          && item?.orders
          && typeof item.orders === 'object'
        ) {
          for (const side of Object.keys(item.orders)) {
            const sideOrders = item.orders[side];
            if (!sideOrders || typeof sideOrders !== 'object') { continue; }
            for (const level of Object.keys(sideOrders)) {
              const order = sideOrders[level];
              if (!order?.id || order?.status !== 'success') { continue; }
              const limitOrderPrice = getLimitOrderPrice(order, level);
              if (!limitOrderPrice) { continue; }
              chart.createOverlay({
                name: `limitOrder`,
                points: [{ timestamp: null, value: limitOrderPrice }],
              });
            }
          }
        }
        // chart.createOverlay({
        //   name: `${camelCase(item.status)}StartKline`,
        //   points: [{timestamp: parseInt(item.kline1.ts), value: parseFloat(item.kline1.close)}],
        // })
        // for (const i of [1,2,3]) {
        //   if (item.data?.[`poi${i}`]) {
        //     chart.createOverlay({
        //       name: 'noneditableRect',
        //       points: [
        //         { timestamp: parseInt(item.data?.[`poi${i}`].ts), value: item.data?.[`poi${i}`].high },
        //         { timestamp: parseInt(item.data?.[`poi${i}`].ts) + (100 * 3600000), value: item.data?.[`poi${i}`].low }
        //       ]
        //     })
        //   }
        // }
        //console.log(item.data.kline1.close);
      }

      // if (item.confirmed) {
      //   chart.createOverlay({
      //     name: `confirmedCircle`,
      //     points: [
      //       {
      //         timestamp: parseInt(item.data.kline1.ts),
      //         value: parseFloat(item.data.kline1.low)
      //       }
      //     ]
      //   });
      // }
    //}

    // add EMA200 trand indicator
    chart.createIndicator('EMA', false, { id: 'candle_pane' });
    //chart.createIndicator('RSI');
    //chart.createIndicator('BOLL', false, { id: 'candle_pane' });
    // chart.createIndicator('CUM_DELTA', true);
    //chart.createOverlay({ name: 'custom_rect_overlay' })
    chart.subscribeAction('onCandleBarClick', async (event) => {
      const bar = chart.getBarSpace();
      const { data, x, y } = event
      if (bar.bar >= 25) {
        setCurrentClusterKline(data.current);
        console.log('barWidth', bar);
        console.log(data.current);
        await onClickClusterHandle(event, data.current);
      } else {
        setCurrentDhmKline(data.current);
        console.log(event);
        const currentDhm = dhm.find(item => Number(item.kline1.ts) === Number(data.current.timestamp));
        console.log(currentDhm);
        setCurrentDhm(currentDhm);
      }
    })
    chart.subscribeAction('onZoom', (e) => {
      const bar = chart.getBarSpace();
      if (bar.bar < 25) {
        chart.removeOverlay({ name: 'clusterKline' });
        setCurrentClusterKline(null);
        setCurrentCuster(null);
      }
    })
  }, [chart, fpp, dhm, dhmVisibleStatuses, onClickClusterHandle, getLimitOrderPrice]);

  // useEffect(() => {
  //   if (!chart) {return}
  //   // if (orders?.length) {
  //   //   chart.removeOverlay({ name: `limitOrder` })
  //   //   drawOrders();
  //   // }
  //   // if (position) {
  //   //   chart.removeOverlay({ name: `position` })
  //   //   chart.removeOverlay({ name: `stopPosition` })
  //   //   chart.removeOverlay({ name: `takePosition` })
  //   //   drawPosition();
  //   // }
  //
  //   // if (!position) {
  //   //   chart.removeOverlay({ name: `enterPosition` })
  //   //   chart.removeOverlay({ name: `stopPosition` })
  //   //   chart.removeOverlay({ name: `takePosition` })
  //   //   drawCreatePosition();
  //   // } else {
  //   //   chart.removeOverlay({ name: `createPosition` })
  //   //   drawPosition(Number(position.enter), Number(position.stop), Number(position.take));
  //   // }
  // }, [chart, drawOrders, drawPosition, position, orders]);

  for (const item of [1,2,3,4,5,6,7]) {
    registerOverlay(
      upCircleBySize(item, (e) => {
        setCurrentKlineFpp((fpp || []).filter(item => parseInt(item.ts) === e.overlay.points[0].timestamp));
        setOpenKlineFpp(true);
        return true
      }),
    );

    registerOverlay(
      downCircleBySize(item, (e) => {
        setCurrentKlineFpp((fpp || []).filter(item => parseInt(item.ts) === e.overlay.points[0].timestamp));
        setOpenKlineFpp(true);
        return true
      }),
    );
  }

  registerOverlay(confirmedCircle);
  registerOverlay(finishedStartKline);
  registerOverlay(triggeredStartKline);
  registerOverlay(finishedByLoseStartKline);
  registerOverlay(waitingStartKline);
  registerOverlay(createdStartKline);
  registerOverlay(rect);
  registerOverlay(noneditableRect);
  registerOverlay(clusterKline);
  registerOverlay(heatmapItem());
  registerOverlay(londonSession);
  registerOverlay(mintSession);
  registerOverlay(blueSession);
  // registerOverlay(enterPosition(async (e: any) => {
  //   await cancelPositionRtk(pairId);
  //   await refetchPosition();
  // }));
  registerOverlay(limitOrder(async (e: any) => {
  }));
  registerOverlay(klinechartPosition(async (e: any) => {
  }));
  registerOverlay(stopPosition(async (e) => {
    //updatePositionRtk({ pairId, type: 'stopLoss', price})
  }));
  registerOverlay(takePosition((price: any) => {
    //updatePositionRtk({ pairId, type: 'takeProfit', price})
  }));
  // registerOverlay(
  //   createPosition(async (e: any) => {
  //     const sign = e.figure.attrs[0].text;
  //     if (sign === '⬆') {
  //       await createPositionRtk({ pairId, side: 'buy' })
  //     } else if (sign === '⬇') {
  //       await createPositionRtk({ pairId, side: 'sell' })
  //     }
  //     await refetchPosition();
  //   }
  // ));
  registerIndicator(ema);
  registerIndicator(bollingerBands);
  registerFigure(godKline);
  registerOverlay(dhmUp);
  registerOverlay(dhmDown);
  //registerIndicator(cumDelta);

  return (
    <main style={{ position: 'relative' }}>
      <Map
        pairId={pairId}
        tf={tf}
        defaultTs={searchParams.get('ts')}
        setParentChart={setChart}
        //setCurrentPrice={setCurrentPrice}
        updateWebsocketPriceCallback={() => {
          //drawCreatePosition();
        }}
        setDataLoaderCallback={setDataLoaderCallback}
      />

      <IconButton key='settings' sx={{
        position: 'absolute',
        zIndex: 1,
        left: '18px',
        top: `${112}px`,
        background: theme.palette.grey[200],
        '&:hover': {
          background: theme.palette.grey[300],
        }
      }} aria-label="delete" onClick={() => {
        setOpenSettings(true);
      }}>
        <SettingsIcon />
      </IconButton>

      <MapTools chart={chart} pairId={pairId} tf={tf} showDrawingElements={showDrawingElements} />

      {!isDhmSidebarOpen && (
        <Button
          variant="contained"
          size="small"
          onClick={() => setIsDhmSidebarOpen(true)}
          sx={{
            position: 'absolute',
            zIndex: 2,
            right: '-13px',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            top: '100px',
            transform: 'rotate(-90deg)',
            minWidth: 44,
            px: 1.5,
          }}
        >
          DHM
        </Button>
      )}

      <Drawer
        variant="persistent"
        anchor="right"
        open={isDhmSidebarOpen}
        sx={{
          '& .MuiDrawer-paper': {
            width: 312,
            p: 2,
            overflowY: 'auto',
            borderLeft: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={() => setIsDhmSidebarOpen(false)}
          sx={{ mb: 1.5 }}
        >
          Hide
        </Button>

        <Typography variant="h6" sx={{ mb: 1.5 }}>
          DHM items
        </Typography>

        <List dense sx={{ mb: 1 }}>
          {(dhmSidebarItems || []).map((item: any) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton onClick={() => onDhmSidebarItemClick(item)}>
                <ListItemText
                  primary={(
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: item.direction === 'down'
                            ? theme.palette.error.main
                            : theme.palette.success.main,
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      {`Pair: ${item.pairId} (${moment(Number(item?.kline1?.ts)).format('DD.MM.YYYY HH:mm')})`}
                    </span>
                  )}
                />
                <Label color={'success'}>{item.status}</Label>
              </ListItemButton>
            </ListItem>
          ))}
          {!dhmSidebarItems?.length && (
            <ListItem>
              <ListItemText primary="No items" />
            </ListItem>
          )}
        </List>
      </Drawer>

      <CustomDialog
        open={currentDhmKline}
        onClose={() => setCurrentDhmKline(null)}
        title={(
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{`Kline ${currentDhmKline?.timestamp}`}</span>
            {!!currentDhm && (
              <IconButton aria-label="delete" onClick={onRemoveSubmit} size="small">
                <DeleteIcon />
              </IconButton>
            )}
          </div>
        )}
        content={(
          <StrategiesDhmDialog
            currentDhm={currentDhm}
            currentKline={currentDhmKline}
            onCreateSubmit={onCreateSubmit}
            onUpdateSubmit={onUpdateSubmit}
            onRemoveSubmit={onRemoveSubmit}
            tf={tf}
            pairId={pairId}
            currentPrice={currentPrice}
            dhmSettings={dhmSettings}
          />
        )}
      />

      <CustomDialog
        open={openSettings}
        onClose={() => setOpenSettings(false)}
        title={`Settings`}
        content={(
          <StrategiesDhmSettingsDialog dhmSettings={dhmSettings} tf={tf} pairId={pairId} />
        )}
      />

      <CustomDialog
        open={openChartSettings}
        onClose={() => setOpenChartSettings(false)}
        title={`Chart settings`}
        content={(
          <StrategiesDhmFppFiltersDialog settings={globalSettings} onSubmit={onSaveGlobalSettingsSubmit} />
        )}
      />

      <CustomDialog
        open={openKlineFpp}
        onClose={() => setOpenKlineFpp(false)}
        title={`Kline Fpp`}
        content={(
          <StrategiesDhmKlineFppsDialog fpp={currentKlineFpp} />
        )}
      />
    </main>
  )
}

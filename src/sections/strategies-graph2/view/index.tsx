'use client'

import {useCallback, useEffect, useMemo, useState} from "react";
import {registerFigure, registerOverlay, registerIndicator} from "klinecharts";
//import {useGetAllQuery as useGetAllKlinesQuery} from "@/lib/redux/api/klineApi";
import {
  useCreateDhm2Mutation,
  useGetAllDhm2Query, useRemoveDhm2Mutation, useUpdateDhm2Mutation,
} from "@/lib/redux/api/dhmApi";
import { useGetAllQuery as useGetAllFppQuery } from "@/lib/redux/api/fppApi";
import {camelCase, delay} from 'lodash';
import CustomDialog from 'src/components/custom-dialog/custom-dialog';
import {onSubmitWrapper} from "@/src/utils/submit";
import {StrategiesDhmDialog} from "@/src/sections/strategies-graph2/strategies.dhm-dialog";
import {IconButton} from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import {StrategiesDhmSettingsDialog} from "@/src/sections/strategies-graph2/strategies.dhm-settings-dialog";
import {StrategiesDhmFppFiltersDialog} from "@/src/sections/strategies-graph2/strategies.dhm-global-settings-dialog";
import {StrategiesDhmKlineFppsDialog} from "@/src/sections/strategies-graph2/strategies.dhm-kline-fpps-dialog";
import moment from "moment/moment";
import {clearFppPatterns, drawFppPatterns, drawHeatmap} from "@/src/utils/klinecharts";
import MapTools from "@/src/components/map-tools/map-tools";
import {
  confirmedCircle,
  ema, finishedByLoseStartKline,
  finishedStartKline,
  godKline, triggeredStartKline,
  waitingStartKline, noneditableRect, clusterKline,
  upCircleBySize, downCircleBySize, bollingerBands, createdStartKline, dhmUp, dhmDown, dhmLevel, heatmapItem
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
import {
  //useGetQuery,
  // useCreateMutation as useCreatePositionMutation,
  // useCancelMutation as useCancelPositionMutation,
  // useUpdateMutation as useUpdatePositionMutation
} from "@/lib/redux/api/positionApi";
import {useGetAllQuery} from "@/lib/redux/api/tdaPointsApi";
import {useGetAllQuery as useGetAllOrdersQuery} from "@/lib/redux/api/orderApi";
import {useGetQuery as useGetPositionQuery} from "@/lib/redux/api/positionApi";
import { useGetAllQuery as useGetAllOrderbooksQuery } from "@/lib/redux/api/orderbookApi";

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
    'finished_by_trend_finish',
  ],
  fppCombine: false,
  showLiquidity: false,
};

export default function DhmIndexView({ tf, pairId }: any) {
  const theme = useTheme();
  const SETTINGS_STORAGE_KEY = 'dhm2GraphGlobalSettings';
  const LEGACY_PAIR_SETTINGS_STORAGE_KEY = `settings${pairId}`;
  const LEGACY_FPP_FILTERS_STORAGE_KEY = `fppFilter${pairId}`;
  const [chart, setChart] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [klinesUpdatedAt, setKlinesUpdatedAt] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [currentCluster, setCurrentCuster] = useState(null);
  const [currentKlineFpp, setCurrentKlineFpp] = useState<any[]>(null);
  const [openSettings, setOpenSettings] = useState(false);
  const [openFppFilters, setOpenFppFilters] = useState(false);
  const [openKlineFpp, setOpenKlineFpp] = useState(false);
  const [currentDhm, setCurrentDhm] = useState(null);
  const [currentDhmKline, setCurrentDhmKline] = useState(null);
  const [currentClusterKline, setCurrentClusterKline] = useState(null);
  const [globalSettings, setGlobalSettings] = useState<any>(DEFAULT_GLOBAL_SETTINGS);
  const { fppFilters, statusFilters, fppCombine, showLiquidity } = globalSettings;
  //const { data: klines } = useGetAllKlinesQuery({ pairId, page, limit: 5000, tf });
  const { data: orderbooks } = useGetAllOrderbooksQuery(
    { pairId, page, limit: 5000, tf: 5 },
    { skip: !showLiquidity },
  );
  const [trigger] = useLazyGetByPairIdAndTfAndTsQuery();
  //const { data: position, refetch: refetchPosition } = useGetQuery(pairId);
  const { data: fpp } = useGetAllFppQuery({ pairId, page, limit: 5000, tf });
  const { data: dhm } = useGetAllDhm2Query({ pairId, tf, statusFilters });
  const { data: tdaPoints } = useGetAllQuery({ pairId });
  //const [createPositionRtk, { isLoading: isCreatePositionLoading }] = useCreatePositionMutation();
  //const [cancelPositionRtk, { isLoading: isCancelPositionLoading }] = useCancelPositionMutation();
  //const [updatePositionRtk, { isLoading: isUpdatePositionLoading }] = useUpdatePositionMutation();
  const [create, { isLoading: isCreateLoading }] = useCreateDhm2Mutation();
  const [update, { isLoading: isUpdateLoading }] = useUpdateDhm2Mutation();
  const [remove, { isLoading }] = useRemoveDhm2Mutation();
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
    };
    setGlobalSettings(nextSettings);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
      } catch {}
    }
    setOpenFppFilters(false);
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
    if (!dhm) {return}
    if (!chart) {return}
    if (!fpp) {return}
    //if (!clustersAsHashByTs) {return}
    const klines = chart.getDataList();

    chart.removeOverlay({ name: `dhmUp` })
    chart.removeOverlay({ name: `dhmDown` })

    for (const item of dhm) {
      //if (['created', 'waiting', 'triggered', 'finished', 'finished_by_lose', 'finished_by_length'].includes(item.status)) {
        chart.createOverlay({
          name: item.direction === 'up' ? 'dhmUp' : 'dhmDown',
          extendData: {
            ts: item.direction === 'up' ? item.kline1.low : item.kline1.high,
            confirmed: item.confirmed
          },
          points: [{timestamp: parseInt(item.kline1.ts), value: parseFloat(item.direction === 'up' ? item.kline1.low : item.kline1.high)}],
        })
        // chart.createOverlay({
        //   name: 'dhmLevel',
        //   low: item.low,
        //   high: item.high,
        //   points: [{timestamp: parseInt(item.kline1.ts), value: parseFloat(item.kline1.low)}],
        // })
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
      //}

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
    }

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
        console.log('dhm', dhm[0].kline1);
        console.log('data', data.current);
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
  }, [chart, fpp, dhm, onClickClusterHandle]);

  // useEffect(() => {
  //   if (!chart) {return}
  //   if (orders?.length) {
  //     chart.removeOverlay({ name: `limitOrder` })
  //     drawOrders();
  //   }
  //   if (position) {
  //     chart.removeOverlay({ name: `position` })
  //     chart.removeOverlay({ name: `stopPosition` })
  //     chart.removeOverlay({ name: `takePosition` })
  //     drawPosition();
  //   }
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
  registerOverlay(dhmUp);
  registerOverlay(dhmDown);
  registerOverlay(dhmLevel);
  registerOverlay(heatmapItem());

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
  //registerIndicator(cumDelta);

  return (
    <main>
      <Map
        pairId={pairId}
        tf={tf}
        setParentChart={setChart}
        //setCurrentPrice={setCurrentPrice}
        updateWebsocketPriceCallback={() => {
          //drawCreatePosition();
        }}
        setDataLoaderCallback={setDataLoaderCallback}
      />

      <IconButton key='fppSettings' sx={{
        position: 'absolute',
        zIndex: 1,
        left: '18px',
        top: `${70}px`,
        background: theme.palette.grey[200],
        '&:hover': {
          background: theme.palette.grey[300],
        }
      }} aria-label="delete" onClick={() => {
        setOpenFppFilters(true);
      }}>
        <SettingsIcon />
      </IconButton>

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

      <MapTools chart={chart} pairId={pairId} tf={tf} />

      <CustomDialog
        open={currentDhmKline}
        onClose={() => setCurrentDhmKline(null)}
        title={`Kline ${currentDhmKline?.timestamp}`}
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
          />
        )}
      />

      <CustomDialog
        open={openSettings}
        onClose={() => setOpenSettings(false)}
        title={`Settings`}
        content={(
          <StrategiesDhmSettingsDialog tf={tf} pairId={pairId} />
        )}
      />

      <CustomDialog
        open={openFppFilters}
        onClose={() => setOpenFppFilters(false)}
        title={`Fpp filters`}
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

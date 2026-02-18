'use client'

import {useCallback, useEffect, useMemo, useState} from "react";
import {registerFigure, registerOverlay, registerIndicator} from "klinecharts";
//import {useGetAllQuery as useGetAllKlinesQuery} from "@/lib/redux/api/klineApi";
import {
  useCreateMutation,
  useGetAllQuery as useGetAllDhmQuery, useGetAllTestQuery, useRemoveMutation, useUpdateMutation,
} from "@/lib/redux/api/dhmApi";
import { useGetAllQuery as useGetAllFppQuery } from "@/lib/redux/api/fppApi";
import {camelCase, delay} from 'lodash';
import CustomDialog from 'src/components/custom-dialog/custom-dialog';
import {onSubmitWrapper} from "@/src/utils/submit";
import {StrategiesDhmDialog} from "@/src/sections/strategies-graph-test/strategies.dhm-dialog";
import {IconButton} from "@mui/material";
import SpeedIcon from '@mui/icons-material/Speed';
import SettingsIcon from '@mui/icons-material/Settings';
import {StrategiesDhmBacktestDialog} from "@/src/sections/strategies-graph-test/strategies.dhm-backtest-dialog";
//import {StrategiesDhmSettingsDialog} from "@/src/sections/strategies-graph-test/strategies.dhm-settings-dialog";
import {StrategiesDhmFppFiltersDialog} from "@/src/sections/strategies-graph-test/strategies.dhm-fpp-filters-dialog";
import {StrategiesDhmKlineFppsDialog} from "@/src/sections/strategies-graph-test/strategies.dhm-kline-fpps-dialog";
import moment from "moment/moment";
import {clearFppPatterns, drawFppPatterns} from "@/src/utils/klinecharts";
import MapTools from "@/src/components/map-tools/map-tools";
import {
  confirmedCircle,
  ema, finishedByLoseStartKline,
  finishedStartKline,
  godKline, triggeredStartKline,
  waitingStartKline, noneditableRect, clusterKline,
  upCircleBySize, downCircleBySize, bollingerBands, createdStartKline
} from "@/src/helpers/klinecharts.helper";
import Map from "@/src/components/map/map";
import {useTheme} from "@mui/material/styles";
import rect from "@/src/components/klinecharts-rect/klinecharts-rect";
import createPosition from "@/src/components/klinecharts-create-position/klinecharts-create-position";
import stopPosition from "@/src/components/klinecharts-stop-position/klinecharts-stop-position";
import takePosition from "@/src/components/klinecharts-take-position/klinecharts-take-position";
import enterPosition from "@/src/components/klinecharts-enter-position/klinecharts-enter-position";
import {useLazyGetByPairIdAndTfAndTsQuery} from "@/lib/redux/api/clusterApi";
import {
  useGetQuery,
} from "@/lib/redux/api/positionApi";
import {useSearchParams} from "next/navigation";
//import {useGetAllQuery} from "@/lib/redux/api/tdaPointsApi";

export default function DhmIndexView({ tf, pairId }: any) {
  const theme = useTheme();
  let searchParams = useSearchParams();
  const FPP_FILTERS_STORAGE_KEY = `fppFilter${pairId}`;
  const [chart, setChart] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [klinesUpdatedAt, setKlinesUpdatedAt] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [currentCluster, setCurrentCuster] = useState(null);
  const [currentKlineFpp, setCurrentKlineFpp] = useState<any[]>(null);
  const [openBacktest, setOpenBacktest] = useState(false);
  const [openFppFilters, setOpenFppFilters] = useState(false);
  const [openKlineFpp, setOpenKlineFpp] = useState(false);
  const [currentDhm, setCurrentDhm] = useState(null);
  const [currentDhmKline, setCurrentDhmKline] = useState(null);
  const [currentClusterKline, setCurrentClusterKline] = useState(null);
  const [fppFilters, setFppFilters] = useState<any[]>([
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
  ]);
  const [fppCombine, setFppCombine] = useState<boolean>(false);
  //const { data: klines } = useGetAllKlinesQuery({ pairId, page, limit: 5000, tf });
  //const { data: orderbooks } = useGetAllClustersQuery({ pairId, page, limit: 5000, tf });
  const [trigger] = useLazyGetByPairIdAndTfAndTsQuery();
  const { data: position, refetch: refetchPosition } = useGetQuery(pairId);
  const { data: fpp } = useGetAllFppQuery({ pairId, page, limit: 5000, tf });
  // const { data: dhm } = useGetAllDhmQuery({ pairId, tf: 60 });
  //const { data: tdaPoints } = useGetAllQuery({ pairId });
  const { data: testDhm } = useGetAllTestQuery({ pairId, tf: 60 });
  const [create, { isLoading: isCreateLoading }] = useCreateMutation();
  const [update, { isLoading: isUpdateLoading }] = useUpdateMutation();
  const [remove, { isLoading }] = useRemoveMutation();

  // const clustersAsHashByTs = useMemo(() => {
  //   if (!orderbooks) { return }
  //   const result: any = {};
  //   for (const item of orderbooks) {
  //     result[item.ts] = item;
  //   }
  //   return result;
  // }, [orderbooks]);

  const onSaveFppFiltersSubmit = useCallback(async (values: any) => {
    setFppFilters(values.fppFilters);
    setFppCombine(!!values.fppCombine);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FPP_FILTERS_STORAGE_KEY, JSON.stringify({ filters: values.fppFilters, combine: !!values.fppCombine }));
      } catch {}
    }
    setOpenFppFilters(false);
    clearFppPatterns(chart);
    drawFppPatterns(chart, chart.getDataList(), fpp, [], values.fppFilters, !!values.fppCombine);
  }, [FPP_FILTERS_STORAGE_KEY, chart, fpp]);

  useEffect(() => {
    if (typeof window === 'undefined') { return; }
    try {
      const saved = localStorage.getItem(FPP_FILTERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          setFppFilters(parsed);
        } else if (parsed && Array.isArray(parsed.filters)) {
          setFppFilters(parsed.filters);
          setFppCombine(!!parsed.combine);
        }
      }
    } catch {}
  }, [FPP_FILTERS_STORAGE_KEY]);

  const data = useMemo(() => {
    if (!testDhm?.length) { return }
    return {
      count: testDhm.length,
      created: testDhm.filter(item => item.status === 'created').length,
      finished: testDhm.filter(item => item.status === 'finished').length,
      triggered: testDhm.filter(item => item.status === 'triggered').length,
      waiting: testDhm.filter(item => item.status === 'waiting').length,
      finishedBySize: testDhm.filter(item => item.status === 'finished_by_size').length,
      finishedByLose: testDhm.filter(item => item.status === 'finished_by_lose').length,
      finishedByLength: testDhm.filter(item => item.status === 'finished_by_length').length,
      closedByLength: testDhm.filter(item => item.status === 'closed_by_length').length
    }
  }, [testDhm]);

  useEffect(() => {
    if (!testDhm) {return}
    if (!chart) {return}
    // chart.applyNewData(klines.map((item: any) => {
    //   // Создаем графическую метку
    //   return {
    //     ...item,
    //     timestamp: parseInt(item.ts),
    //     volume: parseInt(item.volume),
    //   }
    // }))

    for (const item of testDhm) {
      if (['created', 'waiting', 'triggered', 'finished', 'finished_by_lose', 'finished_by_length'].includes(item.status)) {
        chart.createOverlay({
          name: `${camelCase(item.status)}StartKline`,
          points: [{timestamp: parseInt(item.data.kline1.ts), value: parseFloat(item.data.kline1.close)}],
        })
      }
    }
    chart.subscribeAction('onCandleBarClick', (event) => {
      const { data, x, y } = event
      const currentDhm = testDhm.find(item => item.data.kline1.id === data.current.id);
      console.log(currentDhm);
    })
  }, [chart, testDhm]);

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

  const drawPosition = useCallback((enterPrice, stopPrice, takePrice) => {
    if (!chart) { return }
    chart.removeOverlay({ name: `enterPosition` })
    chart.removeOverlay({ name: `stopPosition` })
    chart.removeOverlay({ name: `takePosition` })
    chart.createOverlay({
      name: `enterPosition`,
      points: [{timestamp: null, value: enterPrice }],
    })
    chart.createOverlay({
      name: `stopPosition`,
      points: [{timestamp: null, value: stopPrice }],
    })
    chart.createOverlay({
      name: `takePosition`,
      points: [{timestamp: null, value: takePrice }],
    })
  }, [chart]);

  const drawCreatePosition = useCallback(async () => {
    if (!chart) { return }
    const klines = chart.getDataList();
    if (!klines?.length)  { return }
    chart.removeOverlay({ name: `createPosition` })
    chart.createOverlay({
      name: `createPosition`,
      points: [{timestamp: null, value: parseFloat(klines[klines.length - 1].close)}],
    })
  }, [chart, chart?.getDataList()]);

  const setDataLoaderCallback = useCallback(() => {
    if (!klinesUpdatedAt) {
      setKlinesUpdatedAt(moment().utc().valueOf());
    }
    if (fpp && drawFppPatterns) {
      const klines = chart.getDataList();
      drawFppPatterns(chart, klines, fpp, [], fppFilters, fppCombine);
    }
  }, [klinesUpdatedAt, fpp, chart, fppFilters, fppCombine])

  useEffect((): void => {
    if (!chart) { return; }
    if (!fpp?.length) { return; }
    //if (!dhm?.length) { return; }
    const klines = chart.getDataList();
    if (!klines?.length) { return }
    clearFppPatterns(chart);
    drawFppPatterns(chart, klines, fpp, [], fppFilters, fppCombine);
  }, [chart, fpp, fppFilters, fppCombine, klinesUpdatedAt]);

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
    if (!testDhm) {return}
    if (!chart) {return}
    if (!fpp) {return}
    //if (!clustersAsHashByTs) {return}

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
        const currentDhm = testDhm.find(item => item.data.kline1.id === data.current.id);
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
  }, [chart, fpp, testDhm, onClickClusterHandle]);

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
  registerOverlay(createdStartKline);
  registerOverlay(waitingStartKline);
  registerOverlay(rect);
  registerOverlay(noneditableRect);
  registerOverlay(clusterKline);
  // registerOverlay(enterPosition(async (e: any) => {
  //   await cancelPositionRtk(pairId);
  //   await refetchPosition();
  // }));
  // registerOverlay(stopPosition(async (e) => {
  //   updatePositionRtk({ pairId, type: 'stopLoss', price})
  // }));
  // registerOverlay(takePosition((price: any) => {
  //   updatePositionRtk({ pairId, type: 'takeProfit', price})
  // }));
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
        defaultTs={searchParams.get('ts')}
        setParentChart={setChart}
        //setCurrentPrice={setCurrentPrice}
        updateWebsocketPriceCallback={() => {
          drawCreatePosition();
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

      <IconButton key='backtest' sx={{
        position: 'absolute',
        zIndex: 1,
        left: '18px',
        top: `${112}px`,
        background: theme.palette.grey[200],
        '&:hover': {
          background: theme.palette.grey[300],
        }
      }} aria-label="delete" onClick={() => {
        setOpenBacktest(true);
      }}>
        <SpeedIcon />
      </IconButton>

      <MapTools chart={chart} />

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
        maxWidth='lg'
        open={openBacktest}
        onClose={() => setOpenBacktest(false)}
        title={`Back test`}
        content={(
          <StrategiesDhmBacktestDialog
            klines={chart ? chart.getDataList() : []}
            tf={tf}
            pairId={pairId}
          />
        )}
      />

      <CustomDialog
        open={openFppFilters}
        onClose={() => setOpenFppFilters(false)}
        title={`Fpp filters`}
        content={(
          <StrategiesDhmFppFiltersDialog fppFilters={fppFilters} fppCombine={fppCombine} onSubmit={onSaveFppFiltersSubmit} />
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

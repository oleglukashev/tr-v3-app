'use client'

import {useCallback, useEffect, useMemo, useState} from "react";
import {registerFigure, registerOverlay, registerIndicator} from "klinecharts";
import {
  useGetAllTestDhmQuery,
} from "@/lib/redux/api/dhmApi";
import { useGetAllQuery as useGetAllFppQuery } from "@/lib/redux/api/fppApi";
import CustomDialog from 'src/components/custom-dialog/custom-dialog';
import {StrategiesDhmDialog} from "@/src/sections/strategies-graph-test/strategies.dhm-dialog";
import {IconButton} from "@mui/material";
import SpeedIcon from '@mui/icons-material/Speed';
import SettingsIcon from '@mui/icons-material/Settings';
import {StrategiesDhmBacktestDialog} from "@/src/sections/strategies-graph-test/strategies.dhm-backtest-dialog";
import {StrategiesDhmFppFiltersDialog} from "@/src/sections/strategies-graph-test/strategies.dhm-fpp-filters-dialog";
import {StrategiesDhmKlineFppsDialog} from "@/src/sections/strategies-graph-test/strategies.dhm-kline-fpps-dialog";
import moment from "moment/moment";
import {clearFppPatterns, drawFppPatterns} from "@/src/utils/klinecharts";
import MapTools from "@/src/components/map-tools/map-tools";
import { useMapDrawingOverlayRef } from "@/src/components/map-tools/use-map-drawing-overlay-ref";
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
import {useLazyGetByPairIdAndTfAndTsQuery} from "@/lib/redux/api/clusterApi";
import {useSearchParams} from "next/navigation";

registerOverlay(confirmedCircle);
registerOverlay(finishedStartKline);
registerOverlay(triggeredStartKline);
registerOverlay(finishedByLoseStartKline);
registerOverlay(createdStartKline);
registerOverlay(waitingStartKline);
registerOverlay(rect);
registerOverlay(noneditableRect);
registerOverlay(clusterKline);
registerIndicator(ema);
registerIndicator(bollingerBands);
registerFigure(godKline);

export default function DhmIndexView({ tf, pairId }: any) {
  const theme = useTheme();
  let searchParams = useSearchParams();
  const FPP_FILTERS_STORAGE_KEY = `fppFilter${pairId}`;
  const [chart, setChart] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [klinesUpdatedAt, setKlinesUpdatedAt] = useState<number | null>(null);
  const [currentKlineFpp, setCurrentKlineFpp] = useState<any[]>(null);
  const [openBacktest, setOpenBacktest] = useState(false);
  const [openFppFilters, setOpenFppFilters] = useState(false);
  const [openKlineFpp, setOpenKlineFpp] = useState(false);
  const [currentDhm, setCurrentDhm] = useState(null);
  const [currentDhmKline, setCurrentDhmKline] = useState(null);
  const [currentClusterKline, setCurrentClusterKline] = useState(null);
  const { mapDrawingOverlayActiveRef, onDrawingInteractionChange } = useMapDrawingOverlayRef();
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
  const [trigger] = useLazyGetByPairIdAndTfAndTsQuery();
  const { data: position, refetch: refetchPosition } = useGetQuery(pairId);
  const { data: fpp } = useGetAllFppQuery({ pairId, page, limit: 5000, tf });
  const { data: testDhm } = useGetAllTestDhmQuery({ pairId, tf: 60 });

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

    for (const item of testDhm) {
      if (['created', 'waiting', 'triggered', 'finished', 'finished_by_lose', 'finished_by_length'].includes(item.status)) {
        chart.createOverlay({
          name: `${camelCase(item.status)}StartKline`,
          points: [{timestamp: parseInt(item.data.kline1.ts), value: parseFloat(item.data.kline1.close)}],
        })
      }
    }
  }, [chart, testDhm]);

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
  }, [chart]);

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
    const res = await trigger({ pairId, tf, ts: kline.timestamp });
    if (res?.data?.data) {
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
  }, [chart, trigger, pairId, tf])

  useEffect(() => {
    if (!testDhm) {return}
    if (!chart) {return}
    if (!fpp) {return}

    chart.createIndicator('EMA', false, { id: 'candle_pane' });

    const onCandleBarClick = async (event: any) => {
      const bar = chart.getBarSpace();
      const { data } = event;
      if (bar.bar >= 25) {
        setCurrentClusterKline(data.current);
        await onClickClusterHandle(event, data.current);
      } else {
        if (mapDrawingOverlayActiveRef.current) {
          return;
        }
        setCurrentDhmKline(data.current);
        const currentDhm = testDhm.find((item: any) => item.data.kline1.id === data.current.id);
        setCurrentDhm(currentDhm);
      }
    };
    const onZoom = (e: any) => {
      const bar = chart.getBarSpace();
      if (bar.bar < 25) {
        chart.removeOverlay({ name: 'clusterKline' });
        setCurrentClusterKline(null);
      }
    };
    chart.subscribeAction('onCandleBarClick', onCandleBarClick);
    chart.subscribeAction('onZoom', onZoom);
    return () => {
      chart.unsubscribeAction?.('onCandleBarClick', onCandleBarClick);
      chart.unsubscribeAction?.('onZoom', onZoom);
    };
  }, [chart, fpp, testDhm, onClickClusterHandle, mapDrawingOverlayActiveRef]);

  useEffect(() => {
    for (const item of [1,2,3,4,5,6,7]) {
      registerOverlay(
        upCircleBySize(item, (e) => {
          setCurrentKlineFpp((fpp || []).filter(item => parseInt(item.ts) === e.overlay.points[0].timestamp));
          setOpenKlineFpp(true);
          return true;
        }),
      );
      registerOverlay(
        downCircleBySize(item, (e) => {
          setCurrentKlineFpp((fpp || []).filter(item => parseInt(item.ts) === e.overlay.points[0].timestamp));
          setOpenKlineFpp(true);
          return true;
        }),
      );
    }
  }, [fpp]);

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

      <MapTools
        chart={chart}
        pairId={pairId}
        tf={tf}
        showDrawingElements
        onDrawingInteractionChange={onDrawingInteractionChange}
      />

      <CustomDialog
        open={currentDhmKline}
        onClose={() => setCurrentDhmKline(null)}
        title={`Kline ${currentDhmKline?.timestamp}`}
        content={(
          <StrategiesDhmDialog
            currentDhm={currentDhm}
            currentKline={currentDhmKline}
            //onCreateSubmit={onCreateSubmit}
            //onUpdateSubmit={onUpdateSubmit}
            //onRemoveSubmit={onRemoveSubmit}
            tf={tf}
            pairId={pairId}
            currentPrice={null}
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

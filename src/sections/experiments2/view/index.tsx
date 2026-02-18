'use client'

import {useCallback, useEffect, useMemo, useState} from "react";
import {registerIndicator, registerOverlay} from "klinecharts";
import {useGetAllQuery as useGetAllDhmQuery} from "@/lib/redux/api/dhmApi";
import { useGetAllQuery as useGetAllFppQuery } from "@/lib/redux/api/fppApi";
import CustomDialog from 'src/components/custom-dialog/custom-dialog';
import {IconButton} from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import {StrategiesDhmFppFiltersDialog} from "@/src/sections/strategies-graph/strategies.dhm-global-settings-dialog";
import {StrategiesDhmKlineFppsDialog} from "@/src/sections/strategies-graph/strategies.dhm-kline-fpps-dialog";
import { useGetAllQuery as useGetAllClustersQuery } from "@/lib/redux/api/clusterApi";
import {clusterPocRow, klineDirection} from "klines-footprint-patterns";
import MapTools from "@/src/components/map-tools/map-tools";
import Map from "@/src/components/map/map";
import {
  downCircleBySize,
  ema, getInterception,
  getPriceByWebSocket,
  getWeaknessKline,
  upCircleBySize, cumDelta, bollingerBands, getReverse2

} from "@/src/helpers/klinecharts.helper";
import {useTheme} from "@mui/material/styles";
import {direction} from "@/src/utils/klinecharts";
import moment from "moment";

export default function ExperimentsIndexView({ tf, pairId }: any) {
  const theme = useTheme();
  const FPP_FILTERS_STORAGE_KEY = `fppFilter${pairId}`;
  const [chart, setChart] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [currentKlineFpp, setCurrentKlineFpp] = useState<any[]>(null);
  const [openFppFilters, setOpenFppFilters] = useState(false);
  const [openKlineFpp, setOpenKlineFpp] = useState(false);
  const { data: clusters } = useGetAllClustersQuery({ pairId, page, limit: 5000, tf });
  const { data: fpp } = useGetAllFppQuery({ pairId, page, limit: 1000, tf });
  const { data: dhm } = useGetAllDhmQuery({ pairId, tf: 60 });
  const [fppFilters, setFppFilters] = useState<any[]>([
    'interception',
    'reverse',
    'locked_volume',
    'locked_delta',
    'locked_imbalance',
    'test_volume',
    'resistance',
    'low_last_price_volume'
  ]);
  const [fppCombine, setFppCombine] = useState<boolean>(false);

  const clustersAsHashByTs = useMemo(() => {
    if (!clusters) { return }
    const result: any = {};
    for (const item of clusters) {
      result[item.ts] = item;
    }
    return result;
  }, [clusters]);

  const onSaveFppFiltersSubmit = useCallback(async (values: any) => {
    setFppFilters(values.fppFilters);
    setFppCombine(!!values.fppCombine);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FPP_FILTERS_STORAGE_KEY, JSON.stringify({ filters: values.fppFilters, combine: !!values.fppCombine }));
      } catch {}
    }
    setOpenFppFilters(false);
    for (const item of [1,2,3,4,5,6,7]) {
      chart.removeOverlay({ name: `up${item}Circle` });
      chart.removeOverlay({ name: `down${item}Circle` });
    }
    drawFppPatterns(fpp);
  }, [chart, fpp]);
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

  useEffect(() => {
    if (typeof window === 'undefined') { return; }
    try {
      const saved = localStorage.getItem(FPP_FILTERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          setFppFilters(parsed);
        }
      }
    } catch {}
  }, [FPP_FILTERS_STORAGE_KEY]);

  const drawFppPatterns = useCallback((fpp) => {
    if (!fpp?.length) { return }
    if (!clustersAsHashByTs) { return }
    const klines = chart.getDataList();

    for (const [index, kline] of klines.entries()) {
      const klineMinus1 = index ? klines[index - 1] : null;
      const klineMinus2 = index ? klines[index - 2] : null;
      const klineMinus3 = index ? klines[index - 3] : null;
      const klineMinus4 = index ? klines[index - 4] : null;
      const klineMinus5 = index ? klines[index - 5] : null;
      const klineMinus6 = index ? klines[index - 6] : null;
      const klineMinus7 = index ? klines[index - 7] : null;
      const klineMinus8 = index ? klines[index - 8] : null;
      const klineMinus9 = index ? klines[index - 9] : null;
      const klineMinus10 = index ? klines[index - 10] : null;
      const klineMinus11 = index ? klines[index - 11] : null;
      const klineMinus12 = index ? klines[index - 12] : null;
      const klineMinus13 = index ? klines[index - 13] : null;
      //const klineMinus10 = index ? klines[index - 4] : null;
      // const klinePlus1 = index ? klines[index + 1] : null;
      // const klinePlus2 = index ? klines[index + 2] : null;

      const cluster = clustersAsHashByTs?.[kline.timestamp];
      const clusterMinus1 = clustersAsHashByTs?.[klineMinus1?.timestamp];


      const weakness = getWeaknessKline(kline, cluster);
      const interception = getInterception(klineMinus1, clusterMinus1, kline, cluster);
      //const powerTrend = getPowerTrend([kline, klineMinus1, klineMinus2, klineMinus3, klineMinus4, klineMinus5, klineMinus6, klineMinus7, klineMinus8, klineMinus9, klineMinus10, klineMinus11, klineMinus12, klineMinus13]);
      const reverse2 = getReverse2(kline, cluster);

      let isWeaknessEnabled = false;
      let isInterceptionEnabled = false;
      //
      if (weakness) {
        isWeaknessEnabled = true;
      }

      if (interception && klineMinus2 && interception.direction === 'down') {
        isInterceptionEnabled = true;
      }
      //
      if (interception && klineMinus2 && interception.direction === 'up') {
        isInterceptionEnabled = true;
      }

      if (weakness) {
        chart.createOverlay({
          name: `${weakness.direction}5Circle`,
          points: [
            {
              timestamp: parseInt(kline.timestamp),
              value: parseFloat(weakness.direction === 'down' ? kline.high : kline.low),
            }
          ]
        });
      }
    }
  }, [chart, clustersAsHashByTs]);

  const setDataLoaderCallback = useCallback(() => {
    if (fpp && drawFppPatterns) {
      drawFppPatterns(fpp);
    }
  }, [fpp, drawFppPatterns])

  useEffect(() => {
    if (!chart) {return}
    if (!fpp) {return}
    //if (!clustersAsHashByTs) {return}
    drawFppPatterns(fpp);

    //chart.removeIndicator({ name: 'EMA' })
    chart.removeIndicator({ name: 'CUM_DELTA' })
    chart.removeIndicator({ name: 'BOLL' })

    // add EMA200 trand indicator
    //chart.createIndicator('MACD', false, { id: 'candle_pane' });
    //chart.createIndicator('EMA', false, { id: 'candle_pane' });
    //chart.createIndicator('CUM_DELTA', true);
    //chart.createOverlay({ name: 'custom_rect_overlay' })

    //chart.createOverlay('longPosition');
  }, [chart, clustersAsHashByTs, fpp]);

  // useEffect(() => {
  //   if (!chart) { return }
  //   getPriceByWebSocket(chart, pairId, tf, (msg: any) => {
  //     const data = JSON.parse(msg.data)
  //     if (data.type === 'kline') {
  //       console.log('Пришла свеча:', data.data)
  //       console.log('d', data.data.ts);
  //       console.log('chart.updateData', chart.updateData);
  //     }
  //   })
  // }, [chart, pairId, tf])

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

  registerIndicator(bollingerBands);
  registerIndicator(ema);
  registerIndicator({
    name: 'CUM_DELTA',
    calc: (dataList) => {
      let cum = 0;
      if (!clustersAsHashByTs) {return []}
      return dataList.map((bar: any) => {
        //console.log(bar);
        const cluster = clustersAsHashByTs?.[bar.timestamp];
        let bv = 0;
        let sv = 0;
        for (let key in cluster.data) {
          bv += parseFloat(cluster.data[key].bv);
          sv += parseFloat(cluster.data[key].sv);
        }
        const delta = parseInt(bv) - parseInt(sv);
        cum += delta;
        return { value: cum };
      });
    },
    figures: [
      {
        key: 'value',
        title: 'CUM_DELTA',
        type: 'line'
      }
    ]
  });

  return (
    <main>
      <Map
        pairId={pairId}
        tf={tf}
        // fpp={fpp}
        // drawFppPatterns={drawFppPatterns}
        setDataLoaderCallback={setDataLoaderCallback}
        setParentChart={setChart}
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
        <SettingsIcon/>
      </IconButton>

      <MapTools chart={chart} />

      <CustomDialog
        open={openFppFilters}
        onClose={() => setOpenFppFilters(false)}
        title={`Fpp filters`}
        content={(
          <StrategiesDhmFppFiltersDialog
            settings={{ fppFilters, statusFilters: [], fppCombine }}
            onSubmit={onSaveFppFiltersSubmit}
          />
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

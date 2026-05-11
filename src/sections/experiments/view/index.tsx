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
import { useMapDrawingOverlayRef } from "@/src/components/map-tools/use-map-drawing-overlay-ref";
import Map from "@/src/components/map/map";
import {downCircleBySize, ema, getPriceByWebSocket, upCircleBySize} from "@/src/helpers/klinecharts.helper";
import {useTheme} from "@mui/material/styles";
import {direction} from "@/src/utils/klinecharts";

export default function ExperimentsIndexView({ tf, pairId }: any) {
  const theme = useTheme();
  const mapDrawingOverlay = useMapDrawingOverlayRef();
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
    'weak_locked_volume',
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

  const drawFppPatterns = useCallback((fpp) => {
    if (!fpp?.length) { return }
    if (!clustersAsHashByTs) { return }
    const klines = chart.getDataList();

    for (const [index, kline] of klines.entries()) {
      // const klineMinus1 = index ? klines[index - 1] : null;
      // const klineMinus2 = index ? klines[index - 2] : null;
      // const klineMinus3 = index ? klines[index - 3] : null;
      // const klineMinus4 = index ? klines[index - 4] : null;
      // const klinePlus1 = index ? klines[index + 1] : null;
      // const klinePlus2 = index ? klines[index + 2] : null;
      const cluster = clustersAsHashByTs[kline.timestamp];
      if (!cluster) { continue; }
      // if (!klineMinus1) { continue; }
      // if (!klineMinus2) { continue; }
      // if (!klineMinus3) { continue; }
      // if (!klineMinus4) { continue; }
      // if (!klinePlus1) { continue; }
      // if (!klinePlus2) { continue; }
      //
      // // up
      // if (
      //   parseFloat(kline.high) > parseFloat(klineMinus1.high) &&
      //   parseFloat(klineMinus1.high) > parseFloat(klineMinus2.high) &&
      //   //parseFloat(klineMinus2.high) > parseFloat(klineMinus3.high) &&
      //   //parseFloat(klineMinus3.high) > parseFloat(klineMinus4.high) &&
      //   //parseFloat(kline.high) > parseFloat(klinePlus1.high) &&
      //   //parseFloat(klinePlus1.high) > parseFloat(klinePlus2.high) &&
      //   //parseFloat(klineMinus2.high) > parseFloat(klineMinus3.high) &&
      //   klineDirection(kline) === 'down'
      // ) {
      //   //const sorted = sortedCluster(cluster.data, 'desc');
      //   //const poc = clusterPocRow(cluster.data);
      //   //if (!poc || !sorted[0]) { continue; }
      //   //if (sorted[0].p === poc.p) {
      //     console.log(111111);
      //     chart.createOverlay({
      //       name: `down5Circle`,
      //       points: [
      //         {
      //           timestamp: parseInt(kline.timestamp),
      //           value: parseFloat(kline.high),
      //         }
      //       ]
      //     });
      //   //}
      //   // down
      // } else if (
      //   parseFloat(kline.low) < parseFloat(klineMinus1.low) &&
      //   parseFloat(klineMinus1.low) < parseFloat(klineMinus2.low) &&
      //   //parseFloat(klineMinus2.low) < parseFloat(klineMinus3.low) &&
      //   //parseFloat(klineMinus3.low) < parseFloat(klineMinus4.low) &&
      //   //parseFloat(kline.low) < parseFloat(klinePlus1.low) &&
      //   //parseFloat(klinePlus1.low) < parseFloat(klinePlus2.low) &&
      //   //parseFloat(klineMinus2.low) < parseFloat(klineMinus3.low) &&
      //   klineDirection(kline) === 'up'
      // ) {
      //   //const sorted = sortedCluster(cluster.data);
      //   //const poc = clusterPocRow(cluster.data);
      //   //if (!poc || !sorted[0]) { continue; }
      //   //if (sorted[0].p === poc.p) {
      //     console.log(111111);
      //     chart.createOverlay({
      //       name: `up5Circle`,
      //       points: [
      //         {
      //           timestamp: parseInt(kline.timestamp),
      //           value: parseFloat(kline.low),
      //         }
      //       ]
      //     });
      //   //}
      // }

      const klineDirection = direction(kline);
      const topWickSize =
        parseFloat(kline.high) -
        (klineDirection === 'up'
          ? parseFloat(kline.close)
          : parseFloat(kline.open));
      const bottomWickSize =
        (klineDirection === 'up'
          ? parseFloat(kline.open)
          : parseFloat(kline.close)) - parseFloat(kline.low);
      const bodyWickSize =
        klineDirection === 'up'
          ? parseFloat(kline.close) - parseFloat(kline.open)
          : parseFloat(kline.open) - parseFloat(kline.close);
      const weaknessEnoughCondition =
        topWickSize / bottomWickSize > 4 || bottomWickSize / topWickSize > 4;
      const bodySizeEnoughCondition =
        (topWickSize + bottomWickSize) / bodyWickSize > 20;

      const clusterPoc = clusterPocRow(cluster.data);

      if (!clusterPoc) { continue; }

      if (topWickSize / bottomWickSize > 1) {
        // down
        if (
          weaknessEnoughCondition &&
          bodySizeEnoughCondition
          //parseFloat(clusterPoc.p) > parseFloat(kline.open)
        ) {
          chart.createOverlay({
            name: `down5Circle`,
            points: [
              {
                timestamp: parseInt(kline.timestamp),
                value: parseFloat(kline.high),
              }
            ]
          });
        }
      } else {
        // up
        if (
          weaknessEnoughCondition &&
          bodySizeEnoughCondition
          //parseFloat(clusterPoc.p) < parseFloat(kline.open)
        ) {
              chart.createOverlay({
                name: `up5Circle`,
                points: [
                  {
                    timestamp: parseInt(kline.timestamp),
                    value: parseFloat(kline.low),
                  }
                ]
              });
        }
      }
    }
  }, [chart, clustersAsHashByTs]);

  useEffect(() => {
    if (!chart) {return}
    if (!fpp) {return}
    //if (!clustersAsHashByTs) {return}

    drawFppPatterns(fpp);
    // add EMA200 trand indicator
    chart.createIndicator('EMA', false, { id: 'candle_pane' });
    // chart.createIndicator('CUM_DELTA', true);
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

  registerIndicator(ema);

  return (
    <main>
      <Map
        pairId={pairId}
        tf={tf}
        setParentChart={setChart}
        setDataLoaderCallback={() => {
          drawFppPatterns(fpp);
        }}
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

      <MapTools
        chart={chart}
        pairId={pairId}
        tf={tf}
        showDrawingElements
        onDrawingInteractionChange={mapDrawingOverlay.onDrawingInteractionChange}
      />

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

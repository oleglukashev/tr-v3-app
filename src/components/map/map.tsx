'use client'

import {useCallback, useEffect, useRef, useState} from "react";
import {clusterKline, getPriceByWebSocket, resizeChart} from "@/src/helpers/klinecharts.helper";
import {dispose, init, registerOverlay} from "klinecharts";
import moment from "moment";
import {useLazyGetByPairIdAndTfAndTsQuery} from "@/lib/redux/api/clusterApi";

const KLINE_TS_SIZE_BY_TF = {
  1: 60000,
  5: 300000,
  15: 900000,
  30: 1800000,
  60: 3600000,
  240: 14400000,
  1440: 86400000,
};

export default function Map({
                              id,
                              children,
                              pairId,
                              tf,
                              defaultTs,
                              //fpp,
                              //drawFppPatterns,
                              setParentChart,
                              updateWebsocketPriceCallback,
                              setDataLoaderCallback,
                              clustersAsHashByTs
}: any) {
  const [chart, setChart] = useState<any>(null);
  const [currentCluster, setCurrentCuster] = useState(null);
  const [currentClusterKline, setCurrentClusterKline] = useState(null);
  const [trigger] = useLazyGetByPairIdAndTfAndTsQuery();
  const [barsLoaded, setBarsLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const isDefaultTsCenteredRef = useRef(false);
  const prevDefaultTsRef = useRef<any>(defaultTs);
  const lastQueryTsRef = useRef<number | null>(null);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUserInteractedRef = useRef(false);
  const isInitialSyncRef = useRef(true);
  const subscribeBarCallbackRef = useRef<((data: any) => void) | null>(null);

  useEffect(() => {
    const newTs = Number(defaultTs);
    const prevTs = Number(prevDefaultTsRef.current);
    prevDefaultTsRef.current = defaultTs;
    if (!chart || !Number.isFinite(newTs) || newTs === prevTs) { return; }
    isDefaultTsCenteredRef.current = false;
    setBarsLoaded(false);
    setReloadKey((k) => k + 1);
  }, [chart, defaultTs]);

  const getInitialTs = useCallback((): number | null => {
    const nowTs = moment().utc().valueOf();
    const propTs = Number(defaultTs);
    if (Number.isFinite(propTs)) {
      return Math.min(propTs, nowTs);
    }
    if (typeof window === 'undefined') {
      return null;
    }
    const queryTs = Number(new URLSearchParams(window.location.search).get('ts'));
    if (Number.isFinite(queryTs)) {
      return Math.min(queryTs, nowTs);
    }
    return null;
  }, [defaultTs]);

  const updateTsQueryByVisibleCenter = useCallback(() => {
    if (!chart || typeof window === 'undefined') { return; }
    if (isInitialSyncRef.current) { return; }
    if (!hasUserInteractedRef.current) { return; }

    const visibleRange = chart.getVisibleRange?.();
    const dataList = chart.getDataList?.();
    if (!visibleRange || !dataList?.length) { return; }

    const visibleFrom = Number.isFinite(visibleRange.realFrom) ? visibleRange.realFrom : visibleRange.from;
    const visibleToExclusive = Number.isFinite(visibleRange.realTo) ? visibleRange.realTo : visibleRange.to;
    const centerIndex = Math.floor((visibleFrom + visibleToExclusive - 1) / 2);
    const centerKline = dataList[centerIndex];
    const centerTs = Number(centerKline?.timestamp);
    if (!Number.isFinite(centerTs)) { return; }
    if (lastQueryTsRef.current === centerTs) { return; }

    const url = new URL(window.location.href);
    if (url.searchParams.get('ts') === String(centerTs)) {
      lastQueryTsRef.current = centerTs;
      return;
    }

    url.searchParams.set('ts', String(centerTs));
    window.history.replaceState(window.history.state, '', `${url.pathname}?${url.searchParams.toString()}`);
    lastQueryTsRef.current = centerTs;
  }, [chart]);

  const scheduleTsQueryUpdate = useCallback((delayMs = 250) => {
    if (scrollEndTimerRef.current) {
      clearTimeout(scrollEndTimerRef.current);
    }
    scrollEndTimerRef.current = setTimeout(() => {
      updateTsQueryByVisibleCenter();
    }, delayMs);
  }, [updateTsQueryByVisibleCenter]);

  const getZoomStorageKey = useCallback(() => {
    return `mapZoom:${pairId}:${tf}`;
  }, [pairId, tf]);

  const getZoomYStorageKey = useCallback(() => {
    return `mapZoomY:${pairId}:${tf}`;
  }, [pairId, tf]);

  const getCandleYAxis = useCallback((targetChart: any) => {
    return targetChart?.getDrawPaneById?.('candle_pane')?.getAxisComponent?.();
  }, []);

  const restoreSavedZoom = useCallback((targetChart: any) => {
    if (!targetChart || typeof window === 'undefined') { return; }
    try {
      const raw = localStorage.getItem(getZoomStorageKey());
      if (!raw) { return; }
      const savedBarSpace = Number(raw);
      if (!Number.isFinite(savedBarSpace) || savedBarSpace <= 0) { return; }
      targetChart.setBarSpace?.(savedBarSpace);
    } catch {}
    try {
      const rawY = localStorage.getItem(getZoomYStorageKey());
      if (!rawY) { return; }
      const savedRange = JSON.parse(rawY);
      const yAxis = getCandleYAxis(targetChart);
      if (!yAxis?.setRange || !savedRange || typeof savedRange !== 'object') { return; }
      yAxis.setRange(savedRange);
    } catch {}
  }, [getZoomStorageKey, getZoomYStorageKey, getCandleYAxis]);

  const scheduleZoomSave = useCallback((delayMs = 300) => {
    if (typeof window === 'undefined' || !chart) { return; }
    if (zoomSaveTimerRef.current) {
      clearTimeout(zoomSaveTimerRef.current);
    }
    zoomSaveTimerRef.current = setTimeout(() => {
      const barSpace = Number(chart.getBarSpace?.()?.bar);
      if (!Number.isFinite(barSpace) || barSpace <= 0) { return; }
      try {
        localStorage.setItem(getZoomStorageKey(), String(barSpace));
      } catch {}
      try {
        const yAxis = getCandleYAxis(chart);
        if (!yAxis) { return; }
        // Save manual Y-scale only. If auto mode is active, drop stale saved range.
        if (yAxis.getAutoCalcTickFlag?.()) {
          localStorage.removeItem(getZoomYStorageKey());
          return;
        }
        const currentRange = yAxis.getRange?.();
        if (!currentRange) { return; }
        localStorage.setItem(getZoomYStorageKey(), JSON.stringify(currentRange));
      } catch {}
    }, delayMs);
  }, [chart, getZoomStorageKey, getZoomYStorageKey, getCandleYAxis]);

  const saveZoomNow = useCallback((targetChart: any) => {
    if (typeof window === 'undefined' || !targetChart) { return; }
    try {
      const barSpace = Number(targetChart.getBarSpace?.()?.bar);
      if (Number.isFinite(barSpace) && barSpace > 0) {
        localStorage.setItem(getZoomStorageKey(), String(barSpace));
      }
    } catch {}
    try {
      const yAxis = getCandleYAxis(targetChart);
      if (!yAxis) { return; }
      if (yAxis.getAutoCalcTickFlag?.()) {
        localStorage.removeItem(getZoomYStorageKey());
        return;
      }
      const currentRange = yAxis.getRange?.();
      if (!currentRange) { return; }
      localStorage.setItem(getZoomYStorageKey(), JSON.stringify(currentRange));
    } catch {}
  }, [getZoomStorageKey, getZoomYStorageKey, getCandleYAxis]);

  const centerChartByDefaultTs = useCallback((targetTs: number | null) => {
    if (!chart || !targetTs || isDefaultTsCenteredRef.current) { return; }
    const dataList = chart.getDataList?.();
    if (!dataList?.length) { return; }

    let targetIndex = -1;
    let minDistance = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < dataList.length; i += 1) {
      const ts = Number(dataList[i]?.timestamp);
      if (!Number.isFinite(ts)) { continue; }
      const distance = Math.abs(ts - targetTs);
      if (distance < minDistance) {
        minDistance = distance;
        targetIndex = i;
      }
    }
    if (targetIndex < 0) { return; }

    const visibleRange = chart.getVisibleRange?.();
    const barSpace = chart.getBarSpace?.()?.bar;
    if (!visibleRange || !barSpace) { return; }

    // `realTo` is exclusive, so center index is `(from + to - 1) / 2`.
    const visibleFrom = Number.isFinite(visibleRange.realFrom) ? visibleRange.realFrom : visibleRange.from;
    const visibleToExclusive = Number.isFinite(visibleRange.realTo) ? visibleRange.realTo : visibleRange.to;
    const currentCenterIndex = Math.floor((visibleFrom + visibleToExclusive - 1) / 2);
    const delta = targetIndex - currentCenterIndex;
    if (!delta) {
      isDefaultTsCenteredRef.current = true;
      return;
    }

    chart.scrollByDistance?.(-delta * barSpace, 0);
    isDefaultTsCenteredRef.current = true;
  }, [chart]);

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

  // new map data loader
  useEffect(() => {
    const chart: any = init(id || 'chart', {
      // layout: [
      //   { type: 'indicator', content: ['VOL'], options: { order: 10 }  },
      // ]
    });
    //chart.setPrecision({ price: 5 })
    chart.setSymbol({ ticker: pairId, pricePrecision: 5 })
    chart.setPeriod({ span: tf, type: `minute` })
    restoreSavedZoom(chart);
    const onBeforeUnload = () => saveZoomNow(chart);
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', onBeforeUnload);
    }
    const chartDom: any =
      chart.getDom?.() || (typeof document !== 'undefined' ? document.getElementById(id || 'chart') : null);
    const markUserInteracted = () => {
      if (!isInitialSyncRef.current) {
        hasUserInteractedRef.current = true;
      }
    };
    chartDom?.addEventListener?.('wheel', markUserInteracted, { passive: true });
    chartDom?.addEventListener?.('mousedown', markUserInteracted);
    chartDom?.addEventListener?.('touchstart', markUserInteracted, { passive: true });
    chartDom?.addEventListener?.('keydown', markUserInteracted);

    // chart.setDataLoader({
    //   getBars: (data: any) => {
    //     const chartData = chart.getDataList();
    //
    //     const startTs = data.type === 'init' ?
    //       moment().subtract(200 * KLINE_TS_SIZE_BY_TF[tf], 'milliseconds').startOf('hour').utc().valueOf() :
    //       data.type === 'forward' ?
    //         moment(chartData[0].timestamp).utc().subtract(200 * KLINE_TS_SIZE_BY_TF[tf], 'milliseconds').startOf('hour').valueOf() :
    //         moment(chartData[chartData.length - 1].timestamp + KLINE_TS_SIZE_BY_TF[tf]).utc().valueOf();
    //     const endTs = data.type === 'init' ?
    //       moment().utc().valueOf() :
    //       data.type === 'forward' ?
    //         moment(chartData[0].timestamp).utc().startOf('hour').valueOf() :
    //         moment(chartData[chartData.length - 1].timestamp + KLINE_TS_SIZE_BY_TF[tf]).add(200 * KLINE_TS_SIZE_BY_TF[tf], 'milliseconds').startOf('hour').utc().valueOf();
    //
    //     fetch(`http://klines.traken-trade.ru/api/v1/klines?pairId=${pairId}&startTs=${startTs}&endTs=${endTs}&limit=100&tf=${tf}`)
    //       .then(res => res.json())
    //       .then(data => {
    //         return data.map(item => ({
    //           id: item.id,
    //           open: parseFloat(item.open),
    //           high: parseFloat(item.high),
    //           low: parseFloat(item.low),
    //           close: parseFloat(item.close),
    //           timestamp: parseInt(item.ts),
    //           volume: parseInt(item.volume),
    //         }));
    //       })
    //       .then(dataList => {
    //         data.callback(dataList, dataList.length > 0);
    //         //setDataLoaderCallback();
    //         //if (setDataLoaderCallback) {
    //         //  setDataLoaderCallback(chart.getDataList());
    //         //}
    //         if (fpp && drawFppPatterns) {
    //           drawFppPatterns(fpp);
    //         }
    //       })
    //   },
    //   subscribe: (params) => {},
    //   unsubscribe: (params) => {}
    // })
    setChart(chart);
    setParentChart(chart);
    return () => {
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }
      if (zoomSaveTimerRef.current) {
        clearTimeout(zoomSaveTimerRef.current);
      }
      saveZoomNow(chart);
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', onBeforeUnload);
      }
      chartDom?.removeEventListener?.('wheel', markUserInteracted);
      chartDom?.removeEventListener?.('mousedown', markUserInteracted);
      chartDom?.removeEventListener?.('touchstart', markUserInteracted);
      chartDom?.removeEventListener?.('keydown', markUserInteracted);
      dispose(id || 'chart');
    }
  }, [id, pairId, tf, setParentChart, restoreSavedZoom, saveZoomNow])

  useEffect(() => {
    if (!chart || !setDataLoaderCallback || !setParentChart || !tf || !pairId || !setCurrentClusterKline || !onClickClusterHandle || barsLoaded) {return}
    setBarsLoaded(true);
    hasUserInteractedRef.current = false;
    isInitialSyncRef.current = true;

    chart.setDataLoader({
      getBars: (data: any) => {
        const loadType = data.type;
        const chartData = chart.getDataList();
        const initialTs = getInitialTs();
        const nowTs = moment().utc().valueOf();
        const stepMs =
          KLINE_TS_SIZE_BY_TF[Number(tf) as keyof typeof KLINE_TS_SIZE_BY_TF] || KLINE_TS_SIZE_BY_TF[1];
        const chunkSize = 300;

        let startTs: number;
        let endTs: number;

        if (loadType === 'init') {
          if (initialTs) {
            // If `defaultTs` is provided, load symmetric window around it: -400 / +400 klines.
            startTs = initialTs - (chunkSize * stepMs);
            endTs = initialTs + (chunkSize * stepMs);
          } else {
            // Without `defaultTs`, start from latest timestamp and load 800 klines to the left.
            const latestTs = moment().utc().valueOf();
            startTs = latestTs - ((chunkSize * 2) * stepMs);
            endTs = latestTs;
          }
        } else if (loadType === 'forward') {
          // Scroll left: load previous 400 klines before current first kline.
          const firstTs = Number(chartData?.[0]?.timestamp);
          if (!Number.isFinite(firstTs)) {
            data.callback([], false);
            return;
          }
          startTs = firstTs - (chunkSize * stepMs);
          endTs = firstTs;
        } else if (loadType === 'backward' || loadType === 'update') {
          // Scroll right/update: load next 400 klines after current last kline.
          const lastTs = Number(chartData?.[chartData.length - 1]?.timestamp);
          if (!Number.isFinite(lastTs)) {
            data.callback([], false);
            return;
          }
          if (lastTs >= nowTs) {
            data.callback([], false);
            return;
          }
          startTs = lastTs;
          endTs = Math.min(lastTs + (chunkSize * stepMs), nowTs);
        } else {
          data.callback([], false);
          return;
        }

        fetch(`http://klines.traken-trade.ru/api/v1/klines?pairId=${pairId}&startTs=${startTs}&endTs=${endTs}&limit=1000&tf=${tf}`)
          .then(res => res.json())
          .then((responseData: any[]) => {
            const mapped = responseData.map((item: any) => ({
              id: item.id,
              open: parseFloat(item.open),
              high: parseFloat(item.high),
              low: parseFloat(item.low),
              close: parseFloat(item.close),
              timestamp: parseInt(item.ts),
              volume: parseInt(item.volume),
            }));
            const uniqueByTs = new globalThis.Map<number, any>();
            for (const item of mapped) {
              const ts = Number(item?.timestamp);
              if (!Number.isFinite(ts)) { continue; }
              uniqueByTs.set(ts, item);
            }
            const normalized = Array.from(uniqueByTs.values()).sort(
              (a: any, b: any) => Number(a.timestamp) - Number(b.timestamp),
            );
            const firstTs = Number(chartData?.[0]?.timestamp);
            const lastTs = Number(chartData?.[chartData.length - 1]?.timestamp);
            if (loadType === 'forward' && Number.isFinite(firstTs)) {
              // Klinecharts "forward" means loading older candles to the left.
              return normalized.filter((item: any) => Number(item.timestamp) < firstTs);
            }
            if ((loadType === 'backward' || loadType === 'update') && Number.isFinite(lastTs)) {
              // Prevent infinite loops caused by repeatedly returning the edge candle.
              return normalized.filter((item: any) => Number(item.timestamp) > lastTs);
            }
            return normalized;
          })
          .then(dataList => {
            const hasMore = dataList.length > 0;
            data.callback(dataList, hasMore);
            if (loadType === 'init' && initialTs && !isDefaultTsCenteredRef.current) {
              setTimeout(() => {
                centerChartByDefaultTs(initialTs);
              }, 0);
            }
            if (loadType === 'init') {
              setTimeout(() => {
                restoreSavedZoom(chart);
              }, 0);
              setTimeout(() => {
                restoreSavedZoom(chart);
              }, 60);
            }
            if (loadType === 'init') {
              setTimeout(() => {
                isInitialSyncRef.current = false;
              }, 250);
            }
            //setDataLoaderCallback();
            if (setDataLoaderCallback) {
             setDataLoaderCallback();
            }
          })
      },
      subscribeBar: ({ callback }: any) => {
        subscribeBarCallbackRef.current = callback;
      },
      unsubscribeBar: () => {
        subscribeBarCallbackRef.current = null;
      }
    })
    chart.subscribeAction('onCandleBarClick', async (event) => {
      const bar = chart.getBarSpace();
      const { data, x, y } = event
      if (bar.bar >= 25) {
        setCurrentClusterKline(data.current);
        console.log('barWidth', bar);
        console.log(data.current);
        await onClickClusterHandle(event, data.current);
      } else {

      }
    })
    chart.subscribeAction('onZoom', (e) => {
      const bar = chart.getBarSpace();
      if (bar.bar < 25) {
        chart.removeOverlay({ name: 'clusterKline' });
        setCurrentClusterKline(null);
        setCurrentCuster(null);
      }
      scheduleTsQueryUpdate();
      scheduleZoomSave();
      saveZoomNow(chart);
    })
    chart.subscribeAction('onScroll', () => {
      scheduleTsQueryUpdate();
      scheduleZoomSave();
    })
    // setChart(chart);
    // setParentChart(chart);
  }, [chart, setDataLoaderCallback, setParentChart, tf, pairId, setCurrentClusterKline, onClickClusterHandle, centerChartByDefaultTs, updateTsQueryByVisibleCenter, getInitialTs, scheduleTsQueryUpdate, scheduleZoomSave, saveZoomNow, restoreSavedZoom, reloadKey]);

  // get last price by websocket
  useEffect(() => {
    const socket = getPriceByWebSocket(chart, pairId, tf, (msg: any): void => {
      const websocketKlineData = JSON.parse(msg.data);
      if (websocketKlineData.type === 'kline') {
        const d = websocketKlineData.data;
        const klineBar = {
          timestamp: parseInt(d.ts),
          open:      parseFloat(d.open),
          high:      parseFloat(d.high),
          low:       parseFloat(d.low),
          close:     parseFloat(d.close),
          volume:    parseFloat(d.volume ?? 0),
        };

        if (subscribeBarCallbackRef.current) {
          subscribeBarCallbackRef.current(klineBar);
        }

        if (updateWebsocketPriceCallback) {
          updateWebsocketPriceCallback();
        }
      }
    })
    return () => {
      socket?.close()
    }
  }, [chart, pairId, tf, updateWebsocketPriceCallback])

  // resize map
  useEffect(() => {
    resizeChart(chart);
  }, [chart]);

  return (
    <>
      <div id={`${id || "chart"}`} style={{width: '100%' }} />
      {children}
    </>
  )
}

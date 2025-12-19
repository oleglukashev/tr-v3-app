'use client'

import {useCallback, useEffect, useState} from "react";
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
      dispose('chart')
    }
  }, [])

  useEffect(() => {
    if (!chart || !setDataLoaderCallback || !setParentChart || !tf || !pairId || !setCurrentClusterKline || !onClickClusterHandle || barsLoaded) {return}
    setBarsLoaded(true);

    chart.setDataLoader({
      getBars: (data: any) => {
        const chartData = chart.getDataList();
        const startTs = data.type === 'init' ?
          defaultTs ? moment.unix(defaultTs/ 1000).utc().subtract(200 * KLINE_TS_SIZE_BY_TF[tf], 'milliseconds').startOf('hour').valueOf() : moment().subtract(200 * KLINE_TS_SIZE_BY_TF[tf], 'milliseconds').startOf('hour').utc().valueOf() :
          data.type === 'forward' ?
            moment(chartData[0].timestamp).utc().subtract(200 * KLINE_TS_SIZE_BY_TF[tf], 'milliseconds').startOf('hour').valueOf() :
            moment(chartData[chartData.length - 1].timestamp + KLINE_TS_SIZE_BY_TF[tf]).utc().valueOf();

        const endTs = data.type === 'init' ?
          defaultTs || moment().utc().valueOf() :
          data.type === 'forward' ?
            moment(chartData[0].timestamp).utc().startOf('hour').valueOf() :
            moment(chartData[chartData.length - 1].timestamp + KLINE_TS_SIZE_BY_TF[tf]).add(200 * KLINE_TS_SIZE_BY_TF[tf], 'milliseconds').startOf('hour').utc().valueOf();

        fetch(`http://klines.traken-trade.ru/api/v1/klines?pairId=${pairId}&startTs=${startTs}&endTs=${endTs}&limit=100&tf=${tf}`)
          .then(res => res.json())
          .then(data => {
            return data.map(item => ({
              id: item.id,
              open: parseFloat(item.open),
              high: parseFloat(item.high),
              low: parseFloat(item.low),
              close: parseFloat(item.close),
              timestamp: parseInt(item.ts),
              volume: parseInt(item.volume),
            }));
          })
          .then(dataList => {
            data.callback(dataList, dataList.length > 0);
            //setDataLoaderCallback();
            if (setDataLoaderCallback) {
             setDataLoaderCallback();
            }
          })
      },
      subscribe: (params) => {},
      unsubscribe: (params) => {}
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
    })
    // setChart(chart);
    // setParentChart(chart);
  }, [chart, setDataLoaderCallback, setParentChart, tf, pairId, setCurrentClusterKline, onClickClusterHandle]);

  // get last price by websocket
  useEffect(() => {
    getPriceByWebSocket(chart, pairId, tf, (msg: any): void => {
      const websocketKlineData = JSON.parse(msg.data);
      if (websocketKlineData.type === 'kline') {
        console.log('Пришла свеча:', websocketKlineData.data)
        console.log('d', websocketKlineData.data.ts);
        //setCurrentPrice(websocketKlineData?.data?.close);
        const klines = chart.getDataList();
        console.log(klines[klines.length - 1].timestamp);

        if (parseInt(websocketKlineData.data.ts) == klines[klines.length - 1].timestamp) {
          klines[klines.length - 1].close = parseFloat(websocketKlineData?.data?.close);
          if (klines[klines.length - 1].low > klines[klines.length - 1].close) {
            klines[klines.length - 1].low = klines[klines.length - 1].close
          }
          if (klines[klines.length - 1].high < klines[klines.length - 1].close) {
            klines[klines.length - 1].high = klines[klines.length - 1].close
          }
          if (updateWebsocketPriceCallback) {
            updateWebsocketPriceCallback();
          }
        } else {
          // klines.push({
          //   high: parseFloat(websocketKlineData?.data?.high),
          //   low: parseFloat(websocketKlineData?.data?.low),
          //   close: parseFloat(websocketKlineData?.data?.close),
          //   open: parseFloat(websocketKlineData?.data?.open),
          //   timestamp: parseFloat(websocketKlineData?.data?.ts),
          // })
        }


        // resize helps redraw last kline. I don't know why!!!
        chart.resize();
        //chart.resetData(klines);
      }
    })
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

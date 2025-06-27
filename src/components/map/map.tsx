'use client'

import {useEffect, useState} from "react";
import {resizeChart} from "@/src/helpers/klinecharts.helper";
import {dispose, init} from "klinecharts";
import moment from "moment";

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
                              children,
                              pairId,
                              tf,
                              setParentChart,
                              setDataLoaderCallback
}: any) {
  const [chart, setChart] = useState<any>(null);

  useEffect(() => {
    // registerOverlay({
    //   name: 'circle',
    //   needDefaultPointFigure: true,
    //   needDefaultXAxisFigure: true,
    //   needDefaultYAxisFigure: true,
    //   totalStep: 3,
    //   createPointFigures: ({ coordinates }) => {
    //     if (coordinates.length === 2) {
    //       const xDis = Math.abs(coordinates[0].x - coordinates[1].x)
    //       const yDis = Math.abs(coordinates[0].y - coordinates[1].y)
    //       const radius = Math.sqrt(xDis * xDis + yDis * yDis)
    //       return {
    //         key: 'circle',
    //         type: 'circle',
    //         attrs: {
    //           ...coordinates[0],
    //           r: radius
    //         },
    //         styles: {
    //           style: 'stroke_fill'
    //         }
    //       }
    //     }
    //     return []
    //   }
    // })
    const chart: any = init('chart', {
      // layout: [
      //   { type: 'indicator', content: ['VOL'], options: { order: 10 }  },
      // ]
    });
    //chart.setPrecision({ price: 5 })
    chart.setSymbol({ ticker: pairId, pricePrecision: 4 })
    chart.setPeriod({ span: tf, type: `minute` })
    chart.setDataLoader({
      getBars: (data: any) => {
        const chartData = chart.getDataList();

        const startTs = data.type === 'init' ?
          moment().subtract(200 * KLINE_TS_SIZE_BY_TF[tf], 'milliseconds').startOf('hour').utc().valueOf() :
          data.type === 'forward' ?
            moment(chartData[0].timestamp).utc().subtract(200 * KLINE_TS_SIZE_BY_TF[tf], 'milliseconds').startOf('hour').valueOf() :
            moment(chartData[chartData.length - 1].timestamp + KLINE_TS_SIZE_BY_TF[tf]).utc().valueOf();
        const endTs = data.type === 'init' ?
          moment().utc().valueOf() :
          data.type === 'forward' ?
            moment(chartData[0].timestamp).utc().startOf('hour').valueOf() :
            moment(chartData[chartData.length - 1].timestamp + KLINE_TS_SIZE_BY_TF[tf]).add(200 * KLINE_TS_SIZE_BY_TF[tf], 'milliseconds').startOf('hour').utc().valueOf();

        fetch(`http://klines.traken-trade.ru/api/v1/klines?pairId=${pairId}&startTs=${startTs}&endTs=${endTs}&limit=100&tf=${tf}`)
          .then(res => res.json())
          .then(data => {
            console.log(data);
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
            setDataLoaderCallback();
            if (setDataLoaderCallback) {
              setDataLoaderCallback()
            }
          })
      },
      subscribe: (params) => {},
      unsubscribe: (params) => {}
    })
    setChart(chart);
    setParentChart(chart);
    return () => {
      dispose('chart')
    }
  }, [])

  useEffect(() => {
    resizeChart(chart);
  }, [chart]);

  return (
    <>
      <div id="chart" style={{width: '100%' }} />
      {children}
    </>
  )
}

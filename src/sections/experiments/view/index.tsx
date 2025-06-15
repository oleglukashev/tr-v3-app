'use client'

import {useCallback, useEffect, useState} from "react";
import {dispose, init, registerFigure, registerOverlay, registerIndicator} from "klinecharts";
import {useGetAllQuery as useGetAllDhmQuery} from "@/lib/redux/api/dhmApi";
import { useGetAllQuery as useGetAllFppQuery } from "@/lib/redux/api/fppApi";
import CustomDialog from 'src/components/custom-dialog/custom-dialog';
import {IconButton} from "@mui/material";
import ReorderIcon from '@mui/icons-material/Reorder';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import fibonacciLine2 from "@/src/components/klinecharts-fibo/klinecharts-fibo";
import SettingsIcon from '@mui/icons-material/Settings';
import {StrategiesDhmFppFiltersDialog} from "@/src/sections/strategies-graph/strategies.dhm-fpp-filters-dialog";
import {StrategiesDhmKlineFppsDialog} from "@/src/sections/strategies-graph/strategies.dhm-kline-fpps-dialog";
import moment from "moment/moment";

const KLINE_TS_SIZE_BY_TF = {
  1: 60000,
  5: 300000,
  15: 900000,
  30: 1800000,
  60: 3600000,
  240: 14400000,
  1440: 86400000,
};

export default function ExperimentsIndexView({ tf, pairId }: any) {
  const [chart, setChart] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [currentKlineFpp, setCurrentKlineFpp] = useState<any[]>(null);
  const [openFppFilters, setOpenFppFilters] = useState(false);
  const [openKlineFpp, setOpenKlineFpp] = useState(false);
  const { data: fpp } = useGetAllFppQuery({ pairId, page, limit: 1000, tf });
  const { data: dhm } = useGetAllDhmQuery({ pairId, tf: 60 });
  const [height, setHeight] = useState(0);
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

  useEffect(() => {
    setHeight(window.innerHeight);
    if (!chart) { return }
    chart.resize()
  }, [chart]);

  // const clustersAsHashByTs = useMemo(() => {
  //   if (!clusters) { return }
  //   const result: any = {};
  //   for (const item of clusters) {
  //     result[item.ts] = item;
  //   }
  //   return result;
  // }, [clusters]);

  const onSaveFppFiltersSubmit = useCallback(async (values: any) => {
    setFppFilters(values.fppFilters);
    setOpenFppFilters(false);
    for (const item of [1,2,3,4,5,6,7]) {
      chart.removeOverlay({ name: `up${item}Circle` });
      chart.removeOverlay({ name: `down${item}Circle` });
    }
    drawFppPatterns(fpp, values.fppFilters);
  }, [chart, fpp]);

  const drawFppPatterns = useCallback((fpp, fppFilters) => {
    if (!fpp?.length) { return }
    for (const kline of chart.getDataList()) {
      const fppItems: any[] = fpp.filter(item => item.ts === kline.ts && fppFilters.includes(item.type));
      const r: any = {up: { s: 0, v: parseFloat(kline.low)}, down: { s: 0, v: parseFloat(kline.high) }};
      for (const fppItem of fppItems) {
        r[fppItem.direction].s += 1;
      }
      if (r.up.s) {
        chart.createOverlay({
          name: `up${r.up.s}Circle`,
          points: [
            {
              timestamp: parseInt(kline.ts),
              value: r.up.v,
            }
          ]
        });
      }
      if (r.down.s) {
        chart.createOverlay({
          name: `down${r.down.s}Circle`,
          points: [
            {
              timestamp: parseInt(kline.ts),
              value: r.down.v,
            }
          ]
        });
      }
    }
  }, [chart]);

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
    setChart(chart);
    chart.setSymbol({ ticker: pairId, pricePrecision: 5 })
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
          })
      },
      subscribe: (params) => {},
      unsubscribe: (params) => {}
    })
    return () => {
      dispose('chart')
    }
  }, [])

  useEffect(() => {
    if (!dhm) {return}
    if (!chart) {return}
    if (!fpp) {return}
    //if (!clustersAsHashByTs) {return}

    drawFppPatterns(fpp, fppFilters);
    // add EMA200 trand indicator
    chart.createIndicator('EMA', false, { id: 'candle_pane' });
    // chart.createIndicator('CUM_DELTA', true);
    //chart.createOverlay({ name: 'custom_rect_overlay' })
    chart.subscribeAction('onCandleBarClick', (event) => {
      const { data, x, y } = event
      console.log(event);
      const currentDhm = dhm.find(item => item.data.kline1Id === data.current.id);
      console.log(currentDhm);
      // setCurrentDhm(currentDhm);
      // setCurrentKline(data.current);
    })

  }, [chart, dhm]);

  useEffect(() => {
    if (!chart) { return }
    const socket = new WebSocket('ws://klines.traken-trade.ru/ws/')

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'subscribe',
        pairId: parseInt(pairId),
        tf: parseInt(tf),
      }))
    }

    socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data)
      if (data.type === 'kline') {
        console.log('Пришла свеча:', data.data)
        console.log('d', data.data.ts);
        console.log('chart.updateData', chart.updateData);
        // chart.updateData({
        //   ...data.data,
        //   timestamp: parseInt(data.data.ts),
        //   volume: parseInt(data.data.volume),
        // });
      }
    }
  }, [chart, pairId, tf])

  registerFigure({
    name: 'godKline',
    draw: (ctx, attrs, styles) => {
      const barSpace = chart.getBarSpace();
      const { x, y, width, height } = attrs;
      const { color } = styles;
      ctx.beginPath();
      ctx.moveTo(x - (barSpace.bar / 2), 0);
      ctx.lineTo(x + (barSpace.bar / 2), 0);
      ctx.lineTo(x + (barSpace.bar / 2), 1000);
      ctx.lineTo(x - (barSpace.bar / 2), 1000);
      //ctx.lineTo(x, y + height / 2);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    },
    checkEventOn: (coordinate, attrs) => {
      const { x, y } = coordinate;
      const { width, height } = attrs;
      return Math.abs(x * height) + Math.abs(y * width) <= width * height / 2;
    }
  });

  for (const item of [1,2,3,4,5,6,7]) {
    registerOverlay({
      name: `up${item}Circle`,
      totalStep: 1,
      needDefaultPointFigure: false,
      onClick: (e) => {
        setCurrentKlineFpp((fpp || []).filter(item => parseInt(item.ts) === e.overlay.points[0].timestamp));
        setOpenKlineFpp(true);
        return true
      },
      createPointFigures: ({ coordinates }) => {
        const [point] = coordinates;
        return [
          {
            type: 'circle',
            attrs: {
              x: point.x,
              y: point.y + 10,
              r: 1 + (item * 2),
            },
            styles: {
              color: 'rgba(0,89,30, 0.55)',
              style: 'fill',
            }
          }
        ];
      }
    });

    registerOverlay({
      name: `down${item}Circle`,
      totalStep: 1,
      needDefaultPointFigure: false,
      onClick: (e) => {
        setCurrentKlineFpp((fpp || []).filter(item => parseInt(item.ts) === e.overlay.points[0].timestamp));
        setOpenKlineFpp(true);
        return true
      },
      createPointFigures: ({ coordinates }) => {
        const [point] = coordinates;
        return [
          {
            type: 'circle',
            attrs: {
              x: point.x,
              y: point.y - 10,
              r: 1 + (item * 2),
            },
            styles: {
              color: '#ff0000',
              style: 'fill',
            }
          }
        ];
      }
    });
  }

  registerOverlay(fibonacciLine2);

  registerIndicator({
    name: 'EMA',
    shortName: 'EMA',
    series: 'price',
    calcParams: [50],
    precision: 2,
    shouldOhlc: true,
    figures: [
      { key: 'ema1', title: 'EMA50: ', type: 'line' },
      // { key: 'ema2', title: 'EMA12: ', type: 'line' },
      // { key: 'ema3', title: 'EMA20: ', type: 'line' }
    ],
    regenerateFigures: (params) => params.map((p, i) => ({ key: `ema${i + 1}`, title: `EMA${p}: `, type: 'line' })),
    calc: (dataList, indicator) => {
      const { calcParams: params, figures } = indicator
      let closeSum = 0
      const emaValues: number[] = []
      return dataList.map((kLineData, i) => {
        const ema = {}
        const close = parseFloat(kLineData.close);
        closeSum += close
        params.forEach((p, index) => {
          if (i >= p - 1) {
            if (i > p - 1) {
              emaValues[index] = (2 * close + (p - 1) * emaValues[index]) / (p + 1)
            } else {
              emaValues[index] = closeSum / p
            }
            ema[figures[index].key] = emaValues[index]
          }
        })
        return ema
      })
    }
  });

  return (
    <main>
      <div id="chart" style={{width: '100%', height: `${height}px` }}/>

      <IconButton key='fppSettings' sx={{
        position: 'absolute',
        zIndex: 1,
        left: '18px',
        top: `${70}px`,
        background: '#ececec',
      }} aria-label="delete" onClick={() => {
        setOpenFppFilters(true);
      }}>
        <SettingsIcon/>
      </IconButton>

      {[
        { name: 'fibonacciLine2', icon: ReorderIcon },
        { name: 'priceLine', icon: LinearScaleIcon },
        { name: 'rayLine', icon: HorizontalRuleIcon },
        ].map((item, index) => (
        <IconButton key={item.name} sx={{
          position: 'absolute',
          zIndex: 1,
          left: '18px',
          bottom: `${index * 45 + 65}px`,
          background: '#ececec',
        }} aria-label="delete" onClick={() => {
          chart.createOverlay(item.name);
        }}>
          <item.icon />
        </IconButton>
      ))}

      <CustomDialog
        open={openFppFilters}
        onClose={() => setOpenFppFilters(false)}
        title={`Fpp filters`}
        content={(
          <StrategiesDhmFppFiltersDialog fppFilters={fppFilters} onSubmit={onSaveFppFiltersSubmit} />
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

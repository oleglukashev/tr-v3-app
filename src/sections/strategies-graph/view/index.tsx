'use client'

import {useCallback, useEffect, useMemo, useState} from "react";
import {dispose, init, getFigureClass, registerFigure, registerOverlay, registerIndicator} from "klinecharts";
import {useGetAllQuery as useGetAllKlinesQuery} from "@/lib/redux/api/klineApi";
import {
  useCreateMutation,
  useGetAllQuery as useGetAllDhmQuery, useRemoveMutation, useUpdateMutation,
} from "@/lib/redux/api/dhmApi";
import { useGetAllQuery as useGetAllFppQuery } from "@/lib/redux/api/fppApi";
import { useGetAllQuery as useGetAllClustersQuery } from "@/lib/redux/api/clusterApi";
import { camelCase } from 'lodash';
import CustomDialog from 'src/components/custom-dialog/custom-dialog';
import {onSubmitWrapper} from "@/src/utils/submit";
import {StrategiesDhmDialog} from "@/src/sections/strategies-graph/strategies.dhm-dialog";
import {IconButton} from "@mui/material";
import ReorderIcon from '@mui/icons-material/Reorder';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import SpeedIcon from '@mui/icons-material/Speed';
import fibonacciLine2 from "@/src/components/klinecharts-fibo/klinecharts-fibo";
import SettingsIcon from '@mui/icons-material/Settings';
import {StrategiesDhmBacktestDialog} from "@/src/sections/strategies-graph/strategies.dhm-backtest-dialog";
import {useGetQuery} from "@/lib/redux/api/strategySettingsApi";
import {StrategiesDhmSettingsDialog} from "@/src/sections/strategies-graph/strategies.dhm-settings-dialog";
import {StrategiesDhmFppFiltersDialog} from "@/src/sections/strategies-graph/strategies.dhm-fpp-filters-dialog";
import {StrategiesDhmKlineFppsDialog} from "@/src/sections/strategies-graph/strategies.dhm-kline-fpps-dialog";
import moment from "moment/moment";

export default function DhmIndexView({ tf, pairId }: any) {
  const [chart, setChart] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [currentKlineFpp, setCurrentKlineFpp] = useState<any[]>(null);
  const [openBacktest, setOpenBacktest] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openFppFilters, setOpenFppFilters] = useState(false);
  const [openKlineFpp, setOpenKlineFpp] = useState(false);
  //const { data: klines } = useGetAllKlinesQuery({ pairId, page, limit: 5000, tf });
  //const { data: clusters } = useGetAllClustersQuery({ pairId, page, limit: 5000, tf });
  const { data: fpp } = useGetAllFppQuery({ pairId, page, limit: 1000, tf });
  const { data: dhm } = useGetAllDhmQuery({ pairId, tf: 60 });
  const [create, { isLoading: isCreateLoading }] = useCreateMutation();
  const [update, { isLoading: isUpdateLoading }] = useUpdateMutation();
  const [remove, { isLoading }] = useRemoveMutation();
  const [currentDhm, setCurrentDhm] = useState(null);
  const [currentKline, setCurrentKline] = useState(null);
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

  const onCreateSubmit = useCallback(async (values: any) => {
    return onSubmitWrapper(() => create(values), (data) => {
      if (data.data) {
        setCurrentDhm(data.data);
      }
    }, 'Успешно создано');
  }, []);

  const onUpdateSubmit = useCallback(async (values: any) => {
    return onSubmitWrapper(() => update({ id: currentDhm.id, values }), null, 'Успешно создано');
  }, [currentDhm?.id]);

  const onRemoveSubmit = useCallback(async () => {
    return onSubmitWrapper(() => remove(currentDhm?.id), (data: any) => {
      if (!data?.data) {
        setCurrentDhm(null);
        setCurrentKline(null);
      }
    }, 'Успешно удалено');
  }, [currentDhm?.id]);

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
    const chart = init('chart', {
      // layout: [
      //   { type: 'indicator', content: ['VOL'], options: { order: 10 }  },
      // ]
    });
    setChart(chart);
    //chart.setPrecision({ price: 5 })
    chart.setSymbol({ ticker: pairId })
    chart.setPeriod({ span: tf, type: `minute` })
    chart.setDataLoader({
      getBars: (data: any) => {
        const chartData = chart.getDataList();
        const startTs = data.type === 'init' ?
          moment().subtract(15, 'days').startOf('hour').utc().valueOf() :
          data.type === 'forward' ?
            moment(chartData[0].timestamp).utc().subtract(15, 'days').startOf('hour').valueOf() :
            moment(chartData[chartData.length - 1].timestamp + 3600000).utc().valueOf();

        const endTs = data.type === 'init' ?
          moment().utc().valueOf() :
          data.type === 'forward' ?
            moment(chartData[0].timestamp - 3600000).utc().startOf('hour').valueOf() :
            moment(chartData[chartData.length - 1].timestamp + 3600000).add(15, 'days').startOf('hour').utc().valueOf();
        fetch(`http://klines.traken-trade.ru/api/v1/klines?pairId=${pairId}&startTs=${startTs}&endTs=${endTs}&limit=1000&tf=${tf}`)
          .then(res => res.json())
          .then(data => {
            return data.map(item => ({
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
    // for (const kline of klines) {
    //   const fppItems: any[] = fpp.filter(item => item.ts === kline.ts && fppFilters.includes(item.type));
    //   const r: any = {up: { s: 0, v: parseFloat(kline.low)}, down: { s: 0, v: parseFloat(kline.high) }};
    //   for (const fppItem of fppItems) {
    //     r[fppItem.direction].s += 1;
    //     // if (fppItem.type === 'locked_volume') {
    //     //   r[fppItem.direction] += 1;
    //     // } else if (fppItem.type === 'locked_imbalance') {
    //     //   if (fppItem.direction === 'up') {
    //     //     value -= value * 0.002;
    //     //   } else {
    //     //     value += value * 0.002;
    //     //   }
    //     // } else if (fppItem.type === 'locked_delta') {
    //     //   if (fppItem.direction === 'up') {
    //     //     value -= value * 0.003;
    //     //   } else {
    //     //     value += value * 0.003;
    //     //   }
    //     // } else if (fppItem.type === 'reverse') {
    //     //   if (fppItem.direction === 'up') {
    //     //     value -= value * 0.004;
    //     //   } else {
    //     //     value += value * 0.004;
    //     //   }
    //     // } else if (fppItem.type === 'low_last_price_volume') {
    //     //   if (fppItem.direction === 'up') {
    //     //     value -= value * 0.005;
    //     //   } else {
    //     //     value += value * 0.005;
    //     //   }
    //     // } else if (fppItem.type === 'test_volume') {
    //     //   if (fppItem.direction === 'up') {
    //     //     value -= value * 0.006;
    //     //   } else {
    //     //     value += value * 0.006;
    //     //   }
    //     // }
    //     if (r.up.s) {
    //       chart.createOverlay({
    //         name: `up${r.up.s}Circle`,
    //         points: [
    //           {
    //             timestamp: parseInt(kline.ts),
    //             value: r.up.v,
    //           }
    //         ]
    //       });
    //     }
    //     if (r.down.s) {
    //       chart.createOverlay({
    //         name: `down${r.down.s}Circle`,
    //         points: [
    //           {
    //             timestamp: parseInt(kline.ts),
    //             value: r.down.v,
    //           }
    //         ]
    //       });
    //     }
    //   }
    // }

    for (const item of dhm) {
      if (['waiting', 'finished', 'finished_by_lose', 'finished_by_length'].includes(item.status)) {
        chart.createOverlay({
          name: `${camelCase(item.status)}StartKline`,
          points: [{timestamp: parseInt(item.data.kline1.ts), value: parseFloat(item.data.kline1.close)}],
        })
      }
      if (item.confirmed) {
        chart.createOverlay({
          name: `confirmedCircle`,
          points: [
            {
              timestamp: parseInt(item.data.kline1.ts),
              value: parseFloat(item.data.kline1.low)
            }
          ]
        });
      }
    }
    // add EMA200 trand indicator
    chart.createIndicator('EMA', false, { id: 'candle_pane' });
    // chart.createIndicator('CUM_DELTA', true);
    //chart.createOverlay({ name: 'custom_rect_overlay' })
    chart.subscribeAction('onCandleBarClick', (event) => {
      const { data, x, y } = event
      const currentDhm = dhm.find(item => item.data.kline1Id === data.current.id);
      console.log(currentDhm);
      setCurrentDhm(currentDhm);
      setCurrentKline(data.current);
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
        setCurrentPrice(data?.data?.close);
        console.log(chart);
        chart.updateData({
          ...data.data,
          timestamp: parseInt(data.data.ts),
          volume: parseInt(data.data.volume),
        });
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

  // registerIndicator({
  //   name: 'CUM_DELTA',
  //   calc: (dataList) => {
  //     let cum = 0;
  //     return dataList.map((bar: any) => {
  //       const delta = parseInt(bar.bv) - parseInt(bar.sv);
  //       cum += delta;
  //       return { value: cum };
  //     });
  //   },
  //   figures: [
  //     {
  //       key: 'value',
  //       title: 'CUM_DELTA',
  //       type: 'line'
  //     }
  //   ]
  // });

  // registerFigure({
  //   name: 'circle1',
  //   draw: ({ ctx, coordinates }: any) => {
  //     console.log(coordinates);
  //     if (!coordinates || coordinates.length === 0) return
  //     const { x, y } = coordinates[0]
  //
  //     ctx.beginPath()
  //     ctx.arc(x, y - 10, 5, 0, Math.PI * 2) // над свечой на 10px вверх
  //     ctx.fillStyle = 'red'
  //     ctx.fill()
  //   },
  //   checkEventOn: ({ x, y }, { coordinates }) => {
  //     console.log(123213);
  //     console.log(coordinates);
  //     if (!coordinates || coordinates.length === 0) return false
  //     const p = coordinates[0]
  //     const dx = x - p.x
  //     const dy = y - (p.y - 10)
  //     return dx * dx + dy * dy <= 25 // радиус 5px
  //   }
  // })

  // registerFigure({
  //   name: 'custom_rect',
  //   draw: ({ ctx, figure, coordinates, styles }: any) => {
  //     console.log(ctx, figure, coordinates, styles);
  //     if (coordinates.length < 2) return;
  //
  //     const [p1, p2] = coordinates;
  //
  //     const x = Math.min(p1.x, p2.x);
  //     const y = Math.min(p1.y, p2.y);
  //     const width = Math.abs(p2.x - p1.x);
  //     const height = Math.abs(p2.y - p1.y);
  //
  //     ctx.fillStyle = styles.color || 'rgba(0, 128, 255, 0.2)';
  //     ctx.fillRect(x, y, width, height);
  //   }
  // });

  // registerOverlay({
  //   name: 'upCircle',
  //   totalStep: 2,
  //   createPointFigures: ({ coordinates }) => {
  //     return {
  //       type: 'circle1',
  //       attrs: {
  //         x: coordinates[0].x,
  //         y: coordinates[0].y,
  //         width: 50,
  //         height: 50
  //       },
  //       styles: {
  //         style: 'fill',
  //         color: 'rgba(20,234,114,0.39)' // Жёлтый с прозрачностью
  //       },
  //     }
  //   }
  // });

  // registerOverlay({
  //   name: 'myCircleOverlay',
  //   createPointFigures: ({ points }): any => points.map((p, idx) => ({
  //     key: `circle-${idx}`,
  //     type: 'circle',
  //     // attrs: { ... },
  //     // styles: { ... },
  //   })),
  //   onClick: (e) => {
  //     // e содержит { figure, dataIndex, etc. }
  //     return true // включаем стандартную логику тултипа
  //   },
  //   createTooltipDataSource: ({ figure, timestamp, value }) => [
  //     { title: 'Time', value: new Date(timestamp).toLocaleString() },
  //     { title: 'Value', value: value.toString() },
  //   ],
  // })

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

  registerOverlay({
    name: 'confirmedCircle',
    totalStep: 1,
    needDefaultPointFigure: false,
    createPointFigures: ({ coordinates }) => {
      const [point] = coordinates;
      return [
        {
          type: 'circle',
          attrs: {
            x: point.x,
            y: point.y + 10, // немного выше
            r: 8,
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
    name: 'finishedStartKline',
    totalStep: 2,
    createPointFigures: ({ coordinates }) => {
      return {
        type: 'godKline',
        attrs: {
          x: coordinates[0].x,
          y: coordinates[0].y,
          width: 50,
          height: 50
        },
        styles: {
          style: 'fill',
          color: 'rgba(20,234,114,0.39)' // Жёлтый с прозрачностью
        },
      }
    }
  });

  registerOverlay({
    name: 'triggeredStartKline',
    totalStep: 2,
    createPointFigures: ({ coordinates }) => {
      return {
        type: 'godKline',
        attrs: {
          x: coordinates[0].x,
          y: coordinates[0].y,
          width: 50,
          height: 50
        },
        styles: {
          style: 'fill',
          color: 'rgba(253,207,27,0.2)' // Жёлтый с прозрачностью
        },
      }
    }
  });

  registerOverlay({
    name: 'finishedByLoseStartKline',
    totalStep: 2,
    createPointFigures: ({ coordinates }) => {
      return {
        type: 'godKline',
        attrs: {
          x: coordinates[0].x,
          y: coordinates[0].y,
          width: 50,
          height: 50
        },
        styles: {
          style: 'fill',
          color: 'rgba(220,14,14,0.2)' // Жёлтый с прозрачностью
        },
      }
    }
  });

  registerOverlay({
    name: 'waitingStartKline',
    totalStep: 2,
    createPointFigures: ({ coordinates }) => {
      return {
        type: 'godKline',
        attrs: {
          x: coordinates[0].x,
          y: coordinates[0].y,
          width: 50,
          height: 50
        },
        styles: {
          style: 'fill',
          color: 'rgba(246,220,51,0.2)' // Жёлтый с прозрачностью
        },
      }
    }
  });

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

  // registerOverlay({
  //   name: 'custom_rect_overlay',
  //   totalStep: 2,
  //   needDefaultPointFigure: false,
  //
  //   createPointFigures: ({ coordinates }) => {
  //     //if (coordinates.length < 2) return [];
  //     console.log(coordinates);
  //     return [
  //       {
  //         type: 'custom_rect',
  //         attrs: {
  //           coordinates: [coordinates[0], coordinates[1]]
  //         },
  //         styles: {
  //           color: 'rgba(100, 149, 237, 0.3)'
  //         }
  //       }
  //     ];
  //   }
  // });

  return (
    <main>
      <div id="chart" style={{width: '100%', height: `${height}px` }}/>
      {height}

      <IconButton key='fppSettings' sx={{
        position: 'absolute',
        zIndex: 1,
        left: '18px',
        top: `${70}px`,
        background: '#ececec',
      }} aria-label="delete" onClick={() => {
        setOpenFppFilters(true);
      }}>
        <SettingsIcon />
      </IconButton>

      <IconButton key='settings' sx={{
        position: 'absolute',
        zIndex: 1,
        left: '18px',
        bottom: `${4 * 45 + 65}px`,
        background: '#ececec',
      }} aria-label="delete" onClick={() => {
        setOpenSettings(true);
      }}>
        <SettingsIcon />
      </IconButton>

      <IconButton key='backtest' sx={{
        position: 'absolute',
        zIndex: 1,
        left: '18px',
        bottom: `${3 * 45 + 65}px`,
        background: '#ececec',
      }} aria-label="delete" onClick={() => {
        setOpenBacktest(true);
      }}>
        <SpeedIcon />
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
        open={currentKline}
        onClose={() => setCurrentKline(null)}
        title={`Kline ${currentKline?.ts}`}
        content={(
          <StrategiesDhmDialog
            currentDhm={currentDhm}
            currentKline={currentKline}
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
        open={openSettings}
        onClose={() => setOpenSettings(false)}
        title={`Settings`}
        content={(
          <StrategiesDhmSettingsDialog />
        )}
      />

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

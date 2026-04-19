import {direction} from "@/src/utils/klinecharts";
import {clusterPocRow, clusterRowDelta, sortedCluster} from "klines-footprint-patterns";

const greenColors = [
  '#e0f2f1',
  '#b2dfdb',
  '#80cbc4',
  '#4db6ac',
  '#26a69a',
  '#009688',
  '#00897b',
  '#00796b',
  '#00695c',
  '#004d40',
]

const greenColorsForOrderbooks = [
  'transparent',
  '#b2dfdb',
  '#80cbc4',
  '#4db6ac',
  '#26a69a',
  '#009688',
  '#00897b',
  '#00796b',
  '#00695c',
  '#004d40',
]

const redColors = [
  '#ffebee',
  '#ffcdd2',
  '#ef9a9a',
  '#e57373',
  '#ef5350',
  '#f44336',
  '#e53935',
  '#d32f2f',
  '#c62828',
  '#b71c1c',
]

const transSuccessColor = 'rgba(0,89,30,0.95)';
const successColor = 'rgba(0,89,30)';
const transErrorColor = 'rgba(244,67,54,0.95)';
const errorColor = 'rgba(244,67,54)';


// export const limitOrder = {
//   name: 'limitOrder',
//   totalStep: 2,
//   needDefaultPointFigure: true,
//   needDefaultXAxisFigure: true,
//   needDefaultYAxisFigure: true,
//   createPointFigures: ({ chart, coordinates, bounding, overlay, yAxis }: any) => {
//     let precision = 0
//     if (yAxis?.isInCandle() ?? true) {
//       precision = chart.getSymbol()?.pricePrecision ?? 2
//     } else {
//       const indicators = chart.getIndicators({ paneId: overlay.paneId })
//       indicators.forEach(indicator => {
//         precision = Math.max(precision, indicator.precision)
//       })
//     }
//     const { value = 0 } = (overlay.points)[0]
//     return [
//       {
//         type: 'line',
//         attrs: { coordinates: [coordinates[0], { x: bounding.width, y: coordinates[0].y }] }
//       },
//       {
//         type: 'text',
//         ignoreEvent: true,
//         attrs: {
//           x: coordinates[0].x,
//           y: coordinates[0].y,
//           text: chart.getDecimalFold().format(chart.getThousandsSeparator().format(value.toFixed(precision))),
//           baseline: 'bottom'
//         }
//       }
//     ]
//   }
// }

export const godKline = {
  name: 'godKline',
  draw: (ctx, attrs, styles) => {
    const barSpaceWidth = 10;
    const { x, y, width, height } = attrs;
    const { color } = styles;
    ctx.beginPath();
    ctx.moveTo(x - (barSpaceWidth / 2), 0);
    ctx.lineTo(x + (barSpaceWidth / 2), 0);
    ctx.lineTo(x + (barSpaceWidth / 2), 10000);
    ctx.lineTo(x - (barSpaceWidth / 2), 10000);
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
}

export const cumDelta = {
  name: 'CUM_DELTA',
  calc: (dataList, indicator) => {
    console.log(indicator);
    let cum = 0;
    return dataList.map((bar: any) => {
      const delta = parseInt(bar.bv) - parseInt(bar.sv);
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
}

export const confirmedCircle = {
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
}

export const finishedStartKline = {
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
}

export const triggeredStartKline = {
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
}

export const finishedByLoseStartKline = {
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
}

export const waitingStartKline = {
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
}

export const createdStartKline = {
  name: 'createdStartKline',
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
}

export const swingHighKline = {
  name: 'swingHighKline',
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
        color: 'rgba(76,175,80,0.3)' // Green with transparency for swing high
      },
    }
  }
}

export const swingLowKline = {
  name: 'swingLowKline',
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
        color: 'rgba(244,67,54,0.3)' // Red with transparency for swing low
      },
    }
  }
}

export const ema = {
  name: 'EMA',
  shortName: 'EMA',
  series: 'price',
  calcParams: [150],
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
}

/**
 * BOLL
 */
export const bollingerBands = {
  name: 'BOLL',
  shortName: 'BOLL',
  series: 'price',
  calcParams: [20, 2],
  precision: 2,
  shouldOhlc: true,
  figures: [
    { key: 'up', title: 'UP: ', type: 'line' },
    { key: 'mid', title: 'MID: ', type: 'line' },
    { key: 'dn', title: 'DN: ', type: 'line' }
  ],
  calc: (dataList, indicator) => {
    const params = indicator.calcParams
    const p = params[0] - 1
    let closeSum = 0
    return dataList.reduce((prev, kLineData, i) => {
      const close = kLineData.close
      const boll: Boll = {}
      closeSum += close
      if (i >= p) {
        boll.mid = closeSum / params[0]
        const md = getBollMd(dataList.slice(i - p, i + 1), boll.mid)
        boll.up = boll.mid + params[1] * md
        boll.dn = boll.mid - params[1] * md
        closeSum -= dataList[i - p].close
      }
      prev[i] = boll
      return prev
    }, {})
  }
}

export const customRectFigure = {
  name: 'custom_rect',
  draw: ({ ctx, figure, coordinates, styles }: any) => {
    if (coordinates.length < 2) return;

    const [p1, p2] = coordinates;

    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);

    ctx.fillStyle = styles.color || 'rgba(0, 128, 255, 0.2)';
    ctx.fillRect(x, y, width, height);
  }
}

export const noneditableRect: any = {
  name: 'noneditableRect',
  totalStep: 3,
  lock: true,
  //needDefaultXAxisFigure: true,
  //needDefaultYAxisFigure: true,
  //needDefaultPointFigure: false,
  styles: {
    polygon: {
      color: 'rgba(22, 119, 255, 0.15)'
    }
  },
  createPointFigures: ({ coordinates }) => {
    if (coordinates.length > 1) {
      return [
        {
          type: 'polygon',
          attrs: {
            coordinates: [
              coordinates[0],
              { x: coordinates[1].x, y: coordinates[0].y },
              coordinates[1],
              { x: coordinates[0].x, y: coordinates[1].y }
            ]
          },
          styles: { style: 'stroke_fill' }
        }
      ]
    }
    return []
  }
}

export function upCircleBySize(size, onClickCallback){
  return {
    name: `up${size}Circle`,
    totalStep: 1,
    needDefaultPointFigure: false,
    onClick: (e) => {
      return onClickCallback(e);
    },
    createPointFigures: ({ coordinates }) => {
      const [point] = coordinates;
      return [
        {
          type: 'circle',
          attrs: {
            x: point.x,
            y: point.y + 10,
            r: 1 + (size * 2),
          },
          styles: {
            color: 'rgba(0,89,30, 0.55)',
            style: 'fill',
          }
        }
      ];
    }
  }
}

export const dhmUp: any = {
  name: 'dhmUp',
  totalStep: 2,
  styles: {
    line: { style: 'dashed' }
  },
  createPointFigures: ({ overlay, coordinates }) => {
    let text = ''
    text = (overlay?.extendData?.ts ?? '') as string;
    text = `${text} (${overlay?.extendData?.tf})`;
    const status = overlay?.extendData?.status ?? '';
    const text2 = '•';
    const confirmed = overlay?.extendData?.confirmed ?? false
    const opacity = confirmed ? 0.95 : 0.3;
    const startX = coordinates[0].x
    const startY = coordinates[0].y + 5
    const lineEndY = startY + 10;
    const arrowEndY = lineEndY + 30;

    const result = [
      {
        type: 'line',
        attrs: { coordinates: [{ x: startX, y: startY }, { x: startX, y: lineEndY }] },
        ignoreEvent: true,
        styles: {
          color: `rgba(0,89,30,${opacity})`,
          style: 'dashed',
        }
      },
      {
        type: 'polygon',
        attrs: { coordinates: [{ x: startX, y: lineEndY }, { x: startX - 5, y: arrowEndY - 20 }, { x: startX + 5, y: arrowEndY - 20 }] },
        ignoreEvent: true,
        styles: {
          color: `rgba(0,89,30,${opacity})`,
          style: 'fill',
        }
      },
      {
        type: 'text',
        attrs: { x: startX, y: arrowEndY, text, align: 'center', baseline: 'bottom' },
        ignoreEvent: true,
        styles: {
          backgroundColor: `rgba(0,89,30,${opacity})`,
          //color: 'rgba(0,89,30, 0.55)',
          style: 'fill',
        }
      }
    ];

    if (overlay?.extendData?.confirmed) {
      result.push({
        type: 'text',
        attrs: { x: startX, y: arrowEndY + 40, text: text2, align: 'center', baseline: 'bottom' },
        ignoreEvent: true,
        styles: {
          backgroundColor: `rgba(0,89,30,0)`,
          color: status === 'finished' ? successColor : status === 'finished_by_lose' ? errorColor : 'transparent',
          size: 50,
          style: 'fill',
        }
      });
    }

    return result;
  }
}

export const dhmDown: any = {
  name: 'dhmDown',
  totalStep: 2,
  styles: {
    line: { style: 'dashed' }
  },
  createPointFigures: ({ overlay, coordinates }) => {
    let text = ''
    text = (overlay?.extendData?.ts ?? '') as string;
    text = `${text} (${overlay?.extendData?.tf})`;
    const status = overlay?.extendData?.status ?? '';
    const text2 = '•';
    const confirmed = overlay?.extendData?.confirmed ?? false
    const opacity = confirmed ? 0.9 : 0.3;
    const startX = coordinates[0].x
    // Draw above kline: shift everything upward from candle
    const startY = coordinates[0].y - 5
    const lineEndY = startY - 10;
    const arrowEndY = lineEndY - 30;

    const result = [
      {
        type: 'line',
        attrs: { coordinates: [{ x: startX, y: startY }, { x: startX, y: lineEndY }] },
        ignoreEvent: true,
        styles: {
          color: `rgba(244,67,54,${opacity})`,
          style: 'dashed',
        }
      },
      {
        type: 'polygon',
        // Triangle pointing down from the line toward the text
        attrs: { coordinates: [{ x: startX, y: lineEndY }, { x: startX - 5, y: arrowEndY + 20 }, { x: startX + 5, y: arrowEndY + 20 }] },
        ignoreEvent: true,
        styles: {
          color: `rgba(244,67,54,${opacity})`,
          style: 'fill',
        }
      },
      {
        type: 'text',
        // Place text above kline (higher on chart)
        attrs: { x: startX, y: arrowEndY, text, align: 'center', baseline: 'top' },
        ignoreEvent: true,
        styles: {
          backgroundColor: `rgba(244,67,54,${opacity})`,
          //color: 'rgba(0,89,30, 0.55)',
          style: 'fill',
        }
      }
    ];

    if (overlay?.extendData?.confirmed) {
      result.push({
        type: 'text',
        attrs: { x: startX, y: arrowEndY + 20, text: text2, align: 'center', baseline: 'bottom' },
        ignoreEvent: true,
        styles: {
          backgroundColor: `rgba(0,89,30,0)`,
          color: status === 'finished' ? successColor : status === 'finished_by_lose' ? errorColor : 'transparent',
          size: 50,
          style: 'fill',
        }
      });
    }

    return result;
  }
}

export const dhmLevel: any = {
  name: 'dhmLevel',
  totalStep: 2,
  styles: {
    line: { style: 'dashed' }
  },
  // createPointFigures: ({ overlay, coordinates }) => {
  //   const text = '123123123'
  //   //text = (overlay.extendData ?? '') as string
  //   const low = (overlay.low ?? '') as string;
  //   const high = (overlay.high ?? '') as string;
  //   const startX = coordinates[0].x
  //   //const startY = parseFloat(low) + ((parseFloat(high) - parseFloat(low)) / 2);
  //   const startY = coordinates[0].y;
  //   return [
  //     {
  //       type: 'line',
  //       attrs: { coordinates: [{ x: startX, y: startY }, { x: startX + 1000, y: startY }] },
  //       ignoreEvent: true,
  //       styles: {
  //         color: 'rgba(0,89,30, 0.55)',
  //         style: 'dashed',
  //       }
  //     },
  //     {
  //       type: 'text',
  //       attrs: { x: startX, y: startY, text, align: 'center', baseline: 'bottom' },
  //       ignoreEvent: true,
  //       styles: {
  //         backgroundColor: 'rgba(0,89,30, 0.55)',
  //         //color: 'rgba(0,89,30, 0.55)',
  //         style: 'fill',
  //       }
  //     }
  //   ]
  // }
  createPointFigures: ({ chart, coordinates, bounding, overlay, yAxis }: any) => {
    const points = overlay.points



    if (coordinates.length > 0) {
      let precision = 0
      // if (yAxis?.isInCandle() ?? true) {
      //   precision = chart.getPrecision().price
      // } else {
      //   const indicators = chart.getIndicators({ paneId: overlay.paneId })
      //   indicators.forEach((indicator: any) => {
      //     precision = Math.max(precision, indicator.precision)
      //   })
      // }
      const indicators = chart.getIndicators({ paneId: overlay.paneId })
      indicators.forEach((indicator: any) => {
        precision = Math.max(precision, indicator.precision)
      })
      const lines: any[] = []
      const texts: any[] = []
      const startX = 0
      const endX = bounding.width
      if (coordinates.length > 1 && typeof points[0].value === 'number' && Number.isFinite(points[0].value) && typeof points[1].value === 'number' && Number.isFinite(points[1].value)) {
        const percents = [0.5]
        //const percents = [1, 0.5, 0]
        const yDif = coordinates[0].y - coordinates[1].y
        const valueDif = points[0].value - points[1].value
        const baseValue = points[1].value || 0
        const percentChange = baseValue ? (valueDif / baseValue) * 100 : null
        percents.forEach(percent => {
          const y = coordinates[1].y + yDif * percent
          const value = chart.getDecimalFold().format(chart.getThousandsSeparator().format(((points[1].value ?? 0) + valueDif * percent).toFixed(precision)))
          const changeText = percent === 1 && percentChange !== null
            ? ` | ${(percentChange >= 0 ? '+' : '')}${percentChange.toFixed(2)}%`
            : ''
          lines.push({ coordinates: [{ x: startX, y }, { x: endX, y }] })
          texts.push({
            x: startX,
            y,
            text: `${value} (${(percent * 100).toFixed(1)}%)${changeText}`,
            baseline: 'bottom'
          })
        })
      }
      return [
        {
          type: 'line',
          attrs: lines
        }, {
          type: 'text',
          isCheckEvent: false,
          attrs: texts
        }
      ]
    }
    return []
  }
}

export function downCircleBySize(size: number, onClickCallback: any){
  return {
    name: `down${size}Circle`,
    totalStep: 1,
    needDefaultPointFigure: false,
    onClick: (e) => {
      return onClickCallback(e);
    },
    createPointFigures: ({ coordinates }) => {
      const [point] = coordinates;
      return [
        {
          type: 'circle',
          attrs: {
            x: point.x,
            y: point.y - 10,
            r: 1 + (size * 2),
          },
          styles: {
            color: '#ff0000',
            style: 'fill',
          }
        }
      ];
    }
  }
}

export function getPriceByWebSocket(chart: any, pairId: number, tf: number, callback: any): WebSocket | null {
  if (!chart) { return null }
  const socket = new WebSocket('ws://klines.traken-trade.ru/ws/')

  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: 'subscribeKlinesByPairIdAndTf',
      pairId: parseInt(pairId),
      tf: parseInt(tf),
    }))
  }

  socket.onmessage = (msg) => {
    callback(msg);
  }

  return socket
}

export function resizeChart(chart: any) {
  if (!chart) { return }
  if (typeof window !== 'undefined') {
    chart._container.style.height = `${window.innerHeight}px`;
    chart.resize();
    const handler = () => {
      chart._container.style.height = `${window.innerHeight}px`;
      chart.resize();
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }
}

export function clusterKline(data: any) {
  console.log('data', data);
  const sortedData = sortByPrice(Object.values(data), false);
  console.log('sortedData', sortedData);
  return {
    name: 'clusterKline',
    lock: true,
    createPointFigures: ({coordinates}) => {
      const result = [];
      // let levels = [];
      // let texts = [];
      const height = coordinates[1].y - coordinates[0].y;
      const clusterLevelHeight = height / Object.keys(data).length;
      //const maxVolume = 0;
      let i = 0;
      const poc = pocFromCluster(data);
      result.push({
        type: 'rect',
        attrs: {
          x: coordinates[0].x - 18,
          y: coordinates[0].y - 1,
          width: 65,
          height: height + 2,
        },
        styles: {
          style: 'stroke_fill',
          color: '#fff',
          padding: 1,
          borderColor: '#009688',
          borderStyle: 'solid',
          borderSize: 1,
        }
      });
      let maxDelta = 0;
      for (const item of sortedData) {
        const absDeltaValue = Math.abs(parseFloat(delta(item)));
        if (absDeltaValue > maxDelta) {
          maxDelta = absDeltaValue;
        }
      }
      for (const [index, item] of sortedData.entries()) {
        // if data[price].
        const priceDelta = sortedData.length >= 2 ? parseFloat(sortedData[1].p) - parseFloat(sortedData[0].p) : null;
        const bv = parseFloat(item.bv);
        const sv = parseFloat(item.sv);
        const v = parseFloat(item.v);
        const deltaValue = parseFloat(delta(item));
        const absDeltaValue = Math.abs(deltaValue);
        const delimeter = absDeltaValue >= 1000 ? absDeltaValue >= 1000000 ? 1000000 : 1000 : 1;
        const deltaText = `${Math.round(deltaValue / delimeter)}${delimeter === 1000000 ? 'm' : delimeter === 1000 ? 'k' : ''}`;
        const buyValueText = `${Math.round(bv / delimeter)}${delimeter === 1000000 ? 'm' : delimeter === 1000 ? 'k' : ''}`;
        const sellValueText = `${Math.round(sv / delimeter)}${delimeter === 1000000 ? 'm' : delimeter === 1000 ? 'k' : ''}`;
        const text = `${deltaText} (${sellValueText}x${buyValueText})`;
        const bgColorIndex = getColorIndex(0, maxDelta, absDeltaValue);
        result.push({
          type: 'rect',
          attrs: {
            x: coordinates[0].x - 17,
            y: coordinates[0].y + (i * clusterLevelHeight),
            width: 63,
            height: clusterLevelHeight,
          },
          styles: {
            style: 'stroke_fill',
            color: bv > sv ? greenColors[bgColorIndex] : redColors[bgColorIndex],
            backgroundColor: bv > sv ? greenColors[bgColorIndex] : redColors[bgColorIndex],
            //borderColor: '#fff',
            //borderStyle: 'solid',
            borderSize: 0,
          }
        })
        result.push({
          type: 'text',
          attrs: {
            x: coordinates[0].x - 17,
            y: coordinates[0].y + (i * clusterLevelHeight),
            text,
            width: 63,
            height: clusterLevelHeight - 1,
            //baseline: 'hanging',
          },
          styles: {
            backgroundColor: 'transparent',
            color: poc.v === v ? '#000' : bgColorIndex > 3 ? '#fff' : '#757575',
            size: height > 200 ? height > 350 ? 10 : 8 : 7,
            weight: 'bold',
            borderColor: '#fff',
            //borderStyle: 'solid',
            borderSize: 0,
            paddingTop: 0,
            paddingBottom: 0,
            paddingLeft: 0,
            paddingRight: 0,
          }
        })

        if (priceDelta && sortedData[index + 1] && parseFloat(item.p) < (priceDelta + parseFloat(sortedData[index + 1].p))) {
          result.push({
            type: 'rect',
            attrs: {
              x: coordinates[0].x - 17,
              y: coordinates[0].y + (i * clusterLevelHeight) + 1,
              width: 63,
              height: clusterLevelHeight,
            },
            styles: {
              style: 'stroke_fill',
              color: '#fff',
              backgroundColor: '#fff',
              //borderColor: '#fff',
              //borderStyle: 'solid',
              borderSize: 0,
            }
          })
          result.push({
            type: 'text',
            attrs: {
              x: coordinates[0].x - 17,
              y: coordinates[0].y + (i * clusterLevelHeight) + 1,
              text,
              width: 63,
              height: clusterLevelHeight - 1,
              //baseline: 'hanging',
            },
            styles: {
              backgroundColor: 'transparent',
              color: '#757575',
              size: height > 200 ? height > 350 ? 10 : 8 : 7,
              weight: 'bold',
              borderColor: '#fff',
              //borderStyle: 'solid',
              borderSize: 0,
              paddingTop: 0,
              paddingBottom: 0,
              paddingLeft: 0,
              paddingRight: 0,
            }
          })
        }

        i++;
      }

      const generalBv = sortedData.reduce((cur, item) => parseFloat(item.bv) + cur, 0);
      const generalSv = sortedData.reduce((cur, item) => parseFloat(item.sv) + cur, 0);
      const deltaValue = sortedData.reduce((cur, item) => parseFloat(delta(item)) + cur, 0);
      const absDeltaValue = Math.abs(deltaValue);
      const delimeter = absDeltaValue >= 1000 ? absDeltaValue >= 1000000 ? 1000000 : 1000 : 1;

      const deltaText = `${Math.round(deltaValue / delimeter)}${delimeter === 1000000 ? 'm' : delimeter === 1000 ? 'k' : ''}`;
      const buyValueText = `${Math.round(generalBv / delimeter)}${delimeter === 1000000 ? 'm' : delimeter === 1000 ? 'k' : ''}`;
      const sellValueText = `${Math.round(generalSv / delimeter)}${delimeter === 1000000 ? 'm' : delimeter === 1000 ? 'k' : ''}`;

      const text = `${deltaText} (${buyValueText}x${sellValueText})`;
      const bgColorIndex = getColorIndex(0, maxDelta, absDeltaValue);

      result.push({
        type: 'rect',
        attrs: {
          x: coordinates[0].x - 17,
          y: coordinates[0].y + ((Object.keys(data).length + 1) * clusterLevelHeight),
          width: 63,
          height: clusterLevelHeight,
        },
        styles: {
          style: 'stroke_fill',
          color: generalBv > generalSv ? greenColors[bgColorIndex] : redColors[bgColorIndex],
          backgroundColor: generalBv > generalSv ? greenColors[bgColorIndex] : redColors[bgColorIndex],
          //borderColor: '#fff',
          //borderStyle: 'solid',
          borderSize: 0,
        }
      })
      result.push({
        type: 'text',
        attrs: {
          x: coordinates[0].x - 17,
          y: coordinates[0].y + ((Object.keys(data).length + 1) * clusterLevelHeight),
          text,
          width: 63,
          height: clusterLevelHeight - 1,
          //baseline: 'hanging',
        },
        styles: {
          backgroundColor: 'transparent',
          color: '#fff',
          size: height > 200 ? height > 350 ? 10 : 8 : 7,
          weight: 'bold',
          borderColor: '#fff',
          //borderStyle: 'solid',
          borderSize: 0,
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
        }
      })
      return result;
    }
  }
}

export function heatmapItem() {
  return {
    name: 'heatmapItem',
    lock: true,
    createPointFigures: ({ chart, overlay, coordinates }) => {
      const data = overlay?.extendData;
      const height = coordinates[1].y - coordinates[0].y;
      const clusterLevelHeight = height / Object.keys(data).length;

      let maxValue = 0;
      for (const item of Object.keys(data)) {
        if (data[item] > maxValue) {
          maxValue = data[item];
        }
      }

      maxValue = maxValue / 10;

      const result = [];
      const x1 = chart.convertToPixel({ dataIndex: 0, value: 0 }).x
      const x2 = chart.convertToPixel({ dataIndex: 1, value: 0 }).x
      const klineWidth = Math.abs(x1) - Math.abs(x2);

      //const a = chart.convertFromPixel(point)

      for (const [index, item] of Object.keys(data).sort().entries()) {
        const v = data[item.toString()];

        const bgColorIndex = getColorIndex(0, maxValue, v);

        if (bgColorIndex === 0) {
          continue;
        }

        result.push({
          type: 'rect',
          attrs: {
            x: coordinates[0].x - (klineWidth * 0.5),
            y: coordinates[0].y + (index * clusterLevelHeight),
            width: klineWidth,
            height: clusterLevelHeight,
          },
          styles: {
            style: 'stroke_fill',
            color: greenColorsForOrderbooks[bgColorIndex],
            //backgroundColor: '#00796b',
            //borderColor: '#fff',
            //borderStyle: 'solid',
            borderSize: 0,
          }
        })
      }

      return result;
    }
  }
}

function createSessionOverlay(name: string, color: string, label: string, textColor = '#1f2937'): any {
  return {
    name,
    totalStep: 2,
    lock: true,
    needDefaultPointFigure: false,
    createPointFigures: ({ coordinates, bounding }: any) => {
      if (!coordinates || coordinates.length < 2) {
        return [];
      }

      const left = Math.min(coordinates[0].x, coordinates[1].x);
      const right = Math.max(coordinates[0].x, coordinates[1].x);

      return [
        {
          type: 'polygon',
          ignoreEvent: true,
          attrs: {
            coordinates: [
              { x: left, y: 0 },
              { x: right, y: 0 },
              { x: right, y: bounding.height },
              { x: left, y: bounding.height }
            ]
          },
          styles: {
            style: 'fill',
            color
          }
        },
        {
          type: 'text',
          ignoreEvent: true,
          attrs: {
            x: left + 6,
            y: bounding.height - 6,
            text: label,
            align: 'left',
            baseline: 'bottom'
          },
          styles: {
            color: textColor,
            size: 12,
            weight: 'bold',
            backgroundColor: 'transparent'
          }
        }
      ];
    }
  };
}

function drawSessionOverlays(
  chart: any,
  klines: any[],
  sessionName: string,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  isEndNextDay = false
) {
  if (!chart || !klines?.length) {
    return;
  }

  chart.removeOverlay({ name: sessionName });

  const dayRanges = new Map<string, { startTs: number; endTs: number }>();

  for (const kline of klines) {
    const ts = Number(kline?.timestamp ?? kline?.ts);
    if (!Number.isFinite(ts)) {
      continue;
    }

    const day = new Date(ts);
    const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;

    if (!dayRanges.has(dayKey)) {
      const start = new Date(day);
      start.setHours(startHour, startMinute, 0, 0);

      const end = new Date(start);
      if (isEndNextDay) {
        end.setDate(end.getDate() + 1);
      }
      end.setHours(endHour, endMinute, 0, 0);

      dayRanges.set(dayKey, { startTs: start.getTime(), endTs: end.getTime() });
    }
  }

  for (const range of dayRanges.values()) {
    chart.createOverlay({
      name: sessionName,
      lock: true,
      points: [
        { timestamp: range.startTs, value: 0 },
        { timestamp: range.endTs, value: 0 }
      ]
    });
  }
}

export const londonSession: any = createSessionOverlay(
  'londonSession',
  'rgba(255, 235, 59, 0.2)',
  'London'
);

export function drawLondonSessionOverlays(chart: any, klines: any[]) {
  drawSessionOverlays(chart, klines, 'londonSession', 12, 0, 20, 30, false);
}

export const mintSession: any = createSessionOverlay(
  'mintSession',
  'rgba(62, 180, 137, 0.2)',
  'New York'
);

export function drawMintSessionOverlays(chart: any, klines: any[]) {
  drawSessionOverlays(chart, klines, 'mintSession', 18, 30, 1, 0, true);
}

export const blueSession: any = createSessionOverlay(
  'blueSession',
  'rgba(59, 130, 246, 0.2)',
  'Tokyo'
);

export function drawBlueSessionOverlays(chart: any, klines: any[]) {
  drawSessionOverlays(chart, klines, 'blueSession', 4, 0, 10, 30, false);
}

export function getWeaknessKline(kline: any, cluster: any) {
  if (!cluster) { return false }
  // if (!klineMinus1) { continue; }
  // if (!klineMinus2) { continue; }
  // if (!klineMinus3) { continue; }
  // if (!klineMinus4) { continue; }
  // if (!klinePlus1) { continue; }
  // if (!klinePlus2) { continue; }
  //
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

  if (!clusterPoc) { return false }

  if (topWickSize / bottomWickSize > 1) {
    // down
    if (
      weaknessEnoughCondition &&
      bodySizeEnoughCondition
      //parseFloat(clusterPoc.p) > parseFloat(kline.open)
    ) {
      return {
        status: true,
        direction: 'down',
      }
    }
  } else {
    // up
    if (
      weaknessEnoughCondition &&
      bodySizeEnoughCondition
      //parseFloat(clusterPoc.p) < parseFloat(kline.open)
    ) {
      return {
        status: true,
        direction: 'up',
      }
    }
  }

  return false;
}

export function getInterception(kline1: any, cluster1: any, kline2: any, cluster2: any) {
  if (!cluster1) { return false }
  if (!kline1) { return false }
  if (!cluster2) { return false }
  if (!kline2) { return false }
  // if (!klineMinus1) { continue; }
  // if (!klineMinus2) { continue; }
  // if (!klineMinus3) { continue; }
  // if (!klineMinus4) { continue; }
  // if (!klinePlus1) { continue; }
  // if (!klinePlus2) { continue; }
  //
  const kline1Direction = direction(kline1);
  const kline2Direction = direction(kline2);
  const cluster1Poc = clusterPocRow(cluster1.data);
  const cluster2Poc = clusterPocRow(cluster2.data);

  if (!cluster1Poc) { return false }
  if (!cluster2Poc) { return false }

  if (kline1Direction !== kline2Direction) {
    if (kline1Direction === 'up') {
      if (parseFloat(kline1.close) > parseFloat(cluster1Poc.p) && parseFloat(kline2.close) < parseFloat(cluster2Poc.p)) {
        return {
          status: true,
          direction: 'down',
        }
      }
    } else {
      if (parseFloat(kline1.close) < parseFloat(cluster1Poc.p) && parseFloat(kline2.close) > parseFloat(cluster2Poc.p)) {
        return {
          status: true,
          direction: 'up',
        }
      }
    }
  }

  return false;
}

export function getReverse2(kline: any, cluster: any) {
  const sorted = sortedCluster(cluster.data, 'asc');
  const clusterPoc = clusterPocRow(cluster.data);

  if (!clusterPoc) { return false; }

  if (
    direction(kline) === 'up' &&
    //parseFloat(clusterRowDelta(clusterPoc)) < 0 &&
    sorted[0] && parseFloat(sorted[0].bv) < parseFloat(sorted[0].sv) &&
    sorted[1] && parseFloat(sorted[1].bv) < parseFloat(sorted[1].sv) &&
    sorted[2] && parseFloat(sorted[2].bv) < parseFloat(sorted[2].sv) &&
    sorted[3] && parseFloat(sorted[3].bv) < parseFloat(sorted[3].sv) &&
    sorted[4] && parseFloat(sorted[4].bv) < parseFloat(sorted[4].sv) &&
    sorted[5] && parseFloat(sorted[5].bv) < parseFloat(sorted[5].sv)
  ) {
    return {
      status: true,
      direction: 'up',
    }
  }

  return false;
}

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { KLineData } from '../../common/Data'
import type { IndicatorTemplate } from '../../component/Indicator'

interface Boll {
  up?: number
  mid?: number
  dn?: number
}

/**
 * 计算布林指标中的标准差
 * @param dataList
 * @param ma
 * @return {number}
 */
function getBollMd (dataList: KLineData[], ma: number): number {
  const dataSize = dataList.length
  let sum = 0
  dataList.forEach(data => {
    const closeMa = data.close - ma
    sum += closeMa * closeMa
  })
  sum = Math.abs(sum)
  return Math.sqrt(sum / dataSize)
}

function sortByPrice(array: any[], asc = true): any {
  return [...array].sort((a: any, b: any) => {
    return asc
      ? parseFloat(a.p) - parseFloat(b.p)
      : parseFloat(b.p) - parseFloat(a.p);
  });
}

function sortHeatmapByPrice(array: any[], asc = true): any {
  return [...array].sort((a: any, b: any) => {
    return asc
      ? parseFloat(a.p) - parseFloat(b.p)
      : parseFloat(b.p) - parseFloat(a.p);
  });
}

function delta(clusterPrice: any) {
  return (parseFloat(clusterPrice.bv) - parseFloat(clusterPrice.sv)).toString();
}

function pocFromCluster(data: any) {
  return Object.entries(data).reduce((max, entry) => {
    const [, current]: any = entry;
    const [, maxValue]: any = max;
    return parseFloat(current.v) > parseFloat(maxValue.v) ? entry : max;
  })[1];
}

function getColorIndex(min, max, current) {
  if (max === min) return 0 // чтобы не делить на 0
  const clamped = Math.max(min, Math.min(max, current)) // ограничиваем в пределах min-max
  const ratio = (clamped - min) / (max - min)           // нормализуем в диапазон [0,1]
  return Math.floor(ratio * 9)                          // масштабируем в [0–9]
}

export const volBarsOnly = {
  name: 'VOL',
  shortName: 'VOL',
  series: 'normal',
  calcParams: [],
  precision: 0,
  figures: [
    {
      key: 'volume',
      title: 'VOL: ',
      type: 'bar',
      baseValue: 0,
      styles: ({ data, defaultStyles }: any) => {
        const klineData = data?.current?.kLineData;
        const isUp = klineData &&
          parseFloat(klineData.close) >= parseFloat(klineData.open);
        return {
          style: 'fill',
          color: isUp
            ? (defaultStyles?.bars?.[0]?.upColor ?? 'rgba(38, 166, 154, 0.7)')
            : (defaultStyles?.bars?.[0]?.downColor ?? 'rgba(239, 83, 80, 0.7)'),
        };
      },
    },
  ],
  calc: (dataList: any[]) =>
    dataList.map((kLineData: any) => ({ volume: kLineData.volume ?? 0 })),
};

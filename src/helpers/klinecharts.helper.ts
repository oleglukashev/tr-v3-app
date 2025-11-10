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

export const godKline = {
  name: 'godKline',
  draw: (ctx, attrs, styles) => {
    const barSpaceWidth = 10;
    const { x, y, width, height } = attrs;
    const { color } = styles;
    ctx.beginPath();
    ctx.moveTo(x - (barSpaceWidth / 2), 0);
    ctx.lineTo(x + (barSpaceWidth / 2), 0);
    ctx.lineTo(x + (barSpaceWidth / 2), 1000);
    ctx.lineTo(x - (barSpaceWidth / 2), 1000);
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

export const ema = {
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

export function getPriceByWebSocket(chart: any, pairId: number, tf: number, callback: any) {
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
    callback(msg);
  }
}

export function resizeChart(chart: any) {
  if (!chart) { return }
  if (typeof window !== 'undefined') {
    chart._container.style.height = `${window.innerHeight}px`;
    chart.resize();
    window.addEventListener('resize', () => {
      chart._container.style.height = `${window.innerHeight}px`;
      chart.resize();
    })
  }
}



export function clusterKline(data: any) {
  const sortedData = sortByPrice(Object.values(data), false);
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
      for (const item of sortedData) {
        // if data[price].
        const bv = parseFloat(item.bv);
        const sv = parseFloat(item.sv);
        const v = parseFloat(item.v);
        const deltaValue = parseFloat(delta(item));
        const absDeltaValue = Math.abs(deltaValue);
        const delimeter = absDeltaValue >= 1000 ? absDeltaValue >= 1000000 ? 1000000 : 1000 : 1;
        const deltaText = `${Math.round(deltaValue / delimeter)}${delimeter === 1000000 ? 'm' : delimeter === 1000 ? 'k' : ''}`;
        const buyValueText = `${Math.round(bv / delimeter)}${delimeter === 1000000 ? 'm' : delimeter === 1000 ? 'k' : ''}`;
        const sellValueText = `${Math.round(sv / delimeter)}${delimeter === 1000000 ? 'm' : delimeter === 1000 ? 'k' : ''}`;
        const text = `${deltaText} (${buyValueText}x${sellValueText})`;
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
        i++;
      }
      return result;
    }
  }
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

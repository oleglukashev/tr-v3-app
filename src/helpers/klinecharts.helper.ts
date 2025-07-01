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
  calc: (dataList) => {
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
          width: 57,
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
      for (const item of sortedData) {
        // if data[price].
        const bv = parseFloat(item.bv);
        const sv = parseFloat(item.sv);
        const v = parseFloat(item.v);
        const deltaVale = parseFloat(delta(item));
        const delimeter = Math.abs(deltaVale) >= 1000 ? Math.abs(deltaVale) >= 1000000 ? 1000000 : 1000 : 1;
        const text = `${Math.round(deltaVale / delimeter)}${delimeter === 1000000 ? 'm' : delimeter === 1000 ? 'k' : ''}`;
        result.push({
          type: 'rect',
          attrs: {
            x: coordinates[0].x - 17,
            y: coordinates[0].y + (i * clusterLevelHeight),
            width: 55,
            height: clusterLevelHeight,
          },
          styles: {
            style: 'stroke_fill',
            color: parseFloat(item.bv) > parseFloat(item.sv) ? '#009688' : '#f44336',
            backgroundColor: parseFloat(item.bv) > parseFloat(item) ? '#009688' : '#f44336',
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
            width: 55,
            height: clusterLevelHeight - 1,
            baseline: 'top',
          },
          styles: {
            backgroundColor: 'transparent',
            color: poc.v === item.v ? '#000' : '#fff',
            size: 10,
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
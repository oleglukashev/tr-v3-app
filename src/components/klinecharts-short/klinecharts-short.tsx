// import {
//   type CustomFigureDrawResult,
//   type DrawTool,
//   type DrawToolMouseEventParams,
//   type DrawToolRenderParams
// } from 'klinecharts'

const shortPosition: any = {
  name: 'shortPosition',
  totalStep: 4,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  // createPointFigures: ({ chart, data, coordinates, bounding, overlay, yAxis }: any) => {
  //   console.log('data', data);
  //   const [entryCoord, stopCoord, takeCoord] = coordinates
  //   const [entryData, stopData, takeData] = data
  //
  //   if (!entryCoord || !stopCoord || !takeCoord) return []
  //
  //   const risk = Math.abs(entryData.value - stopData.value)
  //   const reward = Math.abs(takeData.value - entryData.value)
  //   const rrRatio = reward / risk

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
      const startX = coordinates?.[0]?.x;
      const endX = coordinates?.[2]?.x;
      const startTakeY = coordinates?.[0]?.y;
      const endTakeY = coordinates?.[1]?.y;
      const startStopY = coordinates?.[1]?.y;
      const endStopY = coordinates?.[2]?.y;

      if (
        coordinates.length > 2 &&
        typeof points[0].value === 'number' &&
        Number.isFinite(points[0].value) &&
        typeof points[1].value === 'number' &&
        Number.isFinite(points[1].value)
      ) {
        const part1Height = coordinates?.[1]?.y - coordinates?.[0]?.y;
        const part2Height = coordinates?.[2]?.y - coordinates?.[1]?.y;

        lines.push({
          coordinates: [{ x: startX, y: coordinates?.[0]?.y }, { x: endX, y: coordinates?.[0]?.y }],
          styles: {
            style: 'fill',
            color: 'rgba(255, 0, 0, 0.5)',
          }
        });
        lines.push({
          coordinates: [{ x: startX, y: coordinates?.[1]?.y }, { x: endX, y: coordinates?.[1]?.y }],
          styles: {
            style: 'fill',
            color: 'rgba(255, 0, 0, 0.5)',
          }});
        //texts.push({ x: startX, y: coordinates?.[1]?.y, baseline: 'bottom' });

        lines.push({
          coordinates: [{ x: startX, y: coordinates?.[2]?.y }, { x: endX, y: coordinates?.[2]?.y }],
          styles: {
            style: 'fill',
            color: 'rgba(21,181,21,0.3)',
          }
        });
        texts.push({ x: startX, y: coordinates?.[2]?.y, text: `Take: ${(part2Height / part1Height).toFixed(2)}`, baseline: 'bottom' });
        texts.push({ x: startX, y: coordinates?.[0]?.y, text: 'Stop: 1', baseline: 'bottom' });
      }
      return [
        {
          type: 'line',
          attrs: lines
        }, {
          type: 'rect',
          attrs: {
            x: startX,
            y: startTakeY,
            width: endX - startX,
            height: endTakeY - startTakeY,
          },
          styles: {
            style: 'fill',
            color: 'rgba(255, 0, 0, 0.5)',
          }
        }, {
          type: 'rect',
          attrs: {
            x: startX,
            y: startStopY,
            width: endX - startX,
            height: endStopY - startStopY,
          },
          styles: {
            style: 'fill',
            color: 'rgba(21,181,21,0.3)',
          }
        }, {
          type: 'text',
          isCheckEvent: false,
          attrs: texts
        }
      ]
    }
    return []
  },

  // Можно передвинуть точки после рисования
  performMouseMove: true,
}

export default shortPosition
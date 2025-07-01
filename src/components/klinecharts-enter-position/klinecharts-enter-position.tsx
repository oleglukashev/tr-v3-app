export default function enterPosition(callback: any) {
  return {
    name: 'enterPosition',
    //totalStep: 2,
    lock: true,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    onClick: (e) => {
      if (callback) {
        callback(e);
      }
    },
    createPointFigures: ({ chart, coordinates, bounding, overlay, yAxis }: any) => {
      let precision = 0
      if (yAxis?.isInCandle() ?? true) {
        precision = chart.getSymbol()?.pricePrecision ?? 2
      } else {
        const indicators = chart.getIndicators({ paneId: overlay.paneId })
        indicators.forEach(indicator => {
          precision = Math.max(precision, indicator.precision)
        })
      }
      const { value = 0 } = (overlay.points)[0]
      const endX = bounding.width
      return [
        {
          type: 'line',
          attrs: [{
            coordinates: [{x: 0, y: coordinates?.[0]?.y}, {x: endX, y: coordinates?.[0]?.y}],
          }],
          styles: {
            style: 'fill',
            color: '#ff9800',
          },
        }, {
          type: 'text',
          isCheckEvent: false,
          attrs: [{
            x: bounding.width - 250,
            y: coordinates[0].y,
            //text: `×`,
            text: `×  ${chart.getDecimalFold().format(chart.getThousandsSeparator().format(value.toFixed(precision)))}`,
            baseline: 'bottom',
          }],
          styles: {
            style: 'fill',
            size: 13,
            backgroundColor: '#ff9800',
          }
        }
      ]
      return [];
    },
  };
}

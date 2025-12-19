export default function stopPosition(callback: any) {
  return {
    name: 'stopPosition',
    //totalStep: 2,
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
            style: 'dashed',
            color: '#f44336',
          },
        }, {
          type: 'text',
          isCheckEvent: false,
          attrs: [{
            x: coordinates[0].x + 200,
            y: coordinates[0].y,
            text: `Stop ${chart.getDecimalFold().format(chart.getThousandsSeparator().format(value.toFixed(precision)))}`,
            baseline: 'top',
          }],
          styles: {
            style: 'fill',
            backgroundColor: '#f44336',
          }
        }
      ]
      return []
    }
  };
}

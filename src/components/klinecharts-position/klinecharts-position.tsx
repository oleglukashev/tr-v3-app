export default function klinechartPosition(callback: any) {
  return {
    name: 'position',
    totalStep: 2,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
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
      const value = overlay.points[0].value;
      return [
        {
          type: 'line',
          ignoreEvent: true,
          styles: {
            style: 'fill',
            color: '#ff9e22',
          },
          attrs: { coordinates: [coordinates[0], { x: bounding.width, y: coordinates[0].y }] }
        },
        {
          type: 'text',
          ignoreEvent: true,
          styles: {
            style: 'fill',
            size: 13,
            color: '#fff',
            backgroundColor: '#ff9e22',
          },
          attrs: {
            x: coordinates[0].x + 200,
            y: coordinates[0].y,
            text: chart.getDecimalFold().format(chart.getThousandsSeparator().format(`Enter price: ${value.toFixed(precision)}`)),
            baseline: 'bottom'
          }
        }
      ]
    }
  };
}

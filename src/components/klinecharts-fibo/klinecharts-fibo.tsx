
const fibonacciLine2: any = {
  name: 'fibonacciLine2',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
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
      // Mirror klinecharts' built-in `fibonacciSegment`: each fib level
      // is drawn only between the two anchor X-coordinates instead of
      // spanning the entire chart width.
      const x0 = coordinates[0].x
      const x1 = coordinates[1]?.x ?? coordinates[0].x
      const startX = Math.min(x0, x1)
      const endX = Math.max(x0, x1)
      if (coordinates.length > 1 && typeof points[0].value === 'number' && Number.isFinite(points[0].value) && typeof points[1].value === 'number' && Number.isFinite(points[1].value)) {
        const percents = [1.618, 1.1, 1, 0.786, 0.618, 0.5, 0.382, 0.236, 0]
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
          attrs: lines,
          styles: { size: 2 },
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

export default fibonacciLine2

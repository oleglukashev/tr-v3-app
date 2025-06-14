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
      const startX = 0
      const endX = bounding.width
      if (coordinates.length > 1 && typeof points[0].value === 'number' && Number.isFinite(points[0].value) && typeof points[1].value === 'number' && Number.isFinite(points[1].value)) {
        const percents = [2.414, 1.618, 1, 0.786, 0.618, 0.5, 0.382, 0.236, 0, -0.18, -0.27, -0.618]
        const yDif = coordinates[0].y - coordinates[1].y
        const valueDif = points[0].value - points[1].value
        percents.forEach(percent => {
          const y = coordinates[1].y + yDif * percent
          const value = chart.getDecimalFold().format(chart.getThousandsSeparator().format(((points[1].value ?? 0) + valueDif * percent).toFixed(precision)))
          lines.push({ coordinates: [{ x: startX, y }, { x: endX, y }] })
          texts.push({
            x: startX,
            y,
            text: `${value} (${(percent * 100).toFixed(1)}%)`,
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

export default fibonacciLine2

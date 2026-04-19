const longPosition: any = {
  name: 'longPosition',
  totalStep: 4,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ chart, coordinates, overlay }: any) => {
    const points = overlay.points;

    if (coordinates.length === 0) return [];

    const startX = coordinates?.[0]?.x ?? 0;
    const endX = coordinates?.[2]?.x ?? coordinates?.[1]?.x ?? startX;

    if (
      coordinates.length > 2 &&
      typeof points[0]?.value === 'number' && Number.isFinite(points[0]?.value) &&
      typeof points[1]?.value === 'number' && Number.isFinite(points[1]?.value) &&
      typeof points[2]?.value === 'number' && Number.isFinite(points[2]?.value)
    ) {
      // Sort by Y: smaller Y = higher on chart = higher price
      const sorted = [0, 1, 2]
        .map(i => ({ y: coordinates[i].y, value: points[i].value }))
        .sort((a, b) => a.y - b.y);

      // longPosition: take = top (highest price), entry = middle, stop = bottom (lowest price)
      const takeY  = sorted[0].y;
      const enterY = sorted[1].y;
      const stopY  = sorted[2].y;

      const takeZoneH = enterY - takeY;
      const stopZoneH = stopY  - enterY;
      const rrRatio   = stopZoneH > 0 ? (takeZoneH / stopZoneH).toFixed(2) : '∞';

      return [
        {
          type: 'line',
          attrs: [
            { coordinates: [{ x: startX, y: takeY  }, { x: endX, y: takeY  }], styles: { style: 'fill', color: 'rgba(21,181,21,0.8)' } },
            { coordinates: [{ x: startX, y: enterY }, { x: endX, y: enterY }], styles: { style: 'fill', color: 'rgba(21,181,21,0.8)' } },
            { coordinates: [{ x: startX, y: stopY  }, { x: endX, y: stopY  }], styles: { style: 'fill', color: 'rgba(255,0,0,0.8)'   } },
          ],
        },
        {
          type: 'rect',
          attrs: { x: startX, y: takeY, width: endX - startX, height: takeZoneH },
          styles: { style: 'fill', color: 'rgba(21,181,21,0.15)' },
        },
        {
          type: 'rect',
          attrs: { x: startX, y: enterY, width: endX - startX, height: stopZoneH },
          styles: { style: 'fill', color: 'rgba(255,0,0,0.15)' },
        },
        {
          type: 'text',
          isCheckEvent: false,
          attrs: [
            { x: startX, y: takeY,  text: `Take: ${rrRatio}`, baseline: 'bottom' },
            { x: startX, y: stopY,  text: 'Stop: 1',          baseline: 'bottom' },
          ],
        },
      ];
    }

    return [];
  },
  performMouseMove: true,
}

export default longPosition

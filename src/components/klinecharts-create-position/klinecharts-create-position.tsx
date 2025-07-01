export default function createPosition(callback: any) {
  return {
    name: 'createPosition',
    //totalStep: 2,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    onClick: (e) => {
      if (callback) {
        callback(e);
      }
    },
    createPointFigures: ({ coordinates, bounding }: any) => {
      if (coordinates.length > 0) {
        return [
          {
            type: 'text',
            isCheckEvent: false,
            attrs: [{
              x: bounding.width - 150,
              y: coordinates[0].y,
              text: `⬆`,
              baseline: 'bottom',
            }],
            styles: {
              style: 'fill',
              color: '#fff',
              backgroundColor: '#009688',
            }
          }, {
            type: 'text',
            isCheckEvent: false,
            attrs: [{
              x: bounding.width - 150,
              y: coordinates[0].y,
              text: `⬇`,
              baseline: 'top',
            }],
            styles: {
              style: 'fill',
              color: '#fff',
              backgroundColor: '#f44336',
            }
          }
        ]
      }
      return []
    }
  };
}

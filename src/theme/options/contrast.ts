import { palette } from '../palette';
import { customShadows } from '../custom-shadows';

export function contrast(contrastBold: boolean) {
  const theme = {
    ...(contrastBold && {
        palette: {
          background: {
            default: palette().grey[100],
          },
        },
      }),
  };

  const components = {
    ...(contrastBold && {
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: customShadows().z4,
          },
        },
      },
    }),
  };

  return {
    theme,
    components,
  };
}

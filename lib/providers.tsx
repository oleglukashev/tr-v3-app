'use client'

import { Provider } from 'react-redux'
import { reduxStore } from './redux/store';
import SnackbarProvider from 'src/components/snackbar/snackbar-provider';
import { createTheme, ThemeProvider as MuiThemeProvider, ThemeOptions } from '@mui/material/styles';
import {useMemo} from "react";
import { palette } from 'src/theme/palette';
import { shadows } from 'src/theme/shadows';
import { typography } from '@/src/theme/typography';
import { customShadows } from '@/src/theme/custom-shadows';
import merge from "lodash/merge";
import {componentsOverrides} from "@/src/theme/overrides";

export const Providers = (props: React.PropsWithChildren) => {
  const baseOption = useMemo(
    () => ({
      palette: palette(),
      shadows: shadows(),
      customShadows: customShadows(),
      typography,
      shape: { borderRadius: 8 },
    }),
    []
  );

  const memoizedValue = useMemo(
    () =>
      merge(
        // Base
        baseOption,
        // Dark mode: remove if not in use
        //darkModeOption,
        // Presets: remove if not in use
        //presetsOption,
        // Contrast: remove if not in use
        //contrastOption.theme
      ),
    [baseOption]
  );

  const theme = createTheme(memoizedValue as ThemeOptions);

  theme.components = componentsOverrides(theme);

  return (
    <Provider store={reduxStore}>
      <MuiThemeProvider theme={theme}>
        <SnackbarProvider>
          {props.children}
        </SnackbarProvider>
      </MuiThemeProvider>
    </Provider>
  )
}

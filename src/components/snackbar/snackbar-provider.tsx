'use client';

import { useRef } from 'react';
import { SnackbarProvider as NotistackProvider, closeSnackbar } from 'notistack';
import IconButton from '@mui/material/IconButton';
import { StyledIcon, StyledNotistack } from './styles';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import CloseIcon from '@mui/icons-material/Close';

type Props = {
  children: React.ReactNode;
};

export default function SnackbarProvider({ children }: Props) {
  const notistackRef = useRef<any>(null);

  return (
    <NotistackProvider
      ref={notistackRef}
      maxSnack={5}
      preventDuplicate
      autoHideDuration={3000}
      TransitionComponent={undefined}
      variant="success" // Set default variant
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      iconVariant={{
        info: (
          <StyledIcon color="info">
            <InfoOutlineIcon sx={{ width: 24 }} />
          </StyledIcon>
        ),
        success: (
          <StyledIcon color="success">
            <CheckCircleOutlineIcon sx={{ width: 24 }} />
          </StyledIcon>
        ),
        warning: (
          <StyledIcon color="warning">
            <WarningAmberIcon sx={{ width: 24 }} />
          </StyledIcon>
        ),
        error: (
          <StyledIcon color="error">
            <ErrorIcon sx={{ width: 24 }} />
          </StyledIcon>
        ),
      }}
      Components={{
        default: StyledNotistack,
        info: StyledNotistack,
        success: StyledNotistack,
        warning: StyledNotistack,
        error: StyledNotistack,
      }}
      // with close as default
      action={(snackbarId) => (
        <IconButton size="small" onClick={() => closeSnackbar(snackbarId)} sx={{ p: 0.5 }}>
          <CloseIcon sx={{ width: 16 }} />
        </IconButton>
      )}
    >
      {children}
    </NotistackProvider>
  );
}

import { Theme } from '@mui/material/styles';

export default function Link(theme: Theme) {
  return {
    MuiLink: {
      defaultProps: {
        color: theme.palette.text.primary,
        underline: 'underline',
      },
    },
  };
}

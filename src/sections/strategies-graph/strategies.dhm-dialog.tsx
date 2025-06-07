import {Grid, IconButton, Typography} from "@mui/material";
import moment from "moment/moment";
import Box from "@mui/material/Box";
import {StrategiesForm} from "@/src/sections/strategies-graph/strategies.form";
import DeleteIcon from '@mui/icons-material/Delete';
import Chip from '@mui/material/Chip';
import Label from "@/src/components/label";
import {useTheme} from "@mui/material/styles";

export function StrategiesDhmDialog({currentDhm, currentKline, onCreateSubmit, onUpdateSubmit, onRemoveSubmit, pairId, tf, currentPrice}: any) {
  const theme = useTheme();
  return (
    <Box sx={{ p: 2 }}>
      {currentDhm ? (
        <Box sx={{ position: 'relative' }}>
          <Grid container spacing={2} direction='row' justifyContent='space-between' alignItems='center'>
            <Grid size={10} item>
              <Typography variant='h6'>
                Dhm {currentDhm.id} from {moment(currentDhm.createdAt).format('DD.MM.YYYY HH:mm')}
              </Typography>
            </Grid>
            <Grid size={2} item textAlign='end'>
              <IconButton aria-label="delete" onClick={onRemoveSubmit}>
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
          <Grid container spacing={2} direction='row' justifyContent='space-between' alignItems='center'>
            <Grid size={6} item>
              <Box>
                <Typography
                  variant={'caption'}
                  sx={{
                    mr: 1,
                    mb: 3,
                    fontWeight: 'bold',
                    color: theme.palette.text.primary,
                  }}
                >
                  High:
                </Typography>
                <Label color='default'>{currentDhm.data.high}</Label>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant={'caption'}
                  sx={{
                    mr: 1,
                    fontWeight: 'bold',
                    color: theme.palette.text.primary,
                  }}
                >
                  Low:
                </Typography>
                <Label color='default'>{currentDhm.data.low}</Label>
              </Box>
            </Grid>
            <Grid size={6} item textAlign='end'>
              {!!currentPrice && (
                <>
                  <Typography
                    variant={'caption'}
                    sx={{
                      mr: 1,
                      fontWeight: 'bold',
                      color: theme.palette.text.primary,
                    }}
                  >
                    Price:
                  </Typography>
                  <Label color='success'>{currentPrice}</Label>
                </>
              )}
            </Grid>
          </Grid>
          <StrategiesForm
            defaultValues={{
              kline1Ts: currentDhm.data.kline1.ts,
              status: currentDhm.status,
              confirmed: currentDhm.confirmed,
              direction: currentDhm.direction,
              low: currentDhm.data.low,
              high: currentDhm.data.high,
              pairId,
              tf
            }}
            onSubmit={onUpdateSubmit}
          />
        </Box>
      ) : (
        <>
          <Chip sx={{ mb: 1 }} label={currentPrice} color="primary" />
          <Typography variant='h6' sx={{ mb: 2 }}>
            New Dhm
          </Typography>
          <StrategiesForm
            defaultValues={{
              kline1Ts: currentKline ? parseInt(currentKline?.ts) : null,
              status: 'created',
              direction: 'up',
              confirmed: true,
              pairId,
              tf,
            }}
            onSubmit={onCreateSubmit}
          />
        </>
      )}
    </Box>
  )
}

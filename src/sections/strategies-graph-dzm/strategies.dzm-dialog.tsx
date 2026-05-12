import {Grid, Tab, Tabs, Typography} from "@mui/material";
import moment from "moment/moment";
import Box from "@mui/material/Box";
import {StrategiesForm} from "@/src/sections/strategies-graph-dzm/strategies.form";
import Chip from '@mui/material/Chip';
import Label from "@/src/components/label";
import {useTheme} from "@mui/material/styles";
import {useState} from "react";
import loadable from '@loadable/component';
const ReactJson = loadable(() => import('react-json-view'));

export function StrategiesDzmDialog({currentDzm, currentKline, onCreateSubmit, onUpdateSubmit, onRemoveSubmit, pairId, tf, currentPrice, dzmSettings}: any) {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ px: 2, pb: 2 }}>
      {currentDzm ? (
        <Box sx={{ position: 'relative' }}>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
            <Tab label="General" />
            <Tab label="Json" />
          </Tabs>
          {tab === 0 && (
            <>
              <Typography variant='h6'>
                Dzm {currentDzm.id} from {moment(currentDzm.createdAt).format('DD.MM.YYYY HH:mm')}
              </Typography>
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
                    <Label color='default'>{currentDzm.high}</Label>
                    <Typography
                      variant={'caption'}
                      sx={{
                        ml: 1,
                        mb: 3,
                        fontWeight: 'bold',
                        color: theme.palette.text.primary,
                      }}
                    >
                      {((currentDzm.high - currentDzm.low) / currentDzm.low * 100).toFixed(2)}%
                    </Typography>
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
                    <Label color='default'>{currentDzm.low}</Label>
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
                  kline1Ts: currentDzm.kline1.ts,
                  status: currentDzm.status,
                  confirmed: currentDzm.confirmed,
                  direction: currentDzm.direction,
                  pairId,
                  tf,
                  // poi1Ts: currentDzm.poi1?.ts,
                  // poi1High: currentDzm.poi1?.high,
                  // poi1Low: currentDzm.poi1?.low,
                  // poi2Ts: currentDzm.poi2?.ts,
                  // poi2High: currentDzm.poi2?.high,
                  // poi2Low: currentDzm.poi2?.low,
                  // poi3Ts: currentDzm.poi3?.ts,
                  // poi3High: currentDzm.poi3?.high,
                  // poi3Low: currentDzm.poi3?.low
                }}
                dzmSettings={dzmSettings}
                onSubmit={onUpdateSubmit}
              />
            </>
          )}
          {tab === 1 && (
            <Box sx={{ mt: 2 }}>
              <ReactJson src={(currentDzm ?? {}) as object} collapsed={2} />
            </Box>
          )}
        </Box>
      ) : (
        <>
          <Chip sx={{ mb: 1 }} label={currentPrice} color="primary" />
          <Typography variant='h6' sx={{ mb: 2 }}>
            New Dzm
          </Typography>
          <StrategiesForm
            defaultValues={{
              kline1Ts: currentKline ? parseInt(currentKline?.timestamp) : null,
              status: 'created',
              direction: 'up',
              confirmed: true,
              pairId,
              tf,
            }}
            dzmSettings={dzmSettings}
            onSubmit={onCreateSubmit}
          />
        </>
      )}
    </Box>
  )
}

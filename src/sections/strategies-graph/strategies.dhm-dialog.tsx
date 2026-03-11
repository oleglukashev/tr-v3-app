import {Grid, Tab, Tabs, Typography} from "@mui/material";
import moment from "moment/moment";
import Box from "@mui/material/Box";
import {StrategiesForm} from "@/src/sections/strategies-graph/strategies.form";
import Chip from '@mui/material/Chip';
import Label from "@/src/components/label";
import {useTheme} from "@mui/material/styles";
import {useState} from "react";
import loadable from '@loadable/component';
const ReactJson = loadable(() => import('react-json-view'));

export function StrategiesDhmDialog({currentDhm, currentKline, onCreateSubmit, onUpdateSubmit, onRemoveSubmit, pairId, tf, currentPrice, dhmSettings}: any) {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ px: 2, pb: 2 }}>
      {currentDhm ? (
        <Box sx={{ position: 'relative' }}>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
            <Tab label="General" />
            <Tab label="Json" />
          </Tabs>
          {tab === 0 && (
            <>
              <Typography variant='h6'>
                Dhm {currentDhm.id} from {moment(currentDhm.createdAt).format('DD.MM.YYYY HH:mm')}
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
                    <Label color='default'>{currentDhm.high}</Label>
                    <Typography
                      variant={'caption'}
                      sx={{
                        ml: 1,
                        mb: 3,
                        fontWeight: 'bold',
                        color: theme.palette.text.primary,
                      }}
                    >
                      {((currentDhm.high - currentDhm.low) / currentDhm.low * 100).toFixed(2)}%
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
                    <Label color='default'>{currentDhm.low}</Label>
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
                  kline1Ts: currentDhm.kline1.ts,
                  status: currentDhm.status,
                  confirmed: currentDhm.confirmed,
                  direction: currentDhm.direction,
                  pairId,
                  tf,
                  // poi1Ts: currentDhm.poi1?.ts,
                  // poi1High: currentDhm.poi1?.high,
                  // poi1Low: currentDhm.poi1?.low,
                  // poi2Ts: currentDhm.poi2?.ts,
                  // poi2High: currentDhm.poi2?.high,
                  // poi2Low: currentDhm.poi2?.low,
                  // poi3Ts: currentDhm.poi3?.ts,
                  // poi3High: currentDhm.poi3?.high,
                  // poi3Low: currentDhm.poi3?.low
                }}
                dhmSettings={dhmSettings}
                onSubmit={onUpdateSubmit}
              />
            </>
          )}
          {tab === 1 && (
            <Box sx={{ mt: 2 }}>
              <ReactJson src={(currentDhm ?? {}) as object} collapsed={2} />
            </Box>
          )}
        </Box>
      ) : (
        <>
          <Chip sx={{ mb: 1 }} label={currentPrice} color="primary" />
          <Typography variant='h6' sx={{ mb: 2 }}>
            New Dhm
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
            dhmSettings={dhmSettings}
            onSubmit={onCreateSubmit}
          />
        </>
      )}
    </Box>
  )
}

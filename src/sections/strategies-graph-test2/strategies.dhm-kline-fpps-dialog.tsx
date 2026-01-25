import Box from "@mui/material/Box";
import Label from "@/src/components/label";
import {Grid, Typography} from "@mui/material";
import {useMemo} from "react";

export function StrategiesDhmKlineFppsDialog({ fpp }: any) {
  const down = useMemo(() => {
    return fpp.filter(item => item.direction === 'down');
  }, [fpp]);
  const up = useMemo(() => {
    return fpp.filter(item => item.direction === 'up');
  }, [fpp]);
  return (
    <Box sx={{ p: 2 }}>
      <Grid container direction='row' justifyContent='space-between'>
        <Grid item size={6}>
          <Typography variant='body2' sx={{ fontWeight: 'bold' }}>Up:</Typography>
          {up.map((item: any, index: number) => (
            <Box key={index}>
              <Label color='success'>{item.type}</Label>
            </Box>
          ))}
        </Grid>
        <Grid item size={6}>
          <Typography variant='body2' sx={{ fontWeight: 'bold' }}>Down:</Typography>
          {down.map((item: any, index: number) => (
            <Box key={index}>
              <Label color='error'>{item.type}</Label>
            </Box>
          ))}
        </Grid>
      </Grid>
    </Box>
  )
}

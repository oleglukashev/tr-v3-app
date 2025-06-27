'use client'

import {registerOverlay} from "klinecharts";
import {IconButton} from "@mui/material";
import fibonacciLine2 from "@/src/components/klinecharts-fibo/klinecharts-fibo";
import longPosition from "@/src/components/klinecharts-long/klinecharts-long";
import LongIcon from "@/src/components/icons/long-icon";
import ShortIcon from "@/src/components/icons/short-icon";
import shortPosition from "@/src/components/klinecharts-short/klinecharts-short";
import rect from "@/src/components/klinecharts-rect/klinecharts-rect";
import fiboIcon from "@/src/components/icons/fibo"
import priceLineIcon from "@/src/components/icons/price-line"
import horLineIcon from "@/src/components/icons/hor-line"
import rectIcon from "@/src/components/icons/rect"
import Box from "@mui/material/Box";
import {useTheme} from "@mui/material/styles";
import {customRect} from "@/src/helpers/klinecharts.helper";
import RayIcon from "@/src/components/icons/ray";
import ParChannelIcon from "@/src/components/icons/par-channel";

export default function MapTools({ chart }: any) {
  const theme = useTheme();
  if (!chart) {
    return <></>
  }

  registerOverlay(fibonacciLine2);
  registerOverlay(longPosition);
  registerOverlay(shortPosition);
  registerOverlay(customRect);
  registerOverlay(rect);

  return (
    <Box sx={{
      color: theme.palette.grey[600],
      fill: theme.palette.grey[600],
      stroke: theme.palette.grey[600],
      position: "fixed",
      bottom: 0,
      left: '18px',
      zIndex: 1,
    }}>
      {[
        { name: 'longPosition', icon: LongIcon },
        { name: 'shortPosition', icon: ShortIcon },
        { name: 'rect', icon: rectIcon },
        { name: 'priceChannelLine', icon: ParChannelIcon },
        { name: 'fibonacciLine2', icon: fiboIcon },
        { name: 'priceLine', icon: priceLineIcon },
        { name: 'horizontalStraightLine', icon: horLineIcon },
        { name: 'rayLine', icon: RayIcon },
      ].map((item, index) => (
        <IconButton key={item.name} sx={{
          position: 'absolute',
          zIndex: 1,
          left: 0,
          bottom: `${index * 45 + 65}px`,
          background: theme.palette.grey[200],
          '&:hover': {
            background: theme.palette.grey[300],
          }
        }} aria-label="delete" onClick={() => {
          chart.createOverlay(item.name);
        }}>
          <item.icon />
        </IconButton>
      ))}
    </Box>
  )
}

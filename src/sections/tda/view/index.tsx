import Container from "@mui/material/Container";
import {
  Card,
  CardContent,
  CardHeader, Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import {useGetAllQuery} from "@/lib/redux/api/pairApi";
import useWebSocket, { ReadyState } from 'react-use-websocket';
import {useEffect, useState} from "react";
import Box from "@mui/material/Box";
import Label from "src/components/label";

export default function TdaIndexView() {
  const { data: pairs } = useGetAllQuery({});
  const [tdaData, setTdaData] = useState<any>({});
  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    'ws://tr.traken-trade.ru/ws/',
    {
      share: false,
      shouldReconnect: () => true,
    },
  )

  useEffect(() => {
    console.log("Connection state changed")
    if (readyState === ReadyState.OPEN) {
      sendJsonMessage({ type: "tda_subscribe" })
    }
  }, [readyState])

  useEffect(() => {
    console.log(lastJsonMessage);
    setTdaData(lastJsonMessage);
  }, [lastJsonMessage])

  return (
    <Container sx={{ mt: 10 }}>
      <Card>
        <CardHeader title='TDA' />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Id</TableCell>
                <TableCell>Name</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>TDA</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(pairs || []).map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    {tdaData?.data?.[item.symbol] && (
                      <Box>
                        <Grid container direction='row' sx={{ float: 'right' }}>
                          <Grid item sx={{ mr: 0.5 }}>
                            {tdaData?.data?.[item.symbol]?.[1440] === 'rejection' && (
                              <Label color='warning'>1D: REJ</Label>
                            )}
                            {tdaData?.data?.[item.symbol]?.[1440] === 'rejectionBlockUp' && (
                              <Label color='success'>1D: RB</Label>
                            )}
                            {tdaData?.data?.[item.symbol]?.[1440] === 'rejectionBlockDown' && (
                              <Label color='error'>1D: RB</Label>
                            )}
                            {!tdaData?.data?.[item.symbol]?.[1440] && (
                              <Label color='default'>1D: ---</Label>
                            )}
                          </Grid>
                          <Grid item sx={{ mr: 0.5 }}>
                            {tdaData?.data?.[item.symbol]?.[240] === 'rejection' && (
                              <Label color='warning'>4H: REJ</Label>
                            )}
                            {tdaData?.data?.[item.symbol]?.[240] === 'rejectionBlockUp' && (
                              <Label color='success'>4H: RB</Label>
                            )}
                            {tdaData?.data?.[item.symbol]?.[240] === 'rejectionBlockDown' && (
                              <Label color='error'>4H: RB</Label>
                            )}
                            {tdaData?.data?.[item.symbol]?.[240] === 'fractalUp' && (
                              <Label color='success'>4H: FR</Label>
                            )}
                            {tdaData?.data?.[item.symbol]?.[240] === 'fractalDown' && (
                              <Label color='error'>4H: FR</Label>
                            )}
                            {!tdaData?.data?.[item.symbol]?.[240] && (
                              <Label color='default'>4H: ---</Label>
                            )}
                          </Grid>
                          <Grid item sx={{ mr: 0.5 }}>
                            {tdaData?.data?.[item.symbol]?.[60] === 'rejectionBlockUp' && (
                              <Label color='success'>1H: RB</Label>
                            )}
                            {tdaData?.data?.[item.symbol]?.[60] === 'rejectionBlockDown' && (
                              <Label color='error'>1H: RB</Label>
                            )}
                            {tdaData?.data?.[item.symbol]?.[60] === 'fvgUp' && (
                              <Label color='success'>1H: FVG</Label>
                            )}
                            {tdaData?.data?.[item.symbol]?.[60] === 'fvgDown' && (
                              <Label color='error'>1H: FVG</Label>
                            )}
                            {!tdaData?.data?.[item.symbol]?.[60] && (
                              <Label color='default'>1H: ---</Label>
                            )}
                          </Grid>
                          <Grid item sx={{ mr: 0.5 }}>
                            {tdaData?.data?.[item.symbol]?.[15] === 'fvgUp' && (
                              <Label color='success'>15: FVG</Label>
                            )}
                            {tdaData?.data?.[item.symbol]?.[15] === 'fvgDown' && (
                              <Label color='error'>15: FVG</Label>
                            )}
                            {!tdaData?.data?.[item.symbol]?.[15] && (
                              <Label color='default'>15: ---</Label>
                            )}
                          </Grid>
                          <Grid item sx={{ mr: 0.5 }}>
                            {tdaData?.data?.[item.symbol]?.[5] === 'fvgUp' && (
                              <Label color='success'>5: FVG</Label>
                            )}
                            {tdaData?.data?.[item.symbol]?.[5] === 'fvgDown' && (
                              <Label color='error'>5: FVG</Label>
                            )}
                            {!tdaData?.data?.[item.symbol]?.[5] && (
                              <Label color='default'>5: ---</Label>
                            )}
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Container>
  )
}

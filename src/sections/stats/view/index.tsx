import Container from "@mui/material/Container";
import {
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import {useGetAllQuery} from "@/lib/redux/api/statsApi";
import Label from "src/components/label";
import moment from "moment";

export default function StatsIndexView() {
  const { data: stats } = useGetAllQuery({});

  console.log(stats);

  return (
    <Container sx={{ mt: 10 }}>
      <Card>
        <CardHeader title='Prices' />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Id</TableCell>
                <TableCell>Symbol</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(stats?.prices || []).map((item: any) => (
                <TableRow key={item?.id}>
                  <TableCell>{item?.id}</TableCell>
                  <TableCell>
                    {!!item?.symbol && (
                      <Label color='success'>{item.symbol}</Label>
                    )}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    {!!item.price && (
                      <Label color='warning'>{item.price}</Label>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card sx={{ mt: 2 }}>
        <CardHeader title='Last klines' />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Id</TableCell>
                <TableCell>Symbol</TableCell>
                <TableCell>Ts</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>Data</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(stats?.klines || []).map((item: any) => (
                <TableRow key={item?.id}>
                  <TableCell>{item?.id}</TableCell>
                  <TableCell>
                    {!!item?.symbol && (
                      <Label color='success'>{item.symbol}</Label>
                    )}
                  </TableCell>
                  <TableCell>
                    {!!item?.ts && (
                      <Label color='success'>{moment.unix(item.ts / 1000).format('YYYY-MM-DD HH:mm:ss')}</Label>
                    )}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>{!!item && (
                    <>
                      <Label color={item.close < item.open ? 'success' : 'error' }>low: {item.low}</Label><br />
                      <Label color={item.close < item.open ? 'success' : 'error' }>high: {item.high}</Label><br />
                      <Label color={item.close < item.open ? 'success' : 'error' }>open: {item.open}</Label><br />
                      <Label color={item.close < item.open ? 'success' : 'error' }>close: {item.close}</Label>
                    </>
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

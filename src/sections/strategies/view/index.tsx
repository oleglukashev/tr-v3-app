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
  Typography
} from "@mui/material";
import {useGetAllQuery} from "@/lib/redux/api/dhmApi";
import moment from "moment";
import Label from "@/src/components/label";
import Box from "@mui/material/Box";
import {useTheme} from "@mui/material/styles";
import Iconify from "@/src/components/iconify";

export default function StrategiesIndexView({ tf, pairId }: any) {
  const theme = useTheme();
  const { data: dhmSessions } = useGetAllQuery({ pairId, tf, page: 1, limit: 100 });

  return (
    <Container sx={{ mt: 10 }}>
      <Card>
        <CardHeader title='DHM' />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Id</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Low/High</TableCell>
                <TableCell>Buy/Sell</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>Created At</TableCell>
                {/*<TableCell sx={{ textAlign: 'right' }}>Updated At</TableCell>*/}
              </TableRow>
            </TableHead>
            <TableBody>
              {(dhmSessions || []).map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.id}
                    {!!item.confirmed && (
                      <Iconify sx={{ color: theme.palette.success.dark }} icon="eva:checkmark-circle-2-fill" width={24} />
                    )}
                  </TableCell>
                  <TableCell>
                    {item.status === 'finished' ? (
                      <Label color='success'>{item.status}</Label>
                    ) : (item.status === 'created' || item.status === 'waiting' || item.status === 'triggered') ? (
                      <Label color='warning'>{item.status}</Label>
                    ) : (
                      <Label color='error'>{item.status}</Label>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Label sx={{ mb: 0.5 }} color='default'>{item.data.high}</Label>
                    </Box>
                    <Label color='default'>{item.data.low}</Label>
                  </TableCell>
                  <TableCell>
                    {Object.keys(item.data?.orders || {}).map((side: any) => (
                      <Box key={side}>
                        <Typography
                          variant={'caption'}
                          sx={{
                            fontWeight: 'bold',
                            color: theme.palette.text.disabled,
                          }}
                        >
                          {side}:
                        </Typography>
                        {Object.keys(item.data?.orders[side]).map((level: any) => (
                          <Box key={`${side}_${level}`} sx={{ mb: 0.5 }}>
                            <b>{level}</b>: <Label color='success'>{item.data?.orders[side][level]?.id}</Label>
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}><Label color='success'>{moment(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Label></TableCell>
                  {/*<TableCell sx={{ textAlign: 'right' }}>{moment(item.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>*/}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Container>
  )
}

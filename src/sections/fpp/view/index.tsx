import Container from "@mui/material/Container";
import {Card, CardContent, CardHeader, Table, TableBody, TableCell, TableHead, TableRow} from "@mui/material";
import {useGetAllQuery} from "@/lib/redux/api/fppApi";
import moment from "moment";

export default function FppIndexView({ tf, pairId }: any) {
  const { data: fpp } = useGetAllQuery({ pairId, tf, page: 1, limit: 100 });
  console.log(fpp)
  return (
    <Container sx={{ mt: 10 }}>
      <Card>
        <CardHeader title='Fpp' />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Direction</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(fpp || []).map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{moment(Number(item.ts)).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                  <TableCell>{item.direction}</TableCell>
                  <TableCell>{moment(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                  <TableCell>{moment(item.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Container>
  )
}

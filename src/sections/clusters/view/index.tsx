import Container from "@mui/material/Container";
import {Card, CardContent, CardHeader, Table, TableBody, TableCell, TableHead, TableRow} from "@mui/material";
import {useGetAllQuery} from "@/lib/redux/api/clusterApi";
import moment from "moment";
import Label from "@/src/components/label";

export default function ClustersIndexView({ tf, pairId }: any) {
  const { data: clusters } = useGetAllQuery({ pairId, tf, page: 1, limit: 100 });
  return (
    <Container sx={{ mt: 10 }}>
      <Card>
        <CardHeader title='Clusters' />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Volume</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(clusters || []).map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{moment(Number(item.ts)).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                  <TableCell><Label color='success'>{item.v}</Label></TableCell>
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

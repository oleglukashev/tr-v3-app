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
  Typography,
} from "@mui/material";
import {useGetAllQuery} from "@/lib/redux/api/storageApi";

export default function StoragesIndexView() {
  const { data: storages } = useGetAllQuery({});

  const storageItems = Array.isArray(storages)
    ? storages
    : (storages?.items || []);

  return (
    <Container>
      <Card>
        <CardHeader title='Storages' />
        <CardContent>
          {Array.isArray(storageItems) && storageItems.length ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Data</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {storageItems.map((item: any, index: number) => (
                  <TableRow key={item?.id ?? index}>
                    <TableCell>{item?.id ?? index}</TableCell>
                    <TableCell>
                      <Typography component="pre" sx={{ m: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(item, null, 2)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2">No storages found.</Typography>
          )}
          {!Array.isArray(storages) && storages && !storages?.items && (
            <Typography component="pre" sx={{ mt: 2, fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(storages, null, 2)}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

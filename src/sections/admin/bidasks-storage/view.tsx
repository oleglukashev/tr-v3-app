import Container from "@mui/material/Container";
import { Box, Card, CardContent } from "@mui/material";
import ReactJson from "react-json-view";
import { useGetAllQuery as useBidasksGetAllQuery } from "@/lib/redux/api/bidaskStorageApi";

export default function BidasksStorageIndexView() {
  const { data: bidasks } = useBidasksGetAllQuery({});

  return (
    <Container sx={{ pt: 2 }}>
      <Card>
        <CardContent>
          <Box role="tabpanel">
            <ReactJson src={(bidasks ?? {}) as object} collapsed={1} />
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

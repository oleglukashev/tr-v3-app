import Container from "@mui/material/Container";
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tab,
  Tabs,
} from "@mui/material";
import { useGetAllQuery } from "@/lib/redux/api/statsApi";
import { useGetAllQuery as useStorageQuery } from "@/lib/redux/api/storageApi";
import { useGetAllQuery as useBidasksGetAllQuery } from "@/lib/redux/api/bidaskStorageApi";
import { useGetAllQuery as useKlinesGetAllQuery } from "@/lib/redux/api/klinesStorageApi";
import { useGetAllQuery as useOrderbooksGetAllQuery } from "@/lib/redux/api/orderbookStorageApi";
import Label from "src/components/label";
import moment from "moment";
import { useState } from "react";

import loadable from '@loadable/component';
const ReactJson = loadable(() => import('react-json-view'));

type StatsData = {
  prices?: unknown[];
  klines?: unknown[];
  bidasksStorage?: unknown;
  klinesStorage?: unknown;
  pairsStorage?: unknown;
};

export default function StatsIndexView() {
  const [tab, setTab] = useState(0);
  const { data } = useGetAllQuery({});
  const stats = data as StatsData | undefined;
  const { data: bidasks } = useBidasksGetAllQuery({});
  const { data: klines } = useKlinesGetAllQuery({});
  const { data: orderbooks } = useOrderbooksGetAllQuery({});
  const { data: storages } = useStorageQuery({})

  return (
    <Container sx={{ pt: 2 }}>
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Prices" />
          <Tab label="Last klines" />
          <Tab label="Storage" />
          <Tab label="Bidasks storage" />
          <Tab label="Klines storage" />
          <Tab label="Orderbooks storage" />
        </Tabs>
        <CardContent>
          {tab === 0 && (
            <Box role="tabpanel">
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
            </Box>
          )}
          {tab === 1 && (
            <Box role="tabpanel">
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
            </Box>
          )}
          {tab === 2 && (
            <Box role="tabpanel">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Storage</TableCell>
                    <TableCell>Info</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><Label color="primary">bidasksStorage</Label></TableCell>
                    <TableCell>
                      <ReactJson src={(storages?.bidasks ?? {}) as object} collapsed={1} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Label color="primary">klinesStorage</Label></TableCell>
                    <TableCell>
                      <ReactJson src={(storages?.klines ?? {}) as object} collapsed={1} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Label color="primary">pairsStorage</Label></TableCell>
                    <TableCell>
                      <ReactJson src={(storages?.prices ?? {}) as object} collapsed={1} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          )}
          {tab === 3 && (
            <Box role="tabpanel">
              <ReactJson src={(bidasks ?? {}) as object} collapsed={1} />
            </Box>
          )}
          {tab === 4 && (
            <Box role="tabpanel">
              <ReactJson src={(klines ?? {}) as object} collapsed={2} />
            </Box>
          )}
          {tab === 5 && (
            <Box role="tabpanel">
              <ReactJson src={(orderbooks ?? {}) as object} collapsed={1} />
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  )
}

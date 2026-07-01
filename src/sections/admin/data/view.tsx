'use client'

import { useMemo, useState } from "react";
import Container from "@mui/material/Container";
import {
  Box,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import Label from "src/components/label";
import {
  useGetDatasetsQuery,
  useGetDatasetPairsQuery,
  useGetKlineDatasetsQuery,
  useDeleteDatasetMutation,
  useDeleteKlineDatasetMutation,
  type DatasetRow,
  type DatasetPair,
} from "@/lib/redux/api/datasetApi";

const TABS: Array<{ kind: "klines" | "bidasks"; label: string }> = [
  { kind: "klines", label: "Klines" },
  { kind: "bidasks", label: "Bidasks" },
];

function keyLabel(row: DatasetRow): string {
  if (row.keyField === "r") return `R: ${row.key}`;
  if (row.keyField === "tf") return `TF: ${row.key}`;
  return `Interval: ${row.key}`;
}

export default function AdminDataView() {
  const [tab, setTab] = useState(0);
  const [pairFilter, setPairFilter] = useState<string>("all");
  const [tsFilter, setTsFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "general" | "xv">("all");
  const [datasetFilter, setDatasetFilter] = useState<string>("all");
  const [pending, setPending] = useState<DatasetRow | null>(null);
  const { data: bidasksData } = useGetDatasetsQuery();
  const { data: klineData } = useGetKlineDatasetsQuery();
  const { data: pairsData } = useGetDatasetPairsQuery();
  const [deleteDataset, { isLoading: isDeleting }] = useDeleteDatasetMutation();
  const [deleteKlineDataset, { isLoading: isDeletingKline }] = useDeleteKlineDatasetMutation();

  // klines (general) приходят из klines-сервиса, остальное (xv_klines, clusters, xv_clusters) — из bidasks.
  const data = useMemo(
    () => [
      ...(Array.isArray(bidasksData) ? bidasksData : []),
      ...(Array.isArray(klineData) ? klineData : []),
    ],
    [bidasksData, klineData],
  );

  // Merge pair names (from api.traken-trade.ru) onto dataset rows (from bidasks) by pairId.
  const nameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of (Array.isArray(pairsData) ? pairsData : []) as DatasetPair[]) {
      m.set(p.id, p.name || p.symbol || String(p.id));
    }
    return m;
  }, [pairsData]);
  const pairName = (pairId: number) => nameById.get(pairId) ?? String(pairId);

  // pairId -> trading service name (also from api.traken-trade.ru).
  const tsById = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of (Array.isArray(pairsData) ? pairsData : []) as DatasetPair[]) {
      m.set(p.id, p.tradingServiceName || (p.tradingServiceId != null ? `#${p.tradingServiceId}` : "—"));
    }
    return m;
  }, [pairsData]);
  const tsName = (pairId: number) => tsById.get(pairId) ?? "—";

  const kind = TABS[tab].kind;
  // Rows for the active tab, before the type/dataset selectbox filters.
  const tabRows: DatasetRow[] = useMemo(
    () => (Array.isArray(data) ? data.filter((r: DatasetRow) => r.kind === kind) : []),
    [data, kind],
  );

  // Distinct pairs available in this tab, for the Pair selectbox.
  const pairOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of tabRows) {
      seen.set(String(r.pairId), pairName(r.pairId));
    }
    return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [tabRows, nameById]);

  // Distinct trading services available in this tab, for the Trading service selectbox.
  const tsOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of tabRows) {
      seen.set(tsName(r.pairId), tsName(r.pairId));
    }
    return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [tabRows, tsById]);

  // Distinct datasets available in this tab, for the Dataset selectbox.
  const datasetOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of tabRows) {
      seen.set(`${r.keyField}:${r.key}`, keyLabel(r));
    }
    return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [tabRows]);

  const rows: DatasetRow[] = useMemo(
    () =>
      tabRows
        .filter(
          (r) =>
            (pairFilter === "all" || String(r.pairId) === pairFilter) &&
            (tsFilter === "all" || tsName(r.pairId) === tsFilter) &&
            (typeFilter === "all" || r.type === typeFilter) &&
            (datasetFilter === "all" || `${r.keyField}:${r.key}` === datasetFilter),
        )
        .sort(
          (a, b) =>
            pairName(a.pairId).localeCompare(pairName(b.pairId)) ||
            a.type.localeCompare(b.type) ||
            a.key.localeCompare(b.key),
        ),
    [tabRows, pairFilter, tsFilter, typeFilter, datasetFilter, nameById, tsById],
  );

  const onTabChange = (v: number) => {
    setTab(v);
    setPairFilter("all"); // available pairs/datasets differ per tab
    setTsFilter("all");
    setDatasetFilter("all");
  };

  const onConfirmDelete = async () => {
    if (!pending) return;
    try {
      // klines (general) удаляются в klines-сервисе, остальное — в bidasks.
      if (pending.table === "klines") {
        await deleteKlineDataset({ pairId: pending.pairId, key: pending.key }).unwrap();
      } else {
        await deleteDataset({
          table: pending.table,
          pairId: pending.pairId,
          key: pending.key,
        }).unwrap();
      }
    } catch {
      /* surfaced by RTK error state; keep the dialog flow simple */
    }
    setPending(null);
  };

  return (
    <Container sx={{ pt: 2 }}>
      <Card>
        <Tabs value={tab} onChange={(_, v) => onTabChange(v)}>
          {TABS.map((t) => (
            <Tab key={t.kind} label={t.label} />
          ))}
        </Tabs>
        <CardContent>
          <Box role="tabpanel">
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="data-pair-filter-label">Pair</InputLabel>
                <Select
                  labelId="data-pair-filter-label"
                  label="Pair"
                  value={pairFilter}
                  onChange={(e) => setPairFilter(e.target.value as string)}
                >
                  <MenuItem value="all">All pairs</MenuItem>
                  {pairOptions.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="data-ts-filter-label">Trading service</InputLabel>
                <Select
                  labelId="data-ts-filter-label"
                  label="Trading service"
                  value={tsFilter}
                  onChange={(e) => setTsFilter(e.target.value as string)}
                >
                  <MenuItem value="all">All trading services</MenuItem>
                  {tsOptions.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="data-type-filter-label">Type</InputLabel>
                <Select
                  labelId="data-type-filter-label"
                  label="Type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                >
                  <MenuItem value="all">All types</MenuItem>
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="xv">XV</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="data-dataset-filter-label">Dataset</InputLabel>
                <Select
                  labelId="data-dataset-filter-label"
                  label="Dataset"
                  value={datasetFilter}
                  onChange={(e) => setDatasetFilter(e.target.value as string)}
                >
                  <MenuItem value="all">All datasets</MenuItem>
                  {datasetOptions.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Pair</TableCell>
                  <TableCell>Trading service</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Dataset</TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>Rows</TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.table}:${row.pairId}:${row.key}`}>
                    <TableCell>
                      <Label color="success">{pairName(row.pairId)}</Label>
                    </TableCell>
                    <TableCell>
                      <Label color="default">{tsName(row.pairId)}</Label>
                    </TableCell>
                    <TableCell>
                      <Label color={row.type === "xv" ? "primary" : "default"}>
                        {row.type === "xv" ? "XV" : "General"}
                      </Label>
                    </TableCell>
                    <TableCell>
                      <Label color="info">{keyLabel(row)}</Label>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Label color="warning">{row.count.toLocaleString()}</Label>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <IconButton
                        aria-label="delete"
                        size="small"
                        color="error"
                        disabled={isDeleting || isDeletingKline}
                        onClick={() => setPending(row)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ color: 'text.secondary' }}>
                      No datasets.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={!!pending} onClose={() => setPending(null)}>
        <DialogTitle>Delete dataset?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pending && (
              <>
                This permanently deletes <b>{pending.count.toLocaleString()}</b> rows
                from <b>{pending.table}</b> for <b>{pairName(pending.pairId)}</b> ({keyLabel(pending)}).
                This cannot be undone.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)} disabled={isDeleting || isDeletingKline}>
            Cancel
          </Button>
          <Button onClick={onConfirmDelete} color="error" variant="contained" disabled={isDeleting || isDeletingKline}>
            {isDeleting || isDeletingKline ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

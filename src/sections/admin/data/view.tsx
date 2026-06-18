'use client'

import { useMemo, useState } from "react";
import {
  Box,
  Container,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Chip,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  useGetDatasetsQuery,
  useDeleteDatasetMutation,
  type DatasetRow,
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
  const [pending, setPending] = useState<DatasetRow | null>(null);
  const { data, isLoading, isFetching } = useGetDatasetsQuery();
  const [deleteDataset, { isLoading: isDeleting }] = useDeleteDatasetMutation();

  const kind = TABS[tab].kind;
  const rows: DatasetRow[] = useMemo(
    () => (Array.isArray(data) ? data.filter((r: DatasetRow) => r.kind === kind) : []),
    [data, kind],
  );

  const onConfirmDelete = async () => {
    if (!pending) return;
    try {
      await deleteDataset({
        table: pending.table,
        pairId: pending.pairId,
        key: pending.key,
      }).unwrap();
    } catch {
      /* surfaced by RTK error state; keep the dialog flow simple */
    }
    setPending(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Data
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {TABS.map((t) => (
          <Tab key={t.kind} label={t.label} />
        ))}
      </Tabs>

      {(isLoading || isFetching) && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Loading…</Typography>
        </Box>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Pair</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Dataset</TableCell>
            <TableCell align="right">Rows</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.table}:${row.pairId}:${row.key}`} hover>
              <TableCell>{row.pairName}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={row.type === "xv" ? "XV" : "General"}
                  color={row.type === "xv" ? "primary" : "default"}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>{keyLabel(row)}</TableCell>
              <TableCell align="right">{row.count.toLocaleString()}</TableCell>
              <TableCell align="right">
                <IconButton
                  aria-label="delete"
                  size="small"
                  color="error"
                  disabled={isDeleting}
                  onClick={() => setPending(row)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No datasets.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!pending} onClose={() => setPending(null)}>
        <DialogTitle>Delete dataset?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pending && (
              <>
                This permanently deletes <b>{pending.count.toLocaleString()}</b> rows
                from <b>{pending.table}</b> for <b>{pending.pairName}</b> ({keyLabel(pending)}).
                This cannot be undone.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button onClick={onConfirmDelete} color="error" variant="contained" disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

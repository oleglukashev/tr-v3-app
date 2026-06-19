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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import Label from "src/components/label";
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
  const { data } = useGetDatasetsQuery();
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
    <Container sx={{ pt: 2 }}>
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          {TABS.map((t) => (
            <Tab key={t.kind} label={t.label} />
          ))}
        </Tabs>
        <CardContent>
          <Box role="tabpanel">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Pair</TableCell>
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
                      <Label color="success">{row.pairName}</Label>
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
                        disabled={isDeleting}
                        onClick={() => setPending(row)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ color: 'text.secondary' }}>
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

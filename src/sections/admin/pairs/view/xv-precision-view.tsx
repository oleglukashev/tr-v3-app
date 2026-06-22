'use client'

import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useGetAllQuery as useGetPairsQuery } from "@/lib/redux/api/pairApi";
import {
  useGetXvPrecisionsQuery,
  useUpsertXvPrecisionMutation,
  useDeleteXvPrecisionMutation,
} from "@/lib/redux/api/xvClusterPrecisionApi";

export default function XvPrecisionView() {
  const { data: rows } = useGetXvPrecisionsQuery();
  const { data: pairs } = useGetPairsQuery({});
  const [upsert, { isLoading: saving }] = useUpsertXvPrecisionMutation();
  const [remove] = useDeleteXvPrecisionMutation();

  const [pairId, setPairId] = useState<string>("");
  const [r, setR] = useState<string>("");
  const [clusterSize, setClusterSize] = useState<string>("");

  const list: any[] = Array.isArray(rows) ? rows : [];
  const pairList: any[] = Array.isArray(pairs) ? pairs : ((pairs as any)?.items ?? []);

  const onSave = async () => {
    if (!pairId || !r || !clusterSize) return;
    try {
      await upsert({
        pairId: Number(pairId),
        r: String(r).trim(),
        clusterSize: Number(clusterSize),
      }).unwrap();
      setR("");
      setClusterSize("");
    } catch {
      /* surfaced by RTK error state */
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1.5 }}>
          XV precision — размер ценового уровня футпринта по R
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="xvp-pair-label">Пара</InputLabel>
            <Select
              labelId="xvp-pair-label"
              label="Пара"
              value={pairId}
              onChange={(e) => setPairId(e.target.value as string)}
            >
              {pairList.map((p: any) => (
                <MenuItem key={p.id} value={String(p.id)}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="R"
            value={r}
            onChange={(e) => setR(e.target.value)}
            sx={{ width: 140 }}
          />
          <TextField
            size="small"
            label="Размер уровня"
            value={clusterSize}
            onChange={(e) => setClusterSize(e.target.value)}
            sx={{ width: 170 }}
          />
          <Button
            variant="contained"
            onClick={onSave}
            disabled={saving || !pairId || !r || !clusterSize}
          >
            Сохранить
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Пара</TableCell>
              <TableCell>R</TableCell>
              <TableCell>Размер уровня</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((row: any) => (
              <TableRow key={`${row.pairId}:${row.r}`} hover>
                <TableCell>{row.pairName}</TableCell>
                <TableCell>{row.r}</TableCell>
                <TableCell>{row.clusterSize}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    onClick={() => {
                      setPairId(String(row.pairId));
                      setR(String(row.r));
                      setClusterSize(String(row.clusterSize));
                    }}
                  >
                    Изм.
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => remove({ pairId: row.pairId, r: row.r })}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ color: "text.secondary" }}>
                  Нет записей.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

'use client'

import { registerOverlay } from "klinecharts";
import { IconButton } from "@mui/material";
import { useEffect, useRef, useCallback } from "react";
import fibonacciLine2 from "@/src/components/klinecharts-fibo/klinecharts-fibo";
import longPosition from "@/src/components/klinecharts-long/klinecharts-long";
import LongIcon from "@/src/components/icons/long-icon";
import ShortIcon from "@/src/components/icons/short-icon";
import shortPosition from "@/src/components/klinecharts-short/klinecharts-short";
import rect from "@/src/components/klinecharts-rect/klinecharts-rect";
import fiboIcon from "@/src/components/icons/fibo"
import priceLineIcon from "@/src/components/icons/price-line"
import horLineIcon from "@/src/components/icons/hor-line"
import rectIcon from "@/src/components/icons/rect"
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import RayIcon from "@/src/components/icons/ray";
import ParChannelIcon from "@/src/components/icons/par-channel";
import {
  useGetAllQuery,
  useCreateMutation,
  useUpdateMutation,
  useRemoveMutation,
} from "@/lib/redux/api/drawingElementsApi";

const SAVED_DRAWING_TYPES = ['priceLine', 'horizontalStraightLine', 'rayLine'];

const TOOLBAR_ITEMS = [
  { name: 'longPosition', icon: LongIcon },
  { name: 'shortPosition', icon: ShortIcon },
  { name: 'rect', icon: rectIcon },
  { name: 'priceChannelLine', icon: ParChannelIcon },
  { name: 'fibonacciLine2', icon: fiboIcon },
  { name: 'priceLine', icon: priceLineIcon },
  { name: 'horizontalStraightLine', icon: horLineIcon },
  { name: 'rayLine', icon: RayIcon },
];

export default function MapTools({ chart, pairId, tf, showDrawingElements = true }: any) {
  const theme = useTheme();

  const [createMutation] = useCreateMutation();
  const [updateMutation] = useUpdateMutation();
  const [removeMutation] = useRemoveMutation();

  const { data: drawingElements } = useGetAllQuery(
    { pairId, tf },
    { skip: !pairId || !tf || !chart },
  );

  const loadedIdsRef = useRef<Set<string>>(new Set());
  const createMutationRef = useRef(createMutation);
  const updateMutationRef = useRef(updateMutation);
  const removeMutationRef = useRef(removeMutation);

  useEffect(() => { createMutationRef.current = createMutation; }, [createMutation]);
  useEffect(() => { updateMutationRef.current = updateMutation; }, [updateMutation]);
  useEffect(() => { removeMutationRef.current = removeMutation; }, [removeMutation]);

  // Remove drawing overlays when toggle is turned off
  useEffect(() => {
    if (!chart || showDrawingElements) return;
    for (const id of loadedIdsRef.current) {
      chart.removeOverlay({ id });
    }
    loadedIdsRef.current.clear();
  }, [chart, showDrawingElements]);

  // Restore drawing elements loaded from API
  useEffect(() => {
    if (!chart || !showDrawingElements) return;
    const elements = drawingElements as any[];
    if (!Array.isArray(elements) || !elements.length) return;
    for (const element of elements) {
      if (loadedIdsRef.current.has(element.id)) continue;
      loadedIdsRef.current.add(element.id);
      const elementId = element.id;
      chart.createOverlay({
        id: elementId,
        name: element.type,
        points: element.data?.points || [],
        onPressedMoveEnd: (event: any) => {
          updateMutationRef.current({
            id: elementId,
            values: { data: { points: event.overlay.points } },
          });
          return false;
        },
        onRemoved: (event: any) => {
          loadedIdsRef.current.delete(elementId);
          removeMutationRef.current(elementId);
          return false;
        },
      });
    }
  }, [chart, drawingElements, showDrawingElements]);

  const handleDrawingClick = useCallback((name: string) => {
    if (!chart) return;

    if (!SAVED_DRAWING_TYPES.includes(name)) {
      chart.createOverlay(name);
      return;
    }

    chart.createOverlay({
      name,
      onDrawEnd: (event: any) => {
        const { overlay } = event;
        createMutationRef.current({
          type: overlay.name,
          pairId: Number(pairId),
          tf: Number(tf),
          data: { points: overlay.points },
        }).then((result: any) => {
          if (result?.data?.id) {
            loadedIdsRef.current.add(result.data.id);
            chart.overrideOverlay({
              id: overlay.id,
              extendData: { dbId: result.data.id },
            });
          }
        });
        return false;
      },
      onPressedMoveEnd: (event: any) => {
        const dbId = event.overlay.extendData?.dbId;
        if (dbId) {
          updateMutationRef.current({
            id: dbId,
            values: { data: { points: event.overlay.points } },
          });
        }
        return false;
      },
      onRemoved: (event: any) => {
        const dbId = event.overlay.extendData?.dbId;
        if (dbId) {
          loadedIdsRef.current.delete(dbId);
          removeMutationRef.current(dbId);
        }
        return false;
      },
    });
  }, [chart, pairId, tf]);

  if (!chart) {
    return <></>;
  }

  registerOverlay(fibonacciLine2);
  registerOverlay(longPosition);
  registerOverlay(shortPosition);
  registerOverlay(rect);

  return (
    <Box sx={{
      color: theme.palette.grey[600],
      fill: theme.palette.grey[600],
      stroke: theme.palette.grey[600],
      position: "fixed",
      bottom: 0,
      left: '18px',
      zIndex: 1,
    }}>
      {TOOLBAR_ITEMS.map((item, index) => (
        <IconButton key={item.name} sx={{
          position: 'absolute',
          zIndex: 1,
          left: 0,
          bottom: `${index * 45 + 65}px`,
          background: theme.palette.grey[200],
          '&:hover': {
            background: theme.palette.grey[300],
          }
        }} aria-label={item.name} onClick={() => handleDrawingClick(item.name)}>
          <item.icon />
        </IconButton>
      ))}
    </Box>
  )
}

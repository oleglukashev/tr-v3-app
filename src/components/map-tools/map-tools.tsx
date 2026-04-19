'use client'

import { registerOverlay } from "klinecharts";
import { IconButton, Tooltip } from "@mui/material";
import { useEffect, useRef, useCallback, useState } from "react";
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

const SAVED_DRAWING_TYPES = ['priceLine', 'horizontalStraightLine', 'rayLine', 'rect', 'priceChannelLine'];

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

const DrawToolsIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

export default function MapTools({ chart, pairId, tf, showDrawingElements = true }: any) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

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
  const selectedOverlayRef = useRef<any>(null);

  useEffect(() => { createMutationRef.current = createMutation; }, [createMutation]);
  useEffect(() => { updateMutationRef.current = updateMutation; }, [updateMutation]);
  useEffect(() => { removeMutationRef.current = removeMutation; }, [removeMutation]);

  // Delete selected overlay on Backspace / Delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          (active as HTMLElement).isContentEditable)
      ) return;
      if (!chart || !selectedOverlayRef.current) return;
      chart.removeOverlay({ id: selectedOverlayRef.current.id });
      selectedOverlayRef.current = null;
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chart]);

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
        styles: { line: { size: 2 } },
        onSelected: (event: any) => {
          selectedOverlayRef.current = event.overlay;
          return false;
        },
        onDeselected: (event: any) => {
          if (selectedOverlayRef.current?.id === event.overlay.id) {
            selectedOverlayRef.current = null;
          }
          return false;
        },
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
      styles: { line: { size: 2 } },
      onSelected: (event: any) => {
        selectedOverlayRef.current = event.overlay;
        return false;
      },
      onDeselected: (event: any) => {
        if (selectedOverlayRef.current?.id === event.overlay.id) {
          selectedOverlayRef.current = null;
        }
        return false;
      },
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
      {/* Tool buttons — appear above the toggle when open */}
      {TOOLBAR_ITEMS.map((item, index) => (
        <Tooltip key={item.name} title={item.name} placement="right">
          <IconButton
            sx={{
              position: 'absolute',
              zIndex: 10,
              left: 0,
              bottom: `${index * 50 + 115}px`,
              background: theme.palette.grey[200],
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.6) translateY(8px)',
              transition: `opacity 0.18s ease ${index * 0.03}s, transform 0.18s ease ${index * 0.03}s`,
              pointerEvents: isOpen ? 'auto' : 'none',
              '&:hover': {
                background: theme.palette.grey[300],
              },
            }}
            aria-label={item.name}
            onClick={() => {
              handleDrawingClick(item.name);
              setIsOpen(false);
            }}
          >
            <item.icon />
          </IconButton>
        </Tooltip>
      ))}

      {/* Toggle button */}
      <IconButton
        sx={{
          position: 'absolute',
          zIndex: 10,
          left: 0,
          bottom: '65px',
          background: isOpen ? theme.palette.grey[400] : theme.palette.grey[200],
          transition: 'background 0.2s ease, transform 0.2s ease',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          '&:hover': {
            background: theme.palette.grey[300],
          },
        }}
        aria-label="drawing-tools-toggle"
        onClick={() => setIsOpen(prev => !prev)}
      >
        <DrawToolsIcon />
      </IconButton>
    </Box>
  )
}

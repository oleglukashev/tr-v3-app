'use client'

import { registerOverlay } from "klinecharts";
import { IconButton } from "@mui/material";
import { useEffect, useRef, useCallback, useState, type MutableRefObject } from "react";
import fibonacciLine2 from "@/src/components/klinecharts-fibo/klinecharts-fibo";
import longPosition from "@/src/components/klinecharts-long/klinecharts-long";
import LongIcon from "@/src/components/icons/long-icon";
import ShortIcon from "@/src/components/icons/short-icon";
import shortPosition from "@/src/components/klinecharts-short/klinecharts-short";
import rect from "@/src/components/klinecharts-rect/klinecharts-rect";
import FiboIcon from "@/src/components/icons/fibo"
import priceLineIcon from "@/src/components/icons/price-line"
import horLineIcon from "@/src/components/icons/hor-line"
import rectIcon from "@/src/components/icons/rect"
import segmentIcon from "@/src/components/icons/segment"
import WeakMagnetIcon from "@/src/components/icons/weak-magnet"
import StrongMagnetIcon from "@/src/components/icons/strong-magnet"
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import RayIcon from "@/src/components/icons/ray";
import ParChannelIcon from "@/src/components/icons/par-channel";
import ParLineIcon from "@/src/components/icons/par-line";
import EyeIcon from "@/src/components/icons/eye";
import {
  useGetAllQuery,
  useCreateMutation,
  useUpdateMutation,
  useRemoveMutation,
} from "@/lib/redux/api/drawingElementsApi";

/** klinecharts overlay snap mode; applied globally to all drawing overlays. */
type OverlayChartMode = "normal" | "weak_magnet" | "strong_magnet";

function resolveOverlayMode(weakOn: boolean, strongOn: boolean): OverlayChartMode {
  if (strongOn) return "strong_magnet";
  if (weakOn) return "weak_magnet";
  return "normal";
}

const OVERLAY_MAGNET_STORAGE_KEY = "traken:mapToolsOverlayMagnet";

function readMagnetStateFromStorage(): { weak: boolean; strong: boolean } {
  if (typeof window === "undefined") {
    return { weak: false, strong: false };
  }
  try {
    const raw = localStorage.getItem(OVERLAY_MAGNET_STORAGE_KEY);
    if (raw === "weak") return { weak: true, strong: false };
    if (raw === "strong") return { weak: false, strong: true };
  } catch {
    /* ignore */
  }
  return { weak: false, strong: false };
}

const LONG_SHORT_PREF_KEY = "traken:mapToolsLongShortPreference";

function readLongShortPref(): "long" | "short" {
  if (typeof window === "undefined") {
    return "long";
  }
  try {
    const raw = localStorage.getItem(LONG_SHORT_PREF_KEY);
    if (raw === "short") {
      return "short";
    }
  } catch {
    /* ignore */
  }
  return "long";
}

function writeLongShortPref(value: "long" | "short") {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(LONG_SHORT_PREF_KEY, value);
  } catch {
    /* ignore */
  }
}

const PAR_CHANNEL_PREF_KEY = "traken:mapToolsParChannelPreference";

const PAR_AND_CHANNEL_ITEMS = [
  { name: "parallelStraightLine" as const, icon: ParLineIcon },
  { name: "priceChannelLine" as const, icon: ParChannelIcon },
];

type ParChannelToolName = (typeof PAR_AND_CHANNEL_ITEMS)[number]["name"];

function readParChannelPref(): ParChannelToolName {
  if (typeof window === "undefined") {
    return "parallelStraightLine";
  }
  try {
    const raw = localStorage.getItem(PAR_CHANNEL_PREF_KEY);
    if (raw === "priceChannelLine") {
      return "priceChannelLine";
    }
  } catch {
    /* ignore */
  }
  return "parallelStraightLine";
}

function writeParChannelPref(name: ParChannelToolName) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(PAR_CHANNEL_PREF_KEY, name);
  } catch {
    /* ignore */
  }
}

const LINE_SEGMENT_PREF_KEY = "traken:mapToolsLastLineSegmentTool";

const LINE_AND_SEGMENT_ITEMS = [
  { name: "segment" as const, icon: segmentIcon },
  { name: "priceLine" as const, icon: priceLineIcon },
  { name: "horizontalStraightLine" as const, icon: horLineIcon },
  { name: "rayLine" as const, icon: RayIcon },
];

type LineSegmentToolName = (typeof LINE_AND_SEGMENT_ITEMS)[number]["name"];

function readLineSegmentPref(): LineSegmentToolName {
  if (typeof window === "undefined") {
    return "segment";
  }
  try {
    const raw = localStorage.getItem(LINE_SEGMENT_PREF_KEY);
    if (raw && LINE_AND_SEGMENT_ITEMS.some((x) => x.name === raw)) {
      return raw as LineSegmentToolName;
    }
  } catch {
    /* ignore */
  }
  return "segment";
}

function writeLineSegmentPref(name: LineSegmentToolName) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(LINE_SEGMENT_PREF_KEY, name);
  } catch {
    /* ignore */
  }
}

const DRAWINGS_VISIBLE_KEY = "traken:mapToolsDrawingsVisible";

function readDrawingsVisiblePref(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const raw = localStorage.getItem(DRAWINGS_VISIBLE_KEY);
    if (raw === "0" || raw === "false") {
      return false;
    }
  } catch {
    /* ignore */
  }
  return true;
}

function writeDrawingsVisiblePref(visible: boolean) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(DRAWINGS_VISIBLE_KEY, visible ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function writeMagnetStateToStorage(weak: boolean, strong: boolean) {
  if (typeof window === "undefined") return;
  const v = strong ? "strong" : weak ? "weak" : "none";
  try {
    localStorage.setItem(OVERLAY_MAGNET_STORAGE_KEY, v);
  } catch {
    /* ignore */
  }
}

const SAVED_DRAWING_TYPES = [
  'priceLine',
  'horizontalStraightLine',
  'rayLine',
  'segment',
  'parallelStraightLine',
  'rect',
  'priceChannelLine',
  'longPosition',
  'shortPosition',
];

/** Оверлеи, создаваемые MapTools (для show/hide всех фигур рисования) */
const MAP_TOOL_OVERLAY_NAMES = new Set<string>([...SAVED_DRAWING_TYPES, "fibonacciLine2"]);

function applyMapDrawingsVisibility(chart: any, visible: boolean) {
  if (!chart?.getOverlays) {
    return;
  }
  const list = chart.getOverlays({});
  if (!Array.isArray(list)) {
    return;
  }
  for (const o of list) {
    if (o?.id && o?.name && MAP_TOOL_OVERLAY_NAMES.has(o.name)) {
      chart.overrideOverlay({ id: o.id, visible });
    }
  }
}

const TOOLBAR_ITEMS = [
  { name: "rect", icon: rectIcon },
];

/** Снизу вверх: глаз; магнит; лонг/шорт; параллель/канал; линии+segment; фибо; rect — шаг 50px */
const EYE_TOOL_BOTTOM_PX = 115;
const MAGNET_BOTTOM_PX = 165;
const LONG_SHORT_BOTTOM_PX = 215;
const PAR_CHANNEL_GROUP_BOTTOM_PX = 265;
const LINE_GROUP_BOTTOM_PX = 315;
/** Отдельная кнопка fibonacciLine2, строка под сеткой «линии» */
const FIBO_LINE_BOTTOM_PX = 365;
/** rect: сразу над фибо, шаг 50px: (index+1)*50+FIBO (первая 415px) */

/** Кнопки панели: круг 44×44, border-radius 22 */
const TOOLBAR_ICON_SX = {
  width: 44,
  height: 44,
  minWidth: 44,
  minHeight: 44,
  borderRadius: "22px",
  p: 0,
} as const;

/** Resolve which overlay to remove: ref from onSelected, then klinecharts click / in-progress draw. */
function getOverlayToDeleteForKey(chart: any, selectedRef: MutableRefObject<any>): any {
  if (selectedRef.current?.id) {
    return selectedRef.current;
  }
  const store = chart?.getChartStore?.();
  if (!store) {
    return null;
  }
  try {
    const progress = store.getProgressOverlayInfo?.();
    if (progress?.overlay?.id && progress.overlay.isDrawing?.()) {
      return progress.overlay;
    }
  } catch {
    /* ignore */
  }
  try {
    const click = store.getClickOverlayInfo?.();
    if (click?.overlay?.id) {
      return click.overlay;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function normalizeDrawingPoints(points: any): Array<{ timestamp: number | null; value: number }> {
  if (!Array.isArray(points)) {
    return [];
  }
  const normalized: Array<{ timestamp: number | null; value: number }> = [];
  for (const p of points) {
    const value = Number(p?.value);
    if (!Number.isFinite(value)) {
      continue;
    }
    const ts = Number(p?.timestamp);
    normalized.push({
      timestamp: Number.isFinite(ts) ? ts : null,
      value,
    });
  }
  return normalized;
}

/** Точки из API часто read-only (Immer); библиотека мутирует их при перетаскивании. */
function clonePointsForChart(points: any) {
  return normalizeDrawingPoints(points);
}

const DrawToolsIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

export default function MapTools({
  chart,
  pairId,
  tf,
  showDrawingElements = true,
  /** When user is placing or editing a map drawing overlay, parent can ignore candle clicks (e.g. Kline dialog). */
  onDrawingInteractionChange,
}: any) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [magnetSubmenuOpen, setMagnetSubmenuOpen] = useState(false);
  const [longShortSubmenuOpen, setLongShortSubmenuOpen] = useState(false);
  const [parChannelSubmenuOpen, setParChannelSubmenuOpen] = useState(false);
  const [linesSubmenuOpen, setLinesSubmenuOpen] = useState(false);
  const [lastLongOrShort, setLastLongOrShort] = useState<"long" | "short">(readLongShortPref);
  const [lastParOrChannel, setLastParOrChannel] = useState<ParChannelToolName>(
    () => readParChannelPref(),
  );
  const [lastLineSegmentTool, setLastLineSegmentTool] = useState<LineSegmentToolName>(
    () => readLineSegmentPref(),
  );
  const [weakMagnetOn, setWeakMagnetOn] = useState(false);
  const [strongMagnetOn, setStrongMagnetOn] = useState(false);
  const [magnetPrefsReady, setMagnetPrefsReady] = useState(false);
  const magnetMenuRef = useRef<HTMLDivElement | null>(null);
  const longShortMenuRef = useRef<HTMLDivElement | null>(null);
  const parChannelMenuRef = useRef<HTMLDivElement | null>(null);
  const linesMenuRef = useRef<HTMLDivElement | null>(null);
  const [drawingsVisible, setDrawingsVisible] = useState(readDrawingsVisiblePref);
  const drawingsVisibleRef = useRef(drawingsVisible);
  drawingsVisibleRef.current = drawingsVisible;

  const ParChannelMainIcon =
    PAR_AND_CHANNEL_ITEMS.find((x) => x.name === lastParOrChannel)?.icon ?? ParLineIcon;
  const LineSegmentMainIcon =
    LINE_AND_SEGMENT_ITEMS.find((x) => x.name === lastLineSegmentTool)?.icon ?? segmentIcon;
  const overlayMode = resolveOverlayMode(weakMagnetOn, strongMagnetOn);
  const overlayModeRef = useRef(overlayMode);
  overlayModeRef.current = overlayMode;
  const onDrawingInteractionChangeRef = useRef(onDrawingInteractionChange);
  useEffect(() => {
    onDrawingInteractionChangeRef.current = onDrawingInteractionChange;
  }, [onDrawingInteractionChange]);

  useEffect(() => {
    const s = readMagnetStateFromStorage();
    setWeakMagnetOn(s.weak);
    setStrongMagnetOn(s.strong);
    setMagnetPrefsReady(true);
  }, []);

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

  // Delete selected overlay on Backspace / Delete (built-in segment uses click store; ref alone is not always set)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") {
        return;
      }
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable)
      ) {
        return;
      }
      if (!chart) {
        return;
      }
      const overlay = getOverlayToDeleteForKey(chart, selectedOverlayRef);
      if (!overlay?.id) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      chart.removeOverlay({ id: overlay.id });
      if (selectedOverlayRef.current?.id === overlay.id) {
        selectedOverlayRef.current = null;
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [chart]);

  useEffect(() => {
    if (!magnetSubmenuOpen) {
      return;
    }
    const onDocPointer = (e: PointerEvent) => {
      if (magnetMenuRef.current?.contains(e.target as Node)) {
        return;
      }
      setMagnetSubmenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMagnetSubmenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointer, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [magnetSubmenuOpen]);

  useEffect(() => {
    if (!longShortSubmenuOpen) {
      return;
    }
    const onDocPointer = (e: PointerEvent) => {
      if (longShortMenuRef.current?.contains(e.target as Node)) {
        return;
      }
      setLongShortSubmenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLongShortSubmenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointer, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [longShortSubmenuOpen]);

  useEffect(() => {
    if (!linesSubmenuOpen) {
      return;
    }
    const onDocPointer = (e: PointerEvent) => {
      if (linesMenuRef.current?.contains(e.target as Node)) {
        return;
      }
      setLinesSubmenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLinesSubmenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointer, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [linesSubmenuOpen]);

  useEffect(() => {
    if (!parChannelSubmenuOpen) {
      return;
    }
    const onDocPointer = (e: PointerEvent) => {
      if (parChannelMenuRef.current?.contains(e.target as Node)) {
        return;
      }
      setParChannelSubmenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setParChannelSubmenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointer, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [parChannelSubmenuOpen]);

  useEffect(() => {
    if (!isOpen) {
      setMagnetSubmenuOpen(false);
      setLongShortSubmenuOpen(false);
      setParChannelSubmenuOpen(false);
      setLinesSubmenuOpen(false);
    }
  }, [isOpen]);

  // Global overlay snap mode (affects all drawings + new points while editing)
  useEffect(() => {
    if (!chart) return;
    chart.overrideOverlay({ mode: overlayMode });
  }, [chart, overlayMode]);

  // Show/hide всех map-tool оверлеев (segment, линии, rect, long/short, …)
  useEffect(() => {
    if (!chart) {
      return;
    }
    applyMapDrawingsVisibility(chart, drawingsVisible);
  }, [chart, drawingsVisible]);

  useEffect(() => {
    if (!magnetPrefsReady) {
      return;
    }
    writeMagnetStateToStorage(weakMagnetOn, strongMagnetOn);
  }, [weakMagnetOn, strongMagnetOn, magnetPrefsReady]);

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
        points: clonePointsForChart(element.data?.points),
        mode: overlayMode,
        visible: drawingsVisibleRef.current,
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
  }, [chart, drawingElements, showDrawingElements, overlayMode]);

  const handleDrawingClick = useCallback((name: string) => {
    if (!chart) return;
    onDrawingInteractionChangeRef.current?.(true);
    const modeOpt = overlayModeRef.current === "normal" ? {} : { mode: overlayModeRef.current };

    if (!SAVED_DRAWING_TYPES.includes(name)) {
      chart.createOverlay({
        name,
        ...modeOpt,
        visible: drawingsVisibleRef.current,
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
        onDrawEnd: () => {
          onDrawingInteractionChangeRef.current?.(false);
          return false;
        },
        onRemoved: () => {
          onDrawingInteractionChangeRef.current?.(false);
          return false;
        },
      });
      return;
    }

    chart.createOverlay({
      name,
      ...modeOpt,
      visible: drawingsVisibleRef.current,
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
        onDrawingInteractionChangeRef.current?.(false);
        const { overlay } = event;
        const points = normalizeDrawingPoints(overlay.points);
        if (!points.length) {
          return false;
        }
        createMutationRef.current({
          type: overlay.name,
          pairId: Number(pairId),
          tf: Number(tf),
          data: { points },
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
          const points = normalizeDrawingPoints(event.overlay.points);
          if (!points.length) {
            return false;
          }
          updateMutationRef.current({
            id: dbId,
            values: { data: { points } },
          });
        }
        return false;
      },
      onRemoved: (event: any) => {
        onDrawingInteractionChangeRef.current?.(false);
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
    <Box
      sx={{
        color: theme.palette.grey[600],
        position: "fixed",
        bottom: 8,
        left: "18px",
        zIndex: 1300,
        pointerEvents: "auto",
      }}
    >
      {/* Tool buttons — appear above the toggle when open */}
      {TOOLBAR_ITEMS.map((item, index) => (
        <IconButton
            key={item.name}
            sx={{
              ...TOOLBAR_ICON_SX,
              position: "absolute",
              zIndex: 10,
              left: 0,
              bottom: `${(index + 1) * 50 + FIBO_LINE_BOTTOM_PX}px`,
              color: theme.palette.grey[600],
              fill: theme.palette.grey[600],
              background: theme.palette.grey[200],
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? "scale(1) translateY(0)" : "scale(0.6) translateY(8px)",
              transition: `opacity 0.18s ease ${0.12 + index * 0.03}s, transform 0.18s ease ${0.12 + index * 0.03}s`,
              pointerEvents: isOpen ? "auto" : "none",
              "&:hover": {
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
      ))}

      {/* Показать/скрыть фигуры — последняя снизу в веере, над кистью */}
      <Box
        sx={{
          position: "absolute",
          zIndex: 10,
          left: 0,
          bottom: `${EYE_TOOL_BOTTOM_PX}px`,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1) translateY(0)" : "scale(0.6) translateY(8px)",
          transition: "opacity 0.18s ease 0s, transform 0.18s ease 0s",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <IconButton
            sx={{
              ...TOOLBAR_ICON_SX,
              background: theme.palette.grey[200],
              color: drawingsVisible ? theme.palette.grey[700] : theme.palette.text.disabled,
              transition: "color 0.2s ease, background 0.2s ease",
              "&:hover": {
                background: theme.palette.grey[300],
              },
              "& svg": { display: "block" },
            }}
            aria-label={drawingsVisible ? "Скрыть фигуры рисования" : "Показать фигуры рисования"}
            aria-pressed={drawingsVisible}
            onClick={() => {
              setDrawingsVisible((v) => {
                const next = !v;
                writeDrawingsVisiblePref(next);
                return next;
              });
            }}
          >
            <EyeIcon />
          </IconButton>
      </Box>

      {/* Магнит — в том же выпадающем веере, что и инструменты; вправо — слабый/сильный */}
      <Box
        ref={magnetMenuRef}
        sx={{
          position: "absolute",
          zIndex: 10,
          left: 0,
          bottom: `${MAGNET_BOTTOM_PX}px`,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1) translateY(0)" : "scale(0.6) translateY(8px)",
          transition: "opacity 0.18s ease 0.03s, transform 0.18s ease 0.03s",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
            <IconButton
              aria-expanded={magnetSubmenuOpen}
              aria-haspopup="listbox"
              aria-label="Режим магнита, открыть варианты"
              onClick={(e) => {
                e.stopPropagation();
                setLongShortSubmenuOpen(false);
                setParChannelSubmenuOpen(false);
                setLinesSubmenuOpen(false);
                setMagnetSubmenuOpen((prev) => !prev);
              }}
              sx={{
                ...TOOLBAR_ICON_SX,
                background: theme.palette.grey[200],
                color: weakMagnetOn || strongMagnetOn
                  ? theme.palette.text.primary
                  : theme.palette.text.secondary,
                "&:hover": { background: theme.palette.grey[300] },
                "& svg": { display: "block" },
              }}
            >
              {strongMagnetOn ? <StrongMagnetIcon /> : <WeakMagnetIcon />}
            </IconButton>
          <Box
            role="listbox"
            aria-label="Режим магнита"
            sx={{
              position: "absolute",
              left: "100%",
              top: 0,
              marginLeft: 0.5,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 0.5,
              py: 0.5,
              px: 0.5,
              borderRadius: "22px",
              background: theme.palette.grey[200],
              boxShadow: 2,
              opacity: magnetSubmenuOpen ? 1 : 0,
              transform: magnetSubmenuOpen
                ? "scale(1) translateX(0)"
                : "scale(0.92) translateX(-6px)",
              pointerEvents: magnetSubmenuOpen ? "auto" : "none",
              transition: "opacity 0.2s ease, transform 0.2s ease",
              zIndex: 20,
            }}
          >
              <IconButton
                role="option"
                aria-selected={weakMagnetOn}
                aria-label="Слабый магнит"
                onClick={() => {
                  if (weakMagnetOn) {
                    setWeakMagnetOn(false);
                  } else {
                    setWeakMagnetOn(true);
                    setStrongMagnetOn(false);
                  }
                  setMagnetSubmenuOpen(false);
                }}
                sx={{
                  ...TOOLBAR_ICON_SX,
                  color: weakMagnetOn ? theme.palette.text.primary : theme.palette.text.secondary,
                  background: theme.palette.grey[100],
                  "&:hover": { background: theme.palette.grey[300] },
                }}
              >
                <WeakMagnetIcon />
              </IconButton>
              <IconButton
                role="option"
                aria-selected={strongMagnetOn}
                aria-label="Сильный магнит"
                onClick={() => {
                  if (strongMagnetOn) {
                    setStrongMagnetOn(false);
                  } else {
                    setStrongMagnetOn(true);
                    setWeakMagnetOn(false);
                  }
                  setMagnetSubmenuOpen(false);
                }}
                sx={{
                  ...TOOLBAR_ICON_SX,
                  color: strongMagnetOn ? theme.palette.text.primary : theme.palette.text.secondary,
                  background: theme.palette.grey[100],
                  "&:hover": { background: theme.palette.grey[300] },
                }}
              >
                <StrongMagnetIcon />
              </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Лонг / шорт — одна кнопка, вправо long и short; как магнит */}
      <Box
        ref={longShortMenuRef}
        sx={{
          position: "absolute",
          zIndex: 10,
          left: 0,
          bottom: `${LONG_SHORT_BOTTOM_PX}px`,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1) translateY(0)" : "scale(0.6) translateY(8px)",
          transition: "opacity 0.18s ease 0.05s, transform 0.18s ease 0.05s",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
            <IconButton
              aria-expanded={longShortSubmenuOpen}
              aria-haspopup="listbox"
              aria-label="Лонг или шорт, открыть варианты"
              onClick={(e) => {
                e.stopPropagation();
                setMagnetSubmenuOpen(false);
                setParChannelSubmenuOpen(false);
                setLinesSubmenuOpen(false);
                setLongShortSubmenuOpen((prev) => !prev);
              }}
              sx={{
                ...TOOLBAR_ICON_SX,
                color: theme.palette.grey[600],
                fill: theme.palette.grey[600],
                background: theme.palette.grey[200],
                "&:hover": { background: theme.palette.grey[300] },
                "& svg": { display: "block" },
              }}
            >
              {lastLongOrShort === "long" ? <LongIcon /> : <ShortIcon />}
            </IconButton>
          <Box
            role="listbox"
            aria-label="Лонг или шорт"
            sx={{
              position: "absolute",
              left: "100%",
              top: 0,
              marginLeft: 0.5,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 0.5,
              py: 0.5,
              px: 0.5,
              borderRadius: "22px",
              background: theme.palette.grey[200],
              boxShadow: 2,
              opacity: longShortSubmenuOpen ? 1 : 0,
              transform: longShortSubmenuOpen
                ? "scale(1) translateX(0)"
                : "scale(0.92) translateX(-6px)",
              pointerEvents: longShortSubmenuOpen ? "auto" : "none",
              transition: "opacity 0.2s ease, transform 0.2s ease",
              zIndex: 20,
            }}
          >
              <IconButton
                role="option"
                aria-label="longPosition"
                onClick={() => {
                  setLastLongOrShort("long");
                  writeLongShortPref("long");
                  handleDrawingClick("longPosition");
                  setIsOpen(false);
                  setLongShortSubmenuOpen(false);
                }}
                sx={{
                  ...TOOLBAR_ICON_SX,
                  color: theme.palette.grey[600],
                  background: theme.palette.grey[100],
                  "&:hover": { background: theme.palette.grey[300] },
                }}
              >
                <LongIcon />
              </IconButton>
              <IconButton
                role="option"
                aria-label="shortPosition"
                onClick={() => {
                  setLastLongOrShort("short");
                  writeLongShortPref("short");
                  handleDrawingClick("shortPosition");
                  setIsOpen(false);
                  setLongShortSubmenuOpen(false);
                }}
                sx={{
                  ...TOOLBAR_ICON_SX,
                  color: theme.palette.grey[600],
                  background: theme.palette.grey[100],
                  "&:hover": { background: theme.palette.grey[300] },
                }}
              >
                <ShortIcon />
              </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Параллельные линии / ценовой канал — как лонг/шорт */}
      <Box
        ref={parChannelMenuRef}
        sx={{
          position: "absolute",
          zIndex: 10,
          left: 0,
          bottom: `${PAR_CHANNEL_GROUP_BOTTOM_PX}px`,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1) translateY(0)" : "scale(0.6) translateY(8px)",
          transition: "opacity 0.18s ease 0.07s, transform 0.18s ease 0.07s",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
            <IconButton
              aria-expanded={parChannelSubmenuOpen}
              aria-haspopup="listbox"
              aria-label="Параллельные линии или ценовой канал, открыть варианты"
              onClick={(e) => {
                e.stopPropagation();
                setMagnetSubmenuOpen(false);
                setLongShortSubmenuOpen(false);
                setLinesSubmenuOpen(false);
                setParChannelSubmenuOpen((prev) => !prev);
              }}
              sx={{
                ...TOOLBAR_ICON_SX,
                color: theme.palette.grey[600],
                fill: theme.palette.grey[600],
                background: theme.palette.grey[200],
                "&:hover": { background: theme.palette.grey[300] },
                "& svg": { display: "block" },
              }}
            >
              <ParChannelMainIcon />
            </IconButton>
          <Box
            role="listbox"
            aria-label="Параллель или ценовой канал"
            sx={{
              position: "absolute",
              left: "100%",
              top: 0,
              marginLeft: 0.5,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 0.5,
              py: 0.5,
              px: 0.5,
              borderRadius: "22px",
              background: theme.palette.grey[200],
              boxShadow: 2,
              opacity: parChannelSubmenuOpen ? 1 : 0,
              transform: parChannelSubmenuOpen
                ? "scale(1) translateX(0)"
                : "scale(0.92) translateX(-6px)",
              pointerEvents: parChannelSubmenuOpen ? "auto" : "none",
              transition: "opacity 0.2s ease, transform 0.2s ease",
              zIndex: 20,
            }}
          >
              <IconButton
                role="option"
                aria-label="parallelStraightLine"
                onClick={() => {
                  setLastParOrChannel("parallelStraightLine");
                  writeParChannelPref("parallelStraightLine");
                  handleDrawingClick("parallelStraightLine");
                  setIsOpen(false);
                  setParChannelSubmenuOpen(false);
                }}
                sx={{
                  ...TOOLBAR_ICON_SX,
                  color: theme.palette.grey[600],
                  background: theme.palette.grey[100],
                  "&:hover": { background: theme.palette.grey[300] },
                }}
              >
                <ParLineIcon />
              </IconButton>
              <IconButton
                role="option"
                aria-label="priceChannelLine"
                onClick={() => {
                  setLastParOrChannel("priceChannelLine");
                  writeParChannelPref("priceChannelLine");
                  handleDrawingClick("priceChannelLine");
                  setIsOpen(false);
                  setParChannelSubmenuOpen(false);
                }}
                sx={{
                  ...TOOLBAR_ICON_SX,
                  color: theme.palette.grey[600],
                  background: theme.palette.grey[100],
                  "&:hover": { background: theme.palette.grey[300] },
                }}
              >
                <ParChannelIcon />
              </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Линии + segment — сетка 3×2 вправо */}
      <Box
        ref={linesMenuRef}
        sx={{
          position: "absolute",
          zIndex: 10,
          left: 0,
          bottom: `${LINE_GROUP_BOTTOM_PX}px`,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1) translateY(0)" : "scale(0.6) translateY(8px)",
          transition: "opacity 0.18s ease 0.08s, transform 0.18s ease 0.08s",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <Box sx={{ position: "relative", display: "flex", alignItems: "flex-start" }}>
            <IconButton
              aria-expanded={linesSubmenuOpen}
              aria-haspopup="listbox"
              aria-label="Линии и сегмент, открыть варианты"
              onClick={(e) => {
                e.stopPropagation();
                setMagnetSubmenuOpen(false);
                setLongShortSubmenuOpen(false);
                setParChannelSubmenuOpen(false);
                setLinesSubmenuOpen((prev) => !prev);
              }}
              sx={{
                ...TOOLBAR_ICON_SX,
                color: theme.palette.grey[600],
                fill: theme.palette.grey[600],
                background: theme.palette.grey[200],
                "&:hover": { background: theme.palette.grey[300] },
                "& svg": { display: "block" },
              }}
            >
              <LineSegmentMainIcon />
            </IconButton>
          <Box
            role="listbox"
            aria-label="Линии и сегмент"
            sx={{
              position: "absolute",
              left: "100%",
              top: 0,
              marginLeft: 0.5,
              display: "grid",
              gridTemplateColumns: "repeat(3, auto)",
              gap: 0.5,
              py: 0.5,
              px: 0.5,
              borderRadius: "22px",
              background: theme.palette.grey[200],
              boxShadow: 2,
              opacity: linesSubmenuOpen ? 1 : 0,
              transform: linesSubmenuOpen
                ? "scale(1) translateX(0)"
                : "scale(0.92) translateX(-6px)",
              pointerEvents: linesSubmenuOpen ? "auto" : "none",
              transition: "opacity 0.2s ease, transform 0.2s ease",
              zIndex: 20,
            }}
          >
            {LINE_AND_SEGMENT_ITEMS.map((item) => (
              <IconButton
                  key={item.name}
                  role="option"
                  aria-label={item.name}
                  onClick={() => {
                    setLastLineSegmentTool(item.name);
                    writeLineSegmentPref(item.name);
                    handleDrawingClick(item.name);
                    setIsOpen(false);
                    setLinesSubmenuOpen(false);
                  }}
                  sx={{
                    ...TOOLBAR_ICON_SX,
                    color: theme.palette.grey[600],
                    background: theme.palette.grey[100],
                    "&:hover": { background: theme.palette.grey[300] },
                  }}
                >
                  <item.icon />
                </IconButton>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Фибоначчи — отдельная кнопка, строка под «линиями и сегментом» */}
      <Box
        sx={{
          position: "absolute",
          zIndex: 10,
          left: 0,
          bottom: `${FIBO_LINE_BOTTOM_PX}px`,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1) translateY(0)" : "scale(0.6) translateY(8px)",
          transition: "opacity 0.18s ease 0.09s, transform 0.18s ease 0.09s",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <IconButton
            aria-label="fibonacciLine2"
            onClick={() => {
              setMagnetSubmenuOpen(false);
              setLongShortSubmenuOpen(false);
              setParChannelSubmenuOpen(false);
              setLinesSubmenuOpen(false);
              handleDrawingClick("fibonacciLine2");
              setIsOpen(false);
            }}
            sx={{
              ...TOOLBAR_ICON_SX,
              color: theme.palette.grey[600],
              fill: theme.palette.grey[600],
              background: theme.palette.grey[200],
              "&:hover": { background: theme.palette.grey[300] },
              "& svg": { display: "block" },
            }}
          >
            <FiboIcon />
          </IconButton>
      </Box>

      {/* Кнопка-кисть */}
      <Box
        sx={{
          position: "absolute",
          zIndex: 11,
          left: 0,
          bottom: "65px",
        }}
      >
        <IconButton
          sx={{
            ...TOOLBAR_ICON_SX,
            background: isOpen ? theme.palette.grey[400] : theme.palette.grey[200],
            transition: "background 0.2s ease, transform 0.2s ease",
            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
            color: theme.palette.grey[700],
            "&:hover": {
              background: theme.palette.grey[300],
            },
          }}
          aria-label="drawing-tools-toggle"
          onClick={() => {
            setIsOpen((prev) => !prev);
            setMagnetSubmenuOpen(false);
            setLongShortSubmenuOpen(false);
            setParChannelSubmenuOpen(false);
            setLinesSubmenuOpen(false);
          }}
        >
          <DrawToolsIcon />
        </IconButton>
      </Box>
    </Box>
  )
}

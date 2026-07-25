"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  getOrderbookDepthWebSocketUrl,
  subscribeDepthByPairId,
} from "@/src/utils/orderbookDepthWebSocket";

type Level = [number, number];
interface Book {
  bids: Level[];
  asks: Level[];
}

const ASK_COLOR = "#ef5350"; // asks (sell)
const BID_COLOR = "#26a69a"; // bids (buy)
const PANEL_WIDTH = 232;
// Row text only fits when a row is at least this tall; below it, rows render as
// bare heatmap bars so the whole book (e.g. 200+200) fits with no scroll.
const TEXT_MIN_ROW_H = 13;
const MAX_ROW_H = 22; // don't let a shallow book render absurdly tall rows

/** Compact size: 12.3K / 4.5M, small values with a few decimals. */
function fmtSize(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2).replace(/\.?0+$/, "") + "K";
  if (n >= 1) return n.toFixed(2).replace(/\.?0+$/, "");
  return n.toFixed(4).replace(/\.?0+$/, "");
}

/** How many decimal places a price carries (so the whole ladder aligns to a fixed width). */
function decimalsOf(v: number): number {
  if (!Number.isFinite(v)) return 0;
  const s = String(v);
  const i = s.indexOf(".");
  return i < 0 ? 0 : Math.min(8, s.length - i - 1);
}

/**
 * Standalone order-book ("стакан") panel pinned to the right of the XV graph. Classic DOM layout:
 * asks on top (red, highest price first) → thin spread divider → bids below (green, best first).
 * Rows auto-fit the panel height so the ENTIRE book is visible without scrolling; price/size text
 * shows only when rows are tall enough, otherwise rows are heatmap bars sized by volume. Live via
 * the per-pair depth WS (subscribeDepthByPairId → depthSnapshot). Independent of the chart's axis.
 */
export function OrderbookLadder({ pairId }: { pairId: number | string }) {
  const theme = useTheme();
  const [book, setBook] = useState<Book | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [bodyH, setBodyH] = useState(0);

  // One WS per pair: (re)subscribe when the pair changes, reconnect on drop.
  useEffect(() => {
    if (!pairId) return;
    const wsUrl = getOrderbookDepthWebSocketUrl();
    let socket: WebSocket | null = null;
    let cancelled = false;
    let reconnectTimer: number | undefined;
    setBook(null);

    const connect = () => {
      if (cancelled) return;
      try {
        socket = new WebSocket(wsUrl);
      } catch {
        reconnectTimer = window.setTimeout(connect, 3000);
        return;
      }
      socket.onopen = () =>
        socket?.send(JSON.stringify(subscribeDepthByPairId(pairId)));
      socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type !== "depthSnapshot" || !msg.data) return;
          const b = msg.data[String(pairId)] ?? msg.data[Number(pairId)];
          if (b && (b.bids || b.asks)) {
            setBook({ bids: b.bids || [], asks: b.asks || [] });
          }
        } catch {
          /* ignore malformed frame */
        }
      };
      socket.onclose = () => {
        if (!cancelled) reconnectTimer = window.setTimeout(connect, 3000);
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [pairId]);

  // Track the ladder body's pixel height so we can size rows to fit exactly.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setBodyH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const view = useMemo(() => {
    const bids = (book?.bids || []).filter(
      (l) => Number.isFinite(l[0]) && l[1] > 0,
    );
    const asks = (book?.asks || []).filter(
      (l) => Number.isFinite(l[0]) && l[1] > 0,
    );
    const bestBid = bids[0]?.[0];
    const bestAsk = asks[0]?.[0];
    let maxAmt = 0;
    for (const l of bids) if (l[1] > maxAmt) maxAmt = l[1];
    for (const l of asks) if (l[1] > maxAmt) maxAmt = l[1];
    const dec = Math.max(decimalsOf(bestBid ?? 0), decimalsOf(bestAsk ?? 0));
    const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
    const mid = bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : null;
    const spreadPct = spread != null && mid ? (spread / mid) * 100 : null;
    // asks come best-first (ascending); show highest price at the very top.
    const asksTop = asks.slice().reverse();
    return { bids, asksTop, maxAmt, dec, spread, mid, spreadPct };
  }, [book]);

  const total = view.asksTop.length + view.bids.length;
  // Fit every level into the body: rowH = bodyH / total, capped so a shallow book
  // doesn't get huge rows. overflow is hidden, so rounding never causes a scroll.
  const rowH =
    total > 0 && bodyH > 0 ? Math.min(MAX_ROW_H, bodyH / total) : MAX_ROW_H;
  const showText = rowH >= TEXT_MIN_ROW_H;

  return (
    <Box
      sx={{
        width: PANEL_WIDTH,
        flexShrink: 0,
        height: "100vh",
        borderLeft: `1px solid ${theme.palette.divider}`,
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.background.paper,
        fontFamily: "monospace",
        fontSize: 11,
      }}
    >
      <Box
        sx={{
          px: 1,
          py: 0.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>Стакан</Typography>
          {view.mid != null && (
            <Typography sx={{ fontSize: 11, color: theme.palette.text.primary }}>
              {view.mid.toFixed(view.dec)}
            </Typography>
          )}
        </Box>
        <Typography sx={{ fontSize: 10, color: theme.palette.text.secondary }}>
          {view.spread != null
            ? `спред ${view.spread.toFixed(view.dec)}${
                view.spreadPct != null ? ` · ${view.spreadPct.toFixed(3)}%` : ""
              }`
            : total
              ? `${total} ур.`
              : "—"}
        </Typography>
      </Box>

      <Box ref={bodyRef} sx={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {view.asksTop.map((l, i) => (
          <LadderRow
            key={`a${i}`}
            price={l[0]}
            amt={l[1]}
            dec={view.dec}
            maxAmt={view.maxAmt}
            color={ASK_COLOR}
            h={rowH}
            showText={showText}
            boundary={false}
          />
        ))}
        {view.bids.map((l, i) => (
          <LadderRow
            key={`b${i}`}
            price={l[0]}
            amt={l[1]}
            dec={view.dec}
            maxAmt={view.maxAmt}
            color={BID_COLOR}
            h={rowH}
            showText={showText}
            boundary={i === 0}
          />
        ))}

        {!book && (
          <Box sx={{ p: 2, color: theme.palette.text.secondary, textAlign: "center" }}>
            Ожидание данных…
          </Box>
        )}
      </Box>
    </Box>
  );
}

function LadderRow({
  price,
  amt,
  dec,
  maxAmt,
  color,
  h,
  showText,
  boundary,
}: {
  price: number;
  amt: number;
  dec: number;
  maxAmt: number;
  color: string;
  h: number;
  showText: boolean;
  boundary: boolean;
}) {
  const pctW = maxAmt > 0 ? Math.max(1, (amt / maxAmt) * 100) : 0;
  return (
    <Box
      sx={{
        position: "relative",
        height: h,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 1,
        lineHeight: `${h}px`,
        overflow: "hidden",
        // best bid/ask boundary marker (top of the bids block)
        borderTop: boundary ? "1px solid rgba(128,128,128,0.55)" : undefined,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: `${pctW}%`,
          bgcolor: color,
          opacity: showText ? 0.16 : 0.5,
          pointerEvents: "none",
        }}
      />
      {showText && (
        <>
          <span style={{ position: "relative", color, fontVariantNumeric: "tabular-nums" }}>
            {price.toFixed(dec)}
          </span>
          <span style={{ position: "relative", fontVariantNumeric: "tabular-nums" }}>
            {fmtSize(amt)}
          </span>
        </>
      )}
    </Box>
  );
}

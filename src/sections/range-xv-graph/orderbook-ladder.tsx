"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
const ROW_H = 20;

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
 * asks on top (red, highest price first) → spread → bids below (green, best first). Each row shows
 * price + size with a size-proportional background bar. Live via the per-pair depth WS
 * (subscribeDepthByPairId → depthSnapshot). Independent of the chart's price axis.
 */
export function OrderbookLadder({ pairId }: { pairId: number | string }) {
  const theme = useTheme();
  const [book, setBook] = useState<Book | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const spreadRef = useRef<HTMLDivElement | null>(null);
  const centeredForRef = useRef<string | null>(null);

  // One WS per pair: (re)subscribe when the pair changes, reconnect on drop.
  useEffect(() => {
    if (!pairId) return;
    const wsUrl = getOrderbookDepthWebSocketUrl();
    let socket: WebSocket | null = null;
    let cancelled = false;
    let reconnectTimer: number | undefined;
    setBook(null);
    centeredForRef.current = null;

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
    const spread =
      bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
    const mid =
      bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : null;
    const spreadPct = spread != null && mid ? (spread / mid) * 100 : null;
    // asks come best-first (ascending); show highest price at the very top.
    const asksTop = asks.slice().reverse();
    return { bids, asksTop, maxAmt, dec, spread, mid, spreadPct };
  }, [book]);

  // Center the view on the spread the first time data arrives for a pair.
  useEffect(() => {
    if (!book) return;
    const key = String(pairId);
    if (centeredForRef.current === key) return;
    const sc = scrollRef.current;
    const sp = spreadRef.current;
    if (sc && sp && sc.clientHeight > 0) {
      centeredForRef.current = key;
      sc.scrollTop = sp.offsetTop - sc.clientHeight / 2 + sp.clientHeight / 2;
    }
  }, [book, pairId]);

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
        <Typography sx={{ fontSize: 11, fontWeight: 700 }}>Стакан</Typography>
        <Typography sx={{ fontSize: 10, color: theme.palette.text.secondary }}>
          {view.bids.length + view.asksTop.length
            ? `${view.bids.length + view.asksTop.length} ур.`
            : "—"}
        </Typography>
      </Box>

      <Box
        ref={scrollRef}
        sx={{ position: "relative", flex: 1, overflowY: "auto", overflowX: "hidden" }}
      >
        {view.asksTop.map((l, i) => (
          <LadderRow
            key={`a${i}`}
            price={l[0]}
            amt={l[1]}
            dec={view.dec}
            maxAmt={view.maxAmt}
            color={ASK_COLOR}
          />
        ))}

        <Box
          ref={spreadRef}
          sx={{
            height: ROW_H + 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1,
            bgcolor: theme.palette.action.hover,
            borderTop: `1px solid ${theme.palette.divider}`,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <span style={{ color: theme.palette.text.secondary }}>
            {view.mid != null ? view.mid.toFixed(view.dec) : "—"}
          </span>
          <span style={{ color: theme.palette.text.disabled }}>
            {view.spread != null
              ? `${view.spread.toFixed(view.dec)}${
                  view.spreadPct != null
                    ? " · " + view.spreadPct.toFixed(3) + "%"
                    : ""
                }`
              : ""}
          </span>
        </Box>

        {view.bids.map((l, i) => (
          <LadderRow
            key={`b${i}`}
            price={l[0]}
            amt={l[1]}
            dec={view.dec}
            maxAmt={view.maxAmt}
            color={BID_COLOR}
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
}: {
  price: number;
  amt: number;
  dec: number;
  maxAmt: number;
  color: string;
}) {
  const pctW = maxAmt > 0 ? Math.max(1, (amt / maxAmt) * 100) : 0;
  return (
    <Box
      sx={{
        position: "relative",
        height: ROW_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 1,
        lineHeight: `${ROW_H}px`,
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
          opacity: 0.16,
          pointerEvents: "none",
        }}
      />
      <span style={{ position: "relative", color, fontVariantNumeric: "tabular-nums" }}>
        {price.toFixed(dec)}
      </span>
      <span style={{ position: "relative", fontVariantNumeric: "tabular-nums" }}>
        {fmtSize(amt)}
      </span>
    </Box>
  );
}

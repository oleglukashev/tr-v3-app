// Persist klinecharts sub-pane heights (the bottom panes below the main candle
// pane — RSI, VOL, delta, etc.) so a separator drag survives page reloads and
// indicator re-creation. Used on every page that shows a second (sub) chart.
//
// Storage layout: one localStorage entry per (page, pair) holding a JSON map of
// { [paneId]: height }. Save is wired to the chart's `onPaneDrag` action; the
// candle pane fills remaining space and is never stored.

type Chart = any;

const SAVE_DELAY_MS = 300;
const debounceTimers = new WeakMap<Chart, ReturnType<typeof setTimeout>>();

// Build a stable per-page, per-pair storage key.
export function paneHeightsKey(page: string, pairId: string | number): string {
  return `paneHeights:${page}:${pairId}`;
}

// Read the current height of every sub-pane and persist it.
export function savePaneHeights(chart: Chart, storageKey: string): void {
  if (!chart || typeof window === 'undefined') { return; }
  try {
    const opts = chart.getPaneOptions?.();
    const list = Array.isArray(opts) ? opts : [];
    const heights: Record<string, number> = {};
    for (const p of list) {
      if (!p?.id || p.id === 'candle_pane') { continue; }
      const h = Number(chart.getSize?.(p.id)?.height ?? p.height);
      if (Number.isFinite(h) && h > 0) { heights[p.id] = h; }
    }
    localStorage.setItem(storageKey, JSON.stringify(heights));
  } catch {}
}

// Re-apply a saved height to a sub-pane right after it's (re)created.
export function applySavedPaneHeight(chart: Chart, storageKey: string, paneId: string): void {
  if (!chart || typeof window === 'undefined') { return; }
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) { return; }
    const heights = JSON.parse(raw);
    const h = Number(heights?.[paneId]);
    if (Number.isFinite(h) && h > 0) {
      chart.setPaneOptions?.({ id: paneId, height: h });
    }
  } catch {}
}

// Subscribe to separator drags and persist (debounced). Returns an unsubscribe
// function that also clears any pending save.
export function subscribePaneHeights(chart: Chart, storageKey: string): () => void {
  if (!chart?.subscribeAction) { return () => {}; }
  const handler = () => {
    const prev = debounceTimers.get(chart);
    if (prev) { clearTimeout(prev); }
    debounceTimers.set(chart, setTimeout(() => savePaneHeights(chart, storageKey), SAVE_DELAY_MS));
  };
  chart.subscribeAction('onPaneDrag', handler);
  return () => {
    chart.unsubscribeAction?.('onPaneDrag', handler);
    const t = debounceTimers.get(chart);
    if (t) { clearTimeout(t); debounceTimers.delete(chart); }
  };
}

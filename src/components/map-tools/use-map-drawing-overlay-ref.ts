import { useRef, useCallback } from "react";

/**
 * Ref and stable callback for MapTools `onDrawingInteractionChange`. Pair the ref with
 * `onCandleBarClick` checks so map drawing does not open Kline or other bar-click UIs.
 */
export function useMapDrawingOverlayRef() {
  const mapDrawingOverlayActiveRef = useRef(false);
  const onDrawingInteractionChange = useCallback((active: boolean) => {
    mapDrawingOverlayActiveRef.current = active;
  }, []);
  return { mapDrawingOverlayActiveRef, onDrawingInteractionChange };
}

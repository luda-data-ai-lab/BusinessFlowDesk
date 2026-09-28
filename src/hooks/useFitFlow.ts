import { useCallback } from 'react';
import { useReactFlow, useStoreApi } from '@xyflow/react';
import { useFlowStore } from './useFlowStore';
import { flowBounds } from '../utils/swimlanes';

const PADDING = 0.15;
/** Below this zoom node labels stop being legible, so we anchor at the flow's start instead of shrinking further. */
export const MIN_READABLE_ZOOM = 0.75;

/**
 * Fit the viewport to nodes plus swimlanes (when enabled).
 * With `readable` (default) the zoom never drops below MIN_READABLE_ZOOM; large flows are
 * anchored at their start instead. Pass `readable: false` for a true overview fit.
 */
export function useFitFlow() {
  const { fitBounds, setViewport } = useReactFlow();
  const storeApi = useStoreApi();
  return useCallback(
    (duration = 300, readable = true) => {
      const { nodes, swimlanes, layoutDirection } = useFlowStore.getState();
      if (nodes.length === 0) return;
      const bounds = flowBounds(nodes, swimlanes, layoutDirection);
      const { width, height } = storeApi.getState();
      if (!readable || !width || !height) {
        fitBounds(bounds, { padding: PADDING, duration });
        return;
      }
      const fitZoom = Math.min(
        (width * (1 - PADDING * 2)) / bounds.width,
        (height * (1 - PADDING * 2)) / bounds.height,
      );
      if (fitZoom >= MIN_READABLE_ZOOM) {
        fitBounds(bounds, { padding: PADDING, duration });
        return;
      }
      const zoom = MIN_READABLE_ZOOM;
      const pad = 24;
      const isTB = layoutDirection === 'TB';
      const x = isTB ? width / 2 - (bounds.x + bounds.width / 2) * zoom : pad - bounds.x * zoom;
      const y = isTB
        ? pad + 56 - bounds.y * zoom
        : height / 2 - (bounds.y + bounds.height / 2) * zoom;
      setViewport({ x, y, zoom }, { duration });
    },
    [fitBounds, setViewport, storeApi],
  );
}

import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useFlowStore } from './useFlowStore';
import { flowBounds } from '../utils/swimlanes';

/** Fit the viewport to nodes plus swimlanes (when enabled). */
export function useFitFlow() {
  const { fitBounds } = useReactFlow();
  return useCallback(
    (duration = 300) => {
      const { nodes, swimlanes, layoutDirection } = useFlowStore.getState();
      if (nodes.length === 0) return;
      fitBounds(flowBounds(nodes, swimlanes, layoutDirection), { padding: 0.15, duration });
    },
    [fitBounds],
  );
}

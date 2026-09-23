import { MiniMap as RFMiniMap } from '@xyflow/react';
import type { FlowNode } from '../../types/flow';
import { NODE_TYPE_MAP } from '../../constants/nodeTypes';

export function MiniMap() {
  return (
    <RFMiniMap
      pannable
      zoomable
      position="bottom-right"
      className="!m-3 !rounded-xl !border !border-border !bg-white/90 !shadow dark:!border-slate-700 dark:!bg-slate-800/90"
      nodeColor={(n) => {
        const node = n as FlowNode;
        return node.data?.color || NODE_TYPE_MAP[node.data?.nodeType ?? 'task']?.color || '#94A3B8';
      }}
      nodeStrokeWidth={2}
      maskColor="rgba(15, 23, 42, 0.08)"
    />
  );
}

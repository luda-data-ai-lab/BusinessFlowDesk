import { memo } from 'react';
import { InlineLabel, Meta, NodeHandles, type FlowNodeProps } from './shared';
import { nodeColor, selectionRing } from './nodeStyle';

export const TaskNode = memo(function TaskNode({ id, data, selected }: FlowNodeProps) {
  const color = nodeColor(data);
  return (
    <div
      className="group relative min-h-[72px] w-[200px] rounded-xl border-2 bg-white px-3 py-2.5 text-slate-800 shadow-sm transition-shadow dark:bg-slate-800 dark:text-slate-100"
      style={{ borderColor: color, ...selectionRing(selected, color) }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-[10px]"
        style={{ background: color }}
      />
      <NodeHandles />
      <InlineLabel id={id} label={data.label} className="text-sm font-semibold leading-snug" />
      {data.description && (
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
          {data.description}
        </p>
      )}
      <Meta department={data.department} estimatedTime={data.estimatedTime} />
    </div>
  );
});

import { memo } from 'react';
import { InlineLabel, NodeHandles, type FlowNodeProps } from './shared';
import { nodeColor, tint } from './nodeStyle';

export const AnnotationNode = memo(function AnnotationNode({ id, data, selected }: FlowNodeProps) {
  const color = nodeColor(data);
  return (
    <div
      className="group relative min-h-[56px] w-[200px] rounded-lg border-2 border-dashed px-3 py-2 text-slate-600 dark:text-slate-300"
      style={{
        borderColor: color,
        background: tint(color, selected ? 0.18 : 0.08),
      }}
    >
      <NodeHandles />
      <div className="flex items-start gap-1.5">
        <span className="text-sm leading-none">💬</span>
        <InlineLabel
          id={id}
          label={data.label}
          className="flex-1 text-xs italic leading-snug"
          multiline
        />
      </div>
      {data.description && (
        <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
          {data.description}
        </p>
      )}
    </div>
  );
});

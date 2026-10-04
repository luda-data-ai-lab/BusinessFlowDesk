import { memo } from 'react';
import { InlineLabel, Meta, NodeHandles, type FlowNodeProps } from './shared';
import { nodeColor, tint } from './nodeStyle';

const HEX = 'polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%)';

export const SystemNode = memo(function SystemNode({ id, data, selected }: FlowNodeProps) {
  const color = nodeColor(data);
  return (
    <div className="group relative h-[84px] w-[200px]">
      <div
        className="absolute inset-0"
        style={{ clipPath: HEX, background: selected ? color : tint(color, 0.7) }}
      />
      <div className="absolute inset-[3px] bg-white dark:bg-slate-800" style={{ clipPath: HEX }} />
      <NodeHandles />
      <div className="absolute inset-0 flex items-center gap-2 px-6 text-slate-800 dark:text-slate-100">
        <span className="text-xl leading-none" style={{ color }}>
          ⬡
        </span>
        <div className="min-w-0 flex-1">
          <InlineLabel
            id={id}
            label={data.label}
            className="truncate text-sm font-semibold leading-snug"
          />
          {data.description && (
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {data.description}
            </p>
          )}
          <Meta
            department={data.department}
            system={data.system}
            estimatedTime={data.estimatedTime}
          />
        </div>
      </div>
    </div>
  );
});

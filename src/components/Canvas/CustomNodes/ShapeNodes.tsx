import { memo } from 'react';
import { InlineLabel, Meta, NodeHandles, type FlowNodeProps } from './shared';
import { nodeColor, selectionRing, tint } from './nodeStyle';

/** Data / document node: parallelogram. */
export const DataNode = memo(function DataNode({ id, data, selected }: FlowNodeProps) {
  const color = nodeColor(data);
  const shape = 'polygon(10% 0, 100% 0, 90% 100%, 0 100%)';
  return (
    <div className="group relative h-[72px] w-[200px]">
      <div
        className="absolute inset-0"
        style={{ clipPath: shape, background: selected ? color : tint(color, 0.7) }}
      />
      <div
        className="absolute inset-[2px] bg-white dark:bg-slate-800"
        style={{ clipPath: shape }}
      />
      <NodeHandles />
      <div className="absolute inset-0 flex items-center gap-2 px-7 text-slate-800 dark:text-slate-100">
        <span className="text-lg" style={{ color }}>
          ▱
        </span>
        <div className="min-w-0 flex-1">
          <InlineLabel id={id} label={data.label} className="truncate text-sm font-semibold" />
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

/** Timer / wait node: pill with a clock. */
export const TimerNode = memo(function TimerNode({ id, data, selected }: FlowNodeProps) {
  const color = nodeColor(data);
  return (
    <div
      className="group relative flex h-[72px] w-[200px] items-center gap-2 rounded-full border-2 bg-white px-4 text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100"
      style={{ borderColor: color, ...selectionRing(selected, color) }}
    >
      <NodeHandles />
      <span className="text-xl" style={{ color }}>
        ⏱
      </span>
      <div className="min-w-0 flex-1">
        <InlineLabel id={id} label={data.label} className="truncate text-sm font-semibold" />
        <Meta
          department={data.department}
          system={data.system}
          estimatedTime={data.estimatedTime}
        />
      </div>
    </div>
  );
});

/** Parallel gateway: diamond with a "+" like BPMN. */
export const ParallelNode = memo(function ParallelNode({ id, data, selected }: FlowNodeProps) {
  const color = nodeColor(data);
  return (
    <div className="group relative h-[120px] w-[120px]">
      <div
        className="absolute inset-[16px] rotate-45 rounded-md border-2 bg-white dark:bg-slate-800"
        style={{
          borderColor: color,
          boxShadow: selected ? `0 0 0 3px ${tint(color, 0.35)}` : undefined,
        }}
      />
      <NodeHandles />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800 dark:text-slate-100">
        <span className="text-2xl font-bold leading-none" style={{ color }}>
          +
        </span>
        <InlineLabel
          id={id}
          label={data.label}
          className="mt-0.5 max-w-[80px] text-center text-[10px] font-medium leading-tight"
        />
      </div>
    </div>
  );
});

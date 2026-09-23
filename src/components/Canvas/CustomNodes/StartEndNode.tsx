import { memo } from 'react';
import { InlineLabel, NodeHandles, type FlowNodeProps } from './shared';
import { nodeColor, selectionRing, tint } from './nodeStyle';

export const StartEndNode = memo(function StartEndNode({ id, data, selected }: FlowNodeProps) {
  const color = nodeColor(data);
  const isEnd = data.nodeType === 'end';
  return (
    <div
      className="group relative flex h-[88px] w-[88px] items-center justify-center rounded-full border-[3px] text-center shadow-sm"
      style={{
        borderColor: color,
        background: isEnd
          ? `radial-gradient(circle, white 40%, ${tint(color, 0.25)} 42%, white 48%, ${tint(color, 0.9)} 50%)`
          : tint(color, 0.9),
        ...(isEnd ? { boxShadow: `inset 0 0 0 5px white, inset 0 0 0 8px ${color}` } : {}),
        ...selectionRing(selected, color),
      }}
    >
      <NodeHandles />
      <InlineLabel
        id={id}
        label={data.label}
        className={`px-2 text-xs font-bold leading-tight ${isEnd ? 'text-slate-800' : 'text-white'}`}
      />
    </div>
  );
});

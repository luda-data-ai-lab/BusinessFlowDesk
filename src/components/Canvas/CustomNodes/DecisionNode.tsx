import { memo } from 'react';
import { InlineLabel, NodeHandles, type FlowNodeProps } from './shared';
import { nodeColor, tint } from './nodeStyle';
import { useT } from '../../../i18n';

export const DecisionNode = memo(function DecisionNode({ id, data, selected }: FlowNodeProps) {
  const t = useT();
  const color = nodeColor(data);
  return (
    <div className="group relative h-[150px] w-[150px]">
      <div
        className="absolute inset-[18px] rotate-45 rounded-lg border-2 bg-white shadow-sm dark:bg-slate-800"
        style={{
          borderColor: color,
          background: `linear-gradient(135deg, ${tint(color, 0.18)}, transparent 60%)`,
          boxShadow: selected ? `0 0 0 3px ${tint(color, 0.35)}` : undefined,
        }}
      />
      <NodeHandles decision />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <InlineLabel
          id={id}
          label={data.label}
          className="text-[12px] font-semibold leading-snug text-slate-800 dark:text-slate-100"
        />
        {data.department && (
          <span className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            {data.department}
          </span>
        )}
      </div>
      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-green-600 dark:text-green-400">
        {t('yes')}
      </span>
      <span className="absolute -right-6 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-red-500 dark:text-red-400">
        {t('no')}
      </span>
    </div>
  );
});

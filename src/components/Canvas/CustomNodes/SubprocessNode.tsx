import { memo } from 'react';
import { useFlowStore } from '../../../hooks/useFlowStore';
import { useT } from '../../../i18n';
import { InlineLabel, Meta, NodeHandles, type FlowNodeProps } from './shared';
import { nodeColor, selectionRing, tint } from './nodeStyle';

export const SubprocessNode = memo(function SubprocessNode({ id, data, selected }: FlowNodeProps) {
  const color = nodeColor(data);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const t = useT();
  const collapsed = Boolean(data.collapsed);
  return (
    <div
      className="group relative w-[200px] rounded-xl border-2 bg-white p-[3px] shadow-sm dark:bg-slate-800"
      style={{ borderColor: color, ...selectionRing(selected, color) }}
    >
      <NodeHandles />
      <div
        className="rounded-lg border px-3 py-2 text-slate-800 dark:text-slate-100"
        style={{ borderColor: tint(color, 0.6), background: tint(color, 0.08) }}
      >
        <div className="flex items-start gap-1.5">
          <span className="mt-0.5 text-xs" style={{ color }}>
            ⊞
          </span>
          <InlineLabel
            id={id}
            label={data.label}
            className="flex-1 text-sm font-semibold leading-snug"
          />
          <button
            type="button"
            className="nodrag nopan -mr-1 rounded px-1 text-[10px] text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
            onClick={(e) => {
              e.stopPropagation();
              updateNodeData(id, { collapsed: !collapsed });
            }}
            title={collapsed ? t('expand') : t('collapse')}
            aria-label={collapsed ? t('expand') : t('collapse')}
          >
            {collapsed ? '▸' : '▾'}
          </button>
        </div>
        {!collapsed && (
          <>
            {data.description && (
              <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                {data.description}
              </p>
            )}
            <Meta department={data.department} estimatedTime={data.estimatedTime} />
          </>
        )}
      </div>
    </div>
  );
});

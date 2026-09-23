import { memo, useState, type KeyboardEvent } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { FlowEdge } from '../../../types/flow';
import { useFlowStore } from '../../../hooks/useFlowStore';
import { useT } from '../../../i18n';

export const ConditionalEdge = memo(function ConditionalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  selected,
  markerEnd,
  data,
  sourceHandleId,
}: EdgeProps<FlowEdge>) {
  const updateEdge = useFlowStore((s) => s.updateEdge);
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(typeof label === 'string' ? label : '');

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  const tone =
    sourceHandleId === 'yes'
      ? '#16A34A'
      : sourceHandleId === 'no'
        ? '#DC2626'
        : selected
          ? '#2563EB'
          : '#64748B';
  const dashed = data?.style === 'dashed';

  const commit = () => {
    updateEdge(id, { label: draft.trim() });
    setEditing(false);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') {
      setDraft(typeof label === 'string' ? label : '');
      setEditing(false);
    }
  };

  const text = typeof label === 'string' ? label : '';

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: tone,
          strokeWidth: selected ? 2.5 : 1.8,
          strokeDasharray: dashed ? '6 4' : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={onKeyDown}
              placeholder={t('editEdgeLabel')}
              className="w-28 rounded border border-primary bg-white px-1.5 py-0.5 text-[11px] text-slate-800 shadow outline-none dark:bg-slate-900 dark:text-slate-100"
            />
          ) : text || selected ? (
            <button
              type="button"
              onDoubleClick={() => {
                setDraft(text);
                setEditing(true);
              }}
              onClick={(e) => {
                if (!text) {
                  e.stopPropagation();
                  setEditing(true);
                }
              }}
              className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium shadow-sm ${
                text
                  ? 'border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
                  : 'border-dashed border-primary/60 bg-white/80 text-primary dark:bg-slate-800/80'
              }`}
              style={text ? { borderColor: tone, color: tone } : undefined}
              title="더블클릭하여 조건 편집 / Double-click to edit"
            >
              {text || `+ ${t('edgeLabel')}`}
            </button>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

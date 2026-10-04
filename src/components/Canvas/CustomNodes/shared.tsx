import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { FlowNode } from '../../../types/flow';
import { useFlowStore } from '../../../hooks/useFlowStore';
import { findSystem } from '../../../services/systemCatalog';

export type FlowNodeProps = NodeProps<FlowNode>;

const HANDLE_CLASS =
  '!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400 dark:!border-slate-800 dark:!bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity';

interface HandlesProps {
  /** Decision nodes label their source handles as yes/no. */
  decision?: boolean;
}

/** Four connection points: top/left as targets, bottom/right as sources. */
export function NodeHandles({ decision = false }: HandlesProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} id="top" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Left} id="left" className={HANDLE_CLASS} />
      <Handle
        type="source"
        position={Position.Bottom}
        id={decision ? 'yes' : 'bottom'}
        className={`${HANDLE_CLASS} ${decision ? '!bg-green-500' : ''}`}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={decision ? 'no' : 'right'}
        className={`${HANDLE_CLASS} ${decision ? '!bg-red-500' : ''}`}
      />
    </>
  );
}

interface InlineLabelProps {
  id: string;
  label: string;
  className?: string;
  style?: CSSProperties;
  multiline?: boolean;
}

/** Double-click to edit the label in place; Enter/blur commits, Escape cancels. */
export function InlineLabel({
  id,
  label,
  className = '',
  style,
  multiline = false,
}: InlineLabelProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(label);
  }, [label, editing]);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== label) updateNodeData(id, { label: next });
    setEditing(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !(multiline && e.shiftKey)) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      setDraft(label);
      setEditing(false);
    }
    e.stopPropagation();
  };

  if (editing) {
    const shared = {
      value: draft,
      onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown,
      className: `nodrag nopan w-full rounded border border-primary bg-white px-1 py-0.5 text-inherit outline-none dark:bg-slate-900 ${className}`,
      style,
    };
    return multiline ? (
      <textarea ref={ref as React.RefObject<HTMLTextAreaElement>} rows={2} {...shared} />
    ) : (
      <input ref={ref as React.RefObject<HTMLInputElement>} {...shared} />
    );
  }

  return (
    <div
      className={`select-none break-words ${className}`}
      style={style}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="더블클릭하여 편집 / Double-click to edit"
    >
      {label}
    </div>
  );
}

export function Meta({
  department,
  system,
  estimatedTime,
}: {
  department?: string;
  system?: string;
  estimatedTime?: string;
}) {
  const color = useFlowStore((s) => findSystem(s.systems, system)?.color);
  if (!department && !system && !estimatedTime) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] leading-none text-slate-500 dark:text-slate-400">
      {department && (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-700 dark:text-slate-200">
          {department}
        </span>
      )}
      {system && (
        <span
          className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-violet-700 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200"
          style={color ? { color, borderColor: `${color}66`, background: `${color}1A` } : undefined}
          title="System"
        >
          🖥 {system}
        </span>
      )}
      {estimatedTime && <span className="inline-flex items-center gap-0.5">⏱ {estimatedTime}</span>}
    </div>
  );
}

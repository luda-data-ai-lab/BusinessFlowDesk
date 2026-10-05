import { useEffect, useState } from 'react';
import { NODE_TYPES, NODE_TYPE_MAP } from '../../constants/nodeTypes';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useI18n, useT } from '../../i18n';
import type { FlowNodeData, NodeType } from '../../types/flow';
import { Button } from '../common/Button';

const inputClass =
  'w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

/** Text field that commits on blur/Enter so every keystroke doesn't spam the undo stack. */
function DebouncedText({
  value,
  onCommit,
  multiline = false,
  placeholder,
  list,
}: {
  value: string;
  onCommit: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  list?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  if (multiline) {
    return (
      <textarea
        className={`${inputClass} min-h-[64px] resize-y`}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />
    );
  }
  return (
    <input
      className={inputClass}
      value={draft}
      placeholder={placeholder}
      list={list}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

function NodeProperties({ id }: { id: string }) {
  const t = useT();
  const language = useI18n((s) => s.language);
  const node = useFlowStore((s) => s.nodes.find((n) => n.id === id));
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const changeNodeType = useFlowStore((s) => s.changeNodeType);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const systems = useFlowStore((s) => s.nodes.map((n) => n.data.system?.trim()).filter(Boolean));
  const catalog = useFlowStore((s) => s.systems);
  const openCatalog = useFlowStore((s) => s.setSystemCatalogOpen);
  const [customFor, setCustomFor] = useState<string | null>(null);
  if (!node) return null;
  const systemOptions = [...new Set(systems)] as string[];
  const registered = catalog.find(
    (s) => s.name.toLowerCase() === (node.data.system?.trim().toLowerCase() ?? ''),
  );
  const customSystem = customFor === id || (!!node.data.system && !registered);
  const data = node.data;
  const color = data.color || NODE_TYPE_MAP[data.nodeType].color;
  const set = (patch: Partial<FlowNodeData>) => updateNodeData(id, patch);

  return (
    <div className="space-y-3">
      <Field label={t('nodeType')}>
        <select
          className={inputClass}
          value={data.nodeType}
          onChange={(e) => changeNodeType(id, e.target.value as NodeType)}
        >
          {NODE_TYPES.map((n) => (
            <option key={n.type} value={n.type}>
              {n.icon} {n.label[language]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('label')}>
        <DebouncedText value={data.label} onCommit={(v) => set({ label: v || data.label })} />
      </Field>
      <Field label={t('description')}>
        <DebouncedText
          value={data.description ?? ''}
          onCommit={(v) => set({ description: v || undefined })}
          multiline
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t('department')}>
          <DebouncedText
            value={data.department ?? ''}
            onCommit={(v) => set({ department: v || undefined })}
          />
        </Field>
        <Field label={t('estimatedTime')}>
          <DebouncedText
            value={data.estimatedTime ?? ''}
            onCommit={(v) => set({ estimatedTime: v || undefined })}
            placeholder="30min"
          />
        </Field>
      </div>
      <Field label={t('system')}>
        {catalog.length > 0 && (
          <select
            className={`${inputClass} mb-1`}
            value={customSystem ? '__custom' : registered ? registered.name : ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '__manage') {
                openCatalog(true);
                return;
              }
              if (v === '__custom') {
                setCustomFor(id);
                return;
              }
              setCustomFor(null);
              set({ system: v || undefined });
            }}
          >
            <option value="">{t('systemNone')}</option>
            {catalog.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
            <option value="__custom">{t('systemCustom')}</option>
            <option value="__manage">⚙ {t('systemCatalog')}…</option>
          </select>
        )}
        {(catalog.length === 0 || customSystem) && (
          <DebouncedText
            value={data.system?.trim() ?? ''}
            onCommit={(v) => set({ system: v || undefined })}
            placeholder={t('systemPlaceholder')}
            list="bfd-system-options"
          />
        )}
        <datalist id="bfd-system-options">
          {systemOptions.map((sys) => (
            <option key={sys} value={sys} />
          ))}
        </datalist>
        {catalog.length === 0 && (
          <button
            type="button"
            onClick={() => openCatalog(true)}
            className="mt-1 text-[11px] text-primary hover:underline"
          >
            + {t('systemRegisterHint')}
          </button>
        )}
      </Field>
      <Field label={t('color')}>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => set({ color: e.target.value })}
            className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5 dark:border-slate-600"
          />
          <div className="flex flex-1 flex-wrap gap-1">
            {['#22C55E', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6', '#06B6D4', '#94A3B8'].map(
              (c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => set({ color: c })}
                  className={`h-5 w-5 rounded-full border-2 ${color.toLowerCase() === c.toLowerCase() ? 'border-slate-800 dark:border-white' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ),
            )}
          </div>
        </div>
      </Field>
      <Button variant="danger" size="sm" className="w-full" onClick={() => deleteNode(id)}>
        🗑 {t('delete')}
      </Button>
    </div>
  );
}

function EdgeProperties({ id }: { id: string }) {
  const t = useT();
  const edge = useFlowStore((s) => s.edges.find((e) => e.id === id));
  const updateEdge = useFlowStore((s) => s.updateEdge);
  const deleteEdge = useFlowStore((s) => s.deleteEdge);
  if (!edge) return null;
  return (
    <div className="space-y-3">
      <Field label={t('edgeLabel')}>
        <DebouncedText
          value={typeof edge.label === 'string' ? edge.label : ''}
          onCommit={(v) => updateEdge(id, { label: v })}
          placeholder={t('yes') + ' / ' + t('no')}
        />
      </Field>
      <Field label={t('edgeStyle')}>
        <select
          className={inputClass}
          value={edge.data?.style ?? 'solid'}
          onChange={(e) => updateEdge(id, { style: e.target.value as 'solid' | 'dashed' })}
        >
          <option value="solid">{t('solid')}</option>
          <option value="dashed">{t('dashed')}</option>
        </select>
      </Field>
      <Button variant="danger" size="sm" className="w-full" onClick={() => deleteEdge(id)}>
        🗑 {t('delete')}
      </Button>
    </div>
  );
}

export function PropertyPanel() {
  const t = useT();
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const selectedEdgeId = useFlowStore((s) => s.selectedEdgeId);
  return (
    <section className="border-t border-border p-3 dark:border-slate-700">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t('properties')}
      </h3>
      {selectedNodeId ? (
        <NodeProperties id={selectedNodeId} />
      ) : selectedEdgeId ? (
        <EdgeProperties id={selectedEdgeId} />
      ) : (
        <p className="text-[11px] text-slate-400">{t('noSelection')}</p>
      )}
    </section>
  );
}

import type { DragEvent } from 'react';
import { NODE_TYPES, type NodeTypeDefinition } from '../../constants/nodeTypes';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useI18n, useT } from '../../i18n';
import { DND_MIME } from '../Canvas/FlowCanvas';

function PaletteItem({ def }: { def: NodeTypeDefinition }) {
  const language = useI18n((s) => s.language);
  const addNode = useFlowStore((s) => s.addNode);
  const nodes = useFlowStore((s) => s.nodes);

  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData(DND_MIME, def.type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onClick = () => {
    // Place below the lowest node so clicked nodes don't stack on top of each other.
    const maxY = nodes.reduce((m, n) => Math.max(m, n.position.y), 0);
    addNode(def.type, { x: 80 + (nodes.length % 3) * 40, y: nodes.length ? maxY + 140 : 80 });
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="flex cursor-grab items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left text-xs text-slate-700 transition-colors hover:border-border hover:bg-slate-50 active:cursor-grabbing dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700"
      title={def.label[language]}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
        style={{ background: def.color }}
      >
        {def.icon}
      </span>
      <span className="truncate">{def.label[language]}</span>
    </button>
  );
}

export function NodePalette() {
  const t = useT();
  const basic = NODE_TYPES.filter((n) => n.category === 'basic');
  const advanced = NODE_TYPES.filter((n) => n.category === 'advanced');
  return (
    <section className="p-3">
      <h3 className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t('palette')}
      </h3>
      <p className="mb-2 text-[11px] text-slate-400">{t('paletteHint')}</p>
      <p className="mb-1 text-[10px] font-medium text-slate-400">{t('basic')}</p>
      <div className="grid grid-cols-2 gap-1">
        {basic.map((def) => (
          <PaletteItem key={def.type} def={def} />
        ))}
      </div>
      <p className="mb-1 mt-3 text-[10px] font-medium text-slate-400">{t('advanced')}</p>
      <div className="grid grid-cols-2 gap-1">
        {advanced.map((def) => (
          <PaletteItem key={def.type} def={def} />
        ))}
      </div>
    </section>
  );
}

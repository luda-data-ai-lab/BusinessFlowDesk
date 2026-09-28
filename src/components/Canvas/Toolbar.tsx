import { useReactFlow } from '@xyflow/react';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useT } from '../../i18n';
import { Tooltip } from '../common/Tooltip';
import { useFitFlow } from '../../hooks/useFitFlow';

interface ToolButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  active?: boolean;
}

function ToolButton({ label, onClick, disabled, children, active }: ToolButtonProps) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 dark:text-slate-200 dark:hover:bg-slate-700 dark:disabled:text-slate-600 ${
          active ? 'bg-blue-50 text-primary dark:bg-blue-950' : ''
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function Toolbar({ readOnly = false }: { readOnly?: boolean }) {
  const t = useT();
  const { zoomIn, zoomOut } = useReactFlow();
  const fitFlow = useFitFlow();
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const canUndo = useFlowStore((s) => s.historyIndex >= 0);
  const canRedo = useFlowStore((s) => s.historyIndex + 2 < s.history.length);
  const autoLayout = useFlowStore((s) => s.autoLayout);
  const toggleDirection = useFlowStore((s) => s.toggleDirection);
  const direction = useFlowStore((s) => s.layoutDirection);
  const swimlanes = useFlowStore((s) => s.swimlanes);
  const toggleSwimlanes = useFlowStore((s) => s.toggleSwimlanes);
  const nodeCount = useFlowStore((s) => s.nodes.length);
  const edgeCount = useFlowStore((s) => s.edges.length);

  return (
    <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-border bg-white/95 p-1 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-800/95">
      {!readOnly && (
        <>
          <ToolButton label={t('undo')} onClick={undo} disabled={!canUndo}>
            ↶
          </ToolButton>
          <ToolButton label={t('redo')} onClick={redo} disabled={!canRedo}>
            ↷
          </ToolButton>
          <span className="mx-1 h-5 w-px bg-border dark:bg-slate-600" />
          <ToolButton
            label={t('autoLayout')}
            onClick={() => autoLayout()}
            disabled={nodeCount === 0}
          >
            ⇅
          </ToolButton>
          <ToolButton
            label={`${t('direction')} (${direction})`}
            onClick={toggleDirection}
            disabled={nodeCount === 0}
          >
            <span className="text-xs font-semibold">{direction === 'TB' ? '↓' : '→'}</span>
          </ToolButton>
          <ToolButton
            label={t('swimlanes')}
            onClick={toggleSwimlanes}
            active={swimlanes}
            disabled={nodeCount === 0}
          >
            <span className="text-xs font-semibold">{direction === 'TB' ? '▥' : '▤'}</span>
          </ToolButton>
          <span className="mx-1 h-5 w-px bg-border dark:bg-slate-600" />
        </>
      )}
      <ToolButton label="Zoom in" onClick={() => zoomIn()}>
        +
      </ToolButton>
      <ToolButton label="Zoom out" onClick={() => zoomOut()}>
        −
      </ToolButton>
      <ToolButton label={t('fitView')} onClick={() => fitFlow(300, false)}>
        ⛶
      </ToolButton>
      <span className="ml-2 mr-1 hidden text-[11px] text-slate-400 sm:inline">
        {nodeCount} {t('nodes')} · {edgeCount} {t('edges')}
      </span>
    </div>
  );
}

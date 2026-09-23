import { useEffect, useRef, useState } from 'react';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useT } from '../../i18n';
import { PROJECT_WARN_THRESHOLD } from '../../services/storage';
import { Button } from '../common/Button';

export function ProjectMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const projects = useFlowStore((s) => s.projects);
  const projectId = useFlowStore((s) => s.projectId);
  const loadProject = useFlowStore((s) => s.loadProject);
  const newProject = useFlowStore((s) => s.newProject);
  const deleteProject = useFlowStore((s) => s.deleteProject);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        📁 {t('projects')} <span className="text-slate-400">({projects.length})</span>
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-30 mt-1 w-72 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              newProject();
            }}
            className="block w-full px-3 py-2 text-left text-xs font-medium text-primary hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            ＋ {t('newFlow')}
          </button>
          <div className="my-1 h-px bg-border dark:bg-slate-600" />
          {projects.length > PROJECT_WARN_THRESHOLD && (
            <p className="px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
              ⚠ {t('storageWarning')}
            </p>
          )}
          <ul className="max-h-72 overflow-y-auto">
            {projects.map((p) => (
              <li key={p.id} className="group flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    loadProject(p.id);
                  }}
                  className={`min-w-0 flex-1 px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700 ${
                    p.id === projectId
                      ? 'font-semibold text-primary'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="block truncate">{p.title || t('untitled')}</span>
                  <span className="block text-[10px] text-slate-400">
                    {p.nodes?.length ?? 0} {t('nodes')} · {new Date(p.updatedAt).toLocaleString()}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={t('deleteProject')}
                  title={t('deleteProject')}
                  onClick={() => {
                    if (window.confirm(t('confirmDeleteProject'))) deleteProject(p.id);
                  }}
                  className="mr-1 rounded p-1.5 text-xs text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950"
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

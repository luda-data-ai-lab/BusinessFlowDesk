import { useMemo, useState } from 'react';
import { FLOW_TEMPLATES, templateToFlow, type FlowTemplate } from '../../constants/templates';
import { ROLE_MAP } from '../../constants/roles';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useI18n, useT } from '../../i18n';
import { Modal } from '../common/Modal';

export function TemplateGalleryModal() {
  const t = useT();
  const language = useI18n((s) => s.language);
  const open = useFlowStore((s) => s.templateGalleryOpen);
  const setOpen = useFlowStore((s) => s.setTemplateGalleryOpen);
  const role = useFlowStore((s) => s.currentRole);
  const hasNodes = useFlowStore((s) => s.nodes.length > 0);
  const applyTemplate = useFlowStore((s) => s.applyTemplate);
  const [query, setQuery] = useState('');
  const [onlyRole, setOnlyRole] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (tpl: FlowTemplate) =>
      !q ||
      tpl.name[language].toLowerCase().includes(q) ||
      tpl.description[language].toLowerCase().includes(q) ||
      tpl.nodes.some((n) => n.label[language].toLowerCase().includes(q));
    return FLOW_TEMPLATES.filter((tpl) => match(tpl) && (!onlyRole || tpl.roles.includes(role)))
      .map((tpl) => ({ tpl, recommended: tpl.roles.includes(role) }))
      .sort((a, b) => Number(b.recommended) - Number(a.recommended));
  }, [query, onlyRole, role, language]);

  const pick = (tpl: FlowTemplate) => {
    if (hasNodes && !window.confirm(t('templateReplaceConfirm'))) return;
    applyTemplate(templateToFlow(tpl, language));
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)} title={t('templates')} widthClass="max-w-4xl">
      <p className="-mt-2 mb-4 text-xs text-slate-500 dark:text-slate-400">{t('templatesHint')}</p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('templateSearch')}
          aria-label={t('templateSearch')}
          className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-900"
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={onlyRole}
            onChange={(e) => setOnlyRole(e.target.checked)}
          />
          {t('templateOnlyMyRole')} ({ROLE_MAP[role].label[language]})
        </label>
      </div>
      <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(({ tpl, recommended }) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => pick(tpl)}
            className="flex flex-col rounded-xl border-2 border-border p-3 text-left transition-colors hover:border-primary hover:bg-blue-50/50 dark:border-slate-600 dark:hover:border-primary dark:hover:bg-blue-950/40"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xl">{tpl.icon}</span>
              <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {tpl.name[language]}
              </span>
              {recommended && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900 dark:text-violet-200">
                  {t('templateRecommended')}
                </span>
              )}
            </div>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              {tpl.description[language]}
            </p>
            <div className="mt-auto flex flex-wrap gap-1">
              {tpl.roles.map((r) => (
                <span
                  key={r}
                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                >
                  {ROLE_MAP[r].label[language]}
                </span>
              ))}
              <span className="ml-auto text-[10px] text-slate-400">
                {tpl.nodes.length} {t('nodesCount')}
              </span>
            </div>
          </button>
        ))}
        {list.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-slate-400">
            {t('templateNoResults')}
          </p>
        )}
      </div>
    </Modal>
  );
}

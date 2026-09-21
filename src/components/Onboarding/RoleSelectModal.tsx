import { useState } from 'react';
import { ROLES } from '../../constants/roles';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useI18n, useT } from '../../i18n';
import type { RoleType } from '../../types/role';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

export function RoleSelectModal() {
  const t = useT();
  const language = useI18n((s) => s.language);
  const open = useFlowStore((s) => s.needsOnboarding);
  const current = useFlowStore((s) => s.currentRole);
  const complete = useFlowStore((s) => s.completeOnboarding);
  const [picked, setPicked] = useState<RoleType>(current);

  return (
    <Modal open={open} widthClass="max-w-3xl">
      <div className="mb-5 text-center">
        <img src="/favicon.svg" alt="" className="mx-auto mb-3 h-12 w-12" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('appName')}</h1>
        <p className="text-sm text-secondary">{t('tagline')}</p>
      </div>
      <h2 className="mb-1 text-base font-semibold text-slate-800 dark:text-slate-100">
        {t('chooseRole')}
      </h2>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{t('chooseRoleHint')}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setPicked(r.id)}
            className={`rounded-xl border-2 p-3 text-left transition-colors ${
              picked === r.id
                ? 'border-primary bg-blue-50 dark:bg-blue-950'
                : 'border-border hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500'
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xl">{r.icon}</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {r.label[language]}
              </span>
            </div>
            <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              {r.description[language]}
            </p>
          </button>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={() => complete(picked)}>{t('start')} →</Button>
      </div>
    </Modal>
  );
}

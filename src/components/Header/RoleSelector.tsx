import { ROLES } from '../../constants/roles';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useI18n, useT } from '../../i18n';
import type { RoleType } from '../../types/role';

export function RoleSelector() {
  const t = useT();
  const language = useI18n((s) => s.language);
  const role = useFlowStore((s) => s.currentRole);
  const setRole = useFlowStore((s) => s.setRole);
  return (
    <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <span className="hidden sm:inline">{t('role')}</span>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as RoleType)}
        className="h-8 rounded-lg border border-border bg-white px-2 text-xs font-medium text-slate-800 outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        aria-label={t('role')}
      >
        {ROLES.map((r) => (
          <option key={r.id} value={r.id}>
            {r.icon} {r.label[language]}
          </option>
        ))}
      </select>
    </label>
  );
}

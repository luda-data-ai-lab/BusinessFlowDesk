import { useEffect, useState } from 'react';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useI18n, useT } from '../../i18n';
import { ExportMenu } from './ExportMenu';
import { ProjectMenu } from './ProjectMenu';
import { RoleSelector } from './RoleSelector';

interface HeaderProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  readOnly?: boolean;
}

export function Header({ onToggleSidebar, sidebarCollapsed, readOnly = false }: HeaderProps) {
  const t = useT();
  const { language, setLanguage } = useI18n();
  const title = useFlowStore((s) => s.projectTitle);
  const setProjectTitle = useFlowStore((s) => s.setProjectTitle);
  const [draft, setDraft] = useState(title);
  useEffect(() => setDraft(title), [title]);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-white px-3 dark:border-slate-700 dark:bg-slate-800 sm:gap-3 sm:px-4">
      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 md:flex"
        >
          {sidebarCollapsed ? '☰' : '⇤'}
        </button>
      )}
      <a href="/" className="flex items-center gap-2" aria-label={t('appName')}>
        <img src="/favicon.svg" alt="" className="h-7 w-7" />
        <span className="hidden text-sm font-bold text-slate-900 dark:text-slate-100 lg:inline">
          {t('appName')}
        </span>
      </a>
      <span className="hidden h-6 w-px bg-border dark:bg-slate-600 sm:block" />
      <input
        value={draft}
        disabled={readOnly}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== title && setProjectTitle(draft.trim())}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder={t('untitled')}
        aria-label={t('editTitle')}
        className="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-slate-800 outline-none hover:border-border focus:border-primary dark:text-slate-100 dark:hover:border-slate-600 sm:max-w-sm"
      />
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {!readOnly && <ProjectMenu />}
        <RoleSelector />
        {!readOnly && <ExportMenu />}
        <button
          type="button"
          onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
          className="h-8 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          aria-label={t('language')}
          title={t('language')}
        >
          {language === 'ko' ? 'EN' : '한'}
        </button>
      </div>
    </header>
  );
}

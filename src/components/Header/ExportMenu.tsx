import { useEffect, useRef, useState } from 'react';
import { useExport } from '../../hooks/useExport';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useT } from '../../i18n';
import { Button } from '../common/Button';

export function ExportMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const {
    busy,
    error,
    copied,
    exportPng,
    exportSvg,
    exportJson,
    exportPptx,
    exportMermaid,
    exportMarkdown,
    importJson,
    shareLink,
  } = useExport();
  const hasNodes = useFlowStore((s) => s.nodes.length > 0);
  const openScenarios = useFlowStore((s) => s.setTestScenarioOpen);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const item = (label: string, onClick: () => void, disabled = false) => (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 disabled:text-slate-300 dark:text-slate-200 dark:hover:bg-slate-700 dark:disabled:text-slate-600"
    >
      {label}
    </button>
  );

  return (
    <div className="relative" ref={menuRef}>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⬇ {t('export')} {busy && <span className="animate-pulse">…</span>}
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
        >
          {item(`🖼 ${t('exportPng')}`, exportPng, !hasNodes)}
          {item(`🧩 ${t('exportSvg')}`, exportSvg, !hasNodes)}
          {item(`📊 ${t('exportPptx')}`, exportPptx, !hasNodes)}
          {item(`💾 ${t('exportJson')}`, exportJson, !hasNodes)}
          <div className="my-1 h-px bg-border dark:bg-slate-600" />
          {item(`🧜 ${t('exportMermaid')}`, exportMermaid, !hasNodes)}
          {item(`📝 ${t('exportMarkdown')}`, exportMarkdown, !hasNodes)}
          <div className="my-1 h-px bg-border dark:bg-slate-600" />
          {item(`🧪 ${t('testScenarios')}`, () => openScenarios(true), !hasNodes)}
          <div className="my-1 h-px bg-border dark:bg-slate-600" />
          {item(`🔗 ${t('shareLink')}`, shareLink, !hasNodes)}
          <div className="my-1 h-px bg-border dark:bg-slate-600" />
          {item(`📂 ${t('importJson')}`, () => fileRef.current?.click())}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importJson(file);
          e.target.value = '';
        }}
      />
      {copied && (
        <div
          role="status"
          className="absolute right-0 mt-1 w-56 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 shadow dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          ✓ {t('shareCopied')}
        </div>
      )}
      {error && (
        <div className="absolute right-0 mt-1 w-56 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 shadow dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}

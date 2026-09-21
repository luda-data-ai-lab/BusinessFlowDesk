import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useAIGenerate } from '../../hooks/useAIGenerate';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useT } from '../../i18n';
import { Button } from '../common/Button';
import { PromptSuggestions } from './PromptSuggestions';

export function PromptInput() {
  const t = useT();
  const { submit, cancel, isGenerating, hasFlow } = useAIGenerate();
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<'generate' | 'modify'>('generate');
  const error = useFlowStore((s) => s.error);
  const notice = useFlowStore((s) => s.notice);
  const clearError = useFlowStore((s) => s.clearError);
  const clearNotice = useFlowStore((s) => s.clearNotice);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMode(hasFlow ? 'modify' : 'generate');
  }, [hasFlow]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const send = async () => {
    const text = value.trim();
    if (!text || isGenerating) return;
    setValue('');
    await submit(text, mode);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="border-t border-border bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="mx-auto max-w-4xl space-y-2">
        {error && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <span>
              {t('errorGeneric')} <span className="opacity-70">({error})</span>
            </span>
            <button type="button" onClick={clearError} aria-label="close" className="shrink-0">
              ✕
            </button>
          </div>
        )}
        {notice === 'mock' && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <span>⚠ {t('mockNotice')}</span>
            <button type="button" onClick={clearNotice} aria-label="close" className="shrink-0">
              ✕
            </button>
          </div>
        )}
        {!value && !isGenerating && <PromptSuggestions onPick={(p) => setValue(p)} />}
        <div className="flex items-end gap-2">
          {hasFlow && (
            <div className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-border text-[11px] dark:border-slate-600">
              {(['modify', 'generate'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-2 py-1 ${mode === m ? 'bg-primary text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}
                >
                  {m === 'modify' ? t('modify') : t('newFlow')}
                </button>
              ))}
            </div>
          )}
          <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={isGenerating}
            placeholder={mode === 'modify' ? t('promptPlaceholderModify') : t('promptPlaceholder')}
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-secondary focus:ring-2 focus:ring-secondary/30 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          {isGenerating ? (
            <Button variant="ghost" onClick={cancel} className="h-[44px]">
              ✕
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={send}
              disabled={!value.trim()}
              className="h-[44px] min-w-[84px]"
            >
              ✨ {mode === 'modify' ? t('modify') : t('generate')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

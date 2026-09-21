import { SAMPLE_PROMPTS } from '../../constants/samplePrompts';
import { useFlowStore } from '../../hooks/useFlowStore';
import { useI18n } from '../../i18n';

export function PromptSuggestions({ onPick }: { onPick: (prompt: string) => void }) {
  const role = useFlowStore((s) => s.currentRole);
  const language = useI18n((s) => s.language);
  const prompts = SAMPLE_PROMPTS[role][language];
  return (
    <div className="flex flex-wrap gap-1.5">
      {prompts.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200 dark:hover:bg-violet-900"
        >
          ✨ {p}
        </button>
      ))}
    </div>
  );
}

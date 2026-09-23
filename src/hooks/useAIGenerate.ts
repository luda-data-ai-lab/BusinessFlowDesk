import { useCallback } from 'react';
import { useFlowStore } from './useFlowStore';
import { useI18n } from '../i18n';

/** Thin wrapper that decides between fresh generation and incremental modification. */
export function useAIGenerate() {
  const language = useI18n((s) => s.language);
  const isGenerating = useFlowStore((s) => s.isGenerating);
  const hasFlow = useFlowStore((s) => s.nodes.length > 0);
  const generateFromPrompt = useFlowStore((s) => s.generateFromPrompt);
  const modifyWithPrompt = useFlowStore((s) => s.modifyWithPrompt);
  const cancelGeneration = useFlowStore((s) => s.cancelGeneration);

  const submit = useCallback(
    async (prompt: string, mode: 'generate' | 'modify') => {
      const text = prompt.trim();
      if (!text || isGenerating) return;
      if (mode === 'modify' && hasFlow) await modifyWithPrompt(text, language);
      else await generateFromPrompt(text, language);
    },
    [generateFromPrompt, modifyWithPrompt, hasFlow, isGenerating, language],
  );

  return { submit, cancel: cancelGeneration, isGenerating, hasFlow };
}

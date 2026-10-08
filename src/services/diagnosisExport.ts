import type { useT } from '../i18n';
import type { Diagnosis, ImprovementEffort } from '../types/diagnose';
import type { FlowNode } from '../types/flow';

export const SEV_KEY = { high: 'sevHigh', medium: 'sevMedium', low: 'sevLow' } as const;
export const KIND_KEY = {
  'ai-agent': 'kindAiAgent',
  automation: 'kindAutomation',
  process: 'kindProcess',
  system: 'kindSystem',
  control: 'kindControl',
} as const;
export const EFFORT_KEY: Record<ImprovementEffort, 'sevLow' | 'sevMedium' | 'sevHigh'> = {
  low: 'sevLow',
  medium: 'sevMedium',
  high: 'sevHigh',
};

type TFn = ReturnType<typeof useT>;

export function diagnosisToMarkdown(
  d: Diagnosis,
  nodes: FlowNode[],
  scope: string[],
  t: TFn,
  title?: string,
): string {
  const name = (id: string) => nodes.find((n) => n.id === id)?.data.label ?? id;
  const refs = (ids: string[]) => (ids.length ? ` _(${ids.map(name).join(', ')})_` : '');
  const lines: string[] = [`# ${t('diagnoseTitle')}${title ? ` — ${title}` : ''}`, ''];
  lines.push(
    `**${t('diagnoseScope')}:** ${scope.length ? scope.map(name).join(' → ') : t('diagnoseWholeFlow')}`,
    '',
  );
  if (d.summary) lines.push(`## ${t('diagnoseSummary')}`, '', d.summary, '');
  lines.push(`## ${t('diagnoseFindings')}`, '');
  if (!d.findings.length) lines.push(`- ${t('diagnoseNone')}`);
  for (const f of d.findings)
    lines.push(`- **[${t(SEV_KEY[f.severity])}] ${f.title}**${refs(f.nodeIds)}: ${f.detail}`);
  lines.push('', `## ${t('diagnoseImprovements')}`, '');
  for (const i of d.improvements) {
    lines.push(
      `- **[${t(KIND_KEY[i.kind])} · ${t('diagnoseEffort')} ${t(EFFORT_KEY[i.effort])}] ${i.title}**${refs(i.nodeIds)}: ${i.detail}`,
    );
    if (i.agent) lines.push(`  - ${t('diagnoseAgentSpec')}: ${i.agent}`);
  }
  return lines.join('\n');
}

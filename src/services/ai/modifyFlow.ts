import type { AIFlowResponse } from '../../types/flow';
import type { RoleType } from '../../types/role';
import type { Language } from '../../i18n';
import { requestFlow } from './generateFlow';

export function modifyFlow(
  prompt: string,
  role: RoleType,
  existingFlow: AIFlowResponse,
  language: Language,
  signal?: AbortSignal,
  systems: string[] = [],
) {
  return requestFlow({ prompt, role, existingFlow, language, systems }, signal);
}

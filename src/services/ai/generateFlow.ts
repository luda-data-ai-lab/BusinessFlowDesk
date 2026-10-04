import type { AIFlowResponse, GenerateRequest, GenerateResponse } from '../../types/flow';
import type { RoleType } from '../../types/role';
import type { Language } from '../../i18n';
import { isAIFlowResponse } from '../../utils/flowParser';
import { generateMockFlow } from './mockFlow';

export class GenerateError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'GenerateError';
  }
}

export async function requestFlow(
  body: GenerateRequest,
  signal?: AbortSignal,
): Promise<GenerateResponse> {
  let response: Response;
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    // No backend available (e.g. static hosting): degrade to the local heuristic generator.
    return {
      flow: generateMockFlow(body.prompt, body.role, body.existingFlow, body.systems),
      mock: true,
    };
  }

  if (response.status === 404) {
    return {
      flow: generateMockFlow(body.prompt, body.role, body.existingFlow, body.systems),
      mock: true,
    };
  }

  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new GenerateError(
      `Invalid response from /api/generate (${response.status})`,
      response.status,
    );
  }

  if (!response.ok) {
    const message = (json as { error?: string }).error ?? `Request failed (${response.status})`;
    throw new GenerateError(message, response.status);
  }

  const data = json as Partial<GenerateResponse>;
  if (!data.flow || !isAIFlowResponse(data.flow)) {
    throw new GenerateError('AI response did not contain a valid flow');
  }
  return { flow: data.flow as AIFlowResponse, mock: Boolean(data.mock), model: data.model };
}

export function generateFlow(
  prompt: string,
  role: RoleType,
  language: Language,
  signal?: AbortSignal,
  systems: string[] = [],
) {
  return requestFlow({ prompt, role, existingFlow: null, language, systems }, signal);
}

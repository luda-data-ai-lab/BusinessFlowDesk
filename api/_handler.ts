import type { AIFlowResponse, GenerateRequest, GenerateResponse } from '../src/types/flow';
import type { RoleType } from '../src/types/role';
import { buildSystemPrompt, buildUserPrompt } from '../src/services/ai/prompts';
import { generateMockFlow } from '../src/services/ai/mockFlow';
import { extractJson, isAIFlowResponse } from '../src/utils/flowParser';

const ROLES: RoleType[] = ['operations', 'pm', 'developer', 'executive', 'consultant'];
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export interface HandlerResult {
  status: number;
  body: GenerateResponse | { error: string };
}

export function parseRequest(raw: unknown): GenerateRequest | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Request body must be a JSON object' };
  const body = raw as Record<string, unknown>;
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return { error: '`prompt` is required' };
  if (prompt.length > 4000) return { error: '`prompt` is too long (max 4000 chars)' };
  const role = ROLES.includes(body.role as RoleType) ? (body.role as RoleType) : 'operations';
  const existingFlow = isAIFlowResponse(body.existingFlow)
    ? (body.existingFlow as AIFlowResponse)
    : null;
  const language = body.language === 'en' ? 'en' : 'ko';
  const systems = Array.isArray(body.systems)
    ? body.systems
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0 && s.length <= 60)
        .slice(0, 50)
    : [];
  return { prompt, role, existingFlow, language, systems };
}

interface AnthropicMessage {
  content?: Array<{ type: string; text?: string }>;
  error?: { type: string; message: string };
}

export async function handleGenerate(
  raw: unknown,
  env: { CLAUDE_API_KEY?: string; CLAUDE_MODEL?: string },
): Promise<HandlerResult> {
  const parsed = parseRequest(raw);
  if ('error' in parsed) return { status: 400, body: { error: parsed.error } };

  const apiKey = env.CLAUDE_API_KEY?.trim();
  if (!apiKey) {
    return {
      status: 200,
      body: {
        flow: generateMockFlow(parsed.prompt, parsed.role, parsed.existingFlow, parsed.systems),
        mock: true,
      },
    };
  }

  const model = env.CLAUDE_MODEL?.trim() || DEFAULT_MODEL;
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: buildSystemPrompt(parsed.role, parsed.language),
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(parsed.prompt, parsed.existingFlow, parsed.systems),
        },
      ],
    }),
  });

  const data = (await response.json().catch(() => null)) as AnthropicMessage | null;
  if (!response.ok || !data) {
    const message = data?.error?.message ?? `Claude API error (${response.status})`;
    return {
      status: response.status >= 400 && response.status < 600 ? 502 : 500,
      body: { error: message },
    };
  }

  const text = (data.content ?? [])
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('\n');

  let flow: unknown;
  try {
    flow = extractJson(text);
  } catch {
    return {
      status: 502,
      body: { error: 'Claude returned a non-JSON response. Please try again.' },
    };
  }
  if (!isAIFlowResponse(flow)) {
    return { status: 502, body: { error: 'Claude response did not match the flow schema.' } };
  }
  return { status: 200, body: { flow, mock: false, model } };
}

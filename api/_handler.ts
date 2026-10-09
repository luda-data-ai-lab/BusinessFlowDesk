import type { AIFlowResponse, GenerateRequest, GenerateResponse } from '../src/types/flow';
import type { RoleType } from '../src/types/role';
import { buildSystemPrompt, buildUserPrompt } from '../src/services/ai/prompts';
import { generateMockFlow } from '../src/services/ai/mockFlow';
import { extractJson, isAIFlowResponse } from '../src/utils/flowParser';
import type { DiagnoseRequest, DiagnoseResponse } from '../src/types/diagnose';
import {
  buildDiagnoseSystemPrompt,
  buildDiagnoseUserPrompt,
  MAX_FOCUS,
  MAX_SCOPE,
  mockDiagnose,
  sanitizeDiagnosis,
} from '../src/services/ai/diagnose';
import { recordCall } from './_db';

export interface HandlerEnv {
  CLAUDE_API_KEY?: string;
  CLAUDE_MODEL?: string;
  DATABASE_URL?: string;
}

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

export interface DiagnoseResult {
  status: number;
  body: DiagnoseResponse | { error: string };
}

export function parseDiagnoseRequest(raw: unknown): DiagnoseRequest | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Request body must be a JSON object' };
  const body = raw as Record<string, unknown>;
  if (!isAIFlowResponse(body.flow)) return { error: '`flow` is required' };
  const flow = body.flow as AIFlowResponse;
  const scope = Array.isArray(body.scope)
    ? body.scope.filter((s): s is string => typeof s === 'string').slice(0, MAX_SCOPE)
    : [];
  const interfaces: Record<string, string> = {};
  if (body.interfaces && typeof body.interfaces === 'object') {
    for (const [k, v] of Object.entries(body.interfaces as Record<string, unknown>))
      if (typeof v === 'string' && v.trim()) interfaces[k] = v.trim().slice(0, 30);
  }
  const focus = typeof body.focus === 'string' ? body.focus.trim().slice(0, MAX_FOCUS) : undefined;
  const language = body.language === 'en' ? 'en' : 'ko';
  return { flow, scope, interfaces, focus, language };
}

async function callClaude(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const data = (await response.json().catch(() => null)) as AnthropicMessage | null;
  if (!response.ok || !data) {
    return {
      ok: false,
      status: response.status >= 400 && response.status < 600 ? 502 : 500,
      message: data?.error?.message ?? `Claude API error (${response.status})`,
    };
  }
  return {
    ok: true,
    text: (data.content ?? [])
      .filter((c) => c.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text)
      .join('\n'),
  };
}

async function diagnoseCore(raw: unknown, env: HandlerEnv): Promise<DiagnoseResult> {
  const parsed = parseDiagnoseRequest(raw);
  if ('error' in parsed) return { status: 400, body: { error: parsed.error } };
  const apiKey = env.CLAUDE_API_KEY?.trim();
  if (!apiKey) return { status: 200, body: { diagnosis: mockDiagnose(parsed), mock: true } };
  const model = env.CLAUDE_MODEL?.trim() || DEFAULT_MODEL;
  const res = await callClaude(
    apiKey,
    model,
    buildDiagnoseSystemPrompt(parsed.language ?? 'ko'),
    buildDiagnoseUserPrompt(parsed),
    4096,
  );
  if (!res.ok) return { status: res.status, body: { error: res.message } };
  let json: unknown;
  try {
    json = extractJson(res.text);
  } catch {
    return {
      status: 502,
      body: { error: 'Claude returned a non-JSON response. Please try again.' },
    };
  }
  const diagnosis = sanitizeDiagnosis(json, parsed.flow);
  if (!diagnosis)
    return { status: 502, body: { error: 'Claude response did not match the diagnosis schema.' } };
  return { status: 200, body: { diagnosis, mock: false, model } };
}

interface AnthropicMessage {
  content?: Array<{ type: string; text?: string }>;
  error?: { type: string; message: string };
}

async function generateCore(raw: unknown, env: HandlerEnv): Promise<HandlerResult> {
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

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

/** Runs the handler and, when `DATABASE_URL` is set, stores the call in `ai_calls` (non-blocking). */
export async function handleGenerate(raw: unknown, env: HandlerEnv): Promise<HandlerResult> {
  const started = Date.now();
  const result = await generateCore(raw, env);
  const body = asRecord(raw);
  const ok = !('error' in result.body);
  void recordCall(env.DATABASE_URL, {
    kind: 'generate',
    status: result.status,
    mock: ok && 'mock' in result.body ? result.body.mock : false,
    model: ok && 'model' in result.body ? result.body.model : undefined,
    role: typeof body.role === 'string' ? body.role : undefined,
    language: typeof body.language === 'string' ? body.language : undefined,
    prompt: typeof body.prompt === 'string' ? body.prompt : undefined,
    request: raw,
    response: ok ? result.body : undefined,
    error: ok ? undefined : (result.body as { error: string }).error,
    durationMs: Date.now() - started,
  });
  return result;
}

export async function handleDiagnose(raw: unknown, env: HandlerEnv): Promise<DiagnoseResult> {
  const started = Date.now();
  const result = await diagnoseCore(raw, env);
  const body = asRecord(raw);
  const ok = !('error' in result.body);
  void recordCall(env.DATABASE_URL, {
    kind: 'diagnose',
    status: result.status,
    mock: ok && 'mock' in result.body ? result.body.mock : false,
    model: ok && 'model' in result.body ? result.body.model : undefined,
    language: typeof body.language === 'string' ? body.language : undefined,
    prompt: typeof body.focus === 'string' ? body.focus : undefined,
    request: raw,
    response: ok ? result.body : undefined,
    error: ok ? undefined : (result.body as { error: string }).error,
    durationMs: Date.now() - started,
  });
  return result;
}

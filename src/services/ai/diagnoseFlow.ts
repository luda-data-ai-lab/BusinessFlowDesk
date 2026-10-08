import type { DiagnoseRequest, DiagnoseResponse } from '../../types/diagnose';
import { GenerateError } from './generateFlow';
import { mockDiagnose } from './diagnose';

export async function requestDiagnosis(
  body: DiagnoseRequest,
  signal?: AbortSignal,
): Promise<DiagnoseResponse> {
  let response: Response;
  try {
    response = await fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    return { diagnosis: mockDiagnose(body), mock: true };
  }
  if (response.status === 404) return { diagnosis: mockDiagnose(body), mock: true };
  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new GenerateError(
      `Invalid response from /api/diagnose (${response.status})`,
      response.status,
    );
  }
  if (!response.ok) {
    const message = (json as { error?: string }).error ?? `Request failed (${response.status})`;
    throw new GenerateError(message, response.status);
  }
  const data = json as Partial<DiagnoseResponse>;
  if (!data.diagnosis) throw new GenerateError('AI response did not contain a diagnosis');
  return { diagnosis: data.diagnosis, mock: Boolean(data.mock), model: data.model };
}

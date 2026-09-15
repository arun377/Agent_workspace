import {
  EvalDataItem,
  EvalDataGenerateRequest,
  EvalDataGenerateResponse,
  EvalDataUpdateRequest,
} from '../../types/agent';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function fetchEvalData(agentName: string): Promise<EvalDataItem[]> {
  const res = await fetch(`${BASE_URL}/agents/${encodeURIComponent(agentName)}/eval-data`);
  if (!res.ok) {
    let errorMsg = 'Failed to fetch eval data';
    try {
      const err = await res.json();
      if (err.detail) errorMsg = err.detail;
    } catch {}
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function generateEvalData(
  agentName: string,
  numCases: number = 5
): Promise<EvalDataGenerateResponse> {
  const payload: EvalDataGenerateRequest = { num_cases: numCases };
  const res = await fetch(`${BASE_URL}/agents/${encodeURIComponent(agentName)}/eval-data/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorMsg = 'Failed to generate golden eval cases';
    try {
      const err = await res.json();
      if (err.detail) errorMsg = err.detail;
    } catch {}
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function updateEvalCase(
  agentName: string,
  index: number,
  payload: EvalDataUpdateRequest
): Promise<EvalDataItem> {
  const res = await fetch(`${BASE_URL}/agents/${encodeURIComponent(agentName)}/eval-data/${index}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorMsg = 'Failed to update eval case';
    try {
      const err = await res.json();
      if (err.detail) errorMsg = err.detail;
    } catch {}
    throw new Error(errorMsg);
  }
  return res.json();
}

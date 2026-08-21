import { APP_ID, AI_GATEWAY_URL, APP_SECRET } from './config';

export interface GatewayResponse {
  answer: string;
  [key: string]: unknown;
}

/**
 * Ask Dot's brain in the cloud via the AI gateway. Used by quiet (text) chat
 * when a live voice session isn't running. Throws on network/gateway errors —
 * callers fall back to the offline companion engine.
 */
export async function callAiGateway(
  { prompt, signal }: { prompt: string; signal?: AbortSignal }
): Promise<GatewayResponse> {
  const res = await fetch(`${AI_GATEWAY_URL}/ai-gateway`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      appId: APP_ID,
      ...(APP_SECRET ? { appSecret: APP_SECRET } : {}),
    }),
    signal,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({} as any));
    throw new Error((error as any).error || `AI gateway error: ${res.status}`);
  }

  return res.json();
}

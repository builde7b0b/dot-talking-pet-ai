// App identifier — must match an entry in ALLOWED_APP_IDS on the AI gateway.
export const APP_ID = 'dot-talking-pet-ai';

// AI Gateway base URL (Netlify functions root).
export const AI_GATEWAY_URL =
  (import.meta as any).env?.VITE_AI_GATEWAY_URL ||
  'https://ai-gateway-1765129547.netlify.app/.netlify/functions';

// Optional app secret for additional security (if configured on the gateway).
export const APP_SECRET = (import.meta as any).env?.VITE_APP_SECRET || null;

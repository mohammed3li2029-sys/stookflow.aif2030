// ============================================================================
// StockFlow — AI proxy (Supabase Edge Function) — hardened
// Secrets: GEMINI_API_KEY (required), GEMINI_MODEL (optional)
//
// Deploy: Supabase Dashboard -> Edge Functions -> Via Editor -> name it "ai".
// IMPORTANT: turn Verify JWT = Off (the publishable key is not a JWT).
// ============================================================================

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

const ALLOWED_ORIGINS = [
  'https://mohammed3li2029-sys.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

const MAX_BODY_BYTES = 200_000;       // الحد الأقصى لحجم الطلب
const MAX_CONTENTS = 40;              // أقصى عدد رسائل
const RATE_LIMIT = 20;                // طلبات لكل نافذة
const RATE_WINDOW_MS = 60_000;        // دقيقة

// الحقول المسموح بتمريرها لـ Gemini فقط
const ALLOWED_FIELDS = ['contents', 'tools', 'toolConfig', 'systemInstruction', 'generationConfig'];

const hits = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin !== null && ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return json({ error: { message: 'Method not allowed.' } }, 405, origin);
  }

  // لازم يكون فيه Origin ومسموح (يمنع curl والسكربتات العادية)
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return json({ error: { message: 'Origin not allowed.' } }, 403, origin);
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';
  if (rateLimited(ip)) {
    return json({ error: { message: 'Too many requests. Try again in a minute.' } }, 429, origin);
  }

  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) {
    return json({ error: { message: 'Server is missing GEMINI_API_KEY.' } }, 500, origin);
  }

  // حد حجم الطلب
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: { message: 'Request too large.' } }, 413, origin);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: { message: 'Invalid JSON body.' } }, 400, origin);
  }
  if (!payload || !Array.isArray(payload.contents) || payload.contents.length === 0) {
    return json({ error: { message: 'Missing "contents" array.' } }, 400, origin);
  }
  if (payload.contents.length > MAX_CONTENTS) {
    return json({ error: { message: 'Too many messages.' } }, 400, origin);
  }

  // تمرير الحقول المسموحة فقط
  const safePayload: Record<string, unknown> = {};
  for (const f of ALLOWED_FIELDS) {
    if (payload[f] !== undefined) safePayload[f] = payload[f];
  }

  const model = String(Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL)
    .replace(/[^a-zA-Z0-9._-]/g, '');

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify(safePayload),
      },
    );
  } catch {
    return json({ error: { message: 'Upstream request failed.' } }, 502, origin);
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' },
  });
});

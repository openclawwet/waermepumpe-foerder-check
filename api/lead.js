const SITE_SLUG = 'waermepumpe-foerder-check';

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

function getHeader(req, name) {
  const headers = req.headers || {};
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
}

function getClientIp(req) {
  const fwd = getHeader(req, 'x-forwarded-for');
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || null;
}

function sanitizeString(value, maxLen = 500) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizePayload(raw) {
  const name = sanitizeString(raw?.name, 120);
  const emailRaw = sanitizeString(raw?.email, 255);
  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const phone = sanitizeString(raw?.phone, 40);
  const goal = sanitizeString(raw?.goal || raw?.intent || raw?.topic, 500);
  const sourceUrl = sanitizeString(raw?.source_url || raw?.url || raw?.page, 2048);

  return {
    name,
    email,
    phone,
    intent: goal,
    source_url: sourceUrl,
    utm_source: sanitizeString(raw?.utm_source, 150),
    utm_medium: sanitizeString(raw?.utm_medium, 150),
    utm_campaign: sanitizeString(raw?.utm_campaign, 150),
    utm_term: sanitizeString(raw?.utm_term, 150),
    utm_content: sanitizeString(raw?.utm_content, 150),
  };
}

async function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch {
      throw new Error('INVALID_JSON');
    }
  }
  return req.body;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missingEnv.length > 0) {
    return res.status(500).json({
      ok: false,
      error: 'server_not_configured',
      message: `Missing required environment variables: ${missingEnv.join(', ')}`,
    });
  }

  let body;
  try {
    body = await parseBody(req);
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid_json' });
  }

  const normalized = normalizePayload(body);

  if (!normalized.name || !normalized.email || !normalized.intent) {
    return res.status(400).json({
      ok: false,
      error: 'validation_error',
      message: 'name, email and goal are required.',
    });
  }

  if (!isValidEmail(normalized.email)) {
    return res.status(400).json({
      ok: false,
      error: 'validation_error',
      message: 'email is invalid.',
    });
  }

  const lead = {
    site: SITE_SLUG,
    name: normalized.name,
    email: normalized.email,
    phone: normalized.phone,
    intent: normalized.intent,
    source_url: normalized.source_url,
    utm_source: normalized.utm_source,
    utm_medium: normalized.utm_medium,
    utm_campaign: normalized.utm_campaign,
    utm_term: normalized.utm_term,
    utm_content: normalized.utm_content,
    metadata: {
      ip: getClientIp(req),
      user_agent: sanitizeString(getHeader(req, 'user-agent'), 500),
    },
  };

  try {
    const endpoint = `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/leads`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(lead),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase lead insert failed', {
        status: response.status,
        body: errorText,
      });
      return res.status(502).json({
        ok: false,
        error: 'storage_error',
        message: 'Lead could not be persisted right now.',
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Unexpected lead insert error', error);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Unexpected server error while storing lead.',
    });
  }
}

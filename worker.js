// ============================================================
// worker.js — Cloudflare Workers proxy
// Deploy di: api.penabur.id (atau subdomain apapun)
//
// Fungsinya:
// 1. Validasi Origin (cuma terima dari domain frontend lo)
// 2. Rate limiting (anti spam/brute force di layer proxy)
// 3. Forward request ke GAS + inject secret
// 4. Handle CORS biar browser gak komplain
// ============================================================

// Config dibaca dari env (wrangler secrets) — tidak hardcode di sini
// Set via: wrangler secret put GAS_URL
//          wrangler secret put WORKER_SECRET
//          wrangler secret put ALLOWED_ORIGIN
function getConfig(env) {
  return {
    GAS_URL:               env.GAS_URL            || 'https://script.google.com/macros/s/BELUM_DISET/exec',
    WORKER_SECRET:         env.WORKER_SECRET       || 'BELUM_DISET',
    ALLOWED_ORIGIN:        env.ALLOWED_ORIGIN      || 'https://jowi.penabur.id',
    RATE_LIMIT_PER_MINUTE: 30,
  };
}

// ============================================================
// KV Store key buat rate limiting (pakai Cloudflare KV)
// Kalau belum setup KV, rate limiting di-skip otomatis
// ============================================================
async function checkRateLimit(env, ip, config) {
  try {
    if (!env.RATE_LIMIT_KV) return { allowed: true }; // skip kalau KV belum setup

    const key     = `rl:${ip}`;
    const current = parseInt(await env.RATE_LIMIT_KV.get(key) || '0');

    if (current >= config.RATE_LIMIT_PER_MINUTE) {
      return { allowed: false };
    }

    // Increment counter, expire 60 detik
    await env.RATE_LIMIT_KV.put(key, String(current + 1), { expirationTtl: 60 });
    return { allowed: true };
  } catch (e) {
    return { allowed: true }; // kalau error, jangan block request
  }
}

// ============================================================
// CORS headers — selalu return ini di setiap response
// ============================================================
function corsHeaders(origin, CONFIG) {
  const allowed = origin === CONFIG.ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin':  allowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age':       '86400',
    'Vary':                         'Origin',
  };
}

// ============================================================
// Main handler
// ============================================================
export default {
  async fetch(request, env, ctx) {
    const CONFIG = getConfig(env);
    const origin = request.headers.get('Origin') || '';
    const cors   = corsHeaders(origin, CONFIG);

    // Handle preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Hanya terima POST
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, message: 'Method not allowed.' }),
        { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Validasi origin — tolak kalau bukan dari frontend lo
    if (origin !== CONFIG.ALLOWED_ORIGIN) {
      return new Response(
        JSON.stringify({ success: false, message: 'Origin tidak diizinkan.' }),
        { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Ambil IP client
    const clientIP = request.headers.get('CF-Connecting-IP') ||
                     request.headers.get('X-Forwarded-For')  || 'unknown';

    // Rate limiting
    const rateCheck = await checkRateLimit(env, clientIP, CONFIG);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ success: false, message: 'Terlalu banyak request. Coba lagi nanti.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body dari client
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: 'Request body tidak valid.' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Inject metadata ke payload (IP + User-Agent dari sisi proxy)
    // GAS gak bisa baca custom headers langsung, jadi kita inject ke payload
    body.payload = body.payload || {};
    body.payload._ip        = clientIP;
    body.payload._userAgent = request.headers.get('User-Agent') || '';

    // Forward ke GAS — inject secret sebagai query param
    // (GAS doPost bisa baca e.parameter tapi bukan headers)
    const gasUrl = `${CONFIG.GAS_URL}?secret=${CONFIG.WORKER_SECRET}`;

    let gasResponse;
    try {
      gasResponse = await fetch(gasUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        // Follow redirect — GAS sering redirect sekali setelah deploy
        redirect: 'follow',
      });
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, message: 'Server sedang tidak dapat dihubungi.' }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Forward response GAS ke client, tambahkan CORS headers
    const gasData = await gasResponse.text();
    return new Response(gasData, {
      status:  200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};

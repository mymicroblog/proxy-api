export default {
  async fetch(request, env) {
    const startTime = Date.now();
    const url = new URL(request.url);

    try {
      // ── Health check ──
      if (url.pathname === "/health" || url.pathname === "/__health") {
        return healthCheck(env);
      }

      // ── CORS preflight ──
      if (request.method === "OPTIONS") {
        return corsPreflight();
      }

      // ── Match route ──
      const route = matchRoute(url.pathname, env.ROUTES);
      if (!route) {
        return json({ error: "Not Found" }, 404);
      }

      // ── Auth ──
      if (route.auth !== false) {
        const authErr = checkAuth(request, env);
        if (authErr) return authErr;
      }

      // ── Path rewrite ──
      let targetPath = url.pathname;
      if (route.rewrite) {
        for (const [pattern, replacement] of route.rewrite) {
          const re = new RegExp(pattern);
          if (re.test(targetPath)) {
            targetPath = targetPath.replace(re, replacement);
            break;
          }
        }
      }

      const targetUrl = route.origin + targetPath + url.search;

      // ── Request headers ──
      const reqHeaders = new Headers(request.headers);
      reqHeaders.set("Host", route.host || new URL(route.origin).host);

      for (const h of route.remove_request_headers || []) {
        reqHeaders.delete(h);
      }
      for (const [k, v] of Object.entries(route.set_request_headers || {})) {
        reqHeaders.set(k, v);
      }

      // ── Body ──
      let body = null;
      if (request.method !== "GET" && request.method !== "HEAD") {
        body = await request.text();
      }

      // ── Proxy ──
      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: reqHeaders,
        body,
        redirect: "manual",
      });

      const response = await fetch(proxyRequest);
      const duration = Date.now() - startTime;

      // ── Response headers ──
      const resHeaders = new Headers();
      const hopByHop = new Set([
        "connection", "keep-alive", "transfer-encoding",
        "te", "trailer", "upgrade", "proxy-authenticate",
      ]);
      for (const [k, v] of response.headers) {
        if (!hopByHop.has(k.toLowerCase())) {
          resHeaders.set(k, v);
        }
      }
      resHeaders.set("Access-Control-Allow-Origin", "*");

      for (const h of route.remove_response_headers || []) {
        resHeaders.delete(h);
      }
      for (const [k, v] of Object.entries(route.set_response_headers || {})) {
        resHeaders.set(k, v);
      }

      // ── Structured log ──
      log("info", {
        method: request.method,
        path: url.pathname,
        target: targetUrl,
        status: response.status,
        duration,
        route: route.prefix,
        clientIp: request.headers.get("CF-Connecting-IP") || "",
      });

      return new Response(response.body, {
        status: response.status,
        headers: resHeaders,
      });

    } catch (err) {
      const duration = Date.now() - startTime;
      log("error", {
        path: url.pathname,
        message: err.stack || err.message,
        duration,
      });
      return json({ error: "Internal Server Error" }, 500);
    }
  },
};

// ─── Route matching ────────────────────────────────────────────────

function matchRoute(pathname, routesJson) {
  const routes = parseJson(routesJson, []);
  // Sort by prefix length descending → most-specific match first
  routes.sort((a, b) => b.prefix.length - a.prefix.length);
  return routes.find(r => pathname.startsWith(r.prefix)) || null;
}

// ─── Auth ──────────────────────────────────────────────────────────

function checkAuth(request, env) {
  const keys = (env.AUTH_KEYS || "")
    .split(",")
    .map(k => k.trim())
    .filter(Boolean);

  if (keys.length === 0) return null; // auth not configured

  const headerName = env.AUTH_HEADER_NAME || "X-API-Key";
  const value = request.headers.get(headerName);

  if (!value) {
    return json({ error: "Unauthorized", message: `Missing ${headerName} header` }, 401);
  }
  if (!keys.includes(value)) {
    return json({ error: "Unauthorized", message: "Invalid API key" }, 401);
  }
  return null;
}

// ─── Endpoints ─────────────────────────────────────────────────────

function healthCheck(env) {
  const routes = parseJson(env.ROUTES, []);
  return json({
    status: "ok",
    authEnabled: !!(env.AUTH_KEYS),
    routes: routes.map(r => ({
      prefix: r.prefix,
      origin: r.origin,
      authRequired: r.auth !== false,
    })),
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// ─── Helpers ───────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function log(level, fields) {
  console.log(JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    ...fields,
  }));
}

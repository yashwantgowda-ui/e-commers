// Backend API base URL.
// - Set VITE_API_URL to a full URL (e.g. http://127.0.0.1:5001/api) to force a specific backend.
// - Set VITE_API_URL=auto to match the current device hostname (works for phones/tablets on the same Wi-Fi).
function getDefaultApiBase() {
  if (typeof window === "undefined") return "http://127.0.0.1:5001/api";
  const hostname = window.location?.hostname;
  if (!hostname) return "http://127.0.0.1:5001/api";
  return `http://${hostname}:5001/api`;
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function normalizeEnvApiBase(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  if (raw.toLowerCase() === "auto") return "";

  const cleaned = stripTrailingSlash(raw);
  try {
    const url = new URL(cleaned);
    const pathname = stripTrailingSlash(url.pathname);
    if (!pathname || pathname === "/") {
      url.pathname = "/api";
    } else {
      url.pathname = pathname;
    }
    return stripTrailingSlash(url.toString());
  } catch (_e) {
    return cleaned;
  }
}

const ENV_API_BASE = normalizeEnvApiBase(import.meta.env.VITE_API_URL);
export const API_URL = ENV_API_BASE || getDefaultApiBase();
const API_BASE_CACHE_KEY = "api_base_url_working";

export function getToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch (_) {
    return "";
  }
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function fetchWithRetry(
  url,
  options = {},
  retries = 2,
  delayMs = 800,
  timeoutMs = 3000
) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function getApiBaseCandidates() {
  const envBase = ENV_API_BASE;
  const dynamicBase = getDefaultApiBase();
  let cachedBase = "";
  try {
    cachedBase = localStorage.getItem(API_BASE_CACHE_KEY) || "";
  } catch (_) {
    cachedBase = "";
  }

  return unique([
    cachedBase,
    envBase,
    dynamicBase,
    API_URL,
    "http://127.0.0.1:5001/api",
    "http://localhost:5001/api",
  ]);
}

export async function fetchApiWithFallback(
  path,
  options = {},
  retries = 1,
  delayMs = 300,
  timeoutMs = 3000
) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  let lastError;

  for (const base of getApiBaseCandidates()) {
    const url = `${base}${cleanPath}`;
    try {
      const response = await fetchWithRetry(url, options, retries, delayMs, timeoutMs);
      try {
        localStorage.setItem(API_BASE_CACHE_KEY, base);
      } catch (_) {
        // ignore storage errors
      }
      return response;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

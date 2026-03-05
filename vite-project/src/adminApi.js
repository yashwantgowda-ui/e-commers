import { API_URL, fetchWithRetry } from "./api";

const ADMIN_API_BASE_CACHE_KEY = "admin_api_base_url_working";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getCachedAdminBase() {
  try {
    return localStorage.getItem(ADMIN_API_BASE_CACHE_KEY) || "";
  } catch (_e) {
    return "";
  }
}

function setCachedAdminBase(base) {
  try {
    localStorage.setItem(ADMIN_API_BASE_CACHE_KEY, base);
  } catch (_e) {
    // ignore cache write errors
  }
}

function buildAdminUrls(base, path) {
  const cleanBase = stripTrailingSlash(base);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const withApi =
    /\/api$/i.test(cleanBase)
      ? `${cleanBase}/admin${cleanPath}`
      : `${cleanBase}/api/admin${cleanPath}`;
  const direct = `${cleanBase}/admin${cleanPath}`;

  return unique([withApi, direct]);
}

export function clearAdminApiCache() {
  try {
    localStorage.removeItem(ADMIN_API_BASE_CACHE_KEY);
  } catch (_e) {
    // ignore cache errors
  }
}

export function getAdminBaseCandidates() {
  const envBase = import.meta.env.VITE_API_URL || "";
  const cached = getCachedAdminBase();

  return unique([
    cached,
    envBase,
    API_URL,
    "http://127.0.0.1:5001/api",
    "http://localhost:5001/api",
    "http://127.0.0.1:5001",
    "http://localhost:5001",
  ]);
}

export async function fetchAdminApi(
  path,
  options = {},
  retries = 1,
  delayMs = 250,
  timeoutMs = 7000
) {
  let lastError;
  let lastResponse;

  for (const base of getAdminBaseCandidates()) {
    const urls = buildAdminUrls(base, path);
    for (const url of urls) {
      try {
        const response = await fetchWithRetry(url, options, retries, delayMs, timeoutMs);
        if (response.status === 404) {
          lastResponse = response;
          continue;
        }
        setCachedAdminBase(base);
        return response;
      } catch (err) {
        lastError = err;
      }
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error("Admin API request failed");
}

export async function probeBackendHealth(timeoutMs = 2500) {
  const candidates = [
    "http://127.0.0.1:5001/health",
    "http://localhost:5001/health",
  ];

  for (const url of candidates) {
    try {
      const response = await fetchWithRetry(
        url,
        { method: "GET" },
        0,
        0,
        timeoutMs
      );
      const body = await response.json().catch(() => ({}));
      return { reachable: true, status: response.status, body };
    } catch (_e) {
      // try next candidate
    }
  }

  return { reachable: false, status: 0, body: null };
}


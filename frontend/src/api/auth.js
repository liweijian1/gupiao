import { API_BASE_URL } from "../config.js";

export class AuthApiError extends Error {
  constructor(status, code = "request_failed") {
    super(code);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
  }
}

async function authRequest(path, { method = "GET", body, signal } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-Requested-With"] = "QuantDesk";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AuthApiError(response.status, payload?.detail?.code ?? "request_failed");
  }
  return payload;
}

export const getSession = (signal) => authRequest("/api/auth/session", { signal });
export const registerAccount = (credentials) => authRequest("/api/auth/register", { method: "POST", body: credentials });
export const loginAccount = (credentials) => authRequest("/api/auth/login", { method: "POST", body: credentials });
export const logoutAccount = () => authRequest("/api/auth/logout", { method: "POST" });

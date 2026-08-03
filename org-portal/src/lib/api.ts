import { useAuthStore } from "@/store/auth.store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string,
  retry = true,
): Promise<T> {
  const token = accessToken ?? useAuthStore.getState().accessToken ?? undefined;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "omit",
  });

  if (res.status === 401 && retry) {
    const currentToken = useAuthStore.getState().accessToken;
    if (currentToken) {
      // Authenticated request — try to refresh the token
      const refreshed = await useAuthStore.getState().refreshTokens();
      if (refreshed) {
        return request<T>(endpoint, options, undefined, false);
      }
      useAuthStore.getState().logout();
      throw new ApiError("Session expired", 401);
    }
    // No token (public endpoint like login) — surface the real backend error
    const errData = await res.json().catch(() => ({})) as { message?: string };
    throw new ApiError(errData.message || "Request failed", 401, errData);
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      (errData as { message?: string }).message || "Request failed",
      res.status,
      errData,
    );
  }

  const json = await res.json();

  // Auto-unwrap TransformInterceptor envelope: { success: true, data: ... }
  if (json && typeof json === "object" && "success" in json && "data" in json) {
    return json.data as T;
  }

  return json as T;
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: "GET" }, token),

  post: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }, token),

  put: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }, token),

  patch: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) }, token),

  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: "DELETE" }, token),
};

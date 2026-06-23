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

async function rawRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "omit",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.message || "Request failed", res.status, data);
  }

  return res.json();
}

// On 401, silently refresh the access token and retry once.
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  try {
    return await rawRequest<T>(endpoint, options, accessToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && accessToken) {
      // Lazy import avoids a circular dependency with the store
      const { useAuthStore } = await import("@/store/auth.store");
      const refreshed = await useAuthStore.getState().refreshTokens();
      if (refreshed) {
        const newToken = useAuthStore.getState().accessToken!;
        return rawRequest<T>(endpoint, options, newToken);
      }
    }
    throw err;
  }
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

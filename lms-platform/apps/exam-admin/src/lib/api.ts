const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
  isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (res.status === 401 && !isRetry) {
    // Try to refresh the access token, then replay the original request
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(method, path, body, refreshed, true);
    }
    // Refresh failed — force logout
    if (typeof window !== "undefined") {
      const { useAuthStore } = await import("@/store/auth.store");
      useAuthStore.getState().clear();
      window.location.href = "/";
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) throw new Error(json?.message ?? `API ${res.status}`);
  return json;
}

async function tryRefresh(): Promise<string | null> {
  try {
    const { useAuthStore } = await import("@/store/auth.store");
    const { refreshToken, setAccessToken } = useAuthStore.getState();
    if (!refreshToken) return null;

    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const newToken: string = json?.data?.access_token ?? json?.access_token;
    if (!newToken) return null;

    setAccessToken(newToken);
    return newToken;
  } catch {
    return null;
  }
}

export const api = {
  get:    <T>(path: string, token?: string) => request<T>("GET",    path, undefined, token),
  post:   <T>(path: string, body: unknown, token?: string) => request<T>("POST",   path, body, token),
  patch:  <T>(path: string, body: unknown, token?: string) => request<T>("PATCH",  path, body, token),
  put:    <T>(path: string, body: unknown, token?: string) => request<T>("PUT",    path, body, token),
  delete: <T>(path: string, token?: string) => request<T>("DELETE", path, undefined, token),
  upload: async <T>(path: string, formData: FormData, token?: string): Promise<T> => {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: formData });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message ?? `API ${res.status}`);
    return json;
  },
};

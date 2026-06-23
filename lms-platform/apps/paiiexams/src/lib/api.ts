const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function request<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message ?? `API ${res.status}`);
  return json;
}

export const api = {
  get:    <T>(path: string, token?: string) => request<T>("GET",    path, undefined, token),
  post:   <T>(path: string, body: unknown, token?: string) => request<T>("POST",   path, body, token),
  patch:  <T>(path: string, body: unknown, token?: string) => request<T>("PATCH",  path, body, token),
  delete: <T>(path: string, token?: string) => request<T>("DELETE", path, undefined, token),
};

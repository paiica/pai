const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// Backend's POST /uploads/local expects multipart form data, not JSON, so
// this bypasses api.post() (which always JSON.stringifies) with a direct
// fetch — mirrors uploads.controller.ts's uploadLocal handler.
export async function uploadFile(file: File, purpose: string, token: string): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/uploads/local?purpose=${encodeURIComponent(purpose)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Upload failed");
  }
  const json = await res.json();
  // Backend wraps all responses in {success, data} — api.ts unwraps this
  // automatically, but a raw fetch (needed here for multipart) doesn't.
  return json && typeof json === "object" && "data" in json ? json.data : json;
}

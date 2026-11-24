const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// Backend export endpoints return a raw text/csv body with a
// Content-Disposition header — api.get() unconditionally calls res.json()
// and would throw on that, so this bypasses it with a direct fetch, same
// pattern as the admin app's own CSV export buttons.
export async function downloadFile(path: string, token: string, filename: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

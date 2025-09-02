const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";

export async function http<T>(path: string, params?: Record<string, string | number>) {
  const url = new URL(`${API_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

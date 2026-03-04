// ── API Configuration ──────────────────────────────────────────────────────────
// Set VITE_API_BASE_URL in your .env file for local dev,
// or as a build arg during CI/CD for production.
//
// Example .env:
//   VITE_API_BASE_URL=https://loads-matching-api-abc123-uc.a.run.app
//   VITE_API_KEY=your-api-key

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
export const API_KEY      = import.meta.env.VITE_API_KEY      || "dev-key-change-me"

export const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

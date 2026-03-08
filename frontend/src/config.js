// ── API Configuration ──────────────────────────────────────────────────────────
// Set VITE_API_BASE_URL in your .env file for local dev,
// or as a build arg during CI/CD for production.
//
// Example .env:
//   VITE_API_BASE_URL=https://loads-matching-api-abc123-uc.a.run.app
//   VITE_API_KEY=your-api-key

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
export const API_KEY      = import.meta.env.VITE_API_KEY      || "dev-key-change-me"

console.log("🔌 API Config:", { API_BASE_URL, API_KEY: "***" })

export const apiFetch = async (path, options = {}) => {
  const url = `${API_BASE_URL}${path}`
  console.log("📡 Fetching:", url)
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`API error ${res.status}: ${errorText}`)
  }
  return res.json()
}

import React, { useState, useEffect, useCallback } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts"
import { apiFetch } from "./config"

// ── Logo SVG ───────────────────────────────────────────────────────────────────
const HappyTransportLogo = ({ size = 48, inverted = false }) => {
  const bg = inverted ? "#f5f5f0" : "#0a0a0a"
  const fg = inverted ? "#0a0a0a" : "#f5f5f0"
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill={bg} />
      {/* Road line */}
      <rect x="0" y="38" width="64" height="3" fill={fg} opacity="0.25" />
      {/* Truck body */}
      <rect x="8" y="20" width="30" height="18" fill={fg} />
      {/* Cab */}
      <rect x="38" y="26" width="14" height="12" fill={fg} />
      {/* Windshield */}
      <rect x="40" y="28" width="9" height="7" fill={bg} opacity="0.7" />
      {/* Wheels */}
      <circle cx="17" cy="40" r="5" fill={bg} stroke={fg} strokeWidth="2.5" />
      <circle cx="42" cy="40" r="5" fill={bg} stroke={fg} strokeWidth="2.5" />
      {/* Speed lines */}
      <rect x="2" y="27" width="5" height="1.5" fill={fg} opacity="0.4" />
      <rect x="2" y="31" width="7" height="1.5" fill={fg} opacity="0.4" />
      <rect x="2" y="35" width="4" height="1.5" fill={fg} opacity="0.4" />
    </svg>
  )
}

// ── Colour helpers ─────────────────────────────────────────────────────────────
const OUTCOME_COLORS = {
  "Booked with negotiations": "#0a0a0a",
  "Booked without negotiations": "#555",
  "Not booked with negotiations": "#888",
  "Not booked without negotiations": "#bbb",
  "Not match": "#ddd",
  "Unknown": "#f0f0f0",
}
const SENTIMENT_COLORS = {
  positive: "#0a0a0a",
  neutral:  "#888",
  negative: "#ccc",
}

// ── Mock data for when no API is configured ────────────────────────────────────
const MOCK_METRICS = Array.from({ length: 40 }, (_, i) => {
  const outcomes   = ["Booked with negotiations","Booked without negotiations","Not booked with negotiations","Not booked without negotiations","Not match","Unknown"]
  const sentiments = ["positive","positive","neutral","negative"]
  const d = new Date(2026, 2, 1 + Math.floor(i / 3))
  return {
    recorded_at:               d.toISOString().slice(0, 16),
    load_info:                 `L${String(i + 1).padStart(3, "0")}`,
    carrier_legal_name:        ["Swift Transport","Ryder Logistics","J.B. Hunt","Werner Enterprises","Knight-Swift"][i % 5],
    carrier_mc_number:         `MC-${100000 + i * 7}`,
    carrier_mc_number_validity: i % 9 !== 0,
    price_diff:                parseFloat((Math.random() * 600 - 200).toFixed(2)),
    duration:                  parseFloat((Math.random() * 30 + 2).toFixed(1)),
    sentiment:                 sentiments[i % sentiments.length],
    outcome:                   outcomes[i % outcomes.length],
  }
})

// ── Utility ────────────────────────────────────────────────────────────────────
const fmt = (n, decimals = 0) =>
  typeof n === "number" ? n.toFixed(decimals) : "—"

const countBy = (arr, key) =>
  arr.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] || 0) + 1
    return acc
  }, {})

// ── Sub-components ─────────────────────────────────────────────────────────────
const KPICard = ({ label, value, sub, accent }) => (
  <div style={{
    background: accent ? "#0a0a0a" : "#fff",
    color: accent ? "#f5f5f0" : "#0a0a0a",
    border: "1.5px solid #0a0a0a",
    padding: "28px 24px",
    display: "flex", flexDirection: "column", gap: 6,
    transition: "transform .15s",
    cursor: "default",
  }}
    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
  >
    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.15em", opacity: 0.55, textTransform: "uppercase" }}>{label}</span>
    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, lineHeight: 1 }}>{value}</span>
    {sub && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, opacity: 0.5 }}>{sub}</span>}
  </div>
)

const SectionTitle = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: "0.08em" }}>{children}</span>
    <div style={{ flex: 1, height: 1, background: "#0a0a0a", opacity: 0.15 }} />
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#0a0a0a", color: "#f5f5f0", padding: "10px 14px", fontFamily: "'DM Mono', monospace", fontSize: 12, border: "none" }}>
      <div style={{ opacity: 0.6, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i}>{p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</strong></div>
      ))}
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [metrics,   setMetrics]   = useState([])
  const [loads,     setLoads]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [usedMock,  setUsedMock]  = useState(false)
  const [filter,    setFilter]    = useState({ outcome: "", sentiment: "" })
  const [page,      setPage]      = useState(0)
  const [loadsPage, setLoadsPage] = useState(0)
  const PAGE_SIZE = 8

  const fetchLoads = useCallback(async () => {
    try {
      const data = await apiFetch("/v1/loads")
      setLoads(data.loads || [])
      console.log(`✅ Loaded ${data.loads?.length || 0} loads from API`)
    } catch (err) {
      console.error("❌ Failed to fetch loads:", err.message)
      setLoads([])
    }
  }, [])

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: 500 })
      if (filter.outcome)   params.append("outcome",   filter.outcome)
      if (filter.sentiment) params.append("sentiment", filter.sentiment)
      const data = await apiFetch(`/v1/metrics?${params}`)
      setMetrics(data.metrics || [])
      setUsedMock(false)
      console.log(`✅ Loaded ${data.metrics?.length || 0} metrics from API`)
    } catch (err) {
      console.error("❌ Failed to fetch metrics:", err.message)
      setMetrics(MOCK_METRICS)
      setUsedMock(true)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchLoads() }, [fetchLoads])
  useEffect(() => { fetchMetrics() }, [fetchMetrics])

  // ── Derived stats ────────────────────────────────────────────────────────────
  const total       = metrics.length
  const booked      = metrics.filter(m => m.outcome && m.outcome.startsWith("Booked")).length
  const bookedPct   = total ? Math.round((booked / total) * 100) : 0
  const avgPriceDiff= total ? metrics.reduce((s, m) => s + parseFloat(m.price_diff || 0), 0) / total : 0
  const avgDuration = total ? metrics.reduce((s, m) => s + parseFloat(m.duration  || 0), 0) / total : 0
  const validMC     = total ? metrics.filter(m => m.carrier_mc_number_validity === true || m.carrier_mc_number_validity === "true").length : 0

  const outcomeCounts   = countBy(metrics, "outcome")
  const sentimentCounts = countBy(metrics, "sentiment")

  const outcomeChartData = Object.entries(outcomeCounts).map(([name, value]) => ({ name, value }))
  const sentimentChartData = Object.entries(sentimentCounts).map(([name, value]) => ({ name, value }))

  // Price diff bucketed by day
  const priceDiffByDay = Object.entries(
    metrics.reduce((acc, m) => {
      const day = (m.recorded_at || "").slice(0, 10)
      if (!day) return acc
      if (!acc[day]) acc[day] = { day, total: 0, count: 0 }
      acc[day].total += parseFloat(m.price_diff || 0)
      acc[day].count += 1
      return acc
    }, {})
  ).map(([, v]) => ({ day: v.day, avg_price_diff: parseFloat((v.total / v.count).toFixed(2)) }))
    .sort((a, b) => a.day.localeCompare(b.day))

  // Paginated table
  const tableData   = metrics.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages  = Math.ceil(total / PAGE_SIZE)

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f0" }}>

      {/* ── Header ── */}
      <header style={{ background: "#0a0a0a", color: "#f5f5f0", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <HappyTransportLogo size={44} />
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: "0.12em", lineHeight: 1 }}>Happy Transport</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", opacity: 0.45, textTransform: "uppercase" }}>Metrics Dashboard</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {usedMock && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em", background: "#fff", color: "#0a0a0a", padding: "4px 10px" }}>
              ⚠ DEMO DATA
            </div>
          )}
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, opacity: 0.4 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
          </div>
          <button onClick={() => { fetchMetrics(); fetchLoads() }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.25)", color: "#f5f5f0", fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "6px 14px", cursor: "pointer", letterSpacing: "0.1em" }}>
            ↺ REFRESH
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1360, margin: "0 auto", padding: "40px 40px 80px" }}>

        {/* ── Filters ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 40, alignItems: "center" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.15em", opacity: 0.5 }}>FILTER</span>
          {["", "Booked with negotiations", "Booked without negotiations", "Not booked with negotiations", "Not booked without negotiations", "Not match", "Unknown"].map(o => (
            <button key={o} onClick={() => { setFilter(f => ({ ...f, outcome: o })); setPage(0) }}
              style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "5px 14px", cursor: "pointer", letterSpacing: "0.08em", border: "1.5px solid #0a0a0a", background: filter.outcome === o ? "#0a0a0a" : "transparent", color: filter.outcome === o ? "#f5f5f0" : "#0a0a0a", transition: "all .1s" }}>
              {o || "ALL"}
            </button>
          ))}
          <div style={{ width: 1, height: 24, background: "#0a0a0a", opacity: 0.2, margin: "0 4px" }} />
          {["", "positive", "neutral", "negative"].map(s => (
            <button key={s} onClick={() => { setFilter(f => ({ ...f, sentiment: s })); setPage(0) }}
              style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "5px 14px", cursor: "pointer", letterSpacing: "0.08em", border: "1.5px solid #0a0a0a", background: filter.sentiment === s ? "#0a0a0a" : "transparent", color: filter.sentiment === s ? "#f5f5f0" : "#0a0a0a", transition: "all .1s" }}>
              {s || "ALL SENTIMENT"}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: "0.2em", opacity: 0.3 }}>LOADING METRICS...</div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 48 }}>
              <KPICard label="Total Processes"  value={total}              sub="all time records"     accent />
              <KPICard label="Booking Rate"     value={`${bookedPct}%`}    sub={`${booked} booked`}          />
              <KPICard label="Avg Price Diff"   value={`$${fmt(avgPriceDiff, 0)}`} sub="vs loadboard rate"  />
              <KPICard label="Avg Duration"     value={`${fmt(avgDuration, 1)}s`}  sub="seconds per call"   />
              <KPICard label="Valid MC Numbers" value={`${validMC}/${total}`}       sub="carrier verification" />
            </div>

            {/* ── Available Loads ── */}
            {loads.length > 0 && (() => {
              const loadsTableData = loads.slice(loadsPage * PAGE_SIZE, (loadsPage + 1) * PAGE_SIZE)
              const loadsTotalPages = Math.ceil(loads.length / PAGE_SIZE)
              return (
                <div style={{ background: "#fff", border: "1.5px solid #0a0a0a", overflow: "hidden", marginBottom: 24 }}>
                  <div style={{ padding: "20px 24px 0", marginBottom: 0 }}>
                    <SectionTitle>Available Loads ({loads.length})</SectionTitle>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#0a0a0a", color: "#f5f5f0" }}>
                        {["ID","Origin","Destination","Pickup","Delivery","Equipment","Rate","Weight","Miles","Commodity"].map(h => (
                          <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 400, letterSpacing: "0.08em", fontSize: 10, opacity: 0.7, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loadsTableData.map((row, i) => (
                        <tr key={row.load_id} style={{ borderBottom: "1px solid #e8e8e3", background: i % 2 === 0 ? "#fff" : "#fafaf8" }}>
                          <td style={{ padding: "10px 16px", fontWeight: 500 }}>{row.load_id}</td>
                          <td style={{ padding: "10px 16px" }}>{row.origin}</td>
                          <td style={{ padding: "10px 16px" }}>{row.destination}</td>
                          <td style={{ padding: "10px 16px", opacity: 0.6, whiteSpace: "nowrap" }}>{(row.pickup_datetime || "").slice(0, 16)}</td>
                          <td style={{ padding: "10px 16px", opacity: 0.6, whiteSpace: "nowrap" }}>{(row.delivery_datetime || "").slice(0, 16)}</td>
                          <td style={{ padding: "10px 16px" }}>{row.equipment_type}</td>
                          <td style={{ padding: "10px 16px" }}>{row.loadboard_rate != null ? `$${Number(row.loadboard_rate).toFixed(0)}` : "—"}</td>
                          <td style={{ padding: "10px 16px" }}>{row.weight != null ? `${Number(row.weight).toLocaleString()} lbs` : "—"}</td>
                          <td style={{ padding: "10px 16px" }}>{row.miles != null ? Number(row.miles).toLocaleString() : "—"}</td>
                          <td style={{ padding: "10px 16px" }}>{row.commodity_type || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderTop: "1px solid #e8e8e3" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, opacity: 0.4 }}>
                      {loadsPage * PAGE_SIZE + 1}–{Math.min((loadsPage + 1) * PAGE_SIZE, loads.length)} of {loads.length} loads
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setLoadsPage(p => Math.max(0, p - 1))} disabled={loadsPage === 0}
                        style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "5px 14px", cursor: loadsPage === 0 ? "not-allowed" : "pointer", border: "1.5px solid #0a0a0a", background: "transparent", opacity: loadsPage === 0 ? 0.3 : 1 }}>← PREV</button>
                      <button onClick={() => setLoadsPage(p => Math.min(loadsTotalPages - 1, p + 1))} disabled={loadsPage >= loadsTotalPages - 1}
                        style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "5px 14px", cursor: loadsPage >= loadsTotalPages - 1 ? "not-allowed" : "pointer", border: "1.5px solid #0a0a0a", background: "transparent", opacity: loadsPage >= loadsTotalPages - 1 ? 0.3 : 1 }}>NEXT →</button>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ── Charts Row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>

              {/* Outcomes bar */}
              <div style={{ background: "#fff", border: "1.5px solid #0a0a0a", padding: "28px 24px" }}>
                <SectionTitle>Outcomes</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={outcomeChartData} barSize={36}>
                    <CartesianGrid vertical={false} stroke="#e8e8e3" />
                    <XAxis dataKey="name" tick={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f5f5f0" }} />
                    <Bar dataKey="value" name="count">
                      {outcomeChartData.map((entry) => (
                        <Cell key={entry.name} fill={OUTCOME_COLORS[entry.name] || "#0a0a0a"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Sentiment donut */}
              <div style={{ background: "#fff", border: "1.5px solid #0a0a0a", padding: "28px 24px" }}>
                <SectionTitle>Sentiment Breakdown</SectionTitle>
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  <ResponsiveContainer width="55%" height={220}>
                    <PieChart>
                      <Pie data={sentimentChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} strokeWidth={0}>
                        {sentimentChartData.map((entry) => (
                          <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name] || "#0a0a0a"} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {sentimentChartData.map(entry => (
                      <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 12, height: 12, background: SENTIMENT_COLORS[entry.name] || "#0a0a0a", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "capitalize" }}>{entry.name}</div>
                          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, lineHeight: 1 }}>{entry.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Price Diff Timeline ── */}
            <div style={{ background: "#0a0a0a", border: "1.5px solid #0a0a0a", padding: "28px 24px", marginBottom: 24 }}>
              <SectionTitle><span style={{ color: "#f5f5f0" }}>Avg Price Diff Over Time</span></SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={priceDiffByDay}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="day" tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="avg_price_diff" name="avg $diff" stroke="#f5f5f0" strokeWidth={2} dot={{ fill: "#f5f5f0", r: 3 }} activeDot={{ r: 5 }} />
                  {/* Zero reference line */}
                  <Line type="monotone" data={priceDiffByDay.map(d => ({ ...d, zero: 0 }))} dataKey="zero" stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" strokeWidth={1} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ── Table ── */}
            <div style={{ background: "#fff", border: "1.5px solid #0a0a0a", overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "20px 24px 0", marginBottom: 0 }}>
                <SectionTitle>Recent Records</SectionTitle>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#0a0a0a", color: "#f5f5f0" }}>
                    {["Recorded At","Load","Carrier","MC #","MC Valid","Price Diff","Duration","Sentiment","Outcome"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 400, letterSpacing: "0.08em", fontSize: 10, opacity: 0.7, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e8e8e3", background: i % 2 === 0 ? "#fff" : "#fafaf8" }}>
                      <td style={{ padding: "10px 16px", opacity: 0.5, whiteSpace: "nowrap" }}>{(row.recorded_at || "").slice(0, 16)}</td>
                      <td style={{ padding: "10px 16px", fontWeight: 500 }}>{row.load_info}</td>
                      <td style={{ padding: "10px 16px", whiteSpace: "nowrap", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{row.carrier_legal_name}</td>
                      <td style={{ padding: "10px 16px", opacity: 0.7 }}>{row.carrier_mc_number}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}>
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: (row.carrier_mc_number_validity === true || row.carrier_mc_number_validity === "True") ? "#0a0a0a" : "#ccc" }} />
                      </td>
                      <td style={{ padding: "10px 16px", color: parseFloat(row.price_diff) >= 0 ? "#0a0a0a" : "#888" }}>
                        {parseFloat(row.price_diff) >= 0 ? "+" : ""}{parseFloat(row.price_diff).toFixed(2)}
                      </td>
                      <td style={{ padding: "10px 16px" }}>{parseFloat(row.duration).toFixed(1)}m</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ display: "inline-block", padding: "2px 8px", background: SENTIMENT_COLORS[row.sentiment] || "#0a0a0a", color: row.sentiment === "positive" ? "#f5f5f0" : row.sentiment === "neutral" ? "#f5f5f0" : "#0a0a0a", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          {row.sentiment}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ display: "inline-block", padding: "2px 8px", background: OUTCOME_COLORS[row.outcome] || "#0a0a0a", color: row.outcome === "cancelled" ? "#0a0a0a" : row.outcome === "pending" ? "#0a0a0a" : "#f5f5f0", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          {row.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderTop: "1px solid #e8e8e3" }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, opacity: 0.4 }}>
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} records
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "5px 14px", cursor: page === 0 ? "not-allowed" : "pointer", border: "1.5px solid #0a0a0a", background: "transparent", opacity: page === 0 ? 0.3 : 1 }}>← PREV</button>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "5px 14px", cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", border: "1.5px solid #0a0a0a", background: "transparent", opacity: page >= totalPages - 1 ? 0.3 : 1 }}>NEXT →</button>
                </div>
              </div>
            </div>

          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1.5px solid #0a0a0a", padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <HappyTransportLogo size={24} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, opacity: 0.4, letterSpacing: "0.1em" }}>HAPPY TRANSPORT © {new Date().getFullYear()}</span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, opacity: 0.3 }}>METRICS DASHBOARD v1.0</span>
      </footer>

    </div>
  )
}
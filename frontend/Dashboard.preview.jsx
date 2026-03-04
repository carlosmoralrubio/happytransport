import { useState, useEffect, useCallback } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts"

const HappyTransportLogo = ({ size = 48, inverted = false }) => {
  const bg = inverted ? "#f5f5f0" : "#0a0a0a"
  const fg = inverted ? "#0a0a0a" : "#f5f5f0"
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill={bg} />
      <rect x="0" y="38" width="64" height="3" fill={fg} opacity="0.25" />
      <rect x="8" y="20" width="30" height="18" fill={fg} />
      <rect x="38" y="26" width="14" height="12" fill={fg} />
      <rect x="40" y="28" width="9" height="7" fill={bg} opacity="0.7" />
      <circle cx="17" cy="40" r="5" fill={bg} stroke={fg} strokeWidth="2.5" />
      <circle cx="42" cy="40" r="5" fill={bg} stroke={fg} strokeWidth="2.5" />
      <rect x="2" y="27" width="5" height="1.5" fill={fg} opacity="0.4" />
      <rect x="2" y="31" width="7" height="1.5" fill={fg} opacity="0.4" />
      <rect x="2" y="35" width="4" height="1.5" fill={fg} opacity="0.4" />
    </svg>
  )
}

const OUTCOME_COLORS  = { booked:"#0a0a0a", rejected:"#555", no_capacity:"#888", cancelled:"#bbb", pending:"#ddd" }
const SENTIMENT_COLORS= { positive:"#0a0a0a", neutral:"#888", negative:"#ccc" }

const MOCK_METRICS = Array.from({ length: 40 }, (_, i) => {
  const outcomes   = ["booked","booked","booked","rejected","no_capacity","cancelled","pending"]
  const sentiments = ["positive","positive","neutral","negative"]
  const d = new Date(2026, 2, 1 + Math.floor(i / 3))
  return {
    recorded_at: d.toISOString().slice(0,16),
    load_info: `L${String(i+1).padStart(3,"0")}`,
    carrier_legal_name: ["Swift Transport","Ryder Logistics","J.B. Hunt","Werner Enterprises","Knight-Swift"][i%5],
    carrier_mc_number: `MC-${100000+i*7}`,
    carrier_mc_number_validity: i%9!==0,
    price_diff: parseFloat((Math.random()*600-200).toFixed(2)),
    duration: parseFloat((Math.random()*30+2).toFixed(1)),
    sentiment: sentiments[i%sentiments.length],
    outcome: outcomes[i%outcomes.length],
  }
})

const fmt = (n, d=0) => typeof n==="number" ? n.toFixed(d) : "—"
const countBy = (arr, key) => arr.reduce((acc,row)=>{ acc[row[key]]=(acc[row[key]]||0)+1; return acc },{})

const KPICard = ({ label, value, sub, accent }) => {
  const [hover, setHover] = useState(false)
  return (
    <div style={{ background:accent?"#0a0a0a":"#fff", color:accent?"#f5f5f0":"#0a0a0a", border:"1.5px solid #0a0a0a", padding:"24px 20px", display:"flex", flexDirection:"column", gap:5, transform:hover?"translateY(-3px)":"translateY(0)", transition:"transform .15s", cursor:"default" }}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:"0.15em", opacity:0.55, textTransform:"uppercase" }}>{label}</span>
      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:46, lineHeight:1 }}>{value}</span>
      {sub&&<span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, opacity:0.5 }}>{sub}</span>}
    </div>
  )
}

const SectionTitle = ({ children }) => (
  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:"0.08em" }}>{children}</span>
    <div style={{ flex:1, height:1, background:"#0a0a0a", opacity:0.15 }} />
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null
  return (
    <div style={{ background:"#0a0a0a", color:"#f5f5f0", padding:"8px 12px", fontFamily:"'DM Mono',monospace", fontSize:11 }}>
      <div style={{ opacity:0.6, marginBottom:3 }}>{label}</div>
      {payload.map((p,i)=><div key={i}>{p.name}: <strong>{typeof p.value==="number"?p.value.toFixed(1):p.value}</strong></div>)}
    </div>
  )
}

export default function App() {
  const [metrics,  setMetrics]  = useState(MOCK_METRICS)
  const [filter,   setFilter]   = useState({ outcome:"", sentiment:"" })
  const [page,     setPage]     = useState(0)
  const PAGE_SIZE = 8

  const filtered = metrics.filter(m =>
    (!filter.outcome   || m.outcome===filter.outcome) &&
    (!filter.sentiment || m.sentiment===filter.sentiment)
  )

  const total       = filtered.length
  const booked      = filtered.filter(m=>m.outcome==="booked").length
  const bookedPct   = total ? Math.round(booked/total*100) : 0
  const avgPriceDiff= total ? filtered.reduce((s,m)=>s+parseFloat(m.price_diff||0),0)/total : 0
  const avgDuration = total ? filtered.reduce((s,m)=>s+parseFloat(m.duration||0),0)/total : 0
  const validMC     = filtered.filter(m=>m.carrier_mc_number_validity===true).length

  const outcomeCounts   = countBy(filtered,"outcome")
  const sentimentCounts = countBy(filtered,"sentiment")
  const outcomeChartData   = Object.entries(outcomeCounts).map(([name,value])=>({name,value}))
  const sentimentChartData = Object.entries(sentimentCounts).map(([name,value])=>({name,value}))

  const priceDiffByDay = Object.entries(
    filtered.reduce((acc,m)=>{
      const day=(m.recorded_at||"").slice(0,10); if(!day) return acc
      if(!acc[day]) acc[day]={day,total:0,count:0}
      acc[day].total+=parseFloat(m.price_diff||0); acc[day].count+=1; return acc
    },{})
  ).map(([,v])=>({day:v.day,avg_price_diff:parseFloat((v.total/v.count).toFixed(2))}))
   .sort((a,b)=>a.day.localeCompare(b.day))

  const tableData  = filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE)
  const totalPages = Math.ceil(total/PAGE_SIZE)

  return (
    <div style={{ minHeight:"100vh", background:"#f5f5f0", fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#f5f5f0}::-webkit-scrollbar-thumb{background:#0a0a0a}`}</style>

      {/* Header */}
      <header style={{ background:"#0a0a0a", color:"#f5f5f0", padding:"0 32px", display:"flex", alignItems:"center", justifyContent:"space-between", height:68, position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <HappyTransportLogo size={40} />
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:"0.12em", lineHeight:1 }}>Happy Transport</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:"0.2em", opacity:0.4, textTransform:"uppercase" }}>Metrics Dashboard</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, opacity:0.35 }}>
            {new Date().toLocaleDateString("en-US",{weekday:"short",year:"numeric",month:"short",day:"numeric"})}
          </div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:"0.1em", background:"rgba(255,255,255,0.12)", color:"#f5f5f0", padding:"4px 10px" }}>
            ⚡ DEMO DATA
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1280, margin:"0 auto", padding:"36px 32px 72px" }}>

        {/* Filters */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:36, alignItems:"center" }}>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:"0.15em", opacity:0.45, marginRight:4 }}>OUTCOME</span>
          {["","booked","rejected","no_capacity","cancelled","pending"].map(o=>(
            <button key={o} onClick={()=>{setFilter(f=>({...f,outcome:o}));setPage(0)}}
              style={{ fontFamily:"'DM Mono',monospace", fontSize:10, padding:"4px 12px", cursor:"pointer", letterSpacing:"0.08em", border:"1.5px solid #0a0a0a", background:filter.outcome===o?"#0a0a0a":"transparent", color:filter.outcome===o?"#f5f5f0":"#0a0a0a", transition:"all .1s" }}>
              {o||"ALL"}
            </button>
          ))}
          <div style={{ width:1, height:20, background:"#0a0a0a", opacity:0.2, margin:"0 4px" }} />
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:"0.15em", opacity:0.45, marginRight:4 }}>SENTIMENT</span>
          {["","positive","neutral","negative"].map(s=>(
            <button key={s} onClick={()=>{setFilter(f=>({...f,sentiment:s}));setPage(0)}}
              style={{ fontFamily:"'DM Mono',monospace", fontSize:10, padding:"4px 12px", cursor:"pointer", letterSpacing:"0.08em", border:"1.5px solid #0a0a0a", background:filter.sentiment===s?"#0a0a0a":"transparent", color:filter.sentiment===s?"#f5f5f0":"#0a0a0a", transition:"all .1s" }}>
              {s||"ALL"}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:40 }}>
          <KPICard label="Total Processes"  value={total}                          sub="all records"          accent />
          <KPICard label="Booking Rate"     value={`${bookedPct}%`}               sub={`${booked} booked`}         />
          <KPICard label="Avg Price Diff"   value={`$${fmt(avgPriceDiff,0)}`}     sub="vs loadboard rate"          />
          <KPICard label="Avg Duration"     value={`${fmt(avgDuration,1)}m`}      sub="minutes to close"           />
          <KPICard label="Valid MC"         value={`${validMC}/${total}`}          sub="carrier verification"       />
        </div>

        {/* Charts row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
          <div style={{ background:"#fff", border:"1.5px solid #0a0a0a", padding:"24px 20px" }}>
            <SectionTitle>Outcomes</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={outcomeChartData} barSize={32}>
                <CartesianGrid vertical={false} stroke="#e8e8e3" />
                <XAxis dataKey="name" tick={{ fontFamily:"'DM Mono',monospace", fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily:"'DM Mono',monospace", fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill:"#f5f5f0" }} />
                <Bar dataKey="value" name="count">
                  {outcomeChartData.map(e=><Cell key={e.name} fill={OUTCOME_COLORS[e.name]||"#0a0a0a"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background:"#fff", border:"1.5px solid #0a0a0a", padding:"24px 20px" }}>
            <SectionTitle>Sentiment Breakdown</SectionTitle>
            <div style={{ display:"flex", alignItems:"center", gap:20 }}>
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={sentimentChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={82} strokeWidth={0}>
                    {sentimentChartData.map(e=><Cell key={e.name} fill={SENTIMENT_COLORS[e.name]||"#0a0a0a"} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {sentimentChartData.map(e=>(
                  <div key={e.name} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:10, height:10, background:SENTIMENT_COLORS[e.name]||"#0a0a0a", flexShrink:0, border:"1px solid #0a0a0a" }} />
                    <div>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, textTransform:"capitalize", opacity:0.6 }}>{e.name}</div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, lineHeight:1 }}>{e.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Price diff timeline */}
        <div style={{ background:"#0a0a0a", border:"1.5px solid #0a0a0a", padding:"24px 20px", marginBottom:20 }}>
          <SectionTitle><span style={{ color:"#f5f5f0" }}>Avg Price Diff Over Time (USD)</span></SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={priceDiffByDay}>
              <CartesianGrid stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="day" tick={{ fontFamily:"'DM Mono',monospace", fontSize:9, fill:"#777" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily:"'DM Mono',monospace", fontSize:9, fill:"#777" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="avg_price_diff" name="avg $diff" stroke="#f5f5f0" strokeWidth={2} dot={{ fill:"#f5f5f0", r:3 }} activeDot={{ r:5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div style={{ background:"#fff", border:"1.5px solid #0a0a0a", overflow:"hidden" }}>
          <div style={{ padding:"20px 20px 0" }}><SectionTitle>Recent Records</SectionTitle></div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"'DM Mono',monospace", fontSize:11 }}>
              <thead>
                <tr style={{ background:"#0a0a0a", color:"#f5f5f0" }}>
                  {["Recorded At","Load","Carrier","MC #","Valid","Price Diff","Duration","Sentiment","Outcome"].map(h=>(
                    <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:400, letterSpacing:"0.08em", fontSize:9, opacity:0.65, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row,i)=>(
                  <tr key={i} style={{ borderBottom:"1px solid #e8e8e3", background:i%2===0?"#fff":"#fafaf8" }}>
                    <td style={{ padding:"9px 14px", opacity:0.45, whiteSpace:"nowrap" }}>{(row.recorded_at||"").slice(0,16)}</td>
                    <td style={{ padding:"9px 14px", fontWeight:500 }}>{row.load_info}</td>
                    <td style={{ padding:"9px 14px", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{row.carrier_legal_name}</td>
                    <td style={{ padding:"9px 14px", opacity:0.6 }}>{row.carrier_mc_number}</td>
                    <td style={{ padding:"9px 14px", textAlign:"center" }}>
                      <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:row.carrier_mc_number_validity===true?"#0a0a0a":"#ccc" }} />
                    </td>
                    <td style={{ padding:"9px 14px", color:parseFloat(row.price_diff)>=0?"#0a0a0a":"#888" }}>
                      {parseFloat(row.price_diff)>=0?"+":""}{parseFloat(row.price_diff).toFixed(2)}
                    </td>
                    <td style={{ padding:"9px 14px" }}>{parseFloat(row.duration).toFixed(1)}m</td>
                    <td style={{ padding:"9px 14px" }}>
                      <span style={{ display:"inline-block", padding:"2px 7px", background:SENTIMENT_COLORS[row.sentiment]||"#0a0a0a", color:row.sentiment==="negative"?"#0a0a0a":"#f5f5f0", fontSize:9, letterSpacing:"0.06em", textTransform:"uppercase" }}>
                        {row.sentiment}
                      </span>
                    </td>
                    <td style={{ padding:"9px 14px" }}>
                      <span style={{ display:"inline-block", padding:"2px 7px", background:OUTCOME_COLORS[row.outcome]||"#0a0a0a", color:["cancelled","pending"].includes(row.outcome)?"#0a0a0a":"#f5f5f0", fontSize:9, letterSpacing:"0.06em", textTransform:"uppercase" }}>
                        {row.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", borderTop:"1px solid #e8e8e3" }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, opacity:0.4 }}>
              {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,total)} of {total} records
            </span>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
                style={{ fontFamily:"'DM Mono',monospace", fontSize:10, padding:"4px 12px", cursor:page===0?"not-allowed":"pointer", border:"1.5px solid #0a0a0a", background:"transparent", opacity:page===0?0.3:1 }}>← PREV</button>
              <button onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1}
                style={{ fontFamily:"'DM Mono',monospace", fontSize:10, padding:"4px 12px", cursor:page>=totalPages-1?"not-allowed":"pointer", border:"1.5px solid #0a0a0a", background:"transparent", opacity:page>=totalPages-1?0.3:1 }}>NEXT →</button>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ borderTop:"1.5px solid #0a0a0a", padding:"18px 32px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <HappyTransportLogo size={22} />
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, opacity:0.35, letterSpacing:"0.1em" }}>HAPPY TRANSPORT © {new Date().getFullYear()}</span>
        </div>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, opacity:0.3 }}>METRICS DASHBOARD v1.0</span>
      </footer>
    </div>
  )
}

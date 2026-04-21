import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts'
import * as XLSX from 'xlsx'

const REGION_NAMES = {
  1:'เชียงใหม่', 2:'พิษณุโลก', 3:'นครสวรรค์', 4:'สระบุรี',
  5:'ราชบุรี',   6:'ชลบุรี',   7:'ขอนแก่น',   8:'อุดรธานี',
  9:'นครราชสีมา',10:'อุบลราชธานี',11:'สุราษฎร์ธานี',12:'สงขลา',
}
const COLORS = ['#2563eb','#10b981','#f59e0b','#7c3aed','#06b6d4','#ef4444','#f97316','#84cc16','#e879f9','#0ea5e9','#a3e635','#fb7185']
const fmt = n => Number(n || 0).toLocaleString()
const fmtK = n => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : String(n||0)

const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt">
    <div className="tt-label">{label}</div>
    {payload.map((p, i) => (
      <div key={i} className="tt-value" style={{ color: p.color || 'var(--text-primary)' }}>
        {p.name}: {fmt(p.value)}
      </div>
    ))}
  </div>
) : null

const PAGE_SIZE = 50

export default function ProductionData({ data, prodLoading, prodError, prodCountdown, prodSheetUrl, setProdSheetUrl, onRetryProd }) {
  const { productionDates = [], installList = [] } = data

  // build hospcode → province map จาก installList (match ด้วย parseInt เพื่อข้าม leading zeros)
  const provinceMap = {}
  installList.forEach(r => {
    if (!r.hospcode) return
    const key = parseInt(r.hospcode, 10)
    if (!isNaN(key)) provinceMap[key] = r.province?.includes('-') ? r.province.split('-').slice(1).join('-') : (r.province || '')
  })

  const productionVisits = (data.productionVisits || [])
    .filter(h => h.total > 0)
    .map(h => ({ ...h, province: provinceMap[parseInt(h.hospcode, 10)] || '' }))
  const fmtCountdown = s => `${Math.floor((s||0)/60)}:${String((s||0)%60).padStart(2,'0')}`
  const [showUrlEdit, setShowUrlEdit] = useState(false)
  const [urlInput, setUrlInput] = useState(prodSheetUrl || '')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [filterProvince, setFilterProvince] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('latest') // 'latest' | 'total' | 'name'
  const [page, setPage] = useState(1)
  const [provSearch, setProvSearch] = useState('')
  const [provRegion, setProvRegion] = useState('')
  const [provMinPct, setProvMinPct] = useState('')
  const [showAllProv, setShowAllProv] = useState(false)
  const [showZeroProv, setShowZeroProv] = useState(false)
  const [hoveredProv, setHoveredProv] = useState(null)
  const [simSelected, setSimSelected] = useState([]) // จังหวัดที่เลือกใน simulator
  const [simSearch, setSimSearch] = useState('')
  const [simTarget, setSimTarget] = useState('80') // % เป้าหมาย
  const [exportProvince, setExportProvince] = useState('__all__')
  const [expandedPilot, setExpandedPilot] = useState({})

  const availableRegions = [...new Set(productionVisits.map(h => h.region))].sort((a, b) => a - b)

  // aggregate by region
  const regionStats = {}
  productionVisits.forEach(h => {
    const r = h.region
    if (!regionStats[r]) regionStats[r] = { total: 0, latest: 0, count: 0, byDate: productionDates.map(() => 0) }
    regionStats[r].total  += h.total
    regionStats[r].latest += h.latest
    regionStats[r].count++
    h.visits.forEach((v, di) => { regionStats[r].byDate[di] += v })
  })

  const grandTotal  = productionVisits.reduce((a, h) => a + h.total, 0)
  const grandLatest = productionVisits.reduce((a, h) => a + h.latest, 0)
  const totalHosp   = productionVisits.length

  // region bar data (sorted by region number)
  const regionBarData = Object.entries(regionStats)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([r, s]) => ({
      name: `เขต ${r}`,
      region: Number(r),
      'วันล่าสุด': s.latest,
      'รวม 3 วัน': s.total,
      count: s.count,
    }))

  // daily trend (all regions combined)
  const trendData = productionDates.map((d, di) => {
    const obj = { date: d }
    availableRegions.forEach(r => {
      obj[`เขต ${r}`] = regionStats[r]?.byDate[di] || 0
    })
    obj['รวมทุกเขต'] = productionVisits.reduce((a, h) => a + (h.visits[di] || 0), 0)
    return obj
  })

  // filtered table
  const uniqueProvinces = [...new Set(productionVisits.map(h => h.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'))

  // province rank map
  // cross-check ติดตั้งแล้ว vs ใช้งาน
  const installedSet = new Set(
    installList.filter(r => r.progress === 'ดำเนินการแล้ว').map(r => parseInt(r.hospcode, 10))
  )
  const prodSet = new Set(productionVisits.map(h => parseInt(h.hospcode, 10)))
  const installedTotal   = installedSet.size
  const installedUsing   = [...installedSet].filter(c => prodSet.has(c)).length
  const installedNotUsing = installedTotal - installedUsing

  // แยกตามเขต
  const regionCross = {}
  installList.filter(r => r.progress === 'ดำเนินการแล้ว').forEach(r => {
    const reg = r.region
    if (!reg) return
    if (!regionCross[reg]) regionCross[reg] = { installed: 0, using: 0 }
    regionCross[reg].installed++
    if (prodSet.has(parseInt(r.hospcode, 10))) regionCross[reg].using++
  })
  const regionCrossData = Object.entries(regionCross)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([r, v]) => ({ name: `เขต ${r}`, region: Number(r), ...v, pct: v.installed > 0 ? Math.round((v.using / v.installed) * 100) : 0 }))

  // ยอดติดตั้งแล้วแยกจังหวัด (normalize ชื่อ "50-เชียงใหม่" → "เชียงใหม่")
  const installedByProv = {}
  const notUsingByProv = {}  // province → [{hospcode, name}]
  installList.filter(r => r.progress === 'ดำเนินการแล้ว').forEach(r => {
    const p = r.province?.includes('-') ? r.province.split('-').slice(1).join('-') : (r.province || '')
    if (!p) return
    installedByProv[p] = (installedByProv[p] || 0) + 1
    if (!prodSet.has(parseInt(r.hospcode, 10))) {
      if (!notUsingByProv[p]) notUsingByProv[p] = []
      notUsingByProv[p].push({ hospcode: r.hospcode, name: r.name || '', remark: r.remark || '', responsible: r.responsible || '' })
    }
  })

  const provMap = {}
  productionVisits.forEach(h => {
    if (!h.province) return
    if (!provMap[h.province]) provMap[h.province] = { count: 0, latest: 0, total: 0, regions: new Set() }
    provMap[h.province].count++
    provMap[h.province].latest += h.latest
    provMap[h.province].total  += h.total
    if (h.region) provMap[h.province].regions.add(h.region)
  })
  // รวมจังหวัดที่มี 0 usage (ติดตั้งแล้วแต่ไม่ส่งข้อมูลเลย)
  const zeroProvEntries = Object.keys(installedByProv)
    .filter(p => !provMap[p])
    .map(p => [p, { count: 0, latest: 0, total: 0, regions: new Set() }])
  const allProvRankedBase = Object.entries(provMap).sort((a, b) => {
    const pctA = installedByProv[a[0]] > 0 ? a[1].count / installedByProv[a[0]] : 0
    const pctB = installedByProv[b[0]] > 0 ? b[1].count / installedByProv[b[0]] : 0
    return pctB - pctA
  })
  const allProvRanked = showZeroProv
    ? [...allProvRankedBase, ...zeroProvEntries]
    : allProvRankedBase
  const provFiltered = (() => {
    let list = allProvRanked
    if (provRegion) list = list.filter(([, s]) => s.regions.has(Number(provRegion)))
    if (provSearch) list = list.filter(([p]) => p.includes(provSearch))
    if (provMinPct) {
      const min = Number(provMinPct)
      list = list.filter(([p, s]) => {
        const inst = installedByProv[p] || 0
        if (inst === 0) return false
        return Math.round((s.count / inst) * 100) >= min
      })
    }
    return (provSearch || provRegion || provMinPct || showAllProv) ? list : list.slice(0, 10)
  })()
  const maxProvCount = Math.max(
    allProvRanked[0]?.[1].count || 1,
    ...Object.values(installedByProv)
  )

  const filtered = productionVisits
    .filter(h => {
      if (selectedRegion && String(h.region) !== selectedRegion) return false
      if (filterProvince && h.province !== filterProvince) return false
      if (search && !h.hospcode.includes(search) && !h.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'latest') return b.latest - a.latest
      if (sortBy === 'total')  return b.total - a.total
      return a.name.localeCompare(b.name, 'th')
    })
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (prodLoading && productionVisits.length === 0) {
    return (
      <div className="page">
        <div className="page-title">📈 ข้อมูลการใช้งาน</div>
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>กำลังโหลดข้อมูลการใช้งาน...</div>
          <div style={{ fontSize: 12 }}>ดึงข้อมูลจาก Google Sheets · หมดเวลาใน 20 วินาที</div>
        </div>
      </div>
    )
  }

  if (prodError && productionVisits.length === 0) {
    return (
      <div className="page">
        <div className="page-title">📈 ข้อมูลการใช้งาน</div>
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#ef4444', marginBottom: 6 }}>โหลดข้อมูลไม่สำเร็จ</div>
          <div style={{ fontSize: 12, marginBottom: 16, color: '#64748b' }}>{prodError}</div>
          <button
            onClick={onRetryProd}
            style={{ padding: '8px 20px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >🔄 ลองใหม่</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-title">📈 ข้อมูลการใช้งาน</div>
      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        {/* สถานะ */}
        {prodLoading ? (
          <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 6, padding: '3px 10px' }}>
            ⏳ กำลังโหลด...
          </span>
        ) : prodError ? (
          <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '3px 10px' }}>
            ⚠️ {prodError}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600, background: '#dcfce7', border: '1px solid #86efac', borderRadius: 6, padding: '3px 10px' }}>
            ✅ โหลดสำเร็จ
          </span>
        )}

        {/* countdown */}
        {!prodLoading && prodCountdown != null && (
          <span style={{ fontSize: 11, color: '#64748b' }}>
            🔁 Auto refresh ใน {fmtCountdown(prodCountdown)}
          </span>
        )}

        {/* ปุ่ม Refresh */}
        <button
          onClick={onRetryProd}
          disabled={prodLoading}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: prodLoading ? 'not-allowed' : 'pointer',
            background: prodLoading ? '#f1f5f9' : '#2563eb',
            color: prodLoading ? '#94a3b8' : '#fff',
            border: '1px solid ' + (prodLoading ? '#e2e8f0' : '#1d4ed8'),
          }}
        >
          🔄 {prodLoading ? 'กำลังโหลด...' : 'Refresh'}
        </button>

        {/* ปุ่มเปลี่ยน URL */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowUrlEdit(v => !v); setUrlInput(prodSheetUrl || '') }}
            style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}
          >
            🔗 เปลี่ยน URL
          </button>
          {showUrlEdit && (
            <div style={{
              position: 'absolute', top: '110%', left: 0, zIndex: 100, minWidth: 380,
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 14,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>🔗 Google Sheets URL</div>
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, boxSizing: 'border-box', marginBottom: 8, color: 'var(--text-primary)', background: 'var(--bg-main)' }}
                autoFocus
              />
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>⚠️ Sheet ต้องเปิดเป็น Public (Anyone with link)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    if (setProdSheetUrl) setProdSheetUrl(urlInput)
                    setShowUrlEdit(false)
                    onRetryProd && onRetryProd(urlInput)
                  }}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                >บันทึกและโหลด</button>
                <button
                  onClick={() => setShowUrlEdit(false)}
                  style={{ padding: '6px 14px', borderRadius: 6, background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 12 }}
                >ยกเลิก</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="page-desc" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span>OPD Visit รายวัน · {availableRegions.length} เขต · {fmt(totalHosp)} หน่วยบริการ</span>
        {productionDates.length > 0 && (
          <span style={{
            background: '#dcfce7', color: '#15803d',
            border: '1px solid #86efac',
            borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700
          }}>
            ข้อมูล ณ วันที่ {productionDates[productionDates.length - 1]}
          </span>
        )}
      </div>

      {/* KPI */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginTop: 20 }}>
        {[
          { color: 'c-blue',   icon: '🏥', val: fmt(totalHosp),   label: 'รพ.สต. ที่ส่งข้อมูล' },
          { color: 'c-green',  icon: '🏃', val: fmtK(grandLatest), label: `OPD Visit วันล่าสุด`, sub: fmt(grandLatest) + ' ครั้ง' },
          { color: 'c-orange', icon: '📅', val: fmtK(grandTotal),  label: `รวม ${productionDates.length} วัน`, sub: fmt(grandTotal) + ' ครั้ง' },
          { color: 'c-purple', icon: '🗺️', val: availableRegions.length + ' เขต', label: 'เขตที่มีข้อมูล', sub: availableRegions.map(r => `เขต ${r}`).join(', ') },
        ].map((k, i) => (
          <div key={i} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-label">{k.label}</div>
            {k.sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* ติดตั้งแล้ว vs ใช้งาน */}
      {installedTotal > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 24 }}>📊 ติดตั้งแล้ว → ใช้งาน</div>
          <div className="chart-card" style={{ marginBottom: 22 }}>
            <div className="chart-header">
              <div>
                <div className="chart-title">รพ.สต. ที่ดำเนินการติดตั้งแล้ว เทียบกับที่ส่งข้อมูลจริง</div>
                <div className="chart-sub">ใช้งาน = มี OPD Visit &gt; 0 ใน 3 วันล่าสุด</div>
              </div>
              <span className="chart-badge">Cross</span>
            </div>

            {/* KPI row */}
            {(() => {
              const usePct = installedTotal > 0 ? (installedUsing / installedTotal) * 100 : 0
              const pctColor = usePct >= 80 ? '#10b981' : usePct >= 50 ? '#f59e0b' : '#ef4444'
              const r = 42, circ = 2 * Math.PI * r
              const dash = (usePct / 100) * circ
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 16, marginBottom: 20, alignItems: 'center' }}>
                  {/* donut */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ position: 'relative', width: 110, height: 110 }}>
                      <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="55" cy="55" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                        <circle cx="55" cy="55" r={r} fill="none" stroke={pctColor} strokeWidth="10"
                          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 22, fontWeight: 900, color: pctColor, lineHeight: 1 }}>{usePct.toFixed(1)}</span>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>%</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textAlign: 'center' }}>อัตราใช้งาน</div>
                  </div>

                  {/* ติดตั้งแล้ว + ใช้งาน */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      {
                        icon: (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="11" fill="#2563eb" opacity="0.15"/>
                            <circle cx="12" cy="12" r="11" stroke="#2563eb" strokeWidth="1.5"/>
                            <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ),
                        label: 'ติดตั้งแล้ว (ดำเนินการแล้ว)', val: installedTotal, color: '#2563eb', bg: '#dbeafe',
                      },
                      {
                        icon: (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="11" fill="#10b981" opacity="0.15"/>
                            <circle cx="12" cy="12" r="11" stroke="#10b981" strokeWidth="1.5"/>
                            <path d="M8 13l2-4 2.5 5 2-3 1.5 2" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ),
                        label: 'ใช้งาน', val: installedUsing, color: '#10b981', bg: '#dcfce7',
                      },
                    ].map((k, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: k.bg, borderRadius: 8, padding: '10px 14px', border: `1px solid ${k.color}33` }}>
                        <span style={{ flexShrink: 0 }}>{k.icon}</span>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{fmt(k.val)} <span style={{ fontSize: 12, fontWeight: 600 }}>แห่ง</span></div>
                          <div style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{k.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ไม่มีข้อมูล */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fef3c7', borderRadius: 8, padding: '10px 14px', border: '1px solid #f59e0b33' }}>
                      <span style={{ flexShrink: 0 }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="11" fill="#f59e0b" opacity="0.15"/>
                          <circle cx="12" cy="12" r="11" stroke="#f59e0b" strokeWidth="1.5"/>
                          <path d="M12 7v5.5l3 2" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{fmt(installedNotUsing)} <span style={{ fontSize: 12, fontWeight: 600 }}>แห่ง</span></div>
                        <div style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>ไม่มีข้อมูล</div>
                        <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>{installedTotal > 0 ? ((installedNotUsing/installedTotal)*100).toFixed(1) : 0}% ของที่ติดตั้งแล้ว</div>
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 14px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>ติดตั้งแล้ว → ใช้งาน</div>
                      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${usePct}%`, background: pctColor, borderRadius: 4, transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ fontSize: 11, color: pctColor, fontWeight: 700, marginTop: 4, textAlign: 'right' }}>{usePct.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* แยกตามเขต */}
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>แยกตามเขตสุขภาพ</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px 24px' }}>
              {regionCrossData.map((r, i) => (
                <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0, fontSize: 9, fontWeight: 700, color: '#fff',
                    background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{r.region}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</span>
                      <span style={{ fontSize: 11, color: r.pct >= 80 ? '#10b981' : r.pct >= 50 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                        {r.using}/{r.installed} ({r.pct}%)
                      </span>
                    </div>
                    <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3 }}>
                      <div style={{ width: `${r.pct}%`, height: '100%', borderRadius: 3, background: r.pct >= 80 ? '#10b981' : r.pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── กระดานคำนวณ ── */}
            {(() => {
              // จังหวัดที่ยังมีคนไม่ใช้งาน (notUsingByProv)
              const candidates = Object.entries(notUsingByProv)
                .filter(([, list]) => list.length > 0)
                .sort((a, b) => {
                  const pctA = installedByProv[a[0]] > 0 ? ((provMap[a[0]]?.count || 0) / installedByProv[a[0]]) * 100 : 0
                  const pctB = installedByProv[b[0]] > 0 ? ((provMap[b[0]]?.count || 0) / installedByProv[b[0]]) * 100 : 0
                  return pctB - pctA
                })

              const simGain = simSelected.reduce((acc, p) => acc + (notUsingByProv[p]?.length || 0), 0)
              const simUsing = installedUsing + simGain
              const simPct = installedTotal > 0 ? (simUsing / installedTotal) * 100 : 0
              const curPct  = installedTotal > 0 ? (installedUsing / installedTotal) * 100 : 0
              const pctColor = simPct >= 80 ? '#10b981' : simPct >= 50 ? '#f59e0b' : '#ef4444'

              // คำนวณ greedy เพื่อถึงเป้าหมาย
              const targetPct = Math.min(100, Math.max(0, Number(simTarget) || 80))
              const target80 = installedTotal > 0 ? Math.ceil(installedTotal * (targetPct / 100)) : 0
              const gap80 = Math.max(0, target80 - installedUsing)
              const already80 = curPct >= targetPct
              // greedy: เรียงตาม gain มากสุดก่อน เพื่อใช้จังหวัดน้อยสุด
              const greedyCandidates = [...candidates].sort((a, b) => b[1].length - a[1].length)
              const suggestedSet = new Set()
              let greedyAcc = 0
              for (const [p, list] of greedyCandidates) {
                if (greedyAcc >= gap80) break
                suggestedSet.add(p)
                greedyAcc += list.length
              }
              const canReach80 = greedyAcc + installedUsing >= target80

              const visibleCandidates = simSearch
                ? candidates.filter(([p]) => p.includes(simSearch))
                : candidates

              const toggleProv = (p) => setSimSelected(prev =>
                prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
              )

              return (
                <div style={{ marginTop: 20, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16 }}>🧮</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>กระดานคำนวณ — ถ้าดันจังหวัดนี้ให้ใช้งาน จะได้กี่ % ?</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>เป้าหมาย</span>
                      <input
                        type="number" min="1" max="100" value={simTarget}
                        onChange={e => setSimTarget(e.target.value)}
                        style={{ width: 52, padding: '2px 6px', borderRadius: 5, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 700, textAlign: 'center', color: '#2563eb' }}
                      />
                      <span style={{ fontSize: 11, color: '#64748b' }}>%</span>
                    </div>
                    {simSelected.length > 0 && (
                      <button onClick={() => setSimSelected([])}
                        style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 10px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#64748b' }}>
                        ล้างทั้งหมด
                      </button>
                    )}
                  </div>

                  {/* แถบ 80% target */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                    marginBottom: 12, padding: '8px 12px', borderRadius: 8,
                    background: already80 ? '#dcfce7' : '#fffbeb',
                    border: `1px solid ${already80 ? '#86efac' : '#fcd34d'}`,
                  }}>
                    <span style={{ fontSize: 14 }}>{already80 ? '✅' : '🎯'}</span>
                    {already80 ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>ภาพรวมเกิน {targetPct}% แล้ว ({curPct.toFixed(1)}%)</span>
                    ) : (
                      <>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                            ต้องการอีก <span style={{ color: '#ef4444', fontSize: 14 }}>{fmt(gap80)}</span> แห่ง เพื่อให้ภาพรวมถึง {targetPct}%
                          </span>
                          {canReach80 ? (
                            <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>
                              (ใช้จังหวัดที่มีอยู่ได้ {suggestedSet.size} จังหวัด)
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: '#ef4444', marginLeft: 6 }}>(จังหวัดที่มียังไม่พอถึง {targetPct}%)</span>
                          )}
                        </div>
                        {canReach80 && (
                          <button
                            onClick={() => setSimSelected([...suggestedSet])}
                            style={{
                              fontSize: 11, padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700,
                              background: '#2563eb', color: '#fff', border: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                            }}>
                            🎯 เลือกอัตโนมัติ
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* ซ้าย: เลือกจังหวัด */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>เลือกจังหวัดที่จะดัน ({candidates.length} จังหวัด)</span>
                        <input
                          className="filter-input"
                          placeholder="🔍 ค้นหา..."
                          value={simSearch}
                          onChange={e => setSimSearch(e.target.value)}
                          style={{ width: 120, fontSize: 11 }}
                        />
                      </div>
                      <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {visibleCandidates.map(([prov, list]) => {
                          const checked = simSelected.includes(prov)
                          const isSuggested = suggestedSet.has(prov) && !already80
                          const instP = installedByProv[prov] || 0
                          const useP = (provMap[prov]?.count || 0)
                          const curP = instP > 0 ? Math.round((useP / instP) * 100) : 0
                          return (
                            <label key={prov} style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                              borderRadius: 6, cursor: 'pointer',
                              background: checked ? '#eff6ff' : isSuggested ? '#fffbeb' : '#fff',
                              border: `1px solid ${checked ? '#bfdbfe' : isSuggested ? '#fcd34d' : '#e2e8f0'}`,
                            }}>
                              <input type="checkbox" checked={checked} onChange={() => toggleProv(prov)}
                                style={{ width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
                              <span style={{ flex: 1, fontSize: 12, fontWeight: checked ? 700 : 500, color: 'var(--text-primary)' }}>{prov}</span>
                              {isSuggested && !checked && (
                                <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 800, background: '#fef3c7', borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>80%</span>
                              )}
                              <span style={{ fontSize: 10, color: '#64748b', flexShrink: 0 }}>{useP}/{instP}</span>
                              <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, flexShrink: 0 }}>+{list.length}</span>
                              <span style={{ fontSize: 10, color: curP >= 80 ? '#10b981' : '#94a3b8', fontWeight: curP >= 80 ? 700 : 400, flexShrink: 0 }}>{curP}%</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    {/* ขวา: ผลลัพธ์ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '12px 14px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>ปัจจุบัน</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontSize: 28, fontWeight: 900, color: curPct >= 80 ? '#10b981' : curPct >= 50 ? '#f59e0b' : '#ef4444' }}>{curPct.toFixed(1)}%</span>
                          <span style={{ fontSize: 12, color: '#64748b' }}>{fmt(installedUsing)} / {fmt(installedTotal)} แห่ง</span>
                        </div>
                        {/* progress with 80% marker */}
                        <div style={{ marginTop: 8, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'visible', position: 'relative' }}>
                          <div style={{ position: 'absolute', width: `${Math.min(curPct, 100)}%`, height: '100%', background: curPct >= 80 ? '#10b981' : '#f59e0b', borderRadius: 4 }} />
                          <div style={{ position: 'absolute', left: `${targetPct}%`, top: -3, width: 2, height: 14, background: '#2563eb', borderRadius: 1 }} />
                          <span style={{ position: 'absolute', left: `${targetPct}%`, top: -18, transform: 'translateX(-50%)', fontSize: 9, color: '#2563eb', fontWeight: 700, whiteSpace: 'nowrap' }}>{targetPct}%</span>
                        </div>
                      </div>

                      {simSelected.length > 0 && (
                        <>
                          <div style={{ textAlign: 'center', fontSize: 13, color: '#10b981', fontWeight: 700 }}>
                            ↓ ดัน {simSelected.length} จังหวัด (+{fmt(simGain)} แห่ง)
                          </div>
                          <div style={{ background: pctColor + '18', borderRadius: 8, border: `2px solid ${pctColor}`, padding: '14px 14px' }}>
                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>คาดการณ์</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                              <span style={{ fontSize: 36, fontWeight: 900, color: pctColor }}>{simPct.toFixed(1)}%</span>
                              <span style={{ fontSize: 13, color: pctColor, fontWeight: 700 }}>+{(simPct - curPct).toFixed(1)}%</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{fmt(simUsing)} / {fmt(installedTotal)} แห่ง</div>
                            {simPct >= targetPct && (
                              <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981', marginTop: 4 }}>🎉 ถึงเป้า {targetPct}% แล้ว!</div>
                            )}
                            {simPct < targetPct && (
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>ยังขาดอีก {fmt(Math.ceil(installedTotal * (targetPct / 100)) - simUsing)} แห่ง จึงถึง {targetPct}%</div>
                            )}
                            {/* progress with 80% marker */}
                            <div style={{ marginTop: 10, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'visible', position: 'relative' }}>
                              <div style={{ position: 'absolute', width: `${Math.min(curPct, 100)}%`, height: '100%', background: '#e2e8f0', borderRadius: 5 }} />
                              <div style={{ position: 'absolute', width: `${Math.min(simPct, 100)}%`, height: '100%', background: pctColor, borderRadius: 5, opacity: 0.9 }} />
                              <div style={{ position: 'absolute', left: `${targetPct}%`, top: -2, width: 2, height: 14, background: '#2563eb', borderRadius: 1 }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                              <span>ปัจจุบัน {curPct.toFixed(1)}%</span>
                              <span style={{ color: '#2563eb', fontWeight: 700 }}>| {targetPct}%</span>
                              <span>คาดการณ์ {simPct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', background: '#fff', borderRadius: 6, padding: '6px 10px', border: '1px solid #e2e8f0' }}>
                            📍 {simSelected.join(' · ')}
                          </div>
                        </>
                      )}

                      {simSelected.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: 12 }}>
                          ← เลือกจังหวัดเพื่อดูผลคำนวณ
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

          </div>
        </>
      )}

      {/* จังหวัดนำร่อง */}
      {(() => {
        const PILOT = ['เพชรบุรี', 'นครปฐม', 'นนทบุรี', 'สมุทรปราการ']

        const exportPilotExcel = () => {
          const wb = XLSX.utils.book_new()

          // Sheet 1: สรุปภาพรวม
          const summaryRows = PILOT.map(prov => {
            const s = provMap[prov] || { count: 0, latest: 0, total: 0 }
            const instProv = installedByProv[prov] || 0
            const notUsing = notUsingByProv[prov] || []
            const usePct = instProv > 0 ? Math.round((s.count / instProv) * 100) : 0
            return {
              'จังหวัด': prov,
              'ติดตั้งแล้ว (แห่ง)': instProv,
              'ใช้งาน (แห่ง)': s.count,
              'ไม่มีข้อมูล (แห่ง)': notUsing.length,
              '% ใช้งาน': usePct,
              'OPD วันล่าสุด': s.latest,
              'OPD รวม 3 วัน': s.total,
            }
          })
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'สรุปจังหวัดนำร่อง')

          // Sheet 2: รายละเอียด รพ.สต. ที่ไม่ใช้งาน
          const detailRows = []
          PILOT.forEach(prov => {
            const notUsing = notUsingByProv[prov] || []
            notUsing.forEach(h => {
              detailRows.push({
                'จังหวัด': prov,
                'รหัส รพ.สต.': h.hospcode,
                'ชื่อหน่วยบริการ': h.name,
                'ผู้รับผิดชอบ': h.responsible,
                'หมายเหตุ': h.remark,
              })
            })
          })
          if (detailRows.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), 'ไม่ใช้งาน-รายละเอียด')
          }

          const today = new Date().toISOString().slice(0, 10)
          XLSX.writeFile(wb, `pilot_provinces_${today}.xlsx`)
        }

        const pilotData = PILOT.map(prov => {
          const s = provMap[prov] || { count: 0, latest: 0, total: 0 }
          const instProv = installedByProv[prov] || 0
          const usePct = instProv > 0 ? Math.round((s.count / instProv) * 100) : null
          const pctColor = usePct == null ? '#94a3b8' : usePct >= 80 ? '#10b981' : usePct >= 50 ? '#f59e0b' : '#ef4444'
          return { prov, s, instProv, usePct, pctColor }
        })
        const maxPilot = Math.max(...pilotData.map(d => Math.max(d.s.count, d.instProv)), 1)
        return (
          <>
            <div className="section-label" style={{ marginTop: 24 }}>🎯 จังหวัดนำร่อง</div>
            <div className="chart-card" style={{ marginBottom: 22 }}>
              <div className="chart-header">
                <div>
                  <div className="chart-title">เพชรบุรี · นครปฐม · นนทบุรี · สมุทรปราการ</div>
                  <div className="chart-sub">ใช้งาน = มี OPD Visit &gt; 0 ใน 3 วันล่าสุด</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={exportPilotExcel}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: '#10b981', color: '#fff', border: '1px solid #059669',
                    }}
                  >
                    📥 Export Excel
                  </button>
                  <span className="chart-badge">Pilot</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px 32px' }}>
                {pilotData.map(({ prov, s, instProv, usePct, pctColor }) => (
                  <div key={prov} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    {/* ชื่อ + badge % */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>🎯 {prov}</span>
                      {usePct != null && (
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: pctColor, borderRadius: 6, padding: '2px 10px' }}>
                          {usePct}%
                        </span>
                      )}
                    </div>
                    {/* KPI mini */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                      <div style={{ flex: 1, background: '#dbeafe', borderRadius: 7, padding: '6px 10px', border: '1px solid #93c5fd' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}>{instProv}</div>
                        <div style={{ fontSize: 10, color: '#1d4ed8', fontWeight: 600 }}>ติดตั้งแล้ว (แห่ง)</div>
                      </div>
                      <div style={{ flex: 1, background: '#dcfce7', borderRadius: 7, padding: '6px 10px', border: '1px solid #86efac' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{s.count}</div>
                        <div style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>ใช้งาน (แห่ง)</div>
                      </div>
                      <div style={{ flex: 1, background: '#fef3c7', borderRadius: 7, padding: '6px 10px', border: '1px solid #fcd34d' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{Math.max(instProv - s.count, 0)}</div>
                        <div style={{ fontSize: 10, color: '#b45309', fontWeight: 600 }}>ไม่มีข้อมูล (แห่ง)</div>
                      </div>
                    </div>
                    {/* progress bar */}
                    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                      {instProv > 0 && (
                        <div style={{ position: 'absolute', width: `${Math.min((instProv / maxPilot) * 100, 100)}%`, height: '100%', background: '#bfdbfe', borderRadius: 4 }} />
                      )}
                      <div style={{ position: 'absolute', width: `${Math.min((s.count / maxPilot) * 100, 100)}%`, height: '100%', background: pctColor, borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      OPD วันล่าสุด: {fmt(s.latest)} · รวม 3 วัน: {fmt(s.total)}
                    </div>
                  </div>
                ))}
              </div>

              {/* สรุปรายละเอียดที่ไม่ใช้งานแยกจังหวัดนำร่อง */}
              {PILOT.some(p => (notUsingByProv[p] || []).length > 0) && (
                <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e', marginBottom: 10 }}>
                    ⚠️ รายชื่อ รพ.สต. ที่ติดตั้งแล้วแต่ยังไม่มีข้อมูล
                  </div>
                  {PILOT.map(prov => {
                    const notUsing = notUsingByProv[prov] || []
                    if (notUsing.length === 0) return null
                    const isOpen = !!expandedPilot[prov]
                    return (
                      <div key={prov} style={{ marginBottom: 8 }}>
                        <button
                          onClick={() => setExpandedPilot(prev => ({ ...prev, [prov]: !prev[prov] }))}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: isOpen ? '#fffbeb' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', textAlign: 'left' }}
                        >
                          <span style={{ fontSize: 12, color: '#64748b' }}>{isOpen ? '▾' : '▸'}</span>
                          <span style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 5, padding: '1px 8px', fontSize: 11, color: '#92400e', fontWeight: 800 }}>{prov}</span>
                          <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>ไม่มีข้อมูล {notUsing.length} แห่ง</span>
                        </button>
                        {isOpen && (
                          <div style={{ overflowX: 'auto', maxHeight: 260, overflowY: 'auto', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 7px 7px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                              <thead style={{ position: 'sticky', top: 0 }}>
                                <tr style={{ background: '#f1f5f9' }}>
                                  <th style={{ textAlign: 'left', padding: '5px 8px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700, width: 80 }}>รหัส รพ.</th>
                                  <th style={{ textAlign: 'left', padding: '5px 8px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>ชื่อหน่วยบริการ</th>
                                  <th style={{ textAlign: 'left', padding: '5px 8px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700, width: 140 }}>ผู้รับผิดชอบ</th>
                                  <th style={{ textAlign: 'left', padding: '5px 8px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700, width: 200 }}>หมายเหตุ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {notUsing.map((h, idx) => (
                                  <tr key={h.hospcode} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                    <td style={{ padding: '5px 8px', borderBottom: '1px solid #f1f5f9', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>{h.hospcode}</td>
                                    <td style={{ padding: '5px 8px', borderBottom: '1px solid #f1f5f9', color: 'var(--text-primary)' }}>{h.name || '—'}</td>
                                    <td style={{ padding: '5px 8px', borderBottom: '1px solid #f1f5f9', color: h.responsible ? '#059669' : '#94a3b8', fontWeight: h.responsible ? 600 : 400 }}>
                                      {h.responsible || <span style={{ color: '#cbd5e1' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '5px 8px', borderBottom: '1px solid #f1f5f9', color: h.remark ? '#475569' : '#94a3b8' }}>
                                      {h.remark || <span style={{ color: '#cbd5e1' }}>—</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )
      })()}

      {/* Top 10 จังหวัด */}
      <div className="section-label" style={{ marginTop: 24 }}>🏆 Top 10 จังหวัด (เรียงตาม % ใช้งานจริง)</div>
      <div className="chart-card" style={{ marginBottom: 22 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">
              {(provSearch || provRegion)
                ? `${provRegion ? `เขต ${provRegion} · ` : ''}${provSearch ? `"${provSearch}" · ` : ''}${provFiltered.length} จังหวัด`
                : 'Top 10 จังหวัด (เรียงตาม % ใช้งาน)'}
            </div>
            <div className="chart-sub">นับจากหน่วยบริการที่มี OPD Visit &gt; 0 ใน 3 วันล่าสุด · ทั้งหมด {allProvRanked.length} จังหวัด</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={() => setShowAllProv(v => !v)}
              style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: showAllProv ? '#2563eb' : '#f1f5f9',
                color: showAllProv ? '#fff' : '#475569',
                border: `1px solid ${showAllProv ? '#1d4ed8' : '#e2e8f0'}`,
              }}
            >{showAllProv ? `ทุกจังหวัด (${allProvRankedBase.length})` : 'Top 10'}</button>
            <button
              onClick={() => setShowZeroProv(v => !v)}
              style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: showZeroProv ? '#f59e0b' : '#f1f5f9',
                color: showZeroProv ? '#fff' : '#475569',
                border: `1px solid ${showZeroProv ? '#d97706' : '#e2e8f0'}`,
              }}
            >{showZeroProv ? `รวม 0% (${zeroProvEntries.length})` : 'รวม 0%'}</button>
            <select
              className="filter-select"
              value={provRegion}
              onChange={e => setProvRegion(e.target.value)}
              style={{ fontSize: 12 }}
            >
              <option value="">ทุกเขต</option>
              {availableRegions.map(r => <option key={r} value={r}>เขต {r}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>ใช้งาน ≥</span>
              <input
                type="number"
                min="0" max="100"
                className="filter-input"
                placeholder="เช่น 90"
                value={provMinPct}
                onChange={e => setProvMinPct(e.target.value)}
                style={{ width: 72, textAlign: 'center' }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
            </div>
            <input
              className="filter-input"
              placeholder="🔍 ค้นหาจังหวัด..."
              value={provSearch}
              onChange={e => setProvSearch(e.target.value)}
              style={{ width: 150 }}
            />
            {/* Export ไม่ใช้งาน */}
            {(() => {
              const notUsingProvinces = Object.entries(notUsingByProv)
                .filter(([, list]) => list.length > 0)
                .sort((a, b) => b[1].length - a[1].length)
              if (!notUsingProvinces.length) return null
              const exportNotUsing = () => {
                const rows = (exportProvince === '__all__'
                  ? notUsingProvinces.flatMap(([prov, list]) => list.map(h => ({ ...h, province: prov })))
                  : (notUsingByProv[exportProvince] || []).map(h => ({ ...h, province: exportProvince }))
                ).map(h => ({
                  'จังหวัด': h.province,
                  'รหัส รพ.สต.': h.hospcode,
                  'ชื่อหน่วยบริการ': h.name,
                  'ผู้รับผิดชอบ': h.responsible,
                  'หมายเหตุ': h.remark,
                }))
                if (!rows.length) return
                const wb2 = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb2, XLSX.utils.json_to_sheet(rows), 'ไม่ใช้งาน')
                const label = exportProvince === '__all__' ? 'ทุกจังหวัด' : exportProvince
                XLSX.writeFile(wb2, `not_using_${label}_${new Date().toISOString().slice(0,10)}.xlsx`)
              }
              return (
                <>
                  <select
                    value={exportProvince}
                    onChange={e => setExportProvince(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, color: 'var(--text-primary)', background: 'var(--bg-main)', cursor: 'pointer' }}
                  >
                    <option value="__all__">ทุกจังหวัด ({notUsingProvinces.reduce((a,[,l])=>a+l.length,0)} แห่ง)</option>
                    {notUsingProvinces.map(([prov, list]) => (
                      <option key={prov} value={prov}>{prov} ({list.length} แห่ง)</option>
                    ))}
                  </select>
                  <button
                    onClick={exportNotUsing}
                    style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#10b981', color: '#fff', border: '1px solid #059669', whiteSpace: 'nowrap' }}
                  >
                    📥 Export
                  </button>
                </>
              )
            })()}
          </div>
        </div>
        {provFiltered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 13 }}>ไม่พบจังหวัดที่ตรงกัน</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
            {provFiltered.map(([prov, s]) => {
              const rank = allProvRanked.findIndex(([p]) => p === prov)
              const medal = rank < 3 ? ['#f59e0b','#94a3b8','#cd7f32'][rank] : COLORS[(rank + 3) % COLORS.length]
              const instProv = installedByProv[prov] || 0
              const usePct = instProv > 0 ? Math.round((s.count / instProv) * 100) : null
              const pctColor = usePct == null ? '#94a3b8' : usePct >= 80 ? '#10b981' : usePct >= 50 ? '#f59e0b' : '#ef4444'
              const notUsing = notUsingByProv[prov] || []
              const isHovered = hoveredProv === prov
              return (
                <div key={prov}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', position: 'relative' }}
                  onMouseEnter={() => notUsing.length > 0 && setHoveredProv(prov)}
                  onMouseLeave={() => setHoveredProv(null)}
                >
                  {/* Tooltip */}
                  {isHovered && notUsing.length > 0 && (() => {
                    // group by remark
                    const remarkMap = {}
                    notUsing.forEach(h => {
                      const k = h.remark?.trim() || '(ไม่มีหมายเหตุ)'
                      if (!remarkMap[k]) remarkMap[k] = 0
                      remarkMap[k]++
                    })
                    const remarkGroups = Object.entries(remarkMap).sort((a, b) => b[1] - a[1])
                    return (
                      <div style={{
                        position: 'absolute', bottom: '110%', left: 0, zIndex: 200,
                        background: '#1e293b', color: '#fff', borderRadius: 10,
                        padding: '10px 14px', minWidth: 260, maxWidth: 360,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        pointerEvents: 'none',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#fbbf24' }}>
                          ⚠️ ไม่มีข้อมูล {notUsing.length} แห่ง — {prov}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>หมายเหตุ (จัดกลุ่ม)</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {remarkGroups.map(([remark, cnt]) => (
                            <div key={remark} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                minWidth: 22, height: 18, borderRadius: 4,
                                background: remark === '(ไม่มีหมายเหตุ)' ? '#334155' : '#2563eb',
                                color: '#fff', fontSize: 10, fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              }}>{cnt}</span>
                              <span style={{ fontSize: 11, color: remark === '(ไม่มีหมายเหตุ)' ? '#64748b' : '#e2e8f0', lineHeight: 1.3 }}>{remark}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: medal, color: '#fff', fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{rank + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* ชื่อ + ใช้งาน/ติดตั้ง */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prov}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                        <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>ใช้งาน {s.count}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/</span>
                        <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700 }}>ติดตั้ง {instProv > 0 ? instProv : '—'}</span>
                        {usePct != null && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: pctColor, borderRadius: 4, padding: '1px 5px' }}>
                            {usePct}%
                          </span>
                        )}
                      </div>
                    </div>
                    {/* progress bar: ใช้งาน vs ติดตั้ง */}
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                      {instProv > 0 && (
                        <div style={{ position: 'absolute', width: `${Math.min((instProv / maxProvCount) * 100, 100)}%`, height: '100%', background: '#dbeafe', borderRadius: 3 }} />
                      )}
                      <div style={{ position: 'absolute', width: `${Math.min((s.count / maxProvCount) * 100, 100)}%`, height: '100%', background: medal, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      {instProv > 0 && <span style={{ color: '#f59e0b', fontWeight: 600 }}>ไม่มีข้อมูล {instProv - s.count} แห่ง · </span>}
                      OPD วันล่าสุด: {fmt(s.latest)} · รวม 3 วัน: {fmt(s.total)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="section-label" style={{ marginTop: 24 }}>การใช้งานแยกเขต — {productionDates.length > 0 ? productionDates[productionDates.length - 1] : 'วันล่าสุด'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>

        {/* Bar by region */}
        <div className="chart-card" style={{ marginBottom: 0 }}>
          <div className="chart-header">
            <div>
              <div className="chart-title">OPD Visit แยกเขต (วันล่าสุด)</div>
              <div className="chart-sub">คลิกแถบเพื่อกรองตาราง</div>
            </div>
            <span className="chart-badge">Bar</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={regionBarData}
              margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
              onClick={e => {
                if (e?.activePayload) {
                  const r = e.activePayload[0]?.payload?.region
                  setSelectedRegion(selectedRegion === String(r) ? '' : String(r))
                  setPage(1)
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtK} />
              <Tooltip content={<TT />} />
              <Bar dataKey="วันล่าสุด" radius={[4, 4, 0, 0]}>
                {regionBarData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={selectedRegion === String(entry.region) ? '#f59e0b' : COLORS[i % COLORS.length]}
                    opacity={selectedRegion && selectedRegion !== String(entry.region) ? 0.35 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily trend line */}
        <div className="chart-card" style={{ marginBottom: 0 }}>
          <div className="chart-header">
            <div>
              <div className="chart-title">แนวโน้ม 3 วัน — รวมทุกเขต</div>
              <div className="chart-sub">OPD Visit รายวัน</div>
            </div>
            <span className="chart-badge">Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtK} />
              <Tooltip content={<TT />} />
              <Line dataKey="รวมทุกเขต" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 5, fill: '#2563eb' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Region summary cards */}
      <div className="section-label">สรุปผลผลิตแยกเขต</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
        {Object.entries(regionStats)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([r, s], i) => {
            const isSelected = selectedRegion === r
            return (
              <div key={r}
                onClick={() => { setSelectedRegion(isSelected ? '' : r); setPage(1) }}
                style={{
                  flex: '0 0 calc(25% - 8px)', minWidth: 160, padding: '12px 14px',
                  background: isSelected ? '#eff6ff' : 'var(--bg-card)',
                  border: isSelected ? '2px solid #2563eb' : '1px solid var(--border)',
                  borderRadius: 10, cursor: 'pointer',
                  boxShadow: isSelected ? '0 0 0 2px #bfdbfe' : '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: COLORS[i % COLORS.length], color: '#fff',
                    fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>{r}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>เขต {r}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{REGION_NAMES[Number(r)] || ''}</div>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: COLORS[i % COLORS.length] }}>{fmtK(s.latest)}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>OPD วันล่าสุด</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {productionDates.map((d, di) => (
                    <div key={di} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>{d.split(' ').slice(0,2).join(' ')}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtK(s.byDate[di])}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{s.count} หน่วยบริการ</div>
              </div>
            )
          })}
      </div>

      {/* Table */}
      <div className="section-label">รายชื่อ รพ.สต. — OPD Visit รายวัน</div>
      <div className="chart-card">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="filter-input"
            placeholder="🔍 ค้นหา รหัส / ชื่อ รพ.สต...."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <select className="filter-select" value={selectedRegion} onChange={e => { setSelectedRegion(e.target.value); setFilterProvince(''); setPage(1) }}>
            <option value="">ทุกเขต</option>
            {availableRegions.map(r => <option key={r} value={r}>เขต {r} — {REGION_NAMES[r] || ''}</option>)}
          </select>
          <select className="filter-select" value={filterProvince} onChange={e => { setFilterProvince(e.target.value); setPage(1) }}>
            <option value="">ทุกจังหวัด</option>
            {uniqueProvinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="filter-select" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }}>
            <option value="latest">เรียง: OPD วันล่าสุด ↓</option>
            <option value="total">เรียง: รวม 3 วัน ↓</option>
            <option value="name">เรียง: ชื่อ A-Z</option>
          </select>
          {(selectedRegion || filterProvince || search) && (
            <button
              style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f1f5f9', cursor: 'pointer', fontSize: 12 }}
              onClick={() => { setSelectedRegion(''); setFilterProvince(''); setSearch(''); setPage(1) }}
            >✕ ล้างตัวกรอง</button>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            แสดง {fmt(filtered.length)} รายการ
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 600 + productionDates.length * 100 }}>
            {/* Header */}
            <div className="lb-header">
              <span style={{ width: 36, flexShrink: 0 }}>#</span>
              <span style={{ width: 80, flexShrink: 0 }}>รหัส รพ.</span>
              <span style={{ width: 50, flexShrink: 0, textAlign: 'center' }}>เขต</span>
              <span style={{ width: 100, flexShrink: 0 }}>จังหวัด</span>
              <span style={{ flex: 1 }}>ชื่อหน่วยบริการ</span>
              {productionDates.map((d, di) => (
                <span key={di} style={{ width: 95, flexShrink: 0, textAlign: 'right' }}>{d}</span>
              ))}
              <span style={{ width: 95, flexShrink: 0, textAlign: 'right', color: '#2563eb' }}>รวม 3 วัน</span>
            </div>

            {pageData.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>ไม่พบข้อมูลที่ตรงกับเงื่อนไข</div>
            )}

            {pageData.map((h, i) => (
              <div key={i} className="lb-row" style={{ fontSize: 12 }}>
                <span style={{ width: 36, flexShrink: 0, color: 'var(--text-muted)' }}>{(page - 1) * PAGE_SIZE + i + 1}</span>
                <span style={{ width: 80, flexShrink: 0, fontFamily: 'monospace', fontWeight: 600 }}>{h.hospcode}</span>
                <span style={{ width: 50, flexShrink: 0, textAlign: 'center' }}>
                  <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '1px 6px', borderRadius: 5, fontWeight: 700, fontSize: 10 }}>{h.region}</span>
                </span>
                <span style={{ width: 100, flexShrink: 0, color: 'var(--text-secondary)', fontSize: 11 }}>
                  {h.province || <span style={{ color: '#cbd5e1' }}>—</span>}
                </span>
                <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 500, paddingRight: 8 }}>{h.name}</span>
                {h.visits.map((v, di) => (
                  <span key={di} style={{ width: 95, flexShrink: 0, textAlign: 'right', color: v > 0 ? '#059669' : '#cbd5e1', fontWeight: v > 0 ? 600 : 400 }}>
                    {v > 0 ? fmt(v) : '—'}
                  </span>
                ))}
                <span style={{ width: 95, flexShrink: 0, textAlign: 'right', color: '#2563eb', fontWeight: 700 }}>{fmt(h.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3 > totalPages ? totalPages - 6 + i : page + i - 3
              return p >= 1 && p <= totalPages ? (
                <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ) : null
            })}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>หน้า {page}/{totalPages}</span>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import * as XLSX from 'xlsx'

const STATUS_COLOR = {
  // สถานะ column จริง
  'เสร็จแล้ว':'#10b981','แก้ไขเรียบร้อย':'#10b981','ดำเนินการแล้ว':'#10b981','เสร็จสิ้น':'#10b981',
  'กำลังดำเนินการ':'#f59e0b','อยู่ระหว่างดำเนินการ':'#f59e0b','รอดำเนินการ':'#94a3b8',
  'รอทีมพัฒนา':'#f97316','รอแจ้งทีมพัฒนา':'#f59e0b','รอ compile':'#7c3aed',
  'จัดทำ MANTIS':'#2563eb','จัดทำ Taiga':'#06b6d4','ส่งกลับนักพัฒนา':'#ef4444','ยกเลิก':'#94a3b8',
}
const URG_COLOR = {
  'ด่วนมาก':'#ef4444','ด่วน':'#f97316','ปกติ':'#64748b','ไม่ด่วน':'#94a3b8','ต่ำ':'#94a3b8',
}
const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

export default function DefectRequest({ data, defectLoading, defectError, defectCountdown, defectSheetUrl, setDefectSheetUrl, onRetryDefect }) {
  const { defect_status, defect_system, defect_urgency, defectList, defectColumns = [] } = data
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUrgency, setFilterUrgency] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterType, setFilterType] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showUrlEdit, setShowUrlEdit] = useState(false)
  const [urlInput, setUrlInput] = useState(defectSheetUrl || '')
  useEffect(() => { setUrlInput(defectSheetUrl || '') }, [defectSheetUrl])

  // Calculator state
  const [calcDevs, setCalcDevs] = useState([])
  const [calcPlatform, setCalcPlatform] = useState('')
  const [calcStartDate, setCalcStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [calcEndDate, setCalcEndDate] = useState('')
  const [calcHrsPerDay, setCalcHrsPerDay] = useState(8)

  // Kanban state
  const [kanbanStart, setKanbanStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0]
  })
  const [kanbanEnd, setKanbanEnd] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 28); return d.toISOString().split('T')[0]
  })
  const [kanbanDevFilter, setKanbanDevFilter] = useState([])
  const [kanbanPlatform, setKanbanPlatform] = useState('')
  const [kanbanAssignments, setKanbanAssignments] = useState({}) // key=itemIdx, value=weekIdx
  const [kanbanAssignDays, setKanbanAssignDays] = useState({})   // key=itemIdx, value=dayOffset 0-6 (Mon-Sun)
  const [kanbanAssignDev, setKanbanAssignDev] = useState({})     // key=itemIdx, value=devName
  const [openAssignIdx, setOpenAssignIdx] = useState(null)
  const [openAssignWeek, setOpenAssignWeek] = useState(null)     // weekIdx ที่กำลังเลือกวัน
  const [kanbanSort, setKanbanSort] = useState('urgency')        // 'urgency' | 'system' | 'default'
  const [kanbanSystem, setKanbanSystem] = useState('')           // filter ระบบงาน ใน backlog

  // Column resize state
  const [colWidths, setColWidths] = useState({})
  const resizingCol = useRef(null)

  const startColResize = useCallback((col, startX, startW) => {
    resizingCol.current = { col, startX, startW }
    const onMove = (e) => {
      if (!resizingCol.current) return
      const { col: c, startX: sx, startW: sw } = resizingCol.current
      setColWidths(prev => ({ ...prev, [c]: Math.max(60, sw + e.clientX - sx) }))
    }
    const onUp = () => {
      resizingCol.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])
  const fmtCountdown = s => `${Math.floor((s||0)/60)}:${String((s||0)%60).padStart(2,'0')}`

  const ds = defect_status || {}
  const dsys = defect_system || {}
  const du = defect_urgency || {}

  const total = Object.values(ds).reduce((a,b)=>a+b,0) || 1
  const done  = (ds['ดำเนินการแล้ว']||0) + (ds['แก้ไขเรียบร้อย']||0)
  const pending = total - done
  const urgent = du['ด่วน']||0
  const normal = (du['ปกติ']||0) + (du['ไม่ด่วน']||0)

  const statusData = Object.entries(ds).map(([name,value])=>({name,value,color:STATUS_COLOR[name]||'#94a3b8'}))
  const sysData = Object.entries(dsys).map(([name,value])=>({name,value})).slice(0,10)
  const urgData = [{name:'ด่วน',value:urgent},{name:'ปกติ',value:normal}]

  return (
    <div className="page">
      <div className="page-title">🐞 Defect & Request Tracking</div>

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {defectLoading ? (
          <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 6, padding: '3px 10px' }}>⏳ กำลังโหลด...</span>
        ) : defectError ? (
          <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '3px 10px' }}>⚠️ {defectError}</span>
        ) : (
          <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600, background: '#dcfce7', border: '1px solid #86efac', borderRadius: 6, padding: '3px 10px' }}>✅ โหลดสำเร็จ</span>
        )}
        {!defectLoading && defectCountdown != null && (
          <span style={{ fontSize: 11, color: '#64748b' }}>🔁 Auto refresh ใน {fmtCountdown(defectCountdown)}</span>
        )}
        <button
          onClick={() => onRetryDefect && onRetryDefect()}
          disabled={defectLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: defectLoading ? 'not-allowed' : 'pointer', background: defectLoading ? '#f1f5f9' : '#2563eb', color: defectLoading ? '#94a3b8' : '#fff', border: '1px solid ' + (defectLoading ? '#e2e8f0' : '#1d4ed8') }}
        >🔄 {defectLoading ? 'กำลังโหลด...' : 'Refresh'}</button>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowUrlEdit(v => !v); setUrlInput(defectSheetUrl || '') }}
            style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}
          >🔗 เปลี่ยน URL</button>
          {showUrlEdit && (
            <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 100, minWidth: 380, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 14 }}>
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
                  onClick={() => { if (setDefectSheetUrl) setDefectSheetUrl(urlInput); setShowUrlEdit(false); onRetryDefect && onRetryDefect(urlInput) }}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                >บันทึกและโหลด</button>
                <button onClick={() => setShowUrlEdit(false)} style={{ padding: '6px 14px', borderRadius: 6, background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 12 }}>ยกเลิก</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="page-desc">ติดตาม Bug, Feature Request และสถานะการแก้ไขทั้งหมด</div>

      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginTop:20}}>
        {[
          {color:'c-blue',  icon:'📝', val:fmt(total),  label:'รายการทั้งหมด'},
          {color:'c-green', icon:'✅', val:fmt(done),   label:'แก้ไขเรียบร้อย', pct:`${((done/total)*100).toFixed(0)}%`},
          {color:'c-red',   icon:'⏳', val:fmt(pending),label:'ยังค้างอยู่',     pct:`${((pending/total)*100).toFixed(0)}%`},
          {color:'c-orange',icon:'🚨', val:fmt(urgent), label:'ประเภทด่วน',       pct:`${((urgent/total)*100).toFixed(0)}%`},
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            {k.pct && <span className="kpi-pct">{k.pct}</span>}
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="section-label" style={{marginTop:24}}>สถานะการดำเนินการ</div>
      <div className="charts-row charts-row-3">
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">สถานะ Defect/Request</div>
              <div className="chart-sub">จำแนกตามสถานะการดำเนินการ</div></div>
          </div>
          <div className="donut-container">
            <ResponsiveContainer width={150} height={150}>
              <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={38} outerRadius={65} paddingAngle={3} dataKey="value">
                {statusData.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie><Tooltip content={<TT/>}/></PieChart>
            </ResponsiveContainer>
            <div className="donut-legend">
              {statusData.map((item,i)=>(
                <div key={i} className="leg-item">
                  <div className="leg-dot" style={{background:item.color}}/>
                  <span className="leg-name" style={{fontSize:11}}>{item.name}</span>
                  <span className="leg-val">{fmt(item.value)}</span>
                  <span className="leg-pct">({((item.value/total)*100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">ระดับความด่วน</div></div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={urgData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                <Cell fill="#ef4444"/><Cell fill="#64748b"/>
              </Pie><Tooltip content={<TT/>}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:8}}>
            <div className="leg-item"><div className="leg-dot" style={{background:'#ef4444'}}/><span className="leg-name">ด่วน</span><span className="leg-val">{fmt(urgent)}</span></div>
            <div className="leg-item"><div className="leg-dot" style={{background:'#64748b'}}/><span className="leg-name">ปกติ</span><span className="leg-val">{fmt(normal)}</span></div>
          </div>
        </div>
      </div>

      <div className="section-label" style={{marginTop:24}}>ระบบงานที่พบปัญหามากที่สุด</div>
      <div className="chart-card">
        <div className="chart-header">
          <div><div className="chart-title">จำนวน Defect/Request แยกตามระบบงาน</div>
            <div className="chart-sub">Top {sysData.length} ระบบที่มีรายการมากสุด</div></div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={sysData} layout="vertical" margin={{top:5,right:20,bottom:5,left:170}}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
            <XAxis type="number" tick={{fill:'#64748b',fontSize:11}}/>
            <YAxis type="category" dataKey="name" tick={{fill:'#64748b',fontSize:11}} width={165}/>
            <Tooltip content={<TT/>}/>
            <Bar dataKey="value" name="จำนวน" radius={[0,6,6,0]}>
              {sysData.map((_,i)=><Cell key={i} fill={['#2563eb','#7c3aed','#10b981','#f59e0b','#ef4444','#06b6d4','#f97316'][i%7]}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Progress bar by status */}
      <div className="section-label" style={{marginTop:24}}>รายละเอียดสถานะ</div>
      <div className="chart-card">
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12}}>
          {statusData.sort((a,b)=>b.value-a.value).map((item, idx)=>{
            const pct = (item.value/total)*100
            return (
              <div key={item.name} style={{
                background:'var(--bg-main)', borderRadius:10,
                border:`1px solid ${item.color}33`,
                padding:'12px 14px',
                boxShadow:`0 1px 4px ${item.color}18`,
                transition:'box-shadow 0.2s',
              }}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <span style={{
                      width:10, height:10, borderRadius:'50%',
                      background:item.color, flexShrink:0, display:'inline-block',
                      boxShadow:`0 0 6px ${item.color}88`
                    }}/>
                    <span style={{fontSize:12, fontWeight:700, color:'var(--text-primary)'}}>{item.name}</span>
                  </div>
                  <span style={{
                    fontSize:11, fontWeight:800, color:'#fff',
                    background:item.color, borderRadius:20,
                    padding:'2px 10px', letterSpacing:0.3,
                  }}>{pct.toFixed(1)}%</span>
                </div>
                {/* progress bar */}
                <div style={{height:7, background:'var(--border)', borderRadius:4, overflow:'hidden', marginBottom:6}}>
                  <div style={{
                    height:'100%', width:`${pct}%`, borderRadius:4,
                    background:`linear-gradient(90deg, ${item.color}cc, ${item.color})`,
                    transition:'width 0.6s ease',
                  }}/>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span style={{fontSize:18, fontWeight:800, color:item.color}}>{fmt(item.value)}</span>
                  <span style={{fontSize:10, color:'var(--text-muted)', fontWeight:500}}>จาก {fmt(total)} รายการ</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Fix Completion Calculator */}
      {(() => {
        const DONE_STATUS = new Set(['แก้ไขเรียบร้อย','ดำเนินการแล้ว','เสร็จสิ้น','เสร็จแล้ว'])
        const devList = [...new Set((defectList||[]).map(r=>r['นักพัฒนา']).filter(Boolean))].sort()
        const platformList = [...new Set((defectList||[]).map(r=>r['แพลตฟอร์ม']).filter(Boolean))].sort()
        const toggleDev = d => setCalcDevs(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev, d])

        // rows ที่ตรงกับ dev + platform ที่เลือก
        const devRows = (defectList||[]).filter(r => {
          if (calcDevs.length > 0 && !calcDevs.includes(r['นักพัฒนา'])) return false
          if (calcPlatform && r['แพลตฟอร์ม'] !== calcPlatform) return false
          return true
        })
        const devPending = devRows.filter(r => !DONE_STATUS.has(r.__status) && r.__status !== 'ยกเลิก')
        const devDone    = devRows.filter(r => DONE_STATUS.has(r.__status))
        const devTotalHrs = devPending.reduce((sum, r) => {
          const h = parseFloat(r['ระยะเวลาพัฒนา(ชม.)'] || 0)
          return sum + (isNaN(h) ? 0 : h)
        }, 0)

        // คำนวณจาก start → end date
        const availDays = (calcStartDate && calcEndDate)
          ? Math.max(0, Math.round((new Date(calcEndDate) - new Date(calcStartDate)) / 86400000))
          : 0
        const totalAvailHrs  = availDays * (Number(calcHrsPerDay) || 8)
        const pendingCount   = devPending.length
        const itemsPerDay    = availDays > 0 ? (pendingCount / availDays).toFixed(2) : null
        const hrsPerItem     = pendingCount > 0 ? (devTotalHrs / pendingCount).toFixed(1) : null
        const feasible       = devTotalHrs > 0 && totalAvailHrs >= devTotalHrs
        const feasibleItems  = devTotalHrs === 0 && availDays > 0  // ไม่มีชม.บันทึก — ดูจำนวนวันแทน

        // per-dev summary
        const devStats = devList.map(d => {
          const rows = (defectList||[]).filter(r => r['นักพัฒนา'] === d && (!calcPlatform || r['แพลตฟอร์ม'] === calcPlatform))
          const done    = rows.filter(r => DONE_STATUS.has(r.__status)).length
          const pending = rows.filter(r => !DONE_STATUS.has(r.__status) && r.__status !== 'ยกเลิก').length
          const hrs     = rows.filter(r => !DONE_STATUS.has(r.__status) && r.__status !== 'ยกเลิก')
                              .reduce((s,r) => s + (parseFloat(r['ระยะเวลาพัฒนา(ชม.)'])||0), 0)
          return { dev: d, total: rows.length, done, pending, hrs }
        }).filter(s => s.total > 0).sort((a, b) => b.done - a.done)

        const hasResult = calcStartDate && calcEndDate && (calcDevs.length > 0 || calcPlatform)

        // Export Calculator → Excel
        const exportCalc = () => {
          const wb = XLSX.utils.book_new()
          // Sheet 1: สรุป Dev
          const summaryRows = devStats.map(s=>({
            'Dev':          s.dev,
            'ทั้งหมด':      s.total,
            'เสร็จแล้ว':    s.done,
            'ค้างอยู่':     s.pending,
            'ชม.พัฒนาค้าง': s.hrs.toFixed(1),
            '% เสร็จ':      s.total>0 ? `${((s.done/s.total)*100).toFixed(0)}%` : '0%',
            'ต้องทำ/วัน':   availDays>0 ? (s.pending/availDays).toFixed(2) : '',
          }))
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows.length?summaryRows:[{note:'ไม่มีข้อมูล'}]), 'สรุป Dev')
          // Sheet 2: รายการค้างอยู่
          const pendingRows = devPending.map(r=>({
            'Dev':           r['นักพัฒนา']||'',
            'แพลตฟอร์ม':    r['แพลตฟอร์ม']||'',
            'ระบบงาน':      r['ระบบงาน']||'',
            'ความเร่งด่วน': r.__urgency||'',
            'สถานะ':        r.__status||'',
            'ชม.พัฒนา':     r['ระยะเวลาพัฒนา(ชม.)']||'',
            'วันที่ต้องได้': r['วันที่ต้องได้']||'',
            'รายละเอียด':   r['เจอปัญหา']||r['หัวข้อ/รายละเอียด']||r.detail||'',
          }))
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pendingRows.length?pendingRows:[{note:'ไม่มีรายการค้าง'}]), 'รายการค้าง')
          // Sheet 3: สรุปภาพรวม
          const overviewRows = [
            { 'หัวข้อ': 'วันที่เริ่ม',       'ค่า': calcStartDate },
            { 'หัวข้อ': 'วันที่ต้องเสร็จ',  'ค่า': calcEndDate },
            { 'หัวข้อ': 'ระยะเวลา (วัน)',    'ค่า': availDays },
            { 'หัวข้อ': 'ชม.ทำงาน/วัน',     'ค่า': calcHrsPerDay },
            { 'หัวข้อ': 'รายการค้างอยู่',    'ค่า': pendingCount },
            { 'หัวข้อ': 'แก้ไขเสร็จแล้ว',   'ค่า': devDone.length },
            { 'หัวข้อ': 'ชม.พัฒนาที่ต้องการ','ค่า': devTotalHrs.toFixed(1) },
            { 'หัวข้อ': 'ชม.ที่มีทั้งหมด',  'ค่า': totalAvailHrs.toFixed(0) },
            { 'หัวข้อ': 'ทำได้ทัน?',         'ค่า': feasible?'ทัน':'ไม่ทัน' },
          ]
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewRows), 'ภาพรวม')
          const devLabel = calcDevs.length>0 ? calcDevs.join('_') : calcPlatform || 'all'
          XLSX.writeFile(wb, `Calculator_${devLabel}_${calcStartDate}_${calcEndDate}.xlsx`)
        }

        return (
          <>
            <div className="section-label" style={{marginTop:24}}>🧮 คำนวณวันที่แก้ไขเสร็จ</div>
            <div className="chart-card">

              {/* ── Input zone ── */}
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:16, alignItems:'start'}}>

                {/* Dev chips */}
                <div style={{gridColumn:'1 / -1'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:8}}>
                    ชื่อ Dev ที่ต้องการให้แก้ไข
                    {calcDevs.length > 0 && <span style={{marginLeft:6,color:'#2563eb'}}>({calcDevs.length} คน)</span>}
                    {calcDevs.length > 0 && <button onClick={()=>setCalcDevs([])} style={{marginLeft:8,fontSize:10,color:'#ef4444',background:'none',border:'none',cursor:'pointer',padding:0}}>ล้าง</button>}
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {devList.map(d => (
                      <label key={d} style={{cursor:'pointer', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600,
                        background: calcDevs.includes(d) ? '#2563eb' : 'var(--bg-main)',
                        color:      calcDevs.includes(d) ? '#fff'    : 'var(--text-primary)',
                        border:`1px solid ${calcDevs.includes(d) ? '#2563eb' : 'var(--border)'}`,
                        transition:'all 0.15s', userSelect:'none',
                      }}>
                        <input type="checkbox" checked={calcDevs.includes(d)} onChange={()=>toggleDev(d)} style={{display:'none'}}/>
                        {d}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:6}}>แพลตฟอร์ม</div>
                  <select className="filter-select" style={{width:'100%'}} value={calcPlatform} onChange={e=>setCalcPlatform(e.target.value)}>
                    <option value="">ทุกแพลตฟอร์ม</option>
                    {platformList.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:6}}>วันที่เริ่ม</div>
                  <input type="date" className="filter-input" style={{width:'100%'}}
                    value={calcStartDate} onChange={e=>setCalcStartDate(e.target.value)}/>
                </div>

                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:6}}>วันที่ต้องเสร็จ (Deadline)</div>
                  <input type="date" className="filter-input" style={{width:'100%'}}
                    value={calcEndDate} onChange={e=>setCalcEndDate(e.target.value)}/>
                </div>

                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:6}}>ชั่วโมงทำงาน/วัน</div>
                  <input type="number" className="filter-input" style={{width:'100%'}}
                    min={1} max={24} value={calcHrsPerDay}
                    onChange={e=>setCalcHrsPerDay(Number(e.target.value))}/>
                </div>
              </div>

              {/* ── Result zone ── */}
              {hasResult && (
                <div style={{marginTop:20}}>

                  {/* Export button */}
                  <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
                    <button onClick={exportCalc}
                      style={{padding:'6px 16px',borderRadius:8,background:'#10b981',color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:6}}>
                      📥 Export Excel
                    </button>
                  </div>

                  {/* Feasibility banner */}
                  {availDays > 0 && pendingCount > 0 && (
                    <div style={{
                      marginBottom:16, padding:'12px 18px', borderRadius:10,
                      background: feasible||feasibleItems ? '#10b98115' : '#ef444415',
                      border:`1.5px solid ${feasible||feasibleItems ? '#10b981' : '#ef4444'}`,
                      display:'flex', alignItems:'center', gap:10,
                    }}>
                      <span style={{fontSize:22}}>{feasible||feasibleItems ? '✅' : '⚠️'}</span>
                      <div>
                        <div style={{fontWeight:800, fontSize:14,
                          color: feasible||feasibleItems ? '#10b981' : '#ef4444'}}>
                          {feasible ? 'ทำได้ทัน Deadline' : feasibleItems ? 'ไม่มีข้อมูลชม.พัฒนา — ดูรายการค้างด้านล่าง' : 'เวลาไม่พอ — ควรปรับ Deadline หรือเพิ่ม Dev'}
                        </div>
                        {devTotalHrs > 0 && (
                          <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
                            ต้องการ {devTotalHrs.toFixed(1)} ชม. / มีเวลา {totalAvailHrs.toFixed(0)} ชม. ({availDays} วัน × {calcHrsPerDay} ชม.)
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* KPI cards */}
                  <div style={{display:'flex', gap:12, flexWrap:'wrap', marginBottom:16}}>
                    {[
                      { label:'ระยะเวลา', val:`${availDays} วัน`, sub: calcEndDate ? new Date(calcEndDate).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}) : '', color:'#2563eb' },
                      { label:'รายการค้างอยู่', val:`${pendingCount} รายการ`, sub:`${devTotalHrs.toFixed(1)} ชม.`, color:'#f59e0b' },
                      { label:'แก้ไขเสร็จแล้ว', val:`${devDone.length} รายการ`, sub:`จาก ${devRows.length} ทั้งหมด`, color:'#10b981' },
                      ...(itemsPerDay !== null ? [{ label:'ต้องทำ / วัน', val:`${itemsPerDay} รายการ`, sub:'เพื่อให้ทันกำหนด', color:'#7c3aed' }] : []),
                      ...(hrsPerItem !== null && devTotalHrs > 0 ? [{ label:'เฉลี่ย / รายการ', val:`${hrsPerItem} ชม.`, sub:'เวลาพัฒนาเฉลี่ย', color:'#06b6d4' }] : []),
                    ].map((k,i) => (
                      <div key={i} style={{flex:'0 0 auto', minWidth:150,
                        background:`${k.color}11`, borderRadius:10,
                        border:`1px solid ${k.color}33`, padding:'10px 16px'}}>
                        <div style={{fontSize:11,color:k.color,fontWeight:700,marginBottom:2}}>{k.label}</div>
                        <div style={{fontSize:20,fontWeight:800,color:k.color}}>{k.val}</div>
                        <div style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>{k.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Per-dev breakdown */}
                  {devStats.length > 0 && (
                    <div style={{overflowX:'auto'}}>
                      <table style={{borderCollapse:'collapse',width:'100%',fontSize:12}}>
                        <thead>
                          <tr style={{background:'#334155'}}>
                            {['Dev','ทั้งหมด','เสร็จแล้ว','ค้างอยู่','ชม.ค้าง','% เสร็จ',
                              ...(availDays>0?['ต้องทำ/วัน']:[])]
                              .map(h=>(
                              <th key={h} style={{padding:'7px 12px',textAlign:h==='Dev'?'left':'center',color:'#e2e8f0',fontWeight:700,fontSize:11,whiteSpace:'nowrap'}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {devStats.map((s,i)=>{
                            const pct = s.total > 0 ? (s.done/s.total)*100 : 0
                            const perDay = availDays > 0 ? (s.pending/availDays).toFixed(2) : null
                            return (
                              <tr key={s.dev} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'var(--bg-secondary)'}}>
                                <td style={{padding:'6px 12px',fontWeight:600,color:'var(--text-primary)'}}>{s.dev}</td>
                                <td style={{padding:'6px 12px',textAlign:'center',color:'var(--text-muted)'}}>{s.total}</td>
                                <td style={{padding:'6px 12px',textAlign:'center'}}>
                                  <span style={{color:'#10b981',fontWeight:700}}>{s.done}</span>
                                </td>
                                <td style={{padding:'6px 12px',textAlign:'center'}}>
                                  <span style={{color:s.pending>0?'#f59e0b':'#10b981',fontWeight:700}}>{s.pending}</span>
                                </td>
                                <td style={{padding:'6px 12px',textAlign:'center',color:'#94a3b8'}}>
                                  {s.hrs > 0 ? `${s.hrs.toFixed(1)}` : '—'}
                                </td>
                                <td style={{padding:'6px 12px',textAlign:'center',minWidth:100}}>
                                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                                    <div style={{flex:1,height:6,background:'var(--border)',borderRadius:3,overflow:'hidden'}}>
                                      <div style={{height:'100%',width:`${pct}%`,background:'#10b981',borderRadius:3}}/>
                                    </div>
                                    <span style={{fontSize:10,color:'#10b981',fontWeight:700,minWidth:28}}>{pct.toFixed(0)}%</span>
                                  </div>
                                </td>
                                {availDays > 0 && (
                                  <td style={{padding:'6px 12px',textAlign:'center'}}>
                                    <span style={{fontWeight:700,color: parseFloat(perDay)>2?'#ef4444':parseFloat(perDay)>1?'#f59e0b':'#10b981'}}>
                                      {perDay}
                                    </span>
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {!hasResult && (
                <div style={{marginTop:16, padding:'16px', textAlign:'center', color:'var(--text-muted)', fontSize:12, background:'var(--bg-main)', borderRadius:8}}>
                  เลือก Dev หรือแพลตฟอร์ม พร้อมกำหนด <b>วันที่เริ่ม</b> และ <b>วันที่ต้องเสร็จ</b> เพื่อดูผลการคำนวณ
                </div>
              )}
            </div>
          </>
        )
      })()}

      {/* Kanban รายสัปดาห์ */}
      {(() => {
        const DONE_STATUS  = new Set(['แก้ไขเรียบร้อย','ดำเนินการแล้ว','เสร็จสิ้น','เสร็จแล้ว'])
        const URG_ORDER    = {'ด่วนมาก':0,'ด่วน':1,'ปกติ':2,'ไม่ด่วน':3,'ต่ำ':4}
        const DAY_TH       = ['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.']
        const DAY_FULL     = ['จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์','อาทิตย์']

        // สร้าง weeks array (จันทร์–อาทิตย์)
        const weeks = []
        if (kanbanStart && kanbanEnd) {
          let cur = new Date(kanbanStart)
          const day = cur.getDay(); cur.setDate(cur.getDate()+(day===0?-6:1-day))
          const end = new Date(kanbanEnd)
          while (cur<=end && weeks.length<16) {
            const wStart=new Date(cur), wEnd=new Date(cur)
            wEnd.setDate(wEnd.getDate()+6)
            // วันแต่ละวันในสัปดาห์
            const days = Array.from({length:7},(_,i)=>{ const d=new Date(wStart); d.setDate(d.getDate()+i); return d })
            weeks.push({ start:wStart, end:wEnd, days })
            cur.setDate(cur.getDate()+7)
          }
        }

        const devList      = [...new Set((defectList||[]).map(r=>r['นักพัฒนา']).filter(Boolean))].sort()
        const platformList = [...new Set((defectList||[]).map(r=>r['แพลตฟอร์ม']).filter(Boolean))].sort()
        const systemList   = [...new Set((defectList||[]).map(r=>r['ระบบงาน']).filter(Boolean))].sort()
        const toggleKDev   = d => setKanbanDevFilter(prev=>prev.includes(d)?prev.filter(x=>x!==d):[...prev,d])
        const devColor     = ['#2563eb','#10b981','#f59e0b','#ef4444','#7c3aed','#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6']
        const devColorMap  = devList.reduce((m,d,i)=>{ m[d]=devColor[i%devColor.length]; return m },{})
        const thFmt        = d => d.toLocaleDateString('th-TH',{day:'numeric',month:'short'})
        const thFmtFull    = d => d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'})

        const parseDate = v => {
          if (!v||v===''||v==='null') return null
          if (v instanceof Date) return v
          const m=String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
          if (m){ const yr=parseInt(m[3])>2400?parseInt(m[3])-543:parseInt(m[3]); return new Date(yr,parseInt(m[2])-1,parseInt(m[1])) }
          const d=new Date(v); return isNaN(d)?null:d
        }

        // pending items (กรอง dev + platform)
        const allPending = (defectList||[]).map((r,i)=>({...r,__idx:i})).filter(r=>{
          if (DONE_STATUS.has(r.__status)||r.__status==='ยกเลิก') return false
          if (kanbanDevFilter.length>0 && !kanbanDevFilter.includes(r['นักพัฒนา'])) return false
          if (kanbanPlatform && r['แพลตฟอร์ม']!==kanbanPlatform) return false
          return true
        })

        const getAssignment = idx => kanbanAssignments[idx]  // { wi, day } หรือ undefined
        const getItemWeekIdx = r => {
          const a = getAssignment(r.__idx)
          if (a!==undefined) return a.wi
          const dateVal=r['วันที่ต้องได้']||r['วันที่เสร็จ']||r['พัฒนาเสร็จ']
          const d=parseDate(dateVal); if (!d) return null
          return weeks.findIndex(w=>d>=w.start&&d<=w.end)
        }

        // Backlog — กรอง + เรียง
        let backlogItems = allPending.filter(r=>{ const wi=getItemWeekIdx(r); return wi===null||wi<0 })
        if (kanbanSystem) backlogItems=backlogItems.filter(r=>r['ระบบงาน']===kanbanSystem)
        if (kanbanSort==='urgency') backlogItems=[...backlogItems].sort((a,b)=>(URG_ORDER[a.__urgency]??9)-(URG_ORDER[b.__urgency]??9))
        else if (kanbanSort==='system') backlogItems=[...backlogItems].sort((a,b)=>(a['ระบบงาน']||'').localeCompare(b['ระบบงาน']||''))

        const weekItems = wi => allPending.filter(r=>getItemWeekIdx(r)===wi)

        const assignItem = (idx, wi, dayOffset, dev) => {
          setKanbanAssignments(prev=>({...prev,[idx]:{wi, day:dayOffset}}))
          if (dev) setKanbanAssignDev(prev=>({...prev,[idx]:dev}))
          setOpenAssignIdx(null); setOpenAssignWeek(null)
        }
        const unassignItem = idx => {
          setKanbanAssignments(prev=>{ const n={...prev}; delete n[idx]; return n })
          setKanbanAssignDev(prev=>{ const n={...prev}; delete n[idx]; return n })
        }
        const clearAll = () => { setKanbanAssignments({}); setKanbanAssignDev({}) }

        // Export Kanban → Excel
        const exportKanban = () => {
          const wb = XLSX.utils.book_new()
          // Sheet: Backlog
          const backlogRows = backlogItems.map(r=>({
            'Dev':        kanbanAssignDev[r.__idx]||r['นักพัฒนา']||'',
            'แพลตฟอร์ม': r['แพลตฟอร์ม']||'',
            'ระบบงาน':   r['ระบบงาน']||'',
            'ความเร่งด่วน': r.__urgency||'',
            'สถานะ':     r.__status||'',
            'รายละเอียด': r['เจอปัญหา']||r['หัวข้อ/รายละเอียด']||r.detail||'',
          }))
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backlogRows.length?backlogRows:[{note:'ไม่มีรายการ'}]), 'Backlog')
          // Sheet: แต่ละสัปดาห์
          weeks.forEach((w,wi)=>{
            const wItems=weekItems(wi)
            const rows=wItems.map(r=>{
              const a=getAssignment(r.__idx)
              return {
                'สัปดาห์':    `สัปดาห์ ${wi+1} (${thFmt(w.start)}–${thFmt(w.end)})`,
                'วันที่กำหนด': a?.day!==undefined ? DAY_FULL[a.day] : '',
                'Dev':        kanbanAssignDev[r.__idx]||r['นักพัฒนา']||'',
                'แพลตฟอร์ม': r['แพลตฟอร์ม']||'',
                'ระบบงาน':   r['ระบบงาน']||'',
                'ความเร่งด่วน': r.__urgency||'',
                'สถานะ':     r.__status||'',
                'รายละเอียด': r['เจอปัญหา']||r['หัวข้อ/รายละเอียด']||r.detail||'',
              }
            })
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length?rows:[{note:'ไม่มีงาน'}]), `W${wi+1}`)
          })
          XLSX.writeFile(wb, `Kanban_${kanbanStart}_to_${kanbanEnd}.xlsx`)
        }

        // KanbanCard component
        const KanbanCard = ({ item, showUnassign, showAssignBtn }) => {
          const idx      = item.__idx
          const dev      = kanbanAssignDev[idx]||item['นักพัฒนา']||'—'
          const dc       = devColorMap[dev]||'#94a3b8'
          const detail   = item['เจอปัญหา']||item['หัวข้อ/รายละเอียด']||item.detail||''
          const due      = item['วันที่ต้องได้']||item['วันที่เสร็จ']||''
          const isManual = getAssignment(idx)!==undefined
          const assignedDay = isManual ? getAssignment(idx)?.day : undefined
          return (
            <div style={{background:'var(--bg-card,var(--bg-main))',borderRadius:7,padding:'7px 9px',
              borderLeft:`3px solid ${dc}`,border:`1px solid ${isManual?dc+'55':'var(--border)'}`,
              boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:4,marginBottom:3}}>
                <span style={{fontSize:10,fontWeight:700,color:dc,background:`${dc}22`,padding:'1px 6px',borderRadius:10,flexShrink:0}}>{dev}</span>
                <div style={{display:'flex',gap:3,alignItems:'center',flexWrap:'nowrap'}}>
                  {item.__urgency && <span style={{fontSize:9,color:URG_COLOR[item.__urgency]||'#94a3b8',fontWeight:700,whiteSpace:'nowrap'}}>{item.__urgency}</span>}
                  {assignedDay!==undefined && <span style={{fontSize:9,background:'#2563eb22',color:'#2563eb',padding:'0 5px',borderRadius:8,fontWeight:600}}>{DAY_TH[assignedDay]}</span>}
                  {showUnassign && isManual && <button onClick={()=>unassignItem(idx)} style={{fontSize:10,color:'#ef4444',background:'none',border:'none',cursor:'pointer',padding:'0 2px',lineHeight:1}}>✕</button>}
                </div>
              </div>
              {item['ระบบงาน'] && <div style={{fontSize:9,color:'var(--text-muted)',marginBottom:2}}>{item['ระบบงาน']}</div>}
              <div style={{fontSize:11,color:'var(--text-primary)',lineHeight:1.4,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}} title={detail}>{detail||'—'}</div>
              <div style={{marginTop:5,display:'flex',justifyContent:'space-between',alignItems:'center',gap:4,flexWrap:'wrap'}}>
                {item.__status && <span style={{fontSize:9,background:(STATUS_COLOR[item.__status]||'#94a3b8')+'22',color:STATUS_COLOR[item.__status]||'#94a3b8',padding:'1px 6px',borderRadius:8,fontWeight:600}}>{item.__status}</span>}
                {due && !isManual && <span style={{fontSize:9,color:'var(--text-muted)'}}>{due}</span>}
                {showAssignBtn && (
                  <div style={{position:'relative',marginLeft:'auto'}}>
                    <button onClick={()=>{ setOpenAssignIdx(prev=>prev===idx?null:idx); setOpenAssignWeek(null) }}
                      style={{fontSize:9,padding:'2px 7px',borderRadius:6,background:'#2563eb',color:'#fff',border:'none',cursor:'pointer',fontWeight:600}}>
                      + กำหนด
                    </button>
                    {openAssignIdx===idx && (
                      <div style={{position:'absolute',bottom:'110%',left:0,zIndex:300,
                        background:'var(--bg-card,var(--bg-main))',border:'1px solid var(--border)',
                        borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,0.18)',padding:10,minWidth:220,maxHeight:400,overflowY:'auto'}}>
                        <div style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',marginBottom:6}}>1. เลือก Dev</div>
                        <select className="filter-select" style={{width:'100%',marginBottom:8,fontSize:11}}
                          value={kanbanAssignDev[idx]||item['นักพัฒนา']||''}
                          onChange={e=>setKanbanAssignDev(prev=>({...prev,[idx]:e.target.value}))}>
                          <option value="">-- Dev --</option>
                          {devList.map(d=><option key={d} value={d}>{d}</option>)}
                        </select>
                        <div style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',marginBottom:6}}>2. เลือกสัปดาห์</div>
                        {weeks.map((w,wi)=>(
                          <div key={wi}>
                            <button onClick={()=>setOpenAssignWeek(prev=>prev===wi?null:wi)}
                              style={{display:'flex',justifyContent:'space-between',width:'100%',textAlign:'left',
                                padding:'4px 8px',marginBottom:2,borderRadius:5,cursor:'pointer',fontSize:10,fontWeight:600,
                                background: openAssignWeek===wi?'#2563eb22':'var(--bg-main)',
                                color: openAssignWeek===wi?'#2563eb':'var(--text-primary)',
                                border:`1px solid ${openAssignWeek===wi?'#2563eb44':'var(--border)'}`,
                              }}>
                              <span>สัปดาห์ {wi+1}: {thFmt(w.start)}–{thFmt(w.end)}</span>
                              <span>{openAssignWeek===wi?'▲':'▼'}</span>
                            </button>
                            {openAssignWeek===wi && (
                              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,padding:'4px 2px 6px',background:'var(--bg-secondary)',borderRadius:5,marginBottom:4}}>
                                {w.days.map((d,di)=>(
                                  <button key={di}
                                    onClick={()=>assignItem(idx,wi,di,kanbanAssignDev[idx]||item['นักพัฒนา']||'')}
                                    style={{padding:'4px 2px',borderRadius:4,fontSize:9,fontWeight:700,cursor:'pointer',textAlign:'center',
                                      background: di>=5?'#f1f5f9':'var(--bg-main)',
                                      color: di>=5?'#94a3b8':'var(--text-primary)',
                                      border:'1px solid var(--border)'}}>
                                    <div>{DAY_TH[di]}</div>
                                    <div style={{fontSize:8,fontWeight:400,color:'var(--text-muted)'}}>{d.getDate()}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        }

        return (
          <>
            <div className="section-label" style={{marginTop:24}}>📌 Kanban รายสัปดาห์</div>
            <div className="chart-card" style={{padding:'14px'}}>

              {/* Controls */}
              <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end',marginBottom:12}}>
                <div><div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:5}}>วันที่เริ่ม</div>
                  <input type="date" className="filter-input" value={kanbanStart} onChange={e=>setKanbanStart(e.target.value)}/></div>
                <div><div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:5}}>ถึงวันที่</div>
                  <input type="date" className="filter-input" value={kanbanEnd} onChange={e=>setKanbanEnd(e.target.value)}/></div>
                <div><div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:5}}>แพลตฟอร์ม</div>
                  <select className="filter-select" value={kanbanPlatform} onChange={e=>setKanbanPlatform(e.target.value)}>
                    <option value="">ทุกแพลตฟอร์ม</option>
                    {platformList.map(p=><option key={p} value={p}>{p}</option>)}
                  </select></div>
                <div><div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:5}}>เรียง Backlog</div>
                  <select className="filter-select" value={kanbanSort} onChange={e=>setKanbanSort(e.target.value)}>
                    <option value="urgency">ความเร่งด่วน</option>
                    <option value="system">ระบบงาน</option>
                    <option value="default">ตามลำดับ</option>
                  </select></div>
                <div><div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:5}}>ระบบงาน</div>
                  <select className="filter-select" value={kanbanSystem} onChange={e=>setKanbanSystem(e.target.value)}>
                    <option value="">ทุกระบบ</option>
                    {systemList.map(s=><option key={s} value={s}>{s}</option>)}
                  </select></div>
                <div style={{flex:1,minWidth:160}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:5}}>
                    Dev {kanbanDevFilter.length>0&&<button onClick={()=>setKanbanDevFilter([])} style={{marginLeft:6,fontSize:10,color:'#ef4444',background:'none',border:'none',cursor:'pointer',padding:0}}>ล้าง</button>}
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                    {devList.map(d=>(
                      <label key={d} style={{cursor:'pointer',padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:600,userSelect:'none',
                        background:kanbanDevFilter.includes(d)?devColorMap[d]:'var(--bg-main)',
                        color:kanbanDevFilter.includes(d)?'#fff':'var(--text-primary)',
                        border:`1px solid ${kanbanDevFilter.includes(d)?devColorMap[d]:'var(--border)'}`,
                      }}>
                        <input type="checkbox" style={{display:'none'}} checked={kanbanDevFilter.includes(d)} onChange={()=>toggleKDev(d)}/>{d}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{display:'flex',gap:8,alignSelf:'flex-end'}}>
                  {Object.keys(kanbanAssignments).length>0&&(
                    <button onClick={clearAll} style={{padding:'5px 10px',borderRadius:7,background:'#fee2e2',color:'#ef4444',border:'1px solid #fca5a5',cursor:'pointer',fontSize:11,fontWeight:600}}>🗑 ล้าง</button>
                  )}
                  <button onClick={exportKanban}
                    style={{padding:'5px 12px',borderRadius:7,background:'#10b981',color:'#fff',border:'none',cursor:'pointer',fontSize:11,fontWeight:600}}>
                    📥 Export Excel
                  </button>
                </div>
              </div>

              {weeks.length===0 ? (
                <div style={{textAlign:'center',padding:24,color:'var(--text-muted)',fontSize:12}}>กรุณาเลือกช่วงวันที่</div>
              ) : (
                <div style={{display:'flex',gap:0,alignItems:'flex-start'}}>

                  {/* Backlog */}
                  <div style={{width:220,flexShrink:0,marginRight:12}}>
                    <div style={{background:'#475569',color:'#e2e8f0',borderRadius:'8px 8px 0 0',
                      padding:'7px 10px',fontSize:11,fontWeight:700,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span>📋 Backlog</span>
                      <span style={{background:'#fff3',borderRadius:10,padding:'1px 7px'}}>{backlogItems.length}</span>
                    </div>
                    <div style={{background:'var(--bg-secondary)',borderRadius:'0 0 8px 8px',padding:6,
                      display:'flex',flexDirection:'column',gap:5,maxHeight:'65vh',overflowY:'auto',
                      border:'1px solid var(--border)',borderTop:'none'}}>
                      {backlogItems.length===0&&<div style={{textAlign:'center',color:'var(--text-muted)',fontSize:11,padding:'16px 0'}}>ไม่มีรายการ</div>}
                      {backlogItems.map(item=><KanbanCard key={item.__idx} item={item} showAssignBtn showUnassign={false}/>)}
                    </div>
                  </div>

                  {/* Week columns */}
                  <div style={{overflowX:'auto',flex:1,paddingBottom:8}}>
                    <div style={{display:'flex',gap:10,alignItems:'flex-start',minWidth:`${weeks.length*215}px`}}>
                      {weeks.map((w,wi)=>{
                        const wItems=weekItems(wi)
                        const isThisWeek=new Date()>=w.start&&new Date()<=w.end
                        const byDev={}
                        wItems.forEach(r=>{ const d=kanbanAssignDev[r.__idx]||r['นักพัฒนา']||'ไม่ระบุ'; if(!byDev[d])byDev[d]=[]; byDev[d].push(r) })
                        // group by day within column
                        const byDay={}
                        wItems.forEach(r=>{ const a=getAssignment(r.__idx); const dk=a?.day!==undefined?a.day:'auto'; if(!byDay[dk])byDay[dk]=[]; byDay[dk].push(r) })
                        return (
                          <div key={wi} style={{width:208,flexShrink:0}}>
                            <div style={{background:isThisWeek?'#2563eb':'#334155',color:'#e2e8f0',
                              borderRadius:'8px 8px 0 0',padding:'7px 10px',fontSize:11,fontWeight:700,
                              display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                              <div>
                                <div>สัปดาห์ {wi+1} {isThisWeek&&<span style={{fontSize:9,background:'#fff3',borderRadius:8,padding:'1px 5px'}}>สัปดาห์นี้</span>}</div>
                                <div style={{fontSize:9,fontWeight:400,opacity:0.8}}>{thFmt(w.start)} – {thFmt(w.end)}</div>
                              </div>
                              <span style={{background:'#fff3',borderRadius:10,padding:'1px 7px',minWidth:20,textAlign:'center'}}>{wItems.length}</span>
                            </div>
                            <div style={{background:'var(--bg-secondary)',borderRadius:'0 0 8px 8px',padding:6,
                              minHeight:80,maxHeight:'65vh',overflowY:'auto',border:'1px solid var(--border)',borderTop:'none'}}>
                              {wItems.length===0&&<div style={{textAlign:'center',color:'var(--text-muted)',fontSize:10,padding:'14px 0'}}>ไม่มีงาน</div>}
                              {/* แสดงตาม dev แล้วจัดกลุ่มย่อยด้วยวัน */}
                              {Object.entries(byDev).map(([d,items])=>(
                                <div key={d} style={{marginBottom:6}}>
                                  <div style={{fontSize:9,fontWeight:700,color:devColorMap[d]||'#94a3b8',
                                    borderBottom:`1px solid ${devColorMap[d]||'#94a3b8'}44`,paddingBottom:3,marginBottom:4}}>
                                    {d} ({items.length})
                                  </div>
                                  {/* จัดกลุ่มย่อยตามวัน */}
                                  {(() => {
                                    const dayGroups={}
                                    items.forEach(r=>{ const a=getAssignment(r.__idx); const dk=a?.day!==undefined?a.day:-1; if(!dayGroups[dk])dayGroups[dk]=[]; dayGroups[dk].push(r) })
                                    return Object.entries(dayGroups).map(([dk,gitems])=>(
                                      <div key={dk}>
                                        {dk!=='-1' && <div style={{fontSize:8,color:'#2563eb',fontWeight:600,padding:'2px 0',letterSpacing:0.3}}>{DAY_FULL[parseInt(dk)]} {thFmtFull(w.days[parseInt(dk)])}</div>}
                                        <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:4}}>
                                          {gitems.map(item=><KanbanCard key={item.__idx} item={item} showUnassign showAssignBtn={false}/>)}
                                        </div>
                                      </div>
                                    ))
                                  })()}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )
      })()}

      {/* Detail Table — dynamic columns + resizable */}
      {(() => {
        const cols = defectColumns.length > 0 ? defectColumns : ['วันที่','ระบบงาน','สถานะระบบ','ด่วน/ไม่ด่วน','สถานะดำเนินการ','หัวข้อ/รายละเอียด','สถานะทำ Mantis','ผู้รับผิดชอบ']
        const uniqueStatuses  = [...new Set((defectList||[]).map(r=>r.__status).filter(Boolean))]
        const uniqueUrgency   = [...new Set((defectList||[]).map(r=>r.__urgency).filter(Boolean))]
        const uniquePlatforms = [...new Set((defectList||[]).map(r=>r['แพลตฟอร์ม']).filter(Boolean))]
        const uniqueTypes     = [...new Set((defectList||[]).map(r=>r['ประเภทปัญหา']).filter(Boolean))]
        const filtered = (defectList||[]).filter(r => {
          // แสดงเฉพาะ record ที่มีข้อมูลในคอลัมน์ หัวข้อ/รายละเอียด
          const detail = r['เจอปัญหา'] || r['หัวข้อ/รายละเอียด'] || r.detail || ''
          if (!detail.trim()) return false
          if (filterStatus   && r.__status           !== filterStatus)   return false
          if (filterUrgency  && r.__urgency          !== filterUrgency)  return false
          if (filterPlatform && r['แพลตฟอร์ม']      !== filterPlatform) return false
          if (filterType     && r['ประเภทปัญหา']     !== filterType)     return false
          if (search.trim()) {
            const q = search.toLowerCase()
            return cols.some(col => (r[col]||'').toLowerCase().includes(q))
          }
          return true
        })
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
        const paged = pageSize === 0 ? filtered : filtered.slice((page-1)*pageSize, page*pageSize)
        return (
          <>
            <div className="section-label" style={{marginTop:24}}>📋 รายการทั้งหมด</div>
            <div className="chart-card" style={{padding:'14px 14px 0'}}>
              <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
                <input className="filter-input" placeholder="🔍 ค้นหาทุก column..."
                  value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} style={{width:260}}/>
                <select className="filter-select" value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1)}}>
                  <option value="">ทุกสถานะ</option>
                  {uniqueStatuses.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <select className="filter-select" value={filterUrgency} onChange={e=>{setFilterUrgency(e.target.value);setPage(1)}}>
                  <option value="">ทุกระดับความเร่งด่วน</option>
                  {uniqueUrgency.map(u=><option key={u} value={u}>{u}</option>)}
                </select>
                <select className="filter-select" value={filterPlatform} onChange={e=>{setFilterPlatform(e.target.value);setPage(1)}}>
                  <option value="">ทุกแพลตฟอร์ม</option>
                  {uniquePlatforms.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
                <select className="filter-select" value={filterType} onChange={e=>{setFilterType(e.target.value);setPage(1)}}>
                  <option value="">ทุกประเภทปัญหา</option>
                  {uniqueTypes.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
                <div style={{display:'flex',alignItems:'center',gap:6,marginLeft:'auto'}}>
                  <span style={{fontSize:11,color:'var(--text-muted)'}}>แสดง</span>
                  <select
                    className="filter-select"
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                    style={{width:80}}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={0}>ทั้งหมด</option>
                  </select>
                  <span style={{fontSize:11,color:'var(--text-muted)'}}>รายการ / {fmt(filtered.length)} รายการ</span>
                </div>
              </div>

              <div style={{overflowX:'auto', overflowY:'auto', maxHeight:'60vh', borderRadius:8, border:'1px solid var(--border)'}}>
                <table style={{borderCollapse:'collapse',fontSize:12,tableLayout:'fixed',width:'max-content',minWidth:'100%'}}>
                  <colgroup>
                    <col style={{width:40}}/>
                    {cols.map(col => (
                      <col key={col} style={{width: colWidths[col] || (col.length > 12 ? 160 : col.length > 6 ? 130 : 100)}}/>
                    ))}
                  </colgroup>
                  <thead style={{position:'sticky',top:0,zIndex:10}}>
                    <tr style={{background:'#334155',borderBottom:'2px solid var(--border)'}}>
                      <th style={{padding:'8px 10px',textAlign:'left',color:'#e2e8f0',fontSize:11,whiteSpace:'nowrap',fontWeight:700}}>#</th>
                      {cols.map(col => {
                        const w = colWidths[col] || (col.length > 12 ? 160 : col.length > 6 ? 130 : 100)
                        return (
                          <th key={col} style={{
                            padding:'8px 10px', paddingRight:14,
                            textAlign:'left',color:'#e2e8f0',fontSize:11,
                            whiteSpace:'nowrap',fontWeight:700,
                            position:'relative',
                            width: w, minWidth: w,
                            userSelect:'none',
                          }}>
                            {col}
                            {/* drag handle — แถบขวา 8px จับง่าย */}
                            <div
                              onMouseDown={e => { e.preventDefault(); startColResize(col, e.clientX, w) }}
                              style={{
                                position:'absolute',right:0,top:0,bottom:0,width:8,
                                cursor:'col-resize',
                                background:'transparent',
                                borderRight:'2px solid #475569',
                              }}
                              title="ลากเพื่อปรับความกว้าง"
                            />
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 && (
                      <tr><td colSpan={cols.length+1} style={{textAlign:'center',padding:32,color:'var(--text-muted)'}}>ไม่พบข้อมูล</td></tr>
                    )}
                    {paged.map((r,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'var(--bg-secondary)'}}>
                        <td style={{padding:'6px 10px',color:'var(--text-muted)',fontSize:11,whiteSpace:'nowrap'}}>{pageSize === 0 ? i+1 : (page-1)*pageSize+i+1}</td>
                        {cols.map(col => {
                          const val = r[col] || ''
                          const isStatus  = STATUS_COLOR[val] && val
                          const isUrgency = !isStatus && URG_COLOR[val] && val
                          return (
                            <td key={col} style={{padding:'6px 10px',color:'var(--text-primary)',lineHeight:1.4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:0}}>
                              {isStatus ? (
                                <span style={{background:(STATUS_COLOR[val])+'22',color:STATUS_COLOR[val],padding:'2px 8px',borderRadius:5,fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>{val}</span>
                              ) : isUrgency ? (
                                <span style={{background:(URG_COLOR[val])+'22',color:URG_COLOR[val],padding:'2px 8px',borderRadius:5,fontSize:11,fontWeight:700}}>{val}</span>
                              ) : val ? <span title={val}>{val}</span> : <span style={{color:'#cbd5e1'}}>—</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && pageSize !== 0 && (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:14}}>
                  <button className="page-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>←</button>
                  {Array.from({length:Math.min(totalPages,7)},(_,i)=>{
                    const p=totalPages<=7?i+1:page<=4?i+1:page+i-3>totalPages?totalPages-6+i:page+i-3
                    return p>=1&&p<=totalPages?(<button key={p} className={`page-btn${page===p?' active':''}`} onClick={()=>setPage(p)}>{p}</button>):null
                  })}
                  <button className="page-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>→</button>
                  <span style={{fontSize:11,color:'var(--text-muted)'}}>หน้า {page}/{totalPages}</span>
                </div>
              )}
            </div>
          </>
        )
      })()}
    </div>
  )
}

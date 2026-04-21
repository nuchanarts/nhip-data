import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

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

const PAGE_SIZE = 20

export default function DefectRequest({ data, defectLoading, defectError, defectCountdown, defectSheetUrl, setDefectSheetUrl, onRetryDefect }) {
  const { defect_status, defect_system, defect_urgency, defectList, defectColumns = [] } = data
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUrgency, setFilterUrgency] = useState('')
  const [page, setPage] = useState(1)
  const [showUrlEdit, setShowUrlEdit] = useState(false)
  const [urlInput, setUrlInput] = useState(defectSheetUrl || '')
  useEffect(() => { setUrlInput(defectSheetUrl || '') }, [defectSheetUrl])
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

      {/* Detail Table — dynamic columns + resizable */}
      {(() => {
        const cols = defectColumns.length > 0 ? defectColumns : ['วันที่','ระบบงาน','สถานะระบบ','ด่วน/ไม่ด่วน','สถานะดำเนินการ','หัวข้อ/รายละเอียด','สถานะทำ Mantis','ผู้รับผิดชอบ']
        const uniqueStatuses = [...new Set((defectList||[]).map(r=>r.__status).filter(Boolean))]
        const uniqueUrgency  = [...new Set((defectList||[]).map(r=>r.__urgency).filter(Boolean))]
        const filtered = (defectList||[]).filter(r => {
          if (filterStatus  && r.__status  !== filterStatus)  return false
          if (filterUrgency && r.__urgency !== filterUrgency) return false
          if (search.trim()) {
            const q = search.toLowerCase()
            return cols.some(col => (r[col]||'').toLowerCase().includes(q))
          }
          return true
        })
        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
        const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
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
                  <option value="">ทุกระดับ</option>
                  {uniqueUrgency.map(u=><option key={u} value={u}>{u}</option>)}
                </select>
                <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:'auto'}}>{fmt(filtered.length)} รายการ</span>
              </div>

              <div style={{overflowX:'auto', overflowY:'auto', maxHeight:'60vh', borderRadius:8, border:'1px solid var(--border)'}}>
                <table style={{borderCollapse:'collapse',fontSize:12,tableLayout:'fixed',width:'max-content',minWidth:'100%'}}>
                  <colgroup>
                    <col style={{width:40}}/>
                    {cols.map(col => (
                      <col key={col} style={{width: col.length > 12 ? 160 : col.length > 6 ? 130 : 100}}/>
                    ))}
                  </colgroup>
                  <thead style={{position:'sticky',top:0,zIndex:10}}>
                    <tr style={{background:'#334155',borderBottom:'2px solid var(--border)'}}>
                      <th style={{padding:'8px 10px',textAlign:'left',color:'#e2e8f0',fontSize:11,whiteSpace:'nowrap',fontWeight:700,position:'relative',overflow:'hidden',resize:'horizontal'}}>#</th>
                      {cols.map(col => (
                        <th key={col} style={{
                          padding:'8px 10px',textAlign:'left',color:'#e2e8f0',fontSize:11,
                          whiteSpace:'nowrap',fontWeight:700,
                          position:'relative',overflow:'hidden',
                          resize:'horizontal',         // ← ลากขยายได้
                          cursor:'col-resize',
                          borderRight:'1px solid #475569',
                          userSelect:'none',
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 && (
                      <tr><td colSpan={cols.length+1} style={{textAlign:'center',padding:32,color:'var(--text-muted)'}}>ไม่พบข้อมูล</td></tr>
                    )}
                    {paged.map((r,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'var(--bg-secondary)'}}>
                        <td style={{padding:'6px 10px',color:'var(--text-muted)',fontSize:11,whiteSpace:'nowrap'}}>{(page-1)*PAGE_SIZE+i+1}</td>
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

              {totalPages > 1 && (
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

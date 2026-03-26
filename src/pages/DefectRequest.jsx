import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const STATUS_COLOR = {
  'แก้ไขเรียบร้อย':'#10b981','จัดทำ MANTIS':'#2563eb','รอแจ้งทีมพัฒนา':'#f59e0b',
  'รอทีมพัฒนา':'#f97316','ยกเลิก':'#94a3b8','รอ compile':'#7c3aed','ส่งกลับนักพัฒนา':'#ef4444','จัดทำ Taiga':'#06b6d4'
}
const URG_COLOR = {'ด่วน':'#ef4444','ปกติ':'#64748b'}
const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

const PAGE_SIZE = 20

export default function DefectRequest({ data }) {
  const { defect_status, defect_system, defect_urgency, defectList } = data
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUrgency, setFilterUrgency] = useState('')
  const [page, setPage] = useState(1)

  const ds = defect_status || {}
  const dsys = defect_system || {}
  const du = defect_urgency || {}

  const total = Object.values(ds).reduce((a,b)=>a+b,0) || 1
  const done  = ds['แก้ไขเรียบร้อย']||0
  const pending = total - done
  const urgent = du['ด่วน']||0
  const normal = du['ปกติ']||0

  const statusData = Object.entries(ds).map(([name,value])=>({name,value,color:STATUS_COLOR[name]||'#94a3b8'}))
  const sysData = Object.entries(dsys).map(([name,value])=>({name,value})).slice(0,10)
  const urgData = [{name:'ด่วน',value:urgent},{name:'ปกติ',value:normal}]

  return (
    <div className="page">
      <div className="page-title">🐞 Defect & Request Tracking</div>
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
        <div className="prog-list">
          {statusData.map(item=>(
            <div key={item.name} className="prog-item">
              <div className="prog-top">
                <span className="prog-name">{item.name}</span>
                <span className="prog-val" style={{color:item.color}}>{fmt(item.value)} <span style={{color:'var(--text-muted)',fontSize:11}}>({((item.value/total)*100).toFixed(1)}%)</span></span>
              </div>
              <div className="prog-track">
                <div className="prog-fill" style={{width:`${(item.value/total)*100}%`,background:item.color}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Table */}
      {(() => {
        const uniqueStatuses = [...new Set((defectList||[]).map(r=>r.status).filter(Boolean))]
        const filtered = (defectList||[]).filter(r => {
          if (filterStatus  && r.status  !== filterStatus)  return false
          if (filterUrgency && r.urgency !== filterUrgency) return false
          if (search.trim()) {
            const q = search.toLowerCase()
            return (r.detail||'').toLowerCase().includes(q)
              || (r.system||'').toLowerCase().includes(q)
              || (r.responsible||'').toLowerCase().includes(q)
              || (r.mantis||'').toLowerCase().includes(q)
          }
          return true
        })
        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
        const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
        return (
          <>
            <div className="section-label" style={{marginTop:24}}>📋 รายการทั้งหมด</div>
            <div className="chart-card">
              {/* Filters */}
              <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
                <input className="filter-input" placeholder="🔍 ค้นหา รายละเอียด / ระบบ / ผู้รับผิดชอบ..."
                  value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} style={{width:280}}/>
                <select className="filter-select" value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1)}}>
                  <option value="">ทุกสถานะ</option>
                  {uniqueStatuses.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <select className="filter-select" value={filterUrgency} onChange={e=>{setFilterUrgency(e.target.value);setPage(1)}}>
                  <option value="">ด่วน/ปกติ</option>
                  <option value="ด่วน">ด่วน</option>
                  <option value="ปกติ">ปกติ</option>
                </select>
                <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:'auto'}}>{fmt(filtered.length)} รายการ</span>
              </div>

              {/* Table */}
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
                  <thead>
                    <tr style={{background:'var(--bg-secondary)',borderBottom:'2px solid var(--border)'}}>
                      {['#','วันที่เจอปัญหา','ระบบงาน','สถานะระบบ','ด่วน/ไม่ด่วน','สถานะดำเนินการ','หัวข้อ/รายละเอียด','สถานะทำ Mantis','ผู้รับผิดชอบ'].map(h=>(
                        <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,
                          color:'var(--text-secondary)',fontSize:11,whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 && (
                      <tr><td colSpan={9} style={{textAlign:'center',padding:32,color:'var(--text-muted)'}}>ไม่พบข้อมูล</td></tr>
                    )}
                    {paged.map((r,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'var(--bg-secondary)'}}>
                        <td style={{padding:'7px 12px',color:'var(--text-muted)',fontSize:11}}>{(page-1)*PAGE_SIZE+i+1}</td>
                        <td style={{padding:'7px 12px',whiteSpace:'nowrap',color:'var(--text-secondary)'}}>{r.date||'—'}</td>
                        <td style={{padding:'7px 12px',fontWeight:500,color:'var(--text-primary)',maxWidth:140}}>{r.system||'—'}</td>
                        <td style={{padding:'7px 12px',color:'var(--text-secondary)'}}>{r.sys_status||'—'}</td>
                        <td style={{padding:'7px 12px',textAlign:'center'}}>
                          {r.urgency ? <span style={{
                            background:(URG_COLOR[r.urgency]||'#94a3b8')+'22',
                            color:URG_COLOR[r.urgency]||'#94a3b8',
                            padding:'2px 8px',borderRadius:5,fontSize:11,fontWeight:700
                          }}>{r.urgency}</span> : '—'}
                        </td>
                        <td style={{padding:'7px 12px',textAlign:'center'}}>
                          {r.status ? <span style={{
                            background:(STATUS_COLOR[r.status]||'#94a3b8')+'22',
                            color:STATUS_COLOR[r.status]||'#94a3b8',
                            padding:'2px 8px',borderRadius:5,fontSize:11,fontWeight:600,whiteSpace:'nowrap'
                          }}>{r.status}</span> : '—'}
                        </td>
                        <td style={{padding:'7px 12px',color:'var(--text-primary)',maxWidth:260,lineHeight:1.4}}>{r.detail||'—'}</td>
                        <td style={{padding:'7px 12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{r.mantis||'—'}</td>
                        <td style={{padding:'7px 12px',fontWeight:500,color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{r.responsible||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
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

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

const STATUS_COLOR = {'ดำเนินการแล้ว':'#10b981','กำลังดำเนินการ':'#f59e0b','รอดำเนินการ':'#ef4444','ไม่ดำเนินการ':'#94a3b8'}
const PAGE_SIZE = 20

export default function CallCenter({ data }) {
  const { standby_type, standby_status, defect_status, defect_urgency, callList } = data
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType]     = useState('')
  const [page, setPage]                 = useState(1)

  const exportExcel = (filtered) => {
    const rows = filtered.map((r,i) => ({
      'ลำดับ': i+1,
      'วันที่': r.date||'',
      'จังหวัด': r.province||'',
      'รพ.สต.': r.hospital||'',
      'สถานะ': r.status||'',
      'ประเภท': r.type||'',
      'ผู้รับแจ้ง': r.receiver||'',
      'ผู้ดำเนินการ': r.operator||'',
      'หัวข้อ/รายละเอียด': r.detail||'',
      'แนวทางแก้ไข': r.solution||'',
      'ระยะเวลา(ชม.)': r.dur_hr||'',
      'ระยะเวลา(นาที)': r.dur_min||'',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb2 = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb2, ws, 'CallCenter')
    XLSX.writeFile(wb2, `CallCenter_${new Date().toLocaleDateString('th-TH').replace(/\//g,'-')}.xlsx`)
  }

  const st = standby_type || {}
  const ss = standby_status || {}
  const du = defect_urgency || { ด่วน:42, ปกติ:106 }

  const totalTicket = Object.values(st).reduce((a,b)=>a+b,0) || 1
  const totalStatus = Object.values(ss).filter((_,i)=>Object.keys(ss)[i]!=='None').reduce((a,b)=>a+b,0) || 1
  const done    = ss['ดำเนินการแล้ว']||0
  const inProg  = ss['กำลังดำเนินการ']||0
  const waiting = ss['รอดำเนินการ']||0
  const slaRate = ((done/totalStatus)*100).toFixed(1)

  const COLORS = ['#2563eb','#10b981','#f59e0b','#ef4444','#7c3aed','#06b6d4','#f97316','#84cc16']
  const typeData   = Object.entries(st).filter(([k])=>k!=='None').map(([name,value])=>({name,value}))
  const statusData = [
    {name:'ดำเนินการแล้ว', value:done,    color:'#10b981'},
    {name:'กำลังดำเนินการ', value:inProg,  color:'#f59e0b'},
    {name:'รอดำเนินการ',   value:waiting, color:'#ef4444'},
  ].filter(x=>x.value>0)

  const urgData = [
    {name:'ด่วน', value:du['ด่วน']||0,   color:'#ef4444'},
    {name:'ปกติ', value:du['ปกติ']||0,   color:'#2563eb'},
  ]

  return (
    <div className="page">
      <div className="page-title">☎️ Call Center Module</div>
      <div className="page-desc">รับ Ticket / Issue — จำแนกปัญหาการใช้งาน, Defect, Request และติดตาม SLA</div>

      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginTop:20}}>
        {[
          {color:'c-blue',   icon:'📞', val:fmt(totalTicket), label:'Ticket ทั้งหมด',    pct:'100%'},
          {color:'c-green',  icon:'✅', val:fmt(done),         label:'แก้ไขแล้ว',         pct:`${((done/totalStatus)*100).toFixed(0)}%`},
          {color:'c-orange', icon:'🔄', val:fmt(inProg),       label:'กำลังดำเนินการ',   pct:`${((inProg/totalStatus)*100).toFixed(0)}%`},
          {color:'c-purple', icon:'📊', val:`${slaRate}%`,     label:'SLA Achievement',  pct:slaRate+'%'},
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <span className="kpi-pct">{k.pct}</span>
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-bar"><div className="kpi-bar-fill" style={{width:k.pct}}/></div>
          </div>
        ))}
      </div>

      <div className="section-label" style={{marginTop:24}}>ประเภท Ticket และสถานะ</div>
      <div className="charts-row charts-row-3">
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">ประเภท Ticket</div>
              <div className="chart-sub">รวม {fmt(totalTicket)} รายการ</div></div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeData} layout="vertical" margin={{top:5,right:20,bottom:5,left:110}}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
              <XAxis type="number" tick={{fill:'#64748b',fontSize:11}}/>
              <YAxis type="category" dataKey="name" tick={{fill:'#64748b',fontSize:11}} width={105}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="value" name="จำนวน" radius={[0,6,6,0]}>
                {typeData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">SLA Status</div>
              <div className="chart-sub">การแก้ไขตามเวลา</div></div>
          </div>
          <div style={{marginTop:8}}>
            {/* SLA gauge */}
            <div style={{textAlign:'center',marginBottom:16}}>
              <div style={{fontSize:42,fontWeight:800,color:'#10b981'}}>{slaRate}%</div>
              <div style={{fontSize:13,color:'var(--text-secondary)'}}>อัตราการแก้ไขสำเร็จ</div>
            </div>
            <div className="prog-list">
              {statusData.map(item=>(
                <div key={item.name} className="prog-item">
                  <div className="prog-top">
                    <span className="prog-name">{item.name}</span>
                    <span className="prog-val" style={{color:item.color}}>{fmt(item.value)}</span>
                  </div>
                  <div className="prog-track">
                    <div className="prog-fill" style={{width:`${(item.value/totalStatus)*100}%`,background:item.color}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section-label" style={{marginTop:24}}>ระดับความเร่งด่วน Defect/Request</div>
      <div className="charts-row charts-row-2">
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">ด่วน vs ปกติ</div></div>
          </div>
          <div className="donut-container" style={{marginTop:8}}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={urgData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={4} dataKey="value">
                  {urgData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie><Tooltip content={<TT/>}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-legend">
              {urgData.map((item,i)=>(
                <div key={i} className="leg-item">
                  <div className="leg-dot" style={{background:item.color}}/>
                  <span className="leg-name">{item.name}</span>
                  <span className="leg-val">{fmt(item.value)}</span>
                  <span className="leg-pct">({((item.value/((du['ด่วน']||0)+(du['ปกติ']||0)||1))*100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">สรุปภาพรวม Call Center</div></div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:16,marginTop:8}}>
            {[
              {label:'Ticket ที่รับแล้ว', val:fmt(totalTicket), icon:'📋', color:'#2563eb'},
              {label:'แก้ไขสำเร็จ',       val:fmt(done),        icon:'✅', color:'#10b981'},
              {label:'อยู่ระหว่างดำเนินการ', val:fmt(inProg),   icon:'🔄', color:'#f59e0b'},
              {label:'รอดำเนินการ',        val:fmt(waiting),    icon:'⏳', color:'#ef4444'},
            ].map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'var(--bg-main)',borderRadius:10}}>
                <span style={{fontSize:20}}>{s.icon}</span>
                <span style={{flex:1,fontSize:13,color:'var(--text-secondary)'}}>{s.label}</span>
                <span style={{fontSize:18,fontWeight:800,color:s.color}}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail Table */}
      {(() => {
        const list = callList || []
        const uniqueStatuses = [...new Set(list.map(r=>r.status).filter(Boolean))]
        const uniqueTypes    = [...new Set(list.map(r=>r.type).filter(Boolean))]
        const filtered = list.filter(r => {
          if (filterStatus && r.status !== filterStatus) return false
          if (filterType   && r.type   !== filterType)   return false
          if (search.trim()) {
            const q = search.toLowerCase()
            return (r.hospital||'').toLowerCase().includes(q)
              || (r.province||'').toLowerCase().includes(q)
              || (r.detail||'').toLowerCase().includes(q)
              || (r.solution||'').toLowerCase().includes(q)
              || (r.operator||'').toLowerCase().includes(q)
              || (r.receiver||'').toLowerCase().includes(q)
          }
          return true
        })
        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
        const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
        return (
          <>
            <div className="section-label" style={{marginTop:24}}>📋 รายการ Ticket ทั้งหมด</div>
            <div className="chart-card">
              {/* Filters */}
              <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
                <input className="filter-input" placeholder="🔍 ค้นหา รพ.สต. / จังหวัด / รายละเอียด / ผู้ดำเนินการ..."
                  value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} style={{width:300}}/>
                <select className="filter-select" value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1)}}>
                  <option value="">ทุกสถานะ</option>
                  {uniqueStatuses.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <select className="filter-select" value={filterType} onChange={e=>{setFilterType(e.target.value);setPage(1)}}>
                  <option value="">ทุกประเภท</option>
                  {uniqueTypes.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
                <span style={{fontSize:12,color:'var(--text-muted)'}}>{fmt(filtered.length)} รายการ</span>
                <button onClick={()=>exportExcel(filtered)} style={{marginLeft:'auto',padding:'6px 14px',background:'#10b981',color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
                  📥 Export Excel ({fmt(filtered.length)})
                </button>
              </div>

              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead>
                    <tr style={{background:'var(--bg-secondary)',borderBottom:'2px solid var(--border)'}}>
                      {['#','วันที่','จังหวัด','รพ.สต.','สถานะ','ประเภท','ผู้รับแจ้ง','ผู้ดำเนินการ','หัวข้อ/รายละเอียด','แนวทางแก้ไข','ชม.','นาที'].map(h=>(
                        <th key={h} style={{padding:'8px 10px',textAlign:'left',fontWeight:600,
                          color:'var(--text-secondary)',fontSize:11,whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length===0 && (
                      <tr><td colSpan={12} style={{textAlign:'center',padding:32,color:'var(--text-muted)'}}>ไม่พบข้อมูล</td></tr>
                    )}
                    {paged.map((r,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'var(--bg-secondary)'}}>
                        <td style={{padding:'6px 10px',color:'var(--text-muted)',fontSize:11}}>{(page-1)*PAGE_SIZE+i+1}</td>
                        <td style={{padding:'6px 10px',whiteSpace:'nowrap',color:'var(--text-secondary)',fontWeight:500}}>{r.date||'—'}</td>
                        <td style={{padding:'6px 10px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{r.province||'—'}</td>
                        <td style={{padding:'6px 10px',fontWeight:500,color:'var(--text-primary)',maxWidth:160}}>{r.hospital||'—'}</td>
                        <td style={{padding:'6px 10px',textAlign:'center'}}>
                          {r.status ? <span style={{
                            background:(STATUS_COLOR[r.status]||'#94a3b8')+'22',
                            color:STATUS_COLOR[r.status]||'#94a3b8',
                            padding:'2px 8px',borderRadius:5,fontSize:10,fontWeight:700,whiteSpace:'nowrap'
                          }}>{r.status}</span> : '—'}
                        </td>
                        <td style={{padding:'6px 10px',color:'#2563eb',fontWeight:500,whiteSpace:'nowrap',fontSize:11}}>{r.type||'—'}</td>
                        <td style={{padding:'6px 10px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{r.receiver||'—'}</td>
                        <td style={{padding:'6px 10px',fontWeight:500,color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{r.operator||'—'}</td>
                        <td style={{padding:'6px 10px',color:'var(--text-primary)',maxWidth:220,lineHeight:1.4}}>{r.detail||'—'}</td>
                        <td style={{padding:'6px 10px',color:'var(--text-secondary)',maxWidth:200,lineHeight:1.4}}>{r.solution||'—'}</td>
                        <td style={{padding:'6px 10px',textAlign:'center',fontWeight:700,color:'#0ea5e9'}}>{r.dur_hr||'—'}</td>
                        <td style={{padding:'6px 10px',textAlign:'center',fontWeight:700,color:'#06b6d4'}}>{r.dur_min||'—'}</td>
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

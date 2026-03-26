import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name}: {Number(p.value).toLocaleString()}</div>)}
  </div>) : null

const norm = s => (s||'').trim().replace(/\s+/g,' ')

export default function InstallerMgmt({ data }) {
  const { installList } = data
  const [sortCol, setSortCol] = useState('installed')
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  // นับจาก installList.responsible ครบทุกคน
  const workerMap = {}
  ;(installList||[]).forEach(r => {
    const name = norm(r.responsible)
    if (!name) return
    if (!workerMap[name]) workerMap[name] = {
      name, installed:0, active:0, parallel:0, inProgress:0, inactive:0, cancelled:0
    }
    workerMap[name].installed++
    if (r.status === 'ใช้งานระบบ')       workerMap[name].active++
    else if (r.status === 'ใช้งานคู่ขนาน') workerMap[name].parallel++
    else if (r.status === 'ไม่ได้ใช้งาน' || r.status === 'เลิกใช้งาน') workerMap[name].inactive++
    if (r.progress === 'อยู่ในระหว่างดำเนินการ') workerMap[name].inProgress++
  })

  const sortFns = {
    installed:  (a,b) => b.installed  - a.installed,
    active:     (a,b) => b.active     - a.active,
    parallel:   (a,b) => b.parallel   - a.parallel,
    inProgress: (a,b) => b.inProgress - a.inProgress,
    inactive:   (a,b) => b.inactive   - a.inactive,
    pct:        (a,b) => (b.installed>0?b.active/b.installed:0) - (a.installed>0?a.active/a.installed:0),
    name:       (a,b) => a.name.localeCompare(b.name,'th'),
  }
  const list = Object.values(workerMap).sort((a,b) => {
    const fn = sortFns[sortCol] || sortFns.installed
    return sortDir === 'asc' ? -fn(a,b) : fn(a,b)
  })

  const totalInstalled = list.reduce((a,i)=>a+i.installed,0) || 1
  const totalActive    = list.reduce((a,i)=>a+i.active,0)
  const totalParallel  = list.reduce((a,i)=>a+i.parallel,0)
  const totalInProg    = list.reduce((a,i)=>a+i.inProgress,0)

  const barData = list.map(i=>({
    name: i.name,
    ใช้งานระบบ: i.active,
    ใช้งานคู่ขนาน: i.parallel,
    กำลังทำ: i.inProgress,
    ไม่ได้ใช้งาน: i.inactive,
  }))

  return (
    <div className="page">
      <div className="page-title">👤 ทีมผู้ติดตั้ง</div>
      <div className="page-desc">Installer Management — ติดตามผลงานและ performance ของทีมผู้ติดตั้งแต่ละคน</div>

      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginTop:20}}>
        {[
          {color:'c-blue',  icon:'👥', val:fmt(list.length),       label:'จำนวนทีม'},
          {color:'c-green', icon:'✅', val:fmt(totalActive),        label:'ใช้งานระบบแล้ว'},
          {color:'c-purple',icon:'🔄', val:fmt(totalParallel),      label:'ใช้งานคู่ขนาน'},
          {color:'c-orange',icon:'⚙️', val:fmt(totalInProg),        label:'กำลังดำเนินการ'},
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="section-label" style={{marginTop:24}}>ผลงานรายบุคคล</div>
      <div className="chart-card" style={{marginBottom:22}}>
        <div className="chart-header">
          <div><div className="chart-title">Stacked Bar — ผลงานแยกสถานะต่อคน</div></div>
          <span className="chart-badge">Team Performance</span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData} margin={{top:5,right:10,bottom:5,left:0}}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:11}}/>
            <YAxis tick={{fill:'#64748b',fontSize:11}}/>
            <Tooltip content={<TT/>}/>
            <Bar dataKey="ใช้งานระบบ" stackId="a" fill="#10b981" radius={[0,0,0,0]}/>
            <Bar dataKey="ใช้งานคู่ขนาน" stackId="a" fill="#06b6d4"/>
            <Bar dataKey="กำลังทำ" stackId="a" fill="#f59e0b"/>
            <Bar dataKey="ไม่ได้ใช้งาน" stackId="a" fill="#e2e8f0" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
        <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:8,flexWrap:'wrap'}}>
          {[['#10b981','ใช้งานระบบ'],['#06b6d4','ใช้งานคู่ขนาน'],['#f59e0b','กำลังทำ'],['#e2e8f0','ไม่ได้ใช้งาน']].map(([c,l])=>(
            <div key={l} className="leg-item"><div className="leg-dot" style={{background:c}}/><span className="leg-name">{l}</span></div>
          ))}
        </div>
      </div>

      {/* Individual Cards */}
      <div className="section-label" style={{marginTop:24}}>👤 ผลงานรายบุคคล — ทุกคน ({list.length} คน)</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14,marginBottom:24}}>
        {list.map((inst,i)=>{
          const pct     = inst.installed > 0 ? ((inst.active / inst.installed)*100).toFixed(0) : 0
          const donePct = inst.installed > 0 ? (((inst.active+inst.parallel) / inst.installed)*100).toFixed(0) : 0
          const medal   = i===0?'🥇':i===1?'🥈':i===2?'🥉':null
          return (
            <div key={i} style={{background:'var(--bg-card)',border:`1px solid ${i<3?'#f59e0b44':'var(--border)'}`,borderRadius:14,padding:'16px 18px',
              boxShadow:i<3?'0 0 0 2px #f59e0b22':'none'}}>
              {/* Header */}
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#2563eb,#7c3aed)',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'#fff',flexShrink:0}}>
                  {inst.name?.charAt(0)||'?'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:15,color:'var(--text-primary)',display:'flex',alignItems:'center',gap:6}}>
                    {medal && <span>{medal}</span>}
                    {inst.name}
                  </div>
                  <div style={{fontSize:11,color:'var(--text-secondary)'}}>อันดับ {i+1} · {fmt(inst.installed)} แห่ง</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:20,fontWeight:800,color:'#10b981'}}>{donePct}%</div>
                  <div style={{fontSize:10,color:'var(--text-secondary)'}}>active rate</div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{marginBottom:12}}>
                <div style={{height:8,background:'var(--border)',borderRadius:6,overflow:'hidden',display:'flex'}}>
                  <div style={{width:`${inst.installed>0?(inst.active/inst.installed)*100:0}%`,height:'100%',background:'#10b981'}}/>
                  <div style={{width:`${inst.installed>0?(inst.parallel/inst.installed)*100:0}%`,height:'100%',background:'#06b6d4'}}/>
                  <div style={{width:`${inst.installed>0?(inst.inProgress/inst.installed)*100:0}%`,height:'100%',background:'#f59e0b'}}/>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {[
                  {label:'ติดตั้งทั้งหมด', val:inst.installed,      color:'var(--text-primary)', bg:'var(--bg-secondary)'},
                  {label:'ใช้งานระบบ',      val:inst.active,          color:'#10b981',             bg:'#10b98112'},
                  {label:'ใช้งานคู่ขนาน',  val:inst.parallel,        color:'#06b6d4',             bg:'#06b6d412'},
                  {label:'กำลังดำเนินการ', val:inst.inProgress,      color:'#f59e0b',             bg:'#f59e0b12'},
                  {label:'ยกเลิก',          val:inst.cancelled||0,    color:'#ef4444',             bg:'#ef444412'},
                  {label:'ไม่ได้ใช้งาน',   val:inst.inactive||0,     color:'#94a3b8',             bg:'var(--bg-secondary)'},
                ].map((s,j)=>(
                  <div key={j} style={{background:s.bg,borderRadius:8,padding:'6px 10px'}}>
                    <div style={{fontSize:10,color:'var(--text-secondary)',marginBottom:2}}>{s.label}</div>
                    <div style={{fontSize:16,fontWeight:700,color:s.color}}>{fmt(s.val)}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ทีมงาน */}
      <div className="section-label">👥 ทีมงาน รวม</div>
      <div className="chart-card">
        {(() => {
          const arrow = col => sortCol===col ? (sortDir==='desc'?'▼':'▲') : '⇅'
          const thStyle = (col, extra={}) => ({
            cursor:'pointer', userSelect:'none',
            color: sortCol===col ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: sortCol===col ? 700 : 500,
            display:'flex', alignItems:'center', gap:3, justifyContent: extra.textAlign==='right'?'flex-end':'flex-start',
            ...extra
          })
          return (
        <div className="lb-header" style={{cursor:'default'}}>
          <span style={{width:32}}>#</span>
          <span style={{width:80,cursor:'pointer',userSelect:'none',fontWeight:sortCol==='name'?700:500,color:sortCol==='name'?'var(--text-primary)':'var(--text-secondary)'}}
            onClick={()=>handleSort('name')}>ทีมงาน {arrow('name')}</span>
          {[
            {col:'installed', label:'ติดตั้งแล้ว'},
            {col:'active',    label:'ใช้งานระบบ'},
            {col:'parallel',  label:'คู่ขนาน'},
            {col:'inProgress',label:'กำลังทำ'},
            {col:'inactive',  label:'ไม่ใช้งาน'},
          ].map(({col,label})=>(
            <span key={col} onClick={()=>handleSort(col)}
              style={{flex:1,textAlign:'right',cursor:'pointer',userSelect:'none',
                fontWeight:sortCol===col?700:500,color:sortCol===col?'var(--text-primary)':'var(--text-secondary)'}}>
              {label} {arrow(col)}
            </span>
          ))}
          <span onClick={()=>handleSort('pct')}
            style={{width:130,cursor:'pointer',userSelect:'none',
              fontWeight:sortCol==='pct'?700:500,color:sortCol==='pct'?'var(--text-primary)':'var(--text-secondary)'}}>
            อัตราสำเร็จ {arrow('pct')}
          </span>
        </div>
          )
        })()}
        {list.map((inst,i)=>{
          const pct = inst.installed > 0 ? ((inst.active/inst.installed)*100).toFixed(0) : 0
          return (
            <div key={i} className={`lb-row${i<3?' lb-top':''}`}>
              <span className="lb-rank">{i<3?['🥇','🥈','🥉'][i]:i+1}</span>
              <span style={{width:80,fontWeight:700}}>{inst.name}</span>
              <span style={{flex:1,textAlign:'right',fontWeight:700}}>{fmt(inst.installed)}</span>
              <span style={{flex:1,textAlign:'right',color:'#10b981'}}>{fmt(inst.active)}</span>
              <span style={{flex:1,textAlign:'right',color:'#06b6d4'}}>{fmt(inst.parallel)}</span>
              <span style={{flex:1,textAlign:'right',color:'#f59e0b'}}>{fmt(inst.inProgress)}</span>
              <span style={{flex:1,textAlign:'right',color:'#94a3b8'}}>{fmt(inst.inactive)}</span>
              <div style={{width:130,display:'flex',alignItems:'center',gap:6}}>
                <div style={{flex:1,height:6,background:'var(--border)',borderRadius:6,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,#10b981,#34d399)`,borderRadius:6}}/>
                </div>
                <span style={{fontSize:11,color:'var(--text-secondary)',width:30}}>{pct}%</span>
              </div>
            </div>
          )
        })}
        {/* รวม */}
        <div className="lb-row" style={{borderTop:'2px solid var(--border)',marginTop:4,paddingTop:8,fontWeight:700}}>
          <span style={{width:32}}></span>
          <span style={{width:80,color:'var(--text-primary)'}}>รวม</span>
          <span style={{flex:1,textAlign:'right',color:'var(--text-primary)'}}>{fmt(totalInstalled)}</span>
          <span style={{flex:1,textAlign:'right',color:'#10b981'}}>{fmt(totalActive)}</span>
          <span style={{flex:1,textAlign:'right',color:'#06b6d4'}}>{fmt(totalParallel)}</span>
          <span style={{flex:1,textAlign:'right',color:'#f59e0b'}}>{fmt(totalInProg)}</span>
          <span style={{flex:1,textAlign:'right',color:'#94a3b8'}}>{fmt(list.reduce((a,i)=>a+(i.inactive||0),0))}</span>
          <div style={{width:130,display:'flex',alignItems:'center',gap:6}}>
            <div style={{flex:1,height:6,background:'var(--border)',borderRadius:6,overflow:'hidden'}}>
              <div style={{width:`${((totalActive/totalInstalled)*100).toFixed(0)}%`,height:'100%',background:'linear-gradient(90deg,#2563eb,#60a5fa)',borderRadius:6}}/>
            </div>
            <span style={{fontSize:11,color:'var(--text-secondary)',width:30}}>{((totalActive/totalInstalled)*100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

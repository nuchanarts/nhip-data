import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name}: {Number(p.value).toLocaleString()}</div>)}
  </div>) : null

export default function InstallerMgmt({ data }) {
  const { installers } = data
  const list = [...(installers||[])].sort((a,b)=>(b.installed+b.inProgress)-(a.installed+a.inProgress))

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

      {/* Leaderboard */}
      <div className="section-label">🏆 Leaderboard</div>
      <div className="chart-card">
        <div className="lb-header">
          <span style={{width:32}}>#</span>
          <span style={{width:80}}>ชื่อเล่น</span>
          <span style={{flex:1,textAlign:'right'}}>ติดตั้งแล้ว</span>
          <span style={{flex:1,textAlign:'right'}}>ใช้งานระบบ</span>
          <span style={{flex:1,textAlign:'right'}}>คู่ขนาน</span>
          <span style={{flex:1,textAlign:'right'}}>กำลังทำ</span>
          <span style={{flex:1,textAlign:'right'}}>ไม่ใช้งาน</span>
          <span style={{width:130}}>อัตราสำเร็จ</span>
        </div>
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
      </div>
    </div>
  )
}

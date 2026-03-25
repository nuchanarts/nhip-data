import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area } from 'recharts'

const COLORS = ['#2563eb','#10b981','#f59e0b','#ef4444','#7c3aed','#06b6d4','#f97316']
const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

export default function InstallTracking({ data }) {
  const { job_status, progress, regions, monthly, installers } = data
  const totalJS = Object.values(job_status).reduce((a,b)=>a+b,0) || 1
  const done = progress['ดำเนินการแล้ว']||0
  const inProg = progress['อยู่ในระหว่างดำเนินการ']||0
  const notYet = progress['ยังไม่ติดตั้ง']||0

  const progData = [
    {name:'ดำเนินการแล้ว', value:done, color:'#10b981'},
    {name:'กำลังดำเนินการ', value:inProg, color:'#f59e0b'},
    {name:'ยังไม่ติดตั้ง', value:notYet, color:'#ef4444'},
  ]

  const monthlyData = Object.entries(monthly).map(([k,v])=>{
    const [yr,mo]=k.split('-')
    const mn=['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    return {name:`${mn[+mo]} ${+yr+543}`,value:v}
  })

  const regionData = Object.entries(regions).map(([k,v])=>({name:`เขต ${k}`,value:v}))

  const sortedInstallers = [...(installers||[])].sort((a,b)=>(b.installed+b.inProgress)-(a.installed+a.inProgress)).slice(0,15)

  return (
    <div className="page">
      <div className="page-title">🚀 ติดตามการติดตั้ง</div>
      <div className="page-desc">Installation Tracking Module — ติดตาม progress การติดตั้งระบบ NHIP ทั่วประเทศ</div>

      {/* KPI */}
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginTop:20}}>
        {progData.map((p,i)=>(
          <div key={i} className={`kpi-card ${i===0?'c-green':i===1?'c-orange':'c-red'}`}>
            <div className="kpi-value">{fmt(p.value)}</div>
            <div className="kpi-label">{p.name}</div>
            <span className="kpi-pct">{((p.value/totalJS)*100).toFixed(1)}%</span>
            <div className="kpi-bar"><div className="kpi-bar-fill" style={{width:`${(p.value/totalJS)*100}%`}}/></div>
          </div>
        ))}
      </div>

      {/* Progress summary */}
      <div className="section-label" style={{marginTop:24}}>ความคืบหน้าภาพรวม</div>
      <div className="charts-row charts-row-3">
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">แนวโน้มการติดตั้งรายเดือน</div></div>
            <span className="chart-badge">Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{top:5,right:10,bottom:5,left:0}}>
              <defs><linearGradient id="grn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:10}}/>
              <YAxis tick={{fill:'#64748b',fontSize:11}}/>
              <Tooltip content={<TT/>}/>
              <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} fill="url(#grn)" dot={{fill:'#10b981',r:4}} name="จำนวน"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">สัดส่วนความคืบหน้า</div></div>
          </div>
          <div className="donut-container">
            <ResponsiveContainer width={150} height={150}>
              <PieChart><Pie data={progData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value">
                {progData.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie><Tooltip content={<TT/>}/></PieChart>
            </ResponsiveContainer>
            <div className="donut-legend">
              {progData.map((item,i)=>(
                <div key={i} className="leg-item">
                  <div className="leg-dot" style={{background:item.color}}/>
                  <span className="leg-name">{item.name}</span>
                  <span className="leg-val">{fmt(item.value)}</span>
                  <span className="leg-pct">({((item.value/totalJS)*100).toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Region */}
      <div className="section-label" style={{marginTop:24}}>แยกตามเขตสุขภาพ</div>
      <div className="charts-row charts-row-full">
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">จำนวน รพ.สต. แต่ละเขต</div>
              <div className="chart-sub">เขต 1–12</div></div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={regionData} margin={{top:5,right:10,bottom:5,left:0}}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:10}}/>
              <YAxis tick={{fill:'#64748b',fontSize:11}}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="value" name="จำนวน" radius={[5,5,0,0]}>
                {regionData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Installer Leaderboard */}
      <div className="section-label" style={{marginTop:24}}>🏆 Leaderboard ผู้ติดตั้ง</div>
      <div className="chart-card">
        <div className="chart-header">
          <div><div className="chart-title">ผลงานการติดตั้งแยกรายบุคคล</div>
            <div className="chart-sub">เรียงตามจำนวนที่ดำเนินการมากสุด</div></div>
          <span className="chart-badge">Top {sortedInstallers.length}</span>
        </div>
        <div className="leaderboard">
          <div className="lb-header">
            <span style={{width:28}}>#</span>
            <span style={{flex:1}}>ชื่อ</span>
            <span style={{width:80,textAlign:'right'}}>ติดตั้งแล้ว</span>
            <span style={{width:80,textAlign:'right'}}>ใช้งานระบบ</span>
            <span style={{width:80,textAlign:'right'}}>คู่ขนาน</span>
            <span style={{width:70,textAlign:'right'}}>กำลังทำ</span>
            <span style={{width:120}}>Progress</span>
          </div>
          {sortedInstallers.map((inst, i) => {
            const total = inst.installed || 1
            const activePct = ((inst.active / total) * 100).toFixed(0)
            return (
              <div key={i} className={`lb-row${i < 3 ? ' lb-top' : ''}`}>
                <span className="lb-rank">{i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</span>
                <span style={{flex:1, fontWeight:600}}>{inst.name}</span>
                <span style={{width:80, textAlign:'right', color:'var(--text-primary)', fontWeight:700}}>{fmt(inst.installed)}</span>
                <span style={{width:80, textAlign:'right', color:'#10b981', fontWeight:600}}>{fmt(inst.active)}</span>
                <span style={{width:80, textAlign:'right', color:'#06b6d4'}}>{fmt(inst.parallel)}</span>
                <span style={{width:70, textAlign:'right', color:'#f59e0b'}}>{fmt(inst.inProgress)}</span>
                <div style={{width:120, display:'flex', alignItems:'center', gap:6}}>
                  <div style={{flex:1, height:6, background:'var(--border)', borderRadius:6, overflow:'hidden'}}>
                    <div style={{width:`${activePct}%`, height:'100%', background:'linear-gradient(90deg,#10b981,#34d399)', borderRadius:6}}/>
                  </div>
                  <span style={{fontSize:11, color:'var(--text-secondary)', width:30}}>{activePct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

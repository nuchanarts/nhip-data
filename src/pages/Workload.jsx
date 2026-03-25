import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

const SB_MONTHLY = {'2025-09':76,'2025-10':171,'2025-11':133,'2025-12':692,'2026-01':567,'2026-02':1341,'2026-03':496}

export default function Workload({ data }) {
  const { installers, standby_type } = data

  const total = Object.values(SB_MONTHLY).reduce((a,b)=>a+b,0)
  const monthlyData = Object.entries(SB_MONTHLY).map(([k,v])=>{
    const [yr,mo]=k.split('-')
    const mn=['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    return {name:`${mn[+mo]} ${+yr+543}`,value:v}
  })

  const installerWork = [...(installers||[])].map(i=>({
    name: i.name,
    งาน: i.installed + i.inProgress,
  })).sort((a,b)=>b.งาน-a.งาน)

  const COLORS = ['#2563eb','#10b981','#f59e0b','#7c3aed','#06b6d4','#f97316','#ef4444','#84cc16','#e879f9','#0ea5e9','#a3e635','#fb7185','#34d399']

  return (
    <div className="page">
      <div className="page-title">⏱️ Workload / Time Tracking</div>
      <div className="page-desc">ติดตามภาระงานของทีม — วิเคราะห์ผลงาน, ชั่วโมงทำงาน และ productivity</div>

      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginTop:20}}>
        {[
          {color:'c-blue',  icon:'📋', val:fmt(total),          label:'Ticket ทั้งหมด (Stand-by)'},
          {color:'c-green', icon:'👥', val:fmt((installers||[]).length), label:'จำนวนทีมผู้ติดตั้ง'},
          {color:'c-orange',icon:'📈', val:fmt(monthlyData.slice(-1)[0]?.value||0), label:'Ticket เดือนล่าสุด'},
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="section-label" style={{marginTop:24}}>ภาระงานรายเดือน (Stand-by Ticket)</div>
      <div className="chart-card" style={{marginBottom:22}}>
        <div className="chart-header">
          <div><div className="chart-title">จำนวน Ticket แยกตามเดือน</div>
            <div className="chart-sub">ย้อนหลัง {monthlyData.length} เดือน • รวม {fmt(total)} ครั้ง</div></div>
          <span className="chart-badge">Workload Trend</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyData} margin={{top:5,right:10,bottom:5,left:0}}>
            <defs>
              <linearGradient id="wkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:11}}/>
            <YAxis tick={{fill:'#64748b',fontSize:11}}/>
            <Tooltip content={<TT/>}/>
            <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2.5}
              fill="url(#wkGrad)" dot={{fill:'#7c3aed',r:4}} activeDot={{r:6,strokeWidth:0}} name="Ticket"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="section-label">ภาระงานแยกตามผู้ติดตั้ง</div>
      <div className="chart-card" style={{marginBottom:22}}>
        <div className="chart-header">
          <div><div className="chart-title">จำนวนงานที่ดำเนินการต่อคน</div>
            <div className="chart-sub">นับจาก (ติดตั้งแล้ว + กำลังดำเนินการ)</div></div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={installerWork} margin={{top:5,right:10,bottom:5,left:0}}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:11}}/>
            <YAxis tick={{fill:'#64748b',fontSize:11}}/>
            <Tooltip content={<TT/>}/>
            <Bar dataKey="งาน" name="จำนวนงาน" radius={[5,5,0,0]}>
              {installerWork.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="section-label">ประเภทงานที่ทีมรับ</div>
      <div className="chart-card">
        <div className="prog-list">
          {Object.entries(standby_type||{}).filter(([k])=>k!=='None').map(([name,val],i)=>{
            const total2 = Object.values(standby_type||{}).reduce((a,b)=>a+b,0)||1
            const pct = ((val/total2)*100).toFixed(1)
            return (
              <div key={name} className="prog-item">
                <div className="prog-top">
                  <span className="prog-name">{name}</span>
                  <span className="prog-val" style={{color:COLORS[i%COLORS.length]}}>{fmt(val)} <span style={{color:'var(--text-muted)',fontSize:11}}>({pct}%)</span></span>
                </div>
                <div className="prog-track">
                  <div className="prog-fill" style={{width:`${pct}%`,background:COLORS[i%COLORS.length]}}/>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

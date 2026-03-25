import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const COLORS = ['#2563eb','#10b981','#f59e0b','#ef4444','#7c3aed','#06b6d4','#f97316','#84cc16']
const STATUS_COLOR = {'ดำเนินการแล้ว':'#10b981','กำลังดำเนินการ':'#f59e0b','รอดำเนินการ':'#ef4444','ไม่ดำเนินการ':'#94a3b8'}
const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

export default function StandbyQA({ data }) {
  const { standby_type, standby_status } = data

  const st = standby_type || {}
  const ss = standby_status || {}
  const totalType   = Object.values(st).reduce((a,b)=>a+b,0) || 1
  const totalStatus = Object.values(ss).filter((_,i)=>Object.keys(ss)[i]!=='None').reduce((a,b)=>a+b,0) || 1
  const done = ss['ดำเนินการแล้ว']||0
  const inProg = ss['กำลังดำเนินการ']||0
  const waiting = ss['รอดำเนินการ']||0

  const typeData  = Object.entries(st).filter(([k])=>k!=='None').map(([name,value])=>({name,value}))
  const statusData = Object.entries(ss).filter(([k])=>k!=='None').map(([name,value])=>({name,value,color:STATUS_COLOR[name]||'#94a3b8'}))

  return (
    <div className="page">
      <div className="page-title">💬 ถาม-ตอบ / Stand-by Support</div>
      <div className="page-desc">Standby & Q&A Module — บันทึกคำถาม, ปัญหาการใช้งาน และการแก้ไขจากทีม Support</div>

      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginTop:20}}>
        {[
          {color:'c-blue',  icon:'💬', val:fmt(totalType),  label:'ครั้งทั้งหมด',      pct:'100%'},
          {color:'c-green', icon:'✅', val:fmt(done),        label:'ดำเนินการแล้ว',   pct:`${((done/totalStatus)*100).toFixed(0)}%`},
          {color:'c-orange',icon:'🔄', val:fmt(inProg),      label:'กำลังดำเนินการ',  pct:`${((inProg/totalStatus)*100).toFixed(0)}%`},
          {color:'c-red',   icon:'⏳', val:fmt(waiting),     label:'รอดำเนินการ',     pct:`${((waiting/totalStatus)*100).toFixed(0)}%`},
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

      <div className="section-label" style={{marginTop:24}}>จำนวนที่ถามตอบ</div>
      <div className="charts-row charts-row-3">
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">จำนวนที่ถามตอบ (แยกประเภท)</div>
              <div className="chart-sub">รวม {fmt(totalType)} ครั้ง</div></div>
            <span className="chart-badge">Support</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeData} layout="vertical" margin={{top:5,right:20,bottom:5,left:110}}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
              <XAxis type="number" tick={{fill:'#64748b',fontSize:11}}/>
              <YAxis type="category" dataKey="name" tick={{fill:'#64748b',fontSize:11}} width={105}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="value" name="จำนวนครั้ง" radius={[0,6,6,0]}>
                {typeData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">สถานะการแก้ไข</div></div>
          </div>
          <div className="donut-container">
            <ResponsiveContainer width={150} height={150}>
              <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value">
                {statusData.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie><Tooltip content={<TT/>}/></PieChart>
            </ResponsiveContainer>
            <div className="donut-legend">
              {statusData.map((item,i)=>(
                <div key={i} className="leg-item">
                  <div className="leg-dot" style={{background:item.color}}/>
                  <span className="leg-name">{item.name}</span>
                  <span className="leg-val">{fmt(item.value)}</span>
                  <span className="leg-pct">({((item.value/totalStatus)*100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section-label" style={{marginTop:24}}>ความละเอียดสถานะ</div>
      <div className="chart-card">
        <div className="prog-list">
          {statusData.map(item=>(
            <div key={item.name} className="prog-item">
              <div className="prog-top">
                <span className="prog-name">{item.name}</span>
                <span className="prog-val" style={{color:item.color}}>{fmt(item.value)} <span style={{color:'var(--text-muted)',fontSize:11}}>({((item.value/totalStatus)*100).toFixed(1)}%)</span></span>
              </div>
              <div className="prog-track">
                <div className="prog-fill" style={{width:`${(item.value/totalStatus)*100}%`,background:item.color}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

// Call Center data from sheet 7 (standby) - ประเภทปัญหา
export default function CallCenter({ data }) {
  const { standby_type, standby_status, defect_status, defect_urgency } = data

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
    </div>
  )
}

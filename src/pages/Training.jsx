import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

const TRAIN_DATA = {
  type:     {'การใช้งาน':299, 'แบบฟอร์ม':1, 'ข้อมูลพื้นฐาน':1},
  status:   {'รอดำเนินการ':174, 'ดำเนินการแล้ว':127},
  province: {'14-พระนครศรีอยุธยา':46,'67-เพชรบูรณ์':25,'70-ราชบุรี':18,'19-สระบุรี':17,'17-สิงห์บุรี':8,'15-อ่างทอง':6,'56-พะเยา':6,'26-นครนายก':5,'13-ปทุมธานี':2},
  resolver: {'พิมพ์ประภา':47,'วาสนา':13,'บุญรัตน์':10,'ภาณุพงศ์':8,'ชวกร':7,'วณิชญา':5,'ชลสิทธิ์':5,'พัชรพร':3,'ศศิวิมล':3,'กันยกร':2},
  total:    301
}

const COLORS = ['#2563eb','#10b981','#f59e0b','#7c3aed','#06b6d4','#ef4444','#f97316','#84cc16','#e879f9','#0ea5e9']

export default function Training({ data }) {
  const { status, province, resolver, total } = TRAIN_DATA

  const done    = status['ดำเนินการแล้ว']||0
  const waiting = status['รอดำเนินการ']||0
  const donePct = ((done/total)*100).toFixed(1)

  const provinceData = Object.entries(province).map(([name,value])=>({name:name.split('-')[1]||name, value}))
  const resolverData = Object.entries(resolver).map(([name,value])=>({name,value}))
  const statusPie = [
    {name:'ดำเนินการแล้ว', value:done,    color:'#10b981'},
    {name:'รอดำเนินการ',   value:waiting, color:'#f59e0b'},
  ]

  return (
    <div className="page">
      <div className="page-title">🎓 Training Support Module</div>
      <div className="page-desc">เก็บและวิเคราะห์ปัญหาที่เกิดระหว่างการอบรม — ใช้วิเคราะห์ Pain Point และปรับปรุงการสอน</div>

      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginTop:20}}>
        {[
          {color:'c-blue',   icon:'📝', val:fmt(total),   label:'คำถามทั้งหมด',      pct:'100%'},
          {color:'c-green',  icon:'✅', val:fmt(done),    label:'ดำเนินการแล้ว',    pct:`${donePct}%`},
          {color:'c-orange', icon:'⏳', val:fmt(waiting), label:'รอดำเนินการ',      pct:`${((waiting/total)*100).toFixed(1)}%`},
          {color:'c-purple', icon:'👥', val:fmt(resolverData.length), label:'ผู้รับผิดชอบ', pct:''},
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            {k.pct && <span className="kpi-pct">{k.pct}</span>}
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-label">{k.label}</div>
            {k.pct && <div className="kpi-bar"><div className="kpi-bar-fill" style={{width:k.pct}}/></div>}
          </div>
        ))}
      </div>

      <div className="section-label" style={{marginTop:24}}>Pain Point จังหวัดและสถานะ</div>
      <div className="charts-row charts-row-3">
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">ปัญหาแยกตามจังหวัด</div>
              <div className="chart-sub">จังหวัดที่มีคำถามมากสุด</div></div>
            <span className="chart-badge">Pain Point</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={provinceData} layout="vertical" margin={{top:5,right:20,bottom:5,left:80}}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
              <XAxis type="number" tick={{fill:'#64748b',fontSize:11}}/>
              <YAxis type="category" dataKey="name" tick={{fill:'#64748b',fontSize:11}} width={75}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="value" name="จำนวนคำถาม" radius={[0,6,6,0]}>
                {provinceData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">สถานะการตอบ</div></div>
          </div>
          <div className="donut-container" style={{marginTop:16}}>
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={4} dataKey="value">
                  {statusPie.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie><Tooltip content={<TT/>}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-legend">
              {statusPie.map((item,i)=>(
                <div key={i} className="leg-item">
                  <div className="leg-dot" style={{background:item.color}}/>
                  <span className="leg-name">{item.name}</span>
                  <span className="leg-val">{fmt(item.value)}</span>
                  <span className="leg-pct">({((item.value/total)*100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{marginTop:20}}>
            <div style={{fontSize:13,color:'var(--text-secondary)',marginBottom:8}}>ประเภทคำถาม</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {Object.entries(TRAIN_DATA.type).map(([k,v],i)=>(
                <div key={k} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--bg-main)',borderRadius:8}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:COLORS[i],flexShrink:0}}/>
                  <span style={{flex:1,fontSize:12,color:'var(--text-secondary)'}}>{k}</span>
                  <span style={{fontWeight:700,color:'var(--text-primary)'}}>{fmt(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section-label" style={{marginTop:24}}>ผู้รับผิดชอบตอบคำถาม</div>
      <div className="chart-card">
        <div className="chart-header">
          <div><div className="chart-title">Workload ผู้รับผิดชอบ Training Support</div>
            <div className="chart-sub">จำนวนคำถามที่รับผิดชอบต่อคน</div></div>
        </div>
        <div className="lb-header">
          <span style={{width:32}}>#</span>
          <span style={{flex:1}}>ชื่อ</span>
          <span style={{width:80,textAlign:'right'}}>จำนวน</span>
          <span style={{width:180}}>สัดส่วน</span>
        </div>
        {resolverData.sort((a,b)=>b.value-a.value).map((r,i)=>{
          const pct = ((r.value / done) * 100).toFixed(0)
          return (
            <div key={i} className={`lb-row${i<3?' lb-top':''}`}>
              <span className="lb-rank">{i<3?['🥇','🥈','🥉'][i]:i+1}</span>
              <span style={{flex:1,fontWeight:600}}>{r.name}</span>
              <span style={{width:80,textAlign:'right',fontWeight:700,color:'#2563eb'}}>{fmt(r.value)}</span>
              <div style={{width:180,display:'flex',alignItems:'center',gap:8}}>
                <div style={{flex:1,height:6,background:'var(--border)',borderRadius:6,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,#2563eb,#60a5fa)',borderRadius:6}}/>
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

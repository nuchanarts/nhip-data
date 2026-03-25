import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#2563eb','#10b981','#f59e0b','#ef4444','#7c3aed','#06b6d4','#f97316','#84cc16']
const JOB_COLORS = {'รอติดตั้ง':'#f59e0b','ใช้งานระบบ':'#10b981','ใช้งานคู่ขนาน':'#06b6d4','ไม่ได้ใช้งาน':'#ef4444','เลิกใช้งาน':'#94a3b8'}
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

const fmt = n => Number(n).toLocaleString()

export default function Overview({ data }) {
  const { job_status, progress, regions, monthly, standby_status, defect_status, total } = data

  const totalJS = Object.values(job_status).reduce((a,b)=>a+b,0) || 1
  const installed = (job_status['ใช้งานระบบ']||0)+(job_status['ใช้งานคู่ขนาน']||0)
  const waiting   = job_status['รอติดตั้ง']||0
  const inProg    = progress['อยู่ในระหว่างดำเนินการ']||0
  const done      = progress['ดำเนินการแล้ว']||0
  const inactive  = (job_status['ไม่ได้ใช้งาน']||0)+(job_status['เลิกใช้งาน']||0)
  const donePct   = ((done/totalJS)*100).toFixed(1)

  const defectDone    = defect_status?.['แก้ไขเรียบร้อย']||0
  const defectTotal   = Object.values(defect_status||{}).reduce((a,b)=>a+b,0)||1
  const defectDonePct = ((defectDone/defectTotal)*100).toFixed(0)

  const stdbyDone    = standby_status?.['ดำเนินการแล้ว']||0
  const stdbyTotal   = Object.values(standby_status||{}).reduce((a,b)=>a+b,0)||1
  const stdbyPct     = ((stdbyDone/stdbyTotal)*100).toFixed(0)

  const jobPieData = Object.entries(job_status).map(([name,value])=>({name,value}))
  const regionData = Object.entries(regions).map(([k,v])=>({name:`เขต ${k}`,value:v}))
  const monthlyData = Object.entries(monthly).map(([k,v])=>{
    const [yr,mo]=k.split('-')
    const mn=['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    return {name:`${mn[+mo]} ${+yr+543}`,value:v}
  })

  const heroCards = [
    {
      icon: '🚀', label: 'ขึ้นระบบแพลตฟอร์มกลางไปได้เท่าไหร่?',
      pct: `${donePct}%`, pctColor: '#10b981',
      grad: 'linear-gradient(135deg,#065f46,#10b981)',
      bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
      border: '#bbf7d0',
      detail: `ดำเนินการแล้ว ${fmt(done)} จาก ${fmt(totalJS)} แห่ง`,
      barColor: '#10b981', barPct: +donePct,
      tag: 'Installation Progress'
    },
    {
      icon: '⚠️', label: 'พบปัญหาอะไรบ้าง?',
      pct: `${fmt(defectTotal)} รายการ`, pctColor: '#d97706',
      grad: 'linear-gradient(135deg,#78350f,#f59e0b)',
      bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
      border: '#fde68a',
      detail: `ด่วน ${fmt(data.defect_urgency?.['ด่วน']||42)} · ปกติ ${fmt(data.defect_urgency?.['ปกติ']||106)} รายการ`,
      barColor: '#f59e0b', barPct: (data.defect_urgency?.['ด่วน']||42) / ((data.defect_urgency?.['ด่วน']||42)+(data.defect_urgency?.['ปกติ']||106)) * 100,
      tag: 'Defect & Request'
    },
    {
      icon: '🔧', label: 'พัฒนาระบบ — แก้ไขปัญหาได้แล้วกี่ %?',
      pct: `${defectDonePct}%`, pctColor: '#2563eb',
      grad: 'linear-gradient(135deg,#1e3a8a,#2563eb)',
      bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
      border: '#bfdbfe',
      detail: `แก้ไขแล้ว ${fmt(defectDone)} · คงค้าง ${fmt(defectTotal-defectDone)} รายการ`,
      barColor: '#2563eb', barPct: +defectDonePct,
      tag: 'พัฒนาระบบ'
    },
    {
      icon: '💬', label: 'ตอบคำถาม Stand-by ได้กี่ %?',
      pct: `${stdbyPct}%`, pctColor: '#7c3aed',
      grad: 'linear-gradient(135deg,#4c1d95,#7c3aed)',
      bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
      border: '#ddd6fe',
      detail: `ดำเนินการแล้ว ${fmt(stdbyDone)} จาก ${fmt(stdbyTotal)} ครั้ง`,
      barColor: '#7c3aed', barPct: +stdbyPct,
      tag: 'Support SLA'
    },
  ]

  return (
    <div className="page">
      {/* Hero answer cards */}
      <div className="hero-cards">
        {heroCards.map((c,i)=>(
          <div key={i} className="hero-card" style={{background:c.bg, border:`1px solid ${c.border}`}}>
            <div className="hero-card-top">
              <div className="hero-card-icon" style={{background:c.grad}}>{c.icon}</div>
              <span className="hero-card-tag">{c.tag}</span>
            </div>
            <div className="hero-card-label">{c.label}</div>
            <div className="hero-card-pct" style={{color:c.pctColor}}>{c.pct}</div>
            <div className="hero-card-detail">{c.detail}</div>
            <div className="hero-card-bar">
              <div className="hero-card-bar-fill" style={{width:`${Math.min(c.barPct,100)}%`, background:c.barColor}}/>
            </div>
          </div>
        ))}
      </div>

      {/* KPI */}
      <div className="section-label" style={{marginTop:24}}>ตัวชี้วัดหลัก</div>
      <div className="kpi-grid">
        {[
          {color:'c-blue',  icon:'🏥', val:fmt(totalJS),   label:'รพ.สต. ทั้งหมด',       pct:'100%',       bar:100},
          {color:'c-green', icon:'✅', val:fmt(done),       label:'ดำเนินการแล้ว',         pct:`${donePct}%`,bar:+donePct},
          {color:'c-orange',icon:'⏳', val:fmt(waiting),    label:'รอติดตั้ง',             pct:`${((waiting/totalJS)*100).toFixed(1)}%`,bar:(waiting/totalJS)*100},
          {color:'c-purple',icon:'🔄', val:fmt(inProg),     label:'กำลังดำเนินการ',        pct:`${((inProg/totalJS)*100).toFixed(1)}%`, bar:(inProg/totalJS)*100},
          {color:'c-red',   icon:'❌', val:fmt(inactive),   label:'ไม่ได้ใช้งาน',          pct:`${((inactive/totalJS)*100).toFixed(1)}%`,bar:(inactive/totalJS)*100},
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <span className="kpi-pct">{k.pct}</span>
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-bar"><div className="kpi-bar-fill" style={{width:`${Math.min(k.bar,100)}%`}}/></div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="section-label">แนวโน้มการติดตั้งและสถานะ</div>
      <div className="charts-row charts-row-3">
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">จำนวนการติดตั้งรายเดือน</div>
              <div className="chart-sub">ย้อนหลัง {monthlyData.length} เดือน</div></div>
            <span className="chart-badge">Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{top:5,right:10,bottom:5,left:0}}>
              <defs><linearGradient id="aBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
              </linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:11}}/>
              <YAxis tick={{fill:'#64748b',fontSize:11}}/>
              <Tooltip content={<TT/>}/>
              <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5}
                fill="url(#aBlue)" dot={{fill:'#2563eb',r:4}} activeDot={{r:6,strokeWidth:0}} name="จำนวน"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">สถานะงาน</div>
              <div className="chart-sub">จำแนกตามประเภท</div></div>
          </div>
          <div className="donut-container">
            <ResponsiveContainer width={150} height={150}>
              <PieChart><Pie data={jobPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value">
                {jobPieData.map((e,i)=><Cell key={i} fill={JOB_COLORS[e.name]||COLORS[i%COLORS.length]}/>)}
              </Pie><Tooltip content={<TT/>}/></PieChart>
            </ResponsiveContainer>
            <div className="donut-legend">
              {jobPieData.map((item,i)=>(
                <div key={i} className="leg-item">
                  <div className="leg-dot" style={{background:JOB_COLORS[item.name]||COLORS[i%COLORS.length]}}/>
                  <span className="leg-name">{item.name}</span>
                  <span className="leg-val">{fmt(item.value)}</span>
                  <span className="leg-pct">({((item.value/totalJS)*100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="section-label" style={{marginTop:24}}>การกระจายตามเขตสุขภาพ</div>
      <div className="charts-row charts-row-full">
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">จำนวน รพ.สต. แยกตามเขตสุขภาพ 1–12</div>
              <div className="chart-sub">รวม {fmt(totalJS)} แห่งทั่วประเทศ</div></div>
            <span className="chart-badge">12 เขต</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={regionData} margin={{top:5,right:10,bottom:5,left:0}}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:11}}/>
              <YAxis tick={{fill:'#64748b',fontSize:11}}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="value" name="จำนวน" radius={[5,5,0,0]}>
                {regionData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

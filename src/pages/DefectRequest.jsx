import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const STATUS_COLOR = {
  'แก้ไขเรียบร้อย':'#10b981','จัดทำ MANTIS':'#2563eb','รอแจ้งทีมพัฒนา':'#f59e0b',
  'รอทีมพัฒนา':'#f97316','ยกเลิก':'#94a3b8','รอ compile':'#7c3aed','ส่งกลับนักพัฒนา':'#ef4444','จัดทำ Taiga':'#06b6d4'
}
const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

export default function DefectRequest({ data }) {
  const { defect_status, defect_system, defect_urgency } = data

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
    </div>
  )
}

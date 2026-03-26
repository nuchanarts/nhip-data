import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const COLORS = ['#2563eb','#10b981','#f59e0b','#7c3aed','#06b6d4','#f97316','#ef4444','#84cc16']
const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

export default function FacilityMgmt({ data }) {
  const { hospitals, regions, job_status } = data

  const totalJS = Object.values(job_status||{}).reduce((a,b)=>a+b,0) || 1
  const regionData = Object.entries(regions||{}).map(([k,v])=>({name:`เขต ${k}`, value:v}))

  // Aggregate from hospitals sheet
  const byRegion = {}
  ;(hospitals||[]).forEach(h => {
    if (!h.region) return
    if (!byRegion[h.region]) byRegion[h.region] = {region:h.region, finish:0, transferring:0, total:0}
    if (h.status==='finish') byRegion[h.region].finish++
    else byRegion[h.region].transferring++
    byRegion[h.region].total++
  })
  const regionHospData = Object.values(byRegion).sort((a,b)=>a.region-b.region).map(r=>({
    name:`เขต ${r.region}`, finish:r.finish, transferring:r.transferring
  }))

  const finishCount = (hospitals||[]).filter(h=>h.status==='finish').length
  const inTransfer  = (hospitals||[]).filter(h=>h.status!=='finish').length
  const hasHospData = hospitals && hospitals.length > 0

  const statusPie = [
    {name:'Transfer เสร็จแล้ว', value:finishCount, color:'#10b981'},
    {name:'กำลัง Transfer',      value:inTransfer,  color:'#f59e0b'},
  ]

  return (
    <div className="page">
      <div className="page-title">🏥 Facility Management</div>
      <div className="page-desc">บริหารจัดการข้อมูลหน่วยบริการ — Mapping เขต / จังหวัด, hospcode, สถานะการติดตั้ง</div>

      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginTop:20}}>
        {[
          {color:'c-blue',   icon:'🏥', val:fmt(totalJS),                    label:'รพ.สต. ทั้งหมด'},
          {color:'c-purple', icon:'🗺️', val:'12',                             label:'เขตสุขภาพ'},
          {color:'c-green',  icon:'✅', val:fmt(job_status?.['ใช้งานระบบ']||0 + (job_status?.['ใช้งานคู่ขนาน']||0)), label:'ใช้งานระบบแล้ว'},
          {color:'c-orange', icon:'⏳', val:fmt(job_status?.['รอติดตั้ง']||0),label:'รอติดตั้ง'},
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="section-label" style={{marginTop:24}}>การกระจายตามเขตสุขภาพ</div>
      <div className="charts-row charts-row-3">
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">จำนวน รพ.สต. ทั้ง 12 เขต</div>
              <div className="chart-sub">รวม {fmt(totalJS)} แห่ง</div></div>
            <span className="chart-badge">12 เขต</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
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
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">สถานะการติดตั้ง</div></div>
          </div>
          <div className="prog-list" style={{marginTop:8}}>
            {Object.entries(job_status||{}).map(([name,val],i)=>{
              const colors2=['#f59e0b','#10b981','#06b6d4','#ef4444','#94a3b8']
              const pct=((val/totalJS)*100).toFixed(1)
              return (
                <div key={name} className="prog-item">
                  <div className="prog-top">
                    <span className="prog-name">{name}</span>
                    <span className="prog-val" style={{color:colors2[i]}}>{fmt(val)} <span style={{color:'var(--text-muted)',fontSize:11}}>({pct}%)</span></span>
                  </div>
                  <div className="prog-track">
                    <div className="prog-fill" style={{width:`${pct}%`,background:colors2[i]}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>


    </div>
  )
}

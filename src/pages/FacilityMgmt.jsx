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

      {hasHospData && (
        <>
          <div className="section-label" style={{marginTop:24}}>สถานะ Data Transfer แยกเขต</div>
          <div className="charts-row charts-row-3">
            <div className="chart-card">
              <div className="chart-header">
                <div><div className="chart-title">Transfer Status แยกเขต</div></div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={regionHospData} margin={{top:5,right:10,bottom:5,left:0}}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:10}}/>
                  <YAxis tick={{fill:'#64748b',fontSize:11}}/>
                  <Tooltip content={<TT/>}/>
                  <Bar dataKey="finish" name="เสร็จแล้ว" fill="#10b981" radius={[4,4,0,0]} stackId="a"/>
                  <Bar dataKey="transferring" name="กำลัง Transfer" fill="#f59e0b" radius={[4,4,0,0]} stackId="a"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <div className="chart-header">
                <div><div className="chart-title">สัดส่วน Transfer</div>
                  <div className="chart-sub">{hospitals?.length} รพ. ในกลุ่มตัวอย่าง</div></div>
              </div>
              <div className="donut-container">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={4} dataKey="value">
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
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="section-label" style={{marginTop:24}}>รายการ รพ. (กลุ่มตัวอย่าง)</div>
          <div className="chart-card">
            <div className="lb-header">
              <span style={{width:32}}>#</span>
              <span style={{width:80}}>รหัส</span>
              <span style={{width:60,textAlign:'center'}}>เขต</span>
              <span style={{flex:1,textAlign:'right'}}>OVST</span>
              <span style={{flex:1,textAlign:'right'}}>VN_STAT</span>
              <span style={{flex:1,textAlign:'right'}}>OPIItemrece</span>
              <span style={{width:120,textAlign:'center'}}>สถานะ Transfer</span>
            </div>
            {(hospitals||[]).map((h,i)=>(
              <div key={i} className="lb-row">
                <span className="lb-rank">{i+1}</span>
                <span style={{width:80,fontFamily:'monospace',fontWeight:600}}>{h.hospcode}</span>
                <span style={{width:60,textAlign:'center',color:'#7c3aed',fontWeight:600}}>{h.region}</span>
                <span style={{flex:1,textAlign:'right'}}>{fmt(h.ovst)}</span>
                <span style={{flex:1,textAlign:'right'}}>{fmt(h.vn_stat)}</span>
                <span style={{flex:1,textAlign:'right',fontWeight:700,color:'#2563eb'}}>{fmt(h.opitemrece)}</span>
                <span style={{width:120,textAlign:'center'}}>
                  <span style={{
                    background:h.status==='finish'?'#dcfce7':'#fef3c7',
                    color:h.status==='finish'?'#15803d':'#b45309',
                    padding:'2px 10px', borderRadius:4, fontSize:11, fontWeight:600
                  }}>
                    {h.status==='finish'?'✓ เสร็จ':'⏳ กำลัง Transfer'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  )
}

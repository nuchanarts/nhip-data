import { useState, useRef } from 'react'
import html2canvas from 'html2canvas'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, LabelList } from 'recharts'
import * as XLSX from 'xlsx'

const COLORS = ['#2563eb','#10b981','#f59e0b','#ef4444','#7c3aed','#06b6d4','#f97316']
const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

const STATUS_COLOR = {'ดำเนินการแล้ว':'#10b981','อยู่ในระหว่างดำเนินการ':'#f59e0b','ยังไม่ติดตั้ง':'#ef4444'}
const JOB_COLOR   = {'ใช้งานระบบ':'#10b981','ใช้งานคู่ขนาน':'#06b6d4','รอติดตั้ง':'#f59e0b','ไม่ได้ใช้งาน':'#ef4444','เลิกใช้งาน':'#94a3b8'}

export default function InstallTracking({ data }) {
  const { job_status, progress, regions, monthly, installers, regionDone, provinceCnt, migrationDone, installList } = data
  const regionTableRef = useRef(null)

  const exportJpg = async () => {
    if (!regionTableRef.current) return
    const canvas = await html2canvas(regionTableRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const link = document.createElement('a')
    link.download = `สรุปรายงานติดตั้งแยกเขต_${new Date().toLocaleDateString('th-TH').replace(/\//g,'-')}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.95)
    link.click()
  }

  const exportReportJpg = async (regionDoneData) => {
    const today = new Date().toLocaleDateString('th-TH', { day:'2-digit', month:'2-digit', year:'numeric' })

    // สร้าง summary แยกตาม summary status จาก installList
    const regionNums = [1,2,3,4,5,6,7,8,9,10,11,12]
    const STATUSES = [
      { key:'ทำรายงานติดตั้งแล้ว',        label:'ทำรายงานติดตั้งแล้ว',        bg:'#dcfce7', color:'#166534' },
      { key:'รอติดตั้ง',                   label:'รอติดตั้ง',                   bg:'#fef3c7', color:'#92400e' },
      { key:'ยังไม่ทำรายงานติดตั้ง',       label:'ยังไม่ทำรายงานติดตั้ง',       bg:'#fee2e2', color:'#991b1b' },
      { key:'ส่งกลับแก้ไขรายงานติดตั้ง',  label:'ส่งกลับแก้ไขรายงานติดตั้ง',  bg:'#ede9fe', color:'#5b21b6' },
    ]

    // นับแยกตาม summary + region
    const matrix = {}
    STATUSES.forEach(s => { matrix[s.key] = {} })
    ;(installList||[]).forEach(r => {
      const st = (r.summary||'').trim()
      const rg = r.region
      if (matrix[st] && rg) matrix[st][rg] = (matrix[st][rg]||0) + 1
    })

    const wrap = document.createElement('div')
    wrap.style.cssText = 'position:fixed;left:-9999px;top:0;background:#fff;padding:24px;font-family:Sarabun,sans-serif;width:640px'
    document.body.appendChild(wrap)

    const totalAll = regionDoneData.reduce((a,r)=>a+r.total,0)

    wrap.innerHTML = `
      <div style="text-align:center;font-size:15px;font-weight:800;color:#1e3a8a;border-bottom:2px solid #1e3a8a;padding-bottom:8px;margin-bottom:0">
        สถานะการติดตั้ง รพ.สต. แยกตามเขตสุขภาพ
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:0">
        <thead>
          <tr style="background:#1e3a8a;color:#fff">
            <th style="padding:8px 12px;text-align:center;border:1px solid #1e3a8a">วันที่</th>
            <th style="padding:8px 12px;text-align:center;border:1px solid #1e3a8a">สถานะ</th>
            <th style="padding:8px 12px;text-align:center;border:1px solid #1e3a8a">รายละเอียดแยกเขต</th>
            <th style="padding:8px 12px;text-align:center;border:1px solid #1e3a8a">จำนวน</th>
          </tr>
        </thead>
        <tbody>
          ${STATUSES.map(s => {
            const byRegion = matrix[s.key]
            const total = Object.values(byRegion).reduce((a,b)=>a+b,0)
            if (total === 0) return ''
            const regionLines = regionNums
              .filter(rg => byRegion[rg] > 0)
              .map(rg => `เขต ${rg} = ${byRegion[rg].toLocaleString()} รพ.สต.`)
              .join('<br/>')
            return `
              <tr>
                <td style="padding:8px 12px;text-align:center;border:1px solid #d1d5db;vertical-align:top;white-space:nowrap">${today}</td>
                <td style="padding:8px 12px;text-align:center;border:1px solid #d1d5db;background:${s.bg};color:${s.color};font-weight:700;vertical-align:top">${s.label}</td>
                <td style="padding:8px 14px;border:1px solid #d1d5db;line-height:1.9;color:#374151">${regionLines}</td>
                <td style="padding:8px 12px;text-align:center;border:1px solid #d1d5db;font-size:22px;font-weight:900;color:${s.color};vertical-align:middle">${total.toLocaleString()}</td>
              </tr>`
          }).join('')}
          <tr style="background:#f1f5f9;font-weight:800">
            <td style="padding:8px 12px;text-align:center;border:1px solid #d1d5db" colspan="2">รวมทั้งหมด</td>
            <td style="padding:8px 14px;border:1px solid #d1d5db;color:#374151">
              ${regionNums.filter(rg=>regionDoneData.find(r=>r.name===`เขต ${rg}`))
                .map(rg=>{ const r=regionDoneData.find(x=>x.name===`เขต ${rg}`); return r?`เขต ${rg} = ${r.total.toLocaleString()} รพ.สต.`:'' })
                .filter(Boolean).join('<br/>')}
            </td>
            <td style="padding:8px 12px;text-align:center;border:1px solid #d1d5db;font-size:22px;font-weight:900;color:#1e3a8a">${totalAll.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <div style="text-align:right;font-size:11px;color:#9ca3af;margin-top:6px">ข้อมูล ณ วันที่ ${today} · NHIP Dashboard</div>
    `

    const canvas = await html2canvas(wrap, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    document.body.removeChild(wrap)
    const link = document.createElement('a')
    link.download = `สรุปสถานะติดตั้งแยกเขต_${today.replace(/\//g,'-')}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.95)
    link.click()
  }

  const [reportTab, setReportTab] = useState('done')
  const [inactivePage, setInactivePage] = useState(1)
  const [reportPage, setReportPage] = useState(1)
  const [reportSearch, setReportSearch] = useState('')
  const [filterSummary, setFilterSummary] = useState('')
  const [inactiveSearch, setInactiveSearch] = useState('')
  const [inactiveStatus, setInactiveStatus] = useState('')
  const [inactiveProvince, setInactiveProvince] = useState('')
  const [inactiveView, setInactiveView] = useState('list')
  const [expandedGroup, setExpandedGroup] = useState(null)
  const PAGE_SIZE = 20
  const totalJS = Object.values(job_status).reduce((a,b)=>a+b,0) || 1
  const done = progress['ดำเนินการแล้ว']||0
  const inProg = progress['อยู่ในระหว่างดำเนินการ']||0
  const notYet = progress['ยังไม่ติดตั้ง']||0
  const active = job_status['ใช้งานระบบ']||0
  const parallel = job_status['ใช้งานคู่ขนาน']||0
  const waiting = job_status['รอติดตั้ง']||0
  const inactive = (job_status['ไม่ได้ใช้งาน']||0)+(job_status['เลิกใช้งาน']||0)

  // Installer summary
  const totalInstallers = (installers||[]).length
  const totalInstalled = (installers||[]).reduce((a,b)=>a+(b.installed||0),0)
  const totalInProg = (installers||[]).reduce((a,b)=>a+(b.inProgress||0),0)
  const totalActive = (installers||[]).reduce((a,b)=>a+(b.active||0),0)
  const totalParallel = (installers||[]).reduce((a,b)=>a+(b.parallel||0),0)
  const totalCancelled = (installers||[]).reduce((a,b)=>a+(b.cancelled||0),0)
  const totalInactive = (installers||[]).reduce((a,b)=>a+(b.inactive||0),0)

  const progData = [
    {name:'ดำเนินการแล้ว', value:done, color:'#10b981'},
    {name:'กำลังดำเนินการ', value:inProg, color:'#f59e0b'},
    {name:'ยังไม่ติดตั้ง', value:notYet, color:'#ef4444'},
  ]

  const jobStatusData = Object.entries(job_status).map(([name,value])=>({name,value}))

  const monthlyData = Object.entries(monthly).map(([k,v])=>{
    const [yr,mo]=k.split('-')
    const mn=['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    return {name:`${mn[+mo]} ${+yr+543}`,value:v}
  })

  const regionData = Object.entries(regions).map(([k,v])=>({name:`เขต ${k}`,value:v}))

  const regionDoneData = Object.entries(regionDone||{}).map(([k,v])=>({
    name:`เขต ${k}`,
    done: v.done||0,
    total: v.total||0,
    pending: (v.total||0)-(v.done||0),
    pct: v.total ? ((v.done/v.total)*100).toFixed(1) : '0.0'
  })).sort((a,b)=>Number(a.name.replace('เขต ',''))-Number(b.name.replace('เขต ','')))

  const sortedInstallers = [...(installers||[])].sort((a,b)=>(b.installed+b.inProgress)-(a.installed+a.inProgress)).slice(0,15)

  // installList stats
  const list = installList || []
  const listDone    = list.filter(r=>r.progress==='ดำเนินการแล้ว')
  const listInProg  = list.filter(r=>r.progress==='อยู่ในระหว่างดำเนินการ')
  const listNotYet  = list.filter(r=>r.progress==='ยังไม่ติดตั้ง')
  const listInactive = list.filter(r=>r.status==='ไม่ได้ใช้งาน'||r.status==='เลิกใช้งาน')

  // 4 สถานะตายตัว จากคอลัมน์ summary
  const SUMMARY_STATUSES = [
    { key: 'รอติดตั้ง',                      color: '#f59e0b', icon: '⏳' },
    { key: 'ยังไม่ทำรายงานติดตั้ง',          color: '#ef4444', icon: '🕐' },
    { key: 'ส่งกลับแก้ไขรายงานติดตั้ง',     color: '#7c3aed', icon: '🔄' },
    { key: 'ทำรายงานติดตั้งแล้ว',            color: '#10b981', icon: '✅' },
  ]
  const SUMMARY_COLOR = Object.fromEntries(SUMMARY_STATUSES.map(s=>[s.key, s.color]))

  const summaryCount = {}
  SUMMARY_STATUSES.forEach(s => { summaryCount[s.key] = 0 })
  list.forEach(r => {
    const s = (r.summary||'').trim()
    if (s && summaryCount[s] !== undefined) summaryCount[s]++
  })
  const summaryEntries = SUMMARY_STATUSES.map(s => [s.key, summaryCount[s.key]])

  const reportBase = reportTab==='done' ? listDone : reportTab==='inprog' ? listInProg : listNotYet
  const reportRows = (() => {
    let rows = reportBase
    if (filterSummary) rows = rows.filter(r=>(r.summary||'').trim()===filterSummary)
    if (reportSearch.trim()) {
      const q = reportSearch.trim().toLowerCase()
      rows = rows.filter(r =>
        (r.name||'').toLowerCase().includes(q)
        || (r.hospcode||'').includes(q)
        || (r.province||'').toLowerCase().includes(q)
        || (r.amphoe||'').toLowerCase().includes(q)
        || (r.responsible||'').toLowerCase().includes(q)
      )
    }
    return rows
  })()
  const reportTotalPages = Math.max(1, Math.ceil(reportRows.length / PAGE_SIZE))
  const reportPaged = reportRows.slice((reportPage-1)*PAGE_SIZE, reportPage*PAGE_SIZE)

  const inactiveProvinceList = [...new Set(listInactive.map(r=>(r.province||'').replace(/^\d+-/,'')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'th'))

  const inactiveFiltered = listInactive.filter(r => {
    if (inactiveStatus && r.status !== inactiveStatus) return false
    if (inactiveProvince && (r.province||'').replace(/^\d+-/,'') !== inactiveProvince) return false
    if (!inactiveSearch.trim()) return true
    const q = inactiveSearch.toLowerCase()
    return (r.name||'').toLowerCase().includes(q)
      || (r.hospcode||'').includes(q)
      || (r.province||'').toLowerCase().includes(q)
      || (r.remark||'').toLowerCase().includes(q)
      || (r.responsible||'').toLowerCase().includes(q)
  })
  const inactiveTotalPages = Math.max(1, Math.ceil(inactiveFiltered.length / PAGE_SIZE))
  const inactivePaged = inactiveFiltered.slice((inactivePage-1)*PAGE_SIZE, inactivePage*PAGE_SIZE)

  // group by remark
  const groupByRemark = Object.entries(
    inactiveFiltered.reduce((acc, r) => {
      const key = r.remark?.trim() || 'ไม่ระบุ'
      if (!acc[key]) acc[key] = []
      acc[key].push(r)
      return acc
    }, {})
  ).sort((a,b) => b[1].length - a[1].length)

  // group by responsible
  const groupByResponsible = Object.entries(
    inactiveFiltered.reduce((acc, r) => {
      const key = r.responsible?.trim() || 'ไม่ระบุผู้รับผิดชอบ'
      if (!acc[key]) acc[key] = []
      acc[key].push(r)
      return acc
    }, {})
  ).sort((a,b) => b[1].length - a[1].length)

  const totalDoneRegion = regionDoneData.reduce((a,b)=>a+b.done,0)
  const totalAllRegion  = regionDoneData.reduce((a,b)=>a+b.total,0)

  return (
    <div className="page">
      <div className="page-title">🚀 ติดตามการติดตั้ง</div>
      <div className="page-desc">Installation Tracking Module — ติดตาม progress การติดตั้งระบบ NHIP ทั่วประเทศ</div>

      {/* ===== สถิติภาพรวม 8 กล่อง ===== */}
      <div className="section-label" style={{marginTop:20}}>📊 สรุปสถิติการติดตั้ง</div>
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {[
          {color:'c-blue',  icon:'🏥', val:fmt(totalJS),   label:'รพ.สต. ทั้งหมด',   pct:'100%',                                bar:100},
          {color:'c-green', icon:'✅', val:fmt(done),       label:'ดำเนินการแล้ว',     pct:`${((done/totalJS)*100).toFixed(1)}%`,  bar:(done/totalJS)*100},
          {color:'c-orange',icon:'⏳', val:fmt(inProg),     label:'กำลังดำเนินการ',    pct:`${((inProg/totalJS)*100).toFixed(1)}%`,bar:(inProg/totalJS)*100},
          {color:'c-red',   icon:'🕐', val:fmt(notYet),     label:'ยังไม่ติดตั้ง',     pct:`${((notYet/totalJS)*100).toFixed(1)}%`,bar:(notYet/totalJS)*100},
          {color:'c-green', icon:'✅', val:fmt(active),     label:'ใช้งานระบบ',        pct:`${((active/totalJS)*100).toFixed(1)}%`,  bar:(active/totalJS)*100},
          {color:'c-blue',  icon:'🔄', val:fmt(parallel),   label:'ใช้งานคู่ขนาน',    pct:`${((parallel/totalJS)*100).toFixed(1)}%`,bar:(parallel/totalJS)*100},
          {color:'c-orange',icon:'⏳', val:fmt(waiting),    label:'รอติดตั้ง',          pct:`${((waiting/totalJS)*100).toFixed(1)}%`, bar:(waiting/totalJS)*100},
          {color:'c-red',   icon:'❌', val:fmt(inactive),   label:'ไม่ได้ใช้งาน',     pct:`${((inactive/totalJS)*100).toFixed(1)}%`,bar:(inactive/totalJS)*100},
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

      {/* ===== Charts ===== */}
      <div className="section-label" style={{marginTop:24}}>📈 ความคืบหน้าภาพรวม</div>
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
              <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} fill="url(#grn)" dot={{fill:'#10b981',r:4}} name="จำนวน">
                <LabelList dataKey="value" position="top" style={{fill:'#065f46',fontSize:10,fontWeight:600}} formatter={v=>v>0?fmt(v):''}/>
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">สัดส่วนความคืบหน้า</div></div>
          </div>
          <div className="donut-container">
            <ResponsiveContainer width={150} height={150}>
              <PieChart><Pie data={progData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value"
                label={({name,value,percent})=>`${fmt(value)}`} labelLine={false}>
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
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">สถานะการใช้งาน</div></div>
          </div>
          <div className="donut-container">
            <ResponsiveContainer width={150} height={150}>
              <PieChart><Pie data={jobStatusData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value"
                label={({value})=>`${fmt(value)}`} labelLine={false}>
                {jobStatusData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Pie><Tooltip content={<TT/>}/></PieChart>
            </ResponsiveContainer>
            <div className="donut-legend">
              {jobStatusData.map((item,i)=>(
                <div key={i} className="leg-item">
                  <div className="leg-dot" style={{background:COLORS[i%COLORS.length]}}/>
                  <span className="leg-name">{item.name}</span>
                  <span className="leg-val">{fmt(item.value)}</span>
                  <span className="leg-pct">({((item.value/totalJS)*100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== สรุปรายงานติดตั้งแยกเขต ===== */}
      <div className="section-label" style={{marginTop:24}}>📋 สรุปรายงานติดตั้งแยกเขตสุขภาพ</div>
      <div className="chart-card" ref={regionTableRef}>
        <div className="chart-header">
          <div>
            <div className="chart-title">จำนวน รพ.สต. แยกตามเขตสุขภาพ 1–12</div>
            <div className="chart-sub">รวมทั้งหมด {fmt(totalAllRegion)} แห่ง · ดำเนินการแล้ว {fmt(totalDoneRegion)} แห่ง ({totalAllRegion ? ((totalDoneRegion/totalAllRegion)*100).toFixed(1) : 0}%)</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span className="chart-badge">12 เขต</span>
            <button onClick={exportJpg} style={{
              display:'flex',alignItems:'center',gap:6,padding:'6px 14px',
              background:'linear-gradient(135deg,#2563eb,#0ea5e9)',color:'#fff',
              border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',
              boxShadow:'0 2px 6px rgba(37,99,235,0.3)'
            }}>
              📷 Export JPG
            </button>
            <button onClick={() => exportReportJpg(regionDoneData)} style={{
              display:'flex',alignItems:'center',gap:6,padding:'6px 14px',
              background:'linear-gradient(135deg,#059669,#10b981)',color:'#fff',
              border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',
              boxShadow:'0 2px 6px rgba(5,150,105,0.3)'
            }}>
              📋 Export รายงานแยกเขต
            </button>
          </div>
        </div>
        <div className="leaderboard">
          <div className="lb-header">
            <span style={{width:70}}>เขต</span>
            <span style={{width:90,textAlign:'right'}}>ทั้งหมด</span>
            <span style={{width:90,textAlign:'right'}}>ดำเนินการแล้ว</span>
            <span style={{width:90,textAlign:'right'}}>คงเหลือ</span>
            <span style={{width:70,textAlign:'right'}}>%</span>
            <span style={{flex:1,paddingLeft:12}}>Progress</span>
          </div>
          {regionDoneData.map((r,i)=>(
            <div key={i} className="lb-row">
              <span style={{width:70,fontWeight:600,color:'var(--text-primary)'}}>{r.name}</span>
              <span style={{width:90,textAlign:'right'}}>{fmt(r.total)}</span>
              <span style={{width:90,textAlign:'right',color:'#10b981',fontWeight:600}}>{fmt(r.done)}</span>
              <span style={{width:90,textAlign:'right',color:'#ef4444'}}>{fmt(r.pending)}</span>
              <span style={{width:70,textAlign:'right',color:'var(--text-primary)',fontWeight:700}}>{r.pct}%</span>
              <div style={{flex:1,paddingLeft:12,display:'flex',alignItems:'center',gap:6}}>
                <div style={{flex:1,height:8,background:'var(--border)',borderRadius:6,overflow:'hidden'}}>
                  <div style={{width:`${r.pct}%`,height:'100%',background:'linear-gradient(90deg,#10b981,#34d399)',borderRadius:6}}/>
                </div>
              </div>
            </div>
          ))}
          {/* รวมทั้งหมด */}
          <div className="lb-row" style={{borderTop:'2px solid var(--border)',marginTop:4,paddingTop:8,fontWeight:700}}>
            <span style={{width:70,color:'var(--text-primary)'}}>รวม</span>
            <span style={{width:90,textAlign:'right',color:'var(--text-primary)'}}>{fmt(totalAllRegion)}</span>
            <span style={{width:90,textAlign:'right',color:'#10b981'}}>{fmt(totalDoneRegion)}</span>
            <span style={{width:90,textAlign:'right',color:'#ef4444'}}>{fmt(totalAllRegion-totalDoneRegion)}</span>
            <span style={{width:70,textAlign:'right',color:'#2563eb'}}>{totalAllRegion ? ((totalDoneRegion/totalAllRegion)*100).toFixed(1) : 0}%</span>
            <div style={{flex:1,paddingLeft:12,display:'flex',alignItems:'center',gap:6}}>
              <div style={{flex:1,height:8,background:'var(--border)',borderRadius:6,overflow:'hidden'}}>
                <div style={{width:`${totalAllRegion ? (totalDoneRegion/totalAllRegion)*100 : 0}%`,height:'100%',background:'linear-gradient(90deg,#2563eb,#60a5fa)',borderRadius:6}}/>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== สรุปรายงานทีมผู้ติดตั้ง ===== */}
      <div className="section-label" style={{marginTop:24}}>👥 สรุปสถิติทีมผู้ติดตั้ง</div>
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(6,1fr)',marginBottom:16}}>
        {[
          {color:'c-blue',  icon:'👤', val:fmt(totalInstallers), label:'จำนวนทีมงาน',   pct:''},
          {color:'c-green', icon:'🏥', val:fmt(totalInstalled),  label:'ติดตั้งทั้งหมด', pct:''},
          {color:'c-green', icon:'✅', val:fmt(totalActive),     label:'ใช้งานระบบ',     pct:`${totalInstalled ? ((totalActive/totalInstalled)*100).toFixed(0) : 0}%`},
          {color:'c-blue',  icon:'🔄', val:fmt(totalParallel),   label:'ใช้งานคู่ขนาน', pct:`${totalInstalled ? ((totalParallel/totalInstalled)*100).toFixed(0) : 0}%`},
          {color:'c-orange',icon:'⏳', val:fmt(totalInProg),     label:'กำลังดำเนินการ', pct:''},
          {color:'c-red',   icon:'❌', val:fmt(totalInactive),   label:'ไม่ได้ใช้งาน',  pct:`${totalInstalled ? ((totalInactive/totalInstalled)*100).toFixed(0) : 0}%`},
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            {k.pct && <span className="kpi-pct">{k.pct}</span>}
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ===== สรุปรายงานติดตั้ง (จาก installList) ===== */}
      <div className="section-label" style={{marginTop:24}}>📄 สรุปรายงานติดตั้ง</div>

      {/* สถิติสรุปรายงานติดตั้ง */}
      {summaryEntries.length > 0 && (
        <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:16}}>
          {/* ทั้งหมด */}
          <div onClick={()=>{setFilterSummary('');setReportPage(1)}}
            style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 20px',borderRadius:12,
              border:`2px solid ${!filterSummary?'#2563eb':'var(--border)'}`,
              background:!filterSummary?'#eff6ff':'var(--bg-secondary)',cursor:'pointer',minWidth:110}}>
            <span style={{fontSize:22,fontWeight:800,color:'#2563eb'}}>{fmt(list.length)}</span>
            <span style={{fontSize:11,color:'#2563eb',fontWeight:600,marginTop:2}}>ทั้งหมด</span>
          </div>
          {summaryEntries.map(([key,cnt])=>{
            const color = SUMMARY_COLOR[key]||'#64748b'
            const icon  = SUMMARY_STATUSES.find(s=>s.key===key)?.icon||''
            const active = filterSummary===key
            return (
              <div key={key} onClick={()=>{setFilterSummary(active?'':key);setReportPage(1)}}
                style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 18px',borderRadius:12,
                  border:`2px solid ${active?color:'var(--border)'}`,
                  background:active?color+'18':'var(--bg-secondary)',cursor:'pointer',minWidth:150,flex:1}}>
                <span style={{fontSize:18,marginBottom:2}}>{icon}</span>
                <span style={{fontSize:24,fontWeight:800,color}}>{fmt(cnt)}</span>
                <span style={{fontSize:11,color,fontWeight:600,marginTop:3,textAlign:'center',lineHeight:1.4}}>{key}</span>
                <span style={{fontSize:10,color:'var(--text-secondary)',marginTop:3}}>
                  {list.length?((cnt/list.length)*100).toFixed(1):0}%
                </span>
              </div>
            )
          })}
        </div>
      )}
      {filterSummary && (
        <div style={{marginBottom:10,fontSize:12,color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:8}}>
          กรองตาม:
          <span style={{background:(SUMMARY_COLOR[filterSummary]||'#64748b')+'20',color:SUMMARY_COLOR[filterSummary]||'#64748b',
            padding:'2px 10px',borderRadius:10,fontWeight:600,fontSize:12}}>
            {filterSummary}
          </span>
          <span onClick={()=>{setFilterSummary('');setReportPage(1)}} style={{cursor:'pointer',color:'#ef4444',fontSize:12}}>× ล้างตัวกรอง</span>
        </div>
      )}

      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:16}}>
        {[
          {color:'c-blue',  icon:'🏥', val:fmt(list.length),       label:'ข้อมูลทั้งหมด',    pct:'100%'},
          {color:'c-green', icon:'✅', val:fmt(listDone.length),    label:'ดำเนินการแล้ว',    pct:list.length?`${((listDone.length/list.length)*100).toFixed(1)}%`:'0%'},
          {color:'c-orange',icon:'⏳', val:fmt(listInProg.length),  label:'กำลังดำเนินการ',   pct:list.length?`${((listInProg.length/list.length)*100).toFixed(1)}%`:'0%'},
          {color:'c-red',   icon:'🕐', val:fmt(listNotYet.length),  label:'ยังไม่ติดตั้ง',    pct:list.length?`${((listNotYet.length/list.length)*100).toFixed(1)}%`:'0%'},
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <span className="kpi-pct">{k.pct}</span>
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* tabs + search */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        {[
          {key:'done',   label:`✅ ดำเนินการแล้ว (${fmt(listDone.length)})`,   color:'#10b981'},
          {key:'inprog', label:`⏳ กำลังดำเนินการ (${fmt(listInProg.length)})`, color:'#f59e0b'},
          {key:'notyet', label:`🕐 ยังไม่ติดตั้ง (${fmt(listNotYet.length)})`,  color:'#ef4444'},
        ].map(t=>(
          <button key={t.key} onClick={()=>{setReportTab(t.key);setReportPage(1);setReportSearch('')}}
            style={{padding:'6px 14px',borderRadius:8,border:`2px solid ${reportTab===t.key?t.color:'var(--border)'}`,
              background:reportTab===t.key?t.color+'20':'var(--bg-secondary)',
              color:reportTab===t.key?t.color:'var(--text-secondary)',fontWeight:600,fontSize:13,cursor:'pointer'}}>
            {t.label}
          </button>
        ))}
        <div style={{marginLeft:'auto',position:'relative'}}>
          <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)',fontSize:14}}>🔍</span>
          <input
            value={reportSearch}
            onChange={e=>{setReportSearch(e.target.value);setReportPage(1)}}
            placeholder="ค้นหา ชื่อ / รหัส / จังหวัด / ผู้รับผิดชอบ..."
            style={{paddingLeft:32,paddingRight:12,paddingTop:6,paddingBottom:6,borderRadius:8,
              border:'1px solid var(--border)',background:'var(--bg-secondary)',
              color:'var(--text-primary)',fontSize:13,width:280,outline:'none'}}
          />
          {reportSearch && (
            <span onClick={()=>{setReportSearch('');setReportPage(1)}}
              style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                cursor:'pointer',color:'var(--text-secondary)',fontSize:16,lineHeight:1}}>×</span>
          )}
        </div>
      </div>
      {reportSearch && (
        <div style={{marginBottom:8,fontSize:12,color:'var(--text-secondary)'}}>
          พบ <strong style={{color:'var(--text-primary)'}}>{fmt(reportRows.length)}</strong> รายการ จากการค้นหา "{reportSearch}"
        </div>
      )}

      <div className="chart-card" style={{padding:0,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead>
            <tr style={{background:'var(--bg-secondary)',borderBottom:'2px solid var(--border)'}}>
              {['#','รหัส','ชื่อ รพ.สต.','จังหวัด','อำเภอ','วันติดตั้ง','สถานะ','ผู้รับผิดชอบ','สรุปรายงานติดตั้ง'].map(h=>(
                <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:700,color:'var(--text-secondary)',fontSize:12,whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportPaged.length===0 && (
              <tr><td colSpan={9} style={{padding:24,textAlign:'center',color:'var(--text-secondary)'}}>ไม่มีข้อมูล</td></tr>
            )}
            {reportPaged.map((r,i)=>{
              const sumVal = (r.summary||'').trim()
              const sumColor = SUMMARY_COLOR[sumVal]||'#94a3b8'
              return (
              <tr key={i} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'var(--bg-secondary)'}}>
                <td style={{padding:'7px 12px',color:'var(--text-secondary)',fontSize:12}}>{(reportPage-1)*PAGE_SIZE+i+1}</td>
                <td style={{padding:'7px 12px',fontFamily:'monospace',fontWeight:600,color:'#2563eb'}}>{r.hospcode}</td>
                <td style={{padding:'7px 12px',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</td>
                <td style={{padding:'7px 12px',whiteSpace:'nowrap',color:'var(--text-secondary)'}}>{(r.province||'').replace(/^\d+-/,'')}</td>
                <td style={{padding:'7px 12px',whiteSpace:'nowrap',color:'var(--text-secondary)'}}>{(r.amphoe||'').replace(/^\d+-/,'')}</td>
                <td style={{padding:'7px 12px',whiteSpace:'nowrap',color:'#10b981',fontWeight:600}}>{r.install_date||'-'}</td>
                <td style={{padding:'7px 12px'}}>
                  <span style={{padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:600,
                    background:(JOB_COLOR[r.status]||'#94a3b8')+'20',color:JOB_COLOR[r.status]||'#94a3b8'}}>
                    {r.status||'-'}
                  </span>
                </td>
                <td style={{padding:'7px 12px',color:'var(--text-secondary)'}}>{r.responsible||'-'}</td>
                <td style={{padding:'7px 12px'}}>
                  {sumVal
                    ? <span style={{padding:'2px 10px',borderRadius:12,fontSize:11,fontWeight:600,
                        background:sumColor+'20',color:sumColor,whiteSpace:'nowrap'}}>
                        {sumVal}
                      </span>
                    : <span style={{color:'#cbd5e1',fontSize:11}}>—</span>}
                </td>
              </tr>
              )})}
          </tbody>
        </table>
        {reportTotalPages > 1 && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px 12px',borderTop:'1px solid var(--border)'}}>
            <button onClick={()=>setReportPage(p=>Math.max(1,p-1))} disabled={reportPage===1}
              style={{padding:'4px 12px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-secondary)',cursor:'pointer',fontSize:13}}>‹</button>
            <span style={{fontSize:13,color:'var(--text-secondary)'}}>หน้า {reportPage} / {reportTotalPages}</span>
            <button onClick={()=>setReportPage(p=>Math.min(reportTotalPages,p+1))} disabled={reportPage===reportTotalPages}
              style={{padding:'4px 12px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-secondary)',cursor:'pointer',fontSize:13}}>›</button>
          </div>
        )}
      </div>

      {/* ===== ไม่ได้ใช้งาน + หมายเหตุ ===== */}
      {listInactive.length > 0 && (
        <>
          <div className="section-label" style={{marginTop:24}}>❌ รายการไม่ได้ใช้งาน / เลิกใช้งาน
            {(inactiveSearch||inactiveStatus||inactiveProvince)
              ? <span style={{fontWeight:400,fontSize:13,color:'var(--text-secondary)'}}> — กรองแล้ว {fmt(inactiveFiltered.length)} จาก {fmt(listInactive.length)} แห่ง</span>
              : <span> ({fmt(listInactive.length)} แห่ง)</span>}
          </div>

          {/* Controls */}
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
            {/* Search */}
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)',fontSize:14}}>🔍</span>
              <input value={inactiveSearch}
                onChange={e=>{setInactiveSearch(e.target.value);setInactivePage(1)}}
                placeholder="ค้นหา ชื่อ / รหัส / จังหวัด / หมายเหตุ / ผู้รับผิดชอบ..."
                style={{paddingLeft:32,paddingRight:inactiveSearch?28:12,paddingTop:6,paddingBottom:6,borderRadius:8,
                  border:'1px solid var(--border)',background:'var(--bg-secondary)',
                  color:'var(--text-primary)',fontSize:13,width:320,outline:'none'}}/>
              {inactiveSearch && (
                <span onClick={()=>{setInactiveSearch('');setInactivePage(1)}}
                  style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                    cursor:'pointer',color:'var(--text-secondary)',fontSize:16}}>×</span>
              )}
            </div>
            <select value={inactiveStatus} onChange={e=>{setInactiveStatus(e.target.value);setInactivePage(1)}}
              style={{padding:'6px 10px',borderRadius:8,border:'1px solid var(--border)',
                background:'var(--bg-secondary)',color:'var(--text-primary)',fontSize:13,cursor:'pointer'}}>
              <option value="">ทุกสถานะ</option>
              <option value="ไม่ได้ใช้งาน">ไม่ได้ใช้งาน</option>
              <option value="เลิกใช้งาน">เลิกใช้งาน</option>
            </select>
            <select value={inactiveProvince} onChange={e=>{setInactiveProvince(e.target.value);setInactivePage(1)}}
              style={{padding:'6px 10px',borderRadius:8,border:'1px solid var(--border)',
                background:'var(--bg-secondary)',color:'var(--text-primary)',fontSize:13,cursor:'pointer',maxWidth:160}}>
              <option value="">ทุกจังหวัด</option>
              {inactiveProvinceList.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            {/* View toggle */}
            <div style={{display:'flex',gap:4,background:'var(--bg-secondary)',borderRadius:8,padding:3,border:'1px solid var(--border)'}}>
              {[
                {key:'list',  label:'📋 รายการ'},
                {key:'remark',label:'📝 จัดกลุ่มหมายเหตุ'},
                {key:'resp',  label:'👤 จัดกลุ่มผู้ติดตั้ง'},
              ].map(v=>(
                <button key={v.key} onClick={()=>{setInactiveView(v.key);setExpandedGroup(null)}}
                  style={{padding:'5px 12px',borderRadius:6,border:'none',
                    background:inactiveView===v.key?'var(--bg-card)':'transparent',
                    boxShadow:inactiveView===v.key?'0 1px 3px rgba(0,0,0,0.1)':'none',
                    color:inactiveView===v.key?'var(--text-primary)':'var(--text-secondary)',
                    fontWeight:inactiveView===v.key?700:400,fontSize:12,cursor:'pointer'}}>
                  {v.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                const rows = inactiveFiltered.map((r,i)=>({
                  'ลำดับ': i+1,
                  'รหัสสถานพยาบาล': r.hospcode,
                  'เขต': r.region,
                  'ชื่อ รพ.สต.': r.name,
                  'จังหวัด': r.province?.split('-')[1]||r.province,
                  'อำเภอ': r.amphoe?.split('-')[1]||r.amphoe,
                  'สถานะการใช้งาน': r.status,
                  'ดำเนินการ': r.progress,
                  'ผู้รับผิดชอบ': r.responsible||'',
                  'สรุปรายงานติดตั้ง': r.summary||'',
                  'วันที่ตรวจสอบ': r.check_date||'',
                  'หมายเหตุ': r.remark||'',
                  'PM': r.pm||'',
                }))
                const ws = XLSX.utils.json_to_sheet(rows)
                const wb2 = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb2, ws, 'ไม่ได้ใช้งาน')
                XLSX.writeFile(wb2, `inactive_${new Date().toISOString().slice(0,10)}.xlsx`)
              }}
              style={{padding:'6px 16px',borderRadius:7,border:'1px solid #10b981',background:'#dcfce7',color:'#15803d',
                fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}>
              📥 Export Excel ({fmt(inactiveFiltered.length)} แห่ง)
            </button>
            <span style={{fontSize:12,color:'var(--text-secondary)',marginLeft:'auto'}}>
              {inactiveSearch||inactiveStatus ? `กรองแล้ว: ${fmt(inactiveFiltered.length)} จาก ${fmt(listInactive.length)}` : `ทั้งหมด ${fmt(listInactive.length)} แห่ง`}
            </span>
          </div>

          {/* ── รายการ ── */}
          {inactiveView === 'list' && (
            <div className="chart-card" style={{padding:0,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{background:'var(--bg-secondary)',borderBottom:'2px solid var(--border)'}}>
                    {['#','รหัส','ชื่อ รพ.สต.','จังหวัด','สถานะ','ระบบ HIS เดิม','ผู้รับผิดชอบ','หมายเหตุ'].map(h=>(
                      <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:700,color:'var(--text-secondary)',fontSize:12,whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inactivePaged.length === 0 && (
                    <tr><td colSpan={8} style={{padding:24,textAlign:'center',color:'var(--text-secondary)'}}>ไม่พบข้อมูล</td></tr>
                  )}
                  {inactivePaged.map((r,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'var(--bg-secondary)'}}>
                      <td style={{padding:'7px 12px',color:'var(--text-secondary)',fontSize:12}}>{(inactivePage-1)*PAGE_SIZE+i+1}</td>
                      <td style={{padding:'7px 12px',fontFamily:'monospace',fontWeight:600,color:'#2563eb'}}>{r.hospcode}</td>
                      <td style={{padding:'7px 12px',maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</td>
                      <td style={{padding:'7px 12px',whiteSpace:'nowrap',color:'var(--text-secondary)'}}>{(r.province||'').replace(/^\d+-/,'')}</td>
                      <td style={{padding:'7px 12px'}}>
                        <span style={{padding:'2px 8px',borderRadius:12,fontSize:11,fontWeight:600,
                          background:(JOB_COLOR[r.status]||'#94a3b8')+'20',color:JOB_COLOR[r.status]||'#94a3b8'}}>
                          {r.status||'-'}
                        </span>
                      </td>
                      <td style={{padding:'7px 12px'}}>
                        {r.his
                          ? <span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600,
                              background:r.his==='HOSxP'?'#dbeafe':r.his==='JHCIS'?'#ede9fe':r.his==='MY PCU'?'#cffafe':'#f1f5f9',
                              color:r.his==='HOSxP'?'#1d4ed8':r.his==='JHCIS'?'#6d28d9':r.his==='MY PCU'?'#0e7490':'#475569'}}>{r.his}</span>
                          : <span style={{color:'var(--text-secondary)'}}>—</span>}
                      </td>
                      <td style={{padding:'7px 12px',color:'var(--text-secondary)'}}>{r.responsible||'—'}</td>
                      <td style={{padding:'7px 12px',color:r.remark?'var(--text-primary)':'var(--text-secondary)',fontStyle:r.remark?'normal':'italic'}}>
                        {r.remark||'ไม่ระบุ'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inactiveTotalPages > 1 && (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px 12px',borderTop:'1px solid var(--border)'}}>
                  <button onClick={()=>setInactivePage(p=>Math.max(1,p-1))} disabled={inactivePage===1}
                    style={{padding:'4px 12px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-secondary)',cursor:'pointer',fontSize:13}}>‹</button>
                  <span style={{fontSize:13,color:'var(--text-secondary)'}}>หน้า {inactivePage} / {inactiveTotalPages}</span>
                  <button onClick={()=>setInactivePage(p=>Math.min(inactiveTotalPages,p+1))} disabled={inactivePage===inactiveTotalPages}
                    style={{padding:'4px 12px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg-secondary)',cursor:'pointer',fontSize:13}}>›</button>
                </div>
              )}
            </div>
          )}

          {/* ── จัดกลุ่มหมายเหตุ / ผู้ติดตั้ง ── */}
          {(inactiveView === 'remark' || inactiveView === 'resp') && (() => {
            const groups = inactiveView === 'remark' ? groupByRemark : groupByResponsible
            const groupLabel = inactiveView === 'remark' ? 'หมายเหตุ' : 'ผู้รับผิดชอบ'
            return (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {groups.map(([key, rows], gi) => {
                  const isOpen = expandedGroup === `${inactiveView}-${gi}`
                  const byStatus = rows.reduce((acc,r)=>{ acc[r.status]=(acc[r.status]||0)+1; return acc },{})
                  return (
                    <div key={gi} className="chart-card" style={{padding:0,overflow:'hidden'}}>
                      {/* Group header */}
                      <div onClick={()=>setExpandedGroup(isOpen ? null : `${inactiveView}-${gi}`)}
                        style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',
                          cursor:'pointer',background:isOpen?'var(--bg-secondary)':'transparent',
                          borderBottom:isOpen?'1px solid var(--border)':'none',userSelect:'none'}}>
                        <span style={{fontSize:16}}>{isOpen?'▾':'▸'}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,color:'var(--text-primary)',fontSize:13,
                            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            {inactiveView==='remark'?'📝':'👤'} {key}
                          </div>
                          <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:2,display:'flex',gap:10,flexWrap:'wrap'}}>
                            {Object.entries(byStatus).map(([s,n])=>(
                              <span key={s} style={{color:JOB_COLOR[s]||'#94a3b8'}}>
                                {s}: {n}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span style={{background:'#ef444420',color:'#ef4444',borderRadius:20,
                          padding:'2px 12px',fontSize:13,fontWeight:700,flexShrink:0}}>
                          {fmt(rows.length)} แห่ง
                        </span>
                      </div>
                      {/* Expanded rows */}
                      {isOpen && (
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                          <thead>
                            <tr style={{background:'var(--bg-secondary)'}}>
                              {['#','รหัส','ชื่อ รพ.สต.','จังหวัด','สถานะ', inactiveView==='remark'?'ผู้รับผิดชอบ':'หมายเหตุ'].map(h=>(
                                <th key={h} style={{padding:'6px 12px',textAlign:'left',fontWeight:600,color:'var(--text-secondary)',fontSize:11}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r,ri)=>(
                              <tr key={ri} style={{borderTop:'1px solid var(--border)',background:ri%2===0?'transparent':'var(--bg-secondary)'}}>
                                <td style={{padding:'6px 12px',color:'var(--text-secondary)'}}>{ri+1}</td>
                                <td style={{padding:'6px 12px',fontFamily:'monospace',color:'#2563eb',fontWeight:600}}>{r.hospcode}</td>
                                <td style={{padding:'6px 12px',maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</td>
                                <td style={{padding:'6px 12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{(r.province||'').replace(/^\d+-/,'')}</td>
                                <td style={{padding:'6px 12px'}}>
                                  <span style={{padding:'1px 7px',borderRadius:10,fontSize:10,fontWeight:600,
                                    background:(JOB_COLOR[r.status]||'#94a3b8')+'20',color:JOB_COLOR[r.status]||'#94a3b8'}}>
                                    {r.status||'-'}
                                  </span>
                                </td>
                                <td style={{padding:'6px 12px',color:'var(--text-secondary)',fontStyle:inactiveView==='resp'&&!r.remark?'italic':'normal'}}>
                                  {inactiveView==='remark' ? (r.responsible||'—') : (r.remark||'ไม่ระบุ')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )
                })}
                {groups.length === 0 && (
                  <div style={{textAlign:'center',padding:32,color:'var(--text-secondary)'}}>ไม่พบข้อมูล</div>
                )}
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}

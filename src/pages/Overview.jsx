import { useRef } from 'react'
import html2canvas from 'html2canvas'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#2563eb','#10b981','#f59e0b','#ef4444','#7c3aed','#06b6d4','#f97316','#84cc16']
const JOB_COLORS = {'รอติดตั้ง':'#f59e0b','ใช้งานระบบ':'#10b981','ใช้งานคู่ขนาน':'#06b6d4','ไม่ได้ใช้งาน':'#ef4444','เลิกใช้งาน':'#94a3b8'}
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

const fmt = n => Number(n).toLocaleString()

const SUMMARY_STATUSES = [
  { key: 'ทำรายงานติดตั้งแล้ว',         color: '#10b981', bg: '#dcfce7', icon: '✅' },
  { key: 'รอติดตั้ง',                   color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
  { key: 'ยังไม่ทำรายงานติดตั้ง',       color: '#ef4444', bg: '#fee2e2', icon: '🕐' },
  { key: 'ส่งกลับแก้ไขรายงานติดตั้ง',  color: '#7c3aed', bg: '#ede9fe', icon: '🔄' },
]

// งวดงาน milestones (พ.ศ. → ค.ศ. = พ.ศ. - 543)
const MILESTONES = [
  { label: 'งวดงาน 6', target: 3200, deadline: new Date(2026, 4, 31) },  // 31 พ.ค. 2569
  { label: 'งวดงาน 7', target: 4507, deadline: new Date(2026, 5, 30) },  // 30 มิ.ย. 2569
]

function MilestoneCards({ done }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const THEMES = [
    { grad:'linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#0ea5e9 100%)', bar:'#38bdf8', shadow:'rgba(37,99,235,0.35)' },
    { grad:'linear-gradient(135deg,#064e3b 0%,#059669 50%,#10b981 100%)', bar:'#34d399', shadow:'rgba(5,150,105,0.35)' },
  ]
  const OVERDUE_THEME = { grad:'linear-gradient(135deg,#7f1d1d,#dc2626,#f87171)', bar:'#fca5a5', shadow:'rgba(220,38,38,0.35)' }
  const URGENT_THEME  = { grad:'linear-gradient(135deg,#78350f,#d97706,#fbbf24)', bar:'#fde68a', shadow:'rgba(217,119,6,0.35)' }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:18, margin:'4px 0 24px' }}>
      {MILESTONES.map((m, i) => {
        const daysLeft = Math.ceil((m.deadline - today) / 86400000)
        const remain   = Math.max(0, m.target - done)
        const pct      = Math.min(100, (done / m.target) * 100)
        const overdue  = daysLeft < 0
        const urgent   = !overdue && daysLeft <= 30
        const theme    = overdue ? OVERDUE_THEME : urgent ? URGENT_THEME : THEMES[i % THEMES.length]
        const dd = m.deadline
        const thDate = `${dd.getDate()} ${['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][dd.getMonth()]} ${dd.getFullYear()+543}`

        return (
          <div key={i} style={{
            background: theme.grad, borderRadius:20, overflow:'hidden',
            boxShadow: `0 8px 32px ${theme.shadow}, 0 2px 8px rgba(0,0,0,0.12)`,
            position:'relative'
          }}>
            {/* Decorative circle */}
            <div style={{
              position:'absolute', top:-40, right:-40, width:180, height:180,
              borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none'
            }}/>
            <div style={{
              position:'absolute', bottom:-60, left:-30, width:200, height:200,
              borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none'
            }}/>

            <div style={{ padding:'24px 28px', position:'relative' }}>
              {/* Top row */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:600, letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>
                    กำหนดส่งมอบ · {thDate}
                  </div>
                  <div style={{ fontSize:24, fontWeight:900, color:'#fff', letterSpacing:-0.5 }}>{m.label}</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.75)', marginTop:2 }}>
                    เป้าหมายสะสม {m.target.toLocaleString()} แห่ง
                  </div>
                </div>
                {/* Countdown */}
                <div style={{ textAlign:'center', background:'rgba(0,0,0,0.2)', borderRadius:14, padding:'10px 18px', minWidth:80 }}>
                  <div style={{ fontSize:overdue?16:44, fontWeight:900, color:'#fff', lineHeight:1 }}>
                    {overdue ? 'เกินกำหนด' : daysLeft}
                  </div>
                  {!overdue && <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:600, marginTop:2 }}>วันที่เหลือ</div>}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
                {[
                  { icon:'🎯', label:'เป้าหมาย', val:m.target.toLocaleString() },
                  { icon:'✅', label:'ทำแล้ว',   val:Math.min(done,m.target).toLocaleString() },
                  { icon:'⏳', label:'เหลืออีก', val:remain.toLocaleString() },
                ].map((s,j) => (
                  <div key={j} style={{
                    background:'rgba(255,255,255,0.18)', borderRadius:12,
                    border:'1px solid rgba(255,255,255,0.45)',
                    padding:'12px 10px', textAlign:'center',
                    backdropFilter:'blur(8px)',
                  }}>
                    <div style={{ fontSize:18, marginBottom:2 }}>{s.icon}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.8)', marginBottom:2, fontWeight:600 }}>{s.label}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:'#fff' }}>{s.val}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)' }}>แห่ง</div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)', fontWeight:600 }}>ความคืบหน้า</span>
                  <span style={{ fontSize:16, fontWeight:900, color:'#fff' }}>{pct.toFixed(1)}%</span>
                </div>
                <div style={{ height:10, background:'rgba(0,0,0,0.25)', borderRadius:8, overflow:'hidden' }}>
                  <div style={{
                    width:`${pct}%`, height:'100%', borderRadius:8,
                    background: pct>=100
                      ? 'linear-gradient(90deg,#34d399,#6ee7b7)'
                      : `linear-gradient(90deg,rgba(255,255,255,0.9),${theme.bar})`,
                  }}/>
                </div>
                <div style={{ marginTop:8, fontSize:12, color:'rgba(255,255,255,0.75)' }}>
                  {remain === 0
                    ? <span style={{fontWeight:700,color:'#6ee7b7'}}>บรรลุเป้าหมายแล้ว</span>
                    : !overdue && daysLeft > 0
                      ? <>เหลือ <b style={{color:'#fff'}}>{remain.toLocaleString()}</b> แห่ง ใน <b style={{color:'#fff'}}>{daysLeft}</b> วัน &nbsp;·&nbsp; เฉลี่ย <b style={{color:'#fff'}}>{(remain/daysLeft).toFixed(1)}</b> แห่ง/วัน</>
                      : <span style={{color:'#fca5a5',fontWeight:700}}>เกินกำหนดส่งมอบแล้ว</span>
                  }
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Overview({ data }) {
  const { job_status, progress, regions, monthly, standby_status, defect_status, defect_urgency, total, installList, regionDone } = data

  const exportReportJpg = async () => {
    const today = new Date().toLocaleDateString('th-TH', { day:'2-digit', month:'long', year:'numeric' })
    const todayFile = new Date().toLocaleDateString('th-TH').replace(/\//g,'-')
    const STATUSES = [
      { key:'ทำรายงานติดตั้งแล้ว',       bg:'#dcfce7', color:'#166534', icon:'✅' },
      { key:'รอติดตั้ง',                  bg:'#fef3c7', color:'#92400e', icon:'⏳' },
      { key:'ยังไม่ทำรายงานติดตั้ง',      bg:'#fee2e2', color:'#991b1b', icon:'🕐' },
      { key:'ส่งกลับแก้ไขรายงานติดตั้ง', bg:'#ede9fe', color:'#5b21b6', icon:'🔄' },
    ]
    const matrix = {}
    STATUSES.forEach(s => { matrix[s.key] = {} })
    ;(installList||[]).forEach(r => {
      const st = (r.summary||'').trim()
      const rg = r.region
      if (matrix[st] && rg) matrix[st][rg] = (matrix[st][rg]||0) + 1
    })
    const regionNums = [1,2,3,4,5,6,7,8,9,10,11,12]
    const grandTotal = STATUSES.reduce((a,s) => a + Object.values(matrix[s.key]).reduce((x,y)=>x+y,0), 0)

    // milestone data
    const todayDate = new Date(); todayDate.setHours(0,0,0,0)
    const milestones = [
      { label:'งวดงาน 6', target:3200, deadline:new Date(2026,4,31), grad:'linear-gradient(135deg,#1e3a8a,#2563eb)', bar:'#93c5fd' },
      { label:'งวดงาน 7', target:4507, deadline:new Date(2026,5,30), grad:'linear-gradient(135deg,#064e3b,#059669)', bar:'#6ee7b7' },
    ].map(m => {
      const daysLeft = Math.ceil((m.deadline - todayDate)/86400000)
      const pct = Math.min(100,(done/m.target)*100)
      const remain = Math.max(0,m.target-done)
      const dd = m.deadline
      const thDate = `${dd.getDate()} ${['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][dd.getMonth()]} ${dd.getFullYear()+543}`
      return { ...m, daysLeft, pct, remain, thDate }
    })

    const wrap = document.createElement('div')
    wrap.style.cssText = 'position:fixed;left:-9999px;top:0;font-family:"Sarabun","Noto Sans Thai",sans-serif;width:760px;background:#ffffff'
    document.body.appendChild(wrap)

    const MN = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

    wrap.innerHTML = `
      <!-- HEADER -->
      <div style="background:linear-gradient(120deg,#0f172a 0%,#1e3a8a 60%,#1d4ed8 100%);padding:28px 36px 24px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between">
          <div>
            <div style="font-size:10px;letter-spacing:3px;color:rgba(255,255,255,0.5);text-transform:uppercase;margin-bottom:6px">NHIP · PROJECT REPORT</div>
            <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.2;margin-bottom:4px">สรุปสถานะรายงานติดตั้ง รพ.สต.</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.6)">ข้อมูล ณ ${today} &nbsp;·&nbsp; แยกตามเขตสุขภาพ 1–12</div>
          </div>
          <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:10px 18px;text-align:right">
            <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-bottom:2px">ยอดสะสมปัจจุบัน</div>
            <div style="font-size:28px;font-weight:900;color:#fff;line-height:1">${done.toLocaleString()}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5)">แห่ง</div>
          </div>
        </div>
      </div>

      <!-- MILESTONES -->
      <div style="padding:20px 28px 0;display:grid;grid-template-columns:1fr 1fr;gap:14px">
        ${milestones.map(m => {
          const overdue = m.daysLeft < 0
          const statColor = overdue ? '#dc2626' : m.daysLeft <= 30 ? '#d97706' : '#fff'
          return `
          <div style="background:${m.grad};border-radius:16px;padding:20px 22px;color:#fff;overflow:hidden;position:relative">
            <div style="position:absolute;bottom:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.06)"></div>
            <!-- label row -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
              <div>
                <div style="font-size:10px;color:rgba(255,255,255,0.55);letter-spacing:1px;margin-bottom:3px">กำหนดส่งมอบ · ${m.thDate}</div>
                <div style="font-size:18px;font-weight:900">${m.label}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:1px">เป้าหมายสะสม ${m.target.toLocaleString()} แห่ง</div>
              </div>
              <div style="background:rgba(0,0,0,0.25);border-radius:12px;padding:8px 16px;text-align:center;min-width:70px">
                <div style="font-size:32px;font-weight:900;line-height:1;color:${statColor}">${overdue ? '!' : m.daysLeft}</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.65);margin-top:2px">${overdue ? 'เกินกำหนด' : 'วันที่เหลือ'}</div>
              </div>
            </div>
            <!-- stats row -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
              ${[
                {l:'ทำแล้ว',   v:Math.min(done,m.target).toLocaleString()},
                {l:'เหลืออีก', v:m.remain.toLocaleString()},
                {l:'ความคืบหน้า', v:m.pct.toFixed(1)+'%'},
              ].map(x=>`
                <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 8px;text-align:center;border:1px solid rgba(255,255,255,0.2)">
                  <div style="font-size:10px;color:rgba(255,255,255,0.65);margin-bottom:3px">${x.l}</div>
                  <div style="font-size:18px;font-weight:900">${x.v}</div>
                </div>`).join('')}
            </div>
            <!-- progress bar -->
            <div style="background:rgba(0,0,0,0.3);border-radius:8px;height:10px;overflow:hidden">
              <div style="width:${m.pct.toFixed(1)}%;height:100%;background:rgba(255,255,255,0.9);border-radius:8px"></div>
            </div>
          </div>`
        }).join('')}
      </div>

      <!-- DIVIDER -->
      <div style="margin:20px 28px 0;border-top:1px solid #e5e7eb;position:relative">
        <span style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#fff;padding:0 14px;font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:1px">สรุปสถานะรายงานติดตั้ง</span>
      </div>

      <!-- STATUS CARDS -->
      <div style="padding:20px 28px 0;display:flex;flex-direction:column;gap:10px">
        ${STATUSES.map(s => {
          const byRegion = matrix[s.key]
          const total = Object.values(byRegion).reduce((a,b)=>a+b,0)
          const pct = grandTotal ? ((total/grandTotal)*100).toFixed(1) : '0.0'
          const regionTags = regionNums.filter(rg=>byRegion[rg]>0)
            .map(rg=>`<span style="display:inline-flex;align-items:center;gap:3px;background:${s.color}14;border:1px solid ${s.color}33;border-radius:6px;padding:3px 10px;margin:2px;font-size:12px;color:${s.color};font-weight:600">เขต ${rg} <b style="font-size:13px">${(byRegion[rg]||0).toLocaleString()}</b></span>`)
            .join('')
          return `
          <div style="background:#fafafa;border-radius:14px;padding:16px 20px;border:1px solid #e5e7eb;display:flex;gap:18px;align-items:flex-start">
            <div style="flex-shrink:0;width:180px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <div style="width:4px;height:36px;background:${s.color};border-radius:3px;flex-shrink:0"></div>
                <div>
                  <div style="font-size:13px;font-weight:800;color:${s.color};line-height:1.3">${s.key}</div>
                </div>
              </div>
              <div style="display:flex;align-items:baseline;gap:4px;margin-left:12px">
                <span style="font-size:32px;font-weight:900;color:${s.color};line-height:1">${total.toLocaleString()}</span>
                <span style="font-size:12px;color:#6b7280">แห่ง</span>
              </div>
              <div style="margin-left:12px;margin-top:6px">
                <div style="height:5px;background:#e5e7eb;border-radius:4px;overflow:hidden;width:120px">
                  <div style="width:${pct}%;height:100%;background:${s.color};border-radius:4px"></div>
                </div>
                <div style="font-size:11px;color:#9ca3af;margin-top:3px">${pct}% ของทั้งหมด</div>
              </div>
            </div>
            <div style="flex:1;padding-top:4px">
              ${regionTags || '<span style="font-size:12px;color:#d1d5db">ไม่มีข้อมูล</span>'}
            </div>
          </div>`
        }).join('')}
      </div>

      <!-- FOOTER -->
      <div style="margin:20px 28px;background:linear-gradient(120deg,#0f172a,#1e3a8a);border-radius:14px;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;color:#fff">
        <div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:2px">รวมทั้งหมด</div>
          <div style="font-size:32px;font-weight:900">${grandTotal.toLocaleString()} <span style="font-size:14px;opacity:0.6">แห่ง</span></div>
        </div>
        <div style="text-align:right;font-size:11px;color:rgba(255,255,255,0.4)">
          NHIP Dashboard<br/>ระบบติดตามสถิติการติดตั้ง รพ.สต. ทั่วประเทศ
        </div>
      </div>
    `
    const canvas = await html2canvas(wrap, { scale:2, backgroundColor:'#f0f4f8', useCORS:true })
    document.body.removeChild(wrap)
    const link = document.createElement('a')
    link.download = `สรุปรายงานติดตั้งแยกเขต_${todayFile}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.95)
    link.click()
  }

  // นับ สรุปรายงานติดตั้ง จาก installList
  const summaryCnt = {}
  SUMMARY_STATUSES.forEach(s => { summaryCnt[s.key] = 0 })
  ;(installList||[]).forEach(r => {
    const s = (r.summary||'').trim()
    if (s && summaryCnt[s] !== undefined) summaryCnt[s]++
  })
  const summaryTotal = Object.values(summaryCnt).reduce((a,b)=>a+b,0) || 1

  const totalJS = Object.values(job_status).reduce((a,b)=>a+b,0) || 1
  const installed = (job_status['ใช้งานระบบ']||0)+(job_status['ใช้งานคู่ขนาน']||0)
  const waiting   = job_status['รอติดตั้ง']||0
  const inProg    = progress['อยู่ในระหว่างดำเนินการ']||0
  const done      = progress['ดำเนินการแล้ว']||0
  const inactive  = (job_status['ไม่ได้ใช้งาน']||0)+(job_status['เลิกใช้งาน']||0)
  const donePct   = ((done/totalJS)*100).toFixed(1)

  const defectTotal   = Object.values(defect_status||{}).reduce((a,b)=>a+b,0)||1
  const defectDone    = (defect_status?.['แก้ไขเรียบร้อย']||0) + (defect_status?.['ดำเนินการแล้ว']||0)
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

  const reportDone = summaryCnt['ทำรายงานติดตั้งแล้ว']
  const reportPct  = ((reportDone / summaryTotal) * 100).toFixed(1)

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
      icon: '📄', label: 'ทำรายงานติดตั้งไปแล้วเท่าไหร่?',
      pct: `${reportPct}%`, pctColor: '#0ea5e9',
      grad: 'linear-gradient(135deg,#0c4a6e,#0ea5e9)',
      bg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
      border: '#bae6fd',
      detail: `ทำรายงานแล้ว ${fmt(reportDone)} จาก ${fmt(summaryTotal)} แห่งที่มีการทำรายงาน`,
      barColor: '#0ea5e9', barPct: +reportPct,
      tag: 'Installation Report'
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
    {
      icon: '🐞', label: 'แก้ไข Defect & Request ได้กี่ %?',
      pct: `${defectDonePct}%`, pctColor: '#ef4444',
      grad: 'linear-gradient(135deg,#7f1d1d,#ef4444)',
      bg: 'linear-gradient(135deg,#fff5f5,#fee2e2)',
      border: '#fecaca',
      detail: `แก้ไขเรียบร้อย ${fmt(defectDone)} จาก ${fmt(defectTotal)} รายการทั้งหมด · ด่วน ${fmt(defect_urgency?.['ด่วน']||0)}`,
      barColor: '#ef4444', barPct: +defectDonePct,
      tag: 'Defect & Request'
    },
  ]

  const exportExcel = () => {
    const STATUSES = [
      'ทำรายงานติดตั้งแล้ว','รอติดตั้ง','ยังไม่ทำรายงานติดตั้ง','ส่งกลับแก้ไขรายงานติดตั้ง'
    ]
    const regionNums = [1,2,3,4,5,6,7,8,9,10,11,12]
    const matrix = {}
    STATUSES.forEach(s => { matrix[s] = {} })
    ;(installList||[]).forEach(r => {
      const st = (r.summary||'').trim()
      const rg = r.region
      if (matrix[st] && rg) matrix[st][rg] = (matrix[st][rg]||0) + 1
    })
    const rows = []
    const today = new Date().toLocaleDateString('th-TH')
    STATUSES.forEach(st => {
      const byRegion = matrix[st]
      regionNums.forEach(rg => {
        if (byRegion[rg]) rows.push({ วันที่: today, สถานะ: st, เขต: `เขต ${rg}`, จำนวน: byRegion[rg] })
      })
      const total = Object.values(byRegion).reduce((a,b)=>a+b,0)
      if (total > 0) rows.push({ วันที่: today, สถานะ: st, เขต: 'รวม', จำนวน: total })
      rows.push({ วันที่:'', สถานะ:'', เขต:'', จำนวน:'' })
    })
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'สรุปรายงานแยกเขต')
      XLSX.writeFile(wb, `สรุปรายงานติดตั้งแยกเขต_${today.replace(/\//g,'-')}.xlsx`)
    })
  }

  return (
    <div className="page">
      {/* Milestone countdown */}
      <div className="section-label">งวดงาน — นับถอยหลังกำหนดส่งมอบ</div>
      <MilestoneCards done={done} />

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

      {/* สรุปรายงานติดตั้ง */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:24,marginBottom:8}}>
        <div className="section-label" style={{margin:0}}>📄 สรุปรายงานติดตั้ง</div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={exportReportJpg} style={{
            display:'flex',alignItems:'center',gap:6,padding:'7px 16px',
            background:'linear-gradient(135deg,#2563eb,#0ea5e9)',color:'#fff',
            border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',
            boxShadow:'0 2px 6px rgba(37,99,235,0.3)'
          }}>📷 Export JPG</button>
          <button onClick={exportExcel} style={{
            display:'flex',alignItems:'center',gap:6,padding:'7px 16px',
            background:'linear-gradient(135deg,#059669,#10b981)',color:'#fff',
            border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',
            boxShadow:'0 2px 6px rgba(5,150,105,0.3)'
          }}>📊 Export Excel</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:8}}>
        {SUMMARY_STATUSES.map((s,i) => {
          const cnt = summaryCnt[s.key]
          const pct = ((cnt/totalJS)*100).toFixed(1)
          return (
            <div key={i} style={{
              background:s.bg, border:`1px solid ${s.color}44`,
              borderRadius:14, padding:'16px 20px',
              display:'flex',flexDirection:'column',gap:6
            }}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:18}}>{s.icon}</span>
                  <span style={{fontSize:11,fontWeight:600,color:s.color,lineHeight:1.3}}>{s.key}</span>
                </div>
                <span style={{fontSize:22,fontWeight:800,color:s.color}}>{pct}%</span>
              </div>
              <div style={{fontSize:26,fontWeight:800,color:s.color,lineHeight:1}}>{fmt(cnt)}</div>
              <div style={{fontSize:11,color:'#64748b'}}>จาก {fmt(totalJS)} แห่ง</div>
              <div style={{height:5,background:`${s.color}22`,borderRadius:4}}>
                <div style={{width:`${Math.min(+pct,100)}%`,height:'100%',background:s.color,borderRadius:4}}/>
              </div>
            </div>
          )
        })}
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

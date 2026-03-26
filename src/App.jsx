import { useState, useRef, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import installDataRaw from './data/installData.json'
import Sidebar from './components/Sidebar'
import Overview from './pages/Overview'
import FacilityMgmt from './pages/FacilityMgmt'
import InstallTracking from './pages/InstallTracking'
import DataVolume from './pages/DataVolume'
import CallCenter from './pages/CallCenter'
import DefectRequest from './pages/DefectRequest'
import StandbyQA from './pages/StandbyQA'
import Training from './pages/Training'
import Workload from './pages/Workload'
import InstallerMgmt from './pages/InstallerMgmt'
import './index.css'

export const DEFAULT_DATA = {
  job_status: { "รอติดตั้ง":2476,"ใช้งานระบบ":1049,"ใช้งานคู่ขนาน":617,"ไม่ได้ใช้งาน":351,"เลิกใช้งาน":14 },
  progress: { "ยังไม่ติดตั้ง":2399,"ดำเนินการแล้ว":2087,"อยู่ในระหว่างดำเนินการ":21 },
  regions: {"1":254,"2":431,"3":262,"4":616,"5":416,"6":380,"7":105,"8":409,"9":696,"10":432,"11":198,"12":310},
  monthly: {"2025-10":169,"2025-11":141,"2025-12":234,"2026-01":242,"2026-02":595,"2026-03":619},
  callList: [],
  standby_type: {"การใช้งาน":1907,"ส่งออกข้อมูล":666,"ติดตั้งระบบ":368,"ข้อมูลพื้นฐาน":343,"Defect/BUG":65,"แบบฟอร์ม":32,"Requirement":19},
  standby_status: {"ดำเนินการแล้ว":3276,"กำลังดำเนินการ":80,"รอดำเนินการ":79,"ไม่ดำเนินการ":1},
  defect_status: {"จัดทำ MANTIS":54,"รอแจ้งทีมพัฒนา":35,"แก้ไขเรียบร้อย":28,"รอทีมพัฒนา":14,"ยกเลิก":8,"รอ compile":4,"ส่งกลับนักพัฒนา":2},
  defectList: [],
  defect_system: {"one stop service (สั่งยา)":13,"ภาพรวมระบบ":13,"การตั้งค่าระบบ":9,"บัญชี 1":8,"ส่งออกข้อมูล":7,"one stop service (คัดกรอง)":7,"one stop service (หัตถการ)":6,"one stop service (งานส่งเสริม)":6},
  defect_urgency: {"ด่วน":42,"ปกติ":106},
  installers: [
    {name:"ปอ",inProgress:3,installed:109,active:36,parallel:63,cancelled:6,inactive:4},
    {name:"ครีม",inProgress:0,installed:93,active:54,parallel:19,cancelled:0,inactive:20},
    {name:"แบงค์",inProgress:0,installed:90,active:67,parallel:7,cancelled:1,inactive:15},
    {name:"ฟิวส์",inProgress:11,installed:88,active:21,parallel:51,cancelled:0,inactive:15},
    {name:"ตูมตาม",inProgress:0,installed:84,active:83,parallel:0,cancelled:0,inactive:1},
    {name:"จิ๋ว",inProgress:0,installed:81,active:27,parallel:44,cancelled:0,inactive:7},
    {name:"เจ้าจอม",inProgress:0,installed:77,active:17,parallel:51,cancelled:0,inactive:9},
    {name:"เอิน",inProgress:0,installed:80,active:33,parallel:17,cancelled:0,inactive:30},
    {name:"อุ้ม",inProgress:0,installed:60,active:21,parallel:12,cancelled:2,inactive:25},
    {name:"ต่าย",inProgress:12,installed:64,active:22,parallel:38,cancelled:1,inactive:0},
    {name:"ดิส",inProgress:0,installed:66,active:11,parallel:31,cancelled:0,inactive:24},
    {name:"นาย",inProgress:0,installed:65,active:6,parallel:6,cancelled:0,inactive:53},
    {name:"แมน",inProgress:3,installed:68,active:12,parallel:2,cancelled:2,inactive:46},
  ],
  hospitals: [],
  installList: installDataRaw,
  regionDone: {"1":{done:68,total:254},"2":{done:188,total:431},"3":{done:260,total:262},"4":{done:555,total:616},"5":{done:291,total:416},"6":{done:218,total:380},"7":{done:0,total:105},"8":{done:223,total:409},"9":{done:284,total:696},"10":{done:0,total:432},"11":{done:0,total:198},"12":{done:0,total:310}},
  migrationDone: 493,
  provinceCnt: {"34-อุบลราชธานี":237,"31-บุรีรัมย์":224,"32-สุรินทร์":212,"14-พระนครศรีอยุธยา":206,"50-เชียงใหม่":186,"30-นครราชสีมา":165,"48-นครพนม":135,"33-ศรีสะเกษ":132,"90-สงขลา":126,"24-ฉะเชิงเทรา":119},
  total: 4509,
  filename: 'NHIP_Dashboard_Diary.xlsx'
}

function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })
        const result = { ...DEFAULT_DATA, filename: file.name }
        console.log('📋 Sheets:', wb.SheetNames)

        // Sheet 5: ข้อมูลผู้ติดตั้ง
        const s5 = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[5]], { header:1, defval:null })
        const js={}, pg={}, rg={}, mo={}, regionDone={}, provinceCnt={}
        const installList = []
        let migDone = 0
        for(let i=1;i<s5.length;i++){
          const r=s5[i]; if(!r[0]) continue
          const j=String(r[11]||''), p=String(r[10]||'')
          const region=r[1]?Math.round(Number(r[1])):null, dt=r[5]
          const province=String(r[3]||''), amphoe=String(r[4]||'')
          if(j&&j!=='null') js[j]=(js[j]||0)+1
          if(p&&p!=='null') pg[p]=(pg[p]||0)+1
          if(region){ rg[region]=(rg[region]||0)+1
            if(!regionDone[region]) regionDone[region]={done:0,total:0}
            regionDone[region].total++
            if(p==='ดำเนินการแล้ว') regionDone[region].done++
          }
          if(province&&province!=='null') provinceCnt[province]=(provinceCnt[province]||0)+1
          if(r[7]) migDone++
          if(dt instanceof Date && dt.getFullYear()>2000){
            const yr=dt.getFullYear()>2100?dt.getFullYear()-543:dt.getFullYear()
            const k=`${yr}-${String(dt.getMonth()+1).padStart(2,'0')}`
            mo[k]=(mo[k]||0)+1
          }
          installList.push({
            hospcode:   String(r[0]||''),
            region,
            name:       String(r[2]||''),
            province,
            amphoe,
            install_date: dt instanceof Date ? dt.toLocaleDateString('th-TH') : '',
            mig_start:  r[6] instanceof Date ? r[6].toLocaleDateString('th-TH') : '',
            mig_end:    r[7] instanceof Date ? r[7].toLocaleDateString('th-TH') : '',
            trans_start:r[8] instanceof Date ? r[8].toLocaleDateString('th-TH') : '',
            trans_end:  r[9] instanceof Date ? r[9].toLocaleDateString('th-TH') : '',
            progress:   p,
            status:     j,
            finish_date:r[12] instanceof Date ? r[12].toLocaleDateString('th-TH') : '',
            responsible: String(r[13]||''),
            summary:     String(r[14]||''),
            check_date:  r[15] instanceof Date ? r[15].toLocaleDateString('th-TH') : String(r[15]||''),
            remark:      String(r[16]||''),
            pm:          String(r[17]||''),
          })
        }
        result.job_status=js; result.progress=pg
        result.regions=Object.fromEntries(Object.entries(rg).sort((a,b)=>Number(a[0])-Number(b[0])))
        result.monthly=Object.fromEntries(Object.entries(mo).filter(([k])=>!k.startsWith('1969')).sort())
        result.total=Object.values(js).reduce((a,b)=>a+b,0)
        result.regionDone=regionDone
        result.migrationDone=migDone
        result.provinceCnt=Object.fromEntries(Object.entries(provinceCnt).sort((a,b)=>b[1]-a[1]).slice(0,15))
        result.installList=installList

        // Sheet: ถาม-ตอบ Stand By — ค้นหาตามชื่อ sheet ก่อน ถ้าไม่เจอใช้ index 7
        const standbySheetName = wb.SheetNames.find(n=>n.includes('ถาม-ตอบ')||n.includes('Stand By')||n.includes('Standby')||n.includes('standby')) || wb.SheetNames[7]
        const s7=XLSX.utils.sheet_to_json(wb.Sheets[standbySheetName],{header:1,defval:null})
        console.log('📋 Standby sheet:', standbySheetName, '| headers:', s7[0])

        // map header → index
        const h7 = (s7[0]||[]).map(h=>String(h||'').trim())
        const ci = key => {
          const patterns = {
            date:     ['วันที่'],
            province: ['จังหวัด'],
            hospital: ['รพ.สต','โรงพยาบาล','หน่วยบริการ'],
            status:   ['สถานะ'],
            type:     ['ประเภท'],
            receiver: ['ผู้รับแจ้ง'],
            operator: ['ผู้ดำเนินการ'],
            detail:   ['หัวข้อ','รายละเอียด'],
            solution: ['แนวทาง','วิธีแก้'],
            dur_hr:   ['ชั่วโมง','ชม'],
            dur_min:  ['นาที'],
          }
          const pats = patterns[key] || [key]
          const idx = h7.findIndex(h => pats.some(p => h.includes(p)))
          return idx >= 0 ? idx : null
        }
        // fallback index ถ้าหา header ไม่เจอ
        const fb = { date:0, province:1, hospital:2, status:4, type:5, receiver:6, operator:7, detail:8, solution:9, dur_hr:10, dur_min:11 }
        const col = key => ci(key) ?? fb[key]

        const fmtDate = v => v instanceof Date ? v.toLocaleDateString('th-TH',{day:'2-digit',month:'2-digit',year:'numeric'}) : String(v||'')

        const st={},ss={},callList=[]
        const dataStart7 = h7.length > 0 ? 1 : 0
        for(let i=dataStart7;i<s7.length;i++){
          const r=s7[i]
          const province = String(r[col('province')]||'')
          if(!province || province==='null') continue
          const t=String(r[col('type')]||''), s=String(r[col('status')]||'')
          if(t&&t!=='null') st[t]=(st[t]||0)+1
          if(s&&s!=='null') ss[s]=(ss[s]||0)+1
          callList.push({
            date:     fmtDate(r[col('date')]),
            province,
            hospital: String(r[col('hospital')]||''),
            status:   s,
            type:     t,
            receiver: String(r[col('receiver')]||''),
            operator: String(r[col('operator')]||''),
            detail:   String(r[col('detail')]||''),
            solution: String(r[col('solution')]||''),
            dur_hr:   r[col('dur_hr')]!=null ? String(r[col('dur_hr')]) : '',
            dur_min:  r[col('dur_min')]!=null ? String(r[col('dur_min')]) : '',
          })
        }
        result.standby_type=Object.fromEntries(Object.entries(st).filter(([k])=>k!=='null').sort((a,b)=>b[1]-a[1]).slice(0,8))
        result.standby_status=Object.fromEntries(Object.entries(ss).filter(([k])=>k!=='null'))
        result.callList=callList

        // Sheet: Defect — ค้นหาตามชื่อก่อน ถ้าไม่เจอใช้ index 8
        const defectSheetName = wb.SheetNames.find(n=>n.toLowerCase().includes('defect')||n.includes('บั๊ก')||n.includes('Bug')) || wb.SheetNames[8]
        const s8=XLSX.utils.sheet_to_json(wb.Sheets[defectSheetName],{header:1,defval:null})
        console.log('📋 Defect sheet:', defectSheetName, '| headers row0:', s8[0], '| row1:', s8[1])

        // dynamic column mapping for defect sheet
        // หา header row (แถวแรกที่มีหัวคอลัมน์)
        const defectHeaderRowIdx = s8.findIndex(row => row && row.some(c => String(c||'').includes('วันที่') || String(c||'').toLowerCase().includes('defect') || String(c||'').includes('ระบบ') || String(c||'').includes('สถานะ')))
        const defectHeaderRow = defectHeaderRowIdx >= 0 ? s8[defectHeaderRowIdx] : []
        const hd = defectHeaderRow.map(h=>String(h||'').trim())
        const cid = key => {
          const patterns = {
            date:        ['วันที่'],
            system:      ['ระบบงาน','ระบบ','Module','module'],
            sys_status:  ['สถานะระบบ','สถานะการใช้งาน'],
            urgency:     ['ด่วน','ความเร่งด่วน','urgency','Urgency','Priority'],
            status:      ['สถานะดำเนินการ','สถานะ'],
            detail:      ['หัวข้อ','รายละเอียด','detail','Detail','ปัญหา'],
            mantis:      ['mantis','Mantis','MANTIS','Taiga','taiga','Issue No','issue'],
            responsible: ['ผู้รับผิดชอบ','ผู้ดำเนินการ','ผู้แก้ไข'],
          }
          const pats = patterns[key] || [key]
          const idx = hd.findIndex(h => pats.some(p => h.toLowerCase().includes(p.toLowerCase())))
          return idx >= 0 ? idx : null
        }
        // fallback indices (ถ้า header ไม่เจอ)
        const fbd = { date:0, system:1, sys_status:2, urgency:3, status:4, detail:5, mantis:6, responsible:7 }
        const cold = key => cid(key) ?? fbd[key]
        console.log('📋 Defect col mapping:', Object.keys(fbd).map(k=>`${k}→${cold(k)}`).join(', '))

        const ds={},dsys={},du={},defectList=[]
        const defectDataStart = defectHeaderRowIdx >= 0 ? defectHeaderRowIdx + 1 : 2
        for(let i=defectDataStart;i<s8.length;i++){
          const r=s8[i]; if(!r || r.every(c=>!c)) continue
          const s=String(r[cold('status')]||''), sys=String(r[cold('system')]||''), u=String(r[cold('urgency')]||'')
          if(s&&s!=='null') ds[s]=(ds[s]||0)+1
          if(sys&&sys!=='null') dsys[sys]=(dsys[sys]||0)+1
          if(u&&u!=='null') du[u]=(du[u]||0)+1
          const dateVal = r[cold('date')]
          defectList.push({
            date:        dateVal instanceof Date ? dateVal.toLocaleDateString('th-TH') : String(dateVal||''),
            system:      String(r[cold('system')]||''),
            sys_status:  String(r[cold('sys_status')]||''),
            urgency:     u,
            status:      s,
            detail:      String(r[cold('detail')]||''),
            mantis:      String(r[cold('mantis')]||''),
            responsible: String(r[cold('responsible')]||''),
          })
        }
        result.defect_status=ds; result.defect_urgency=du
        result.defect_system=Object.fromEntries(Object.entries(dsys).filter(([k])=>k!=='null').sort((a,b)=>b[1]-a[1]).slice(0,10))
        result.defectList=defectList

        // Sheet 3: Installer stats
        const s3=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[3]],{header:1,defval:null})
        const inst=[]
        for(let i=1;i<s3.length;i++){
          const r=s3[i]
          const name=String(r[2]||r[1]||r[0]||'').trim()
          if(!name||name==='null'||name==='ชื่อ'||name==='ชื่อเล่น') continue
          inst.push({name,inProgress:Number(r[3]||0),installed:Number(r[4]||0),active:Number(r[5]||0),parallel:Number(r[6]||0),cancelled:Number(r[7]||0),inactive:Number(r[8]||0)})
        }
        if(inst.length>0) result.installers=inst

        // Sheet 0: Hospital volume
        const s0=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:null})
        const hosp=[]
        for(let i=2;i<s0.length;i++){
          const r=s0[i]; if(!r[0]||!String(r[0]).match(/^\d{5}$/)) continue
          hosp.push({hospcode:String(r[0]),region:r[1]?Math.round(Number(r[1])):null,ovst:Number(r[2]||0),opdscreen:Number(r[3]||0),vn_stat:Number(r[5]||0),opitemrece:Number(r[7]||0),status:String(r[9]||'')})
        }
        result.hospitals=hosp

        resolve(result)
      } catch(err){ reject(err) }
    }
    reader.onerror=reject
    reader.readAsArrayBuffer(file)
  })
}

const PAGES = {
  overview:   Overview,
  facility:   FacilityMgmt,
  install:    InstallTracking,
  volume:     DataVolume,
  callcenter: CallCenter,
  defect:     DefectRequest,
  standby:    StandbyQA,
  training:   Training,
  workload:   Workload,
  installer:  InstallerMgmt,
}

function getGSheetExportUrl(url) {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!m) return null
  // ใช้ Vite proxy (/gsheet) เพื่อแก้ปัญหา CORS ในช่วง dev
  // production ให้เปลี่ยนกลับเป็น https://docs.google.com/...
  const isDev = import.meta.env.DEV
  const base = isDev ? '/gsheet' : 'https://docs.google.com'
  return `${base}/spreadsheets/d/${m[1]}/export?format=xlsx`
}

const AUTO_REFRESH_MS = 5 * 60 * 1000 // 5 นาที

export default function App() {
  const [data, setData] = useState(DEFAULT_DATA)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [page, setPage] = useState('overview')
  const [dragging, setDragging] = useState(false)
  const [showGS, setShowGS] = useState(false)
  const [gsUrl, setGsUrl] = useState('https://docs.google.com/spreadsheets/d/1Y4FANer87OduQcK7XctCjJ0FBEKTHlXJ4aMZklcqzFU/edit?usp=sharing')
  const [gsError, setGsError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_MS / 1000)
  const fileRef = useRef()
  const gsInputRef = useRef()
  const autoRefreshRef = useRef(null)
  const countdownRef = useRef(null)

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setLoading(true); setLoadingMsg(`กำลังอ่าน ${file.name}...`)
    try { setData(await parseExcel(file)) }
    catch { alert('ไม่สามารถอ่านไฟล์ได้') }
    finally { setLoading(false); setLoadingMsg('') }
  }, [])

  const handleGSheet = useCallback(async (silent = false) => {
    const exportUrl = getGSheetExportUrl(gsUrl)
    if (!exportUrl) { setGsError('URL ไม่ถูกต้อง'); return }
    setGsError('')
    if (!silent) { setLoading(true); setLoadingMsg('กำลังโหลดจาก Google Sheets...') }
    else { setLoadingMsg('🔄 Auto refresh...') }
    try {
      const res = await fetch(exportUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const file = new File([blob], 'GoogleSheet.xlsx', { type: blob.type })
      setData(await parseExcel(file))
      setLastRefresh(new Date())
      setCountdown(AUTO_REFRESH_MS / 1000)
      if (!silent) setShowGS(false)
    } catch(e) {
      if (!silent) setGsError('โหลดไม่ได้ — ตรวจสอบว่า Sheet เปิดเป็น Public')
    } finally { setLoading(false); setLoadingMsg('') }
  }, [gsUrl])

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => handleGSheet(true), AUTO_REFRESH_MS)
      countdownRef.current = setInterval(() => setCountdown(c => c <= 1 ? AUTO_REFRESH_MS/1000 : c - 1), 1000)
    } else {
      clearInterval(autoRefreshRef.current)
      clearInterval(countdownRef.current)
    }
    return () => {
      clearInterval(autoRefreshRef.current)
      clearInterval(countdownRef.current)
    }
  }, [autoRefresh, handleGSheet])

  // ปิด popup เมื่อกด Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') setShowGS(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const PageComponent = PAGES[page] || Overview

  return (
    <div className="app-layout">
      <Sidebar current={page} onNavigate={setPage} />
      <div className="app-main">
        <header className="header">
          <div className="header-left">
            <div className="header-title">
              <h1>NHIP Dashboard</h1>
              <p>ระบบติดตามสถิติการติดตั้ง รพ.สต. ทั่วประเทศ</p>
            </div>
          </div>
          <div className="header-right">

            {/* ── Google Sheets button ── */}
            <div style={{position:'relative'}}>
              <button
                className="gs-btn"
                onClick={() => { setShowGS(v => !v); setGsError('') }}
                title="โหลดจาก Google Sheets"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                Google Sheets
              </button>

              {showGS && (
                <div className="gs-popup">
                  <div className="gs-popup-title">🔗 โหลดจาก Google Sheets</div>
                  <input
                    ref={gsInputRef}
                    className="gs-input"
                    value={gsUrl}
                    onChange={e => setGsUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    autoFocus
                  />
                  {gsError && <div className="gs-error">{gsError}</div>}
                  <div className="gs-hint">⚠️ Sheet ต้องเปิด Public (Anyone with link)</div>
                  {/* Auto-refresh toggle */}
                  <div style={{display:'flex',alignItems:'center',gap:8,marginTop:10,padding:'8px 10px',background:'var(--bg-main)',borderRadius:8,border:'1px solid var(--border)'}}>
                    <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13,color:'var(--text-primary)',fontWeight:600}}>
                      <input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} style={{width:15,height:15,cursor:'pointer'}}/>
                      🔁 Auto Refresh ทุก 5 นาที
                    </label>
                    {autoRefresh && (
                      <span style={{marginLeft:'auto',fontSize:11,color:'#10b981',fontWeight:700}}>
                        {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,'0')}
                      </span>
                    )}
                  </div>
                  {lastRefresh && (
                    <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>
                      อัปเดตล่าสุด: {lastRefresh.toLocaleTimeString('th-TH')}
                    </div>
                  )}
                  <div style={{display:'flex',gap:8,marginTop:10}}>
                    <button className="gs-load-btn" onClick={()=>handleGSheet(false)} disabled={loading}>
                      {loading ? '⏳ กำลังโหลด...' : '🔄 โหลดข้อมูล'}
                    </button>
                    <button className="gs-cancel-btn" onClick={() => setShowGS(false)}>ยกเลิก</button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Upload Excel ── */}
            <div
              className={`upload-inline${dragging?' dragging':''}`}
              onDragOver={e=>{e.preventDefault();setDragging(true)}}
              onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0])}}
              onClick={()=>fileRef.current.click()}
            >
              <span>📂</span>
              <span>{loading ? loadingMsg : data.filename}</span>
            </div>

            {autoRefresh && (
              <span style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'#10b981',fontWeight:700,
                background:'#dcfce7',border:'1px solid #86efac',borderRadius:8,padding:'4px 10px'}}>
                🔁 Auto {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,'0')}
              </span>
            )}
            <span className="header-date">{new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'})}</span>
            <span className="header-badge">โครงการ NHIP</span>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])} />
          </div>
        </header>
        <div className="page-content">
          <PageComponent data={data} />
        </div>
      </div>
    </div>
  )
}

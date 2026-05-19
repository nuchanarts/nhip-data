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
import HospList from './pages/HospList'
import ProductionData from './pages/ProductionData'
import './index.css'

const PROD_SHEET_DEFAULT_URL = 'https://docs.google.com/spreadsheets/d/1a6nP3FBPka-DJeEzUk40_XiNYch_Eym-/edit?usp=sharing&ouid=102765207545322381480&rtpof=true&sd=true'
const DEFECT_SHEET_DEFAULT_URL = 'https://docs.google.com/spreadsheets/d/1voV3mHQi7bH2PbBeWaVrk0EaUs-9BnqMpKc53oI__RE/edit?gid=0#gid=0'
const DEFECT_REFRESH_MS = 10 * 60 * 1000 // 10 นาที

function getSheetExportUrl(sheetUrl) {
  const m = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!m) return null
  const isDev = import.meta.env.DEV
  const base = isDev ? '/gsheet' : 'https://docs.google.com'
  return `${base}/spreadsheets/d/${m[1]}/export?format=xlsx`
}

function getProdExportUrl(sheetUrl) { return getSheetExportUrl(sheetUrl) }

const DEFECT_COLUMNS_ORDER = [
  'ลำดับ','เจอปัญหา','แพลตฟอร์ม','ประเภทปัญหา','ความเร่งด่วน','สถานะ','ระบบงาน',
  'ส่งออกข้อมูล 43 แฟ้ม','PM รับผิดชอบ','ประเภท','ข้อมูลลิงค์ Taiga หรือ MANTIS',
  'นักพัฒนา','ระยะเวลาพัฒนา(ชม.)','เริ่มพัฒนา','พัฒนาเสร็จ','ลำดับการแก้ไข Dev',
  'วันที่ต้องได้','วันที่เสร็จ','Tester','ทำไฟล์ taiga หริือ mantis','รหัส MANTIS','จัดทำไฟล์แก้ไข',
]

function parseDefectSheetOnly(ab) {
  const wb = XLSX.read(ab, { type: 'array' })
  console.log('📋 Defect sheets:', wb.SheetNames)

  // หา sheet+row ที่มี column ตรงกับที่รู้จริง
  // ใช้ exact match ก่อน — 'ลำดับ' หรือ 'สถานะ' หรือ 'ความเร่งด่วน'
  const ANCHOR_COLS = new Set(['ลำดับ','สถานะ','ความเร่งด่วน','เจอปัญหา','ระบบงาน','แพลตฟอร์ม'])
  let bestRows = [], bestHeaderIdx = -1, bestScore = 0

  for (const sn of wb.SheetNames) {
    const r = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: null })
    for (let ri = 0; ri < Math.min(10, r.length); ri++) {
      if (!r[ri]) continue
      const cells = r[ri].map(c => String(c||'').trim())
      const score = cells.filter(c => ANCHOR_COLS.has(c)).length
      console.log(`📋 Sheet "${sn}" row ${ri}: score=${score}`, cells.filter(c => ANCHOR_COLS.has(c)))
      if (score > bestScore) {
        bestScore = score; bestRows = r; bestHeaderIdx = ri
      }
    }
  }

  console.log(`📋 Best header: score=${bestScore} at row ${bestHeaderIdx}`)

  // ถ้าหาไม่เจอเลย fallback ใช้ sheet ใหญ่สุด row 0
  if (bestScore === 0) {
    for (const sn of wb.SheetNames) {
      const r = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: null })
      if (r.length > bestRows.length) { bestRows = r; bestHeaderIdx = 0 }
    }
  }

  const rawHd = (bestRows[bestHeaderIdx] || []).map(h => String(h||'').trim())
  console.log('📋 Header row:', rawHd)

  // map column index — exact match ก่อน แล้ว partial
  const colIdx = {}
  DEFECT_COLUMNS_ORDER.forEach(col => {
    let i = rawHd.findIndex(h => h === col)
    if (i < 0) i = rawHd.findIndex(h => h.includes(col) || col.includes(h))
    if (i >= 0) colIdx[col] = i
  })
  // ถ้า map ได้น้อยมาก ให้ map ตาม position เลย (sheet มีแค่ header row 0)
  if (Object.keys(colIdx).length < 3) {
    console.warn('📋 Positional fallback')
    DEFECT_COLUMNS_ORDER.forEach((col, i) => { colIdx[col] = i })
  }
  console.log('📋 colIdx:', colIdx)

  const defectColumns = DEFECT_COLUMNS_ORDER // ใช้ลำดับที่กำหนดเสมอ

  const statusCol  = colIdx['สถานะ']        ?? -1
  const systemCol  = colIdx['ระบบงาน']      ?? -1
  const urgencyCol = colIdx['ความเร่งด่วน'] ?? -1

  const ds={}, dsys={}, du={}, defectList=[]
  const start = bestHeaderIdx >= 0 ? bestHeaderIdx + 1 : 1
  for (let i = start; i < bestRows.length; i++) {
    const r = bestRows[i]; if (!r || r.every(c => !c)) continue
    const s   = statusCol  >= 0 ? String(r[statusCol]||'').trim()  : ''
    const sys = systemCol  >= 0 ? String(r[systemCol]||'').trim()  : ''
    const u   = urgencyCol >= 0 ? String(r[urgencyCol]||'').trim() : ''
    if (s   && s   !== 'null') ds[s]     = (ds[s]||0) + 1
    if (sys && sys !== 'null') dsys[sys] = (dsys[sys]||0) + 1
    if (u   && u   !== 'null') du[u]     = (du[u]||0) + 1
    const row = {}
    defectColumns.forEach(col => {
      const ci = colIdx[col] ?? -1
      const val = ci >= 0 ? r[ci] : null
      row[col] = val instanceof Date ? val.toLocaleDateString('th-TH') : String(val == null ? '' : val)
    })
    row.__status  = s
    row.__system  = sys
    row.__urgency = u
    defectList.push(row)
  }
  console.log(`📋 Defect parsed: ${defectList.length} rows, status:`, ds)
  return {
    defect_status:  ds,
    defect_urgency: du,
    defect_system:  Object.fromEntries(Object.entries(dsys).filter(([k])=>k&&k!=='null').sort((a,b)=>b[1]-a[1]).slice(0,10)),
    defectColumns,
    defectList,
  }
}

export const DEFAULT_DATA = {
  job_status: { "รอติดตั้ง":2476,"ใช้งานระบบ":1049,"ใช้งานคู่ขนาน":617,"ไม่ได้ใช้งาน":351,"เลิกใช้งาน":14 },
  progress: { "ยังไม่ติดตั้ง":2399,"ดำเนินการแล้ว":2087,"อยู่ในระหว่างดำเนินการ":21 },
  regions: {"1":254,"2":431,"3":262,"4":616,"5":416,"6":380,"7":105,"8":409,"9":696,"10":432,"11":198,"12":310},
  monthly: {"2025-10":169,"2025-11":141,"2025-12":234,"2026-01":242,"2026-02":595,"2026-03":619},
  callList: [],
  standby_type: {"การใช้งาน":1907,"ส่งออกข้อมูล":666,"ติดตั้งระบบ":368,"ข้อมูลพื้นฐาน":343,"Defect/BUG":65,"แบบฟอร์ม":32,"Requirement":19},
  standby_status: {"ดำเนินการแล้ว":3276,"กำลังดำเนินการ":80,"รอดำเนินการ":79,"ไม่ดำเนินการ":1},
  defect_status: {"จัดทำ MANTIS":54,"รอแจ้งทีมพัฒนา":35,"แก้ไขเรียบร้อย":28,"รอทีมพัฒนา":14,"ยกเลิก":8,"รอ compile":4,"ส่งกลับนักพัฒนา":2},
  defectColumns: [],
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
  productionVisits: [],
  productionDates: [],
  installList: installDataRaw,
  regionDone: {"1":{done:68,total:254},"2":{done:188,total:431},"3":{done:260,total:262},"4":{done:555,total:616},"5":{done:291,total:416},"6":{done:218,total:380},"7":{done:0,total:105},"8":{done:223,total:409},"9":{done:284,total:696},"10":{done:0,total:432},"11":{done:0,total:198},"12":{done:0,total:310}},
  migrationDone: 493,
  provinceCnt: {"34-อุบลราชธานี":237,"31-บุรีรัมย์":224,"32-สุรินทร์":212,"14-พระนครศรีอยุธยา":206,"50-เชียงใหม่":186,"30-นครราชสีมา":165,"48-นครพนม":135,"33-ศรีสะเกษ":132,"90-สงขลา":126,"24-ฉะเชิงเทรา":119},
  total: 4509,
  filename: 'NHIP_Dashboard_Diary.xlsx'
}

function parseProductionSheets(ab) {
  const wb = XLSX.read(ab, { type: 'array' })
  const productionVisits = []
  let productionDates = []
  wb.SheetNames.forEach(sn => {
    const m = sn.match(/เขต\s*(\d+)/)
    if (!m) return
    const region = Number(m[1])
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: null })
    if (rows.length < 2) return
    const header = rows[0] || []
    const dates = header.slice(2).map(d => String(d || ''))
    if (productionDates.length === 0 && dates.length > 0) productionDates = dates
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || !r[0]) continue
      const visits = dates.map((_, di) => Number(r[di + 2] || 0))
      productionVisits.push({
        hospcode: String(r[0]),
        name:     String(r[1] || ''),
        region,
        visits,
        total:  visits.reduce((a, b) => a + b, 0),
        latest: visits[visits.length - 1] || 0,
      })
    }
  })
  return { productionVisits, productionDates }
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
        // dynamic header lookup สำหรับ Sheet 5
        const h5 = (s5[0]||[]).map(h=>String(h||'').trim())
        console.log('📋 Sheet5 headers:', h5)
        const s5col = key => {
          const patterns = {
            hospcode:    ['รหัสหน่วย','hospcode','รหัส'],
            region:      ['เขต'],
            name:        ['ชื่อหน่วย','ชื่อ รพ','ชื่อ'],
            province:    ['จังหวัด'],
            amphoe:      ['อำเภอ'],
            install_date:['วันที่ติดตั้ง','วันติดตั้ง'],
            mig_start:   ['วันเริ่ม Migration','เริ่ม Mig'],
            mig_end:     ['วันสิ้นสุด Migration','สิ้นสุด Mig'],
            trans_start: ['วันเริ่ม Transition','เริ่ม Trans'],
            trans_end:   ['วันสิ้นสุด Transition','สิ้นสุด Trans'],
            progress:    ['สถานะการดำเนินการ','สถานะ Progress','Progress'],
            status:      ['สถานะงาน','Job Status','สถานะ Job'],
            finish_date: ['วันที่เสร็จ','วันเสร็จ'],
            responsible: ['ผู้ติดตั้ง','ผู้รับผิดชอบ'],
            summary:     ['สรุปรายงานติดตั้ง','สรุปรายงาน','รายงานติดตั้ง'],
            check_date:  ['วันที่ตรวจสอบ','วันตรวจสอบ'],
            remark:      ['หมายเหตุ','Remark'],
            pm:          ['PM','Project Manager'],
          }
          const pats = patterns[key] || [key]
          const idx = h5.findIndex(h => pats.some(p => h.includes(p)))
          return idx >= 0 ? idx : null
        }
        // fallback index เดิม ถ้าหา header ไม่เจอ
        const fb5 = { hospcode:0,region:1,name:2,province:3,amphoe:4,install_date:5,mig_start:6,mig_end:7,trans_start:8,trans_end:9,progress:10,status:11,finish_date:12,responsible:13,summary:14,check_date:15,remark:16,pm:17 }
        const c5 = key => s5col(key) ?? fb5[key]
        console.log('📋 Sheet5 summary col:', c5('summary'), '| progress col:', c5('progress'), '| status col:', c5('status'))

        const js={}, pg={}, rg={}, mo={}, regionDone={}, provinceCnt={}
        const installList = []
        let migDone = 0
        const s5start = h5.length > 0 ? 1 : 0
        for(let i=s5start;i<s5.length;i++){
          const r=s5[i]; if(!r[c5('hospcode')]) continue
          const j=String(r[c5('status')]||''), p=String(r[c5('progress')]||'')
          const region=r[c5('region')]?Math.round(Number(r[c5('region')])):null
          const dt=r[c5('install_date')]
          const province=String(r[c5('province')]||''), amphoe=String(r[c5('amphoe')]||'')
          if(j&&j!=='null') js[j]=(js[j]||0)+1
          if(p&&p!=='null') pg[p]=(pg[p]||0)+1
          if(region){ rg[region]=(rg[region]||0)+1
            if(!regionDone[region]) regionDone[region]={done:0,total:0}
            regionDone[region].total++
            if(p==='ดำเนินการแล้ว') regionDone[region].done++
          }
          if(province&&province!=='null') provinceCnt[province]=(provinceCnt[province]||0)+1
          const migEndVal = r[c5('mig_end')]
          if(migEndVal) migDone++
          if(dt instanceof Date && dt.getFullYear()>2000){
            const yr=dt.getFullYear()>2100?dt.getFullYear()-543:dt.getFullYear()
            const k=`${yr}-${String(dt.getMonth()+1).padStart(2,'0')}`
            mo[k]=(mo[k]||0)+1
          }
          const summaryVal = String(r[c5('summary')]||'').trim()
          installList.push({
            hospcode:    String(r[c5('hospcode')]||''),
            region,
            name:        String(r[c5('name')]||''),
            province,
            amphoe,
            install_date: dt instanceof Date ? dt.toLocaleDateString('th-TH') : '',
            mig_start:   r[c5('mig_start')] instanceof Date ? r[c5('mig_start')].toLocaleDateString('th-TH') : '',
            mig_end:     migEndVal instanceof Date ? migEndVal.toLocaleDateString('th-TH') : '',
            trans_start: r[c5('trans_start')] instanceof Date ? r[c5('trans_start')].toLocaleDateString('th-TH') : '',
            trans_end:   r[c5('trans_end')] instanceof Date ? r[c5('trans_end')].toLocaleDateString('th-TH') : '',
            progress:    p,
            status:      j,
            finish_date: r[c5('finish_date')] instanceof Date ? r[c5('finish_date')].toLocaleDateString('th-TH') : '',
            responsible: String(r[c5('responsible')]||''),
            summary:     summaryVal,
            check_date:  r[c5('check_date')] instanceof Date ? r[c5('check_date')].toLocaleDateString('th-TH') : String(r[c5('check_date')]||''),
            remark:      String(r[c5('remark')]||''),
            pm:          String(r[c5('pm')]||''),
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

        // Sheet: Defect — หาชื่อ sheet "02.Req/ Defect" โดยตรงก่อน แล้วค่อย fallback
        console.log('📋 All sheets:', wb.SheetNames)
        const defectSheetName =
          wb.SheetNames.find(n => n === '02.Req/ Defect') ||
          wb.SheetNames.find(n => n.toLowerCase().includes('defect')) ||
          wb.SheetNames.find(n => n.toLowerCase().includes('req')) ||
          wb.SheetNames[8]
        const s8 = XLSX.utils.sheet_to_json(wb.Sheets[defectSheetName], { header:1, defval:null })
        console.log('📋 Defect sheet:', defectSheetName, '| rows:', s8.length)
        for (let ri = 0; ri < Math.min(5, s8.length); ri++) console.log(`📋 Defect row${ri}:`, s8[ri])

        // หา header row — ต้องมี "สถานะดำเนินการ" หรือมี keyword ≥2 ตัวในแถวเดียวกัน
        const DEFECT_HEADER_KEYS = ['สถานะดำเนินการ','วันที่','ระบบงาน','ด่วน','หัวข้อ','รายละเอียด','mantis','Mantis','ผู้รับผิดชอบ']
        const defectHeaderRowIdx = s8.findIndex(row => {
          if (!row) return false
          const cells = row.map(c => String(c||'').trim())
          // ต้องมี "สถานะดำเนินการ" โดยตรง หรือมี keyword ≥2 ตัว
          if (cells.some(c => c.includes('สถานะดำเนินการ') || c.includes('สถานะดำเนินกา'))) return true
          const matchCount = DEFECT_HEADER_KEYS.filter(k => cells.some(c => c.includes(k))).length
          return matchCount >= 2
        })
        const defectHeaderRow = defectHeaderRowIdx >= 0 ? s8[defectHeaderRowIdx] : []
        const hd = defectHeaderRow.map(h => String(h||'').trim())
        console.log('📋 Defect header row idx:', defectHeaderRowIdx, '| headers:', hd)

        // ค้นหา column โดยลอง pattern ที่เจาะจงก่อน แล้วค่อย fallback
        const findCol = (pats) => {
          for (const p of pats) {
            const i = hd.findIndex(h => h.includes(p))
            if (i >= 0) return i
          }
          return -1
        }
        const colMap = {
          date:        findCol(['วันที่เจอปัญหา','วันที่']),
          system:      findCol(['ระบบงาน','ระบบ']),
          sys_status:  findCol(['สถานะระบบ','สถานะการใช้งาน']),
          urgency:     findCol(['ด่วน/ไม่ด่วน','ความเร่งด่วน','ด่วน']),
          status:      findCol(['สถานะดำเนินการ','สถานะดำเนินกา']),
          detail:      findCol(['หัวข้อ/รายละเอียด','หัวข้อ','รายละเอียด','ปัญหา']),
          mantis:      findCol(['สถานะทำ Mantis','Mantis','MANTIS','mantis','Taiga','taiga','Issue No']),
          responsible: findCol(['ผู้รับผิดชอบ','ผู้ดำเนินการ','ผู้แก้ไข']),
        }
        console.log('📋 Defect colMap:', colMap)
        // fallback indices ถ้าหา header ไม่เจอ
        const fbd = { date:0, system:1, sys_status:2, urgency:3, status:4, detail:5, mantis:6, responsible:7 }
        const cold = key => colMap[key] >= 0 ? colMap[key] : fbd[key]
        console.log('📋 Defect col mapping:', Object.keys(fbd).map(k=>`${k}→${cold(k)}`).join(', '))

        const ds={},dsys={},du={},defectList=[]
        const defectDataStart = defectHeaderRowIdx >= 0 ? defectHeaderRowIdx + 1 : 2
        for(let i=defectDataStart;i<s8.length;i++){
          const r=s8[i]; if(!r || r.every(c=>!c)) continue
          const s=String(r[cold('status')]||'').trim(), sys=String(r[cold('system')]||'').trim(), u=String(r[cold('urgency')]||'').trim()
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
        console.log('📋 Defect status values found:', ds)
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
  production: ProductionData,
  callcenter: CallCenter,
  defect:     DefectRequest,
  standby:    StandbyQA,
  training:   Training,
  workload:   Workload,
  installer:  InstallerMgmt,
  hosplist:   HospList,
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

const AUTO_REFRESH_MS = 5 * 60 * 1000  // 5 นาที (main sheet)
const PROD_REFRESH_MS = 10 * 60 * 1000 // 10 นาที (production sheet)

export default function App() {
  const [data, setData] = useState(DEFAULT_DATA)
  const [prodLoading, setProdLoading] = useState(false)
  const [prodError, setProdError] = useState('')
  const [prodCountdown, setProdCountdown] = useState(PROD_REFRESH_MS / 1000)
  const [prodSheetUrl, setProdSheetUrl] = useState(PROD_SHEET_DEFAULT_URL)
  const prodAutoRefreshRef = useRef(null)
  const prodCountdownRef = useRef(null)
  const [defectLoading, setDefectLoading] = useState(false)
  const [defectError, setDefectError] = useState('')
  const [defectCountdown, setDefectCountdown] = useState(DEFECT_REFRESH_MS / 1000)
  const [defectSheetUrl, setDefectSheetUrl] = useState(DEFECT_SHEET_DEFAULT_URL)
  const defectAutoRefreshRef = useRef(null)
  const defectCountdownRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [page, setPage] = useState('production')
  const [dragging, setDragging] = useState(false)
  const [showGS, setShowGS] = useState(false)
  const [gsUrl, setGsUrl] = useState('https://docs.google.com/spreadsheets/d/1Y4FANer87OduQcK7XctCjJ0FBEKTHlXJ4aMZklcqzFU/edit?usp=sharing')
  const [gsError, setGsError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_MS / 1000)
  const fileRef = useRef()
  const gsInputRef = useRef()
  const autoRefreshRef = useRef(null)
  const countdownRef = useRef(null)

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setLoading(true); setLoadingMsg(`กำลังอ่าน ${file.name}...`)
    try {
      const parsed = await parseExcel(file)
      setData(prev => ({ ...parsed, productionVisits: prev.productionVisits, productionDates: prev.productionDates }))
    }
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
      const parsed = await parseExcel(file)
      setData(prev => ({ ...parsed, productionVisits: prev.productionVisits, productionDates: prev.productionDates }))
      setLastRefresh(new Date())
      setCountdown(AUTO_REFRESH_MS / 1000)
      if (!silent) setShowGS(false)
    } catch(e) {
      if (!silent) setGsError('โหลดไม่ได้ — ตรวจสอบว่า Sheet เปิดเป็น Public')
    } finally { setLoading(false); setLoadingMsg('') }
  }, [gsUrl])

  // โหลด Production Sheet — โหลดครั้งเดียวตอนเปิด, มี timeout 20s
  const loadProdSheet = useCallback((urlOverride) => {
    const exportUrl = getProdExportUrl(urlOverride || prodSheetUrl)
    if (!exportUrl) { setProdError('URL ไม่ถูกต้อง'); return }
    const ctrl = new AbortController()
    const url = exportUrl
    const timer = setTimeout(() => ctrl.abort(), 20000)
    setProdLoading(true)
    setProdError('')
    fetch(url, { signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer() })
      .then(ab => {
        clearTimeout(timer)
        const { productionVisits, productionDates } = parseProductionSheets(ab)
        setData(prev => ({ ...prev, productionVisits, productionDates }))
      })
      .catch(e => {
        clearTimeout(timer)
        const msg = e.name === 'AbortError' ? 'หมดเวลา (timeout 20s)' : `โหลดไม่ได้: ${e.message}`
        setProdError(msg)
        console.warn('Production sheet load failed:', e)
      })
      .finally(() => setProdLoading(false))
  }, [prodSheetUrl])

  useEffect(() => {
    loadProdSheet()
    prodAutoRefreshRef.current = setInterval(() => {
      loadProdSheet()
      setProdCountdown(PROD_REFRESH_MS / 1000)
    }, PROD_REFRESH_MS)
    prodCountdownRef.current = setInterval(() => setProdCountdown(c => c <= 1 ? PROD_REFRESH_MS / 1000 : c - 1), 1000)
    return () => {
      clearInterval(prodAutoRefreshRef.current)
      clearInterval(prodCountdownRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDefectSheet = useCallback((urlOverride) => {
    const exportUrl = getSheetExportUrl(urlOverride || defectSheetUrl)
    if (!exportUrl) { setDefectError('URL ไม่ถูกต้อง'); return }
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20000)
    setDefectLoading(true)
    setDefectError('')
    fetch(exportUrl, { signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer() })
      .then(ab => {
        clearTimeout(timer)
        const defectData = parseDefectSheetOnly(ab)
        // เขียนทับเฉพาะเมื่อ parse ได้ข้อมูลจริง
        if (defectData.defectList.length > 0 || defectData.defectColumns.length > 0) {
          setData(prev => ({ ...prev, ...defectData }))
        } else {
          console.warn('⚠️ parseDefectSheetOnly returned empty — ไม่เขียนทับ default data')
        }
      })
      .catch(e => {
        clearTimeout(timer)
        setDefectError(e.name === 'AbortError' ? 'หมดเวลา (timeout 20s)' : `โหลดไม่ได้: ${e.message}`)
      })
      .finally(() => setDefectLoading(false))
  }, [defectSheetUrl])

  useEffect(() => {
    loadDefectSheet()
    defectAutoRefreshRef.current = setInterval(() => {
      loadDefectSheet()
      setDefectCountdown(DEFECT_REFRESH_MS / 1000)
    }, DEFECT_REFRESH_MS)
    defectCountdownRef.current = setInterval(() => setDefectCountdown(c => c <= 1 ? DEFECT_REFRESH_MS / 1000 : c - 1), 1000)
    return () => {
      clearInterval(defectAutoRefreshRef.current)
      clearInterval(defectCountdownRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // โหลด Google Sheets อัตโนมัติครั้งแรก
  useEffect(() => {
    handleGSheet(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // โหลด defect sheet ใหม่ทันทีเมื่อเปิดหน้า defect
  useEffect(() => {
    if (page === 'defect') loadDefectSheet()
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  // โหลด production sheet ใหม่ทันทีทุกครั้งที่เปิดหน้า ข้อมูลการใช้งาน
  useEffect(() => {
    if (page === 'production') loadProdSheet()
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

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
          <PageComponent
            data={data}
            {...(page === 'production' ? {
              prodLoading, prodError, prodCountdown,
              prodSheetUrl, setProdSheetUrl,
              onRetryProd: loadProdSheet,
            } : {})}
            {...(page === 'defect' ? {
              defectLoading, defectError, defectCountdown,
              defectSheetUrl, setDefectSheetUrl,
              onRetryDefect: loadDefectSheet,
            } : {})}
          />
        </div>
      </div>
    </div>
  )
}

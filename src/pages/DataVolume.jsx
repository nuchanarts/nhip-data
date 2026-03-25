import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import geoData from '../data/thailand-provinces.json'

// Thai province name → GeoJSON NAME_1 mapping
const THAI_TO_GEO = {
  'กรุงเทพมหานคร':'Bangkok Metropolis','สมุทรปราการ':'Samut Prakan','นนทบุรี':'Nonthaburi',
  'ปทุมธานี':'Pathum Thani','พระนครศรีอยุธยา':'Phra Nakhon Si Ayutthaya','อ่างทอง':'Ang Thong',
  'ลพบุรี':'Lop Buri','สิงห์บุรี':'Sing Buri','ชัยนาท':'Chai Nat','สระบุรี':'Saraburi',
  'ชลบุรี':'Chon Buri','ระยอง':'Rayong','จันทบุรี':'Chanthaburi','ตราด':'Trat',
  'ฉะเชิงเทรา':'Chachoengsao','ปราจีนบุรี':'Prachin Buri','นครนายก':'Nakhon Nayok','สระแก้ว':'Sa Kaeo',
  'นครราชสีมา':'Nakhon Ratchasima','บุรีรัมย์':'Buri Ram','สุรินทร์':'Surin','ศรีสะเกษ':'Si Sa Ket',
  'อุบลราชธานี':'Ubon Ratchathani','ยโสธร':'Yasothon','ชัยภูมิ':'Chaiyaphum','อำนาจเจริญ':'Amnat Charoen',
  'หนองบัวลำภู':'Nong Bua Lam Phu','ขอนแก่น':'Khon Kaen','อุดรธานี':'Udon Thani','เลย':'Loei',
  'หนองคาย':'Nong Khai','มหาสารคาม':'Maha Sarakham','ร้อยเอ็ด':'Roi Et','กาฬสินธุ์':'Kalasin',
  'สกลนคร':'Sakon Nakhon','นครพนม':'Nakhon Phanom','มุกดาหาร':'Mukdahan',
  'เชียงใหม่':'Chiang Mai','ลำพูน':'Lamphun','ลำปาง':'Lampang','อุตรดิตถ์':'Uttaradit',
  'แพร่':'Phrae','น่าน':'Nan','พะเยา':'Phayao','เชียงราย':'Chiang Rai','แม่ฮ่องสอน':'Mae Hong Son',
  'นครสวรรค์':'Nakhon Sawan','อุทัยธานี':'Uthai Thani','กำแพงเพชร':'Kamphaeng Phet','ตาก':'Tak',
  'สุโขทัย':'Sukhothai','พิษณุโลก':'Phitsanulok','พิจิตร':'Phichit','เพชรบูรณ์':'Phetchabun',
  'ราชบุรี':'Ratchaburi','กาญจนบุรี':'Kanchanaburi','สุพรรณบุรี':'Suphan Buri','นครปฐม':'Nakhon Pathom',
  'สมุทรสาคร':'Samut Sakhon','สมุทรสงคราม':'Samut Songkhram','เพชรบุรี':'Phetchaburi',
  'ประจวบคีรีขันธ์':'Prachuap Khiri Khan',
  'นครศรีธรรมราช':'Nakhon Si Thammarat','กระบี่':'Krabi','พังงา':'Phangnga','ภูเก็ต':'Phuket',
  'สุราษฎร์ธานี':'Surat Thani','ระนอง':'Ranong','ชุมพร':'Chumphon',
  'สงขลา':'Songkhla','สตูล':'Satun','ตรัง':'Trang','พัทลุง':'Phatthalung',
  'ปัตตานี':'Pattani','ยะลา':'Yala','นราธิวาส':'Narathiwat','บึงกาฬ':'Nong Khai',
}

function getProvinceColor(done, inProgress, total) {
  if (!total || total === 0) return '#e2e8f0' // gray = ไม่มีข้อมูล
  const donePct = done / total
  if (donePct >= 0.8) return '#16a34a'   // เขียวเข้ม — ติดตั้งเสร็จเกือบหมด
  if (donePct >= 0.5) return '#4ade80'   // เขียวอ่อน — เกินครึ่ง
  if (donePct >= 0.1) return '#86efac'   // เขียวอ่อนมาก — บางส่วน
  if (inProgress > 0) return '#f97316'   // ส้ม — กำลังติดตั้ง
  return '#fed7aa'                        // ส้มอ่อน — ยังไม่ดำเนินการ
}

const COLORS = ['#2563eb','#10b981','#f59e0b','#7c3aed','#06b6d4','#ef4444','#f97316','#84cc16','#e879f9','#0ea5e9','#a3e635','#fb7185']
const STATUS_COLOR = {'ใช้งานระบบ':'#10b981','ใช้งานคู่ขนาน':'#06b6d4','รอติดตั้ง':'#f59e0b','ไม่ได้ใช้งาน':'#ef4444','เลิกใช้งาน':'#94a3b8','':'#e2e8f0'}
const PROG_COLOR = {'ดำเนินการแล้ว':'#10b981','ยังไม่ติดตั้ง':'#f59e0b','อยู่ในระหว่างดำเนินการ':'#2563eb','':'#e2e8f0'}
const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

const PAGE_SIZE = 30

export default function DataVolume({ data }) {
  const { regionDone, migrationDone, provinceCnt, installList, total, job_status } = data
  const [search, setSearch] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)

  const totalDone = Object.values(regionDone||{}).reduce((a,r)=>a+(r.done||0),0)
  const donePct = ((totalDone/(total||1))*100).toFixed(1)
  const migPct  = ((migrationDone/(total||1))*100).toFixed(1)

  // Region bar data
  const regionBarData = Object.entries(regionDone||{}).map(([k,v])=>({
    name: `เขต ${k}`,
    ดำเนินการแล้ว: v.done,
    ยังไม่ดำเนินการ: v.total - v.done,
    pct: v.total > 0 ? ((v.done/v.total)*100).toFixed(0) : 0
  }))

  // Province bar
  const provinceData = Object.entries(provinceCnt||{}).slice(0,12).map(([k,v])=>({
    name: k.includes('-') ? k.split('-')[1] : k, value: v, full: k
  }))

  // Filter table
  const filtered = (installList||[]).filter(r => {
    const matchSearch = !search || r.name.includes(search) || r.hospcode.includes(search) || r.province.includes(search)
    const matchRegion = !filterRegion || String(r.region) === filterRegion
    const matchStatus = !filterStatus || r.status === filterStatus
    return matchSearch && matchRegion && matchStatus
  })
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData   = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)

  const uniqueRegions = [...new Set((installList||[]).map(r=>r.region).filter(Boolean))].sort((a,b)=>a-b)
  const uniqueStatuses = [...new Set((installList||[]).map(r=>r.status).filter(Boolean))]

  // Province status map from installList
  const provinceStatMap = {}
  ;(installList||[]).forEach(r => {
    if (!r.province) return
    const thaiName = r.province.includes('-') ? r.province.split('-').slice(1).join('-') : r.province
    if (!provinceStatMap[thaiName]) provinceStatMap[thaiName] = {done:0, inProgress:0, total:0}
    provinceStatMap[thaiName].total++
    if (r.progress === 'ดำเนินการแล้ว') provinceStatMap[thaiName].done++
    else if (r.progress === 'อยู่ในระหว่างดำเนินการ') provinceStatMap[thaiName].inProgress++
  })
  const mapMax = Math.max(...Object.values(provinceStatMap).map(v=>v.total), 1)
  const [hoveredProv, setHoveredProv] = useState(null)

  return (
    <div className="page">
      <div className="page-title">📊 ปริมาณข้อมูล HIS</div>
      <div className="page-desc">ข้อมูลผู้ติดตั้ง — รายชื่อ รพ.สต. เขต จังหวัด อำเภอ วันที่ติดตั้ง Migration และสถานะการใช้งาน</div>

      {/* KPI */}
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginTop:20}}>
        {[
          {color:'c-blue',  icon:'🏥', val:fmt(total||0),        label:'รพ.สต. ทั้งหมด',      pct:'100%'},
          {color:'c-green', icon:'✅', val:fmt(totalDone),        label:'ดำเนินการแล้ว',       pct:`${donePct}%`},
          {color:'c-orange',icon:'📦', val:fmt(migrationDone||0), label:'Migration เสร็จแล้ว', pct:`${migPct}%`},
          {color:'c-purple',icon:'⏳', val:fmt((total||0)-totalDone), label:'ยังไม่ดำเนินการ', pct:`${(100-+donePct).toFixed(1)}%`},
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

      {/* Thailand Map */}
      <div className="section-label" style={{marginTop:24}}>แผนที่ประเทศไทย — จำนวน รพ.สต. แยกจังหวัด</div>
      <div className="chart-card" style={{marginBottom:22}}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Choropleth Map — ปริมาณ รพ.สต. รายจังหวัด</div>
            <div className="chart-sub">ข้อมูลจาก {(installList||[]).length.toLocaleString()} แห่ง · hover เพื่อดูรายละเอียด</div>
          </div>
          <span className="chart-badge">Map</span>
        </div>
        <div style={{display:'flex',gap:24,alignItems:'flex-start'}}>
          {/* Map */}
          <div style={{flex:'0 0 420px',position:'relative'}}>
            {hoveredProv && (
              <div style={{
                position:'absolute',top:8,left:8,zIndex:10,
                background:'#1e293b',color:'#fff',borderRadius:8,
                padding:'8px 14px',fontSize:13,pointerEvents:'none',
                boxShadow:'0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <div style={{fontWeight:700}}>{hoveredProv.thai}</div>
                <div style={{color:'#94a3b8',fontSize:11,marginBottom:4}}>{hoveredProv.eng}</div>
                <div style={{display:'flex',gap:10,fontSize:12}}>
                  <span style={{color:'#4ade80'}}>✅ เสร็จ: {hoveredProv.done}</span>
                  <span style={{color:'#fb923c'}}>⏳ กำลัง: {hoveredProv.inProgress}</span>
                </div>
                <div style={{color:'#94a3b8',fontSize:11,marginTop:2}}>รวม {hoveredProv.total} รพ.สต.</div>
              </div>
            )}
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ center: [101, 13], scale: 1800 }}
              width={420} height={560}
              style={{width:'100%',height:'auto'}}
            >
              <Geographies geography={geoData}>
                {({ geographies }) =>
                  geographies
                    .filter(geo => !geo.properties.NAME_1.includes('(Songkhla Lake)') &&
                                   !geo.properties.NAME_1.includes('(Phatthalung'))
                    .map(geo => {
                      const engName = geo.properties.NAME_1
                      const thaiName = Object.entries(THAI_TO_GEO).find(([,v])=>v===engName)?.[0] || engName
                      const stat = provinceStatMap[thaiName] || {done:0, inProgress:0, total:0}
                      const fill = getProvinceColor(stat.done, stat.inProgress, stat.total)
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fill}
                          stroke="#fff"
                          strokeWidth={0.5}
                          onMouseEnter={() => setHoveredProv({thai:thaiName, eng:engName, ...stat})}
                          onMouseLeave={() => setHoveredProv(null)}
                          style={{
                            default:{outline:'none'},
                            hover:{fill:'#f59e0b',outline:'none',cursor:'pointer'},
                            pressed:{outline:'none'},
                          }}
                        />
                      )
                    })
                }
              </Geographies>
            </ComposableMap>
            {/* Color legend */}
            <div style={{display:'flex',gap:12,marginTop:8,justifyContent:'center',flexWrap:'wrap'}}>
              {[
                {color:'#16a34a',label:'ติดตั้งเสร็จ ≥80%'},
                {color:'#4ade80',label:'ติดตั้งเสร็จ 50–79%'},
                {color:'#86efac',label:'ติดตั้งเสร็จ 10–49%'},
                {color:'#f97316',label:'กำลังติดตั้ง'},
                {color:'#fed7aa',label:'ยังไม่ดำเนินการ'},
                {color:'#e2e8f0',label:'ไม่มีข้อมูล'},
              ].map((l,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#64748b'}}>
                  <div style={{width:12,height:12,borderRadius:2,background:l.color,border:'1px solid #cbd5e1'}}/>
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Top provinces list */}
          <div style={{flex:1}}>
            <div style={{fontWeight:600,color:'var(--text-primary)',marginBottom:10,fontSize:13}}>Top จังหวัดที่มี รพ.สต. มากที่สุด</div>
            {Object.entries(provinceStatMap)
              .sort((a,b)=>b[1].total-a[1].total)
              .slice(0,20)
              .map(([name, stat], i) => {
                const pct = stat.total > 0 ? (stat.done/stat.total)*100 : 0
                const barColor = getProvinceColor(stat.done, stat.inProgress, stat.total)
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <span style={{
                      width:20,height:20,borderRadius:'50%',background:barColor,border:'1px solid #cbd5e1',
                      fontSize:9,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',
                      flexShrink:0,color: pct>=50?'#14532d':'#7c2d12'
                    }}>{i+1}</span>
                    <span style={{flex:1,fontSize:11.5,color:'var(--text-primary)'}}>{name}</span>
                    <div style={{width:70,background:'#f1f5f9',borderRadius:4,height:7,flexShrink:0}}>
                      <div style={{width:`${(stat.total/mapMax)*100}%`,height:'100%',borderRadius:4,background:barColor}}/>
                    </div>
                    <span style={{width:28,textAlign:'right',fontSize:11,fontWeight:700,color:'var(--text-muted)'}}>{stat.total}</span>
                    <span style={{width:32,textAlign:'right',fontSize:10,color:'#16a34a'}}>{stat.done}✓</span>
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="section-label" style={{marginTop:24}}>ความคืบหน้าแยกตามเขตสุขภาพ</div>
      <div className="charts-row charts-row-3">
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">ดำเนินการแล้ว vs ยังไม่ดำเนินการ</div>
              <div className="chart-sub">แยกตาม 12 เขตสุขภาพ</div></div>
            <span className="chart-badge">Stacked</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={regionBarData} margin={{top:5,right:10,bottom:5,left:0}}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:10}}/>
              <YAxis tick={{fill:'#64748b',fontSize:11}}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="ดำเนินการแล้ว" stackId="a" fill="#10b981" radius={[0,0,0,0]}/>
              <Bar dataKey="ยังไม่ดำเนินการ" stackId="a" fill="#e2e8f0" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
          <div style={{display:'flex',gap:14,justifyContent:'center',marginTop:8}}>
            <div className="leg-item"><div className="leg-dot" style={{background:'#10b981'}}/><span className="leg-name">ดำเนินการแล้ว</span></div>
            <div className="leg-item"><div className="leg-dot" style={{background:'#e2e8f0'}}/><span className="leg-name">ยังไม่ดำเนินการ</span></div>
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <div><div className="chart-title">Top จังหวัดที่มี รพ.สต. มากที่สุด</div></div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={provinceData} layout="vertical" margin={{top:5,right:20,bottom:5,left:85}}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
              <XAxis type="number" tick={{fill:'#64748b',fontSize:11}}/>
              <YAxis type="category" dataKey="name" tick={{fill:'#64748b',fontSize:10}} width={80}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="value" name="จำนวน รพ.สต." radius={[0,5,5,0]}>
                {provinceData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* % progress per region */}
      <div className="section-label" style={{marginTop:24}}>% ความคืบหน้าแต่ละเขต</div>
      <div className="chart-card" style={{marginBottom:22}}>
        <div className="prog-list">
          {regionBarData.map((r,i)=>{
            const pct = +r.pct
            const total2 = r['ดำเนินการแล้ว'] + r['ยังไม่ดำเนินการ']
            return (
              <div key={i} className="prog-item">
                <div className="prog-top">
                  <span className="prog-name" style={{fontWeight:600}}>{r.name}</span>
                  <span className="prog-val" style={{color: pct>=80?'#10b981':pct>=50?'#f59e0b':'#ef4444'}}>
                    {fmt(r['ดำเนินการแล้ว'])} / {fmt(total2)} แห่ง
                    <span style={{color:'var(--text-muted)',fontSize:11,marginLeft:6}}>({pct}%)</span>
                  </span>
                </div>
                <div className="prog-track">
                  <div className="prog-fill" style={{width:`${pct}%`, background: pct>=80?'#10b981':pct>=50?'#f59e0b':'#ef4444'}}/>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="section-label">รายชื่อ รพ.สต. ทั้งหมด</div>
      <div className="chart-card">
        {/* Filters */}
        <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
          <input
            className="filter-input"
            placeholder="🔍 ค้นหา รพ., รหัส, จังหวัด..."
            value={search}
            onChange={e=>{setSearch(e.target.value);setPage(1)}}
          />
          <select className="filter-select" value={filterRegion} onChange={e=>{setFilterRegion(e.target.value);setPage(1)}}>
            <option value="">ทุกเขต</option>
            {uniqueRegions.map(r=><option key={r} value={r}>เขต {r}</option>)}
          </select>
          <select className="filter-select" value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1)}}>
            <option value="">ทุกสถานะ</option>
            {uniqueStatuses.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <span style={{fontSize:12,color:'var(--text-muted)',alignSelf:'center'}}>
            แสดง {filtered.length} รายการ
          </span>
        </div>

        {/* Table */}
        <div style={{overflowX:'auto'}}>
          <div style={{minWidth:1400}}>
            {/* Header */}
            <div className="lb-header">
              <span style={{width:36,flexShrink:0}}>#</span>
              <span style={{width:70,flexShrink:0}}>รหัส</span>
              <span style={{width:44,flexShrink:0,textAlign:'center'}}>เขต</span>
              <span style={{width:200,flexShrink:0}}>ชื่อ รพ.สต.</span>
              <span style={{width:100,flexShrink:0}}>จังหวัด</span>
              <span style={{width:120,flexShrink:0}}>อำเภอ</span>
              <span style={{width:86,flexShrink:0,textAlign:'center'}}>วันที่ติดตั้ง</span>
              <span style={{width:80,flexShrink:0,textAlign:'center'}}>Mig.เริ่ม</span>
              <span style={{width:80,flexShrink:0,textAlign:'center'}}>Mig.สิ้นสุด</span>
              <span style={{width:80,flexShrink:0,textAlign:'center'}}>Trans.เริ่ม</span>
              <span style={{width:80,flexShrink:0,textAlign:'center'}}>Trans.สิ้นสุด</span>
              <span style={{width:86,flexShrink:0,textAlign:'center'}}>วันที่เสร็จสิ้น</span>
              <span style={{width:100,flexShrink:0,textAlign:'center'}}>ดำเนินการ</span>
              <span style={{width:100,flexShrink:0,textAlign:'center'}}>สถานะใช้งาน</span>
              <span style={{width:80,flexShrink:0}}>ผู้รับผิดชอบ</span>
              <span style={{width:60,flexShrink:0}}>PM</span>
            </div>

            {filtered.length === 0 && (
              <div style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>ไม่พบข้อมูลที่ตรงกับเงื่อนไข</div>
            )}

            {pageData.map((r,i)=>(
              <div key={i} className="lb-row" style={{fontSize:11.5,alignItems:'flex-start',paddingTop:8,paddingBottom:8}}>
                <span style={{width:36,flexShrink:0,color:'var(--text-muted)',paddingTop:2}}>{(page-1)*PAGE_SIZE+i+1}</span>
                <span style={{width:70,flexShrink:0,fontFamily:'monospace',fontWeight:600,paddingTop:2}}>{r.hospcode}</span>
                <span style={{width:44,flexShrink:0,textAlign:'center',paddingTop:2}}>
                  <span style={{background:'#ede9fe',color:'#6d28d9',padding:'1px 6px',borderRadius:5,fontWeight:700,fontSize:10}}>{r.region}</span>
                </span>
                <span style={{width:200,flexShrink:0,color:'var(--text-primary)',fontWeight:500,lineHeight:1.4,paddingTop:2}}>{r.name}</span>
                <span style={{width:100,flexShrink:0,color:'var(--text-secondary)',paddingTop:2}}>{r.province?.split('-')[1]||r.province}</span>
                <span style={{width:120,flexShrink:0,color:'var(--text-secondary)',paddingTop:2}}>{r.amphoe?.split('-')[1]||r.amphoe}</span>
                <span style={{width:86,flexShrink:0,textAlign:'center',color:'var(--text-secondary)',paddingTop:2}}>{r.install_date||'—'}</span>
                <span style={{width:80,flexShrink:0,textAlign:'center',color:'var(--text-secondary)',paddingTop:2}}>{r.mig_start||'—'}</span>
                <span style={{width:80,flexShrink:0,textAlign:'center',paddingTop:2}}>
                  {r.mig_end
                    ? <span style={{background:'#dcfce7',color:'#15803d',padding:'1px 6px',borderRadius:4,fontSize:10,fontWeight:600}}>{r.mig_end}</span>
                    : <span style={{color:'#cbd5e1'}}>—</span>}
                </span>
                <span style={{width:80,flexShrink:0,textAlign:'center',color:'var(--text-secondary)',paddingTop:2}}>{r.trans_start||'—'}</span>
                <span style={{width:80,flexShrink:0,textAlign:'center',paddingTop:2}}>
                  {r.trans_end
                    ? <span style={{background:'#dbeafe',color:'#1d4ed8',padding:'1px 6px',borderRadius:4,fontSize:10,fontWeight:600}}>{r.trans_end}</span>
                    : <span style={{color:'#cbd5e1'}}>—</span>}
                </span>
                <span style={{width:86,flexShrink:0,textAlign:'center',color:'var(--text-secondary)',paddingTop:2}}>{r.finish_date||'—'}</span>
                <span style={{width:100,flexShrink:0,textAlign:'center',paddingTop:2}}>
                  <span style={{
                    background:r.progress==='ดำเนินการแล้ว'?'#dcfce7':r.progress==='อยู่ในระหว่างดำเนินการ'?'#dbeafe':'#fef3c7',
                    color:r.progress==='ดำเนินการแล้ว'?'#15803d':r.progress==='อยู่ในระหว่างดำเนินการ'?'#1d4ed8':'#b45309',
                    padding:'1px 7px',borderRadius:4,fontSize:10,fontWeight:600
                  }}>{r.progress||'—'}</span>
                </span>
                <span style={{width:100,flexShrink:0,textAlign:'center',paddingTop:2}}>
                  <span style={{
                    background:(STATUS_COLOR[r.status]||'#94a3b8')+'22',
                    color:STATUS_COLOR[r.status]||'#94a3b8',
                    padding:'1px 7px',borderRadius:4,fontSize:10,fontWeight:600,
                    border:`1px solid ${(STATUS_COLOR[r.status]||'#94a3b8')}44`
                  }}>{r.status||'—'}</span>
                </span>
                <span style={{width:80,flexShrink:0,color:'var(--text-secondary)',paddingTop:2}}>{r.responsible||'—'}</span>
                <span style={{width:60,flexShrink:0,color:'var(--text-muted)',paddingTop:2,fontSize:11}}>{r.pm||'—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:16}}>
            <button className="page-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>←</button>
            {Array.from({length:Math.min(totalPages,7)},(_,i)=>{
              const p = totalPages<=7 ? i+1 : page<=4 ? i+1 : page+i-3 > totalPages ? totalPages-6+i : page+i-3
              return p>=1&&p<=totalPages ? (
                <button key={p} className={`page-btn${page===p?' active':''}`} onClick={()=>setPage(p)}>{p}</button>
              ) : null
            })}
            <button className="page-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>→</button>
            <span style={{fontSize:11,color:'var(--text-muted)'}}>หน้า {page}/{totalPages}</span>
          </div>
        )}
      </div>
    </div>
  )
}

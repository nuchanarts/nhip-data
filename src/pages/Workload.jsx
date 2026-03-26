import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import * as XLSX from 'xlsx'

const fmt = n => Number(n).toLocaleString()
const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="tt"><div className="tt-label">{label}</div>
    {payload.map((p,i)=><div key={i} className="tt-value" style={{color:p.color||'var(--text-primary)'}}>{p.name?`${p.name}: `:''}{Number(p.value).toLocaleString()}</div>)}
  </div>) : null

const COLORS = ['#2563eb','#10b981','#f59e0b','#7c3aed','#06b6d4','#f97316','#ef4444','#84cc16','#e879f9','#0ea5e9','#a3e635','#fb7185','#34d399','#f472b6','#60a5fa','#4ade80','#facc15','#c084fc','#38bdf8','#fb923c']

// normalize: trim + collapse spaces + lowercase for comparison
const norm = s => (s||'').trim().replace(/\s+/g,' ')

export default function Workload({ data }) {
  const { installList } = data
  const [sortBy, setSortBy] = useState('total')
  const [search, setSearch] = useState('')
  const [showAlias, setShowAlias] = useState(false)
  // aliasMap: { rawName -> canonicalName }
  const [aliasMap, setAliasMap] = useState({})
  const [aliasInput, setAliasInput] = useState({}) // { rawName -> draftValue }

  // raw unique names
  const rawNames = useMemo(() => {
    const s = new Set()
    ;(installList||[]).forEach(r => { const n = norm(r.responsible); if(n) s.add(n) })
    return [...s].sort((a,b)=>a.localeCompare(b,'th'))
  }, [installList])

  // resolve canonical name
  const resolve = name => aliasMap[name] || name

  // build workerMap using resolved names
  const workerMap = useMemo(() => {
    const m = {}
    ;(installList||[]).forEach(r => {
      const raw = norm(r.responsible)
      if (!raw) return
      const name = resolve(raw)
      if (!m[name]) m[name] = { name, total:0, done:0, inProg:0, notYet:0, active:0, parallel:0, inactive:0, rawNames:new Set() }
      m[name].rawNames.add(raw)
      m[name].total++
      if (r.progress === 'ดำเนินการแล้ว')              m[name].done++
      else if (r.progress === 'อยู่ในระหว่างดำเนินการ') m[name].inProg++
      else                                               m[name].notYet++
      if (r.status === 'ใช้งานระบบ')                               m[name].active++
      else if (r.status === 'ใช้งานคู่ขนาน')                       m[name].parallel++
      else if (r.status === 'ไม่ได้ใช้งาน' || r.status === 'เลิกใช้งาน') m[name].inactive++
    })
    return m
  }, [installList, aliasMap])

  const sortFn = {
    total:  (a,b) => b.total - a.total,
    done:   (a,b) => b.done  - a.done,
    inProg: (a,b) => b.inProg- a.inProg,
    name:   (a,b) => a.name.localeCompare(b.name, 'th'),
  }

  const allWorkers = Object.values(workerMap)
    .filter(w => w.name !== 'ไม่ระบุ')
    .sort(sortFn[sortBy] || sortFn.total)

  const filtered = search.trim()
    ? allWorkers.filter(w => w.name.toLowerCase().includes(search.toLowerCase()))
    : allWorkers

  const totalWork   = allWorkers.reduce((a,b)=>a+b.total,  0)
  const totalDone   = allWorkers.reduce((a,b)=>a+b.done,   0)
  const totalInProg = allWorkers.reduce((a,b)=>a+b.inProg, 0)
  const totalWorkers = allWorkers.length

  const barData = filtered.map(w=>({
    name: w.name,
    ดำเนินการแล้ว: w.done,
    กำลังดำเนินการ: w.inProg,
    ยังไม่ติดตั้ง: w.notYet,
  }))

  // detect potential duplicates: names that share a common prefix ≥3 chars
  const potentialDups = useMemo(() => {
    const groups = []
    const used = new Set()
    rawNames.forEach((a, ai) => {
      if (used.has(a)) return
      const similar = rawNames.filter((b, bi) => {
        if (bi <= ai || used.has(b)) return false
        const shorter = a.length < b.length ? a : b
        const longer  = a.length < b.length ? b : a
        // same if one contains the other, or share ≥3 leading chars
        return longer.includes(shorter) || (shorter.length >= 2 && longer.startsWith(shorter.slice(0,3)))
      })
      if (similar.length > 0) {
        groups.push([a, ...similar])
        similar.forEach(s => used.add(s))
        used.add(a)
      }
    })
    return groups
  }, [rawNames])

  const applyAlias = (rawName, canonical) => {
    if (!canonical.trim() || canonical.trim() === rawName) {
      // remove alias
      setAliasMap(m => { const n={...m}; delete n[rawName]; return n })
    } else {
      setAliasMap(m => ({...m, [rawName]: canonical.trim()}))
    }
  }

  return (
    <div className="page">
      <div className="page-title">⏱️ Workload / Time Tracking</div>
      <div className="page-desc">ติดตามภาระงานของทีม — นับจากคอลัมน์ผู้ดำเนินการใน installList</div>

      {/* KPI */}
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginTop:20}}>
        {[
          {color:'c-blue',  icon:'👥', val:fmt(totalWorkers), label:'ผู้ดำเนินการทั้งหมด'},
          {color:'c-green', icon:'🏥', val:fmt(totalWork),    label:'งานทั้งหมด (แห่ง)'},
          {color:'c-green', icon:'✅', val:fmt(totalDone),    label:'ดำเนินการแล้ว',   pct:totalWork?`${((totalDone/totalWork)*100).toFixed(1)}%`:''},
          {color:'c-orange',icon:'⏳', val:fmt(totalInProg),  label:'กำลังดำเนินการ', pct:totalWork?`${((totalInProg/totalWork)*100).toFixed(1)}%`:''},
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            {k.pct && <span className="kpi-pct">{k.pct}</span>}
            <div className="kpi-value">{k.val}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Alias Manager */}
      <div style={{marginTop:16,marginBottom:4}}>
        <button onClick={()=>setShowAlias(v=>!v)}
          style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',borderRadius:8,
            border:'1px solid var(--border)',background:showAlias?'#eff6ff':'var(--bg-secondary)',
            color:showAlias?'#2563eb':'var(--text-secondary)',fontSize:13,cursor:'pointer',fontWeight:600}}>
          🔗 จัดการชื่อซ้ำ / Alias
          {potentialDups.length > 0 && (
            <span style={{background:'#ef4444',color:'#fff',borderRadius:10,padding:'0 7px',fontSize:11,fontWeight:700}}>
              {potentialDups.length} กลุ่มที่น่าสงสัย
            </span>
          )}
          {Object.keys(aliasMap).length > 0 && (
            <span style={{background:'#10b981',color:'#fff',borderRadius:10,padding:'0 7px',fontSize:11,fontWeight:700}}>
              {Object.keys(aliasMap).length} alias
            </span>
          )}
          <span style={{fontSize:12}}>{showAlias?'▾':'▸'}</span>
        </button>
      </div>

      {showAlias && (
        <div className="chart-card" style={{marginBottom:16}}>
          <div style={{fontWeight:700,marginBottom:12,fontSize:14,color:'var(--text-primary)'}}>
            🔗 จัดการชื่อซ้ำ — พิมพ์ชื่อที่ต้องการ Merge ไปหา (ชื่อหลัก)
          </div>

          {/* Suggested duplicates */}
          {potentialDups.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,color:'#f59e0b',fontWeight:600,marginBottom:8}}>
                ⚠️ กลุ่มชื่อที่คล้ายกัน — แนะนำให้ตรวจสอบ
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {potentialDups.map((group,gi)=>(
                  <div key={gi} style={{background:'#fef3c720',border:'1px solid #fde68a',borderRadius:8,padding:'8px 12px',display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
                    <span style={{fontSize:12,color:'#92400e',fontWeight:600}}>กลุ่ม {gi+1}:</span>
                    {group.map(name=>(
                      <span key={name} style={{background:aliasMap[name]?'#dcfce7':'#fff',border:'1px solid #d1d5db',borderRadius:6,padding:'2px 10px',fontSize:12,color:'var(--text-primary)'}}>
                        {name}
                        {aliasMap[name] && <span style={{color:'#10b981',marginLeft:4}}>→ {aliasMap[name]}</span>}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All names alias table */}
          <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:8}}>
            ชื่อทั้งหมด {rawNames.length} ชื่อ — ใส่ชื่อหลัก (canonical) ในช่อง หากชื่อนั้นต้องการ Merge
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:6,maxHeight:320,overflowY:'auto'}}>
            {rawNames.map(name=>(
              <div key={name} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 0'}}>
                <span style={{flex:'0 0 140px',fontSize:13,fontWeight:600,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={name}>
                  {name}
                </span>
                <span style={{color:'var(--text-secondary)',fontSize:12}}>→</span>
                <input
                  value={aliasInput[name] ?? (aliasMap[name]||'')}
                  onChange={e=>setAliasInput(m=>({...m,[name]:e.target.value}))}
                  onBlur={e=>applyAlias(name, e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter') applyAlias(name, e.target.value) }}
                  placeholder="ชื่อหลัก (ว่าง = ไม่ merge)"
                  style={{flex:1,padding:'3px 8px',borderRadius:6,border:`1px solid ${aliasMap[name]?'#10b981':'var(--border)'}`,
                    background:aliasMap[name]?'#f0fdf4':'var(--bg-secondary)',
                    color:'var(--text-primary)',fontSize:12,outline:'none'}}
                />
                {aliasMap[name] && (
                  <button onClick={()=>applyAlias(name,'')}
                    style={{padding:'2px 6px',borderRadius:4,border:'none',background:'#fee2e2',color:'#ef4444',cursor:'pointer',fontSize:11}}>×</button>
                )}
              </div>
            ))}
          </div>
          {Object.keys(aliasMap).length > 0 && (
            <button onClick={()=>{setAliasMap({});setAliasInput({})}}
              style={{marginTop:10,padding:'5px 12px',borderRadius:6,border:'1px solid #fca5a5',background:'#fee2e2',color:'#ef4444',cursor:'pointer',fontSize:12}}>
              ล้าง Alias ทั้งหมด
            </button>
          )}
        </div>
      )}

      {/* Bar chart */}
      <div className="section-label" style={{marginTop:8}}>📊 ภาระงานแยกตามผู้ดำเนินการ ({fmt(filtered.length)} คน)</div>
      <div className="chart-card" style={{marginBottom:22}}>
        <div className="chart-header">
          <div>
            <div className="chart-title">จำนวนงานแยกสถานะต่อคน</div>
            <div className="chart-sub">นับจากคอลัมน์ผู้ดำเนินการ · {fmt(totalWorkers)} คน</div>
          </div>
          <span className="chart-badge">Stacked</span>
        </div>
        <div style={{overflowX:'auto'}}>
          <div style={{minWidth:Math.max(600,barData.length*52)}}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{top:16,right:10,bottom:5,left:0}}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:10}}/>
                <YAxis tick={{fill:'#64748b',fontSize:11}}/>
                <Tooltip content={<TT/>}/>
                <Bar dataKey="ดำเนินการแล้ว"  stackId="a" fill="#10b981">
                  <LabelList dataKey="ดำเนินการแล้ว" position="top" style={{fill:'#065f46',fontSize:10,fontWeight:600}} formatter={v=>v>0?v:''}/>
                </Bar>
                <Bar dataKey="กำลังดำเนินการ" stackId="a" fill="#f59e0b"/>
                <Bar dataKey="ยังไม่ติดตั้ง"   stackId="a" fill="#e2e8f0" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:8,flexWrap:'wrap'}}>
          {[['#10b981','ดำเนินการแล้ว'],['#f59e0b','กำลังดำเนินการ'],['#e2e8f0','ยังไม่ติดตั้ง']].map(([c,l])=>(
            <div key={l} style={{display:'flex',alignItems:'center',gap:4,fontSize:12}}>
              <div style={{width:10,height:10,borderRadius:2,background:c,flexShrink:0}}/>
              <span style={{color:'var(--text-secondary)'}}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="section-label">🏆 สรุปภาระงานรายบุคคล</div>
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative'}}>
          <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)',fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="ค้นหาชื่อผู้ดำเนินการ..."
            style={{paddingLeft:32,paddingRight:12,paddingTop:6,paddingBottom:6,borderRadius:8,
              border:'1px solid var(--border)',background:'var(--bg-secondary)',
              color:'var(--text-primary)',fontSize:13,width:220,outline:'none'}}/>
        </div>
        <div style={{display:'flex',gap:4,background:'var(--bg-secondary)',borderRadius:8,padding:3,border:'1px solid var(--border)'}}>
          {[
            {key:'total', label:'งานรวม'},
            {key:'done',  label:'เสร็จแล้ว'},
            {key:'inProg',label:'กำลังทำ'},
            {key:'name',  label:'ชื่อ'},
          ].map(s=>(
            <button key={s.key} onClick={()=>setSortBy(s.key)}
              style={{padding:'5px 10px',borderRadius:6,border:'none',fontSize:12,cursor:'pointer',
                background:sortBy===s.key?'var(--bg-card)':'transparent',
                boxShadow:sortBy===s.key?'0 1px 3px rgba(0,0,0,0.1)':'none',
                color:sortBy===s.key?'var(--text-primary)':'var(--text-secondary)',
                fontWeight:sortBy===s.key?700:400}}>
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            const rows = filtered.map((w,i) => ({
              'ลำดับ': i+1,
              'ผู้ดำเนินการ': w.name,
              'ชื่ออื่น (Alias)': [...(w.rawNames||[])].filter(n=>n!==w.name).join(', '),
              'งานทั้งหมด': w.total,
              'ดำเนินการแล้ว': w.done,
              'กำลังดำเนินการ': w.inProg,
              'ยังไม่ติดตั้ง': w.notYet,
              'ใช้งานระบบ': w.active,
              'ใช้งานคู่ขนาน': w.parallel,
              'ไม่ได้ใช้งาน': w.inactive,
              '% เสร็จ': w.total>0 ? +((w.done/w.total)*100).toFixed(1) : 0,
            }))
            const ws = XLSX.utils.json_to_sheet(rows)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Workload')
            XLSX.writeFile(wb, `workload_${new Date().toISOString().slice(0,10)}.xlsx`)
          }}
          style={{padding:'6px 16px',borderRadius:7,border:'1px solid #2563eb',background:'#dbeafe',color:'#1d4ed8',
            fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}>
          📥 Export Excel ({fmt(filtered.length)} คน)
        </button>
        <span style={{fontSize:12,color:'var(--text-secondary)',marginLeft:'auto'}}>{fmt(filtered.length)} คน</span>
      </div>

      <div className="chart-card" style={{padding:0,overflow:'hidden'}}>
        <div className="lb-header">
          <span style={{width:32}}>#</span>
          <span style={{flex:1}}>ผู้ดำเนินการ</span>
          <span style={{width:70,textAlign:'right'}}>รวมงาน</span>
          <span style={{width:80,textAlign:'right'}}>เสร็จแล้ว</span>
          <span style={{width:80,textAlign:'right'}}>กำลังทำ</span>
          <span style={{width:80,textAlign:'right'}}>ยังไม่ทำ</span>
          <span style={{width:80,textAlign:'right'}}>ใช้งานระบบ</span>
          <span style={{width:70,textAlign:'right'}}>คู่ขนาน</span>
          <span style={{width:70,textAlign:'right'}}>ไม่ใช้งาน</span>
          <span style={{width:150}}>ความคืบหน้า</span>
        </div>
        {filtered.map((w,i)=>{
          const donePct   = w.total>0 ? ((w.done/w.total)*100).toFixed(0)   : 0
          const inProgPct = w.total>0 ? ((w.inProg/w.total)*100)             : 0
          const aliases   = [...(w.rawNames||[])].filter(n=>n!==w.name)
          return (
            <div key={i} className={`lb-row${i<3?' lb-top':''}`}>
              <span className="lb-rank" style={{width:32}}>{i<3?['🥇','🥈','🥉'][i]:i+1}</span>
              <span style={{flex:1,minWidth:0}}>
                <span style={{fontWeight:600,color:'var(--text-primary)'}}>{w.name}</span>
                {aliases.length>0 && (
                  <span style={{fontSize:10,color:'var(--text-secondary)',marginLeft:6}}>
                    ({aliases.join(', ')})
                  </span>
                )}
              </span>
              <span style={{width:70,textAlign:'right',fontWeight:700}}>{fmt(w.total)}</span>
              <span style={{width:80,textAlign:'right',color:'#10b981',fontWeight:600}}>{fmt(w.done)}</span>
              <span style={{width:80,textAlign:'right',color:'#f59e0b'}}>{fmt(w.inProg)}</span>
              <span style={{width:80,textAlign:'right',color:'#ef4444'}}>{fmt(w.notYet)}</span>
              <span style={{width:80,textAlign:'right',color:'#10b981'}}>{fmt(w.active)}</span>
              <span style={{width:70,textAlign:'right',color:'#06b6d4'}}>{fmt(w.parallel)}</span>
              <span style={{width:70,textAlign:'right',color:'#94a3b8'}}>{fmt(w.inactive)}</span>
              <div style={{width:150,display:'flex',alignItems:'center',gap:6}}>
                <div style={{flex:1,height:8,background:'var(--border)',borderRadius:6,overflow:'hidden',display:'flex'}}>
                  <div style={{width:`${donePct}%`,height:'100%',background:'#10b981'}}/>
                  <div style={{width:`${inProgPct}%`,height:'100%',background:'#f59e0b'}}/>
                </div>
                <span style={{fontSize:11,color:'var(--text-secondary)',width:32,textAlign:'right'}}>{donePct}%</span>
              </div>
            </div>
          )
        })}
        <div className="lb-row" style={{borderTop:'2px solid var(--border)',marginTop:4,paddingTop:8,fontWeight:700}}>
          <span style={{width:32}}></span>
          <span style={{flex:1,color:'var(--text-primary)'}}>รวมทั้งหมด</span>
          <span style={{width:70,textAlign:'right'}}>{fmt(totalWork)}</span>
          <span style={{width:80,textAlign:'right',color:'#10b981'}}>{fmt(totalDone)}</span>
          <span style={{width:80,textAlign:'right',color:'#f59e0b'}}>{fmt(totalInProg)}</span>
          <span style={{width:80,textAlign:'right',color:'#ef4444'}}>{fmt(allWorkers.reduce((a,b)=>a+b.notYet,0))}</span>
          <span style={{width:80,textAlign:'right',color:'#10b981'}}>{fmt(allWorkers.reduce((a,b)=>a+b.active,0))}</span>
          <span style={{width:70,textAlign:'right',color:'#06b6d4'}}>{fmt(allWorkers.reduce((a,b)=>a+b.parallel,0))}</span>
          <span style={{width:70,textAlign:'right',color:'#94a3b8'}}>{fmt(allWorkers.reduce((a,b)=>a+b.inactive,0))}</span>
          <div style={{width:150,display:'flex',alignItems:'center',gap:6}}>
            <div style={{flex:1,height:8,background:'var(--border)',borderRadius:6,overflow:'hidden'}}>
              <div style={{width:`${totalWork?((totalDone/totalWork)*100):0}%`,height:'100%',background:'linear-gradient(90deg,#2563eb,#60a5fa)',borderRadius:6}}/>
            </div>
            <span style={{fontSize:11,color:'var(--text-secondary)',width:32,textAlign:'right'}}>
              {totalWork?((totalDone/totalWork)*100).toFixed(0):0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import statement13 from '../data/statement13.json'
import ndplot3 from '../data/ndplot3.json'

const PROGRESS_COLOR = {
  'ดำเนินการแล้ว':          '#10b981',
  'อยู่ในระหว่างดำเนินการ': '#f59e0b',
  'ยังไม่ติดตั้ง':          '#ef4444',
}
const STATUS_COLOR = {
  'ใช้งานระบบ':   '#10b981',
  'ใช้งานคู่ขนาน':'#06b6d4',
  'รอติดตั้ง':    '#f59e0b',
  'ไม่ได้ใช้งาน': '#ef4444',
  'เลิกใช้งาน':   '#94a3b8',
}
const HIS_COLOR = {
  'HOSxP':  '#2563eb',
  'JHCIS':  '#7c3aed',
  'MY PCU': '#06b6d4',
}
const SUMMARY_COLOR = {
  'ทำรายงานติดตั้งแล้ว':       '#10b981',
  'ยังไม่ทำรายงานติดตั้ง':     '#ef4444',
  'รอติดตั้ง':                  '#f59e0b',
  'ส่งกลับแก้ไขรายงานติดตั้ง': '#7c3aed',
}

const STMT13_SET = new Set(statement13.map(x => String(x.hcode)))
const mustSend13 = hospcode => STMT13_SET.has(String(hospcode))

const NDPLOT3_SET = new Set(ndplot3.map(x => String(x.hcode)))
const inNDPLOT3 = hospcode => NDPLOT3_SET.has(String(hospcode))

const PAGE_SIZE = 50

export default function HospList({ data }) {
  const list = data.installList || []

  const [search, setSearch]         = useState('')
  const [filterProgress, setFP]     = useState('')
  const [filterStatus, setFS]       = useState('')
  const [filterSummary, setFSumm]   = useState('')
  const [filterHIS, setFHIS]        = useState('')
  const [filterProvince, setFProv]  = useState('')
  const [filterRegion, setFReg]     = useState('')
  const [filter13, setF13]          = useState('') // '', 'yes', 'no'
  const [filterND, setFND]          = useState('') // '', 'yes', 'no'
  const [page, setPage]             = useState(1)

  // unique options
  const provinces = useMemo(() => [...new Set(list.map(r => r.province).filter(Boolean))].sort(), [list])
  const regions   = useMemo(() => [...new Set(list.map(r => r.region).filter(Boolean))].map(String).sort((a,b)=>+a-+b), [list])
  const progOpts  = useMemo(() => [...new Set(list.map(r => r.progress).filter(Boolean))].sort(), [list])
  const statOpts  = useMemo(() => [...new Set(list.map(r => r.status).filter(Boolean))].sort(), [list])
  const summOpts  = useMemo(() => [...new Set(list.map(r => r.summary).filter(Boolean))].sort(), [list])
  const hisOpts   = useMemo(() => [...new Set(list.map(r => r.his).filter(Boolean))].sort(), [list])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter(r => {
      if (q && !r.name?.toLowerCase().includes(q) && !r.hospcode?.includes(q) && !r.province?.toLowerCase().includes(q) && !r.amphoe?.toLowerCase().includes(q)) return false
      if (filterProgress && r.progress !== filterProgress) return false
      if (filterStatus   && r.status   !== filterStatus)   return false
      if (filterSummary  && r.summary  !== filterSummary)  return false
      if (filterHIS      && r.his      !== filterHIS)      return false
      if (filterProvince && r.province !== filterProvince) return false
      if (filterRegion   && String(r.region) !== filterRegion) return false
      if (filter13 === 'yes' && !mustSend13(r.hospcode)) return false
      if (filter13 === 'no'  &&  mustSend13(r.hospcode)) return false
      if (filterND === 'yes' && !inNDPLOT3(r.hospcode)) return false
      if (filterND === 'no'  &&  inNDPLOT3(r.hospcode)) return false
      return true
    })
  }, [list, search, filterProgress, filterStatus, filterSummary, filterHIS, filterProvince, filterRegion, filter13, filterND])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetPage = () => setPage(1)

  const badge = (text, colorMap, fallback = '#64748b') => {
    const color = colorMap[text] || fallback
    return (
      <span style={{
        background: color + '22', color, border: `1px solid ${color}55`,
        borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap'
      }}>{text || '-'}</span>
    )
  }

  const stmt13Count = useMemo(() => list.filter(r => mustSend13(r.hospcode)).length, [list])
  const ndplot3Count = useMemo(() => list.filter(r => inNDPLOT3(r.hospcode)).length, [list])

  return (
    <div className="page">
      <div className="section-label">รายชื่อ รพ.สต. ทั้งหมด</div>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'ทั้งหมด', val: list.length, color: '#2563eb' },
          { label: 'กรองแล้ว', val: filtered.length, color: '#10b981' },
          { label: 'ต้องส่ง 13 แฟ้ม', val: stmt13Count, color: '#2563eb' },
          { label: 'อยู่ใน NDPLOT3', val: ndplot3Count, color: '#7c3aed' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); resetPage() }}
          placeholder="ค้นหาชื่อ / รหัส / จังหวัด / อำเภอ..."
          style={{ flex: 1, minWidth: 220, padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}
        />
        <select value={filterRegion} onChange={e => { setFReg(e.target.value); resetPage() }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="">ทุกเขต</option>
          {regions.map(r => <option key={r} value={r}>เขต {r}</option>)}
        </select>
        <select value={filterProvince} onChange={e => { setFProv(e.target.value); resetPage() }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="">ทุกจังหวัด</option>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterProgress} onChange={e => { setFP(e.target.value); resetPage() }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="">ทุกสถานะ Progress</option>
          {progOpts.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFS(e.target.value); resetPage() }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="">ทุกสถานะงาน</option>
          {statOpts.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterSummary} onChange={e => { setFSumm(e.target.value); resetPage() }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="">ทุกสรุปรายงาน</option>
          {summOpts.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterHIS} onChange={e => { setFHIS(e.target.value); resetPage() }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="">ทุกระบบ HIS เดิม</option>
          {hisOpts.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <select value={filter13} onChange={e => { setF13(e.target.value); resetPage() }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="">13 แฟ้ม (ทั้งหมด)</option>
          <option value="yes">เฉพาะที่ต้องส่ง</option>
          <option value="no">เฉพาะที่ไม่ต้องส่ง</option>
        </select>
        <select value={filterND} onChange={e => { setFND(e.target.value); resetPage() }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="">NDPLOT3 (ทั้งหมด)</option>
          <option value="yes">เฉพาะที่ตรงกัน</option>
          <option value="no">เฉพาะที่ไม่ตรง</option>
        </select>
        {(search || filterProgress || filterStatus || filterSummary || filterHIS || filterProvince || filterRegion || filter13 || filterND) && (
          <button onClick={() => { setSearch(''); setFP(''); setFS(''); setFSumm(''); setFHIS(''); setFProv(''); setFReg(''); setF13(''); setFND(''); resetPage() }}
            style={{ padding: '7px 14px', border: '1px solid #ef4444', borderRadius: 8, fontSize: 13, background: '#fee2e2', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
              {['#','รหัส','ชื่อ รพ.สต.','เขต','จังหวัด','อำเภอ','วันที่ติดตั้ง','Progress','สถานะงาน','สรุปรายงาน','13 แฟ้ม','NDPLOT3','ระบบ HIS เดิม','ผู้ติดตั้ง'].map((h,i) => (
                <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={14} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบข้อมูล</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>{r.hospcode}</td>
                <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--text-primary)', minWidth: 180 }}>{r.name}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{r.region || '-'}</td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.province}</td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.amphoe}</td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontSize: 12 }}>{r.install_date || '-'}</td>
                <td style={{ padding: '8px 12px' }}>{badge(r.progress, PROGRESS_COLOR)}</td>
                <td style={{ padding: '8px 12px' }}>{badge(r.status, STATUS_COLOR)}</td>
                <td style={{ padding: '8px 12px' }}>{badge(r.summary, SUMMARY_COLOR)}</td>
                <td style={{ padding: '8px 12px' }}>
                  {mustSend13(r.hospcode)
                    ? <span style={{ background: '#2563eb22', color: '#2563eb', border: '1px solid #2563eb55', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>📁 13 แฟ้ม</span>
                    : <span style={{ color: 'var(--text-muted)' }}>–</span>}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {inNDPLOT3(r.hospcode)
                    ? <span style={{ background: '#7c3aed22', color: '#7c3aed', border: '1px solid #7c3aed55', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>✅ ตรงกัน</span>
                    : <span style={{ color: 'var(--text-muted)' }}>–</span>}
                </td>
                <td style={{ padding: '8px 12px' }}>{badge(r.his, HIS_COLOR)}</td>
                <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{r.responsible || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: '#fff', fontSize: 13 }}>
            ← ก่อนหน้า
          </button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
            const p = totalPages <= 10 ? i + 1 : page <= 5 ? i + 1 : page >= totalPages - 4 ? totalPages - 9 + i : page - 4 + i
            return (
              <button key={p} onClick={() => setPage(p)}
                style={{ padding: '6px 12px', border: `1px solid ${p === page ? '#2563eb' : 'var(--border)'}`,
                  borderRadius: 8, cursor: 'pointer', background: p === page ? '#2563eb' : '#fff',
                  color: p === page ? '#fff' : 'var(--text-primary)', fontWeight: p === page ? 700 : 400, fontSize: 13 }}>
                {p}
              </button>
            )
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: '#fff', fontSize: 13 }}>
            ถัดไป →
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>หน้า {page}/{totalPages} ({filtered.length.toLocaleString()} รายการ)</span>
        </div>
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import statement13ofc from '../data/statement13ofc.json'

const VENDOR_COLOR = {
  'Hosxp':  '#2563eb',
  'JHCIS':  '#7c3aed',
  'MY PCU': '#06b6d4',
}

const PAGE_SIZE = 50

const inputStyle = {
  padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 13, background: '#fff', cursor: 'pointer',
}

export default function StatementOFC() {
  const list = statement13ofc

  const [search, setSearch]        = useState('')
  const [filterRegion, setFReg]    = useState('')
  const [filterProvince, setFProv] = useState('')
  const [filterAmphoe, setFAmp]    = useState('')
  const [filterTambon, setFTam]    = useState('')
  const [filterVendor, setFVen]    = useState('')
  const [page, setPage]            = useState(1)

  const uniqSort = arr => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'))

  // Cascading options: each level is narrowed by the selections above it.
  const regions = useMemo(
    () => [...new Set(list.map(r => r.region).filter(Boolean))]
      .sort((a, b) => (parseInt(a.match(/\d+/)?.[0] ?? '0', 10)) - (parseInt(b.match(/\d+/)?.[0] ?? '0', 10))),
    [list],
  )
  const provinces = useMemo(
    () => uniqSort(list.filter(r => !filterRegion || r.region === filterRegion).map(r => r.province)),
    [list, filterRegion],
  )
  const amphoes = useMemo(
    () => uniqSort(list
      .filter(r => (!filterRegion || r.region === filterRegion) && (!filterProvince || r.province === filterProvince))
      .map(r => r.amphoe)),
    [list, filterRegion, filterProvince],
  )
  const tambons = useMemo(
    () => uniqSort(list
      .filter(r => (!filterRegion || r.region === filterRegion) && (!filterProvince || r.province === filterProvince) && (!filterAmphoe || r.amphoe === filterAmphoe))
      .map(r => r.tambon)),
    [list, filterRegion, filterProvince, filterAmphoe],
  )
  const vendors = useMemo(() => uniqSort(list.map(r => r.vendor)), [list])

  const resetPage = () => setPage(1)

  // When a parent filter changes, clear child filters that no longer apply.
  const onRegion = v => { setFReg(v); setFProv(''); setFAmp(''); setFTam(''); resetPage() }
  const onProvince = v => { setFProv(v); setFAmp(''); setFTam(''); resetPage() }
  const onAmphoe = v => { setFAmp(v); setFTam(''); resetPage() }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter(r => {
      if (q && !r.hname?.toLowerCase().includes(q) && !r.hcode?.toLowerCase().includes(q)
          && !r.province?.toLowerCase().includes(q) && !r.amphoe?.toLowerCase().includes(q)
          && !r.tambon?.toLowerCase().includes(q)) return false
      if (filterRegion   && r.region   !== filterRegion)   return false
      if (filterProvince && r.province !== filterProvince) return false
      if (filterAmphoe   && r.amphoe   !== filterAmphoe)   return false
      if (filterTambon   && r.tambon   !== filterTambon)   return false
      if (filterVendor   && r.vendor   !== filterVendor)   return false
      return true
    })
  }, [list, search, filterRegion, filterProvince, filterAmphoe, filterTambon, filterVendor])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const hasFilter = search || filterRegion || filterProvince || filterAmphoe || filterTambon || filterVendor
  const clearAll = () => { setSearch(''); setFReg(''); setFProv(''); setFAmp(''); setFTam(''); setFVen(''); resetPage() }

  const badge = (text, colorMap, fallback = '#64748b') => {
    const color = colorMap[text] || fallback
    return (
      <span style={{
        background: color + '22', color, border: `1px solid ${color}55`,
        borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      }}>{text || '-'}</span>
    )
  }

  return (
    <div className="page">
      <div className="section-label">ทะเบียนหน่วยบริการที่ต้องส่ง 13 แฟ้ม OFC</div>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'ทั้งหมด', val: list.length, color: '#2563eb' },
          { label: 'กรองแล้ว', val: filtered.length, color: '#10b981' },
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
          placeholder="ค้นหารหัส / ชื่อสถานพยาบาล / จังหวัด / อำเภอ / ตำบล..."
          style={{ flex: 1, minWidth: 220, padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}
        />
        <select value={filterRegion} onChange={e => onRegion(e.target.value)} style={inputStyle}>
          <option value="">ทุกเขต</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filterProvince} onChange={e => onProvince(e.target.value)} style={inputStyle}>
          <option value="">ทุกจังหวัด</option>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterAmphoe} onChange={e => onAmphoe(e.target.value)} style={inputStyle}>
          <option value="">ทุกอำเภอ</option>
          {amphoes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterTambon} onChange={e => { setFTam(e.target.value); resetPage() }} style={inputStyle}>
          <option value="">ทุกตำบล</option>
          {tambons.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {vendors.length > 1 && (
          <select value={filterVendor} onChange={e => { setFVen(e.target.value); resetPage() }} style={inputStyle}>
            <option value="">ทุกโปรแกรม</option>
            {vendors.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        )}
        {hasFilter && (
          <button onClick={clearAll}
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
              {['#', 'รหัส', 'ชื่อสถานพยาบาล', 'เขต', 'จังหวัด', 'อำเภอ', 'ตำบล', 'โปรแกรม'].map((h, i) => (
                <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบข้อมูล</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.hcode + '-' + i} style={{ borderBottom: '1px solid #f1f5f9' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>{r.hcode}</td>
                <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--text-primary)', minWidth: 180 }}>{r.hname}</td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.region || '-'}</td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.province || '-'}</td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.amphoe || '-'}</td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.tambon || '-'}</td>
                <td style={{ padding: '8px 12px' }}>{badge(r.vendor, VENDOR_COLOR)}</td>
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

import { useState, useMemo } from 'react'
import pilotData from '../data/pilotPCU.json'

const AFF_COLOR = {
  'กระทรวงสาธารณสุข':          '#2563eb',
  'กระทรวงมหาดไทย (ท้องถิ่น)': '#7c3aed',
  'กระทรวงมหาดไทย (อบจ.)':     '#0891b2',
}

export default function PilotPCU() {
  const list = pilotData

  const [search, setSearch]        = useState('')
  const [filterRegion, setFReg]    = useState('')
  const [filterProvince, setFProv] = useState('')
  const [filterAff, setFAff]       = useState('')

  const regions   = useMemo(() => [...new Set(list.map(r => r.region).filter(Boolean))].sort((a, b) => a - b), [list])
  const provinces = useMemo(() => [...new Set(list.map(r => r.province).filter(Boolean))].sort(), [list])
  const affs      = useMemo(() => [...new Set(list.map(r => r.affiliation).filter(Boolean))].sort(), [list])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter(r => {
      if (q) {
        const hay = `${r.province} ${r.amphoe} ${r.maehai} ${r.rpsat} ${r.note}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filterRegion   && String(r.region) !== filterRegion) return false
      if (filterProvince && r.province !== filterProvince)     return false
      if (filterAff      && r.affiliation !== filterAff)       return false
      return true
    })
  }, [list, search, filterRegion, filterProvince, filterAff])

  const affCount = aff => list.filter(r => r.affiliation === aff).length

  const badge = (text, color, fallback = '#64748b') => {
    const c = color || fallback
    return (
      <span style={{
        background: c + '22', color: c, border: `1px solid ${c}55`,
        borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap'
      }}>{text || '-'}</span>
    )
  }

  const hasFilter = search || filterRegion || filterProvince || filterAff

  return (
    <div className="page">
      <div className="section-label">รพ.สต. นำร่องปฐมภูมิ (1 อำเภอ 1 เครือข่าย)</div>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'ทั้งหมด', val: list.length, color: '#2563eb' },
          { label: 'กรองแล้ว', val: filtered.length, color: '#10b981' },
          { label: 'สังกัด สธ.', val: affCount('กระทรวงสาธารณสุข'), color: '#2563eb' },
          { label: 'สังกัด มท.', val: list.filter(r => r.affiliation.includes('มหาดไทย')).length, color: '#7c3aed' },
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
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาจังหวัด / อำเภอ / รพ.แม่ข่าย / รพ.สต...."
          style={{ flex: 1, minWidth: 220, padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}
        />
        <select value={filterRegion} onChange={e => setFReg(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="">ทุกเขต</option>
          {regions.map(r => <option key={r} value={r}>เขต {r}</option>)}
        </select>
        <select value={filterProvince} onChange={e => setFProv(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="">ทุกจังหวัด</option>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterAff} onChange={e => setFAff(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="">ทุกสังกัด</option>
          {affs.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {hasFilter && (
          <button onClick={() => { setSearch(''); setFReg(''); setFProv(''); setFAff('') }}
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
              {['#', 'เขต', 'จังหวัด', 'อำเภอ', 'หน่วยบริการ (รพ.แม่ข่าย)', 'หน่วยบริการ (รพ.สต.)', 'สังกัด', 'หมายเหตุ'].map((h, i) => (
                <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบข้อมูล</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <span style={{ background: '#2563eb15', color: '#2563eb', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{r.region}</span>
                </td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontWeight: 500 }}>{r.province}</td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.amphoe}</td>
                <td style={{ padding: '8px 12px', minWidth: 180 }}>{r.maehai || '-'}</td>
                <td style={{ padding: '8px 12px', minWidth: 240, fontWeight: 500, color: 'var(--text-primary)' }}>{r.rpsat || '-'}</td>
                <td style={{ padding: '8px 12px' }}>{badge(r.affiliation, AFF_COLOR[r.affiliation])}</td>
                <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)', minWidth: 140 }}>{r.note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        แสดง {filtered.length.toLocaleString()} รายการ จากทั้งหมด {list.length.toLocaleString()} รายการ
      </div>
    </div>
  )
}

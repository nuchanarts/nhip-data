import { useState, useEffect, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'

// Google Sheet ต้นทาง: รพ.สต. ที่มีการคีย์ข้อมูลย้อนหลัง (มี "Y" รายวัน)
// คาดว่าเป็นกลุ่มที่ใช้งานระบบคู่ขนาน (คีย์ทั้งระบบเดิม + แพลตฟอร์มกลาง)
const SHEET_ID = '1y69D56RKv2WZN7OjEWqhg2TUPJnuYb3k'
const REFRESH_MS = 10 * 60 * 1000

function exportUrl() {
  const base = import.meta.env.DEV ? '/gsheet' : 'https://docs.google.com'
  return `${base}/spreadsheets/d/${SHEET_ID}/export?format=xlsx`
}

const fmt = n => Number(n || 0).toLocaleString()
const PAGE_SIZE = 50

export default function RetroKey() {
  const [rows, setRows] = useState([])      // [{hospcode,name,province,amphoe,tambon,region,yDays:[idx],yCount,total}]
  const [dates, setDates] = useState([])    // ['01 พ.ค. 69', ...]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)

  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('')
  const [province, setProvince] = useState('')
  const [minY, setMinY] = useState('')        // คีย์ย้อนหลัง ≥ N ครั้ง
  const [page, setPage] = useState(1)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    fetch(exportUrl())
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer() })
      .then(buf => {
        const wb = XLSX.read(buf, { type: 'array' })
        const all = []
        let dateCols = []
        wb.SheetNames.forEach(sn => {
          const m = sn.match(/(\d+)/)
          const reg = m ? Number(m[1]) : null
          const grid = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: null })
          if (!grid.length) return
          const header = (grid[0] || []).map(h => String(h == null ? '' : h).trim())
          // คอลัมน์ 0-4 = รหัส/ชื่อ/จังหวัด/อำเภอ/ตำบล, ที่เหลือ = วันที่
          const dCols = header.slice(5)
          if (dCols.length > dateCols.length) dateCols = dCols
          for (let i = 1; i < grid.length; i++) {
            const r = grid[i]
            if (!r || !r[0]) continue
            const yDays = []
            for (let c = 5; c < header.length; c++) {
              if (String(r[c] == null ? '' : r[c]).trim().toUpperCase() === 'Y') yDays.push(c - 5)
            }
            if (yDays.length === 0) continue   // เฉพาะ รพ.สต. ที่มีการคีย์ย้อนหลัง
            all.push({
              hospcode: String(r[0]).trim(),
              name: String(r[1] || '').trim(),
              province: String(r[2] || '').trim(),
              amphoe: String(r[3] || '').trim(),
              tambon: String(r[4] || '').trim(),
              region: reg,
              yDays,
              yCount: yDays.length,
              total: header.length - 5,
            })
          }
        })
        all.sort((a, b) => b.yCount - a.yCount)
        setRows(all)
        setDates(dateCols)
        setUpdatedAt(new Date())
        setLoading(false)
      })
      .catch(e => { setError(e.message || 'โหลดข้อมูลไม่สำเร็จ'); setLoading(false) })
  }, [])

  useEffect(() => {
    const id = setTimeout(load, 0)            // เลี่ยง setState ตรง ๆ ใน effect body
    const t = setInterval(load, REFRESH_MS)
    return () => { clearTimeout(id); clearInterval(t) }
  }, [load])

  const regions = useMemo(() => [...new Set(rows.map(r => r.region).filter(Boolean))].sort((a, b) => a - b), [rows])
  const provinces = useMemo(() => [...new Set(rows.map(r => r.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th')), [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (q && !r.name.toLowerCase().includes(q) && !r.hospcode.includes(q) && !r.province.toLowerCase().includes(q)) return false
      if (region && String(r.region) !== region) return false
      if (province && r.province !== province) return false
      if (minY && r.yCount < Number(minY)) return false
      return true
    })
  }, [rows, search, region, province, minY])

  const byRegion = useMemo(() => {
    const m = {}
    rows.forEach(r => {
      const k = r.region || 0
      if (!m[k]) m[k] = { region: r.region, count: 0, y: 0 }
      m[k].count++
      m[k].y += r.yCount
    })
    return Object.values(m).sort((a, b) => (a.region || 0) - (b.region || 0))
  }, [rows])

  const totalY = useMemo(() => rows.reduce((a, r) => a + r.yCount, 0), [rows])
  const avgDays = rows.length ? (totalY / rows.length) : 0

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage = Math.min(page, totalPages)        // clamp อัตโนมัติเมื่อกรองแล้วหน้าน้อยลง
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)

  const kpi = [
    { icon: '🏥', label: 'รพ.สต. ที่คีย์ย้อนหลัง', val: fmt(rows.length), color: '#2563eb' },
    { icon: '🔁', label: 'รวมจำนวนครั้งคีย์ย้อนหลัง', val: fmt(totalY), color: '#7c3aed' },
    { icon: '📅', label: 'เฉลี่ยวัน/แห่ง', val: avgDays.toFixed(1), color: '#0ea5e9' },
    { icon: '🗺️', label: 'เขตที่พบ', val: regions.length + ' เขต', color: '#10b981' },
  ]

  return (
    <div className="page">
      <div className="section-label">คีย์ย้อนหลัง / ใช้งานคู่ขนาน</div>
      <div className="page-desc" style={{ marginBottom: 16 }}>
        รพ.สต. ที่มีการคีย์ข้อมูลย้อนหลัง (มี &quot;Y&quot; รายวัน) — บ่งชี้ว่าน่าจะใช้งานระบบคู่ขนาน (ระบบเดิม + แพลตฟอร์มกลาง)
        {updatedAt && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· อัปเดต {updatedAt.toLocaleTimeString('th-TH')}</span>}
        <button onClick={load} disabled={loading}
          style={{ marginLeft: 10, padding: '3px 12px', borderRadius: 6, border: '1px solid #2563eb', background: loading ? '#e2e8f0' : '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: loading ? 'wait' : 'pointer' }}>
          {loading ? 'กำลังโหลด…' : '↻ รีเฟรช'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
          โหลดข้อมูลไม่สำเร็จ: {error} — ตรวจสอบสิทธิ์การเข้าถึง Google Sheet
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>กำลังโหลดข้อมูล…</div>
      ) : (
        <>
          {/* KPI */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {kpi.map((k, i) => (
              <div key={i} style={{ flex: '1 1 180px', background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.val}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* By region */}
          <div className="section-label" style={{ marginTop: 8 }}>จำนวนแยกตามเขตสุขภาพ</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            {byRegion.map(b => (
              <div key={b.region}
                onClick={() => { setRegion(String(b.region) === region ? '' : String(b.region)); setPage(1) }}
                style={{
                  flex: '0 0 calc(16.66% - 9px)', minWidth: 130, cursor: 'pointer',
                  background: String(b.region) === region ? '#eff6ff' : '#fff',
                  border: String(b.region) === region ? '2px solid #2563eb' : '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px',
                }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>เขต {b.region}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>{fmt(b.count)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>รพ.สต. · {fmt(b.y)} ครั้ง</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="ค้นหาชื่อ / รหัส / จังหวัด..."
              style={{ flex: 1, minWidth: 220, padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff' }} />
            <select value={region} onChange={e => { setRegion(e.target.value); setPage(1) }}
              style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
              <option value="">ทุกเขต</option>
              {regions.map(r => <option key={r} value={r}>เขต {r}</option>)}
            </select>
            <select value={province} onChange={e => { setProvince(e.target.value); setPage(1) }}
              style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
              <option value="">ทุกจังหวัด</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>คีย์ย้อนหลัง ≥</span>
              <input type="number" min="0" value={minY}
                onChange={e => { setMinY(e.target.value); setPage(1) }}
                placeholder="เช่น 5"
                style={{ width: 72, textAlign: 'center', padding: '7px 8px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ครั้ง</span>
            </div>
            {(search || region || province || minY) && (
              <button onClick={() => { setSearch(''); setRegion(''); setProvince(''); setMinY(''); setPage(1) }}
                style={{ padding: '7px 14px', border: '1px solid #ef4444', borderRadius: 8, fontSize: 13, background: '#fee2e2', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
                ล้างตัวกรอง
              </button>
            )}
            <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              {fmt(filtered.length)} / {fmt(rows.length)} แห่ง
            </span>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                  {['#', 'รหัส', 'ชื่อ รพ.สต.', 'เขต', 'จังหวัด', 'อำเภอ', 'ตำบล', 'จำนวนวันคีย์ย้อนหลัง', 'รายวัน (Y)'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบข้อมูล</td></tr>
                ) : pageRows.map((r, i) => (
                  <tr key={r.hospcode + i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11 }}>{(curPage - 1) * PAGE_SIZE + i + 1}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>{r.hospcode}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--text-primary)', minWidth: 200 }}>{r.name}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{r.region || '-'}</td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.province}</td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.amphoe}</td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.tambon}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 6, padding: '2px 10px', fontWeight: 700, fontSize: 12 }}>
                        {r.yCount} / {r.total} วัน
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxWidth: 360 }}>
                        {dates.map((d, di) => (
                          <span key={di} title={d}
                            style={{
                              width: 14, height: 14, borderRadius: 3, fontSize: 8,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              background: r.yDays.includes(di) ? '#22c55e' : '#e2e8f0',
                              color: r.yDays.includes(di) ? '#fff' : 'transparent',
                            }}>Y</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setPage(Math.max(1, curPage - 1))} disabled={curPage === 1}
                style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: '#fff', fontSize: 13 }}>← ก่อนหน้า</button>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>หน้า {curPage} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, curPage + 1))} disabled={curPage === totalPages}
                style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: '#fff', fontSize: 13 }}>ถัดไป →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

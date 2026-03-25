import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart, Legend
} from 'recharts'

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#7c3aed', '#06b6d4', '#f97316', '#84cc16']
const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#7c3aed']
const JOB_COLORS = { 'รอติดตั้ง':'#f59e0b', 'ใช้งานระบบ':'#10b981', 'ใช้งานคู่ขนาน':'#06b6d4', 'ไม่ได้ใช้งาน':'#ef4444', 'เลิกใช้งาน':'#6b7280' }
const PROG_COLORS = { 'ดำเนินการแล้ว':'#10b981', 'อยู่ในระหว่างดำเนินการ':'#f59e0b', 'ยังไม่ติดตั้ง':'#ef4444' }

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="tt">
        <div className="tt-label">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="tt-value" style={{ color: p.color || '#e8eaf0' }}>
            {p.name ? `${p.name}: ` : ''}{p.value?.toLocaleString()}
          </div>
        ))}
      </div>
    )
  }
  return null
}

function fmt(n) { return Number(n).toLocaleString() }

export default function Dashboard({ data }) {
  const { job_status, progress, regions, monthly, standby_type, standby_status, total } = data

  const totalJS = Object.values(job_status).reduce((a, b) => a + b, 0)
  const installed = (job_status['ใช้งานระบบ'] || 0) + (job_status['ใช้งานคู่ขนาน'] || 0)
  const waiting = job_status['รอติดตั้ง'] || 0
  const inactive = (job_status['ไม่ได้ใช้งาน'] || 0) + (job_status['เลิกใช้งาน'] || 0)
  const inProgress = progress['อยู่ในระหว่างดำเนินการ'] || 0
  const done = progress['ดำเนินการแล้ว'] || 0

  const installPct = ((installed / totalJS) * 100).toFixed(1)
  const waitPct = ((waiting / totalJS) * 100).toFixed(1)
  const donePct = ((done / totalJS) * 100).toFixed(1)

  // Chart data
  const jobPieData = Object.entries(job_status)
    .filter(([k]) => k !== 'None')
    .map(([name, value]) => ({ name, value }))

  const regionData = Object.entries(regions).map(([k, v]) => ({
    name: `เขต ${k}`, value: v
  }))

  const monthlyData = Object.entries(monthly).map(([k, v]) => {
    const [yr, mo] = k.split('-')
    const thaiMonths = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    return { name: `${thaiMonths[parseInt(mo)]} ${parseInt(yr) + 543}`, value: v, key: k }
  })

  const standbyTypeData = Object.entries(standby_type)
    .filter(([k]) => k !== 'None')
    .map(([name, value]) => ({ name, value }))

  const totalStandby = Object.entries(standby_status)
    .filter(([k]) => k !== 'None')
    .reduce((a, [, v]) => a + v, 0)

  const kpis = [
    { color: 'c-blue', icon: '🏥', value: fmt(totalJS), label: 'รพ.สต. ทั้งหมด', pct: '100%', bar: 100 },
    { color: 'c-green', icon: '✅', value: fmt(installed), label: 'ใช้งานระบบแล้ว', pct: `${installPct}%`, bar: parseFloat(installPct) },
    { color: 'c-orange', icon: '⏳', value: fmt(waiting), label: 'รอติดตั้ง', pct: `${waitPct}%`, bar: parseFloat(waitPct) },
    { color: 'c-purple', icon: '🔄', value: fmt(inProgress), label: 'กำลังดำเนินการ', pct: `${((inProgress/totalJS)*100).toFixed(1)}%`, bar: (inProgress/totalJS)*100 },
    { color: 'c-red', icon: '❌', value: fmt(inactive), label: 'ไม่ได้ใช้งาน', pct: `${((inactive/totalJS)*100).toFixed(1)}%`, bar: (inactive/totalJS)*100 },
  ]

  return (
    <div className="dashboard">
      {/* KPI Row */}
      <div className="section-label">ภาพรวมโครงการ</div>
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <span className="kpi-pct">{k.pct}</span>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-bar">
              <div className="kpi-bar-fill" style={{ width: `${Math.min(k.bar, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: Monthly trend + Status donut */}
      <div className="section-label">แนวโน้มและสถานะ</div>
      <div className="charts-row charts-row-3" style={{ marginBottom: 22 }}>
        {/* Monthly line chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">จำนวนการติดตั้งรายเดือน</div>
              <div className="chart-sub">ย้อนหลัง {monthlyData.length} เดือน</div>
            </div>
            <span className="chart-badge">Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: '#8b8fa8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b8fa8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5}
                fill="url(#colorBlue)" dot={{ fill: '#2563eb', r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }} name="จำนวน" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Job Status donut */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">สถานะงาน</div>
              <div className="chart-sub">จำแนกตามประเภท</div>
            </div>
          </div>
          <div className="donut-container">
            <div>
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie data={jobPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                    paddingAngle={3} dataKey="value">
                    {jobPieData.map((entry, i) => (
                      <Cell key={i} fill={JOB_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="donut-legend">
              {jobPieData.map((item, i) => (
                <div key={i} className="leg-item">
                  <div className="leg-dot" style={{ background: JOB_COLORS[item.name] || PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="leg-name">{item.name}</span>
                  <span className="leg-val">{fmt(item.value)}</span>
                  <span className="leg-pct">({((item.value / totalJS) * 100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Region bar + Progress bars */}
      <div className="section-label">การกระจายตามเขตและความคืบหน้า</div>
      <div className="charts-row charts-row-3" style={{ marginBottom: 22 }}>
        {/* Region bar chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">จำนวน รพ.สต. แยกตามเขตสุขภาพ</div>
              <div className="chart-sub">เขต 1–12 ทั่วประเทศ</div>
            </div>
            <span className="chart-badge">12 เขต</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={regionData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: '#8b8fa8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#8b8fa8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="จำนวน" radius={[5, 5, 0, 0]}>
                {regionData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Progress bars */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">ความคืบหน้าการดำเนินการ</div>
              <div className="chart-sub">สถานะการติดตั้งระบบ</div>
            </div>
          </div>
          <div className="prog-list" style={{ marginTop: 8 }}>
            {Object.entries(progress).filter(([k]) => k !== 'None').map(([name, val], i) => {
              const pct = ((val / totalJS) * 100).toFixed(1)
              const color = PROG_COLORS[name] || COLORS[i]
              return (
                <div key={name} className="prog-item">
                  <div className="prog-top">
                    <span className="prog-name">{name}</span>
                    <span className="prog-val" style={{ color }}>{fmt(val)} <span style={{ color: '#565a72', fontSize: 11 }}>({pct}%)</span></span>
                  </div>
                  <div className="prog-track">
                    <div className="prog-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 28 }}>
            <div className="chart-title" style={{ marginBottom: 14 }}>สถานะงาน Stand-by</div>
            <div className="prog-list">
              {Object.entries(standby_status).filter(([k]) => k !== 'None').map(([name, val], i) => {
                const pct = ((val / totalStandby) * 100).toFixed(1)
                const colors2 = ['#10b981', '#f59e0b', '#ef4444', '#6b7280']
                return (
                  <div key={name} className="prog-item">
                    <div className="prog-top">
                      <span className="prog-name">{name}</span>
                      <span className="prog-val" style={{ color: colors2[i] }}>{fmt(val)} <span style={{ color: '#565a72', fontSize: 11 }}>({pct}%)</span></span>
                    </div>
                    <div className="prog-track">
                      <div className="prog-fill" style={{ width: `${pct}%`, background: colors2[i] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Standby type bar */}
      <div className="section-label">จำนวนที่ถามตอบ</div>
      <div className="charts-row charts-row-full" style={{ marginBottom: 22 }}>
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">จำนวนที่ถามตอบ</div>
              <div className="chart-sub">รวม {fmt(Object.values(standby_type).reduce((a, b) => a + b, 0))} ครั้ง</div>
            </div>
            <span className="chart-badge">Support Log</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={standbyTypeData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#8b8fa8', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8b8fa8', fontSize: 12 }} width={95} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="จำนวนครั้ง" radius={[0, 6, 6, 0]}>
                {standbyTypeData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary stat row */}
      <div className="section-label">สรุปตัวชี้วัดหลัก</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 8 }}>
        {[
          { label: 'อัตราการติดตั้งสำเร็จ', value: `${donePct}%`, sub: `ดำเนินการแล้ว ${fmt(done)} จาก ${fmt(totalJS)} แห่ง`, color: '#10b981' },
          { label: 'อัตราความคืบหน้าโครงการ', value: `${donePct}%`, sub: `ดำเนินการแล้ว ${fmt(done)} แห่ง`, color: '#2563eb' },
          { label: 'ยอด Support รวม', value: fmt(Object.values(standby_type).reduce((a,b) => a+b, 0)), sub: `แก้ไขสำเร็จ ${fmt(standby_status['ดำเนินการแล้ว'] || 0)} ครั้ง`, color: '#a78bfa' },
        ].map((s, i) => (
          <div key={i} className="chart-card" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 22px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

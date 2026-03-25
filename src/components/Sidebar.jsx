const MENU = [
  { key: 'overview',  icon: '🏠', label: 'ภาพรวมโครงการ',     sub: 'Overview' },
  { key: 'facility',  icon: '🏥', label: 'Facility Management', sub: 'หน่วยบริการ' },
  { key: 'install',   icon: '🚀', label: 'ติดตามการติดตั้ง',   sub: 'Installation Tracking' },
  { key: 'volume',    icon: '📊', label: 'ปริมาณข้อมูล HIS',   sub: 'Data Volume' },
  { key: 'callcenter',icon: '☎️', label: 'Call Center',         sub: 'Ticket & SLA' },
  { key: 'defect',    icon: '🐞', label: 'Defect & Request',    sub: 'Bug & Feature' },
  { key: 'standby',   icon: '💬', label: 'ถาม-ตอบ / Stand-by', sub: 'Support Log' },
  // { key: 'training',  icon: '🎓', label: 'Training Support',    sub: 'ปัญหาระหว่างอบรม' },
  { key: 'workload',  icon: '⏱️', label: 'Workload Tracking',   sub: 'ชั่วโมงทำงาน' },
  { key: 'installer', icon: '👤', label: 'ทีมผู้ติดตั้ง',       sub: 'Installer Management' },
]

export default function Sidebar({ current, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">N</div>
        <div className="sidebar-brand-info">
          <span className="sidebar-brand-title">NHIP</span>
          <span className="sidebar-brand-sub">Dashboard</span>
        </div>
      </div>

      <div className="sidebar-divider" />

      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">เมนูหลัก</div>
        {MENU.map(m => (
          <button
            key={m.key}
            className={`sidebar-item${current === m.key ? ' active' : ''}`}
            onClick={() => onNavigate(m.key)}
          >
            <span className="sidebar-item-icon">{m.icon}</span>
            <div className="sidebar-item-body">
              <span className="sidebar-item-label">{m.label}</span>
              <span className="sidebar-item-sub">{m.sub}</span>
            </div>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-inner">
          <div className="pulse-dot" />
          <span>Live Data</span>
        </div>
      </div>
    </aside>
  )
}

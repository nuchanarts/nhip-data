const MENU = [
  { key: 'overview',  icon: '🏠', label: 'ภาพรวมโครงการ',     sub: 'Overview' },
  { key: 'production',icon: '📈', label: 'ข้อมูลการใช้งาน',    sub: 'Usage Data' },
  { key: 'install',   icon: '🚀', label: 'รายงานการติดตั้ง',    sub: 'Installation Report' },
  { key: 'volume',    icon: '📊', label: 'ข้อมูลการติดตั้งระบบ', sub: 'Installation Data' },
  { key: 'defect',    icon: '🐞', label: 'Defect & Request',    sub: 'Bug & Feature' },
  // { key: 'callcenter',icon: '☎️', label: 'Call Center',         sub: 'Ticket & SLA' },
  // { key: 'standby',   icon: '💬', label: 'ถาม-ตอบ / Stand-by', sub: 'Support Log' },
  // { key: 'training',  icon: '🎓', label: 'Training Support',    sub: 'ปัญหาระหว่างอบรม' },
  { key: 'workload',  icon: '⏱️', label: 'Workload Tracking',   sub: 'ชั่วโมงทำงาน' },
  { key: 'installer', icon: '👤', label: 'ผลสำเร็จรายบุคคล',     sub: 'Installer Management' },
  // { key: 'retrokey',  icon: '🔁', label: 'คีย์ย้อนหลัง',        sub: 'คาดว่าใช้คู่ขนาน' },
  { key: 'hosplist',  icon: '🏨', label: 'รายชื่อ รพ.สต.',      sub: 'Hospital List' },
  { key: 'statementofc', icon: '📁', label: 'ส่ง 13 แฟ้ม OFC',   sub: 'Statement OFC' },
  { key: 'ndplot3',   icon: '📋', label: 'NDPLOT3',            sub: 'NHSODP Lot 3' },
]

export default function Sidebar({ current, onNavigate, isOpen, onClose }) {
  const handleClick = key => {
    onNavigate(key)
    if (onClose) onClose()
  }
  return (
    <>
      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        <button className="sidebar-close" onClick={onClose} title="ปิดเมนู">✕</button>
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
              onClick={() => handleClick(m.key)}
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
      {isOpen && <div className="sidebar-backdrop show" onClick={onClose} />}
    </>
  )
}

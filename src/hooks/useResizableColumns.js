import { useEffect } from 'react'

/**
 * ผูก handle ลาก ย่อ/ขยาย ความกว้างคอลัมน์ ให้ <table> หนึ่งตัว
 * - ลากขอบขวาหัวคอลัมน์ = ปรับความกว้าง
 * - ดับเบิลคลิกขอบ = รีเซ็ตคอลัมน์นั้น
 */
function attachToTable(table) {
  if (!table || table.dataset.resizable === '1') return
  const ths = table.querySelectorAll(':scope > thead th')
  if (!ths.length) return
  table.dataset.resizable = '1'

  ths.forEach(th => {
    const cs = getComputedStyle(th)
    if (cs.position === 'static') th.style.position = 'relative'

    const handle = document.createElement('span')
    handle.className = 'col-resize-handle'
    handle.setAttribute('aria-hidden', 'true')
    th.appendChild(handle)

    let startX = 0
    let startW = 0
    const onMove = e => {
      const w = Math.max(48, startW + (e.pageX - startX))
      const px = w + 'px'
      th.style.width = px
      th.style.minWidth = px
      th.style.maxWidth = px
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    const onDown = e => {
      startX = e.pageX
      startW = th.offsetWidth
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      e.preventDefault()
      e.stopPropagation()
    }
    const onDbl = e => {
      th.style.width = ''
      th.style.minWidth = ''
      th.style.maxWidth = ''
      e.preventDefault()
      e.stopPropagation()
    }
    handle.addEventListener('mousedown', onDown)
    handle.addEventListener('dblclick', onDbl)
  })
}

function scan(root = document) {
  root.querySelectorAll('table').forEach(attachToTable)
}

/**
 * เรียกครั้งเดียวระดับ App — ทำให้ "ทุกตารางในแอป" ย่อ/ขยายคอลัมน์ได้
 * รองรับตารางที่ render ทีหลัง/แบบ dynamic ผ่าน MutationObserver
 */
export function useGlobalResizableColumns() {
  useEffect(() => {
    scan()
    const obs = new MutationObserver(muts => {
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue
          if (node.tagName === 'TABLE') attachToTable(node)
          else if (node.querySelectorAll) scan(node)
        }
      }
    })
    obs.observe(document.body, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [])
}

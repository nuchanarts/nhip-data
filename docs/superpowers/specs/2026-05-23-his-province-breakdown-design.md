# Dashboard Updates — HIS Breakdown, Workload, Defect Redesign — Design

Date: 2026-05-23
Status: Awaiting user review

## Goal

A bundle of changes spanning multiple pages: surface ระบบ HIS เดิม
information on Overview, make the Workload leaderboard sortable by any
column, simplify the Defect & Request page, hide the Facility
Management menu, and reorder the OPD banner on Usage Data.

All changes are confined to:
`src/components/Sidebar.jsx`, `src/App.jsx`,
`src/pages/Overview.jsx`, `src/pages/ProductionData.jsx`,
`src/pages/Workload.jsx`, `src/pages/DefectRequest.jsx`.

## Requirements (locked scope — 9 items)

| # | Requirement | Where |
|---|---|---|
| A | Top-of-page table "ระบบ HIS เดิม แยกตามจังหวัด · วันที่เริ่มติดตั้ง" with frozen province column + toggle (ทั้งหมด / เฉพาะไม่ได้ใช้งาน) | Overview (top) |
| B | "Top 10 จังหวัด (เรียงตาม % ใช้งานจริง)" right after A | Overview |
| C | 3-card panel "รายละเอียด 'ไม่ได้ใช้งาน' แยกตามระบบ HIS เดิม" (JHCIS / MYPCU / HOSxP) | Overview (in the slot where the pie chart was) |
| D | Move OPD Visit banner from page top to just above "รายชื่อ รพ.สต. — OPD Visit รายวัน" | ProductionData |
| E | "🏆 สรุปภาระงานรายบุคคล" — clickable column headers for sort (asc/desc per column) | Workload |
| F | Remove "Facility Management" sidebar entry | Sidebar + App.jsx |
| G | Redesign Defect & Request — simple dashboard view: total count, by system, by dev, status, remaining | DefectRequest |
| H | Reorder sidebar — "ข้อมูลการติดตั้งระบบ" (volume) below "รายงานการติดตั้ง" (install) | Sidebar |
| I | Remove "สถานะงาน" pie chart from Overview | Overview |

## HIS classification rule (shared between A and C)

Case-insensitive substring match on `installList[i].his`:

| Match | Bucket |
|---|---|
| contains `JHCIS` | JHCIS |
| contains `MYPCU` | MYPCU |
| contains `HOSXP` (case-insensitive — covers `HOSxP`) | HOSxP |
| else (including empty) | อื่น ๆ |

Order in UI: JHCIS, MYPCU, HOSxP, อื่น ๆ.

## Design

### A. Top section — `src/pages/Overview.jsx`

Inserted as the **first** child of `<div className="page">` in
`Overview()`, before the existing `<div className="section-label">งวดงาน …</div>` block (Overview.jsx:411).

Markup outline:

```
<div className="section-label">ระบบ HIS เดิม แยกตามจังหวัด · วันที่เริ่มติดตั้ง</div>
<div /* toolbar */>
  <pill-toggle>ทั้งหมด | เฉพาะไม่ได้ใช้งาน</pill-toggle>
  <span>{filteredCount} แห่ง · {provinceCount} จังหวัด</span>
</div>
<div /* scroll container, max-height ~60vh */>
  <table class="his-prov-table">
    <thead /* sticky */>
      <tr>
        <th class="sticky-col">จังหวัด</th>
        <th>วันที่เริ่มติดตั้ง</th>
        <th>JHCIS</th>
        <th>MYPCU</th>
        <th>HOSxP</th>
        <th>อื่น ๆ</th>
        <th>รวม</th>
      </tr>
    </thead>
    <tbody>{rows}</tbody>
  </table>
</div>
```

**State (new):**
- `const [hisProvScope, setHisProvScope] = useState('all')` — `'all' | 'inactive'`

**Data (new `useMemo`):**
- Source: `installList` from existing `data` destructure.
- Pre-filter by `hisProvScope === 'inactive' ? r.status === 'ไม่ได้ใช้งาน' : true`.
- Bucket each row by `province` (raw value e.g. `"67-เพชรบูรณ์"`).
- Per province: `firstInstall` (min `install_date` via `parseThaiDate`), counts JHCIS/MYPCU/HOSxP/อื่น ๆ, `total` sum.
- Sort rows by `total DESC`, then province name ASC.

**Date parser:**
```js
function parseThaiDate(s) {
  if (!s) return null
  const [d, m, y] = s.split('/').map(Number)
  if (!d || !m || !y) return null
  const ce = y > 2400 ? y - 543 : y
  return new Date(ce, m - 1, d)
}
```

**Frozen first column** — inline `position: sticky; left: 0` + matching background on จังหวัด `<th>`/`<td>`. Container needs `overflow-x: auto`. **Sticky header** — `<thead>` cells `position: sticky; top: 0`.

**Empty state:** when no row has non-empty `his`, show a single row spanning all columns: `"กำลังโหลดข้อมูลระบบ HIS เดิม…"`.

### B. Top 10 จังหวัด — `src/pages/Overview.jsx`

Inserted immediately after A. Required data: `productionVisits` (add to `data` destructure: `const { …, installList, productionVisits = [] } = data`).

**Calculation** (mirrors ProductionData.jsx:284-303):
```js
const recentSet = new Set()
productionVisits.forEach(p => {
  if (p.latest > 0 || p.total > 0) recentSet.add(p.hospcode)
})
const installedByProv = {}, usingByProv = {}
installList.forEach(r => {
  if (r.progress !== 'ดำเนินการแล้ว') return
  installedByProv[r.province] = (installedByProv[r.province] || 0) + 1
  if (recentSet.has(r.hospcode))
    usingByProv[r.province] = (usingByProv[r.province] || 0) + 1
})
const top10 = Object.keys(installedByProv)
  .map(p => ({
    province: p,
    installed: installedByProv[p],
    using: usingByProv[p] || 0,
    pct: (usingByProv[p] || 0) / installedByProv[p],
  }))
  .sort((a, b) => b.pct - a.pct || b.using - a.using)
  .slice(0, 10)
```

**UI** — `"Top 10 จังหวัด (เรียงตาม % ใช้งานจริง)"` followed by horizontal bar list, one row per province:
```
[1] 67-เพชรบูรณ์   ████████████░░  86.4% (95 / 110)
```
Bar color: `≥80% green (#10b981)`, `50–79% blue (#0ea5e9)`, `20–49% amber (#f59e0b)`, `<20% red (#ef4444)`.

**Empty state:** if `productionVisits.length === 0`, show `"รอข้อมูล Production Sheet…"`.

### I. Remove "สถานะงาน" pie chart — `src/pages/Overview.jsx`

Delete the entire second `<div className="chart-card">` inside the
charts-row at Overview.jsx:520-542 — the one containing the
`<PieChart>` with `jobPieData`. Also delete:
- `JOB_COLORS` constant (Overview.jsx:5) if no longer used elsewhere
  in the file.
- `jobPieData` and any related `useMemo` (Overview.jsx:323) if unused
  after removal.
- The `PieChart, Pie, Cell` recharts imports — keep only if other
  charts still use them (check after deletion).

After deletion, the charts-row becomes a single-card row containing
only "จำนวนการติดตั้งรายเดือน". Adjust its CSS to span full width by
changing `charts-row charts-row-3` → `charts-row charts-row-full` (the
class is already defined and used elsewhere, e.g. Overview.jsx:547).

### C. Inactive-HIS card panel — `src/pages/Overview.jsx`

Inserted in the slot that previously held the pie chart (after the
monthly-trend chart, in the charts-row area). With I applied, the
monthly chart goes full-width and the C panel becomes a new section
immediately below it.

```
<div className="section-label" style={{marginTop:24}}>
  รายละเอียด "ไม่ได้ใช้งาน" แยกตามระบบ HIS เดิม
</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
  {/* 3 cards: JHCIS / MYPCU / HOSxP */}
</div>
```

**Card visual** (same language as `SUMMARY_STATUSES`, Overview.jsx:450-475):

| Bucket | bg | color | icon |
|---|---|---|---|
| JHCIS | `#fee2e2` | `#dc2626` | `🟥` |
| MYPCU | `#fef3c7` | `#d97706` | `🟧` |
| HOSxP | `#dbeafe` | `#2563eb` | `🟦` |

Each card: icon + `"<HIS> ไม่ใช้งาน"`, big count, `%` of inactive total, thin bar.

If `อื่น ๆ > 0`, append a tiny muted line under the grid: `"+ อื่น ๆ {n} แห่ง"`.

### D. Reorder OPD banner — `src/pages/ProductionData.jsx`

Cut the banner block at lines 451-462:
```jsx
<div className="page-desc" …>
  <span>OPD Visit รายวัน · {availableRegions.length} เขต · {fmt(totalHosp)} หน่วยบริการ</span>
  {productionDates.length > 0 && (
    <span style={…}>ข้อมูล ณ วันที่ {productionDates[productionDates.length - 1]}</span>
  )}
</div>
```
Paste directly above line 1538 `<div className="section-label">รายชื่อ รพ.สต. — OPD Visit รายวัน</div>`. Surrounding KPI/charts unchanged.

### E. Sortable column headers — `src/pages/Workload.jsx`

The leaderboard at Workload.jsx:313 uses `<div className="lb-header">` with text-only column labels (not real `<table>`). Existing sort uses a pill toolbar with 4 keys (Workload.jsx:269-285).

**Change:**
1. Replace `[sortBy, setSortBy] = useState(...)` value with a two-field state:
   `const [sort, setSort] = useState({ key: 'total', dir: 'desc' })`.
2. **Remove the pill toolbar** (Workload.jsx:269-285) — column headers replace it.
3. Wrap each column span in `lb-header` with an `onClick` that toggles direction or switches key:
   ```js
   function onHeaderClick(key) {
     setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })
   }
   ```
4. Header style: `cursor:pointer`, hover background; show `▲`/`▼` next to the active column's label.
5. Sort logic — replace existing `.sort(…)` with:
   ```js
   const SORT_FNS = {
     name:     (a,b) => a.name.localeCompare(b.name,'th'),
     total:    (a,b) => a.total - b.total,
     done:     (a,b) => a.done - b.done,
     inProg:   (a,b) => a.inProg - b.inProg,
     notYet:   (a,b) => a.notYet - b.notYet,
     active:   (a,b) => a.active - b.active,
     parallel: (a,b) => a.parallel - b.parallel,
     inactive: (a,b) => a.inactive - b.inactive,
     pct:      (a,b) => (a.total?a.done/a.total:0) - (b.total?b.done/b.total:0),
   }
   const sorted = [...filtered].sort((a,b) => {
     const r = SORT_FNS[sort.key](a, b)
     return sort.dir === 'asc' ? r : -r
   })
   ```
6. Map each `lb-header` span to its sort key — including the `#` column (which is non-sortable; clicking it does nothing). Keep total row at bottom (don't sort it).

### H. Reorder sidebar menu — `src/components/Sidebar.jsx`

In the `MENU` array (Sidebar.jsx:1-15), swap the order of:
- `{ key: 'volume', label: 'ข้อมูลการติดตั้งระบบ' }` (currently index 3)
- `{ key: 'install', label: 'รายงานการติดตั้ง' }` (currently index 4)

Final order around this region:
1. overview
2. production (ข้อมูลการใช้งาน)
3. retrokey (คีย์ย้อนหลัง)
4. **install** (รายงานการติดตั้ง) ← was below
5. **volume** (ข้อมูลการติดตั้งระบบ) ← was above
6. defect
7. workload
8. installer
9. hosplist
(facility removed by F)

### F. Remove Facility Management — `src/components/Sidebar.jsx` + `src/App.jsx`

1. **Sidebar.jsx:13** — delete the entry:
   ```js
   { key: 'facility', icon: '🏥', label: 'Facility Management', sub: 'หน่วยบริการ' },
   ```
2. **App.jsx:6** — delete import `import FacilityMgmt from './pages/FacilityMgmt'`.
3. **App.jsx:461** — delete `facility: FacilityMgmt,` from `PAGES`.
4. **Delete file** `src/pages/FacilityMgmt.jsx` — no other module imports it (verified by absence in grep beyond App.jsx and FacilityMgmt.jsx itself).

### G. Redesign Defect & Request — `src/pages/DefectRequest.jsx`

**Goal:** show at a glance — total / by system / per dev / status / remaining. Replace the current top-heavy mix of KPI cards + multiple charts + Kanban + Calculator with a focused single-screen dashboard.

**New layout (top to bottom):**

1. **Header strip** (unchanged): sheet URL editor + auto-refresh countdown.

2. **4 KPI cards** (large, horizontal row):
   - 📋 **ทั้งหมด** — total defect/request count
   - ✅ **ดำเนินการแล้ว** — count + % (status matches "แก้ไขเรียบร้อย" / "เสร็จสิ้น" / "ดำเนินการแล้ว")
   - 🔄 **เหลือ** — total − done, with `(ด่วน X)` sub-line
   - 🚨 **ค้างนาน** — items with `urgency` = "ด่วน"/"ด่วนมาก" that aren't done

3. **Section "แยกตามระบบงาน"** — single horizontal bar list (no chart): each row is one system with its count + bar of done/remaining proportion. Sorted by total desc, top 10 visible by default, "ดูทั้งหมด" expander.

4. **Section "งานของ Dev แต่ละคน"** — table with sortable headers:
   `Dev | งานทั้งหมด | เสร็จ | กำลังทำ | เหลือ | % เสร็จ | ระบบหลัก`
   - One row per `responsible` (or `นักพัฒนา` if present in defectList).
   - "ระบบหลัก" = top system that dev is currently working on (max count).
   - Click a row to expand and show that dev's individual items in a sub-list (item description + status + system + urgency).

5. **Detail table** — keep the existing searchable defectList table at the bottom (search by hospital/code/title, filter by status/urgency/system), but compact: 8 columns max, single line per row, pagination as today.

**Out:** Calculator (lines 33-39 state + UI) and Kanban (lines 41-56 state + UI) are removed from this page. If we want to keep these features they can be moved to a separate "Defect Planning" sub-page — but per the user's "ให้ทำใหม่ ให้ดูง่าย ๆ" they are out of scope for the redesigned dashboard.

**Status mapping for KPI 2 (done):**
```js
const DONE_STATUSES = new Set(['แก้ไขเรียบร้อย','เสร็จสิ้น','ดำเนินการแล้ว','เสร็จแล้ว'])
const isDone = r => DONE_STATUSES.has((r.__status || r.status || '').trim())
```

**Dev name source:**
```js
// prefer dedicated column if present, fall back to ผู้รับผิดชอบ
const devOf = r => (r['นักพัฒนา'] || r['ผู้รับผิดชอบ'] || r.responsible || '').trim() || '— ยังไม่ระบุ —'
```

## Out of scope

- New sidebar menu items, routing changes, or pages other than removing facility.
- Changes to the existing pie chart "สถานะงาน" on Overview (still 5 slices).
- Changes to data parsing in `App.jsx`.
- Restoring Kanban/Calculator features elsewhere (deferred).
- Persisting toggle/sort state across reloads.

## Risks & notes

1. **Static fallback has empty `his`.** Verified: 351/351 inactive rows in `installData.json` have empty `his`. Features A and C show empty/อื่น ๆ until live Sheet loads. Acceptable — matches existing chart behavior.

2. **Feature B needs `productionVisits`.** Loaded by `loadProdSheet` on mount (App.jsx:575-586). Overview will show empty state until that completes.

3. **Date format ambiguity.** Sheets export gives mixed CE/BE years. `parseThaiDate` heuristic handles both. Unparseable → `"—"`.

4. **Sticky column requires explicit background.** Without it, rows bleed through during horizontal scroll. Use `background: #fff` on sticky column cells.

5. **Workload column count.** 8 sortable headers + 1 non-sortable (#) + 1 visual (ความคืบหน้า). Avoid letting label + indicator exceed the existing column widths (32–150px); pick short Thai labels and place the ▲/▼ in tiny font.

6. **Defect redesign deletes existing features.** Calculator and Kanban code blocks (~400 lines combined) are removed. The user explicitly asked for a simpler page; this is intentional. Confirm before merge.

7. **`defectList` columns vary.** The parser uses dynamic header detection (App.jsx:42-126). The `responsible` / `นักพัฒนา` field may not always be populated; fall back to a "— ยังไม่ระบุ —" bucket.

## File-by-file impact

| File | Net change | Notes |
|---|---|---|
| `src/components/Sidebar.jsx` | −1 line + reorder | Remove Facility entry (F) + swap install/volume (H) |
| `src/App.jsx` | −2 lines | Remove FacilityMgmt import + PAGES entry |
| `src/pages/FacilityMgmt.jsx` | Deleted | No other consumers |
| `src/pages/Overview.jsx` | +~210 lines | A + B + C |
| `src/pages/ProductionData.jsx` | ±0 (move only) | D |
| `src/pages/Workload.jsx` | +~30 / −20 | E (replace pills with header clicks) |
| `src/pages/DefectRequest.jsx` | ~−400 / +~250 | G (major rewrite of main view) |

No new files, no new dependencies.

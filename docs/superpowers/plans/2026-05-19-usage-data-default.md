# Usage Data Default + Insightful Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Usage Data the default page sourced from a new sheet, correct the Top-10 province chart, add legacy-HIS distribution charts and a 7-day OPD view, with week-over-week + auto-narrative insight on the new/changed charts.

**Architecture:** Pure React + Vite SPA. Data is parsed from Google Sheets `.xlsx` exports in `src/App.jsx` (`parseExcel`, `parseProductionSheets`) into a single `data` object passed to page components. All changes are localized edits to `App.jsx` and four page components — no new dependencies, no structural refactor.

**Tech Stack:** React 19, Vite, recharts (already used), xlsx (already used). No test runner exists; verification is `npm run lint`, `npm run build`, and manual checks at `http://localhost:5173`.

---

## Verification convention (no test runner)

Every task ends with these gates (the project has no Vitest/Jest; do not add one):

- `npm run lint` → must pass with no new errors.
- `npm run build` → must succeed.
- Manual smoke check at `http://localhost:5173` per the task's stated expectation.
- Commit.

Reference spec: `docs/superpowers/specs/2026-05-19-usage-data-default-design.md`.
Work on branch `feat/usage-data-default` (already created).

---

## Task 1: App defaults — landing page, new sheet URL, reload-on-open

**Files:**
- Modify: `src/App.jsx:19` (PROD_SHEET_DEFAULT_URL)
- Modify: `src/App.jsx:499` (default page)
- Modify: `src/App.jsx` (add useEffect near `:642`)

- [ ] **Step 1: Change default Production sheet URL**

In `src/App.jsx:19`, replace the whole line:

```js
const PROD_SHEET_DEFAULT_URL = 'https://docs.google.com/spreadsheets/d/1a6nP3FBPka-DJeEzUk40_XiNYch_Eym-/edit?usp=sharing&ouid=102765207545322381480&rtpof=true&sd=true'
```

- [ ] **Step 2: Change default landing page to Usage Data**

In `src/App.jsx:499`, change:

```js
const [page, setPage] = useState('production')
```

- [ ] **Step 3: Reload Usage Data every time its page is opened**

In `src/App.jsx`, immediately AFTER the existing effect block that ends at `:644`:

```js
  // โหลด defect sheet ใหม่ทันทีเมื่อเปิดหน้า defect
  useEffect(() => {
    if (page === 'defect') loadDefectSheet()
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps
```

add a new effect:

```js
  // โหลด production sheet ใหม่ทันทีทุกครั้งที่เปิดหน้า ข้อมูลการใช้งาน
  useEffect(() => {
    if (page === 'production') loadProdSheet()
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 4: Verify**

Run `npm run lint` then `npm run build` — both must pass.
At `http://localhost:5173`: app opens on "ข้อมูลการใช้งาน"; data loads from the new sheet (province/region data populated, not the DEFAULT_DATA fallback); click another menu item then back to "ข้อมูลการใช้งาน" → a fresh load is triggered (network request to the gsheet export, loading state shows briefly).

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: default to Usage Data page from new sheet, reload on open"
```

---

## Task 2: Parse "ระบบ HIS เดิม" from the install-detail sheet

**Files:**
- Modify: `src/App.jsx:209-237` (s5col patterns + fb5 + c5)
- Modify: `src/App.jsx:264-285` (installList row push + aggregation)
- Modify: `src/App.jsx:126-163` (DEFAULT_DATA)

> ASSUMPTION (flagged in spec): the legacy-HIS column is in Sheet 5 (`ข้อมูลผู้ติดตั้ง`) and detectable by header pattern. If the real header differs, only the `his_legacy` pattern array below needs updating.

- [ ] **Step 1: Add `his_legacy` to the DEFAULT_DATA object**

In `src/App.jsx`, inside `DEFAULT_DATA` (between `provinceCnt` `:160` and `total` `:161`), add a line:

```js
  his_legacy: {},
```

- [ ] **Step 2: Add header pattern + fallback for the HIS column**

In the `s5col` `patterns` object (`src/App.jsx:210-229`), add after the `pm:` line:

```js
            his_legacy:  ['ระบบ HIS เดิม','HIS เดิม','ระบบเดิม','โปรแกรมเดิม','HIS'],
```

In the `fb5` object (`src/App.jsx:235`), append `,his_legacy:18` before the closing brace:

```js
        const fb5 = { hospcode:0,region:1,name:2,province:3,amphoe:4,install_date:5,mig_start:6,mig_end:7,trans_start:8,trans_end:9,progress:10,status:11,finish_date:12,responsible:13,summary:14,check_date:15,remark:16,pm:17,his_legacy:18 }
```

- [ ] **Step 3: Capture HIS value per row and aggregate**

In the Sheet-5 loop, add an aggregation accumulator. Change the accumulator declaration line (`src/App.jsx:239`) from:

```js
        const js={}, pg={}, rg={}, mo={}, regionDone={}, provinceCnt={}
```

to:

```js
        const js={}, pg={}, rg={}, mo={}, regionDone={}, provinceCnt={}, hisLegacy={}
```

Inside the same loop, immediately BEFORE `installList.push({` (`src/App.jsx:265`), add:

```js
          const hisVal = String(r[c5('his_legacy')]||'').trim()
          if(hisVal && hisVal!=='null') hisLegacy[hisVal]=(hisLegacy[hisVal]||0)+1
```

Add `his_legacy: hisVal,` as a new property inside the pushed object (after the `pm:` line at `:283`):

```js
            pm:          String(r[c5('pm')]||''),
            his_legacy:  hisVal,
```

- [ ] **Step 4: Write the aggregate onto result**

After `result.installList=installList` (`src/App.jsx:293`), add:

```js
        result.his_legacy=Object.fromEntries(Object.entries(hisLegacy).sort((a,b)=>b[1]-a[1]))
```

- [ ] **Step 5: Verify**

Run `npm run lint` and `npm run build` — both pass.
At `http://localhost:5173`, open the browser console after a sheet load and run `__none__` is not needed — instead add a temporary check: confirm no runtime error and that `data.his_legacy` is populated by inspecting via the chart added in Task 4 (this task has no visible UI yet; correctness is confirmed in Task 4). For now: app still loads with no console errors.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: parse ระบบ HIS เดิม column and aggregate his_legacy"
```

---

## Task 3: Correct the Top-10 จังหวัด bar (% of successful installs)

**Files:**
- Modify: `src/pages/ProductionData.jsx:1030-1036` (bar markup)
- Modify: `src/pages/ProductionData.jsx:173-176` (remove unused maxProvCount if unused)

- [ ] **Step 1: Replace the bar markup**

In `src/pages/ProductionData.jsx`, replace lines `1030-1036` (the `{/* progress bar: ใช้งาน vs ติดตั้ง */}` block):

```jsx
                    {/* progress bar: % ใช้งานจริง จากยอดติดตั้งสำเร็จ */}
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', width: `${usePct == null ? 0 : Math.min(usePct, 100)}%`, height: '100%', background: medal, borderRadius: 3, transition: 'width .3s' }} />
                    </div>
```

- [ ] **Step 2: Check whether `maxProvCount` is still used**

Run: `grep -n maxProvCount src/pages/ProductionData.jsx`
Expected: only the definition at `:173-176` remains (no other usage).
If that is the only match, delete the definition block `:173-176`:

```js
  const maxProvCount = Math.max(
    allProvRanked[0]?.[1].count || 1,
    ...Object.values(installedByProv)
  )
```

If `grep` shows any other usage, leave the definition in place.

- [ ] **Step 3: Verify**

Run `npm run lint` and `npm run build` — both pass.
At `http://localhost:5173` on Usage Data → "🏆 Top 10 จังหวัด": each province's bar length now visually equals its displayed `%` (a province showing `100%` has a full-width bar; a `40%` province is ~40% width); bar order is monotonically non-increasing down the ranked list.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProductionData.jsx
git commit -m "fix: Top-10 จังหวัด bar reflects % of successful installs"
```

---

## Task 4: ระบบ HIS เดิม distribution chart + narrative (Installation Data & Installation Report)

**Files:**
- Modify: `src/pages/DataVolume.jsx` (destructure + new chart section)
- Modify: `src/pages/InstallTracking.jsx` (new chart section)

Both files already import `BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell` from recharts and define a `TT` tooltip and a color palette.

- [ ] **Step 1: Add a shared chart block to DataVolume**

In `src/pages/DataVolume.jsx`, add `his_legacy` to the destructure at `:53`:

```js
  const { regionDone, migrationDone, provinceCnt, installList, total, job_status, his_legacy } = data
```

Add this computation just before the component's `return (` (top of JSX):

```js
  const hisEntries = Object.entries(his_legacy || {}).sort((a,b)=>b[1]-a[1])
  const hisTotal = hisEntries.reduce((a,[,v])=>a+v,0)
  const hisData = hisEntries.slice(0,10).map(([name,value])=>({ name, value }))
  const hisTop = hisEntries[0]
```

Insert this section immediately AFTER the `ความคืบหน้าแยกตามเขตสุขภาพ` section's closing (right before the existing `{/* Pagination */}` block near `:421`, i.e. after the charts grid that section opens at `:242`). Place it as its own top-level block inside the page `<div>`:

```jsx
      <div className="section-label" style={{marginTop:24}}>ระบบ HIS เดิม (สัดส่วน รพ.สต.)</div>
      <div className="chart-card" style={{marginBottom:22}}>
        <div className="chart-header">
          <div>
            <div className="chart-title">สัดส่วนระบบ HIS เดิมของหน่วยบริการ</div>
            <div className="chart-sub">
              {hisTop
                ? `ระบบเดิมที่พบมากสุด: ${hisTop[0]} ${hisTop[1].toLocaleString()} แห่ง (${hisTotal?((hisTop[1]/hisTotal)*100).toFixed(1):0}%) จากทั้งหมด ${hisEntries.length} ระบบ`
                : 'ยังไม่มีข้อมูลระบบ HIS เดิม'}
            </div>
          </div>
          <span className="chart-badge">Bar</span>
        </div>
        {hisData.length === 0 ? (
          <div style={{textAlign:'center',padding:'24px',color:'var(--text-muted)',fontSize:13}}>ไม่พบคอลัมน์ "ระบบ HIS เดิม" ในชีต</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, hisData.length*34)}>
            <BarChart data={hisData} layout="vertical" margin={{top:5,right:30,bottom:5,left:10}}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
              <XAxis type="number" tick={{fill:'#64748b',fontSize:10}}/>
              <YAxis type="category" dataKey="name" width={140} tick={{fill:'#64748b',fontSize:11}}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="value" name="จำนวน รพ.สต." radius={[0,4,4,0]}>
                {hisData.map((e,i)=><Cell key={i} fill={['#2563eb','#10b981','#f59e0b','#ef4444','#7c3aed','#06b6d4','#f97316'][i%7]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
```

- [ ] **Step 2: Add the same section to InstallTracking**

In `src/pages/InstallTracking.jsx`, add `his_legacy` to the destructure at `:17`:

```js
  const { job_status, progress, regions, monthly, installers, regionDone, provinceCnt, migrationDone, installList, his_legacy } = data
```

Add the same computation block before `return (`:

```js
  const hisEntries = Object.entries(his_legacy || {}).sort((a,b)=>b[1]-a[1])
  const hisTotal = hisEntries.reduce((a,[,v])=>a+v,0)
  const hisData = hisEntries.slice(0,10).map(([name,value])=>({ name, value }))
  const hisTop = hisEntries[0]
```

Insert the identical JSX block from Step 1 immediately AFTER the `👥 สรุปสถิติทีมผู้ติดตั้ง` KPI grid closes (after the `kpi-grid` block ending near `:430`, before the `{/* ===== สรุปรายงานติดตั้ง ===== */}` comment at `:432`). Use the exact same JSX as Step 1 (the `TT`, `chart-card`, `chart-header`, `chart-badge` classes all exist in this file too).

- [ ] **Step 3: Verify**

Run `npm run lint` and `npm run build` — both pass.
At `http://localhost:5173`: open "ข้อมูลการติดตั้งระบบ" (Installation Data) and "รายงานการติดตั้ง" (Installation Report). Each shows a "ระบบ HIS เดิม (สัดส่วน รพ.สต.)" horizontal bar chart with vendor names and counts, and a sub-line narrative naming the most common legacy system + percentage. If the column is absent, the graceful "ไม่พบคอลัมน์" message shows instead of a crash.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DataVolume.jsx src/pages/InstallTracking.jsx
git commit -m "feat: ระบบ HIS เดิม distribution chart + narrative on install pages"
```

---

## Task 5: Top-10 จังหวัด — week-over-week chip + narrative

**Files:**
- Modify: `src/pages/ProductionData.jsx:138-146` (provMap series accumulation)
- Modify: `src/pages/ProductionData.jsx` (compute wow, narrative line, per-row chip)

- [ ] **Step 1: Accumulate a per-province daily series**

In `src/pages/ProductionData.jsx`, replace the `provMap` build block `:138-146`:

```js
  const provMap = {}
  productionVisits.forEach(h => {
    if (!h.province) return
    if (!provMap[h.province]) provMap[h.province] = { count: 0, latest: 0, total: 0, regions: new Set(), series: [] }
    provMap[h.province].count++
    provMap[h.province].latest += h.latest
    provMap[h.province].total  += h.total
    if (h.region) provMap[h.province].regions.add(h.region)
    const v = h.visits || []
    for (let i = 0; i < v.length; i++) provMap[h.province].series[i] = (provMap[h.province].series[i] || 0) + Number(v[i] || 0)
  })
```

- [ ] **Step 2: Add a week-over-week helper near the top of the component**

In `src/pages/ProductionData.jsx`, add this pure helper above the component's `return (` (with the other derived consts):

```js
  // คืน { pct, dir } เทียบ OPD รวม 7 วันล่าสุด กับ 7 วันก่อนหน้า
  const wow = (series) => {
    if (!series || series.length < 14) return null
    const last7 = series.slice(-7).reduce((a,b)=>a+(b||0),0)
    const prev7 = series.slice(-14,-7).reduce((a,b)=>a+(b||0),0)
    if (prev7 === 0) return last7 > 0 ? { pct: 100, dir: 'up' } : null
    const pct = Math.round(((last7 - prev7) / prev7) * 100)
    return { pct, dir: pct >= 0 ? 'up' : 'down' }
  }
```

- [ ] **Step 3: Add the narrative line above the Top-10 list**

In `src/pages/ProductionData.jsx`, add this derived value with the other consts before `return (`:

```js
  const provInsight = (() => {
    const ranked = allProvRankedBase
    if (!ranked.length) return ''
    const ge80 = ranked.filter(([p,s]) => { const i = installedByProv[p]||0; return i>0 && (s.count/i)>=0.8 }).length
    const lt50 = ranked.filter(([p,s]) => { const i = installedByProv[p]||0; return i>0 && (s.count/i)<0.5 }).length
    let mover = null
    ranked.forEach(([p,s]) => { const w = wow(s.series); if (w && (!mover || w.pct > mover.pct)) mover = { p, pct: w.pct } })
    const moverTxt = mover ? ` · โตเร็วสุด: ${mover.p} (${mover.pct>=0?'+':''}${mover.pct}%)` : ''
    return `${ge80} จังหวัดใช้งาน ≥ 80% · ${lt50} จังหวัดยังต่ำกว่า 50%${moverTxt}`
  })()
```

In the Top-10 section, replace the `chart-sub` line at `:858`:

```jsx
            <div className="chart-sub">นับจากหน่วยบริการที่มี OPD Visit &gt; 0 ใน 3 วันล่าสุด · ทั้งหมด {allProvRanked.length} จังหวัด · {provInsight}</div>
```

- [ ] **Step 4: Add the per-province wow chip**

In `src/pages/ProductionData.jsx`, inside the province `.map` (`:958`), add after `const usePct = ...` (`:962`):

```js
              const w = wow(s.series)
```

In the header row that shows `ใช้งาน / ติดตั้ง / usePct%` (`:1019-1028`), add the chip directly after the closing of the `usePct != null` span (after `:1027`), still inside that flex `div`:

```jsx
                        {w && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: w.dir==='up' ? '#10b981' : '#ef4444' }}>
                            {w.dir==='up' ? '▲' : '▼'}{Math.abs(w.pct)}%
                          </span>
                        )}
```

- [ ] **Step 5: Verify**

Run `npm run lint` and `npm run build` — both pass.
At `http://localhost:5173` Usage Data → Top-10: the sub-line reads "N จังหวัดใช้งาน ≥ 80% · M จังหวัดยังต่ำกว่า 50% · โตเร็วสุด: …"; provinces with ≥14 days of data show a green ▲ or red ▼ percentage chip; provinces with insufficient history simply omit the chip (no crash, no NaN).

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProductionData.jsx
git commit -m "feat: Top-10 จังหวัด week-over-week chip and insight narrative"
```

---

## Task 6: Hospital List — last-7-days OPD columns, sparkline, wow, narrative

**Files:**
- Modify: `src/pages/HospList.jsx` (join productionVisits, table head/body, summary narrative)

- [ ] **Step 1: Build a hospcode → visits lookup and 7-day window**

In `src/pages/HospList.jsx`, after `const list = data.installList || []` (`:24`), add:

```js
  const prodDates = data.productionDates || []
  const last7Dates = prodDates.slice(-7)
  const prodByCode = useMemo(() => {
    const m = {}
    ;(data.productionVisits || []).forEach(h => { m[String(h.hospcode)] = h.visits || [] })
    return m
  }, [data.productionVisits])
  const sumRange = (arr, a, b) => (arr || []).slice(a, b).reduce((s,v)=>s+Number(v||0),0)
```

- [ ] **Step 2: Add a header narrative (OPD 7-day total + wow)**

In `src/pages/HospList.jsx`, add before `return (`:

```js
  const opdInsight = useMemo(() => {
    const all = Object.values(prodByCode)
    if (!all.length || prodDates.length < 7) return ''
    const last7 = all.reduce((s,v)=>s+sumRange(v,-7,v.length),0)
    if (prodDates.length < 14) return `OPD รวม 7 วันล่าสุด ${last7.toLocaleString()} ครั้ง`
    const prev7 = all.reduce((s,v)=>s+sumRange(v,-14,v.length-7),0)
    const pct = prev7 ? Math.round(((last7-prev7)/prev7)*100) : 0
    return `OPD รวม 7 วันล่าสุด ${last7.toLocaleString()} ครั้ง ${pct>=0?'+':''}${pct}% จากสัปดาห์ก่อน`
  }, [prodByCode, prodDates]) // eslint-disable-line react-hooks/exhaustive-deps
```

Render it under the existing summary bar — replace the summary-bar closing (`:85`, the line `</div>` that closes the flex container opened at `:75`) by adding immediately AFTER it:

```jsx
      {opdInsight && (
        <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>📈 {opdInsight}</div>
      )}
```

- [ ] **Step 3: Add a tiny inline sparkline component**

In `src/pages/HospList.jsx`, add above `export default function HospList` (after the `PAGE_SIZE` const `:23`):

```js
function Spark({ values }) {
  const v = (values || []).map(Number)
  if (v.length < 2) return <span style={{ color: '#cbd5e1' }}>—</span>
  const max = Math.max(...v, 1)
  const w = 70, h = 18, step = w / (v.length - 1)
  const pts = v.map((n,i) => `${(i*step).toFixed(1)},${(h - (n/max)*h).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth="1.5" />
    </svg>
  )
}
```

- [ ] **Step 4: Add table columns (header)**

In `src/pages/HospList.jsx`, replace the `thead` header array line `:133`:

```jsx
              {['#','รหัส','ชื่อ รพ.สต.','เขต','จังหวัด','อำเภอ','วันที่ติดตั้ง','Progress','สถานะงาน','สรุปรายงาน','ผู้ติดตั้ง', ...last7Dates.map(d=>String(d)), '7 วัน', 'WoW'].map((h,i) => (
```

- [ ] **Step 5: Add table columns (body)**

In `src/pages/HospList.jsx`, change the empty-state `colSpan` at `:140` from `11` to a computed span:

```jsx
              <tr><td colSpan={11 + last7Dates.length + 2} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบข้อมูล</td></tr>
```

Add the new cells inside the row, immediately AFTER the `ผู้ติดตั้ง` cell (`:155`) and before the closing `</tr>` (`:156`):

```jsx
                {(() => {
                  const v = prodByCode[String(r.hospcode)] || []
                  const last7 = v.slice(-7)
                  const sum7 = last7.reduce((s,x)=>s+Number(x||0),0)
                  const prev7 = v.length>=14 ? v.slice(-14,-7).reduce((s,x)=>s+Number(x||0),0) : null
                  const pct = prev7==null ? null : prev7===0 ? (sum7>0?100:0) : Math.round(((sum7-prev7)/prev7)*100)
                  return (
                    <>
                      {last7Dates.map((_, di) => {
                        const offset = last7Dates.length - di
                        const val = v.length ? Number(v[v.length - offset] || 0) : 0
                        return <td key={di} style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12, color: val>0?'var(--text-primary)':'#cbd5e1' }}>{val || '-'}</td>
                      })}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}><Spark values={last7} /></td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: pct==null ? '#94a3b8' : pct>=0 ? '#10b981' : '#ef4444' }}>
                        {pct==null ? '—' : `${pct>=0?'▲':'▼'}${Math.abs(pct)}%`}
                      </td>
                    </>
                  )
                })()}
```

- [ ] **Step 6: Verify**

Run `npm run lint` and `npm run build` — both pass.
At `http://localhost:5173` open "รายชื่อ รพ.สต.": the table now has up to 7 dated OPD columns (header = the actual date strings from the Production sheet), a "7 วัน" sparkline column, and a "WoW" ▲/▼ % column; a header line "📈 OPD รวม 7 วันล่าสุด …" appears. Hospitals not present in the Production sheet show "-"/"—" without errors. If the Production sheet has fewer than 7 date columns, only the available columns appear and WoW degrades to "—".

- [ ] **Step 7: Commit**

```bash
git add src/pages/HospList.jsx
git commit -m "feat: Hospital List 7-day OPD columns, sparkline, WoW, narrative"
```

---

## Self-Review

**Spec coverage:**
- #1 default page → Task 1 Step 2. ✅
- #2 new sheet URL → Task 1 Step 1. ✅
- #3 reload on open → Task 1 Step 3. ✅
- #4 Top-10 bar = % → Task 3. ✅
- #5 HIS distribution chart (both pages) → Task 2 (parse) + Task 4 (display ×2). ✅
- #6 Hospital List 7-day OPD → Task 6 Steps 4–5. ✅
- #7 trend + narrative on #4/#5/#6 → Task 5 (#4), Task 4 narrative sub-line (#5), Task 6 Steps 2–3,5 (#6). ✅

**Placeholder scan:** No TBD/TODO; every code step contains complete code. The only intentional "no visible UI yet" note is Task 2 Step 5 — correctness is explicitly deferred to Task 4's visible verification, not left vague.

**Type/name consistency:** `his_legacy` key consistent across App.jsx (DEFAULT_DATA, result), DataVolume, InstallTracking. `series` added in Task 5 Step 1 and consumed by `wow()` in the same task. `wow`, `prodByCode`, `sumRange`, `Spark`, `last7Dates`, `prodDates` all defined before use within Task 5/6. `usePct`/`medal` reused from existing code (defined at ProductionData `:960-962`, unchanged). Empty-state `colSpan` updated to match the added columns (Task 6 Step 5).

**Known assumption:** HIS column header pattern (Task 2) — flagged in spec; isolated to one pattern array for easy correction.

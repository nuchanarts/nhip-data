# Usage Data Default + Insightful Charts — Design

Date: 2026-05-19
Status: Awaiting user review

## Goal

Make the **Usage Data** page the default entry point sourced from a new
Google Sheet, fix the Top-10 province chart so it reflects real usage
percentage, add legacy-HIS distribution charts and a 7-day OPD view, and
make the new/changed charts more insightful (trend + auto narrative).

All changes are confined to:
`src/App.jsx`, `src/pages/ProductionData.jsx`, `src/pages/DataVolume.jsx`,
`src/pages/InstallTracking.jsx`, `src/pages/HospList.jsx`.

## Requirements (locked scope — 7 items)

| # | Requirement |
|---|---|
| 1 | App opens on the Usage Data page (`production`) by default |
| 2 | Default Production sheet → `1a6nP3FBPka-DJeEzUk40_XiNYch_Eym-` |
| 3 | Reload Usage Data every time the page is opened |
| 4 | Top-10 จังหวัด bar = % of successful installs (not raw count) |
| 5 | ระบบ HIS เดิม distribution chart on Installation Data + Installation Report |
| 6 | Hospital List page: last-7-days daily OPD Visit columns |
| 7 | Trend (week-over-week) + auto-narrative insight on the #4/#5/#6 charts only |

## Design

### 1. Default landing page — `src/App.jsx`
`:499` `useState('overview')` → `useState('production')`.

### 2. Default Production data source — `src/App.jsx`
`:19` `PROD_SHEET_DEFAULT_URL` →
`https://docs.google.com/spreadsheets/d/1a6nP3FBPka-DJeEzUk40_XiNYch_Eym-/edit?usp=sharing&ouid=102765207545322381480&rtpof=true&sd=true`
This becomes both the auto-loaded source and the URL prefilled in the
Production page input (`prodSheetUrl` initializes from this constant).
Parser unchanged — user confirmed the same `เขต N` tab structure.

### 3. Reload Usage Data on page open — `src/App.jsx`
Add, mirroring the existing Defect pattern at `:642`:
```js
useEffect(() => {
  if (page === 'production') loadProdSheet()
}, [page]) // eslint-disable-line react-hooks/exhaustive-deps
```
Net: loads on app open (lands on Usage Data), reloads on every navigation
back to it; the existing 10-min auto-refresh timer is unchanged.

### 4. Correct Top-10 จังหวัด bar — `src/pages/ProductionData.jsx`
`:1031-1036`. Today the bar width is `count / global maxProvCount`, so it
does not match the displayed `%` or the rank order. Change:
- Foreground bar (`medal` color) width = `${usePct ?? 0}%`
  (`usePct` already computed at `:962` = `s.count / installedByProv[prov] * 100`).
- Keep the grey track (`#f1f5f9`) as the 100%-of-successful-installs baseline.
- Remove the `#dbeafe` `instProv` background bar (now misleading).
- Remove `maxProvCount` (`:173`) if unused elsewhere after this change.

### 5. ระบบ HIS เดิม distribution — parser + 2 pages
**Parser (`src/App.jsx`, `parseExcel` Sheet 5 reader, ~`:209-285`):**
- Add `hisLegacy` to the `s5col` pattern map and `fb5` fallback.
- Push `his_legacy` onto each `installList` row.
- Aggregate `result.his_legacy = { vendor: count }` (same shape/style as
  `result.provinceCnt`).

**ASSUMPTION TO CONFIRM:** the legacy-HIS column lives in the
install-detail sheet (`ข้อมูลผู้ติดตั้ง`, Sheet 5) and is auto-detected by a
header containing one of: `ระบบ HIS เดิม`, `HIS เดิม`, `ระบบเดิม`,
`โปรแกรมเดิม`, `HIS`. User to confirm exact tab + header.

**Display (`DataVolume.jsx` and `InstallTracking.jsx`):** add one
`chart-card` section "ระบบ HIS เดิม (สัดส่วน รพ.สต.)" — horizontal bar (or
pie) of `data.his_legacy`, styled like existing chart-cards on each page.

### 6. Hospital List — last-7-days OPD — `src/pages/HospList.jsx`
The table currently shows only install info (no OPD). Join
`data.productionVisits` by `hospcode`; append up to 7 columns for the last
7 entries of `data.productionDates` (header = date string, value = that
hospital's daily OPD Visit; blank/0 when no match). If the Production sheet
has fewer than 7 date columns, show only those available.

### 7. Insight treatment (trend + narrative) — #4/#5/#6 only
- **#4 Top-10:** per-province week-over-week OPD delta (last 7 days vs
  prior 7 days from `visits`) as a `↑/↓ %` chip; one narrative line above
  the list (e.g. "X จังหวัด ≥ 80% · Y จังหวัด < 50% · โตเร็วสุด: Z (+N%)").
- **#5 HIS:** one narrative summary under the chart (e.g. "ระบบเดิมที่พบ
  มากสุด: JHCIS N แห่ง (M%) จาก K ระบบ"). No trend — static historical data.
- **#6 Hospital List:** trailing 7-day sparkline + week-over-week `↑/↓` per
  row; header narrative (e.g. "OPD รวม 7 วันล่าสุด N ครั้ง +X% จากสัปดาห์ก่อน").

## Out of scope / not changed
- `parseProductionSheets` logic, the 10-min Production timer.
- Other pages (Overview, Facility, Defect, Workload, Installer, etc.).
- Manual Excel upload / Google Sheets popup controls.
- No dashboard-wide redesign — insight treatment is limited to #4/#5/#6.

## Risks / open items
- **HIS column location/header** is an assumption (see #5) — must be
  confirmed against the real sheet or the chart will be empty.
- **7-day data availability** (#6, #7): week-over-week needs ≥14 date
  columns in the Production sheet; sparkline needs ≥7. Fewer → degrade
  gracefully (show what exists, suppress the delta chip).
- Province week-over-week (#4/#7) assumes `visits` is ordered oldest→newest
  aligned with `productionDates`; verify during implementation.

## Testing
`npm run dev`:
1. App opens on Usage Data, data loaded from the new sheet.
2. Navigate away and back → Usage Data reloads.
3. Top-10 bars proportional to `%` and consistent with rank order
   (a 100% province shows a full bar).
4. ระบบ HIS เดิม chart renders on Installation Data + Installation Report.
5. Hospital List shows up to 7 daily OPD columns + sparkline/delta.
6. Narrative lines render with sensible values; degrade gracefully when
   date columns are insufficient.

"""
NHIP Dashboard — Streamlit App
Deploy: https://nhipteam-dashboard.streamlit.app
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import json
from pathlib import Path
from io import BytesIO

# ─── Page config ─────────────────────────────────────────────
st.set_page_config(
    page_title="NHIP Dashboard",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── CSS tweaks ───────────────────────────────────────────────
st.markdown("""
<style>
[data-testid="stSidebar"] { background: #1e3a8a; }
[data-testid="stSidebar"] * { color: #e2e8f0 !important; }
[data-testid="stSidebarNav"] { display:none; }
.metric-card { background:#fff; border-radius:12px; padding:16px 20px;
               box-shadow:0 1px 6px rgba(0,0,0,.08); }
div[data-testid="metric-container"] > div { font-size:13px; }
</style>
""", unsafe_allow_html=True)

# ─── Thai province → GeoJSON NAME_1 ──────────────────────────
THAI_TO_GEO = {
    'กรุงเทพมหานคร':'Bangkok Metropolis','สมุทรปราการ':'Samut Prakan','นนทบุรี':'Nonthaburi',
    'ปทุมธานี':'Pathum Thani','พระนครศรีอยุธยา':'Phra Nakhon Si Ayutthaya','อ่างทอง':'Ang Thong',
    'ลพบุรี':'Lop Buri','สิงห์บุรี':'Sing Buri','ชัยนาท':'Chai Nat','สระบุรี':'Saraburi',
    'ชลบุรี':'Chon Buri','ระยอง':'Rayong','จันทบุรี':'Chanthaburi','ตราด':'Trat',
    'ฉะเชิงเทรา':'Chachoengsao','ปราจีนบุรี':'Prachin Buri','นครนายก':'Nakhon Nayok','สระแก้ว':'Sa Kaeo',
    'นครราชสีมา':'Nakhon Ratchasima','บุรีรัมย์':'Buri Ram','สุรินทร์':'Surin','ศรีสะเกษ':'Si Sa Ket',
    'อุบลราชธานี':'Ubon Ratchathani','ยโสธร':'Yasothon','ชัยภูมิ':'Chaiyaphum','อำนาจเจริญ':'Amnat Charoen',
    'หนองบัวลำภู':'Nong Bua Lam Phu','ขอนแก่น':'Khon Kaen','อุดรธานี':'Udon Thani','เลย':'Loei',
    'หนองคาย':'Nong Khai','มหาสารคาม':'Maha Sarakham','ร้อยเอ็ด':'Roi Et','กาฬสินธุ์':'Kalasin',
    'สกลนคร':'Sakon Nakhon','นครพนม':'Nakhon Phanom','มุกดาหาร':'Mukdahan',
    'เชียงใหม่':'Chiang Mai','ลำพูน':'Lamphun','ลำปาง':'Lampang','อุตรดิตถ์':'Uttaradit',
    'แพร่':'Phrae','น่าน':'Nan','พะเยา':'Phayao','เชียงราย':'Chiang Rai','แม่ฮ่องสอน':'Mae Hong Son',
    'นครสวรรค์':'Nakhon Sawan','อุทัยธานี':'Uthai Thani','กำแพงเพชร':'Kamphaeng Phet','ตาก':'Tak',
    'สุโขทัย':'Sukhothai','พิษณุโลก':'Phitsanulok','พิจิตร':'Phichit','เพชรบูรณ์':'Phetchabun',
    'ราชบุรี':'Ratchaburi','กาญจนบุรี':'Kanchanaburi','สุพรรณบุรี':'Suphan Buri','นครปฐม':'Nakhon Pathom',
    'สมุทรสาคร':'Samut Sakhon','สมุทรสงคราม':'Samut Songkhram','เพชรบุรี':'Phetchaburi',
    'ประจวบคีรีขันธ์':'Prachuap Khiri Khan',
    'นครศรีธรรมราช':'Nakhon Si Thammarat','กระบี่':'Krabi','พังงา':'Phangnga','ภูเก็ต':'Phuket',
    'สุราษฎร์ธานี':'Surat Thani','ระนอง':'Ranong','ชุมพร':'Chumphon',
    'สงขลา':'Songkhla','สตูล':'Satun','ตรัง':'Trang','พัทลุง':'Phatthalung',
    'ปัตตานี':'Pattani','ยะลา':'Yala','นราธิวาส':'Narathiwat','บึงกาฬ':'Nong Khai',
}

# ─── Default data ─────────────────────────────────────────────
DEFAULT = {
    "job_status": {"รอติดตั้ง":2476,"ใช้งานระบบ":1049,"ใช้งานคู่ขนาน":617,"ไม่ได้ใช้งาน":351,"เลิกใช้งาน":14},
    "progress":   {"ยังไม่ติดตั้ง":2399,"ดำเนินการแล้ว":2087,"อยู่ในระหว่างดำเนินการ":21},
    "regions":    {"1":254,"2":431,"3":262,"4":616,"5":416,"6":380,"7":105,"8":409,"9":696,"10":432,"11":198,"12":310},
    "monthly":    {"2025-10":169,"2025-11":141,"2025-12":234,"2026-01":242,"2026-02":595,"2026-03":619},
    "standby_type":   {"การใช้งาน":1907,"ส่งออกข้อมูล":666,"ติดตั้งระบบ":368,"ข้อมูลพื้นฐาน":343,"Defect/BUG":65},
    "standby_status": {"ดำเนินการแล้ว":3276,"กำลังดำเนินการ":80,"รอดำเนินการ":79,"ไม่ดำเนินการ":1},
    "defect_status":  {"จัดทำ MANTIS":54,"รอแจ้งทีมพัฒนา":35,"แก้ไขเรียบร้อย":28,"รอทีมพัฒนา":14,"ยกเลิก":8},
    "defect_urgency": {"ด่วน":42,"ปกติ":106},
    "defect_system":  {"one stop service (สั่งยา)":13,"ภาพรวมระบบ":13,"การตั้งค่าระบบ":9,"บัญชี 1":8,"ส่งออกข้อมูล":7},
    "installers": [
        {"name":"ปอ","inProgress":3,"installed":109,"active":36,"parallel":63},
        {"name":"ครีม","inProgress":0,"installed":93,"active":54,"parallel":19},
        {"name":"แบงค์","inProgress":0,"installed":90,"active":67,"parallel":7},
        {"name":"ฟิวส์","inProgress":11,"installed":88,"active":21,"parallel":51},
        {"name":"ตูมตาม","inProgress":0,"installed":84,"active":83,"parallel":0},
        {"name":"จิ๋ว","inProgress":0,"installed":81,"active":27,"parallel":44},
        {"name":"เจ้าจอม","inProgress":0,"installed":77,"active":17,"parallel":51},
        {"name":"เอิน","inProgress":0,"installed":80,"active":33,"parallel":17},
        {"name":"อุ้ม","inProgress":0,"installed":60,"active":21,"parallel":12},
        {"name":"ต่าย","inProgress":12,"installed":64,"active":22,"parallel":38},
        {"name":"ดิส","inProgress":0,"installed":66,"active":11,"parallel":31},
        {"name":"นาย","inProgress":0,"installed":65,"active":6,"parallel":6},
        {"name":"แมน","inProgress":3,"installed":68,"active":12,"parallel":2},
    ],
    "regionDone": {"1":{"done":68,"total":254},"2":{"done":188,"total":431},"3":{"done":260,"total":262},
                   "4":{"done":555,"total":616},"5":{"done":291,"total":416},"6":{"done":218,"total":380},
                   "7":{"done":0,"total":105},"8":{"done":223,"total":409},"9":{"done":284,"total":696},
                   "10":{"done":0,"total":432},"11":{"done":0,"total":198},"12":{"done":0,"total":310}},
    "migrationDone": 493,
    "total": 4509,
}

# ─── Load GeoJSON ─────────────────────────────────────────────
@st.cache_data
def load_geojson():
    p = Path("src/data/thailand-provinces.json")
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return None

# ─── Load install list ────────────────────────────────────────
@st.cache_data
def load_install_list():
    p = Path("src/data/installData.json")
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return []

# ─── Parse Excel ─────────────────────────────────────────────
def parse_excel(file_bytes):
    import openpyxl
    from datetime import date, datetime
    wb = openpyxl.load_workbook(BytesIO(file_bytes), data_only=True)
    sheets = wb.sheetnames
    d = dict(DEFAULT)

    def safe_str(v): return str(v).strip() if v is not None else ''
    def safe_num(v):
        try: return int(float(str(v))) if v is not None else 0
        except: return 0

    # Sheet 5: ข้อมูลผู้ติดตั้ง (index 5)
    if len(sheets) > 5:
        ws = wb[sheets[5]]
        rows = list(ws.iter_rows(values_only=True))
        js, pg, rg, mo, rdone, pcnt = {}, {}, {}, {}, {}, {}
        install_list, mig_done = [], 0

        def fmt_date(v):
            if isinstance(v, (date, datetime)): return v.strftime('%d/%m/%Y')
            return ''

        for row in rows[1:]:
            if not row[0]: continue
            j = safe_str(row[11]); p2 = safe_str(row[10])
            region = None
            if row[1]:
                try: region = int(round(float(str(row[1]))))
                except: pass
            province = safe_str(row[3]); amphoe = safe_str(row[4])
            dt = row[5]

            if j: js[j] = js.get(j, 0) + 1
            if p2: pg[p2] = pg.get(p2, 0) + 1
            if region:
                rg[region] = rg.get(region, 0) + 1
                if region not in rdone: rdone[region] = {"done":0,"total":0}
                rdone[region]["total"] += 1
                if p2 == 'ดำเนินการแล้ว': rdone[region]["done"] += 1
            if province: pcnt[province] = pcnt.get(province, 0) + 1
            if row[7]: mig_done += 1

            if isinstance(dt, (date, datetime)):
                yr = dt.year - 543 if dt.year > 2100 else dt.year
                k = f"{yr}-{str(dt.month).zfill(2)}"
                if not k.startswith('1969'): mo[k] = mo.get(k, 0) + 1

            if len(install_list) < 500:
                install_list.append({
                    "hospcode": safe_str(row[0]), "region": region,
                    "name": safe_str(row[2]), "province": province, "amphoe": amphoe,
                    "install_date": fmt_date(row[5]),
                    "mig_start": fmt_date(row[6]), "mig_end": fmt_date(row[7]),
                    "trans_start": fmt_date(row[8]), "trans_end": fmt_date(row[9]),
                    "progress": p2, "status": j,
                    "finish_date": fmt_date(row[12]),
                    "responsible": safe_str(row[13]),
                })

        d["job_status"] = js; d["progress"] = pg
        d["regions"] = {str(k):v for k,v in sorted(rg.items())}
        d["monthly"] = dict(sorted({k:v for k,v in mo.items()}.items()))
        d["total"] = sum(js.values())
        d["regionDone"] = {str(k):v for k,v in rdone.items()}
        d["migrationDone"] = mig_done
        d["provinceCnt"] = dict(sorted(pcnt.items(), key=lambda x:-x[1])[:15])
        d["installList"] = install_list

    # Sheet 7: Standby
    if len(sheets) > 7:
        ws = wb[sheets[7]]
        rows = list(ws.iter_rows(values_only=True))
        st2, ss2 = {}, {}
        for row in rows[1:]:
            if not row[1]: continue
            t = safe_str(row[5]); s = safe_str(row[4])
            if t: st2[t] = st2.get(t, 0) + 1
            if s: ss2[s] = ss2.get(s, 0) + 1
        d["standby_type"] = dict(sorted({k:v for k,v in st2.items() if k}.items(), key=lambda x:-x[1])[:8])
        d["standby_status"] = {k:v for k,v in ss2.items() if k}

    # Sheet 8: Defect
    if len(sheets) > 8:
        ws = wb[sheets[8]]
        rows = list(ws.iter_rows(values_only=True))
        ds, dsys, du = {}, {}, {}
        for row in rows[2:]:
            if not row[0]: continue
            s = safe_str(row[4]); sys2 = safe_str(row[1]); u = safe_str(row[3])
            if s: ds[s] = ds.get(s, 0) + 1
            if sys2: dsys[sys2] = dsys.get(sys2, 0) + 1
            if u: du[u] = du.get(u, 0) + 1
        d["defect_status"] = {k:v for k,v in ds.items() if k}
        d["defect_urgency"] = {k:v for k,v in du.items() if k}
        d["defect_system"] = dict(sorted({k:v for k,v in dsys.items() if k}.items(), key=lambda x:-x[1])[:10])

    # Sheet 3: Installers
    if len(sheets) > 3:
        ws = wb[sheets[3]]
        rows = list(ws.iter_rows(values_only=True))
        inst = []
        for row in rows[5:]:
            if not row[0] or not row[1]: continue
            inst.append({"name": safe_str(row[2] or row[0]),
                         "inProgress": safe_num(row[3]), "installed": safe_num(row[4]),
                         "active": safe_num(row[5]), "parallel": safe_num(row[6])})
        if inst: d["installers"] = inst

    return d

# ─── Session state ────────────────────────────────────────────
if "data" not in st.session_state:
    st.session_state.data = dict(DEFAULT)
    st.session_state.data["installList"] = load_install_list()

# ─── Sidebar ──────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🏥 NHIP Dashboard")
    st.markdown("ระบบติดตามสถิติการติดตั้ง รพ.สต.")
    st.divider()

    page = st.radio("เมนูหลัก", [
        "🏠  ภาพรวมโครงการ",
        "🚀  ติดตามการติดตั้ง",
        "📊  ปริมาณข้อมูล HIS",
        "🐞  Defect & Request",
        "💬  ถาม-ตอบ / Stand-by",
        "👤  ทีมผู้ติดตั้ง",
    ], label_visibility="collapsed")

    st.divider()
    uploaded = st.file_uploader("📂 อัพโหลด Excel", type=["xlsx","xls"], label_visibility="collapsed")
    if uploaded:
        with st.spinner("กำลังอ่านไฟล์..."):
            try:
                st.session_state.data = parse_excel(uploaded.read())
                st.success(f"โหลดสำเร็จ: {uploaded.name}")
            except Exception as e:
                st.error(f"อ่านไม่ได้: {e}")

    st.caption(f"ข้อมูล: {st.session_state.data.get('total',0):,} แห่ง")

D = st.session_state.data
COLORS = ['#2563eb','#10b981','#f59e0b','#7c3aed','#06b6d4','#ef4444','#f97316','#84cc16']

# ════════════════════════════════════════════════════════════════
# PAGE: ภาพรวม
# ════════════════════════════════════════════════════════════════
if "ภาพรวม" in page:
    st.title("🏠 ภาพรวมโครงการ NHIP")
    st.caption("ขึ้นระบบแพลตฟอร์มกลางไปได้เท่าไหร่แล้ว? พบปัญหาอะไรบ้าง? แก้ยังไง?")

    js = D["job_status"]; pg = D["progress"]
    total = D["total"] or 1
    done = pg.get("ดำเนินการแล้ว", 0)
    waiting = js.get("รอติดตั้ง", 0)
    in_prog = pg.get("อยู่ในระหว่างดำเนินการ", 0)
    installed = js.get("ใช้งานระบบ", 0) + js.get("ใช้งานคู่ขนาน", 0)

    def_total = sum(D["defect_status"].values()) or 1
    def_done = D["defect_status"].get("แก้ไขเรียบร้อย", 0)
    std_total = sum(D["standby_status"].values()) or 1
    std_done = D["standby_status"].get("ดำเนินการแล้ว", 0)

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("🚀 ขึ้นระบบแล้ว", f"{done:,} แห่ง", f"{done/total*100:.1f}%")
    c2.metric("🏥 รพ.สต. ทั้งหมด", f"{total:,}", "100%")
    c3.metric("⚠️ Defect ทั้งหมด", f"{def_total:,} รายการ", f"แก้แล้ว {def_done/def_total*100:.0f}%")
    c4.metric("💬 Stand-by ตอบแล้ว", f"{std_done/std_total*100:.0f}%", f"{std_done:,}/{std_total:,}")
    st.divider()

    # KPI row 2
    c5, c6, c7, c8 = st.columns(4)
    c5.metric("✅ ใช้งานระบบแล้ว", f"{installed:,}", f"{installed/total*100:.1f}%")
    c6.metric("⏳ รอติดตั้ง", f"{waiting:,}", f"{waiting/total*100:.1f}%")
    c7.metric("🔄 กำลังดำเนินการ", f"{in_prog:,}", f"{in_prog/total*100:.1f}%")
    c8.metric("📦 Migration เสร็จ", f"{D.get('migrationDone',0):,}", f"{D.get('migrationDone',0)/total*100:.1f}%")

    col_l, col_r = st.columns([3, 2])
    with col_l:
        # Monthly chart
        mo = D["monthly"]
        mn_map = {'01':'ม.ค.','02':'ก.พ.','03':'มี.ค.','04':'เม.ย.','05':'พ.ค.','06':'มิ.ย.',
                  '07':'ก.ค.','08':'ส.ค.','09':'ก.ย.','10':'ต.ค.','11':'พ.ย.','12':'ธ.ค.'}
        mo_df = pd.DataFrame([
            {"เดือน": f"{mn_map.get(k.split('-')[1],k.split('-')[1])} {int(k.split('-')[0])+543}", "จำนวน": v}
            for k, v in sorted(mo.items())
        ])
        fig = px.area(mo_df, x="เดือน", y="จำนวน", title="จำนวนการติดตั้งรายเดือน",
                      color_discrete_sequence=["#2563eb"])
        fig.update_layout(height=280, margin=dict(t=40, b=20, l=0, r=0))
        st.plotly_chart(fig, use_container_width=True)

    with col_r:
        # Job status donut
        js_df = pd.DataFrame(list(D["job_status"].items()), columns=["สถานะ","จำนวน"])
        fig2 = px.pie(js_df, values="จำนวน", names="สถานะ", hole=0.5, title="สถานะงาน",
                      color_discrete_sequence=["#f59e0b","#10b981","#06b6d4","#ef4444","#94a3b8"])
        fig2.update_layout(height=280, margin=dict(t=40, b=0, l=0, r=0))
        st.plotly_chart(fig2, use_container_width=True)

    # Region bar
    rg_df = pd.DataFrame([{"เขต": f"เขต {k}", "จำนวน": v} for k,v in D["regions"].items()])
    fig3 = px.bar(rg_df, x="เขต", y="จำนวน", title="จำนวน รพ.สต. แยกตาม 12 เขตสุขภาพ",
                  color="จำนวน", color_continuous_scale="Blues")
    fig3.update_layout(height=260, margin=dict(t=40, b=20, l=0, r=0), coloraxis_showscale=False)
    st.plotly_chart(fig3, use_container_width=True)

# ════════════════════════════════════════════════════════════════
# PAGE: ติดตามการติดตั้ง
# ════════════════════════════════════════════════════════════════
elif "ติดตามการติดตั้ง" in page:
    st.title("🚀 ติดตามการติดตั้ง")
    rd = D["regionDone"]; total = D["total"] or 1
    total_done = sum(v["done"] for v in rd.values())
    st.metric("ดำเนินการแล้ว", f"{total_done:,} แห่ง", f"{total_done/total*100:.1f}% จาก {total:,}")

    rd_df = pd.DataFrame([
        {"เขต": f"เขต {k}", "ดำเนินการแล้ว": v["done"],
         "ยังไม่ดำเนินการ": v["total"]-v["done"], "total": v["total"],
         "pct": round(v["done"]/v["total"]*100,1) if v["total"] else 0}
        for k, v in sorted(rd.items(), key=lambda x: int(x[0]))
    ])

    fig = px.bar(rd_df, x="เขต", y=["ดำเนินการแล้ว","ยังไม่ดำเนินการ"],
                 title="ความคืบหน้าแยกตามเขต (Stacked)", barmode="stack",
                 color_discrete_map={"ดำเนินการแล้ว":"#10b981","ยังไม่ดำเนินการ":"#e2e8f0"})
    fig.update_layout(height=300, margin=dict(t=40,b=20,l=0,r=0))
    st.plotly_chart(fig, use_container_width=True)

    # Progress per region table
    st.subheader("% ความคืบหน้าแต่ละเขต")
    for _, row in rd_df.iterrows():
        pct = row["pct"]
        color = "🟢" if pct >= 80 else "🟡" if pct >= 50 else "🔴"
        st.progress(int(pct), text=f"{color} {row['เขต']} — {row['ดำเนินการแล้ว']:,.0f}/{row['total']:,.0f} ({pct}%)")

    # Monthly
    mo = D["monthly"]
    mn_map = {'01':'ม.ค.','02':'ก.พ.','03':'มี.ค.','04':'เม.ย.','05':'พ.ค.','06':'มิ.ย.',
              '07':'ก.ค.','08':'ส.ค.','09':'ก.ย.','10':'ต.ค.','11':'พ.ย.','12':'ธ.ค.'}
    mo_df = pd.DataFrame([
        {"เดือน": f"{mn_map.get(k.split('-')[1],k.split('-')[1])} {int(k.split('-')[0])+543}", "จำนวน": v}
        for k, v in sorted(mo.items())
    ])
    fig2 = px.bar(mo_df, x="เดือน", y="จำนวน", title="ยอดติดตั้งรายเดือน",
                  color_discrete_sequence=["#2563eb"])
    fig2.update_layout(height=260, margin=dict(t=40,b=20,l=0,r=0))
    st.plotly_chart(fig2, use_container_width=True)

# ════════════════════════════════════════════════════════════════
# PAGE: ปริมาณข้อมูล HIS
# ════════════════════════════════════════════════════════════════
elif "ปริมาณข้อมูล" in page:
    st.title("📊 ปริมาณข้อมูล HIS")
    install_list = D.get("installList", load_install_list())

    total = D["total"] or 1
    rd = D["regionDone"]
    total_done = sum(v["done"] for v in rd.values())

    c1,c2,c3,c4 = st.columns(4)
    c1.metric("🏥 รพ.สต. ทั้งหมด", f"{total:,}")
    c2.metric("✅ ดำเนินการแล้ว", f"{total_done:,}", f"{total_done/total*100:.1f}%")
    c3.metric("📦 Migration เสร็จ", f"{D.get('migrationDone',0):,}")
    c4.metric("⏳ ยังไม่ดำเนินการ", f"{total-total_done:,}")
    st.divider()

    # ─── Thailand Choropleth Map ───────────────────────────────
    st.subheader("🗺️ แผนที่ประเทศไทย — สถานะติดตั้งรายจังหวัด")
    geojson = load_geojson()
    if geojson and install_list:
        # Build province stats
        prov_stat = {}
        for r in install_list:
            pv = r.get("province","")
            thai = pv.split("-",1)[1] if "-" in pv else pv
            if not thai: continue
            if thai not in prov_stat:
                prov_stat[thai] = {"done":0,"inProgress":0,"total":0}
            prov_stat[thai]["total"] += 1
            if r.get("progress") == "ดำเนินการแล้ว":
                prov_stat[thai]["done"] += 1
            elif r.get("progress") == "อยู่ในระหว่างดำเนินการ":
                prov_stat[thai]["inProgress"] += 1

        # Build map dataframe (matched by GeoJSON NAME_1)
        map_rows = []
        for feat in geojson["features"]:
            eng = feat["properties"]["NAME_1"]
            if "(Songkhla Lake)" in eng or "(Phatthalung" in eng: continue
            thai = next((t for t,e in THAI_TO_GEO.items() if e==eng), None)
            stat = prov_stat.get(thai, {"done":0,"inProgress":0,"total":0}) if thai else {"done":0,"inProgress":0,"total":0}
            pct = round(stat["done"]/stat["total"]*100,1) if stat["total"] else 0
            if stat["total"] == 0:
                status_label = "ไม่มีข้อมูล"
            elif stat["done"]/stat["total"] >= 0.8:
                status_label = "ติดตั้งเสร็จ ≥80%"
            elif stat["done"]/stat["total"] >= 0.5:
                status_label = "ติดตั้งเสร็จ 50–79%"
            elif stat["done"]/stat["total"] >= 0.1:
                status_label = "ติดตั้งเสร็จ 10–49%"
            elif stat["inProgress"] > 0:
                status_label = "กำลังติดตั้ง"
            else:
                status_label = "ยังไม่ดำเนินการ"
            map_rows.append({
                "NAME_1": eng, "thai": thai or eng,
                "done": stat["done"], "inProgress": stat["inProgress"],
                "total": stat["total"], "pct": pct, "status": status_label
            })

        map_df = pd.DataFrame(map_rows)
        color_map = {
            "ติดตั้งเสร็จ ≥80%":     "#16a34a",
            "ติดตั้งเสร็จ 50–79%":    "#4ade80",
            "ติดตั้งเสร็จ 10–49%":    "#86efac",
            "กำลังติดตั้ง":           "#f97316",
            "ยังไม่ดำเนินการ":        "#fed7aa",
            "ไม่มีข้อมูล":            "#e2e8f0",
        }

        fig_map = px.choropleth(
            map_df,
            geojson=geojson,
            locations="NAME_1",
            featureidkey="properties.NAME_1",
            color="status",
            color_discrete_map=color_map,
            hover_name="thai",
            hover_data={"done":True,"inProgress":True,"total":True,"pct":True,"NAME_1":False,"status":False},
            labels={"done":"เสร็จแล้ว","inProgress":"กำลังติดตั้ง","total":"รวม","pct":"% เสร็จ","status":"สถานะ"},
            title="",
            category_orders={"status":list(color_map.keys())},
        )
        fig_map.update_geos(
            fitbounds="locations", visible=False,
            projection_type="mercator",
        )
        fig_map.update_layout(
            height=580, margin=dict(t=0,b=0,l=0,r=0),
            legend=dict(orientation="h", yanchor="bottom", y=1.01, xanchor="left", x=0),
        )
        st.plotly_chart(fig_map, use_container_width=True)

        # Top provinces table
        st.subheader("Top จังหวัด")
        top_df = map_df[map_df["total"]>0].sort_values("total", ascending=False).head(20)[[
            "thai","total","done","inProgress","pct","status"]]
        top_df.columns = ["จังหวัด","รวม","เสร็จ","กำลัง","% เสร็จ","สถานะ"]
        st.dataframe(top_df, use_container_width=True, hide_index=True)
    else:
        st.info("ไม่พบข้อมูล GeoJSON หรือ installList")

    # Install list table
    if install_list:
        st.subheader("รายการ รพ.สต.")
        df = pd.DataFrame(install_list)
        search = st.text_input("🔍 ค้นหา", placeholder="ชื่อ / hospcode / จังหวัด")
        if search:
            mask = pd.Series(False, index=df.index)
            for col in ["name","hospcode","province"]:
                if col in df.columns:
                    mask = mask | df[col].astype(str).str.contains(search, na=False)
            df = df[mask]
        cols = [c for c in ["hospcode","region","name","province","amphoe",
                             "install_date","progress","status","responsible"] if c in df.columns]
        st.dataframe(df[cols], use_container_width=True, hide_index=True, height=420)

# ════════════════════════════════════════════════════════════════
# PAGE: Defect & Request
# ════════════════════════════════════════════════════════════════
elif "Defect" in page:
    st.title("🐞 Defect & Request")
    ds = D["defect_status"]; du = D["defect_urgency"]
    dsys = D["defect_system"]
    def_total = sum(ds.values()) or 1
    def_done = ds.get("แก้ไขเรียบร้อย", 0)

    c1,c2,c3 = st.columns(3)
    c1.metric("📋 Defect ทั้งหมด", f"{def_total:,}")
    c2.metric("✅ แก้ไขเรียบร้อย", f"{def_done:,}", f"{def_done/def_total*100:.0f}%")
    c3.metric("🔴 ด่วน", f"{du.get('ด่วน',0):,}", f"ปกติ {du.get('ปกติ',0):,}")

    col_l, col_r = st.columns(2)
    with col_l:
        ds_df = pd.DataFrame(list(ds.items()), columns=["สถานะ","จำนวน"])
        fig = px.pie(ds_df, values="จำนวน", names="สถานะ", hole=0.45, title="สถานะ Defect")
        fig.update_layout(height=320, margin=dict(t=40,b=0,l=0,r=0))
        st.plotly_chart(fig, use_container_width=True)

    with col_r:
        sys_df = pd.DataFrame(list(dsys.items()), columns=["ระบบ","จำนวน"]).sort_values("จำนวน")
        fig2 = px.bar(sys_df, y="ระบบ", x="จำนวน", orientation="h", title="Defect แยกตามระบบ",
                      color="จำนวน", color_continuous_scale="Reds")
        fig2.update_layout(height=320, margin=dict(t=40,b=0,l=0,r=0), coloraxis_showscale=False)
        st.plotly_chart(fig2, use_container_width=True)

# ════════════════════════════════════════════════════════════════
# PAGE: Stand-by
# ════════════════════════════════════════════════════════════════
elif "Stand-by" in page:
    st.title("💬 ถาม-ตอบ / Stand-by")
    ss = D["standby_status"]; st2 = D["standby_type"]
    std_total = sum(ss.values()) or 1
    std_done = ss.get("ดำเนินการแล้ว", 0)

    c1,c2,c3 = st.columns(3)
    c1.metric("📞 ทั้งหมด", f"{std_total:,}")
    c2.metric("✅ ดำเนินการแล้ว", f"{std_done:,}", f"{std_done/std_total*100:.0f}%")
    c3.metric("⏳ รอดำเนินการ", f"{ss.get('รอดำเนินการ',0):,}")

    col_l, col_r = st.columns(2)
    with col_l:
        ss_df = pd.DataFrame(list(ss.items()), columns=["สถานะ","จำนวน"])
        fig = px.pie(ss_df, values="จำนวน", names="สถานะ", hole=0.45, title="สถานะการดำเนินการ",
                     color_discrete_sequence=["#10b981","#f59e0b","#ef4444","#94a3b8"])
        fig.update_layout(height=300, margin=dict(t=40,b=0,l=0,r=0))
        st.plotly_chart(fig, use_container_width=True)
    with col_r:
        st2_df = pd.DataFrame(list(st2.items()), columns=["ประเภท","จำนวน"]).sort_values("จำนวน")
        fig2 = px.bar(st2_df, y="ประเภท", x="จำนวน", orientation="h", title="ประเภทคำถาม",
                      color="จำนวน", color_continuous_scale="Purples")
        fig2.update_layout(height=300, margin=dict(t=40,b=0,l=0,r=0), coloraxis_showscale=False)
        st.plotly_chart(fig2, use_container_width=True)

# ════════════════════════════════════════════════════════════════
# PAGE: ทีมผู้ติดตั้ง
# ════════════════════════════════════════════════════════════════
elif "ทีมผู้ติดตั้ง" in page:
    st.title("👤 ทีมผู้ติดตั้ง")
    inst = D["installers"]
    if inst:
        df = pd.DataFrame(inst).sort_values("installed", ascending=False)
        df["installed"] = df["installed"].astype(int)
        df["inProgress"] = df["inProgress"].astype(int)

        c1,c2,c3 = st.columns(3)
        c1.metric("👥 ทีมทั้งหมด", len(inst))
        c2.metric("🏆 ติดตั้งมากสุด", f"{df.iloc[0]['name']} ({df.iloc[0]['installed']})")
        c3.metric("📦 รวมติดตั้งทั้งหมด", f"{df['installed'].sum():,}")

        fig = px.bar(df, y="name", x="installed", orientation="h",
                     title="จำนวนการติดตั้งแยกรายบุคคล",
                     color="installed", color_continuous_scale="Greens")
        fig.update_layout(height=420, margin=dict(t=40,b=0,l=0,r=0), coloraxis_showscale=False,
                          yaxis=dict(categoryorder="total ascending"))
        st.plotly_chart(fig, use_container_width=True)

        df_show = df[["name","installed","active","parallel","inProgress"]].copy()
        df_show.columns = ["ชื่อ","ติดตั้งแล้ว","ใช้งาน","คู่ขนาน","กำลังดำเนินการ"]
        st.dataframe(df_show, use_container_width=True, hide_index=True)

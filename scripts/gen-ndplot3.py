#!/usr/bin/env python3
"""Generate src/data/ndplot3.json from the NHSODP Lot 3 Excel.

Usage:
    python scripts/gen-ndplot3.py "path/to/NHSODP_Lot3_01062026_1.xlsx"

Reads Sheet1 with columns:
    ลำดับ, วันที่เริ่มส่งรายการ, HCODE, HCODE_NAME, รูปเเบบ, สังกัดหลัก, Software Vendor
and writes a compact JSON list.
"""
import json
import os
import sys

import openpyxl

DEFAULT_XLSX = r"c:/Users/MS-10/Downloads/NHSODP_Lot3_01062026_1.xlsx"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "ndplot3.json")


def norm(v):
    if v is None:
        return ""
    return str(v).strip()


def main():
    xlsx = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    wb = openpyxl.load_workbook(xlsx, read_only=True)
    ws = wb["Sheet1"]
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    out = []
    for r in rows:
        if r[0] is None:
            continue
        out.append({
            "seq": r[0] if isinstance(r[0], (int, float)) else norm(r[0]),
            "lot": norm(r[1]),
            "hcode": norm(r[2]),
            "hname": norm(r[3]),
            "type": norm(r[4]),
            "affiliation": norm(r[5]),
            "vendor": norm(r[6]),
        })
    with open(os.path.normpath(OUT), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"wrote {len(out)} records -> {os.path.normpath(OUT)}")


if __name__ == "__main__":
    main()

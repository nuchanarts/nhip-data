#!/usr/bin/env python3
"""Generate src/data/statement13ofc.json from the OFC Excel.

Usage:
    python scripts/gen-statement13ofc.py "path/to/รายชื่อหน่วยบริการเบิกสิทธิ์ OFC_Hosxp.xlsx"

Reads Sheet1 with columns:
    statement_hcode, statement_hname, total_txn,
    ตำบล/แขวง, อำเภอ/เขต, จังหวัด, เขต, Software Vendor
and writes a compact JSON list of หน่วยบริการ.
"""
import json
import os
import sys

import openpyxl

DEFAULT_XLSX = r"c:/Users/MS-10/Downloads/รายชื่อหน่วยบริการเบิกสิทธิ์ OFC_Hosxp.xlsx"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "statement13ofc.json")


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
            "hcode": norm(r[0]),
            "hname": norm(r[1]),
            "total_txn": r[2] if isinstance(r[2], (int, float)) else 0,
            "tambon": norm(r[3]),
            "amphoe": norm(r[4]),
            "province": norm(r[5]),
            "region": norm(r[6]),
            "vendor": norm(r[7]),
        })
    with open(os.path.normpath(OUT), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"wrote {len(out)} records -> {os.path.normpath(OUT)}")


if __name__ == "__main__":
    main()

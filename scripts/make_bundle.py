"""Menggabungkan semua data terolah menjadi data/data.js agar situs bisa dibuka
langsung dari file (tanpa server) maupun dari GitHub Pages."""
import json, os
D = os.path.join(os.path.dirname(__file__), "..", "data")
L = lambda f: json.load(open(os.path.join(D, f), encoding="utf-8"))
bundle = {"kabTopo": L("kabkota.topo.json"), "provTopo": L("provinsi.topo.json"), "kab": L("kabkota.json"),
          "prov": L("provinsi.json"), "flows": L("flows.json"), "stats": L("stats.json"), "sources": L("sumber_data.json")}
with open(os.path.join(D, "data.js"), "w", encoding="utf-8") as f:
    f.write("window.APP_DATA=" + json.dumps(bundle, separators=(",", ":"), ensure_ascii=False) + ";")
print("data.js", os.path.getsize(os.path.join(D, "data.js")) // 1024, "KB")

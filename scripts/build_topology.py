"""
Membangun TopoJSON ringan dari GeoJSON batas kab/kota hasil ekspor QGIS.
- Kuantisasi koordinat ke grid RES derajat
- Deteksi titik simpul (junction) supaya batas bersama antar kab/kota
  disederhanakan identik (tidak ada celah)
- Douglas-Peucker per busur (arc), buang pulau sangat kecil
- Hasil: data/kabkota.topo.json (objek 'kab') + garis batas provinsi ('provBorder')
Pemakaian: python build_topology.py kabkota_38prov.geojson ../data/kabkota.topo.json
"""
import json, sys, numpy as np
from collections import defaultdict

SRC, DST = sys.argv[1], sys.argv[2]
import os
RES = float(os.environ.get("RES","0.0005"))
EPS = float(os.environ.get("EPS","0.006")) / RES
X0, Y0 = 94.0, -11.5  # translate (Indonesia)
MIN_ISLAND = float(os.environ.get("MINI","0.04")) / RES

def rings_of(geom):
    t = geom["type"]
    if t == "Polygon": return [geom["coordinates"]]
    if t == "MultiPolygon": return geom["coordinates"]
    if t == "GeometryCollection":
        out = []
        for g in geom["geometries"]: out += rings_of(g)
        return out
    return []

feats = []      # (name, prov)
rings = []      # dict(f, poly, role, pts)
with open(SRC, encoding="utf-8") as fh:
    for line in fh:
        s = line.strip()
        if not s.startswith('{ "type": "Feature"'): continue
        if s.endswith(","): s = s[:-1]
        f = json.loads(s)
        fid = len(feats)
        pr = f["properties"]; feats.append((pr.get("WADMKK", pr["WADMPR"]), pr["WADMPR"]))
        for pi, poly in enumerate(rings_of(f["geometry"])):
            for ri, ring in enumerate(poly):
                a = np.asarray(ring, dtype=np.float64)[:, :2]
                q = np.empty((len(a), 2), dtype=np.int64)
                q[:, 0] = np.round((a[:, 0] - X0) / RES); q[:, 1] = np.round((a[:, 1] - Y0) / RES)
                keep = np.ones(len(q), bool); keep[1:] = np.any(q[1:] != q[:-1], axis=1)
                q = q[keep]
                if len(q) > 1 and (q[0] == q[-1]).all(): q = q[:-1]
                if len(q) < 3: continue
                rings.append(dict(f=fid, poly=pi, role="outer" if ri == 0 else "hole", pts=q))
        del f
print("features", len(feats), "rings", len(rings), "points", sum(len(r["pts"]) for r in rings))

# --- junction detection
def key(p): return (p[:, 0] << 32) | p[:, 1]
K, P1, P2, R = [], [], [], []
for i, r in enumerate(rings):
    k = key(r["pts"]); pv = np.roll(k, 1); nx = np.roll(k, -1)
    K.append(k); P1.append(np.minimum(pv, nx)); P2.append(np.maximum(pv, nx)); R.append(np.full(len(k), i))
K = np.concatenate(K); P1 = np.concatenate(P1); P2 = np.concatenate(P2)
o = np.lexsort((P2, P1, K)); Ks, P1s, P2s = K[o], P1[o], P2[o]
newkey = np.r_[True, Ks[1:] != Ks[:-1]]
newpair = newkey | np.r_[True, (P1s[1:] != P1s[:-1]) | (P2s[1:] != P2s[:-1])]
grp = np.cumsum(newkey) - 1
npairs = np.bincount(grp, weights=newpair)
junction_keys = set(Ks[newkey][npairs > 1].tolist()) if os.environ.get("TOPO","0")=="1" else set()
# kemunculan titik di lebih dari satu ring (untuk deteksi ring yang dibagi bersama)
print("junctions", len(junction_keys))

# --- drop tiny islands (ring tanpa junction, kecil, bukan ring terbesar fitur)
def diag(p): mn = p.min(0); mx = p.max(0); return float(np.hypot(*(mx - mn)))
largest = {}
for i, r in enumerate(rings):
    if r["role"] != "outer": continue
    d = diag(r["pts"])
    if r["f"] not in largest or d > largest[r["f"]][1]: largest[r["f"]] = (i, d)
kept = []
for i, r in enumerate(rings):
    k = key(r["pts"])
    hasj = any(int(x) in junction_keys for x in k)
    r["hasj"] = hasj
    if not hasj and diag(r["pts"]) < MIN_ISLAND and largest.get(r["f"], (None,))[0] != i:
        continue
    kept.append(r)
rings = kept
print("rings after island filter", len(rings))

# --- split into arcs
def dp(pts, eps):
    n = len(pts)
    if n <= 2: return pts
    keep = np.zeros(n, bool); keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2: continue
        seg = pts[a + 1:b].astype(float); A = pts[a].astype(float); B = pts[b].astype(float)
        d = B - A; L = np.hypot(*d)
        if L == 0: dist = np.hypot(*(seg - A).T)
        else: dist = np.abs(d[0] * (seg[:, 1] - A[1]) - d[1] * (seg[:, 0] - A[0])) / L
        m = int(np.argmax(dist))
        if dist[m] > eps:
            keep[a + 1 + m] = True; stack += [(a, a + 1 + m), (a + 1 + m, b)]
    return pts[keep]

arc_index = {}; arcs = []; arc_users = defaultdict(list)
def get_arc(seg, fid):
    s0, s1 = tuple(seg[0]), tuple(seg[-1])
    if s0 == s1:
        rev = tuple(seg[1]) > tuple(seg[-2])
    else:
        rev = s0 > s1
    c = seg[::-1] if rev else seg
    kb = c.tobytes()
    if kb not in arc_index:
        sp = dp(c, EPS)
        if s0 == s1 and len(sp) < 4:   # loop: pertahankan min. bentuk segitiga
            idx = np.linspace(0, len(c) - 1, 4).round().astype(int); sp = c[idx]
        arc_index[kb] = len(arcs); arcs.append(sp)
    a = arc_index[kb]
    arc_users[a].append(fid)
    return ~a if rev else a

geoms = defaultdict(list)  # f -> list of polygons(list of rings arc refs)
polys = {}
for r in rings:
    p = r["pts"]; k = key(p)
    jidx = [i for i, x in enumerate(k.tolist()) if x in junction_keys]
    if not jidx:
        jidx = [int(np.argmin(k))]
    start = jidx[0]
    p2 = np.vstack([p[start:], p[:start], p[start:start + 1]])
    jset = sorted(((j - start) % len(p)) for j in jidx) + [len(p)]
    refs = []
    for a, b in zip(jset[:-1], jset[1:]):
        refs.append(get_arc(p2[a:b + 1], r["f"]))
    polys.setdefault((r["f"], r["poly"]), []).append((r["role"], refs))

def ring_coords(refs):
    out = []
    for a in refs:
        c = arcs[a] if a >= 0 else arcs[~a][::-1]
        out.append(c if not out else c[1:])
    return np.vstack(out)
def sarea(c):
    x, y = c[:, 0].astype(float), c[:, 1].astype(float)
    return 0.5 * np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y)

out_geoms = []
for fid, (nm, pv) in enumerate(feats):
    mp = []
    for (f, pi), rl in sorted(polys.items()):
        if f != fid: continue
        poly = []
        for role, refs in rl:
            A = sarea(ring_coords(refs))
            if A == 0 and role == "hole": continue
            want_neg = role == "outer"         # d3: exterior searah jarum jam
            if (A > 0 and want_neg) or (A < 0 and not want_neg):
                refs = [~x for x in reversed(refs)]
            if role == "outer": poly.insert(0, refs)
            else: poly.append(refs)
        if poly and len(poly[0]): mp.append(poly)
    out_geoms.append({"type": "MultiPolygon", "arcs": mp, "properties": {"kab": nm, "prov": pv}})

# provinsi: busur yang dipakai oleh kab/kota dari dua provinsi berbeda
prov_border, adj = [], set()
for a, us in arc_users.items():
    uniq = sorted(set(us))
    if len(uniq) == 2:
        adj.add(tuple(uniq))
        if feats[uniq[0]][1] != feats[uniq[1]][1]: prov_border.append([a])

def enc(c):
    d = np.diff(c, axis=0, prepend=np.zeros((1, 2), np.int64)); return d.tolist()
topo = {"type": "Topology", "transform": {"scale": [RES, RES], "translate": [X0, Y0]},
        "arcs": [enc(a) for a in arcs],
        "objects": {"kab": {"type": "GeometryCollection", "geometries": out_geoms},
                    "provBorder": {"type": "MultiLineString", "arcs": prov_border}}}
json.dump(topo, open(DST, "w"), separators=(",", ":"))
print("arcs", len(arcs), "points", sum(len(a) for a in arcs))

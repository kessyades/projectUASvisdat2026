"""
Pra-pemrosesan data untuk web story "Magnet dan Pelepas".
Input : Data_compile.xlsx (data BPS), centroid_34prov.xlsx, data/kabkota.topo.json
Output: data/kabkota.json, data/provinsi.json, data/flows.json, data/stats.json
Pemakaian: python prep_data.py <folder_input>
Join antar tabel memakai NAMA provinsi dan kab/kota yang dinormalkan.
"""
import json, re, sys, os
import numpy as np, pandas as pd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from scipy.cluster.hierarchy import linkage, fcluster, dendrogram

IN = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = os.path.join(os.path.dirname(__file__), "..", "data")
X = os.path.join(IN, "Data_compile.xlsx")
rng = np.random.default_rng(2026)

def norm(s): return re.sub(r"[^a-z0-9]", "", str(s).lower())
ISLAND = {"1": "Sumatera", "2": "Sumatera", "3": "Jawa", "5": "Bali & Nusa Tenggara", "6": "Kalimantan",
          "7": "Sulawesi", "8": "Maluku", "9": "Papua"}

# ---------------- kab/kota
a1 = pd.read_excel(X, "A1_indikator").drop(columns=["catatan"], errors="ignore")
a2 = pd.read_excel(X, "A2_umur_total")
agecols = [c for c in a2.columns if re.fullmatch(r"t\d+(_\d+|plus)", c)]
kab = a1.merge(a2[["nama_prov", "nama_kabkota", "total"] + agecols], on=["nama_prov", "nama_kabkota"], how="left", validate="1:1")
assert kab["total"].notna().all()
kab["key"] = kab.nama_prov.map(norm) + "|" + kab.nama_kabkota.map(norm)
kab["pulau"] = kab.kode_kabkota.astype(str).str[0].map(ISLAND)
kab["jenis"] = np.where(kab.nama_kabkota.str.startswith("Kota "), "Kota", "Kabupaten")

# centroid kab/kota dari geometri (ring luar terbesar)
topo = json.load(open(os.path.join(OUT, "kabkota.topo.json")))
sc, tr = topo["transform"]["scale"], topo["transform"]["translate"]
arcs = [np.cumsum(np.array(x), 0) * sc + tr for x in topo["arcs"]]
def ring(refs):
    out = []
    for r in refs:
        c = arcs[r] if r >= 0 else arcs[~r][::-1]
        out.append(c if not out else c[1:])
    return np.vstack(out)
cent = {}
for g in topo["objects"]["kab"]["geometries"]:
    best = None
    for poly in g["arcs"]:
        c = ring(poly[0]); x, y = c[:, 0], c[:, 1]
        cr = x * np.roll(y, -1) - np.roll(x, -1) * y; A = cr.sum() / 2
        if A == 0: continue
        cx = ((x + np.roll(x, -1)) * cr).sum() / (6 * A); cy = ((y + np.roll(y, -1)) * cr).sum() / (6 * A)
        if best is None or abs(A) > best[0]: best = (abs(A), cx, cy)
    cent[norm(g["properties"]["prov"]) + "|" + norm(g["properties"]["kab"])] = best[1:]
missing = set(kab.key) - set(cent); extra = set(cent) - set(kab.key)
assert not missing and not extra, (missing, extra)
kab["lon"] = kab.key.map(lambda k: cent[k][0]); kab["lat"] = kab.key.map(lambda k: cent[k][1])

# ---------------- LISA (Local Moran's I), bobot 6 tetangga terdekat (centroid), standardisasi baris
LISA_VARS = ["tfr", "imr", "rasio_ketergantungan", "lansia_65plus", "umur_20_39", "rasio_jk"]
xy = np.c_[kab.lon * np.cos(np.radians(kab.lat)), kab.lat]
D = np.hypot(xy[:, None, 0] - xy[None, :, 0], xy[:, None, 1] - xy[None, :, 1]); np.fill_diagonal(D, np.inf)
K = 6; NB = np.argsort(D, 1)[:, :K]; n = len(kab)
moran = {}
for v in LISA_VARS:
    z = kab[v].values.astype(float); z = (z - z.mean()) / z.std()
    lag = z[NB].mean(1)
    I = (z * lag).sum() / (z * z).sum()
    perm = np.array([(z * rng.permutation(z)[NB].mean(1)).sum() / (z * z).sum() for _ in range(999)])
    pI = (np.sum(perm >= I) + 1) / 1000
    Ii = z * lag
    # permutasi bersyarat
    cnt = np.zeros(n)
    for _ in range(999):
        Rm = rng.random((n, n)); np.fill_diagonal(Rm, np.inf)
        pool = np.argpartition(Rm, K, axis=1)[:, :K]
        sim = z * z[pool].mean(1)
        cnt += (np.abs(sim) >= np.abs(Ii))
    p = (cnt + 1) / 1000
    q = np.where(p >= 0.05, "ns", np.where(z > 0, np.where(lag > 0, "HH", "HL"), np.where(lag > 0, "LH", "LL")))
    kab["lisa_" + v] = q
    moran[v] = {"I": round(float(I), 3), "p": round(float(pI), 3)}
    print("Moran", v, moran[v], pd.Series(q).value_counts().to_dict())

# ---------------- provinsi
b = pd.read_excel(X, "B_provinsi")
b = b[b.nama_prov.notna() & b.kode_prov.notna()].copy()
b["kode_prov"] = b.kode_prov.astype(int)
ag = kab.groupby("nama_prov")[["total"] + agecols].sum()
young = [c for c in agecols if c in ("t0_4", "t5_9", "t10_14")]; old = ["t65_69", "t70_74", "t75plus"]
mid = ["t20_24", "t25_29", "t30_34", "t35_39"]
ag["pct_65plus"] = ag[old].sum(axis=1) / ag.total * 100
ag["pct_20_39"] = ag[mid].sum(axis=1) / ag.total * 100
ag["pct_0_14"] = ag[young].sum(axis=1) / ag.total * 100
b = b.merge(ag[["total", "pct_65plus", "pct_20_39", "pct_0_14"]].reset_index(), on="nama_prov", how="left", validate="1:1")
assert b.total.notna().all() and len(b) == 38
b["pulau"] = b.kode_prov.astype(str).str[0].map(ISLAND)
b["log_kepadatan"] = np.log10(b.kepadatan)

PCA_VARS = ["mig_masuk_pct", "mig_keluar_pct", "tfr_prov", "imr_prov", "rasio_ketergantungan_prov",
            "laju_pertumbuhan", "log_kepadatan", "rasio_jk_prov", "gini_2025", "pct_65plus", "pct_20_39"]
VAR_LABEL = {"mig_masuk_pct": "Migran masuk (%)", "mig_keluar_pct": "Migran keluar (%)", "tfr_prov": "TFR",
             "imr_prov": "Kematian bayi", "rasio_ketergantungan_prov": "Rasio ketergantungan",
             "laju_pertumbuhan": "Laju pertumbuhan (%)", "log_kepadatan": "Kepadatan (log10)",
             "rasio_jk_prov": "Rasio jenis kelamin", "gini_2025": "Gini", "pct_65plus": "Umur 65+ (%)",
             "pct_20_39": "Umur 20–39 (%)"}
ok = b[PCA_VARS].notna().all(axis=1)
Z = StandardScaler().fit_transform(b.loc[ok, PCA_VARS])
pca = PCA().fit(Z); S = pca.transform(Z)
L = linkage(Z, "ward")
sil = {k: silhouette_score(Z, fcluster(L, k, "maxclust")) for k in range(3, 7)}
# k=4 dipilih: silhouette (0,25) hampir sama dengan k=3 (0,28), tetapi k=3 menggabungkan
# provinsi "frontier" (Kaltim, Kaltara, Kepri, dst.) ke kelompok umum sehingga kurang informatif
kbest = 4; print("silhouette", sil, "k=", kbest)
cl = fcluster(L, kbest, "maxclust")
names_tmp = b.loc[ok, "nama_prov"].tolist()
anchor = {"Jawa Tengah": 1, "Papua": 2, "Kalimantan Timur": 4}
remap = {cl[names_tmp.index(p)]: v for p, v in anchor.items()}
remap.update({c: 3 for c in set(cl) if c not in remap})
cl = np.array([remap[c] for c in cl])
dn = dendrogram(L, no_plot=True, labels=b.loc[ok, "nama_prov"].tolist())
b.loc[ok, "pc1"] = S[:, 0]; b.loc[ok, "pc2"] = S[:, 1]; b.loc[ok, "cluster"] = cl
Zdf = pd.DataFrame(Z, columns=PCA_VARS, index=b.loc[ok, "nama_prov"])
Dz = np.hypot.reduce if False else None
dist = np.sqrt(((Z[:, None, :] - Z[None, :, :]) ** 2).sum(-1))
names_ok = b.loc[ok, "nama_prov"].tolist()
twins = {names_ok[i]: [[names_ok[j], round(float(dist[i, j]), 2)] for j in np.argsort(dist[i])[1:4]] for i in range(len(names_ok))}
# urutan variabel untuk heatmap: klaster variabel
Lv = linkage(Z.T, "average", metric="correlation"); var_order = [PCA_VARS[i] for i in dendrogram(Lv, no_plot=True)["leaves"]]
prof = Zdf.assign(c=cl).groupby("c").mean()
print(prof.round(2).T)
print(b.loc[ok, ["nama_prov", "cluster", "pc1", "pc2"]].sort_values("cluster").to_string())

# ---------------- arus 2020
m = pd.read_excel(X, "C_matriks_raw", header=None)
hdr = m.iloc[1].tolist(); provs = [h for h in hdr[2:] if h not in ("Luar Negeri", "Jumlah (BPS)")]
rows = m[m[1].isin(provs)].set_index(1)
mat = rows[[hdr.index(p) for p in provs]].astype(float); mat.columns = provs; mat = mat.loc[provs]
ln = rows[hdr.index("Luar Negeri")].astype(float).loc[provs]; tot = rows[hdr.index("Jumlah (BPS)")].astype(float).loc[provs]
M = mat.values  # baris=tujuan, kolom=asal
inn = M.sum(1) - np.diag(M); out = M.sum(0) - np.diag(M)
flows = [{"o": provs[j], "d": provs[i], "v": int(M[i, j])} for i in range(len(provs)) for j in range(len(provs)) if i != j and M[i, j] > 0]
c34 = pd.read_excel(os.path.join(IN, "centroid_34prov.xlsx"))
cen = {norm(r.WADMPR): (float(r.lon), float(r.lat)) for r in c34.itertuples()}
assert all(norm(p) in cen for p in provs)
code2020 = dict(zip(provs, m.iloc[2, 2:2 + len(provs)].astype(int)))
p2020 = [{"prov": p, "kode": int(code2020[p]), "lon": cen[norm(p)][0], "lat": cen[norm(p)][1],
          "pulau": ISLAND[str(code2020[p])[0]], "masuk": int(inn[i]), "keluar": int(out[i]), "dalam": int(M[i, i]),
          "luar_negeri": int(ln.iloc[i]), "pop5": int(tot.iloc[i]),
          "neto_pct": round(float((inn[i] - out[i]) / tot.iloc[i] * 100), 2)} for i, p in enumerate(provs)]
tot_inter = int(inn.sum())
print("total antarprovinsi 2020", tot_inter, "LN", int(ln.sum()))
top = sorted(flows, key=lambda f: -f["v"])[:10]; print(top)

# ---------------- slope 2020 vs 2025 (32 provinsi non-Papua)
PAPUA = {"Papua", "Papua Barat"}
s20 = pd.DataFrame(p2020).set_index("prov")["neto_pct"]
s25 = b.set_index("nama_prov")["mig_neto_pct"]
common = [p for p in provs if p not in PAPUA]
r20 = s20.loc[common].rank(ascending=False, method="first").astype(int)
r25 = s25.loc[common].rank(ascending=False, method="first").astype(int)
slope = [{"prov": p, "neto2020": float(s20[p]), "neto2025": float(s25[p]), "r2020": int(r20[p]), "r2025": int(r25[p])} for p in common]

# ---------------- simpan
def clean(v):
    if isinstance(v, (np.floating, float)):
        return None if np.isnan(v) else round(float(v), 4)
    if isinstance(v, (np.integer,)): return int(v)
    return v
kab_cols = ["kode_kabkota", "nama_prov", "nama_kabkota", "pulau", "jenis", "lon", "lat", "tfr", "imr", "anak_0_14", "produktif_15_64",
            "lansia_65plus", "umur_20_39", "rasio_ketergantungan", "rasio_jk", "rasio_jk_20_39", "total"] + agecols + ["lisa_" + v for v in LISA_VARS]
json.dump([{k: clean(r[k]) for k in kab_cols} for _, r in kab.iterrows()], open(os.path.join(OUT, "kabkota.json"), "w"), separators=(",", ":"), ensure_ascii=False)
prov_cols = ["kode_prov", "nama_prov", "pulau", "mig_masuk_pct", "mig_keluar_pct", "mig_neto_pct", "mig_masuk_jml", "mig_keluar_jml", "mig_neto_jml",
             "tfr_prov", "imr_prov", "rasio_ketergantungan_prov", "laju_pertumbuhan", "kepadatan", "log_kepadatan", "rasio_jk_prov", "gini_2025",
             "total", "pct_65plus", "pct_20_39", "pct_0_14", "pc1", "pc2", "cluster"]
json.dump({"rows": [{k: clean(r[k]) for k in prov_cols} for _, r in b.iterrows()],
           "pca": {"vars": PCA_VARS, "labels": VAR_LABEL, "explained": [round(float(x), 4) for x in pca.explained_variance_ratio_[:4]],
                   "loadings": {v: [round(float(pca.components_[0, i]), 4), round(float(pca.components_[1, i]), 4)] for i, v in enumerate(PCA_VARS)},
                   "z": {p: [round(float(x), 3) for x in Zdf.loc[p]] for p in Zdf.index}, "var_order": var_order,
                   "leaf_order": dn["ivl"], "dendro": {"icoord": dn["icoord"], "dcoord": dn["dcoord"]},
                   "k": int(kbest), "silhouette": {str(k): round(float(v), 3) for k, v in sil.items()},
                   "excluded": b.loc[~ok, "nama_prov"].tolist()},
           "twins": twins}, open(os.path.join(OUT, "provinsi.json"), "w"), separators=(",", ":"), ensure_ascii=False)
json.dump({"provinces": p2020, "flows": flows, "slope": slope, "total_antarprovinsi": tot_inter, "total_luar_negeri": int(ln.sum()),
           "total_dalam": int(np.diag(M).sum())}, open(os.path.join(OUT, "flows.json"), "w"), separators=(",", ":"), ensure_ascii=False)
json.dump({"moran": moran, "lisa_k": K, "n_kab": int(len(kab)),
           "mig2025_masuk_total": int(b.mig_masuk_jml.sum()), "n_magnet_2025": int((b.mig_neto_pct > 0).sum()),
           "n_pelepas_2025": int((b.mig_neto_pct < 0).sum())}, open(os.path.join(OUT, "stats.json"), "w"), indent=1)
print("OK")

/* Utilitas bersama */
const D = window.APP_DATA;
const APP = { reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches };

const LOC = d3.formatLocale({ decimal: ",", thousands: ".", grouping: [3], currency: ["Rp", ""] });
const fmt = {
  int: LOC.format(",.0f"),
  d1: LOC.format(",.1f"),
  d2: LOC.format(",.2f"),
  signed2: LOC.format("+,.2f"),
  compact: v => v >= 1e6 ? LOC.format(",.2~f")(v / 1e6) + " juta" : v >= 1e3 ? LOC.format(",.1~f")(v / 1e3) + " ribu" : LOC.format(",.0f")(v),
};
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const keyOf = (prov, kab) => norm(prov) + "|" + norm(kab);
const minus = s => String(s).replace(/^-/, "−");

/* Palet aman buta warna */
const COL = {
  in: "#2166AC", out: "#E08214", na: "#BDBDBD", ink: "#1F2933", navy: "#0F1B2D",
  seq: ["#ffffcc", "#a1dab4", "#41b6c4", "#2c7fb8", "#253494"],             // ColorBrewer YlGnBu 5
  div6: ["#542788", "#998ec3", "#d8daeb", "#fee0b6", "#f1a340", "#b35806"], // PuOr 6 (ungu ← → oranye)
  biv: [["#E8E8E8", "#B0D5DF", "#64ACBE"], ["#E4ACAC", "#AD9EA5", "#627F8C"], ["#C85A5A", "#985356", "#574249"]],
  lisa: { HH: "#E08214", LL: "#2166AC", HL: "#F6C38A", LH: "#92C5DE", ns: "#EEF1F4" },
  cluster: { 1: "#0072B2", 2: "#D55E00", 3: "#009E73", 4: "#CC79A7" },      // Okabe–Ito
  island: {
    "Sumatera": "#E69F00", "Jawa": "#56B4E9", "Bali & Nusa Tenggara": "#009E73", "Kalimantan": "#F0E442",
    "Sulawesi": "#0072B2", "Maluku": "#D55E00", "Papua": "#CC79A7"
  },
};
const ISLANDS = Object.keys(COL.island);
const divergeNet = d3.scaleDiverging([-2, 0, 2], t => d3.interpolateRgbBasis(["#B35806", "#E08214", "#FDDBB0", "#F7F7F7", "#BBD6EE", "#4C8DC9", "#2166AC"])(t)).clamp(true);

const CLUSTER_INFO = {
  1: { nama: "Penduduk Stabil", desk: "Kelahiran dan pertumbuhan penduduk relatif rendah, sementara proporsi lansia cukup tinggi.", shape: d3.symbolCircle },
  2: { nama: "Kelahiran Tinggi, Tantangan Besar", desk: "Angka kelahiran, kematian bayi, dan ketergantungan penduduk relatif tinggi.", shape: d3.symbolTriangle },
  3: { nama: "Kondisi Menengah, Mobilitas Rendah", desk: "Mendekati rata-rata nasional; perpindahan keluar dan ketimpangan yang relatif rendah.", shape: d3.symbolSquare },
  4: { nama: "Mobilitas Tinggi", desk: "Migran masuk dan keluar tinggi, porsi umur 20–39 dan rasio laki-laki tinggi, kepadatan penduduk rendah.", shape: d3.symbolDiamond },
};

/* Dekoder TopoJSON sederhana */
function topoFeatures(topo, obj) {
  const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
  const ring = refs => { const out = []; refs.forEach(r => { const c = r >= 0 ? arcs[r] : arcs[~r].slice().reverse(); (out.length ? c.slice(1) : c).forEach(p => out.push(p)); }); return out; };
  return topo.objects[obj].geometries.map(g => ({
    type: "Feature", properties: g.properties,
    geometry: { type: "MultiPolygon", coordinates: g.arcs.map(poly => poly.map(ring)) }
  }));
}

/* Tooltip */
const TIP = (() => {
  const el = document.getElementById("tip");
  return {
    show(html, ev) { el.innerHTML = html; el.classList.add("show"); this.move(ev); },
    move(ev) {
      if (!ev) return;
      const x = ev.clientX ?? (ev.touches && ev.touches[0].clientX), y = ev.clientY ?? (ev.touches && ev.touches[0].clientY);
      const w = el.offsetWidth, h = el.offsetHeight;
      let left = x + 14, top = y + 14;
      if (left + w > window.innerWidth - 8) left = x - w - 14;
      if (top + h > window.innerHeight - 8) top = y - h - 14;
      el.style.left = Math.max(8, left) + "px"; el.style.top = Math.max(8, top) + "px";
    },
    hide() { el.classList.remove("show"); },
  };
})();

/* Scrollytelling: memicu callback saat kartu langkah melewati tengah layar */
function makeScroller(container, onStep) {
  const steps = [...container.querySelectorAll(".step")];
  let current = -1;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const i = +e.target.dataset.step;
      if (i === current) return;
      current = i;
      steps.forEach(s => s.classList.toggle("active", +s.dataset.step === i));
      onStep(i);
    });
  }, { rootMargin: window.innerWidth <= 900 ? "-74% 0px -18% 0px" : "-45% 0px -45% 0px" });
  steps.forEach(s => io.observe(s));
}

/* Tombol segmented */
function segmented(el, onChange) {
  el.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    setSeg(el, b.dataset.v); onChange(b.dataset.v);
  });
}
function setSeg(el, v) { el.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.v === v))); }

/* Ukuran elemen */
function sizeOf(el) { const r = el.getBoundingClientRect(); return [Math.max(10, r.width), Math.max(10, r.height)]; }
function onResize(el, cb, watchHeight = false) {
  let t, lw = el.clientWidth, lh = el.clientHeight;
  new ResizeObserver(() => {
    const w = el.clientWidth, h = el.clientHeight;
    if (Math.abs(w - lw) < 2 && (!watchHeight || Math.abs(h - lh) < 2)) return;
    lw = w; lh = h; clearTimeout(t); t = setTimeout(cb, 150);
  }).observe(el);
}

/* Indeks data */
const KAB = D.kab.map(d => ({ ...d, key: keyOf(d.nama_prov, d.nama_kabkota) }));
const KAB_BY = new Map(KAB.map(d => [d.key, d]));
const PROV = D.prov.rows;
const PROV_BY = new Map(PROV.map(d => [norm(d.nama_prov), d]));
const AGE = ["t0_4", "t5_9", "t10_14", "t15_19", "t20_24", "t25_29", "t30_34", "t35_39", "t40_44", "t45_49", "t50_54", "t55_59", "t60_64", "t65_69", "t70_74", "t75plus"];
const AGE_LABEL = ["0–4", "5–9", "10–14", "15–19", "20–24", "25–29", "30–34", "35–39", "40–44", "45–49", "50–54", "55–59", "60–64", "65–69", "70–74", "75+"];
const NAT_AGE = (() => { const t = d3.sum(KAB, d => d.total); return AGE.map(a => d3.sum(KAB, d => d[a]) / t * 100); })();
const SRC = Object.fromEntries(D.sources.map(s => [s.id, s]));
function srcLink(id, text) { const s = SRC[id]; return `<a href="${s.url}" target="_blank" rel="noopener">${text || s.judul}</a>`; }

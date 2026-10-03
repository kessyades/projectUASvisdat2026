/* Bab 1: Peta demografi 514 kab/kota (choropleth, simbol proporsional, bivariat, LISA) */
const MapCh = (() => {
  const VARS = {
    tfr: { label: "Angka kelahiran total (TFR)", short: "TFR", unit: "anak per perempuan", f: fmt.d2, src: "tfr_kab", lisa: true },
    imr: { label: "Angka kematian bayi (IMR)", short: "IMR", unit: "per 1.000 kelahiran hidup", f: fmt.d2, src: "akb_kab", lisa: true },
    rasio_ketergantungan: { label: "Rasio ketergantungan", short: "Rasio ketergantungan", unit: "per 100 penduduk 15–64", f: fmt.d1, src: "umur", lisa: true },
    lansia_65plus: { label: "% penduduk umur 65+", short: "% 65+", unit: "%", f: fmt.d1, src: "umur", lisa: true },
    umur_20_39: { label: "% penduduk umur 20–39", short: "% 20–39", unit: "%", f: fmt.d1, src: "umur", lisa: true },
    anak_0_14: { label: "% penduduk umur 0–14", short: "% 0–14", unit: "%", f: fmt.d1, src: "umur", lisa: false },
    rasio_jk: { label: "Rasio jenis kelamin", short: "Rasio JK", unit: "laki-laki per 100 perempuan", f: fmt.d1, src: "umur_l", lisa: true, div: true },
    rasio_jk_20_39: { label: "Rasio jenis kelamin umur 20–39", short: "Rasio JK 20–39", unit: "laki-laki per 100 perempuan", f: fmt.d1, src: "umur_l", lisa: false, div: true },
  };
  const DIV_BREAKS = [96, 99, 101, 104, 108];
  const S = { v: "tfr", mode: "choropleth", cls: "quantile", hl: null, classHl: null, sel: null, cmp: null, annot: [] };

  const body = document.getElementById("mapBody"), svg = d3.select("#mapSvg");
  const feats = topoFeatures(D.kabTopo, "kab").map(f => (f.data = KAB_BY.get(keyOf(f.properties.prov, f.properties.kab)), f));
  const provFeats = topoFeatures(D.provTopo, "kab");
  const zoomLayer = svg.append("g"), gKab = zoomLayer.append("g"), gProv = zoomLayer.append("g"), gSym = zoomLayer.append("g");
  const gAnnot = svg.append("g").attr("pointer-events", "none");
  let proj, path, W, H, T = d3.zoomIdentity;
  const zoom = d3.zoom().scaleExtent([1, 40]).on("zoom", e => { T = e.transform; zoomLayer.attr("transform", T); gSym.selectAll("circle").attr("r", d => rScale(d.data.total) / Math.sqrt(T.k)); drawAnnot(); });
  svg.call(zoom).on("dblclick.zoom", null);
  const rScale = d3.scaleSqrt().domain([0, d3.max(KAB, d => d.total)]).range([0, 22]);

  // tertil bivariat
  const tq = d3.quantile(KAB.map(d => d.tfr).sort(d3.ascending), 1 / 3), tq2 = d3.quantile(KAB.map(d => d.tfr).sort(d3.ascending), 2 / 3);
  const uq = d3.quantile(KAB.map(d => d.umur_20_39).sort(d3.ascending), 1 / 3), uq2 = d3.quantile(KAB.map(d => d.umur_20_39).sort(d3.ascending), 2 / 3);
  const tert = (v, a, b) => v <= a ? 0 : v <= b ? 1 : 2;
  const bivClass = d => [tert(d.tfr, tq, tq2), tert(d.umur_20_39, uq, uq2)];

  // peringkat
  const ranks = {};
  Object.keys(VARS).forEach(v => { const s = KAB.slice().sort((a, b) => b[v] - a[v]); ranks[v] = new Map(s.map((d, i) => [d.key, i + 1])); });

  function scale() {
    const V = VARS[S.v], vals = KAB.map(d => d[S.v]);
    if (V.div) return Object.assign(d3.scaleThreshold().domain(DIV_BREAKS).range(COL.div6), { kind: "threshold" });
    if (S.cls === "equal") return Object.assign(d3.scaleQuantize().domain(d3.extent(vals)).range(COL.seq), { kind: "equal" });
    return Object.assign(d3.scaleQuantile().domain(vals).range(COL.seq), { kind: "quantile" });
  }
  function classOf(sc, v) { return sc.range().indexOf(sc(v)); }
  function fillOf(d, sc) {
    if (!d) return COL.na;
    if (S.mode === "bivariate") { const [a, b] = bivClass(d); return COL.biv[a][b]; }
    if (S.mode === "lisa") return COL.lisa[d["lisa_" + S.v]] || COL.na;
    if (S.mode === "symbol") return "#E9EDF2";
    return sc(d[S.v]);
  }
  function dimOf(d, sc) {
    if (!d) return false;
    if (S.hl) return !S.hl.has(d.key);
    if (S.classHl == null) return false;
    if (S.mode === "bivariate") { const [a, b] = bivClass(d); return S.classHl !== a * 3 + b; }
    if (S.mode === "lisa") return d["lisa_" + S.v] !== S.classHl;
    return classOf(sc, d[S.v]) !== S.classHl;
  }

  function layout() {
    [W, H] = sizeOf(body);
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    proj = d3.geoMercator().fitExtent(W < 600 ? [[6, 52], [W - 6, H - 96]] : [[12, 12], [W - 52, H - 70]], { type: "FeatureCollection", features: feats });
    path = d3.geoPath(proj);
    gKab.selectAll("path").data(feats).join("path").attr("d", path)
      .attr("stroke", "#fff").attr("stroke-width", 0.35).attr("vector-effect", "non-scaling-stroke").style("cursor", "pointer")
      .on("mousemove", (e, f) => hover(e, f)).on("mouseleave", () => TIP.hide())
      .on("click", (e, f) => { if (f.data) select(f.data.key); });
    gProv.selectAll("path").data(provFeats).join("path").attr("d", path).attr("fill", "none")
      .attr("stroke", "#1F2933").attr("stroke-width", 0.7).attr("stroke-opacity", .4).attr("vector-effect", "non-scaling-stroke").attr("pointer-events", "none");
    const symData = feats.filter(f => f.data).sort((a, b) => b.data.total - a.data.total);
    gSym.selectAll("circle").data(symData, f => f.data.key).join("circle")
      .attr("cx", f => proj([f.data.lon, f.data.lat])[0]).attr("cy", f => proj([f.data.lon, f.data.lat])[1])
      .attr("stroke", "#fff").attr("stroke-width", 0.6).attr("vector-effect", "non-scaling-stroke").style("cursor", "pointer")
      .on("mousemove", (e, f) => hover(e, f)).on("mouseleave", () => TIP.hide()).on("click", (e, f) => select(f.data.key));
    render(false);
  }

  function render(anim = true) {
    const sc = scale(), dur = anim && !APP.reduced ? 600 : 0;
    gKab.selectAll("path").transition().duration(dur).attr("fill", f => fillOf(f.data, sc))
      .attr("opacity", f => dimOf(f.data, sc) ? 0.18 : 1);
    gKab.selectAll("path").attr("stroke", f => S.sel === f.data?.key ? "#0F1B2D" : "#fff").attr("stroke-width", f => S.sel === f.data?.key ? 2.2 : 0.35);
    gKab.selectAll("path").filter(f => S.sel === f.data?.key).raise();
    gSym.style("display", S.mode === "symbol" ? null : "none");
    if (S.mode === "symbol") gSym.selectAll("circle").attr("r", f => rScale(f.data.total) / Math.sqrt(T.k))
      .attr("fill", f => sc(f.data[S.v])).attr("fill-opacity", .88).attr("opacity", f => dimOf(f.data, sc) ? 0.15 : 1);
    legend(sc);
    caption();
    document.getElementById("mapVar").value = S.v;
    setSeg(document.getElementById("mapMode"), S.mode);
    setSeg(document.getElementById("mapClass"), S.cls);
    document.getElementById("mapClass").style.display = (S.mode === "choropleth" || S.mode === "symbol") && !VARS[S.v].div ? null : "none";
  }

  function legend(sc) {
    const el = document.getElementById("mapLegend"), V = VARS[S.v];
    let h = "";
    if (S.mode === "bivariate") {
      h = `<div class="lg-title">TFR × % umur 20–39 (tertil)</div><div style="display:flex;gap:8px;align-items:flex-end"><div style="font-size:11px;writing-mode:vertical-rl;transform:rotate(180deg)">TFR ↑</div><div><div class="biv">`;
      for (let a = 2; a >= 0; a--) for (let b = 0; b < 3; b++) h += `<button data-c="${a * 3 + b}" style="background:${COL.biv[a][b]}" class="${S.classHl != null && S.classHl !== a * 3 + b ? "dim" : ""}" aria-label="TFR tertil ${a + 1}, umur 20–39 tertil ${b + 1}"></button>`;
      h += `</div><div style="font-size:11px;margin-top:2px">% 20–39 →</div></div></div>`;
    } else if (S.mode === "lisa") {
      const lab = { HH: "Tinggi–tinggi (hotspot)", LL: "Rendah–rendah (coldspot)", HL: "Tinggi dikelilingi rendah", LH: "Rendah dikelilingi tinggi", ns: "Bukan klaster (p ≥ 0,05)" };
      const nSig = KAB.filter(d => d["lisa_" + S.v] !== "ns").length;
      h = `<div class="lg-title">LISA: ${V.short} · Moran's I ${fmt.d2(D.stats.moran[S.v].I)}</div><div style="font-size:11px;color:#52606D;margin-bottom:4px">${nSig} dari 514 kab/kota masuk klaster (${fmt.int(nSig / 514 * 100)}%)</div>` +
        Object.keys(lab).map(k => `<button class="lg-cat ${S.classHl && S.classHl !== k ? "dim" : ""}" data-c="${k}" style="${S.classHl && S.classHl !== k ? "opacity:.35" : ""}"><i style="background:${COL.lisa[k]};border:1px solid #CBD2D9"></i>${lab[k]}</button>`).join("");
    } else {
      const r = sc.range();
      let lows;
      if (sc.kind === "quantile") lows = [d3.min(sc.domain()), ...sc.quantiles()];
      else if (sc.kind === "equal") { const [a, b] = sc.domain(); lows = r.map((_, i) => a + (b - a) * i / r.length); }
      else lows = [null, ...DIV_BREAKS];
      h = `<div class="lg-title">${V.label} <span style="font-weight:400">(${V.unit})</span></div><div class="lg-row">` +
        r.map((c, i) => `<button class="lg-sw ${S.classHl != null && S.classHl !== i ? "dim" : ""}" data-c="${i}" aria-label="kelas ${i + 1}"><i style="background:${c}"></i><span>${lows[i] == null ? "<" + DIV_BREAKS[0] : (i === 0 && sc.kind !== "threshold" ? "" : "≥") + V.f(lows[i])}</span></button>`).join("") + "</div>";
      if (S.mode === "symbol") h += `<div style="margin-top:6px;display:flex;gap:10px;align-items:flex-end">${[500000, 2000000, 5000000].map(v => `<span style="display:inline-flex;flex-direction:column;align-items:center"><svg width="${2 * rScale(v) + 2}" height="${2 * rScale(v) + 2}"><circle cx="${rScale(v) + 1}" cy="${rScale(v) + 1}" r="${rScale(v)}" fill="none" stroke="#52606D"/></svg><span class="num" style="font-size:10.5px">${fmt.compact(v)}</span></span>`).join("")}<span style="font-size:11px">jiwa</span></div>`;
      h += `<div style="font-size:11px;color:#52606D;margin-top:3px">${sc.kind === "quantile" ? "Kuantil: tiap kelas ±103 kab/kota" : sc.kind === "equal" ? "Interval sama" : "Divergen di sekitar 100 (seimbang)"} · klik kelas untuk filter</div>`;
    }
    el.innerHTML = h;
    el.querySelectorAll("[data-c]").forEach(b => b.addEventListener("click", () => {
      const c = S.mode === "lisa" ? b.dataset.c : +b.dataset.c;
      S.classHl = S.classHl === c ? null : c; S.hl = null; render();
    }));
  }
  function caption() {
    const list = [["tfr_kab", "TFR"], ["akb_kab", "IMR"], ["umur", "penduduk menurut umur"], ["umur_l", "laki-laki"], ["umur_p", "perempuan"]]
      .map(([id, t]) => srcLink(id, t)).join(", ");
    document.getElementById("mapCap").innerHTML = `Sumber: BPS, SUPAS 2025: ${list} (diolah).`;
  }

  function hover(e, f) {
    const d = f.data; if (!d) return;
    const V = VARS[S.v];
    let extra = "";
    if (S.mode === "bivariate") extra = `TFR <span class="num">${fmt.d2(d.tfr)}</span> · umur 20–39 <span class="num">${fmt.d1(d.umur_20_39)}%</span>`;
    else if (S.mode === "lisa") extra = `${V.short} <span class="num">${V.f(d[S.v])}</span> · ${({ HH: "hotspot: tinggi dan tetangganya juga tinggi", LL: "coldspot: rendah dan tetangganya juga rendah", HL: "pencilan: tinggi di antara tetangga rendah", LH: "pencilan: rendah di antara tetangga tinggi", ns: "bukan klaster: nilainya dekat rata-rata atau tetangganya bercampur" })[d["lisa_" + S.v]]}`;
    else extra = `${V.short} <span class="num">${V.f(d[S.v])}</span> · peringkat ${ranks[S.v].get(d.key)} dari 514`;
    if (S.mode === "symbol") extra += `<br>Penduduk <span class="num">${fmt.int(d.total)}</span>`;
    TIP.show(`<b>${d.nama_kabkota}</b><span class="t-sub">${d.nama_prov}</span><br>${extra}<br><span class="t-sub">Klik untuk detail</span>`, e);
  }

  /* ----- zoom ----- */
  function transformFor(bounds) {
    const [[x0, y0], [x1, y1]] = bounds;
    const k = Math.min(40, 0.85 / Math.max((x1 - x0) / W, (y1 - y0) / H));
    return d3.zoomIdentity.translate(W / 2, H / 2 - (W < 600 ? 30 : 10)).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  }
  function zoomLonLat(b) {
    if (!b) return svg.transition().duration(APP.reduced ? 0 : 900).call(zoom.transform, d3.zoomIdentity);
    const p0 = proj([b[0], b[3]]), p1 = proj([b[2], b[1]]);
    svg.transition().duration(APP.reduced ? 0 : 1000).call(zoom.transform, transformFor([p0, p1]));
  }
  function zoomKey(key) {
    const f = feats.find(x => x.data && x.data.key === key); if (!f) return;
    const b = path.bounds(f); const pad = 40;
    svg.transition().duration(APP.reduced ? 0 : 900).call(zoom.transform, transformFor([[b[0][0] - pad, b[0][1] - pad], [b[1][0] + pad, b[1][1] + pad]]));
  }
  document.getElementById("zIn").onclick = () => svg.transition().call(zoom.scaleBy, 1.8);
  document.getElementById("zOut").onclick = () => svg.transition().call(zoom.scaleBy, 1 / 1.8);
  document.getElementById("zReset").onclick = () => zoomLonLat(null);

  /* ----- anotasi ----- */
  function drawAnnot() {
    const data = S.annot.map(([p, k]) => KAB_BY.get(keyOf(p, k))).filter(Boolean);
    const g = gAnnot.selectAll("g.an").data(data, d => d.key);
    const en = g.enter().append("g").attr("class", "an");
    en.append("circle").attr("r", 7).attr("fill", "none").attr("stroke", "#fff").attr("stroke-width", 4);
    en.append("circle").attr("r", 7).attr("fill", "none").attr("stroke", "#0F1B2D").attr("stroke-width", 2);
    en.append("text").attr("font-size", 12.5).attr("font-weight", 600).attr("stroke", "#fff").attr("stroke-width", 4).attr("paint-order", "stroke").attr("fill", "#0F1B2D");
    g.exit().remove();
    const posOf = d => (S.annot.find(([p, k]) => keyOf(p, k) === d.key) || [])[2] || "r";
    gAnnot.selectAll("g.an").attr("transform", d => { const [x, y] = T.apply(proj([d.lon, d.lat])); return `translate(${x},${y})`; })
      .select("text").attr("text-anchor", d => posOf(d) === "l" ? "end" : posOf(d) === "b" || posOf(d) === "t" ? "middle" : "start")
      .attr("x", d => posOf(d) === "l" ? -11 : posOf(d) === "r" ? 11 : 0).attr("y", d => posOf(d) === "b" ? 22 : posOf(d) === "t" ? -12 : 4).text(d => `${d.nama_kabkota} ${VARS[S.v].f(d[S.v])}${VARS[S.v].unit === "%" ? "%" : ""}`);
  }

  /* ----- drawer ----- */
  const drawer = document.getElementById("drawer");
  function select(key) {
    S.sel = key; render(); openDrawer();
  }
  function openDrawer() {
    const d = KAB_BY.get(S.sel); if (!d) return;
    const c = S.cmp ? KAB_BY.get(S.cmp) : null;
    const items = ["tfr", "imr", "rasio_ketergantungan", "lansia_65plus", "umur_20_39", "rasio_jk"].map(v => {
      const V = VARS[v];
      return `<div><small>${V.short}</small><b>${V.f(d[v])}</b>${c ? ` <span class="num" style="color:#E08214;font-size:13px">vs ${V.f(c[v])}</span>` : ""}<em>peringkat ${ranks[v].get(d.key)}/514</em></div>`;
    }).join("");
    drawer.innerHTML = `<button class="close" aria-label="Tutup">✕</button><h4>${d.nama_kabkota}</h4><p class="d-sub">${d.nama_prov} · ${d.pulau} · <span class="num">${fmt.int(d.total)}</span> jiwa</p>
      <div class="ind-grid">${items}</div>
      <h5>Struktur umur (% penduduk)</h5><div id="ageChart" class="chart"></div>
      <h5>Bandingkan dengan</h5><input type="search" id="cmpInput" list="kabList" placeholder="Ketik kab/kota lain…" style="width:100%" value="${c ? c.nama_kabkota + ", " + c.nama_prov : ""}">
      <p class="step-note" style="margin-top:10px">Peringkat 1 = nilai tertinggi. Sumber: BPS, SUPAS 2025 (diolah).</p>`;
    drawer.classList.add("open");
    drawer.querySelector(".close").onclick = () => { drawer.classList.remove("open"); S.sel = null; S.cmp = null; render(); };
    drawer.querySelector("#cmpInput").addEventListener("change", e => { const k = findKab(e.target.value); S.cmp = k; openDrawer(); });
    ageChart(d, c);
  }
  function ageChart(d, c) {
    const el = drawer.querySelector("#ageChart"), w = 330, h = 250, m = { l: 44, r: 12, t: 6, b: 22 };
    const pct = x => AGE.map(a => x[a] / x.total * 100);
    const A = pct(d), B = c ? pct(c) : null;
    const x = d3.scaleLinear().domain([0, d3.max([...A, ...(B || []), ...NAT_AGE]) * 1.08]).range([m.l, w - m.r]);
    const y = d3.scaleBand().domain(AGE_LABEL.slice().reverse()).range([m.t, h - m.b]).padding(0.18);
    const s = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`);
    s.append("g").selectAll("rect").data(A).join("rect").attr("x", m.l).attr("y", (v, i) => y(AGE_LABEL[i])).attr("height", y.bandwidth()).attr("width", v => x(v) - m.l).attr("fill", "#2C7FB8");
    if (B) s.append("g").selectAll("rect").data(B).join("rect").attr("x", m.l).attr("y", (v, i) => y(AGE_LABEL[i]) + y.bandwidth() * .25).attr("height", y.bandwidth() * .5).attr("width", v => x(v) - m.l).attr("fill", "none").attr("stroke", COL.out).attr("stroke-width", 2);
    s.append("path").attr("d", d3.line().x(v => x(v)).y((v, i) => y(AGE_LABEL[i]) + y.bandwidth() / 2)(NAT_AGE)).attr("fill", "none").attr("stroke", "#1F2933").attr("stroke-dasharray", "3 2").attr("stroke-width", 1.5);
    s.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickSize(0)).call(g => g.select(".domain").remove());
    s.append("g").attr("class", "axis").attr("transform", `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(4).tickFormat(v => fmt.d1(v) + "%"));
    el.insertAdjacentHTML("beforeend", `<div class="step-note"><span style="color:#2C7FB8">■</span> ${d.nama_kabkota} ${B ? `<span style="color:#E08214">□</span> ${c.nama_kabkota}` : ""} <span>┄ Indonesia</span></div>`);
  }
  function findKab(text) {
    if (!text) return null;
    const [k, p] = text.split(",").map(s => s.trim());
    let d = p ? KAB_BY.get(keyOf(p, k)) : null;
    if (!d) d = KAB.find(x => norm(x.nama_kabkota) === norm(k));
    if (!d) d = KAB.find(x => norm(x.nama_kabkota).includes(norm(k)));
    return d ? d.key : null;
  }

  /* ----- langkah cerita ----- */
  const JAVA = [105.0, -8.9, 115.0, -5.8], PAPUA = [129.5, -9.3, 141.1, 0.6], SJAVA = [108.6, -8.95, 114.9, -6.6], FRONT = [114.5, -4.2, 124.5, 1.8];
  const STEPS = [
    { v: "tfr", mode: "choropleth", z: null, annot: [] },
    { v: "tfr", mode: "choropleth", z: JAVA, annot: [["DKI Jakarta", "Kota Jakarta Pusat", "t"], ["Daerah Istimewa Yogyakarta", "Kota Yogyakarta"], ["Jawa Timur", "Kota Surabaya"], ["Banten", "Kota Tangerang Selatan", "b"]] },
    { v: "tfr", mode: "choropleth", z: PAPUA, annot: [["Papua", "Supiori"], ["Papua Barat", "Teluk Wondama"], ["Papua Barat Daya", "Tambrauw"], ["Papua Selatan", "Asmat"]] },
    { v: "lansia_65plus", mode: "choropleth", z: SJAVA, annot: [["Daerah Istimewa Yogyakarta", "Gunung Kidul", "l"], ["Jawa Tengah", "Wonogiri", "t"], ["Jawa Timur", "Pacitan", "b"], ["Jawa Timur", "Magetan"]] },
    { v: "umur_20_39", mode: "choropleth", z: FRONT, annot: [["Kalimantan Timur", "Penajam Paser Utara"], ["Sulawesi Tengah", "Morowali"]] },
    { v: "tfr", mode: "lisa", z: null, annot: [] },
    { v: "tfr", mode: "symbol", z: null, annot: [] },
    { v: "tfr", mode: "bivariate", z: null, annot: [] },
    { v: null },
  ];
  function step(i) {
    const s = STEPS[i]; if (!s || !s.v) { S.annot = []; drawAnnot(); return; }
    Object.assign(S, { v: s.v, mode: s.mode, classHl: null, hl: null, annot: s.annot, cls: "quantile" });
    render(); zoomLonLat(s.z); drawAnnot();
  }

  /* ----- tabel ----- */
  const COLS = [["nama_kabkota", "Kab/kota"], ["nama_prov", "Provinsi"], ["tfr", "TFR", fmt.d2], ["imr", "IMR", fmt.d2], ["anak_0_14", "% 0–14", fmt.d1], ["umur_20_39", "% 20–39", fmt.d1],
  ["lansia_65plus", "% 65+", fmt.d1], ["rasio_ketergantungan", "Rasio ketergantungan", fmt.d1], ["rasio_jk", "Rasio JK", fmt.d1], ["total", "Jumlah Penduduk", fmt.int]];
  const TB = { sort: "tfr", dir: -1, q: "", page: 0, per: 12 };
  function table() {
    const head = document.querySelector("#kabTable thead"), tb = document.querySelector("#kabTable tbody");
    head.innerHTML = "<tr>" + COLS.map(([k, l]) => `<th scope="col" data-k="${k}" tabindex="0" aria-sort="${TB.sort === k ? (TB.dir > 0 ? "ascending" : "descending") : "none"}">${l}</th>`).join("") + "</tr>";
    head.querySelectorAll("th").forEach(th => { const go = () => { const k = th.dataset.k; TB.dir = TB.sort === k ? -TB.dir : (k.startsWith("nama") ? 1 : -1); TB.sort = k; TB.page = 0; table(); }; th.onclick = go; th.onkeydown = e => { if (e.key === "Enter") go(); }; });
    const q = norm(TB.q);
    let rows = KAB.filter(d => !q || norm(d.nama_kabkota).includes(q) || norm(d.nama_prov).includes(q));
    rows.sort((a, b) => TB.dir * (typeof a[TB.sort] === "string" ? a[TB.sort].localeCompare(b[TB.sort]) : a[TB.sort] - b[TB.sort]));
    const pages = Math.max(1, Math.ceil(rows.length / TB.per)); TB.page = Math.min(TB.page, pages - 1);
    tb.innerHTML = rows.slice(TB.page * TB.per, (TB.page + 1) * TB.per).map(d => `<tr data-k="${d.key}">` + COLS.map(([k, , f]) => `<td>${f ? f(d[k]) : d[k]}</td>`).join("") + "</tr>").join("");
    tb.querySelectorAll("tr").forEach(tr => tr.onclick = () => { document.getElementById("mapStage").scrollIntoView({ behavior: APP.reduced ? "auto" : "smooth", block: "center" }); setTimeout(() => { zoomKey(tr.dataset.k); select(tr.dataset.k); }, 450); });
    document.getElementById("tblPager").innerHTML = `${fmt.int(rows.length)} baris · halaman ${TB.page + 1}/${pages} <button class="btn" ${TB.page === 0 ? "disabled" : ""} id="pgPrev">‹</button><button class="btn" ${TB.page >= pages - 1 ? "disabled" : ""} id="pgNext">›</button>`;
    document.getElementById("pgPrev").onclick = () => { TB.page--; table(); };
    document.getElementById("pgNext").onclick = () => { TB.page++; table(); };
  }
  function csv() {
    const cols = ["kode_kabkota", "nama_prov", "nama_kabkota", "tfr", "imr", "anak_0_14", "produktif_15_64", "lansia_65plus", "umur_20_39", "rasio_ketergantungan", "rasio_jk", "rasio_jk_20_39", "total"];
    const txt = [cols.join(","), ...KAB.map(d => cols.map(c => typeof d[c] === "string" ? `"${d[c]}"` : d[c]).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv" })); a.download = "indikator_kabkota_supas2025.csv"; a.click();
  }

  function init() {
    const sel = document.getElementById("mapVar");
    sel.innerHTML = Object.entries(VARS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
    sel.onchange = () => { S.v = sel.value; if (S.mode === "lisa" && !VARS[S.v].lisa) S.mode = "choropleth"; S.classHl = null; S.annot = []; render(); drawAnnot(); };
    segmented(document.getElementById("mapMode"), v => { S.mode = v; S.classHl = null; S.hl = null; if (v === "lisa" && !VARS[S.v].lisa) S.v = "tfr"; render(); drawAnnot(); });
    segmented(document.getElementById("mapClass"), v => { S.cls = v; S.classHl = null; render(); });
    document.getElementById("kabList").innerHTML = KAB.map(d => `<option value="${d.nama_kabkota}, ${d.nama_prov}">`).join("");
    const srch = document.getElementById("mapSearch");
    let lastQ = ""; srch.addEventListener("change", () => { if (srch.value === lastQ) return; lastQ = srch.value; const k = findKab(srch.value); if (k) { zoomKey(k); select(k); srch.blur(); } });
    document.getElementById("tblSearch").addEventListener("input", e => { TB.q = e.target.value; TB.page = 0; table(); });
    document.getElementById("tblCsv").onclick = csv;
    layout(); table();
    onResize(body, () => { layout(); drawAnnot(); }, true);
    makeCarousel(document.getElementById("story1"), step);
  }
  return { init, VARS, ranks, findKab };
})();

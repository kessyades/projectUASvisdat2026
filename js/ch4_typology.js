/* Bab 4: Tipologi provinsi — PCA biplot, peta kelompok, radar kembaran, heatmap terklaster (saling terhubung) */
const TypoCh = (() => {
  const PC = D.prov.pca;
  const rows = PROV.filter(d => d.pc1 != null);
  const BY = new Map(PROV.map(d => [d.nama_prov, d]));
  let sel = null, srcSel = null, pcaH = null, twinBase = "Kalimantan Timur", twinPick = 0;
  const short = n => FlowCh.SHORT[n] || ({ "Papua Barat Daya": "PBD", "Papua Selatan": "Pasel", "Papua Tengah": "Pateng", "Papua Pegunungan": "Papeg" })[n] || n;
  const shapeOf = (c, s = 90) => d3.symbol(CLUSTER_INFO[c].shape, s)();
  const icon = (c, s = 14) => `<svg width="${s}" height="${s}" viewBox="-8 -8 16 16" style="width:${s}px;height:${s}px"><path d="${shapeOf(c, 70)}" fill="${COL.cluster[c]}"/></svg>`;
  const fmtVar = (v, x) => v === "log_kepadatan" ? fmt.int(Math.pow(10, x)) + " jiwa/km²" : v === "gini_2025" ? LOC.format(",.3f")(x) : fmt.d2(x);
  const LABEL_DEFAULT = ["DKI Jakarta", "Daerah Istimewa Yogyakarta", "Papua Selatan", "Papua", "Papua Barat", "Kalimantan Timur", "Kalimantan Utara", "Jawa Timur", "Nusa Tenggara Timur", "Papua Tengah"];

  /* --- kartu kelompok (judul, deskripsi, anggota sejajar) --- */
  function cards() {
    const el = document.getElementById("clusterCards");
    el.innerHTML = [1, 2, 3, 4].map(c => {
      const n = rows.filter(d => d.cluster === c);
      return `<button class="ccard" style="--c:${COL.cluster[c]}" data-c="${c}" aria-pressed="false">
        <h4>${icon(c)}<span>${CLUSTER_INFO[c].nama}</span></h4>
        <p>${CLUSTER_INFO[c].desk}</p>
        <div class="cmem"><b>${n.length} provinsi</b>${n.map(d => short(d.nama_prov)).join(", ")}</div></button>`;
    }).join("");
    el.querySelectorAll(".ccard").forEach(b => b.onclick = () => {
      const c = +b.dataset.c, set = new Set(rows.filter(d => d.cluster === c).map(d => d.nama_prov));
      const same = sel && sel.size === set.size && [...set].every(x => sel.has(x));
      setSel(same ? null : set, "card");
    });
  }

  /* --- PCA biplot --- */
  let pcaG, pcaBrush, pcaBrushG, showArrows = true;
  function pca() {
    const el = document.getElementById("pcaChart"); el.innerHTML = "";
    const w = Math.max(320, el.clientWidth), h = pcaH || Math.min(460, w * .82), m = 34;
    const x = d3.scaleLinear().domain(d3.extent(rows, d => d.pc1)).nice().range([m, w - 12]);
    const y = d3.scaleLinear().domain(d3.extent(rows, d => d.pc2)).nice().range([h - m, 10]);
    const s = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`);
    s.append("g").attr("class", "axis").attr("transform", `translate(0,${y(0)})`).call(d3.axisBottom(x).ticks(6)).call(g => g.selectAll("line,path").attr("stroke", "#CBD2D9"));
    s.append("g").attr("class", "axis").attr("transform", `translate(${x(0)},0)`).call(d3.axisLeft(y).ticks(6)).call(g => g.selectAll("line,path").attr("stroke", "#CBD2D9"));
    s.append("text").attr("x", w - 12).attr("y", y(0) - 6).attr("text-anchor", "end").attr("font-size", 11.5).attr("fill", "#52606D").text(`PC1 (${fmt.d1(PC.explained[0] * 100)}%)`);
    s.append("text").attr("x", x(0) + 6).attr("y", 18).attr("font-size", 11.5).attr("fill", "#52606D").text(`PC2 (${fmt.d1(PC.explained[1] * 100)}%)`);
    pcaBrush = d3.brush().extent([[0, 0], [w, h]]).on("end", e => {
      if (!e.sourceEvent) return;
      if (!e.selection) { if (srcSel === "pca") setSel(null, "pca"); return; }
      const [[a, b], [c, d]] = e.selection;
      setSel(new Set(rows.filter(r => x(r.pc1) >= a && x(r.pc1) <= c && y(r.pc2) >= b && y(r.pc2) <= d).map(r => r.nama_prov)), "pca");
    });
    pcaBrushG = s.append("g").call(pcaBrush);
    const L = PC.loadings, sc = Math.min(w, h) * 0.42 / d3.max(Object.values(L), v => Math.hypot(...v));
    const ag = s.append("g").attr("class", "arrows").attr("pointer-events", "none").style("display", showArrows ? null : "none");
    ag.append("defs").html(`<marker id="pa" viewBox="0 -4 8 8" refX="7" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,-3L8,0L0,3" fill="#7B8794"/></marker>`);
    Object.entries(L).forEach(([v, [a, b]]) => {
      const x2 = x(0) + a * sc, y2 = y(0) - b * sc;
      ag.append("line").attr("x1", x(0)).attr("y1", y(0)).attr("x2", x2).attr("y2", y2).attr("stroke", "#7B8794").attr("stroke-width", 1.2).attr("marker-end", "url(#pa)");
      ag.append("text").attr("x", x2 + (a >= 0 ? 4 : -4)).attr("y", y2 + (b >= 0 ? -3 : 11)).attr("text-anchor", a >= 0 ? "start" : "end").attr("font-size", 10.5).attr("fill", "#52606D").attr("stroke", "#fff").attr("stroke-width", 3).attr("paint-order", "stroke").text(PC.labels[v]);
    });
    pcaG = s.append("g").selectAll("g").data(rows).join("g").attr("transform", d => `translate(${x(d.pc1)},${y(d.pc2)})`).style("cursor", "pointer")
      .on("mousemove", (e, d) => TIP.show(`<b>${d.nama_prov}</b><span class="t-sub">${CLUSTER_INFO[d.cluster].nama}</span><br>PC1 <span class="num">${fmt.d2(d.pc1)}</span> · PC2 <span class="num">${fmt.d2(d.pc2)}</span><br>Neto 2025 <span class="num">${minus(fmt.signed2(d.mig_neto_pct))}%</span>`, e))
      .on("mouseleave", () => TIP.hide()).on("click", (e, d) => pickOne(d.nama_prov));
    pcaG.append("path").attr("d", d => shapeOf(d.cluster)).attr("fill", d => COL.cluster[d.cluster]).attr("stroke", "#fff").attr("stroke-width", 1.2);
    pcaG.append("text").attr("class", "plab").attr("x", 8).attr("y", 4).attr("font-size", 10.5).attr("stroke", "#fff").attr("stroke-width", 3).attr("paint-order", "stroke").attr("fill", "#1F2933").text(d => short(d.nama_prov));
    document.getElementById("pcaSub").textContent = `Seret untuk memilih beberapa provinsi, atau klik satu titik. Panah = arah variabel. PC1 dan PC2 menjelaskan ${fmt.d1((PC.explained[0] + PC.explained[1]) * 100)}% variansi.`;
    apply();
  }

  /* --- peta kelompok + legenda kecil --- */
  let tyPaths;
  function minimap() {
    const el = document.getElementById("tyMap"); el.innerHTML = "";
    const feats = topoFeatures(D.provTopo, "kab");
    const w = Math.max(300, el.clientWidth), h = window.innerWidth <= 900 ? w * .44 : w * .62;
    const proj = d3.geoMercator().fitExtent([[4, 4], [w - 4, w * .42]], { type: "FeatureCollection", features: feats }), path = d3.geoPath(proj);
    const s = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`);
    tyPaths = s.append("g").selectAll("path").data(feats).join("path").attr("d", path).style("cursor", "pointer")
      .attr("fill", f => { const d = BY.get(f.properties.prov); return d && d.cluster ? COL.cluster[d.cluster] : "#E4E7EB"; })
      .attr("stroke", f => BY.get(f.properties.prov)?.cluster ? "#fff" : "#7B8794").attr("stroke-dasharray", f => BY.get(f.properties.prov)?.cluster ? null : "3 2").attr("stroke-width", .6)
      .on("mousemove", (e, f) => { const d = BY.get(f.properties.prov); TIP.show(`<b>${f.properties.prov}</b>${d.cluster ? CLUSTER_INFO[d.cluster].nama : "Tidak masuk PCA (data migran masuk tidak tersedia)"}`, e); })
      .on("mouseleave", () => TIP.hide()).on("click", (e, f) => { const d = BY.get(f.properties.prov); if (d.cluster) pickOne(d.nama_prov); });
    d3.select(el).append("div").attr("class", "ty-legend").html([1, 2, 3, 4].map(c => `<span>${icon(c, 11)}${CLUSTER_INFO[c].nama}</span>`).join("") + `<span><i></i>Tidak masuk PCA</span>`);
    apply();
  }

  /* --- radar: provinsi pilihan vs kembarannya --- */
  function radar() {
    const el = document.getElementById("twinRadar"); el.innerHTML = "";
    const twins = D.prov.twins[twinBase], other = twins[twinPick][0];
    document.getElementById("twinChips").innerHTML = twins.map(([n, d], i) => `<button class="chip ${i === twinPick ? "on" : ""}" data-i="${i}"><span class="chip-rank">${i + 1}</span>${n}</button>`).join("");
    document.querySelectorAll("#twinChips .chip").forEach(b => b.onclick = () => { twinPick = +b.dataset.i; radar(); setSel(new Set([twinBase, D.prov.twins[twinBase][twinPick][0]]), "twin"); });
    const RL = { rasio_ketergantungan_prov: "Rasio ketergantungan", pct_20_39: "Umur 20–39", rasio_jk_prov: "Rasio JK", laju_pertumbuhan: "Pertumbuhan", tfr_prov: "TFR", imr_prov: "Kematian bayi", log_kepadatan: "Kepadatan", pct_65plus: "Umur 65+", gini_2025: "Gini", mig_masuk_pct: "Migran masuk", mig_keluar_pct: "Migran keluar" };
    const vars = PC.var_order, n = vars.length, w = Math.max(280, el.clientWidth), R = Math.min(w, 400) / 2 - (w < 420 ? 102 : 72), cx = w / 2, cy = R + 40;
    const r = d3.scaleLinear().domain([-2.5, 2.5]).range([0, R]).clamp(true);
    const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
    const pt = (i, z) => [cx + Math.cos(ang(i)) * r(z), cy + Math.sin(ang(i)) * r(z)];
    const s = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${cy + R + 44}`);
    [-2, -1, 0, 1, 2].forEach(z => s.append("circle").attr("cx", cx).attr("cy", cy).attr("r", r(z)).attr("fill", "none").attr("stroke", z === 0 ? "#9AA5B1" : "#E4E7EB").attr("stroke-dasharray", z === 0 ? "4 3" : null));
    s.append("text").attr("x", cx + 3).attr("y", cy - r(0) - 3).attr("font-size", 9.5).attr("fill", "#7B8794").text("rata-rata");
    vars.forEach((v, i) => {
      const [x2, y2] = pt(i, 2.5); s.append("line").attr("x1", cx).attr("y1", cy).attr("x2", x2).attr("y2", y2).attr("stroke", "#E4E7EB");
      const [lx, ly] = [cx + Math.cos(ang(i)) * (R + 10), cy + Math.sin(ang(i)) * (R + 10)];
      const c = Math.cos(ang(i));
      s.append("text").attr("x", lx).attr("y", ly).attr("dy", ".35em").attr("text-anchor", Math.abs(c) < .2 ? "middle" : c > 0 ? "start" : "end").attr("font-size", 10.5).attr("fill", "#3E4C59").text(RL[v]);
    });
    const poly = (p, col, fill, dash) => {
      const z = vars.map(v => PC.z[p][PC.vars.indexOf(v)]);
      s.append("path").attr("d", d3.line()(z.map((zz, i) => pt(i, zz))) + "Z").attr("fill", fill ? col : "none").attr("fill-opacity", .16).attr("stroke", col).attr("stroke-width", 2.2).attr("stroke-dasharray", dash ? "5 3" : null);
      s.append("g").selectAll("circle").data(z).join("circle").attr("cx", (zz, i) => pt(i, zz)[0]).attr("cy", (zz, i) => pt(i, zz)[1]).attr("r", 3.5).attr("fill", col)
        .on("mousemove", (e, zz) => { const i = z.indexOf(zz), v = vars[i]; TIP.show(`<b>${p}</b>${PC.labels[v]}: <span class="num">${fmtVar(v, BY.get(p)[v])}</span>`, e); }).on("mouseleave", () => TIP.hide());
    };
    poly(other, COL.out, false, true); poly(twinBase, COL.in, true, false);
    document.getElementById("twinKey").innerHTML = `<span><svg width="26" height="10"><line x1="1" x2="25" y1="5" y2="5" stroke="${COL.in}" stroke-width="2.5"/></svg>${twinBase}</span><span><svg width="26" height="10"><line x1="1" x2="25" y1="5" y2="5" stroke="${COL.out}" stroke-width="2.5" stroke-dasharray="5 3"/></svg>${other}</span><span><svg width="26" height="10"><line x1="1" x2="25" y1="5" y2="5" stroke="#9AA5B1" stroke-width="1.5" stroke-dasharray="4 3"/></svg>rata-rata 37 provinsi</span>`;
  }
  function pickOne(p) {
    twinBase = p; twinPick = 0; document.getElementById("twinSel").value = p; radar();
    setSel(new Set([p, ...D.prov.twins[p].map(t => t[0])]), "twin");
  }

  /* --- heatmap terklaster --- */
  let hmRows;
  function heatmap() {
    const el = document.getElementById("hmChart"); el.innerHTML = "";
    const leaves = PC.leaf_order, vars = PC.var_order;
    const w = Math.max(560, el.clientWidth), dw = 64, lw = 150, top = 96, ch = 15, cw = (w - dw - lw - 46) / vars.length, h = top + ch * leaves.length + 8;
    const s = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`);
    const color = d3.scaleDiverging([-2.5, 0, 2.5], d3.interpolatePuOr).clamp(true);
    const yd = v => top + (v - 5) / 10 * ch + ch / 2;
    const xd = d3.scaleLinear().domain([d3.max(PC.dendro.dcoord.flat()), 0]).range([2, dw - 2]);
    const dg = s.append("g").attr("fill", "none").attr("stroke", "#7B8794").attr("stroke-width", 1);
    PC.dendro.icoord.forEach((ic, i) => { const dc = PC.dendro.dcoord[i]; dg.append("path").attr("d", `M${xd(dc[0])},${yd(ic[0])}H${xd(dc[1])}V${yd(ic[3])}H${xd(dc[3])}`); });
    hmRows = s.append("g").selectAll("g").data(leaves).join("g").attr("transform", (d, i) => `translate(0,${top + i * ch})`).style("cursor", "pointer").on("click", (e, p) => pickOne(p));
    hmRows.append("text").attr("x", dw + lw - 12).attr("y", ch * .72).attr("text-anchor", "end").attr("font-size", 10.5).attr("fill", "#1F2933").text(p => p.replace("Daerah Istimewa", "DI").replace("Kepulauan", "Kep."));
    hmRows.append("rect").attr("x", dw + lw - 8).attr("y", 2).attr("width", 5).attr("height", ch - 4).attr("fill", p => COL.cluster[BY.get(p).cluster]);
    hmRows.each(function (p) {
      const z = PC.z[p];
      d3.select(this).selectAll("rect.c").data(vars).join("rect").attr("class", "c").attr("x", (v, j) => dw + lw + j * cw).attr("width", cw - 1).attr("height", ch - 1)
        .attr("fill", v => color(z[PC.vars.indexOf(v)]))
        .on("mousemove", (e, v) => TIP.show(`<b>${p}</b>${PC.labels[v]}: <span class="num">${fmtVar(v, BY.get(p)[v])}</span><br>z = <span class="num">${minus(fmt.signed2(z[PC.vars.indexOf(v)]))}</span>`, e))
        .on("mouseleave", () => TIP.hide());
    });
    s.append("g").selectAll("text").data(vars).join("text").attr("transform", (v, j) => `translate(${dw + lw + j * cw + cw * .6},${top - 6}) rotate(-50)`).attr("font-size", 10.5).attr("fill", "#1F2933").text(v => PC.labels[v].replace(" (log10)", "").replace(" (%)", " %"));
    const lg = s.append("g").attr("transform", `translate(4,10)`);
    lg.selectAll("rect").data(d3.range(30)).join("rect").attr("x", i => i * 4).attr("width", 4.5).attr("height", 9).attr("fill", i => color(-2.5 + 5 * i / 29));
    lg.append("text").attr("y", 22).attr("font-size", 10).attr("fill", "#52606D").text("−2,5  z  +2,5");
    apply();
  }

  /* --- seleksi terhubung --- */
  function setSel(set, source) {
    sel = set && set.size ? set : null; srcSel = source;
    if (source !== "pca" && pcaBrushG) pcaBrushG.call(pcaBrush.move, null);
    apply();
  }
  function apply() {
    const on = p => !sel || sel.has(p);
    if (pcaG) { pcaG.attr("opacity", d => on(d.nama_prov) ? 1 : .15); pcaG.select(".plab").style("display", d => (sel && sel.has(d.nama_prov) && sel.size <= 12) || (!sel && LABEL_DEFAULT.includes(d.nama_prov)) ? null : "none"); }
    if (hmRows) hmRows.attr("opacity", p => on(p) ? 1 : .25);
    if (tyPaths) tyPaths.attr("opacity", f => on(f.properties.prov) ? 1 : .2);
    document.querySelectorAll(".ccard").forEach(b => { const c = +b.dataset.c; const set = rows.filter(d => d.cluster === c).map(d => d.nama_prov); b.setAttribute("aria-pressed", String(!!sel && set.length === sel.size && set.every(x => sel.has(x)))); });
  }

  /* samakan tinggi biplot dengan kolom kanan (laptop) */
  function fitPca() {
    const left = document.getElementById("pcaChart").closest(".panel"), right = left.nextElementSibling;
    pcaH = null; pca();
    if (!right || window.innerWidth <= 900) return;
    const extra = right.offsetHeight - left.offsetHeight;
    if (extra > 4) { pcaH = Math.min(1000, document.getElementById("pcaChart").querySelector("svg").viewBox.baseVal.height + extra); pca(); }
  }
  function init() {
    cards();
    segmented(document.getElementById("pcaArrows"), v => { showArrows = v === "1"; d3.select("#pcaChart .arrows").style("display", showArrows ? null : "none"); });
    document.getElementById("tyReset").onclick = () => setSel(null, "reset");
    const ts = document.getElementById("twinSel");
    ts.innerHTML = rows.slice().sort((a, b) => a.nama_prov.localeCompare(b.nama_prov)).map(d => `<option>${d.nama_prov}</option>`).join("");
    ts.value = twinBase; ts.onchange = () => pickOne(ts.value);
    minimap(); radar(); heatmap(); fitPca();
    onResize(document.getElementById("tyMap"), () => { minimap(); radar(); fitPca(); });
    onResize(document.getElementById("hmChart"), heatmap);
  }
  return { init };
})();

/* Bab 2: Flow map berpartikel, matriks asal–tujuan, diagram chord berarah (LF SP2020) */
const FlowCh = (() => {
  const P = D.flows.provinces, FL = D.flows.flows;
  const P_BY = new Map(P.map(p => [p.prov, p]));
  const SHORT = {
    "Aceh": "Aceh", "Sumatera Utara": "Sumut", "Sumatera Barat": "Sumbar", "Riau": "Riau", "Jambi": "Jambi", "Sumatera Selatan": "Sumsel", "Bengkulu": "Bengkulu", "Lampung": "Lampung",
    "Kepulauan Bangka Belitung": "Babel", "Kepulauan Riau": "Kepri", "DKI Jakarta": "DKI", "Jawa Barat": "Jabar", "Jawa Tengah": "Jateng", "Daerah Istimewa Yogyakarta": "DIY", "Jawa Timur": "Jatim",
    "Banten": "Banten", "Bali": "Bali", "Nusa Tenggara Barat": "NTB", "Nusa Tenggara Timur": "NTT", "Kalimantan Barat": "Kalbar", "Kalimantan Tengah": "Kalteng", "Kalimantan Selatan": "Kalsel",
    "Kalimantan Timur": "Kaltim", "Kalimantan Utara": "Kaltara", "Sulawesi Utara": "Sulut", "Sulawesi Tengah": "Sulteng", "Sulawesi Selatan": "Sulsel", "Sulawesi Tenggara": "Sultra",
    "Gorontalo": "Gorontalo", "Sulawesi Barat": "Sulbar", "Maluku": "Maluku", "Maluku Utara": "Malut", "Papua Barat": "Pabar", "Papua": "Papua"
  };
  const ON_DARK = { in: "#7FB3E6", out: "#F5A54A", neutral: "#A9C1DD" };
  const S = { sel: null, dir: "both", n: 50, filter: null, anim: !APP.reduced };
  const vmax = d3.max(FL, f => f.v);
  const wScale = d3.scaleSqrt().domain([0, vmax]).range([0.4, 15]);

  const body = document.getElementById("flowBody"), svg = d3.select("#flowSvg"), canvas = document.getElementById("flowCanvas"), ctx = canvas.getContext("2d");
  const provFeats = topoFeatures(D.provTopo, "kab");
  const gBase = svg.append("g"), gFlow = svg.append("g"), gNode = svg.append("g"), gLab = svg.append("g").attr("pointer-events", "none");
  let W, H, proj, T = d3.zoomIdentity, curves = [], particles = [], raf, visible = false;
  const zoom = d3.zoom().scaleExtent([1, 14]).on("zoom", e => { T = e.transform; gBase.attr("transform", T); drawFlows(false); });
  svg.call(zoom).on("dblclick.zoom", null);
  const pt = p => T.apply(proj([p.lon, p.lat]));

  function visibleFlows() {
    let f = FL;
    if (S.sel) f = f.filter(x => (S.dir !== "in" && x.o === S.sel) || (S.dir !== "out" && x.d === S.sel));
    else if (S.filter) f = f.filter(S.filter);
    return f.slice().sort((a, b) => b.v - a.v).slice(0, S.n);
  }
  function colorOf(f) { if (!S.sel) return ON_DARK.neutral; return f.o === S.sel ? ON_DARK.out : ON_DARK.in; }

  function layout() {
    [W, H] = sizeOf(svg.node());
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    proj = d3.geoMercator().fitExtent(W < 600 ? [[6, 50], [W - 6, H - 6]] : [[14, 14], [W - 52, H - 150]], { type: "FeatureCollection", features: provFeats });
    const path = d3.geoPath(proj);
    gBase.selectAll("path").data(provFeats).join("path").attr("d", path).attr("fill", "#1A2A42").attr("stroke", "#2D3A4F").attr("stroke-width", .7).attr("vector-effect", "non-scaling-stroke");
    defs();
    drawFlows(true);
  }
  function defs() {
    svg.selectAll("defs").remove();
    const df = svg.insert("defs", ":first-child");
    Object.entries(ON_DARK).forEach(([k, c]) => df.append("marker").attr("id", "ar-" + k).attr("viewBox", "0 -5 10 10").attr("refX", 8).attr("refY", 0)
      .attr("markerWidth", 7).attr("markerHeight", 7).attr("markerUnits", "userSpaceOnUse").attr("orient", "auto").append("path").attr("d", "M0,-4L10,0L0,4").attr("fill", c));
  }
  function curve(f) {
    const a = pt(P_BY.get(f.o)), b = pt(P_BY.get(f.d));
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const c = [(a[0] + b[0]) / 2 - dy * 0.22, (a[1] + b[1]) / 2 + dx * 0.22];
    return { f, a, b, c, w: wScale(f.v), col: colorOf(f) };
  }
  function drawFlows(rebuild) {
    const vis = visibleFlows();
    curves = vis.map(curve);
    const key = f => f.o + ">" + f.d;
    const sel = gFlow.selectAll("path").data(curves, c => key(c.f));
    sel.join(en => en.append("path").attr("fill", "none").attr("stroke-linecap", "round").style("cursor", "pointer").attr("opacity", 0)
      .on("mousemove", (e, c) => { const o = P_BY.get(c.f.o); TIP.show(`<b>${c.f.o} → ${c.f.d}</b><span class="num">${fmt.int(c.f.v)}</span> orang<br><span class="t-sub">${fmt.d1(c.f.v / o.keluar * 100)}% dari seluruh migran keluar ${SHORT[c.f.o]}</span>`, e); })
      .on("mouseleave", () => TIP.hide()))
      .attr("d", c => `M${c.a}Q${c.c} ${c.b}`).attr("stroke", c => c.col).attr("stroke-width", c => c.w)
      .attr("marker-end", c => `url(#ar-${!S.sel ? "neutral" : c.f.o === S.sel ? "out" : "in"})`)
      .transition().duration(rebuild && !APP.reduced ? 500 : 0).attr("opacity", c => 0.28 + 0.5 * Math.min(1, c.w / 8));
    gFlow.selectAll("path").sort((a, b) => b.w - a.w);
    // simpul
    const tot = d3.scaleSqrt().domain([0, d3.max(P, p => p.masuk + p.keluar)]).range([2.5, 11]);
    gNode.selectAll("circle").data(P, p => p.prov).join("circle")
      .attr("cx", p => pt(p)[0]).attr("cy", p => pt(p)[1]).attr("r", p => tot(p.masuk + p.keluar))
      .attr("fill", p => p.prov === S.sel ? "#fff" : "#0F1B2D").attr("stroke", p => p.neto_pct >= 0 ? ON_DARK.in : ON_DARK.out).attr("stroke-width", 2).style("cursor", "pointer")
      .on("mousemove", (e, p) => TIP.show(`<b>${p.prov}</b><span class="t-sub">2020, migran risen antarprovinsi</span><br>Masuk <span class="num pos">${fmt.int(p.masuk)}</span><br>Keluar <span class="num neg">${fmt.int(p.keluar)}</span><br>Neto <span class="num">${minus(fmt.signed2(p.neto_pct))}%</span><br><span class="t-sub">Klik untuk memilih</span>`, e))
      .on("mouseleave", () => TIP.hide()).on("click", (e, p) => setSel(S.sel === p.prov ? null : p.prov));
    const labs = S.sel ? [S.sel, ...new Set(vis.slice(0, 8).flatMap(f => [f.o, f.d]))] : [...new Set(vis.slice(0, 6).flatMap(f => [f.o, f.d]))];
    gLab.selectAll("text").data([...new Set(labs)], d => d).join("text").attr("x", d => pt(P_BY.get(d))[0] + 9).attr("y", d => pt(P_BY.get(d))[1] - 7)
      .text(d => SHORT[d]).attr("fill", "#fff").attr("font-size", d => d === S.sel ? 14 : 12).attr("font-weight", 600).attr("stroke", "#0B1524").attr("stroke-width", 3.5).attr("paint-order", "stroke");
    // partikel
    particles = [];
    curves.forEach((c, i) => { const n = Math.max(1, Math.round(c.w * 1.4)); for (let k = 0; k < n; k++) particles.push({ i, t: (k + Math.random()) / n, s: 0.003 + Math.random() * 0.002 }); });
    legend(); syncControls(); OD.highlight(S.sel); Chord.highlight(S.sel);
    if (!S.anim) frame();
  }
  const q = (c, t) => [(1 - t) * (1 - t) * c.a[0] + 2 * (1 - t) * t * c.c[0] + t * t * c.b[0], (1 - t) * (1 - t) * c.a[1] + 2 * (1 - t) * t * c.c[1] + t * t * c.b[1]];
  function frame() {
    ctx.clearRect(0, 0, W, H);
    if (S.anim) {
      particles.forEach(p => {
        p.t += p.s; if (p.t > 1) p.t -= 1;
        const c = curves[p.i]; if (!c) return; const [x, y] = q(c, p.t);
        ctx.globalAlpha = Math.sin(Math.PI * p.t); ctx.fillStyle = c.col;
        ctx.beginPath(); ctx.arc(x, y, Math.min(4, 1.2 + c.w * 0.18), 0, 6.283); ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (visible) raf = requestAnimationFrame(frame);
    }
  }
  function startAnim() { cancelAnimationFrame(raf); if (S.anim && visible) raf = requestAnimationFrame(frame); else frame(); }
  new IntersectionObserver(e => { visible = e[0].isIntersecting; startAnim(); }).observe(body);

  function legend() {
    const el = document.getElementById("flowLegend");
    const sw = [10000, 50000, 200000].map(v => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:10px"><svg width="30" height="16"><line x1="2" x2="28" y1="8" y2="8" stroke="#A9C1DD" stroke-width="${wScale(v)}" stroke-linecap="round"/></svg><span class="num" style="font-size:10.5px">${fmt.compact(v)}</span></span>`).join("");
    const vis = visibleFlows(), share = d3.sum(vis, f => f.v) / (S.sel ? d3.sum(FL.filter(f => (S.dir !== "in" && f.o === S.sel) || (S.dir !== "out" && f.d === S.sel)), f => f.v) : D.flows.total_antarprovinsi) * 100;
    const info = S.sel ? `Menampilkan ${vis.length} arus terbesar ${S.dir === "in" ? "yang masuk ke" : S.dir === "out" ? "yang keluar dari" : "masuk dan keluar"} ${SHORT[S.sel]} (${fmt.int(share)}% volumenya)`
      : S.filter ? `Menampilkan ${vis.length} arus terpilih` : `Menampilkan ${vis.length} dari ${fmt.int(FL.length)} arus (${fmt.int(share)}% dari seluruh migran antarprovinsi). Pilih provinsi untuk melihat arus masuk dan keluarnya.`;
    el.innerHTML = `<div class="lg-title">Ketebalan = jumlah migran</div>${sw}<div style="font-size:11px;margin-top:4px">${info}</div>` +
      (S.sel ? `<div style="margin-top:5px"><span style="color:${ON_DARK.in}">━ Masuk ke ${SHORT[S.sel]}</span> &nbsp; <span style="color:${ON_DARK.out}">━ Keluar dari ${SHORT[S.sel]}</span></div>` : `<div style="margin-top:5px;font-size:11px">Lingkar simpul: <span style="color:${ON_DARK.in}">biru neto +</span>, <span style="color:${ON_DARK.out}">oranye neto −</span></div>`);
  }
  function syncControls() {
    document.getElementById("flowProv").value = S.sel || "";
    setSeg(document.getElementById("flowDir"), S.dir);
    document.querySelectorAll("#flowDir button").forEach(b => { b.disabled = !S.sel; b.title = S.sel ? "" : "Pilih satu provinsi dulu untuk memisahkan arus masuk dan keluar"; });
    document.getElementById("flowN").value = S.n; document.getElementById("flowNval").textContent = S.n;
  }
  function setSel(p) { S.sel = p; S.filter = null; drawFlows(true); }
  function zoomLonLat(b) {
    if (!b) return svg.transition().duration(APP.reduced ? 0 : 900).call(zoom.transform, d3.zoomIdentity);
    const p0 = proj([b[0], b[3]]), p1 = proj([b[2], b[1]]);
    const ch = W < 600 ? H : H - 150;
    const k = Math.min(14, 0.85 / Math.max((p1[0] - p0[0]) / W, (p1[1] - p0[1]) / ch));
    svg.transition().duration(APP.reduced ? 0 : 1000).call(zoom.transform, d3.zoomIdentity.translate(W / 2, ch / 2).scale(k).translate(-(p0[0] + p1[0]) / 2, -(p0[1] + p1[1]) / 2));
  }
  const isJava = p => P_BY.get(p).pulau === "Jawa";
  const STEPS = [
    { sel: null, n: 50, z: null },
    { sel: "DKI Jakarta", dir: "out", n: 33, z: null },
    { sel: null, n: 30, filter: f => isJava(f.o) && isJava(f.d), z: [104.8, -9.0, 115.5, -5.0] },
    { sel: null, n: 16, filter: f => f.d === "Riau" || f.d === "Kepulauan Riau", z: [94.5, -6.5, 110, 6] },
    { sel: "Kalimantan Timur", dir: "in", n: 20, z: null },
    { sel: null, n: 60, z: null },
  ];
  function step(i) { const s = STEPS[i]; Object.assign(S, { sel: s.sel, dir: s.dir || "both", n: s.n, filter: s.filter || null }); drawFlows(true); zoomLonLat(s.z); }

  /* ---------- Matriks OD ---------- */
  const OD = (() => {
    const el = document.getElementById("odChart");
    const M = new Map(FL.map(f => [f.o + ">" + f.d, f.v]));
    let order = "code", cells, xS, yS;
    const color = d3.scaleSequentialLog(t => d3.interpolateYlGnBu(0.05 + t * 0.8)).domain([50, vmax]).clamp(true);
    function draw() {
      el.innerHTML = "";
      const names = order === "code" ? P.map(p => p.prov) : P.slice().sort((a, b) => (b.masuk + b.keluar) - (a.masuk + a.keluar)).map(p => p.prov);
      const w = Math.max(420, el.clientWidth), lab = 62, cs = (w - lab - 6) / names.length, h = lab + cs * names.length + 52;
      const s = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`);
      xS = d3.scaleBand().domain(names).range([lab, lab + cs * names.length]); yS = d3.scaleBand().domain(names).range([lab, lab + cs * names.length]);
      const data = names.flatMap(o => names.map(d => ({ o, d, v: o === d ? null : (M.get(o + ">" + d) || 0) })));
      s.append("defs").html(`<pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="#3A4A63" stroke-width="2"/></pattern>`);
      cells = s.append("g").selectAll("rect").data(data).join("rect").attr("x", c => xS(c.d)).attr("y", c => yS(c.o)).attr("width", cs - .5).attr("height", cs - .5)
        .attr("fill", c => c.v == null ? "url(#hatch)" : c.v === 0 ? "#0F1B2D" : color(c.v)).attr("stroke", c => c.v === 0 ? "#2D3A4F" : null).attr("stroke-width", .5)
        .on("mousemove", (e, c) => { if (c.v == null) return; TIP.show(`<b>${c.o} → ${c.d}</b><span class="num">${fmt.int(c.v)}</span> orang`, e); s.selectAll(".lab").attr("opacity", t => t === c.o || t === c.d ? 1 : .45); })
        .on("mouseleave", () => { TIP.hide(); s.selectAll(".lab").attr("opacity", 1); })
        .on("click", (e, c) => setSel(c.o));
      s.append("g").selectAll("text").data(names).join("text").attr("class", "lab").attr("x", lab - 4).attr("y", d => yS(d) + cs * .72).attr("text-anchor", "end").attr("font-size", Math.min(10, cs * .8)).attr("fill", "#DCE6F2").text(d => SHORT[d]).style("cursor", "pointer").on("click", (e, d) => setSel(d));
      s.append("g").selectAll("text").data(names).join("text").attr("class", "lab").attr("transform", d => `translate(${xS(d) + cs * .7},${lab - 4}) rotate(-60)`).attr("font-size", Math.min(10, cs * .8)).attr("fill", "#DCE6F2").text(d => SHORT[d]).style("cursor", "pointer").on("click", (e, d) => setSel(d));
      s.append("text").attr("x", lab).attr("y", 10).attr("fill", "#AEBBCD").attr("font-size", 11).text("Tujuan →");
      s.append("text").attr("x", 2).attr("y", lab - 2).attr("fill", "#AEBBCD").attr("font-size", 11).text("Asal ↓");
      s.append("g").attr("class", "selbox");
      // legenda
      const lg = s.append("g").attr("transform", `translate(${lab},${h - 34})`), lw = Math.min(260, w - lab - 10);
      const ticks = [100, 1000, 10000, 100000];
      lg.selectAll("rect").data(d3.range(60)).join("rect").attr("x", i => i * lw / 60).attr("width", lw / 60 + .5).attr("height", 10).attr("fill", i => color(Math.exp(Math.log(50) + (Math.log(vmax) - Math.log(50)) * i / 59)));
      const ls = d3.scaleLog().domain([50, vmax]).range([0, lw]);
      lg.append("g").attr("class", "axis").attr("transform", "translate(0,10)").call(d3.axisBottom(ls).tickValues(ticks).tickFormat(v => fmt.compact(v))).call(g => g.select(".domain").remove());
      highlight(S.sel);
    }
    function highlight(p) {
      if (!cells) return;
      cells.attr("opacity", c => !p || c.o === p || c.d === p ? 1 : .3);
    }
    segmented(document.getElementById("odOrder"), v => { order = v; draw(); });
    return { draw, highlight };
  })();

  /* ---------- Chord berarah ---------- */
  const Chord = (() => {
    const el = document.getElementById("chordChart");
    const names = P.map(p => p.prov);
    const idx = new Map(names.map((n, i) => [n, i]));
    const mat = names.map(() => names.map(() => 0));
    FL.forEach(f => { mat[idx.get(f.o)][idx.get(f.d)] = f.v; });
    let ribbons, groups;
    function draw() {
      el.innerHTML = "";
      const w = Math.max(320, el.clientWidth), r0 = w / 2 - 58, r1 = r0 + 12;
      const s = d3.select(el).append("svg").attr("viewBox", `${-w / 2} ${-w / 2} ${w} ${w}`);
      const chords = d3.chordDirected().padAngle(0.012).sortSubgroups(d3.descending)(mat);
      const arc = d3.arc().innerRadius(r0).outerRadius(r1), rib = d3.ribbonArrow().radius(r0 - 2).padAngle(1 / r0);
      ribbons = s.append("g").attr("fill-opacity", .7).selectAll("path").data(chords.filter(c => c.source.value >= 2000)).join("path")
        .attr("d", rib).attr("fill", c => COL.island[P[c.source.index].pulau])
        .on("mousemove", (e, c) => TIP.show(`<b>${names[c.source.index]} → ${names[c.target.index]}</b><span class="num">${fmt.int(c.source.value)}</span> orang`, e)).on("mouseleave", () => TIP.hide());
      groups = s.append("g").selectAll("g").data(chords.groups).join("g");
      groups.append("path").attr("d", arc).attr("fill", g => COL.island[P[g.index].pulau]).attr("stroke", "#0F1B2D").style("cursor", "pointer")
        .on("mousemove", (e, g) => { const p = P[g.index]; TIP.show(`<b>${p.prov}</b>Keluar <span class="num neg">${fmt.int(p.keluar)}</span><br>Masuk <span class="num pos">${fmt.int(p.masuk)}</span>`, e); highlight(p.prov, true); })
        .on("mouseleave", () => { TIP.hide(); highlight(S.sel); }).on("click", (e, g) => setSel(S.sel === names[g.index] ? null : names[g.index]));
      groups.append("text").each(g => { g.angle = (g.startAngle + g.endAngle) / 2; })
        .attr("dy", ".35em").attr("transform", g => `rotate(${g.angle * 180 / Math.PI - 90}) translate(${r1 + 4}) ${g.angle > Math.PI ? "rotate(180)" : ""}`)
        .attr("text-anchor", g => g.angle > Math.PI ? "end" : null).attr("font-size", 10).attr("fill", "#DCE6F2").text(g => SHORT[names[g.index]]);
      const lg = d3.select(el).append("div").attr("style", "display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;margin-top:6px");
      ISLANDS.forEach(k => lg.append("span").html(`<i style="display:inline-block;width:10px;height:10px;background:${COL.island[k]};margin-right:4px"></i>${k}`));
      highlight(S.sel);
    }
    function highlight(p) {
      if (!ribbons) return;
      const i = p ? idx.get(p) : null;
      ribbons.attr("fill-opacity", c => i == null ? .62 : (c.source.index === i || c.target.index === i) ? .9 : .05);
    }
    return { draw, highlight };
  })();

  function init() {
    const sel = document.getElementById("flowProv");
    sel.innerHTML += P.map(p => `<option value="${p.prov}">${p.prov}</option>`).join("");
    sel.onchange = () => setSel(sel.value || null);
    segmented(document.getElementById("flowDir"), v => { S.dir = v; drawFlows(true); });
    const n = document.getElementById("flowN");
    n.oninput = () => { S.n = +n.value; S.filter = null; document.getElementById("flowNval").textContent = n.value; drawFlows(false); };
    const ab = document.getElementById("flowAnim");
    if (!S.anim) { ab.textContent = "Putar animasi"; ab.setAttribute("aria-pressed", "false"); }
    ab.onclick = () => { S.anim = !S.anim; ab.textContent = S.anim ? "Jeda animasi" : "Putar animasi"; ab.setAttribute("aria-pressed", String(S.anim)); startAnim(); };
    document.getElementById("fzIn").onclick = () => svg.transition().call(zoom.scaleBy, 1.8);
    document.getElementById("fzOut").onclick = () => svg.transition().call(zoom.scaleBy, 1 / 1.8);
    document.getElementById("fzReset").onclick = () => zoomLonLat(null);
    OD.draw(); Chord.draw(); layout();
    onResize(body, layout, true);
    onResize(document.getElementById("odChart").parentElement, () => { OD.draw(); Chord.draw(); });
    makeCarousel(document.getElementById("story2"), step);
  }
  return { init, SHORT };
})();

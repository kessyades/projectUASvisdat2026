/* Bab 5: Treemap dan sunburst zoomable (pulau → provinsi → kab/kota) */
const HierCh = (() => {
  let v = "tfr", focus;
  const VL = { tfr: ["TFR", fmt.d2], lansia_65plus: ["% umur 65+", fmt.d1], umur_20_39: ["% umur 20–39", fmt.d1], rasio_ketergantungan: ["Rasio ketergantungan", fmt.d1], imr: ["Angka kematian bayi", fmt.d2] };
  const tree = { name: "Indonesia", children: ISLANDS.map(isl => ({ name: isl, children: d3.groups(KAB.filter(d => d.pulau === isl), d => d.nama_prov).sort((a, b) => a[0].localeCompare(b[0])).map(([p, ks]) => ({ name: p, children: ks.map(k => ({ name: k.nama_kabkota, kab: k, total: k.total })) })) })) };
  const root = d3.hierarchy(tree).sum(d => d.total || 0).sort((a, b) => b.value - a.value);
  focus = root;
  let color;
  function weighted() {
    root.eachAfter(n => { n.wm = n.data.kab ? n.data.kab[v] : d3.sum(n.children, c => c.wm * c.value) / n.value; });
    color = d3.scaleQuantile().domain(KAB.map(d => d[v])).range(COL.seq);
  }
  const fill = n => color(n.wm);
  const ink = n => COL.seq.indexOf(color(n.wm)) >= 3 ? "#fff" : "#1F2933";
  const tipHtml = n => `<b>${n.data.name}</b><span class="t-sub">${n.ancestors().slice(1, -1).reverse().map(a => a.data.name).join(" › ") || "Indonesia"}</span><br>Penduduk <span class="num">${fmt.int(n.value)}</span> (${fmt.d1(n.value / root.value * 100)}% nasional)<br>${VL[v][0]} <span class="num">${VL[v][1](n.wm)}</span>${n.children ? " <span class='t-sub'>(rata-rata tertimbang)</span>" : ""}`;
  const findOrig = path => { let n = root; for (const name of path) n = n.children.find(c => c.data.name === name); return n; };
  const pathOf = n => n.ancestors().reverse().slice(1).map(a => a.data.name);

  function setFocus(n) { focus = n; draw(); }
  function crumbs() {
    const el = document.getElementById("crumbs");
    el.innerHTML = focus.ancestors().reverse().map((a, i, arr) => `<button data-i="${i}">${a.data.name}</button>${i < arr.length - 1 ? "<span>›</span>" : ""}`).join("");
    el.querySelectorAll("button").forEach(b => b.onclick = () => setFocus(focus.ancestors().reverse()[+b.dataset.i]));
  }
  function treemap() {
    const el = document.getElementById("treemap"); el.innerHTML = "";
    const w = Math.max(300, el.clientWidth), h = Math.max(320, Math.min(520, w * .7));
    const sub = d3.hierarchy(focus.data).sum(d => d.total || 0).sort((a, b) => b.value - a.value);
    const base = pathOf(focus);
    sub.each(n => { n.orig = findOrig([...base, ...pathOf(n)]); });
    d3.treemap().size([w, h]).paddingInner(1.5).paddingOuter(1).paddingTop(n => n.depth === 1 && n.children ? 17 : 0).round(true)(sub);
    const s = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`);
    const shown = sub.descendants().filter(n => n.depth === 2 || (n.depth === 1 && !n.children));
    const groups = sub.children || [];
    s.append("g").selectAll("rect").data(groups.filter(g => g.children)).join("rect").attr("x", n => n.x0).attr("y", n => n.y0).attr("width", n => n.x1 - n.x0).attr("height", n => n.y1 - n.y0).attr("fill", "#D9E2EC");
    const cell = s.append("g").selectAll("g").data(shown).join("g").attr("transform", n => `translate(${n.x0},${n.y0})`).style("cursor", n => n.orig.children || n.parent.orig.children ? "pointer" : "default")
      .on("mousemove", (e, n) => TIP.show(tipHtml(n.orig) + (n.orig.children ? "<br><span class='t-sub'>Klik untuk masuk</span>" : ""), e)).on("mouseleave", () => TIP.hide())
      .on("click", (e, n) => { TIP.hide(); const target = n.orig.children ? (n.depth === 2 ? n.parent.orig : n.orig) : (n.depth === 2 && n.parent.orig !== focus ? n.parent.orig : null); if (target) setFocus(target); });
    cell.append("rect").attr("width", n => Math.max(0, n.x1 - n.x0)).attr("height", n => Math.max(0, n.y1 - n.y0)).attr("fill", n => fill(n.orig));
    cell.filter(n => n.x1 - n.x0 > 44 && n.y1 - n.y0 > 18).append("text").attr("x", 4).attr("y", 13).attr("font-size", 11).attr("fill", n => ink(n.orig))
      .text(n => { const t = n.data.name; const max = Math.floor((n.x1 - n.x0 - 6) / 6); return t.length > max ? t.slice(0, max - 1) + "…" : t; });
    s.append("g").selectAll("text").data(groups.filter(g => g.children)).join("text").attr("x", n => n.x0 + 4).attr("y", n => n.y0 + 12).attr("font-size", 11.5).attr("font-weight", 700).attr("fill", "#1F2933")
      .text(n => { const t = n.data.name + " · " + fmt.compact(n.value); const max = Math.floor((n.x1 - n.x0 - 6) / 6.5); return t.length > max ? t.slice(0, Math.max(0, max - 1)) + "…" : t; })
      .style("cursor", "pointer").on("click", (e, n) => setFocus(n.orig));
  }
  function sunburst() {
    const el = document.getElementById("sunburst"); el.innerHTML = "";
    const w = Math.max(260, el.clientWidth), R = w / 2 - 4;
    const sub = d3.hierarchy(focus.data).sum(d => d.total || 0).sort((a, b) => b.value - a.value);
    const base = pathOf(focus);
    sub.each(n => { n.orig = findOrig([...base, ...pathOf(n)]); });
    const depth = Math.min(3, sub.height);
    d3.partition().size([2 * Math.PI, depth + 1])(sub);
    const r = d3.scaleLinear().domain([0, depth + 1]).range([0, R]);
    const arc = d3.arc().startAngle(n => n.x0).endAngle(n => n.x1).padAngle(n => Math.min((n.x1 - n.x0) / 2, .004)).padRadius(R / 2).innerRadius(n => r(n.y0) + (n.depth ? 1 : 0)).outerRadius(n => r(n.y1) - 1);
    const s = d3.select(el).append("svg").attr("viewBox", `${-w / 2} ${-w / 2} ${w} ${w}`);
    s.append("g").selectAll("path").data(sub.descendants().filter(n => n.depth > 0 && n.depth <= depth)).join("path").attr("d", arc).attr("fill", n => fill(n.orig))
      .style("cursor", n => n.orig.children ? "pointer" : "default")
      .on("mousemove", (e, n) => TIP.show(tipHtml(n.orig), e)).on("mouseleave", () => TIP.hide())
      .on("click", (e, n) => { TIP.hide(); if (n.orig.children) setFocus(n.orig); });
    s.append("circle").attr("r", r(1) - 2).attr("fill", "#fff").attr("stroke", "#E4E7EB").style("cursor", focus.parent ? "pointer" : "default").on("click", () => focus.parent && setFocus(focus.parent));
    s.append("text").attr("text-anchor", "middle").attr("y", -4).attr("font-family", "var(--serif)").attr("font-size", 13).attr("font-weight", 600).text(focus.data.name.length > 16 ? focus.data.name.slice(0, 15) + "…" : focus.data.name);
    s.append("text").attr("text-anchor", "middle").attr("y", 12).attr("font-size", 11).attr("class", "num").attr("fill", "#52606D").text(fmt.compact(focus.value));
    if (focus.parent) s.append("text").attr("text-anchor", "middle").attr("y", 27).attr("font-size", 10).attr("fill", "#52606D").text("klik: kembali");
  }
  function legend() {
    const el = document.getElementById("hierLegend"), lows = [d3.min(color.domain()), ...color.quantiles()];
    el.innerHTML = `<div class="lg-title">${VL[v][0]} (kuantil kab/kota)</div><div class="lg-row">${COL.seq.map((c, i) => `<span class="lg-sw" style="cursor:default"><i style="background:${c}"></i><span>${i ? "≥" : ""}${VL[v][1](lows[i])}</span></span>`).join("")}</div>`;
  }
  function draw() { crumbs(); treemap(); sunburst(); legend(); }
  function init() {
    weighted();
    document.getElementById("hierVar").onchange = e => { v = e.target.value; weighted(); draw(); };
    draw();
    onResize(document.getElementById("treemap"), draw);
  }
  return { init };
})();

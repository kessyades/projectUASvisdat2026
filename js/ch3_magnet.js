/* Bab 3: Dumbbell migran masuk–keluar 2025, peta neto provinsi, slope chart peringkat 2020→2025 */
const MagnetCh = (() => {
  const rows = PROV.slice();
  let sortBy = "neto", hoverP = null;
  const provFeats = topoFeatures(D.provTopo, "kab");

  /* Grafik kupu-kupu: kiri = migran keluar (pergi), kanan = migran masuk (datang), kolom neto */
  function dumbbell() {
    const el = document.getElementById("dumbbell"); el.innerHTML = "";
    const w = Math.max(320, el.clientWidth), mob = w < 560;
    const rh = mob ? 18 : 19, nameW = mob ? 74 : 150, netW = mob ? 44 : 60, top = 40;
    const sorted = rows.slice().sort((a, b) => sortBy === "nama" ? a.nama_prov.localeCompare(b.nama_prov) : (b.mig_neto_pct ?? -99) - (a.mig_neto_pct ?? -99));
    const side = (w - nameW - netW - 8) / 2, cx = side;                 // cx = tepi kiri kolom nama
    const xL = d3.scaleLinear().domain([0, 7]).range([cx - 2, 0]);      // keluar tumbuh ke kiri
    const xR = d3.scaleLinear().domain([0, 7]).range([cx + nameW + 2, cx + nameW + side]);
    const h = top + rh * sorted.length + 26;
    const s = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`);
    const ABR = { "Papua Barat Daya": "PBD", "Papua Selatan": "Pasel", "Papua Tengah": "Pateng", "Papua Pegunungan": "Papeg" };
    const short = n => mob ? (FlowCh.SHORT[n] || ABR[n] || n) : n.replace("Daerah Istimewa", "DI").replace("Kepulauan Bangka Belitung", "Kep. Babel").replace("Kepulauan", "Kep.").replace("Nusa Tenggara", "NT");
    // judul kolom
    s.append("text").attr("x", cx - 4).attr("y", 14).attr("text-anchor", "end").attr("font-size", 12).attr("font-weight", 700).attr("fill", "#B35806").text(mob ? "← Pergi" : "← Pergi (migran keluar)");
    s.append("text").attr("x", cx + nameW + 4).attr("y", 14).attr("font-size", 12).attr("font-weight", 700).attr("fill", COL.in).text(mob ? "Datang →" : "Datang (migran masuk) →");
    s.append("text").attr("x", w - 2).attr("y", 14).attr("text-anchor", "end").attr("font-size", 12).attr("font-weight", 700).attr("fill", "#1F2933").text("Neto");
    // grid
    const ticks = [0, 2, 4, 6];
    const g0 = s.append("g").attr("class", "axis");
    ticks.forEach(t => {
      [xL(t), xR(t)].forEach(x => g0.append("line").attr("x1", x).attr("x2", x).attr("y1", top - 6).attr("y2", h - 22).attr("stroke", "#EEF1F4"));
      g0.append("text").attr("x", xL(t)).attr("y", top - 10).attr("text-anchor", "middle").text(t + "%");
      g0.append("text").attr("x", xR(t)).attr("y", top - 10).attr("text-anchor", "middle").text(t + "%");
    });
    const y = (i) => top + i * rh;
    const g = s.append("g").selectAll("g").data(sorted).join("g").attr("transform", (d, i) => `translate(0,${y(i)})`)
      .on("mousemove", (e, d) => { hover(d.nama_prov); TIP.show(`<b>${d.nama_prov}</b>Datang <span class="num pos">${d.mig_masuk_pct == null ? "t.t." : fmt.d2(d.mig_masuk_pct) + "%"}</span> (${d.mig_masuk_jml == null ? "–" : fmt.int(d.mig_masuk_jml) + " orang"})<br>Pergi <span class="num neg">${fmt.d2(d.mig_keluar_pct)}%</span> (${fmt.int(d.mig_keluar_jml)} orang)<br>Neto <span class="num">${d.mig_neto_pct == null ? "tidak tersedia" : minus(fmt.signed2(d.mig_neto_pct)) + "% (" + minus(LOC.format("+,.0f")(d.mig_neto_jml)) + " orang)"}</span>`, e); })
      .on("mouseleave", () => { hover(null); TIP.hide(); });
    g.append("rect").attr("class", "hlrow").attr("x", 0).attr("width", w).attr("height", rh).attr("fill", "#E9EEF5").attr("opacity", 0);
    const bh = rh - 6;
    g.append("rect").attr("x", d => xL(d.mig_keluar_pct)).attr("y", 3).attr("width", d => xL(0) - xL(d.mig_keluar_pct)).attr("height", bh).attr("fill", COL.out).attr("rx", 2);
    g.filter(d => d.mig_masuk_pct != null).append("rect").attr("x", xR(0)).attr("y", 3).attr("width", d => xR(d.mig_masuk_pct) - xR(0)).attr("height", bh).attr("fill", COL.in).attr("rx", 2);
    g.append("text").attr("x", cx + nameW / 2).attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "middle").attr("font-size", mob ? 10.5 : 12).attr("fill", "#1F2933").text(d => short(d.nama_prov));
    g.append("text").attr("x", w - 2).attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "end").attr("font-family", "var(--mono)").attr("font-size", mob ? 10.5 : 11.5).attr("font-weight", 600)
      .attr("fill", d => d.mig_neto_pct == null ? "#52606D" : d.mig_neto_pct >= 0 ? COL.in : "#B35806").text(d => d.mig_neto_pct == null ? "t.t." : minus(fmt.signed2(d.mig_neto_pct)));
    // pemisah magnet | pelepas
    if (sortBy !== "nama") {
      const nMag = sorted.filter(d => d.mig_neto_pct > 0).length, ys = y(nMag);
      s.append("line").attr("x1", 0).attr("x2", w).attr("y1", ys).attr("y2", ys).attr("stroke", "#1F2933").attr("stroke-dasharray", "4 3");
      s.append("text").attr("x", 2).attr("y", ys - 4).attr("font-size", 11).attr("fill", COL.in).attr("font-weight", 600).text(`▲ ${nMag} magnet`);
      s.append("text").attr("x", 2).attr("y", ys + 13).attr("font-size", 11).attr("fill", "#B35806").attr("font-weight", 600).text(`▼ ${sorted.filter(d => d.mig_neto_pct < 0).length} pelepas`);
    }
    // legenda + satu contoh di bawah grafik
    const top1 = rows.slice().sort((a, b) => (b.mig_neto_pct ?? -99) - (a.mig_neto_pct ?? -99))[0];
    d3.select(el).append("div").attr("class", "chart-legend").html(`<span><i style="background:${COL.out}"></i>Pergi (% migran keluar)</span><span><i style="background:${COL.in}"></i>Datang (% migran masuk)</span>`);
    d3.select(el).append("p").attr("class", "chart-example").html(`<b>Contoh:</b> ${top1.nama_prov} kedatangan ${fmt.d2(top1.mig_masuk_pct)}% pendatang dan hanya kehilangan ${fmt.d2(top1.mig_keluar_pct)}% penduduknya, sehingga neto ${minus(fmt.signed2(top1.mig_neto_pct))}%.`);
  }

  let mapPaths;
  function netMap() {
    const el = document.getElementById("netMap"); el.innerHTML = "";
    const w = Math.max(300, el.clientWidth), h = w * 0.42;
    const proj = d3.geoMercator().fitExtent([[4, 4], [w - 4, h - 4]], { type: "FeatureCollection", features: provFeats }), path = d3.geoPath(proj);
    const s = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`);
    mapPaths = s.append("g").selectAll("path").data(provFeats).join("path").attr("d", path)
      .attr("fill", f => { const p = PROV_BY.get(norm(f.properties.prov)); return p && p.mig_neto_pct != null ? divergeNet(p.mig_neto_pct) : COL.na; })
      .attr("stroke", "#fff").attr("stroke-width", .5)
      .on("mousemove", (e, f) => { const p = PROV_BY.get(norm(f.properties.prov)); hover(p.nama_prov); TIP.show(`<b>${p.nama_prov}</b>Neto 2025 <span class="num">${p.mig_neto_pct == null ? "tidak tersedia" : minus(fmt.signed2(p.mig_neto_pct)) + "%"}</span>`, e); })
      .on("mouseleave", () => { hover(null); TIP.hide(); });
    const dki = PROV_BY.get(norm("DKI Jakarta"));
    const sw = c => `<i style="background:${c}"></i>`;
    const lg = d3.select(el).append("div").attr("class", "chart-legend legend-box");
    lg.html(`<span>${sw(divergeNet(1.2))}Magnet (neto +)</span><span>${sw(divergeNet(-1.2))}Pelepas (neto −)</span><span>${sw(divergeNet(dki.mig_neto_pct))}DKI Jakarta (di luar skala)</span><span>${sw(COL.na)}Tidak tersedia</span>`);
    const lw = Math.min(150, w - 40), gs = d3.select(el).append("svg").attr("viewBox", `0 0 ${lw + 40} 62`).style("max-width", (lw + 40) + "px").style("margin-top", "4px");
    const gg = gs.append("g").attr("transform", "translate(20,4)");
    gg.selectAll("rect").data(d3.range(48)).join("rect").attr("x", i => i * lw / 48).attr("width", lw / 48 + .5).attr("height", 10).attr("fill", i => divergeNet(-2 + 4 * i / 47));
    gg.append("g").attr("class", "axis").attr("transform", "translate(0,10)").call(d3.axisBottom(d3.scaleLinear().domain([-2, 2]).range([0, lw])).tickValues([-2, -1, 0, 1, 2]).tickFormat(v => v === 0 ? "0" : minus(LOC.format("+,.0f")(v)))).call(g => g.select(".domain").remove());
    gg.append("text").attr("x", lw / 2).attr("y", 40).attr("text-anchor", "middle").attr("font-size", 10.5).attr("fill", "#52606D").text("Migrasi neto (%)");
    gg.append("text").attr("x", lw / 2).attr("y", 53).attr("text-anchor", "middle").attr("font-size", 10.5).attr("fill", "#52606D").text("skala warna dibatasi ±2");
  }
  function hover(p) {
    hoverP = p;
    d3.select("#dumbbell").selectAll(".hlrow").attr("opacity", d => d.nama_prov === p ? 1 : 0);
    if (mapPaths) mapPaths.attr("stroke", f => f.properties.prov === p ? "#0F1B2D" : "#fff").attr("stroke-width", f => f.properties.prov === p ? 2 : .5).filter(f => f.properties.prov === p).raise();
  }

  /* Slope chart peringkat: 34 provinsi (2020) dan 38 provinsi (2025) */
  function slope() {
    const el = document.getElementById("slope"); el.innerHTML = "";
    const P20 = D.flows.provinces.slice().sort((a, b) => b.neto_pct - a.neto_pct).map((d, i) => ({ prov: d.prov, v: d.neto_pct, r: i + 1 }));
    const P25 = PROV.filter(d => d.mig_neto_pct != null).sort((a, b) => b.mig_neto_pct - a.mig_neto_pct).map((d, i) => ({ prov: d.nama_prov, v: d.mig_neto_pct, r: i + 1 }));
    PROV.filter(d => d.mig_neto_pct == null).forEach(d => P25.push({ prov: d.nama_prov, v: null, r: P25.length + 1 }));
    const R20 = new Map(P20.map(d => [d.prov, d])), R25 = new Map(P25.map(d => [d.prov, d]));
    const SPLIT = new Set(["Papua", "Papua Barat"]);
    const w = Math.max(300, el.clientWidth), rh = 15, m = { l: 104, r: 116, t: 30 }, h = m.t + rh * P25.length + 8;
    const yy = r => m.t + (r - 1) * rh + rh / 2;
    const ln = (c, dash) => `<svg width="28" height="10"><line x1="1" x2="27" y1="5" y2="5" stroke="${c}" stroke-width="2.5"${dash ? ' stroke-dasharray="4 3"' : ""}/></svg>`;
    d3.select(el).append("div").attr("class", "chart-legend").style("margin", "0 0 8px").html(`<span>${ln(COL.in)}Naik peringkat</span><span>${ln(COL.out)}Turun peringkat</span><span>${ln("#9AA5B1")}Tetap</span><span>${ln("#9AA5B1", true)}Wilayah berubah (pemekaran)*</span><span><em style="color:#7B8794">Miring</em>&nbsp;= provinsi baru</span>`);
    const s = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`);
    s.append("text").attr("x", m.l - 6).attr("y", 14).attr("text-anchor", "end").attr("font-size", 12).attr("font-weight", 700).text("2020 · 34 prov");
    s.append("text").attr("x", w - m.r + 6).attr("y", 14).attr("font-size", 12).attr("font-weight", 700).text("2025 · 38 prov");
    const ab = n => FlowCh.SHORT[n] || ({ "Papua Barat Daya": "PBD", "Papua Selatan": "Pasel", "Papua Tengah": "Pateng", "Papua Pegunungan": "Papeg" })[n] || n;
    const both = P20.filter(d => R25.get(d.prov) && R25.get(d.prov).r);
    const moves = both.map(d => ({ prov: d.prov, ch: d.r - R25.get(d.prov).r })).filter(d => !SPLIT.has(d.prov)).sort((a, b) => b.ch - a.ch);
    const strong = new Set([moves[0].prov, moves[1].prov, moves[moves.length - 1].prov, moves[moves.length - 2].prov, "DKI Jakarta", P25[0].prov]);
    const col = d => SPLIT.has(d.prov) ? "#9AA5B1" : d.ch > 0 ? COL.in : d.ch < 0 ? COL.out : "#9AA5B1";
    const data = both.map(d => ({ prov: d.prov, r20: d.r, r25: R25.get(d.prov).r, v20: d.v, v25: R25.get(d.prov).v, ch: d.r - R25.get(d.prov).r }));
    const g = s.append("g").selectAll("g").data(data).join("g").style("cursor", "default");
    g.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", d => yy(d.r20)).attr("y2", d => yy(d.r25)).attr("stroke", col)
      .attr("stroke-width", d => strong.has(d.prov) ? 2.6 : 1.2).attr("stroke-opacity", d => strong.has(d.prov) ? 1 : .5).attr("stroke-dasharray", d => SPLIT.has(d.prov) ? "4 3" : null);
    g.append("text").attr("x", m.l - 6).attr("y", d => yy(d.r20)).attr("dy", ".32em").attr("text-anchor", "end").attr("font-size", 10.5).attr("font-weight", d => strong.has(d.prov) ? 700 : 400).text(d => `${ab(d.prov)}${SPLIT.has(d.prov) ? "*" : ""} ${d.r20}`);
    g.append("text").attr("x", w - m.r + 6).attr("y", d => yy(d.r25)).attr("dy", ".32em").attr("font-size", 10.5).attr("font-weight", d => strong.has(d.prov) ? 700 : 400).text(d => `${d.r25} ${ab(d.prov)}${SPLIT.has(d.prov) ? "*" : ""}`);
    g.on("mousemove", (e, d) => { g.attr("opacity", x => x === d ? 1 : .15); hover(d.prov); TIP.show(`<b>${d.prov}</b>Peringkat ${d.r20} (2020) → ${d.r25} (2025)<br>Neto 2020 <span class="num">${minus(fmt.signed2(d.v20))}%</span> · 2025 <span class="num">${minus(fmt.signed2(d.v25))}%</span>${SPLIT.has(d.prov) ? "<br><span class='t-sub'>Wilayah 2025 lebih kecil karena pemekaran</span>" : ""}`, e); })
      .on("mouseleave", () => { g.attr("opacity", 1); hover(null); TIP.hide(); });
    // provinsi baru 2025 (tanpa garis)
    const baru = P25.filter(d => !R20.has(d.prov));
    s.append("g").selectAll("text").data(baru).join("text").attr("x", w - m.r + 6).attr("y", d => d.r ? yy(d.r) : yy(P25.length)).attr("dy", ".32em").attr("font-size", 10.5).attr("font-style", "italic").attr("fill", "#7B8794")
      .text(d => `${d.r} ${ab(d.prov)} (baru${d.v == null ? ", t.t." : ""})`)
      .on("mousemove", (e, d) => TIP.show(`<b>${d.prov}</b>Provinsi hasil pemekaran 2022; belum ada pada 2020.<br>${d.v != null ? `Peringkat 2025: ${d.r} (neto ${minus(fmt.signed2(d.v))}%)` : `Peringkat 2025: ${d.r} (terakhir), karena neto tidak tersedia (RSE > 50%)`}`, e)).on("mouseleave", () => TIP.hide());
  }
  function init() {
    segmented(document.getElementById("dbSort"), v => { sortBy = v; dumbbell(); });
    dumbbell(); netMap(); slope();
    onResize(document.getElementById("dumbbell"), () => { dumbbell(); });
    onResize(document.getElementById("netMap"), () => { netMap(); slope(); });
  }
  return { init };
})();

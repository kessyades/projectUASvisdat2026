/* Penutup: kartu cerita otomatis per kab/kota + tabel sumber */
const ExploreCh = (() => {
  const pctRank = (v, val) => { const arr = KAB.map(d => d[v]); return arr.filter(x => x < val).length / arr.length * 100; };
  const med = v => d3.median(KAB, d => d[v]);
  const IND = [["tfr", "TFR", fmt.d2], ["imr", "Kematian bayi", fmt.d2], ["umur_20_39", "% umur 20–39", fmt.d1], ["lansia_65plus", "% umur 65+", fmt.d1], ["rasio_ketergantungan", "Rasio ketergantungan", fmt.d1], ["rasio_jk", "Rasio jenis kelamin", fmt.d1]];
  function card(key) {
    const d = KAB_BY.get(key), p = PROV_BY.get(norm(d.nama_prov)), el = document.getElementById("storyCard");
    const tr = pctRank("tfr", d.tfr), ur = pctRank("umur_20_39", d.umur_20_39), lr = pctRank("lansia_65plus", d.lansia_65plus);
    const lisa = { HH: "Bersama tetangganya, daerah ini termasuk <b>kantong TFR tinggi</b> yang signifikan secara statistik.", LL: "Bersama tetangganya, daerah ini termasuk <b>kantong TFR rendah</b> yang signifikan secara statistik.", HL: "TFR-nya tinggi di tengah tetangga ber-TFR rendah.", LH: "TFR-nya rendah di tengah tetangga ber-TFR tinggi.", ns: "" }[d.lisa_tfr];
    const mig = p.mig_neto_pct == null ? `data migran masuk 2025 untuk ${p.nama_prov} tidak tersedia` :
      `pada 2025 ${p.nama_prov} adalah <b>${p.mig_neto_pct >= 0 ? "magnet" : "pelepas"}</b> penduduk dengan migrasi neto <mark class="${p.mig_neto_pct >= 0 ? "" : "o"}">${minus(fmt.signed2(p.mig_neto_pct))}%</mark>`;
    const cl = p.cluster ? ` dan tergolong tipe <b>“${CLUSTER_INFO[p.cluster].nama}”</b>` : "";
    el.innerHTML = `<h3>${d.nama_kabkota}</h3><div class="sc-sub">${d.nama_prov} · ${d.pulau} · ${fmt.int(d.total)} jiwa (SUPAS 2025)</div>
      <p>Angka kelahiran totalnya <mark>${fmt.d2(d.tfr)}</mark>, lebih tinggi dari ${fmt.int(tr)}% kab/kota lain${d.tfr < 2.1 ? ", dan sudah di bawah tingkat pengganti 2,1" : ""}. ${lisa}</p>
      <p>Sebanyak <mark>${fmt.d1(d.umur_20_39)}%</mark> penduduknya berumur 20–39 tahun (median nasional ${fmt.d1(med("umur_20_39"))}%) dan <mark class="o">${fmt.d1(d.lansia_65plus)}%</mark> berumur 65 tahun ke atas, ${lr >= 75 ? "termasuk seperempat daerah paling tua" : lr <= 25 ? "termasuk seperempat daerah paling muda" : "berada di kisaran tengah"}.</p>
      <p>Di tingkat provinsi, ${mig}${cl}.</p>
      <div class="bars-mini">${IND.map(([v, l, f]) => { const pr = pctRank(v, d[v]), mr = 50; return `<div class="bm"><span>${l}</span><span class="track" title="posisi di antara 514 kab/kota"><s style="left:${mr}%"></s><i style="left:calc(${pr}% - 2px)"></i></span><span class="num">${f(d[v])}</span></div>`; }).join("")}
      <div class="step-note">▮ posisi daerah ini di antara 514 kab/kota (kiri = terendah); garis oranye = median nasional.</div></div>`;
  }
  function init() {
    const inp = document.getElementById("exSearch");
    const go = () => { const k = MapCh.findKab(inp.value); if (k) card(k); };
    document.getElementById("exGo").onclick = go; inp.addEventListener("change", go);
    document.getElementById("exRand").onclick = () => { const d = KAB[Math.floor(Math.random() * KAB.length)]; inp.value = d.nama_kabkota + ", " + d.nama_prov; card(d.key); };
    card(keyOf("Kalimantan Timur", "Penajam Paser Utara"));
  }
  return { init };
})();

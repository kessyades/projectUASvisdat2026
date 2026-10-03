/* Tentang data: kartu metadata sumber (bisa disaring per bab) */
const MetaCh = (() => {
  const BAB = { 1: "Demografi", 2: "Arus Migrasi", 3: "Magnet 2025", 4: "Tipologi", 5: "Hierarki", 6: "Eksplor Daerahmu" };
  // jenis sumber, tingkat wilayah, dan bab yang memakainya
  const INFO = {
    tfr_kab: { jenis: "Tabel Statistk", level: "514 kab/kota + 38 provinsi", bab: [1, 4, 5, 6] },
    akb_kab: { jenis: "Tabel Statistk", level: "514 kab/kota", bab: [1, 5, 6] },
    umur: { jenis: "Tabel Statistk", level: "514 kab/kota", bab: [1, 4, 5, 6] },
    umur_l: { jenis: "Tabel Statistk", level: "514 kab/kota", bab: [1, 6] },
    umur_p: { jenis: "Tabel Statistk", level: "514 kab/kota", bab: [1, 6] },
    mig_pct: { jenis: "Tabel Statistk", level: "38 provinsi", bab: [3, 4, 6] },
    mig_jml: { jenis: "Tabel Statistk", level: "38 provinsi", bab: [3] },
    akb_prov: { jenis: "Tabel Statistk", level: "38 provinsi", bab: [4] },
    rk_prov: { jenis: "Tabel Statistk", level: "38 provinsi", bab: [4] },
    kepadatan: { jenis: "Tabel Statistik", level: "38 provinsi", bab: [4] },
    supas_pub: { jenis: "Publikasi SUPAS 2025", level: "38 provinsi", bab: [4] },
    gini: { jenis: "Tabel Statistk", level: "38 provinsi", bab: [4] },
    lfsp2020: { jenis: "Long Form SP2020", level: "34 provinsi (asal–tujuan)", bab: [2, 3] },
    batas: { jenis: "Non-BPS", level: "Kab/kota & provinsi", bab: [1, 2, 3, 4] },
  };
  let filter = 0;
  function render() {
    const list = D.sources.filter(s => !filter || (INFO[s.id] && INFO[s.id].bab.includes(filter)));
    document.getElementById("metaCount").textContent = `${list.length} sumber`;
    document.getElementById("metaGrid").innerHTML = list.map(s => {
      const I = INFO[s.id] || { jenis: "", level: "", bab: [] };
      return `<article class="meta-card${I.jenis === "Non-BPS" ? " nonbps" : ""}">
        <div class="meta-badges"><span class="mb-src">${I.jenis}</span><span class="mb-lvl">${I.level}</span></div>
        <h4>${s.judul}</h4>
        <p>${s.dipakai}</p>
        <div class="meta-bab">${I.bab.map(b => `<span>${BAB[b]}</span>`).join("")}</div>
        <div class="meta-foot"><span>Tahun data <b>${s.tahun}</b><br>Diakses ${s.akses}</span><a href="${s.url}" target="_blank" rel="noopener">Buka sumber ↗</a></div>
      </article>`;
    }).join("");
  }
  function init() { render(); }
  return { init };
})();

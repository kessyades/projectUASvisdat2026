/* Inisialisasi dan navigasi */
(function () {
  const safe = (name, fn) => { try { fn(); } catch (e) { console.error(name, e); } };
  safe("hero", () => Hero.init());
  safe("bab1", () => MapCh.init());
  safe("bab2", () => FlowCh.init());
  safe("bab3", () => MagnetCh.init());
  safe("bab4", () => TypoCh.init());
  safe("bab5", () => HierCh.init());
  safe("jelajah", () => ExploreCh.init());
  safe("tentang data", () => MetaCh.init());
  // tautan repositori (ubah di sini setelah repo dibuat)
  const REPO = "https://github.com/kessyades/projectUASvisdat2026";
  document.getElementById("repoLink").href = REPO;
  // header gelap saat di atas bagian gelap, progres baca, bab aktif
  const head = document.getElementById("siteHead"), bar = document.getElementById("progress");
  const darkSecs = [document.getElementById("hero"), document.getElementById("bab2")];
  const links = [...document.querySelectorAll(".chap-nav a")];
  const secs = links.map(a => document.getElementById(a.dataset.sec));
  function onScroll() {
    const y = window.scrollY, mid = 60;
    head.classList.toggle("on-dark", darkSecs.some(s => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; }));
    bar.style.width = (y / (document.documentElement.scrollHeight - innerHeight) * 100) + "%";
    let act = null; secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * .4) act = i; });
    links.forEach((a, i) => a.classList.toggle("active", i === act));
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
})();

// Menu garis tiga (ponsel)
(function () {
  const btn = document.getElementById("menuBtn"), nav = document.getElementById("chapNav");
  if (!btn || !nav) return;
  const setOpen = open => {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
  };
  btn.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  nav.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("click", e => { if (!e.target.closest("#siteHead")) setOpen(false); });
  addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
})();

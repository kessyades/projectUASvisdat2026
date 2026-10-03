/* Hero: peta gelap Indonesia dengan partikel yang mengalir di 150 arus terbesar */
const Hero = (() => {
  const canvas = document.getElementById("heroCanvas");
  const ctx = canvas.getContext("2d");
  const provFeat = topoFeatures(D.provTopo, "kab");
  const P34 = new Map(D.flows.provinces.map(p => [p.prov, p]));
  const top = D.flows.flows.slice().sort((a, b) => b.v - a.v).slice(0, 150);
  const vmax = top[0].v;
  let W, H, proj, path, curves = [], particles = [], running = true, visible = true, raf;

  function layout() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    [W, H] = sizeOf(canvas);
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mobile = W < 700;
    proj = d3.geoMercator().fitExtent(mobile ? [[10, 70], [W - 10, H * 0.42]] : [[W * 0.30, 60], [W - 20, H * 0.62]], { type: "FeatureCollection", features: provFeat });
    path = d3.geoPath(proj, ctx);
    curves = top.map(f => {
      const a = proj([P34.get(f.o).lon, P34.get(f.o).lat]), b = proj([P34.get(f.d).lon, P34.get(f.d).lat]);
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
      const c = [mx - dy * 0.25, my + dx * 0.25];
      return { a, b, c, w: Math.sqrt(f.v / vmax) };
    });
    particles = [];
    curves.forEach((c, i) => { const n = Math.max(1, Math.round(c.w * 9)); for (let k = 0; k < n; k++) particles.push({ i, t: Math.random(), s: 0.0016 + Math.random() * 0.0018 }); });
    drawBase();
  }
  let base;
  function drawBase() {
    base = document.createElement("canvas"); base.width = canvas.width; base.height = canvas.height;
    const b = base.getContext("2d"); const dpr = canvas.width / W; b.setTransform(dpr, 0, 0, dpr, 0, 0);
    const p2 = d3.geoPath(proj, b);
    b.fillStyle = "#16253B"; b.strokeStyle = "#24364F"; b.lineWidth = 0.6;
    provFeat.forEach(f => { b.beginPath(); p2(f); b.fill(); b.stroke(); });
    curves.forEach(c => { b.beginPath(); b.moveTo(...c.a); b.quadraticCurveTo(...c.c, ...c.b); b.strokeStyle = `rgba(143,184,232,${0.08 + c.w * 0.35})`; b.lineWidth = 0.5 + c.w * 2.5; b.stroke(); });
  }
  const q = (c, t) => [(1 - t) * (1 - t) * c.a[0] + 2 * (1 - t) * t * c.c[0] + t * t * c.b[0], (1 - t) * (1 - t) * c.a[1] + 2 * (1 - t) * t * c.c[1] + t * t * c.b[1]];
  function frame() {
    if (!base) return;
    ctx.clearRect(0, 0, W, H); ctx.drawImage(base, 0, 0, W, H);
    ctx.fillStyle = "#FFF4E0";
    particles.forEach(p => {
      if (!APP.reduced) { p.t += p.s; if (p.t > 1) p.t -= 1; }
      const c = curves[p.i], [x, y] = q(c, p.t);
      ctx.globalAlpha = Math.sin(Math.PI * p.t) * 0.95; ctx.beginPath(); ctx.arc(x, y, 1 + c.w * 1.6, 0, 6.283); ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (running && visible && !APP.reduced) raf = requestAnimationFrame(frame);
  }
  function start() { cancelAnimationFrame(raf); frame(); }
  new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) start(); }).observe(canvas);
  onResize(canvas, () => { layout(); start(); }, true);
  return { init() { layout(); start(); } };
})();

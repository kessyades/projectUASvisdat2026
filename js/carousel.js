/* kartu cerita: tombol kiri/kanan, titik, panah keyboard, dan geser (swipe) di ponsel */
function makeCarousel(root, onStep) {
    const track = root.querySelector(".car-track"), viewport = root.querySelector(".car-viewport");
    const steps = [...track.querySelectorAll(".step")];
    const prev = root.querySelector(".car-btn[data-dir='-1']"), next = root.querySelector(".car-btn[data-dir='1']");
    const dots = root.querySelector(".car-dots"), count = root.querySelector(".car-count");
    let i = 0;
    dots.innerHTML = steps.map((s, k) => `<button aria-label="Kartu ${k + 1}"></button>`).join("");
    const dotBtns = [...dots.children];
    function fit() { viewport.style.height = steps[i].offsetHeight + "px"; }
    function go(n, user = true) {
        i = Math.max(0, Math.min(steps.length - 1, n));
        track.style.transform = `translateX(${-i * 100}%)`;
        steps.forEach((s, k) => { s.classList.toggle("active", k === i); s.setAttribute("aria-hidden", String(k !== i)); s.inert = k !== i; });
        dotBtns.forEach((d, k) => d.setAttribute("aria-current", String(k === i)));
        count.textContent = `${i + 1} / ${steps.length}`;
        prev.disabled = i === 0; next.disabled = i === steps.length - 1;
        fit();
        if (user) onStep(i);
    }
    prev.onclick = () => go(i - 1);
    next.onclick = () => go(i + 1);
    dotBtns.forEach((d, k) => d.onclick = () => go(k));
    root.addEventListener("keydown", e => { if (e.key === "ArrowRight") { go(i + 1); e.preventDefault(); } if (e.key === "ArrowLeft") { go(i - 1); e.preventDefault(); } });
    // geser dengan jari (horizontal saja)
    let x0 = null, y0 = 0;
    viewport.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    viewport.addEventListener("touchend", e => {
        if (x0 == null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(i + (dx < 0 ? 1 : -1));
    }, { passive: true });
    new ResizeObserver(fit).observe(root);
    go(0, false);
    return { go };
}
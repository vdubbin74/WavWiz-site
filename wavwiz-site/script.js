/* =========================================================
   WavWiz landing page script. Plain JS, no build step, no trackers.
   ========================================================= */

/* ---------------------------------------------------------
   CONFIG: donation addresses
   The address text, copy buttons and QR codes in the "Support WavWiz"
   section are all generated from these values. "address" is the bare
   address that gets copied; the QR code encodes "scheme:address"
   (BIP21-style URI) so wallets recognize the coin.
   --------------------------------------------------------- */
const WAVWIZ_CONFIG = {
  donate: {
    LTC: { name: "Litecoin", scheme: "litecoin", address: "ltc1qx4y3ncgjzgl6nydfwu3wzp7lwzmf2cysacr64d" },
    // Monero standard address (95 characters)
    XMR: { name: "Monero", scheme: "monero", address: "44FpjtjsaBzABrjf8Wmr2TcvEbUWvi5iW3tXP67APgNe6Stv1kkxHUDEFbtG4p6XBBThD76JY8sJvQSsRfZgWiqjHRJ7bDt" },
    BTC: { name: "Bitcoin", scheme: "bitcoin", address: "bc1qauyj5n6ghg0pc55ee6u5vfm4efccus9rvmgala" },
    // Pepecoin (PEP): the Dogecoin-fork Pepecoin, NOT the Ethereum PEPE token.
    PEP: { name: "Pepecoin (PEP)", scheme: "pepecoin", address: "Pby4S9GQQhgEhJ5Sm7A6xLnTVcGuVnvfqQ" }
  }
};

(function () {
  "use strict";

  const COLORS = { orange: [255, 90, 31], teal: [46, 196, 182], bg: "#0b1020" };
  const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  let reduced = mq.matches;
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const lerpColor = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map(Math.round);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Small seeded PRNG so decorative randomness is stable between loads
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  /* ---------------- Fake audio engine ---------------- */
  // Generates a believable 124 BPM spectrum (kick, bass, mids, hats) without any real audio.
  const FakeAudio = (function () {
    const N = 64, BPM = 124, beat = 60 / BPM;
    const bins = new Float32Array(N), smooth = new Float32Array(N);
    const state = { bins: smooth, kick: 0, level: 0, l: 0, r: 0, beatIndex: 0, onBeat: false };
    let lastBeat = -1, lastT = -1;
    function update(t) {
      // Reuse same-frame sample so Warp / emblem / viz share one beat edge
      if (lastT >= 0 && Math.abs(t - lastT) < 0.0005) return state;
      lastT = t;
      const ph = (t % beat) / beat;
      const bi = Math.floor(t / beat);
      const bar = Math.floor(bi / 4);
      const accent = bi % 4 === 0 ? 1 : 0.82;
      const drop = (bar % 8) < 6 ? 1 : 0.55; // breakdown every 8 bars
      const kick = Math.exp(-ph * 7) * accent * drop;
      const hat = Math.exp(-(((ph + 0.5) % 1)) * 16);
      const snare = (bi % 2 === 1) ? Math.exp(-ph * 9) : 0;
      for (let i = 0; i < N; i++) {
        const f = i / (N - 1);
        const low = kick * Math.pow(1 - f, 2.6) * 1.05;
        const bass = (0.28 + 0.12 * Math.sin(t * 2.1 + i * 0.3)) * Math.pow(1 - f, 1.4) * drop;
        const mid = (0.22 + 0.18 * Math.sin(t * 3.7 + i * 0.55) * Math.sin(t * 1.3 + i * 0.21)) * Math.sin(Math.PI * clamp(f * 1.3, 0, 1));
        const sn = snare * 0.45 * Math.exp(-Math.pow((f - 0.45) * 3, 2));
        const hi = hat * 0.5 * Math.pow(f, 1.3) * (0.7 + 0.3 * Math.sin(i * 12.9898 + bi));
        bins[i] = clamp(low + bass + mid + sn + hi, 0, 1.2);
        const k = bins[i] > smooth[i] ? 0.55 : 0.12;
        smooth[i] += (bins[i] - smooth[i]) * k;
      }
      let sum = 0; for (let i = 0; i < N; i++) sum += smooth[i];
      state.level = clamp(sum / N * 1.6, 0, 1);
      state.kick = kick;
      state.l = clamp(state.level * (0.92 + 0.08 * Math.sin(t * 5.3)) + kick * 0.12, 0, 1);
      state.r = clamp(state.level * (0.92 + 0.08 * Math.cos(t * 4.7)) + kick * 0.1, 0, 1);
      state.onBeat = bi !== lastBeat; lastBeat = bi; state.beatIndex = bi;
      return state;
    }
    return { update, N };
  })();

  /* ---------------- Header ---------------- */
  const header = document.querySelector(".site-header");
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  function onScrollHeader() { header.classList.toggle("is-scrolled", window.scrollY > 10); }
  window.addEventListener("scroll", onScrollHeader, { passive: true }); onScrollHeader();
  function setNav(open) {
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  navToggle.addEventListener("click", () => setNav(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("is-open")) { setNav(false); navToggle.focus(); } });

  /* ---------------- Hero warp starfield ---------------- */
  const Warp = (function () {
    const canvas = document.getElementById("warp");
    if (!canvas || !canvas.getContext) return null;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, stars = [], running = false, visible = true, raf = 0, last = 0;
    let cx = 0, cy = 0, tcx = 0, tcy = 0;
    const rand = Math.random;
    function makeStar(s, fresh) {
      s.x = (rand() * 2 - 1) * 1.6; s.y = (rand() * 2 - 1) * 1.0;
      s.z = fresh ? rand() * 0.95 + 0.05 : 1;
      s.c = rand() < 0.5 ? COLORS.orange : (rand() < 0.85 ? COLORS.teal : [233, 237, 247]);
      s.pz = s.z;
      return s;
    }
    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp(w * h / 1400, 220, 900));
      while (stars.length < count) stars.push(makeStar({}, true));
      stars.length = count;
      tcx = cx = w * 0.5; tcy = cy = h * 0.45;
      if (!running) draw(0.016, performance.now() / 1000);
    }
    function draw(dt, t) {
      const a = FakeAudio.update(t);
      const speed = 0.22 + a.kick * 0.9 + a.level * 0.25;
      cx += (tcx - cx) * 0.04; cy += (tcy - cy) * 0.04;
      const focal = Math.max(w, h) * 0.42;
      ctx.clearRect(0, 0, w, h);
      // soft beat bloom in the center
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.45);
      g.addColorStop(0, rgba(COLORS.orange, 0.10 + a.kick * 0.12));
      g.addColorStop(0.35, rgba(COLORS.teal, 0.04 + a.kick * 0.05));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.lineCap = "round";
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.pz = s.z;
        s.z -= speed * dt * (reduced ? 0 : 1);
        if (s.z <= 0.02) { makeStar(s, false); continue; }
        const sx = cx + (s.x / s.z) * focal, sy = cy + (s.y / s.z) * focal;
        const tail = Math.min(s.pz + 0.02 + a.kick * 0.06 + (reduced ? 0.03 : 0), 1);
        const px = cx + (s.x / tail) * focal, py = cy + (s.y / tail) * focal;
        if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) { makeStar(s, false); continue; }
        const near = 1 - s.z;
        const alpha = clamp(near * 1.3, 0, 1);
        ctx.strokeStyle = rgba(s.c, alpha);
        ctx.lineWidth = 0.4 + near * near * 3.2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
        if (near > 0.6) { ctx.fillStyle = rgba(s.c, alpha * 0.35); ctx.beginPath(); ctx.arc(sx, sy, ctx.lineWidth * 1.8, 0, 6.283); ctx.fill(); }
      }
    }
    function frame(now) {
      if (!running) return;
      const t = now / 1000;
      const dt = Math.min(0.05, last ? t - last : 0.016); last = t;
      draw(dt, t);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running || reduced || !visible || document.hidden) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    window.addEventListener("resize", resize);
    resize();
    // Gentle steering toward the pointer
    canvas.parentElement.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      tcx = w * 0.5 + ((e.clientX - r.left) / r.width - 0.5) * w * 0.18;
      tcy = h * 0.45 + ((e.clientY - r.top) / r.height - 0.5) * h * 0.18;
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en) => { visible = en[0].isIntersecting; visible ? start() : stop(); }).observe(canvas);
    }
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    start();
    return { start, stop, redraw: () => draw(0.016, performance.now() / 1000), isRunning: () => running };
  })();

  /* ---------------- EQ strip ---------------- */
  (function buildEq() {
    const track = document.getElementById("eq-track");
    if (!track) return;
    const r = rng(74);
    const n = 110, frag = document.createDocumentFragment(), bars = [];
    for (let i = 0; i < n; i++) {
      const b = document.createElement("span");
      b.className = "eq-bar";
      const env = 0.55 + 0.45 * Math.sin(i / n * Math.PI * 6);
      b.style.setProperty("--d", (0.32 + r() * 0.75).toFixed(2) + "s");
      b.style.setProperty("--dl", (-r() * 2).toFixed(2) + "s");
      b.style.setProperty("--s0", (0.06 + r() * 0.22).toFixed(2));
      b.style.setProperty("--s1", (0.45 + r() * 0.55 * env).toFixed(2));
      bars.push(b);
    }
    bars.forEach((b) => frag.appendChild(b));
    bars.forEach((b) => frag.appendChild(b.cloneNode(true))); // duplicate for a seamless loop
    track.appendChild(frag);
  })();

  (function buildMiniEq() {
    const box = document.getElementById("mini-eq");
    if (!box) return;
    const r = rng(11);
    for (let i = 0; i < 24; i++) {
      const b = document.createElement("span");
      b.style.setProperty("--d", (0.35 + r() * 0.6).toFixed(2) + "s");
      b.style.setProperty("--dl", (-r() * 2).toFixed(2) + "s");
      b.style.setProperty("--s0", (0.08 + r() * 0.2).toFixed(2));
      b.style.setProperty("--s1", (0.5 + r() * 0.5 * (1 - i / 40)).toFixed(2));
      box.appendChild(b);
    }
  })();

  /* ---------------- Hero emblem — planted logo, audio glow, orbits, sparks ---------------- */
  (function emblemFx() {
    const root = document.querySelector(".hero-emblem");
    const stage = document.getElementById("emblem-stage");
    const sparks = document.getElementById("emblem-sparks");
    const hero = document.querySelector(".hero");
    if (!root || !stage) return;

    let raf = 0, lastBeat = -1, visible = true, mx = 0, my = 0, tx = 0, ty = 0;

    function spawnSpark(kick) {
      if (!sparks || reduced) return;
      const n = kick > 0.55 ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const s = document.createElement("span");
        s.className = "emblem-spark";
        // Drift near the hat tip (upper-center of the emblem)
        const x = 42 + Math.random() * 22;
        const y = 18 + Math.random() * 16;
        s.style.left = x + "%";
        s.style.top = y + "%";
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        const dist = 28 + Math.random() * 42;
        s.style.setProperty("--sx", (Math.cos(ang) * dist).toFixed(1) + "px");
        s.style.setProperty("--sy", (Math.sin(ang) * dist).toFixed(1) + "px");
        s.style.setProperty("--spark", Math.random() < 0.5 ? "#FF5A1F" : "#2EC4B6");
        s.addEventListener("animationend", () => s.remove());
        sparks.appendChild(s);
      }
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const t = now / 1000;
      const a = FakeAudio.update(t);
      const kick = a.kick;
      const level = a.level;
      // Soft teal↔orange hue bias driven by level envelope
      const hue = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.55) * (0.35 + level * 0.65));
      root.style.setProperty("--kick", kick.toFixed(3));
      root.style.setProperty("--level", level.toFixed(3));
      root.style.setProperty("--hue", hue.toFixed(3));
      if (a.onBeat && a.beatIndex !== lastBeat && kick > 0.35) {
        lastBeat = a.beatIndex;
        spawnSpark(kick);
      }
      // Gentle mouse parallax tilt on the stage (no bob)
      if (!reduced) {
        mx += (tx - mx) * 0.08;
        my += (ty - my) * 0.08;
        stage.style.transform =
          "rotateY(" + (mx * 7).toFixed(2) + "deg) rotateX(" + (-my * 5).toFixed(2) + "deg)";
      }
    }

    if (hero) {
      hero.addEventListener("pointermove", (e) => {
        const r = hero.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
        tx = Math.max(-1, Math.min(1, tx));
        ty = Math.max(-1, Math.min(1, ty));
      }, { passive: true });
      hero.addEventListener("pointerleave", () => { tx = 0; ty = 0; }, { passive: true });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(root);
    }
    if (!reduced) raf = requestAnimationFrame(frame);
    else {
      root.style.setProperty("--kick", "0.15");
      root.style.setProperty("--level", "0.25");
      root.style.setProperty("--hue", "0.4");
    }
  })();

  /* ---------------- Scroll reveal ---------------- */
  (function reveal() {
    const els = Array.from(document.querySelectorAll(".reveal"));
    els.forEach((el) => {
      const sibs = Array.from(el.parentElement.children).filter((c) => c.classList.contains("reveal"));
      const idx = sibs.indexOf(el);
      if (sibs.length > 1) el.style.setProperty("--rd", ((idx % 4) * 0.08).toFixed(2) + "s");
    });
    if (reduced || !("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => io.observe(el));
  })();

  /* ---------------- Card spotlight glow ---------------- */
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* ---------------- Parallax ---------------- */
  (function parallax() {
    const items = Array.from(document.querySelectorAll("[data-parallax]"));
    const hero = document.querySelector(".hero");
    if (!items.length || !hero) return;
    let ticking = false;
    function apply() {
      ticking = false;
      if (reduced) { items.forEach((el) => (el.style.transform = "")); return; }
      const y = window.scrollY;
      if (y > hero.offsetHeight * 1.2) return;
      items.forEach((el) => { const f = parseFloat(el.dataset.parallax) || 0; el.style.transform = `translate3d(0, ${(y * f).toFixed(1)}px, 0)`; });
    }
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }, { passive: true });
    apply();
  })();

  /* ---------------- Lightbox carousel ---------------- */
  (function lightbox() {
    const lb = document.getElementById("lightbox");
    const shots = Array.from(document.querySelectorAll("#gallery .shot"));
    if (!lb || !shots.length) return;
    const img = document.getElementById("lb-img"), cap = document.getElementById("lb-caption"), count = document.getElementById("lb-count"), dotsWrap = document.getElementById("lb-dots");
    const items = shots.map((s) => { const t = s.querySelector("img"); return { src: t.getAttribute("src").replace("-thumb.jpg", ".jpg"), alt: t.alt, label: s.querySelector(".shot-label").textContent }; });
    let idx = 0, opener = null;
    const dots = items.map((it, i) => {
      const d = document.createElement("button"); d.type = "button"; d.setAttribute("aria-label", "Show " + it.label);
      d.addEventListener("click", () => show(i)); dotsWrap.appendChild(d); return d;
    });
    function show(i) {
      idx = (i + items.length) % items.length;
      const it = items[idx];
      img.src = it.src; img.alt = it.alt; cap.textContent = it.label; count.textContent = `${idx + 1} / ${items.length}`;
      dots.forEach((d, j) => d.setAttribute("aria-current", String(j === idx)));
      [idx + 1, idx - 1].forEach((j) => { const p = new Image(); p.src = items[(j + items.length) % items.length].src; });
      if (!reduced && img.animate) img.animate([{ opacity: 0.2, transform: "scale(.985)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "ease-out" });
    }
    function open(i) { opener = document.activeElement; lb.hidden = false; document.body.classList.add("lb-open"); show(i); lb.querySelector(".lb-close").focus(); }
    function close() { lb.hidden = true; document.body.classList.remove("lb-open"); if (opener) opener.focus(); }
    shots.forEach((s, i) => s.addEventListener("click", () => open(i)));
    lb.querySelector(".lb-prev").addEventListener("click", () => show(idx - 1));
    lb.querySelector(".lb-next").addEventListener("click", () => show(idx + 1));
    lb.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", close));
    document.addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
      else if (e.key === "Tab") { // simple focus trap
        const f = Array.from(lb.querySelectorAll("button")); const first = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    });
    let sx = null;
    const frame = lb.querySelector(".lb-frame");
    frame.addEventListener("pointerdown", (e) => { sx = e.clientX; });
    frame.addEventListener("pointerup", (e) => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1)); });
  })();

  /* ---------------- Visualizer showcase + analog VU meters ---------------- */
  (function vizDemo() {
    const canvas = document.getElementById("viz");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const nameEl = document.getElementById("viz-name");
    const tabs = Array.from(document.querySelectorAll(".viz-tab"));
    const autoBox = document.getElementById("viz-auto");
    const order = ["particles", "ring", "river"];
    const names = { particles: "Particle burst", ring: "Ring", river: "Waveform river" };
    let style = "particles", w = 0, h = 0, dpr = 1, running = false, visible = false, raf = 0, last = 0, cycleT = 0;
    const parts = [];

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#070b17"; ctx.fillRect(0, 0, w, h);
      if (!running) renderStatic();
    }

    function setStyle(s, fromUser) {
      style = s; cycleT = 0; parts.length = 0;
      tabs.forEach((t) => { const on = t.dataset.viz === s; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", String(on)); });
      nameEl.textContent = names[s];
      ctx.fillStyle = "#070b17"; ctx.fillRect(0, 0, w, h);
      if (fromUser && autoBox) cycleT = -6; // give a manual pick a little extra time
      if (!running) renderStatic();
    }
    tabs.forEach((t) => t.addEventListener("click", () => setStyle(t.dataset.viz, true)));

    function drawParticles(a, dt, t) {
      ctx.fillStyle = "rgba(7,11,23,0.22)"; ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, m = Math.min(w, h);
      if (a.onBeat) {
        const n = 70 + Math.round(a.kick * 60);
        for (let i = 0; i < n; i++) {
          const ang = Math.random() * Math.PI * 2, sp = (0.25 + Math.random() * 0.9) * m * (0.6 + a.kick);
          parts.push({ x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, c: Math.random() < 0.55 ? COLORS.orange : COLORS.teal, s: 1 + Math.random() * 2.4 });
        }
      }
      // gentle stream between beats
      for (let i = 0; i < 3; i++) { const ang = Math.random() * 6.283, sp = (0.1 + Math.random() * 0.3) * m; parts.push({ x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0.8, c: COLORS.teal, s: 1 }); }
      ctx.globalCompositeOperation = "lighter";
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 0.75;
        if (p.life <= 0 || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) { parts.splice(i, 1); continue; }
        ctx.fillStyle = rgba(p.c, p.life);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (0.6 + p.life), 0, 6.283); ctx.fill();
      }
      if (parts.length > 1600) parts.splice(0, parts.length - 1600);
      const r = m * (0.06 + a.kick * 0.05 + a.level * 0.03);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.2);
      g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(0.25, rgba(COLORS.orange, 0.85)); g.addColorStop(0.6, rgba(COLORS.teal, 0.25)); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 3.2, 0, 6.283); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    function drawRing(a, dt, t) {
      ctx.fillStyle = "rgba(7,11,23,0.35)"; ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, m = Math.min(w, h);
      const N = FakeAudio.N, total = N * 2;
      const r0 = m * (0.2 + a.kick * 0.025);
      const rot = t * 0.25;
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(2, (2 * Math.PI * r0) / total * 0.55);
      for (let i = 0; i < total; i++) {
        const bi = i < N ? i : total - 1 - i;
        const v = a.bins[bi];
        const ang = rot + (i / total) * Math.PI * 2;
        const len = m * 0.04 + v * m * 0.24;
        const c = lerpColor(COLORS.orange, COLORS.teal, bi / (N - 1));
        ctx.strokeStyle = rgba(c, 0.9);
        const cos = Math.cos(ang), sin = Math.sin(ang);
        ctx.beginPath(); ctx.moveTo(cx + cos * r0, cy + sin * r0); ctx.lineTo(cx + cos * (r0 + len), cy + sin * (r0 + len)); ctx.stroke();
      }
      ctx.strokeStyle = rgba(COLORS.teal, 0.5 + a.kick * 0.5); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r0 * 0.88, 0, 6.283); ctx.stroke();
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r0 * 0.85);
      g.addColorStop(0, rgba(COLORS.orange, 0.25 + a.kick * 0.4)); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r0 * 0.85, 0, 6.283); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    function drawRiver(a, dt, t) {
      ctx.fillStyle = "rgba(7,11,23,0.5)"; ctx.fillRect(0, 0, w, h);
      const layers = 6, step = Math.max(4, w / 120);
      ctx.globalCompositeOperation = "lighter";
      for (let L = 0; L < layers; L++) {
        const band = a.bins[Math.floor((L / layers) * 40)];
        const amp = h * (0.06 + band * 0.22);
        const base = h * (0.32 + L * 0.075);
        const c = lerpColor(COLORS.orange, COLORS.teal, L / (layers - 1));
        const freq = 0.006 + L * 0.0016, spd = 1.2 + L * 0.35;
        ctx.beginPath();
        for (let x = 0; x <= w + step; x += step) {
          const y = base + Math.sin(x * freq + t * spd + L) * amp * 0.6 + Math.sin(x * freq * 2.3 - t * spd * 1.4) * amp * 0.4;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = rgba(c, 0.95); ctx.lineWidth = 2.2; ctx.shadowColor = rgba(c, 0.9); ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
        const g = ctx.createLinearGradient(0, base - amp, 0, h);
        g.addColorStop(0, rgba(c, 0.10)); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }
    const drawers = { particles: drawParticles, ring: drawRing, river: drawRiver };

    /* Analog VU meters */
    const VU_MARKS = [[-20, 0], [-10, 0.3], [-7, 0.43], [-5, 0.53], [-3, 0.65], [-2, 0.72], [-1, 0.79], [0, 0.86], [1, 0.91], [2, 0.955], [3, 1]];
    const SWEEP = 48, PX = 100, PY = 112;
    const meters = ["vu-l", "vu-r"].map((id) => document.getElementById(id)).filter(Boolean).map((svg) => {
      const g = svg.querySelector(".vu-scale"), NS = "http://www.w3.org/2000/svg";
      const pt = (pos, rad) => { const ang = (-SWEEP + pos * SWEEP * 2) * Math.PI / 180; return [PX + Math.sin(ang) * rad, PY - Math.cos(ang) * rad]; };
      const arc = (p0, p1, rad, cls) => { const a0 = pt(p0, rad), a1 = pt(p1, rad); const p = document.createElementNS(NS, "path"); p.setAttribute("d", `M${a0[0].toFixed(2)} ${a0[1].toFixed(2)} A${rad} ${rad} 0 0 1 ${a1[0].toFixed(2)} ${a1[1].toFixed(2)}`); p.setAttribute("class", cls); g.appendChild(p); };
      arc(0, 0.86, 74, "vu-arc"); arc(0.86, 1, 74, "vu-arc hot");
      VU_MARKS.forEach(([db, pos]) => {
        const hot = db > 0, a = pt(pos, 74), b = pt(pos, 82), tx = pt(pos, 92);
        const l = document.createElementNS(NS, "line");
        l.setAttribute("x1", a[0].toFixed(2)); l.setAttribute("y1", a[1].toFixed(2)); l.setAttribute("x2", b[0].toFixed(2)); l.setAttribute("y2", b[1].toFixed(2));
        l.setAttribute("class", "vu-tick" + (hot ? " hot" : "")); g.appendChild(l);
        if ([-20, -10, -7, -5, -3, 0, 3].includes(db)) {
          const tEl = document.createElementNS(NS, "text"); tEl.setAttribute("x", tx[0].toFixed(2)); tEl.setAttribute("y", (tx[1] + 2.5).toFixed(2)); tEl.setAttribute("text-anchor", "middle");
          tEl.setAttribute("class", "vu-num" + (db >= 0 ? " hot" : "")); tEl.textContent = db > 0 ? "+" + db : String(db); g.appendChild(tEl);
        }
      });
      return { needle: svg.querySelector(".vu-needle"), v: 0 };
    });
    function updateMeters(a, dt) {
      [a.l, a.r].forEach((lvl, i) => {
        const m = meters[i]; if (!m) return;
        const target = clamp(0.25 + lvl * 0.8, 0, 1.04);
        m.v += (target - m.v) * Math.min(1, dt * 7); // ~300 ms VU-style ballistics
        m.needle.style.transform = `rotate(${(-SWEEP + m.v * SWEEP * 2).toFixed(2)}deg)`;
      });
    }

    function renderStatic() {
      // Reduced motion / paused: render a representative still frame.
      const t = 12.0;
      const a = FakeAudio.update(t);
      if (style === "particles") { parts.length = 0; a.onBeat = true; for (let i = 0; i < 40; i++) drawParticles(a, 0.016, t + i * 0.016), (a.onBeat = false); }
      else for (let i = 0; i < 8; i++) drawers[style](a, 0.016, t);
      updateMeters({ l: 0.6, r: 0.55 }, 1);
    }

    function frame(now) {
      if (!running) return;
      const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0.016); last = t;
      const a = FakeAudio.update(t);
      drawers[style](a, dt, t);
      updateMeters(a, dt);
      if (autoBox && autoBox.checked) { cycleT += dt; if (cycleT > 7) setStyle(order[(order.indexOf(style) + 1) % order.length], false); }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running || reduced || !visible || document.hidden) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas); else window.addEventListener("resize", resize);
    resize();
    if ("IntersectionObserver" in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.05 }).observe(canvas);
    else { visible = true; start(); }
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    window.__wavwizViz = { isRunning: () => running };

    mq.addEventListener && mq.addEventListener("change", (e) => {
      reduced = e.matches;
      if (reduced) { stop(); renderStatic(); Warp && (Warp.stop(), Warp.redraw()); document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in")); }
      else { start(); Warp && Warp.start(); }
    });
  })();

  /* ---------------- Sync demo: per-device delay sliders + aligning waveforms ---------------- */
  (function syncDemo() {
    const panel = document.getElementById("sync-demo");
    if (!panel) return;
    const rows = Array.from(panel.querySelectorAll(".sync-row")).map((el, i) => ({
      el, i,
      target: +el.dataset.target || 0,
      tone: el.dataset.tone === "o" ? COLORS.orange : COLORS.teal,
      canvas: el.querySelector(".sync-wave"),
      fill: el.querySelector(".sync-fill"),
      thumb: el.querySelector(".sync-thumb"),
      val: el.querySelector(".sync-val"),
      value: 0, shown: -1, w: 0, h: 0
    }));
    const PX_PER_MS = 0.3, BEAT = 480, SPEED = 0.22, CYCLE = 11;
    const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
    const noise = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
    // Deterministic "music" envelope: a kick every beat, an off-beat hat, and some texture.
    function amp(s) {
      const b = ((s % BEAT) + BEAT) % BEAT, o = (((s + BEAT / 2) % BEAT) + BEAT) % BEAT;
      const kick = Math.exp(-b / 60), hat = Math.exp(-o / 35) * 0.35;
      return clamp(0.12 + kick * 0.8 + hat + noise(s / 26) * 0.28 + noise(s / 7) * 0.08, 0.06, 1);
    }
    function size(r) {
      const dpr = Math.min(2, window.devicePixelRatio || 1), cw = r.canvas.clientWidth, ch = r.canvas.clientHeight;
      if (!cw) return;
      r.canvas.width = Math.round(cw * dpr); r.canvas.height = Math.round(ch * dpr);
      r.w = cw; r.h = ch; r.ctx = r.canvas.getContext("2d"); r.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function drawRow(r, playMs) {
      if (!r.ctx) return;
      const x = r.ctx, w = r.w, h = r.h, cx = w / 2, mid = h / 2, err = r.target - r.value;
      x.clearRect(0, 0, w, h);
      // playhead
      x.fillStyle = "rgba(233,237,247,.16)"; x.fillRect(Math.round(cx), 4, 1, h - 8);
      for (let px = 1; px < w; px += 3) {
        const s = playMs + (px - cx) / PX_PER_MS + err;
        const a = amp(s), bh = Math.max(1, a * (h - 10));
        const edge = Math.min(1, px / 26, (w - px) / 26);
        const near = Math.abs(px - cx) < 3 ? 0.25 : 0;
        x.fillStyle = rgba(r.tone, (0.28 + a * 0.62 + near) * edge);
        x.fillRect(px, mid - bh / 2, 2, bh);
      }
    }
    function setValue(r, v) {
      r.value = v;
      const pct = clamp(v / 1000, 0, 1) * 100;
      r.fill.style.width = pct + "%"; r.thumb.style.left = pct + "%";
      const n = Math.round(v);
      if (n !== r.shown) { r.shown = n; r.val.textContent = n; }
    }
    const easeOutBack = (p) => { const c1 = 1.15, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
    const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    function valueAt(r, t) {
      const start = 1.4 + r.i * 0.38, dur = 1.9, back = 8.6 + r.i * 0.06, bdur = 1.4;
      if (t < start) return 0;
      if (t < start + dur) return r.target * easeOutBack((t - start) / dur);
      if (t < back) return r.target;
      if (t < back + bdur) return r.target * (1 - easeInOut((t - back) / bdur));
      return 0;
    }

    let running = false, visible = false, raf = 0, last = 0, playMs = 0, cycleT = 0;
    function render() {
      rows.forEach((r) => drawRow(r, playMs));
      panel.classList.toggle("is-synced", rows.every((r) => Math.abs(r.target - r.value) < 1.5));
    }
    function renderStatic() { rows.forEach((r) => setValue(r, r.target)); playMs = BEAT * 0.15; render(); }
    function frame(now) {
      if (!running) return;
      const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0.016); last = t;
      playMs += dt * 1000 * SPEED;
      cycleT = (cycleT + dt) % CYCLE;
      rows.forEach((r) => setValue(r, valueAt(r, cycleT)));
      render();
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running || reduced || !visible || document.hidden) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    function resizeAll() { rows.forEach(size); if (!running) render(); }

    if (window.ResizeObserver) { const ro = new ResizeObserver(resizeAll); rows.forEach((r) => ro.observe(r.canvas)); }
    else window.addEventListener("resize", resizeAll);
    rows.forEach(size);
    if (reduced) renderStatic(); else { rows.forEach((r) => setValue(r, 0)); render(); }
    if ("IntersectionObserver" in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.05 }).observe(panel);
    else { visible = true; start(); }
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    mq.addEventListener && mq.addEventListener("change", (e) => { if (e.matches) { stop(); renderStatic(); } else start(); });
    window.__wavwizSync = { isRunning: () => running, setTime: (t) => { cycleT = t; } };
  })();

  /* ---------------- Donate: QR codes + copy buttons ---------------- */
  (function donate() {
    document.querySelectorAll(".coin[data-coin]").forEach((card) => {
      const key = card.dataset.coin, cfg = WAVWIZ_CONFIG.donate[key];
      if (!cfg) { card.hidden = true; return; }
      const addr = String(cfg.address || "").trim();
      const addrEl = card.querySelector(".coin-addr"), qrEl = card.querySelector(".qr"), btn = card.querySelector(".btn-copy");
      addrEl.textContent = addr;
      // QR payload: "scheme:address" URI, without doubling a scheme that's already present.
      const scheme = String(cfg.scheme || "").trim().toLowerCase();
      const payload = scheme && !addr.toLowerCase().startsWith(scheme + ":") ? `${scheme}:${addr}` : addr;

      // QR code (qrcode-generator by Kazuhiko Arase, MIT, bundled in assets/vendor).
      // Error correction level H (~30% recovery) so the small coin logo in the center doesn't hurt scanning.
      if (typeof window.qrcode === "function" && addr) {
        try {
          const qr = window.qrcode(0, "H"); qr.addData(payload); qr.make();
          const n = qr.getModuleCount();
          // Integer pixels per module, sized so the canvas stays sharp on high-DPI screens.
          const dpr = Math.min(3, window.devicePixelRatio || 1);
          const scale = Math.max(8, Math.ceil((200 * dpr) / n));
          const size = n * scale, c = document.createElement("canvas");
          c.width = c.height = size;
          const x = c.getContext("2d");
          x.fillStyle = "#ffffff"; x.fillRect(0, 0, size, size);
          x.fillStyle = "#0b1020";
          for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (qr.isDark(r, col)) x.fillRect(col * scale, r * scale, scale, scale);
          qrEl.innerHTML = ""; qrEl.appendChild(c);
          qrEl.setAttribute("aria-label", `${cfg.name} address QR code`);

          // Center logo on a white rounded backing, at most ~17% of the QR width (well within level H's ~30% recovery budget).
          const logoEl = card.querySelector(".coin-logo img");
          if (logoEl) {
            const logo = new Image();
            logo.decoding = "async";
            logo.onload = () => {
              // Snap the backing to whole modules (odd count, so it stays centered on the module grid).
              // Version 7+ codes (45+ modules, e.g. long Monero addresses) have an alignment pattern in the
              // exact center, so the logo is kept a little smaller there to stay friendly to every scanner.
              let m = Math.round(n * (n >= 45 ? 0.14 : 0.17)); if (m % 2 === 0) m -= 1;
              const box = m * scale, bx = ((n - m) / 2) * scale, rad = box * 0.24;
              x.fillStyle = "#ffffff";
              x.beginPath();
              if (x.roundRect) x.roundRect(bx, bx, box, box, rad); else x.rect(bx, bx, box, box);
              x.fill();
              const ls = Math.round(box * 0.8), lx = Math.round((size - ls) / 2);
              x.drawImage(logo, lx, lx, ls, ls);
            };
            logo.src = logoEl.currentSrc || logoEl.src;
          }
        } catch (err) { qrEl.textContent = "QR unavailable"; }
      }

      btn.setAttribute("aria-live", "polite");
      btn.addEventListener("click", async () => {
        let ok = false;
        try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(addr); ok = true; } } catch (e) { ok = false; }
        if (!ok) {
          const ta = document.createElement("textarea"); ta.value = addr; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
          document.body.appendChild(ta); ta.select();
          try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
          ta.remove();
        }
        btn.textContent = ok ? "Copied!" : "Press Ctrl+C to copy";
        btn.classList.toggle("is-copied", ok);
        if (!ok) { const range = document.createRange(); range.selectNodeContents(addrEl); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); }
        clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = "Copy address"; btn.classList.remove("is-copied"); }, 1800);
      });
    });
  })();

  window.__wavwizWarp = Warp;
})();

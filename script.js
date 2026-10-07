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
    const state = { bins: smooth, kick: 0, level: 0, beatIndex: 0, onBeat: false };
    let lastBeat = -1;
    function update(t) {
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

  /* ---------------- Visualizer showcase: real app captures (MP4 loops) ---------------- */
  // Eight muted 8 s loops recorded from the app (preload="none"). Nothing downloads until the
  // section is near the viewport; then only the selected clip loads and plays (and only while it's
  // on screen). Posters are attached just for the current clip and the next one in the cycle.
  (function vizShowcase() {
    const stage = document.getElementById("viz-stage");
    if (!stage) return;
    const vids = Array.from(stage.querySelectorAll(".viz-video"));
    const tabs = Array.from(document.querySelectorAll(".viz-tab"));
    const nameEl = document.getElementById("viz-name");
    const autoBox = document.getElementById("viz-auto");
    const order = tabs.map((t) => t.dataset.viz);
    const names = {};
    tabs.forEach((t) => { names[t.dataset.viz] = t.textContent.replace(/^\s*\d+\s*/, "").trim(); });
    let cur = "particles", visible = false, primed = false, loops = 0, need = 1;
    const vidFor = (k) => vids.find((v) => v.dataset.viz === k);

    const next = (k) => order[(order.indexOf(k) + 1) % order.length];
    function poster(k) {
      const v = vidFor(k);
      if (v && v.dataset.poster && !v.getAttribute("poster")) v.setAttribute("poster", v.dataset.poster);
    }
    function prime() {
      if (primed) return; primed = true;
      poster(cur); poster(next(cur));
    }
    function sync() {
      const v = vidFor(cur);
      vids.forEach((o) => { if (o !== v && !o.paused) o.pause(); });
      if (!v) return;
      if (!visible || reduced || document.hidden) { if (!v.paused) v.pause(); return; }
      if (v.preload !== "auto") v.preload = "auto";
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    }
    function setViz(k, fromUser) {
      if (!names[k]) return;
      cur = k; loops = 0; need = fromUser ? 2 : 1; // a manual pick stays up a little longer
      if (primed) { poster(k); poster(next(k)); }
      tabs.forEach((t) => { const on = t.dataset.viz === k; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
      vids.forEach((v) => {
        const on = v.dataset.viz === k;
        v.classList.toggle("is-active", on);
        v.setAttribute("aria-hidden", String(!on));
        if (on && v.readyState > 0) { try { v.currentTime = 0; } catch (e) { /* not seekable yet */ } }
        v._last = 0;
      });
      nameEl.textContent = names[k];
      sync();
    }
    // Auto-cycle after each full loop of the current clip (counted from real playback, so a slow
    // connection never skips a clip before it has been seen).
    vids.forEach((v) => {
      v._last = 0;
      v.addEventListener("timeupdate", () => {
        if (v.dataset.viz !== cur) return;
        const t = v.currentTime;
        if (t + 1 < v._last) {
          loops++;
          if (autoBox && autoBox.checked && !reduced && loops >= need) setViz(next(cur), false);
        }
        v._last = t;
      });
    });
    tabs.forEach((t) => t.addEventListener("click", () => setViz(t.dataset.viz, true)));
    tabs.forEach((t, i) => t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const n = tabs[(i + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); setViz(n.dataset.viz, true);
    }));
    if (autoBox) autoBox.addEventListener("change", () => { loops = 0; need = 1; });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en) => { if (en[0].isIntersecting) prime(); }, { rootMargin: "600px 0px" }).observe(stage);
      new IntersectionObserver((en) => { visible = en[0].isIntersecting; sync(); }, { threshold: 0.25 }).observe(stage);
    } else { prime(); visible = true; sync(); }
    document.addEventListener("visibilitychange", sync);
    window.__wavwizViz = {
      current: () => cur,
      set: (k) => setViz(k, true),
      isPlaying: () => { const v = vidFor(cur); return !!v && !v.paused && v.readyState > 2; },
      video: () => vidFor(cur),
      order: () => order.slice()
    };
    window.__wavwizVizSync = sync;
  })();

  /* ---------------- Reduced-motion changes at runtime ---------------- */
  mq.addEventListener && mq.addEventListener("change", (e) => {
    reduced = e.matches;
    if (reduced) { Warp && (Warp.stop(), Warp.redraw()); document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in")); }
    else { Warp && Warp.start(); }
    window.__wavwizVizSync && window.__wavwizVizSync();
  });

  /* ---------------- Themes gallery: swatches switch one large preview ---------------- */
  (function themes() {
    const img = document.getElementById("theme-img");
    const label = document.getElementById("theme-name");
    const btns = Array.from(document.querySelectorAll(".theme-swatch"));
    if (!img || !btns.length) return;
    const warm = new Set();
    function preload(b) {
      const src = b.dataset.src;
      if (!src || warm.has(src)) return;
      warm.add(src); const i = new Image(); i.decoding = "async"; i.src = src;
    }
    function pick(b) {
      btns.forEach((o) => { const on = o === b; o.classList.toggle("is-active", on); o.setAttribute("aria-pressed", String(on)); });
      if (img.getAttribute("src") !== b.dataset.src) {
        img.classList.add("is-swapping");
        const done = () => img.classList.remove("is-swapping");
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        img.src = b.dataset.src;
        img.alt = b.dataset.alt || "";
      }
      if (label) label.textContent = b.textContent.trim();
    }
    btns.forEach((b) => {
      b.addEventListener("click", () => pick(b));
      b.addEventListener("pointerenter", () => preload(b));
      b.addEventListener("focus", () => preload(b));
    });
    window.__wavwizThemes = { pick: (k) => { const b = btns.find((o) => o.dataset.theme === k); if (b) pick(b); }, current: () => img.getAttribute("src") };
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

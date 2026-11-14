/* =====================================================================
   FLAME.AI — Homepage behaviour (vanilla JS, no dependencies)
   ===================================================================== */

/* ---------------------------------------------------------------------
   ★ CONFIGURATION — EDIT THIS OBJECT ★
   Paste your deployed Streamlit URLs below. Every element on the page
   with a data-link="bass" | "flex" | "ai" attribute (the three cards,
   the header button and the footer links) is wired to these values.

   Example:
     bass: "https://flame-ai-bass.streamlit.app/"

   openInNewTab: false  → destinations open in the same tab (default).
                  true  → destinations open in a new tab.
   --------------------------------------------------------------------- */
const FLAME_CONFIG = {
  links: {
    bass: "[INSERT_BASS_STREAMLIT_URL]",
    flex: "[INSERT_FLEX_STREAMLIT_URL]",
    ai:   "https://flameai-invai86n2bk2tscqndidax.streamlit.app/"
  },
  openInNewTab: false
};

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer  = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- 1. Wire destination links from config ---------- */
  function wireLinks() {
    $$("[data-link]").forEach(a => {
      const key = a.dataset.link;
      const url = (FLAME_CONFIG.links[key] || "").trim();
      const isReal = /^https?:\/\//i.test(url);
      if (isReal) {
        a.href = url;
        if (FLAME_CONFIG.openInNewTab) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
      } else {
        // URL not configured yet: keep the link harmless and tell the developer.
        a.href = "#navigate";
        a.dataset.unconfigured = "true";
      }
    });
    const missing = Object.entries(FLAME_CONFIG.links).filter(([, u]) => !/^https?:\/\//i.test(u)).map(([k]) => k);
    if (missing.length) console.warn("[Flame.ai] Set the Streamlit URL(s) in FLAME_CONFIG at the top of script.js for:", missing.join(", "));
  }

  /* ---------- 2. Loader ---------- */
  function initLoader() {
    const loader = $("#loader");
    const minShow = reduceMotion ? 0 : 1300;
    const start = performance.now();
    const hide = () => {
      const wait = Math.max(0, minShow - (performance.now() - start));
      setTimeout(() => {
        loader.classList.add("is-done");
        document.body.classList.remove("is-loading");
        setTimeout(() => loader.remove(), 900);
      }, wait);
    };
    if (document.readyState === "complete") hide(); else window.addEventListener("load", hide, { once: true });
    setTimeout(hide, 6000); // safety net
  }

  /* ---------- 3. Header, mobile nav, smooth scroll ---------- */
  function initNav() {
    const header = $("#siteHeader"), toggle = $("#navToggle"), nav = $("#mainNav");
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });

    const setOpen = open => {
      nav.classList.toggle("is-open", open);
      header.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });

    // Smooth in-page scrolling for [data-scroll] and #hash links
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener("click", e => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        setOpen(false);
        target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        history.replaceState(null, "", id);
      });
    });
  }

  /* ---------- 4. Scroll reveal (IntersectionObserver) ---------- */
  function initReveal() {
    const items = $$(".reveal");
    if (!("IntersectionObserver" in window)) { items.forEach(el => el.classList.add("is-visible")); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add("is-visible");
        io.unobserve(el);
        // Cards hand their transform back to the tilt/hover system once revealed.
        if (el.classList.contains("card")) {
          setTimeout(() => el.classList.remove("reveal", "is-visible"), 1300);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    items.forEach(el => io.observe(el));
  }

  /* ---------- 5. Canvas: parallax stars + drifting embers ---------- */
  function initSpace() {
    const canvas = $("#space"), ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, stars = [], motes = [], lastY = window.scrollY, vel = 0;

    // Pre-rendered glow sprites keep per-frame cost low.
    const sprite = (rgb) => {
      const c = document.createElement("canvas"); c.width = c.height = 32;
      const g = c.getContext("2d"), r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      r.addColorStop(0, `rgba(${rgb},1)`); r.addColorStop(.35, `rgba(${rgb},.45)`); r.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = r; g.fillRect(0, 0, 32, 32); return c;
    };
    const spriteOrange = sprite("255,140,70"), spriteBlue = sprite("125,211,252");

    const layers = [ // depth layers move at different parallax speeds
      { density: 1 / 9000, size: [.4, .9], speed: .015, alpha: .45 },
      { density: 1 / 17000, size: [.7, 1.3], speed: .045, alpha: .7 },
      { density: 1 / 52000, size: [1.1, 1.9], speed: .1, alpha: .95 }
    ];

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = [];
      layers.forEach((L, li) => {
        const n = Math.round(w * h * L.density);
        for (let i = 0; i < n; i++) stars.push({
          x: Math.random() * w, y: Math.random() * h, li,
          r: L.size[0] + Math.random() * (L.size[1] - L.size[0]),
          tw: .5 + Math.random() * 1.8, ph: Math.random() * 6.28,
          warm: Math.random() < .12
        });
      });
      const m = w < 700 ? 16 : 34;
      motes = Array.from({ length: m }, () => ({
        x: Math.random() * w, y: Math.random() * h, vy: .08 + Math.random() * .3,
        sway: Math.random() * 6.28, amp: 8 + Math.random() * 22, s: 6 + Math.random() * 12,
        depth: .04 + Math.random() * .16, orange: Math.random() < .6
      }));
    }

    function frame(t) {
      const sy = window.scrollY;
      vel += ((sy - lastY) - vel) * .1; lastY = sy;      // smoothed scroll velocity
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        const L = layers[s.li];
        const y = ((s.y - sy * L.speed) % h + h) % h;
        const a = L.alpha * (reduceMotion ? 1 : .65 + .35 * Math.sin(t * .001 * s.tw + s.ph));
        ctx.globalAlpha = a;
        ctx.fillStyle = s.warm ? "#FFD7B8" : "#F8FAFC";
        ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, 6.2832); ctx.fill();
      }
      for (const p of motes) {
        if (!reduceMotion) { p.y -= p.vy + Math.abs(vel) * .05; }
        if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
        const py = p.y - sy * p.depth * .3;
        const x = p.x + Math.sin(t * .0006 + p.sway) * p.amp + vel * p.depth * 2;
        ctx.globalAlpha = .55;
        ctx.drawImage(p.orange ? spriteOrange : spriteBlue, x - p.s, ((py % h) + h) % h - p.s, p.s * 2, p.s * 2);
      }
      ctx.globalAlpha = 1;
      if (!reduceMotion && !document.hidden) requestAnimationFrame(frame);
    }

    build();
    let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduceMotion) frame(0); }, 150); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden && !reduceMotion) requestAnimationFrame(frame); });
    if (reduceMotion) frame(0); else requestAnimationFrame(frame);
  }

  /* ---------- 6. Parallax for planets / nebulae / horizon ---------- */
  function initParallax() {
    if (reduceMotion) return;
    const groups = $$("[data-psection]").map(sec => ({ sec, els: $$("[data-parallax]", sec) }));
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      groups.forEach(({ sec, els }) => {
        const r = sec.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;           // skip off-screen sections
        const offset = (r.top + r.height / 2) - vh / 2;               // 0 when centred
        els.forEach(el => {
          const k = parseFloat(el.dataset.parallax);
          el.style.transform = `translate3d(0, ${(-offset * k).toFixed(1)}px, 0)`;
        });
      });
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- 7. Spacecraft: time-based glide + scroll push ---------- */
  function initShip() {
    const ship = $("#ship");
    if (reduceMotion || !ship) return;
    let w = window.innerWidth, h = window.innerHeight, sy = window.scrollY;
    window.addEventListener("resize", () => { w = innerWidth; h = innerHeight; });
    window.addEventListener("scroll", () => { sy = window.scrollY; }, { passive: true });
    const t0 = performance.now();

    const pos = (t) => {
      const span = w + 700;
      // constant slow drift + extra travel as the visitor scrolls
      const d = (t * 0.028 + sy * 0.22) % span;
      const x = d - 400;
      const prog = d / span;
      const y = h * (.2 + .1 * Math.sin(prog * Math.PI * 2)) + Math.sin(t * .0013) * 6 - sy * .04;
      return [x, y];
    };

    const loop = (now) => {
      const t = now - t0;
      const [x, y] = pos(t), [x2, y2] = pos(t + 40);
      const angle = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI;       // nose follows its path
      const fadeIn = clamp((t - 1200) / 1500, 0, 1);                   // appears after the loader
      const scrollFade = clamp(1 - sy / (h * 3.2), .28, 1);            // quieter behind later content
      ship.style.opacity = (fadeIn * scrollFade).toFixed(2);
      ship.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${angle.toFixed(2)}deg)`;
      if (!document.hidden) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) requestAnimationFrame(loop); });
  }

  /* ---------- 8. Card 3D tilt ---------- */
  function initTilt() {
    if (reduceMotion || !finePointer) return;
    $$(".card").forEach(card => {
      const max = card.classList.contains("card--flex") ? 11 : 7;   // FLEX gets the strongest tilt
      card.addEventListener("pointermove", e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        card.classList.add("is-tilting");
        card.style.setProperty("--ry", (px * max * 2).toFixed(2) + "deg");
        card.style.setProperty("--rx", (-py * max * 2).toFixed(2) + "deg");
      });
      card.addEventListener("pointerleave", () => {
        card.classList.remove("is-tilting");
        card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- 9. Cursor glow (desktop only) ---------- */
  function initCursor() {
    const glow = $("#cursorGlow");
    if (reduceMotion || !finePointer || !glow) return;
    let tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty, running = false;
    window.addEventListener("pointermove", e => {
      tx = e.clientX; ty = e.clientY; glow.classList.add("is-on");
      if (!running) { running = true; requestAnimationFrame(step); }
    });
    document.addEventListener("pointerleave", () => glow.classList.remove("is-on"));
    function step() {
      x += (tx - x) * .14; y += (ty - y) * .14;
      glow.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (Math.abs(tx - x) > .3 || Math.abs(ty - y) > .3) requestAnimationFrame(step); else running = false;
    }
  }

  /* ---------- Init ---------- */
  wireLinks();
  initLoader();
  initNav();
  initReveal();
  initSpace();
  initParallax();
  initShip();
  initTilt();
  initCursor();
})();

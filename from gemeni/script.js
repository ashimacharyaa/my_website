/* ═══════════════════════════════════════════════════════
   QUANTEDGE MARKET TERMINAL · SCRIPT.JS
   ═══════════════════════════════════════════════════════ */

// ── API KEY (hardcoded) ──────────────────────────────────
const API_KEY = "d80oghpr01qt5k5vmtl0d80oghpr01qt5k5vmtlg";

// ── ADMIN CREDENTIALS (API Status section is admin-only) ─
const ADMIN_USERNAME = "Ashim";
const ADMIN_PASSWORD = "Aashika@22228888";

// ── FINNHUB BASE URL ─────────────────────────────────────
const BASE = "https://finnhub.io/api/v1";

// ── STATE ────────────────────────────────────────────────
let currentSymbol   = "";
let currentTF       = "D";
let priceChart      = null;
let cryptoChart     = null;
let isAdminLoggedIn = false;
let retryCount      = {};
const MAX_RETRY     = 2;

// Trending symbols to prefetch
const TRENDING_SYMS = ["AAPL", "FUSE", "TSLA", "NVDA", "MSFT", "META", "NFLX"];

// Search suggestions pool
const SYMBOL_POOL = [
  { sym: "AAPL",  name: "Apple Inc." },
  { sym: "TSLA",  name: "Tesla Inc." },
  { sym: "MSFT",  name: "Microsoft Corp." },
  { sym: "NVDA",  name: "NVIDIA Corp." },
  { sym: "META",  name: "Meta Platforms" },
  { sym: "AMZN",  name: "Amazon.com Inc." },
  { sym: "GOOGL", name: "Alphabet Inc." },
  { sym: "NFLX",  name: "Netflix Inc." },
  { sym: "AMD",   name: "Advanced Micro Devices" },
  { sym: "BABA",  name: "Alibaba Group" },
  { sym: "JPM",   name: "JPMorgan Chase" },
  { sym: "V",     name: "Visa Inc." },
  { sym: "WMT",   name: "Walmart Inc." },
  { sym: "DIS",   name: "Walt Disney Co." },
  { sym: "PYPL",  name: "PayPal Holdings" },
  { sym: "INTC",  name: "Intel Corp." },
  { sym: "CRM",   name: "Salesforce Inc." },
  { sym: "UBER",  name: "Uber Technologies" },
  { sym: "SPOT",  name: "Spotify Technology" },
  { sym: "COIN",  name: "Coinbase Global" },
];

// Forex pairs to display
const FOREX_PAIRS = [
  { from: "USD", to: "NPR", label: "USD / NPR",  flag: "🇺🇸 🇳🇵" },
  { from: "EUR", to: "USD", label: "EUR / USD",  flag: "🇪🇺 🇺🇸" },
  { from: "GBP", to: "USD", label: "GBP / USD",  flag: "🇬🇧 🇺🇸" },
  { from: "USD", to: "JPY", label: "USD / JPY",  flag: "🇺🇸 🇯🇵" },
  { from: "AUD", to: "USD", label: "AUD / USD",  flag: "🇦🇺 🇺🇸" },
  { from: "USD", to: "CHF", label: "USD / CHF",  flag: "🇺🇸 🇨🇭" },
];

// API endpoints for status dashboard
const API_ENDPOINTS = [
  { path: "/economic/code",       label: "/economic/code" },
  { path: "/stock/symbol",        label: "/stock/symbol",        params: { exchange: "US" } },
  { path: "/stock/market-status", label: "/stock/market-status", params: { exchange: "US" } },
  { path: "/news",                label: "/news",                 params: { category: "general" } },
  { path: "/company-news",        label: "/company-news",        params: { symbol: "AAPL", from: today(-7), to: today(0) } },
  { path: "/stock/profile2",      label: "/stock/profile",       params: { symbol: "AAPL" } },
  { path: "/stock/financials",    label: "/stock/financials",    params: { symbol: "AAPL", statement: "bs", freq: "annual" } },
  { path: "/quote",               label: "/quote",               params: { symbol: "AAPL" } },
  { path: "/stock/candle",        label: "/stock/candle",        params: { symbol: "AAPL", resolution: "D", from: Math.floor(Date.now()/1000)-7*86400, to: Math.floor(Date.now()/1000) } },
  { path: "/crypto/symbol",       label: "/crypto/symbol",       params: { exchange: "binance" } },
  { path: "/forex/rates",         label: "/forex/rates",         params: { base: "USD" } },
  { path: "/indicator",           label: "/indicator",           params: { symbol: "AAPL", resolution: "D", from: Math.floor(Date.now()/1000)-60*86400, to: Math.floor(Date.now()/1000), indicator: "rsi", timeperiod: 14 } },
];

/* ─────────────────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────────────────── */

function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function fmtPrice(n) {
  if (n == null || isNaN(n)) return "—";
  return "$" + parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n) {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (abs >= 1e9)  return "$" + (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6)  return "$" + (n / 1e6).toFixed(2) + "M";
  return "$" + n.toLocaleString();
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return "—";
  const v = parseFloat(n);
  return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
}

function clrClass(n) {
  const v = parseFloat(n);
  if (isNaN(v)) return "";
  return v >= 0 ? "pos" : "neg";
}

function estNow() {
  return new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false,
    hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function tsToDate(ts) {
  return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isMarketOpen() {
  const est = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const h = est.getHours(), m = est.getMinutes(), d = est.getDay();
  return d >= 1 && d <= 5 && (h > 9 || (h === 9 && m >= 30)) && h < 16;
}

/* ─────────────────────────────────────────────────────────
   CORE API CALL with retry + error handling
───────────────────────────────────────────────────────── */

async function apiFetch(endpoint, params = {}, retries = MAX_RETRY) {
  const url = new URL(BASE + endpoint);
  url.searchParams.set("token", API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString());
    if (res.status === 429) {
      // Rate limit — wait 2s and retry
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 2000));
        return apiFetch(endpoint, params, retries - 1);
      }
      throw new Error("Rate limit reached");
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (err) {
    if (retries > 0 && !err.message.includes("Rate limit")) {
      await new Promise(r => setTimeout(r, 1000));
      return apiFetch(endpoint, params, retries - 1);
    }
    throw err;
  }
}

/* API call with latency measurement (for status dashboard) */
async function apiFetchTimed(endpoint, params = {}) {
  const t0 = performance.now();
  try {
    const data = await apiFetch(endpoint, params, 0);
    const ms = Math.round(performance.now() - t0);
    return { ok: true, ms, data };
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    return { ok: false, ms, error: e.message };
  }
}

/* ─────────────────────────────────────────────────────────
   PARTICLES BACKGROUND
───────────────────────────────────────────────────────── */

function initParticles() {
  const canvas = document.getElementById("particleCanvas");
  const ctx = canvas.getContext("2d");
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function randomParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    };
  }

  resize();
  for (let i = 0; i < 120; i++) particles.push(randomParticle());
  window.addEventListener("resize", resize);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 212, 255, ${p.alpha})`;
      ctx.fill();
    });

    // Draw connecting lines for nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,212,255,${0.04 * (1 - dist / 100)})`;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ─────────────────────────────────────────────────────────
   CLOCK & MARKET STATUS
───────────────────────────────────────────────────────── */

function initClock() {
  function tick() {
    const t = estNow();
    const el = document.getElementById("navClock");
    const el2 = document.getElementById("sidebarTime");
    if (el)  el.textContent  = t + " EST";
    if (el2) el2.textContent = t + " EST";

    const open = isMarketOpen();

    // Sidebar
    const dot = document.getElementById("sidebarDot");
    const lbl = document.getElementById("sidebarMarket");
    if (dot) { dot.className = "dot " + (open ? "open" : "closed"); }
    if (lbl) lbl.textContent = open ? "Market Open" : "Market Closed";

    // Nav badge
    const mktDot = document.getElementById("mktDot");
    const mktLbl = document.getElementById("mktLabel");
    if (mktDot) {
      mktDot.style.background = open ? "var(--pos)" : "var(--neg)";
      mktDot.style.boxShadow  = open ? "var(--glow-pos)" : "var(--glow-neg)";
    }
    if (mktLbl) mktLbl.textContent = open ? "US Open" : "US Closed";
  }
  tick();
  setInterval(tick, 1000);
}

/* ─────────────────────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────────────────────── */

function toast(msg, type = "") {
  const wrap = document.getElementById("toastWrap");
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(120%)";
    el.style.transition = "all 0.3s";
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

/* ─────────────────────────────────────────────────────────
   NAVIGATION / SECTIONS
───────────────────────────────────────────────────────── */

function initNav() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      const sec = item.dataset.section;
      navigateTo(sec, item);
    });
  });
}

function navigateTo(sec, itemEl) {
  // Admin gate for API status
  if (sec === "apistatus") {
    if (!isAdminLoggedIn) {
      showAdminLogin();
      return;
    }
  }

  // Deactivate all
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));

  // Activate clicked
  if (itemEl) itemEl.classList.add("active");
  else {
    const found = document.querySelector(`.nav-item[data-section="${sec}"]`);
    if (found) found.classList.add("active");
  }

  const target = document.getElementById("sec-" + sec);
  if (target) target.classList.add("active");

  // Lazy-load sections on first visit
  if (sec === "crypto")    loadCryptoSection();
  if (sec === "forex")     loadForexSection();
  if (sec === "news")      loadNewsSection();
  if (sec === "apistatus") loadApiStatus();

  // Close sidebar on mobile
  closeSidebarMobile();
}

/* ─────────────────────────────────────────────────────────
   ADMIN LOGIN MODAL
─────────────────────────────────────────────────────────*/

function showAdminLogin() {
  // Remove existing modal if any
  const existing = document.getElementById("adminModal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "adminModal";
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.75);
    display:flex; align-items:center; justify-content:center;
    z-index:9998; backdrop-filter:blur(10px);
    animation: fadeIn 0.2s ease;
  `;

  overlay.innerHTML = `
    <div style="
      background: rgba(8,12,24,0.98);
      border: 1px solid rgba(0,212,255,0.2);
      border-radius: 16px;
      padding: 40px 36px;
      width: 100%;
      max-width: 380px;
      box-shadow: 0 0 60px rgba(0,212,255,0.1), 0 24px 80px rgba(0,0,0,0.6);
      position: relative;
      animation: slideUp 0.3s cubic-bezier(0.4,0,0.2,1);
    ">
      <button onclick="closeAdminModal()" style="
        position:absolute; top:16px; right:16px;
        background:none; border:none; color:var(--txt3);
        font-size:1.2rem; cursor:pointer; line-height:1;
        transition: color 0.2s;
      " onmouseover="this.style.color='var(--txt)'" onmouseout="this.style.color='var(--txt3)'">✕</button>

      <div style="text-align:center; margin-bottom:28px;">
        <div style="
          font-size:2.5rem; color:var(--acc);
          text-shadow: 0 0 20px rgba(0,212,255,0.5);
          margin-bottom:12px;
        ">⬡</div>
        <div style="
          font-family:var(--disp); font-size:1.4rem;
          letter-spacing:4px; color:var(--txt);
          font-weight:700; margin-bottom:6px;
        ">ADMIN ACCESS</div>
        <div style="
          font-family:var(--mono); font-size:11px;
          color:var(--txt3); letter-spacing:2px;
        ">API STATUS IS RESTRICTED</div>
      </div>

      <div style="display:flex; flex-direction:column; gap:14px;">
        <div>
          <div style="font-family:var(--mono);font-size:9px;letter-spacing:3px;color:var(--txt3);margin-bottom:6px;">USERNAME</div>
          <input id="adminUser" type="text" autocomplete="off"
            style="
              width:100%; background:rgba(255,255,255,0.04);
              border:1px solid rgba(255,255,255,0.1); border-radius:8px;
              padding:12px 14px; color:var(--txt);
              font-family:var(--mono); font-size:13px; outline:none;
              transition: border-color 0.2s;
            "
            onfocus="this.style.borderColor='rgba(0,212,255,0.4)'"
            onblur="this.style.borderColor='rgba(255,255,255,0.1)'"
            placeholder="Enter username"
          />
        </div>
        <div>
          <div style="font-family:var(--mono);font-size:9px;letter-spacing:3px;color:var(--txt3);margin-bottom:6px;">PASSWORD</div>
          <input id="adminPass" type="password" autocomplete="off"
            style="
              width:100%; background:rgba(255,255,255,0.04);
              border:1px solid rgba(255,255,255,0.1); border-radius:8px;
              padding:12px 14px; color:var(--txt);
              font-family:var(--mono); font-size:13px; outline:none;
              transition: border-color 0.2s;
            "
            onfocus="this.style.borderColor='rgba(0,212,255,0.4)'"
            onblur="this.style.borderColor='rgba(255,255,255,0.1)'"
            placeholder="Enter password"
            onkeydown="if(event.key==='Enter') attemptAdminLogin()"
          />
        </div>
        <div id="adminErr" style="
          font-family:var(--mono); font-size:11px;
          color:var(--neg); min-height:16px; letter-spacing:1px;
        "></div>
        <button onclick="attemptAdminLogin()" style="
          background: linear-gradient(135deg, var(--acc), var(--acc2));
          border:none; border-radius:8px; padding:13px;
          font-family:var(--disp); font-size:13px; letter-spacing:3px;
          color:#fff; font-weight:700; cursor:pointer;
          transition: all 0.2s;
          box-shadow: 0 0 20px rgba(0,212,255,0.2);
        "
          onmouseover="this.style.filter='brightness(1.15)'"
          onmouseout="this.style.filter='brightness(1)'"
        >LOGIN</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById("adminUser")?.focus(), 100);

  // Click outside to close
  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeAdminModal();
  });
}

function closeAdminModal() {
  const m = document.getElementById("adminModal");
  if (m) {
    m.style.opacity = "0";
    m.style.transition = "opacity 0.2s";
    setTimeout(() => m.remove(), 200);
  }
}

function attemptAdminLogin() {
  const user = document.getElementById("adminUser")?.value.trim();
  const pass = document.getElementById("adminPass")?.value;
  const errEl = document.getElementById("adminErr");

  if (user === ADMIN_USERNAME && pass === ADMIN_PASSWORD) {
    isAdminLoggedIn = true;
    closeAdminModal();
    toast("Admin access granted", "ok");
    // Navigate to API status now
    navigateTo("apistatus", null);
    // Update nav item
    const navItem = document.querySelector('.nav-item[data-section="apistatus"]');
    if (navItem) navItem.classList.add("active");
    document.querySelectorAll(".nav-item").forEach(n => {
      if (n.dataset.section !== "apistatus") n.classList.remove("active");
    });
  } else {
    if (errEl) {
      errEl.textContent = "✗ Invalid credentials";
      errEl.style.animation = "none";
      setTimeout(() => { errEl.style.animation = ""; }, 10);
    }
    // Shake the modal box
    const box = document.querySelector("#adminModal > div");
    if (box) {
      box.style.animation = "shake 0.4s ease";
      setTimeout(() => box.style.animation = "", 400);
    }
  }
}

/* ─────────────────────────────────────────────────────────
   SIDEBAR MOBILE TOGGLE
───────────────────────────────────────────────────────── */

function toggleSidebar() {
  const sb = document.getElementById("sidebar");
  sb.classList.toggle("open");
  // Overlay
  let ov = document.getElementById("sidebarOverlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "sidebarOverlay";
    ov.className = "sidebar-overlay";
    ov.onclick = closeSidebarMobile;
    document.body.appendChild(ov);
  }
  ov.classList.toggle("show", sb.classList.contains("open"));
}

function closeSidebarMobile() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarOverlay")?.classList.remove("show");
}

/* ─────────────────────────────────────────────────────────
   SEARCH
───────────────────────────────────────────────────────── */

function initSearch() {
  const input = document.getElementById("searchInput");
  const sugg  = document.getElementById("searchSuggestions");

  input.addEventListener("input", () => {
    const q = input.value.trim().toUpperCase();
    if (!q) { sugg.classList.remove("show"); return; }

    const matches = SYMBOL_POOL.filter(
      s => s.sym.startsWith(q) || s.name.toUpperCase().includes(q)
    ).slice(0, 6);

    if (!matches.length) { sugg.classList.remove("show"); return; }

    sugg.innerHTML = matches.map(m => `
      <div class="suggestion-item" onclick="selectSymbol('${m.sym}')">
        <span class="sug-sym">${m.sym}</span>
        <span class="sug-name">${m.name}</span>
      </div>
    `).join("");
    sugg.classList.add("show");
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const q = input.value.trim().toUpperCase();
      if (q) selectSymbol(q);
    }
    if (e.key === "Escape") sugg.classList.remove("show");
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".search-wrap")) sugg.classList.remove("show");
  });
}

function selectSymbol(sym) {
  sym = sym.toUpperCase();
  document.getElementById("searchInput").value = sym;
  document.getElementById("searchSuggestions").classList.remove("show");
  navigateTo("dashboard", document.querySelector('.nav-item[data-section="dashboard"]'));
  loadSymbol(sym);
}

/* ─────────────────────────────────────────────────────────
   LOAD FULL SYMBOL DATA (Dashboard)
───────────────────────────────────────────────────────── */

async function loadSymbol(sym) {
  currentSymbol = sym;
  document.getElementById("heroName").textContent = sym;
  document.getElementById("heroMeta").textContent = "Fetching data…";
  document.getElementById("heroPrice").textContent = "—";
  document.getElementById("heroChange").textContent = "";
  document.getElementById("heroChange").className = "hero-change";

  // Reset quote cells
  ["qOpen","qHigh","qLow","qPrev","q52H","q52L"].forEach(id => {
    document.getElementById(id).textContent = "—";
  });

  try {
    // Parallel fetch: quote + profile
    const [quote, profile] = await Promise.all([
      apiFetch("/quote", { symbol: sym }),
      apiFetch("/stock/profile2", { symbol: sym }),
    ]);

    renderHero(sym, quote, profile);
    renderCompanyInfo(profile);

    // Load chart with current timeframe
    loadChart(sym, currentTF);

    // Load indicators
    loadIndicators(sym);

    // Load news
    loadCompanyNews(sym);

    // Show info+news grid
    document.getElementById("infoNewsGrid").style.display = "grid";

  } catch (err) {
    toast("Error loading " + sym + ": " + err.message, "err");
    document.getElementById("heroMeta").textContent = "Error: " + err.message;
  }
}

/* ─────────────────────────────────────────────────────────
   HERO / QUOTE RENDER
───────────────────────────────────────────────────────── */

function renderHero(sym, q, p) {
  const chg = q.c - q.pc;
  const pct = q.pc ? (chg / q.pc) * 100 : 0;

  // Logo
  const logoEl = document.getElementById("heroLogo");
  if (p.logo) { logoEl.src = p.logo; logoEl.style.display = "block"; }
  else logoEl.style.display = "none";

  document.getElementById("heroName").textContent = p.name || sym;
  document.getElementById("heroMeta").textContent = (p.exchange || "") + (p.finnhubIndustry ? " · " + p.finnhubIndustry : "");
  document.getElementById("heroPrice").textContent = fmtPrice(q.c);

  const chgEl = document.getElementById("heroChange");
  chgEl.textContent = (chg >= 0 ? "+" : "") + chg.toFixed(2) + "  " + fmtPct(pct);
  chgEl.className = "hero-change " + (chg >= 0 ? "pos" : "neg");

  document.getElementById("heroExchange").textContent = p.exchange || "";
  document.getElementById("heroIndustry").textContent = p.finnhubIndustry || "";

  // Quote grid
  document.getElementById("qOpen").textContent = fmtPrice(q.o);
  document.getElementById("qHigh").textContent = fmtPrice(q.h);
  document.getElementById("qLow").textContent  = fmtPrice(q.l);
  document.getElementById("qPrev").textContent = fmtPrice(q.pc);
  document.getElementById("q52H").textContent  = q.h52Week ? fmtPrice(q.h52Week) : "—";
  document.getElementById("q52L").textContent  = q.l52Week ? fmtPrice(q.l52Week) : "—";

  document.getElementById("chartTitle").textContent = sym + " — Price Chart";
}

/* ─────────────────────────────────────────────────────────
   CHART
───────────────────────────────────────────────────────── */

function initChartTabs() {
  document.querySelectorAll(".tf-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tf-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTF = btn.dataset.tf;
      if (currentSymbol) loadChart(currentSymbol, currentTF);
    });
  });
}

async function loadChart(sym, tf) {
  const canvas      = document.getElementById("priceChart");
  const placeholder = document.getElementById("chartPlaceholder");

  placeholder.style.display = "none";
  canvas.style.display = "block";
  canvas.style.opacity = "0.4";

  // Determine resolution + from timestamp
  const now = Math.floor(Date.now() / 1000);
  let resolution, from;
  if (tf === "D")   { resolution = "60"; from = now - 1 * 86400; }
  else if (tf === "W")  { resolution = "D";  from = now - 7 * 86400; }
  else if (tf === "M")  { resolution = "D";  from = now - 30 * 86400; }
  else                   { resolution = "W";  from = now - 365 * 86400; }

  try {
    const data = await apiFetch("/stock/candle", { symbol: sym, resolution, from, to: now });

    if (data.s !== "ok" || !data.c?.length) {
      // Candle data may need premium plan — show fallback message
      placeholder.innerHTML = `
        <div class="chart-placeholder-icon">◉</div>
        <div>Candle data unavailable for <strong>${sym}</strong></div>
        <div style="font-size:11px; margin-top:4px; color:var(--txt3)">May require Finnhub premium plan</div>
      `;
      placeholder.style.display = "flex";
      canvas.style.display = "none";
      return;
    }

    canvas.style.opacity = "1";
    drawChart(data, sym, tf);
    drawIndicatorsOnChart(data);

  } catch (err) {
    placeholder.innerHTML = `<div class="chart-placeholder-icon">◉</div><div>${err.message}</div>`;
    placeholder.style.display = "flex";
    canvas.style.display = "none";
  }
}

function drawChart(data, sym, tf) {
  const labels = data.t.map(ts => {
    const d = new Date(ts * 1000);
    if (tf === "D") return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const closes = data.c;
  const start  = closes[0];
  const end    = closes[closes.length - 1];
  const isUp   = end >= start;

  const colorPos = "rgba(0, 230, 118, 1)";
  const colorNeg = "rgba(255, 23, 68, 1)";
  const lineColor = isUp ? colorPos : colorNeg;
  const fillColor = isUp ? "rgba(0,230,118,0.08)" : "rgba(255,23,68,0.08)";

  if (priceChart) priceChart.destroy();

  const ctx = document.getElementById("priceChart").getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 300);
  grad.addColorStop(0, isUp ? "rgba(0,230,118,0.2)" : "rgba(255,23,68,0.2)");
  grad.addColorStop(1, "rgba(0,0,0,0)");

  priceChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: sym,
        data: closes,
        borderColor: lineColor,
        backgroundColor: grad,
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: closes.length > 60 ? 0 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: lineColor,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: "easeInOutQuart" },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(8,12,24,0.95)",
          borderColor: lineColor,
          borderWidth: 1,
          titleColor: "#8899bb",
          bodyColor: lineColor,
          titleFont: { family: "JetBrains Mono", size: 10 },
          bodyFont:  { family: "JetBrains Mono", size: 13 },
          callbacks: { label: ctx => " $" + ctx.parsed.y.toFixed(2) }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)", drawBorder: false },
          ticks: {
            color: "#445577",
            font: { family: "JetBrains Mono", size: 10 },
            maxTicksLimit: 10,
          }
        },
        y: {
          position: "right",
          grid: { color: "rgba(255,255,255,0.04)", drawBorder: false },
          ticks: {
            color: "#445577",
            font: { family: "JetBrains Mono", size: 10 },
            callback: v => "$" + v.toFixed(2)
          }
        }
      }
    }
  });
}

/* ─────────────────────────────────────────────────────────
   TECHNICAL INDICATORS
───────────────────────────────────────────────────────── */

function drawIndicatorsOnChart(data) {
  // We calculate client-side from candle data for instant display
  const closes = data.c;
  if (!closes || closes.length < 20) return;

  const rsi  = calcRSI(closes, 14);
  const sma  = calcSMA(closes, 20);
  const ema  = calcEMA(closes, 20);
  const macd = calcMACD(closes);

  const lastPrice = closes[closes.length - 1];
  const lastRSI   = rsi[rsi.length - 1];
  const lastSMA   = sma[sma.length - 1];
  const lastEMA   = ema[ema.length - 1];
  const lastMACD  = macd[macd.length - 1];

  document.getElementById("indicatorsRow").style.display = "grid";

  // RSI
  document.getElementById("rsiVal").textContent = lastRSI ? lastRSI.toFixed(2) : "—";
  const rsiBar = document.getElementById("rsiBar");
  if (rsiBar) rsiBar.style.width = (lastRSI || 50) + "%";
  const rsiSig = document.getElementById("rsiSignal");
  if (rsiSig) {
    if (lastRSI > 70)      { rsiSig.textContent = "OVERBOUGHT"; rsiSig.className = "ind-signal neg"; }
    else if (lastRSI < 30) { rsiSig.textContent = "OVERSOLD";   rsiSig.className = "ind-signal pos"; }
    else                   { rsiSig.textContent = "NEUTRAL";    rsiSig.className = "ind-signal warn"; }
  }

  // MACD
  document.getElementById("macdVal").textContent = lastMACD ? lastMACD.toFixed(4) : "—";
  const macdSig = document.getElementById("macdSignal");
  if (macdSig) {
    if (lastMACD > 0) { macdSig.textContent = "BULLISH"; macdSig.className = "ind-signal pos"; }
    else              { macdSig.textContent = "BEARISH"; macdSig.className = "ind-signal neg"; }
  }

  // SMA
  document.getElementById("smaVal").textContent = lastSMA ? "$" + lastSMA.toFixed(2) : "—";
  const smaSig = document.getElementById("smaSignal");
  if (smaSig && lastSMA) {
    if (lastPrice > lastSMA) { smaSig.textContent = "ABOVE SMA — BULLISH"; smaSig.className = "ind-signal pos"; }
    else                     { smaSig.textContent = "BELOW SMA — BEARISH"; smaSig.className = "ind-signal neg"; }
  }

  // EMA
  document.getElementById("emaVal").textContent = lastEMA ? "$" + lastEMA.toFixed(2) : "—";
  const emaSig = document.getElementById("emaSignal");
  if (emaSig && lastEMA) {
    if (lastPrice > lastEMA) { emaSig.textContent = "ABOVE EMA — BULLISH"; emaSig.className = "ind-signal pos"; }
    else                     { emaSig.textContent = "BELOW EMA — BEARISH"; emaSig.className = "ind-signal neg"; }
  }
}

async function loadIndicators(sym) {
  // Try fetching RSI from Finnhub (optional — we calculate client-side above from candle)
  // This is here as a supplementary call
}

/* ── Indicator Calculations ── */

function calcRSI(closes, period = 14) {
  const result = [];
  if (closes.length < period + 1) return result;

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    result.push(100 - 100 / (1 + avgGain / (avgLoss || 0.0001)));
    const d = closes[i] - closes[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  result.push(100 - 100 / (1 + avgGain / (avgLoss || 0.0001)));
  return result;
}

function calcSMA(closes, period = 20) {
  const result = [];
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

function calcEMA(closes, period = 20) {
  const k = 2 / (period + 1);
  const result = [];
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast   = calcEMA(closes, fast);
  const emaSlow   = calcEMA(closes, slow);
  const macdLine  = emaFast.slice(slow - fast).map((v, i) => v - emaSlow[i]);
  const signalLine = calcEMA(macdLine, signal);
  return macdLine.slice(signal - 1).map((v, i) => v - signalLine[i]);
}

/* ─────────────────────────────────────────────────────────
   TRENDING STOCKS
───────────────────────────────────────────────────────── */

async function loadTrending() {
  const container = document.getElementById("trendingCards");
  const bar       = document.getElementById("trendingScroll");

  // Skeleton placeholders for cards
  container.innerHTML = TRENDING_SYMS.map(() => `
    <div class="trend-card">
      <div class="skel skel-block" style="height:14px; width:60px; margin-bottom:12px"></div>
      <div class="skel skel-block" style="height:22px; width:100px; margin-bottom:8px"></div>
      <div class="skel skel-block" style="height:12px; width:80px"></div>
    </div>
  `).join("");

  // Fetch quotes in parallel
  const results = await Promise.allSettled(
    TRENDING_SYMS.map(sym =>
      Promise.all([
        apiFetch("/quote", { symbol: sym }),
        apiFetch("/stock/profile2", { symbol: sym }),
      ]).then(([q, p]) => ({ sym, q, p }))
    )
  );

  // Render cards
  container.innerHTML = "";
  bar.innerHTML = "";

  results.forEach(res => {
    if (res.status !== "fulfilled") return;
    const { sym, q, p } = res.value;
    const chg = q.c - q.pc;
    const pct = q.pc ? (chg / q.pc) * 100 : 0;
    const isUp = chg >= 0;

    // Trending card
    const card = document.createElement("div");
    card.className = "trend-card";
    card.innerHTML = `
      <div class="tc-header">
        <span class="tc-symbol">${sym}</span>
        <span class="tc-badge ${isUp ? "pos" : "neg"}" style="background:${isUp ? "rgba(0,230,118,0.1)" : "rgba(255,23,68,0.1)"}; border:1px solid ${isUp ? "rgba(0,230,118,0.25)" : "rgba(255,23,68,0.25)"}">
          ${isUp ? "▲" : "▼"} ${Math.abs(pct).toFixed(2)}%
        </span>
      </div>
      <div class="tc-price">${fmtPrice(q.c)}</div>
      <div class="tc-company">${p.name || sym}</div>
    `;
    card.onclick = () => selectSymbol(sym);
    container.appendChild(card);

    // Ticker bar chip
    const chip = document.createElement("div");
    chip.className = "trending-chip";
    chip.innerHTML = `
      <span class="tc-sym">${sym}</span>
      <span class="tc-price">${fmtPrice(q.c)}</span>
      <span class="tc-chg ${isUp ? "pos" : "neg"}">${isUp ? "▲" : "▼"} ${Math.abs(pct).toFixed(2)}%</span>
    `;
    chip.onclick = () => selectSymbol(sym);
    bar.appendChild(chip);

    // Duplicate for seamless ticker loop
    const chip2 = chip.cloneNode(true);
    chip2.onclick = () => selectSymbol(sym);
    bar.appendChild(chip2);
  });
}

/* ─────────────────────────────────────────────────────────
   COMPANY INFO
───────────────────────────────────────────────────────── */

function renderCompanyInfo(p) {
  const logoEl = document.getElementById("compLogo");
  if (p.logo) { logoEl.src = p.logo; logoEl.style.display = "block"; }
  else logoEl.style.display = "none";

  document.getElementById("compName").textContent = p.name || "—";
  const urlEl = document.getElementById("compUrl");
  if (p.weburl) {
    urlEl.href = p.weburl;
    urlEl.textContent = p.weburl.replace("https://", "").replace("http://", "");
  }

  const rows = [
    { label: "Exchange",    val: p.exchange || "—" },
    { label: "Industry",    val: p.finnhubIndustry || "—" },
    { label: "Country",     val: p.country || "—" },
    { label: "IPO Date",    val: p.ipo || "—" },
    { label: "Market Cap",  val: p.marketCapitalization ? fmtNum(p.marketCapitalization * 1e6) : "—" },
    { label: "Shares Out",  val: p.shareOutstanding ? fmtNum(p.shareOutstanding * 1e6) : "—" },
  ];

  document.getElementById("compTable").innerHTML = rows.map(r => `
    <div class="comp-row">
      <span class="comp-row-label">${r.label}</span>
      <span class="comp-row-val">${r.val}</span>
    </div>
  `).join("");
}

/* ─────────────────────────────────────────────────────────
   COMPANY NEWS (Dashboard)
───────────────────────────────────────────────────────── */

async function loadCompanyNews(sym) {
  const container = document.getElementById("newsListDash");
  container.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div>Loading news…</div>`;

  try {
    const news = await apiFetch("/company-news", {
      symbol: sym,
      from: today(-7),
      to: today(0),
    });

    if (!news.length) {
      container.innerHTML = `<div class="empty-state">No recent news for ${sym}</div>`;
      return;
    }

    container.innerHTML = news.slice(0, 6).map(n => {
      const date = n.datetime ? new Date(n.datetime * 1000).toLocaleDateString() : "";
      return `
        <a class="news-item" href="${n.url}" target="_blank" rel="noopener">
          ${n.image ? `<img class="news-img" src="${n.image}" alt="" onerror="this.style.display='none'"/>` : ""}
          <div class="news-body">
            <div class="news-headline">${n.headline}</div>
            <div class="news-meta">
              <span class="news-source">${n.source}</span>
              <span>${date}</span>
            </div>
          </div>
        </a>
      `;
    }).join("");
  } catch (err) {
    container.innerHTML = `<div class="empty-state">Failed to load news: ${err.message}</div>`;
  }
}

/* ─────────────────────────────────────────────────────────
   FULL NEWS SECTION
───────────────────────────────────────────────────────── */

let newsSectionLoaded = false;

async function loadNewsSection() {
  if (newsSectionLoaded) return;
  newsSectionLoaded = true;

  const container = document.getElementById("newsGrid");
  container.innerHTML = Array(6).fill(0).map(() => `
    <div class="glass" style="border-radius:12px; overflow:hidden;">
      <div class="skel skel-block" style="height:160px; border-radius:0;"></div>
      <div style="padding:16px; display:flex; flex-direction:column; gap:8px;">
        <div class="skel skel-block" style="height:14px;"></div>
        <div class="skel skel-block" style="height:14px; width:80%;"></div>
        <div class="skel skel-block" style="height:10px; width:50%; margin-top:4px;"></div>
      </div>
    </div>
  `).join("");

  try {
    const news = await apiFetch("/news", { category: "general" });
    if (!news.length) { container.innerHTML = `<div class="empty-state">No news available</div>`; return; }

    container.innerHTML = news.slice(0, 12).map(n => {
      const date = n.datetime ? new Date(n.datetime * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
      return `
        <a class="news-card-full" href="${n.url}" target="_blank" rel="noopener">
          <img class="news-card-img" src="${n.image || ""}" alt=""
            onerror="this.style.background='var(--bg3)'; this.style.display='block'; this.src=''"/>
          <div class="news-card-body">
            <div class="news-card-headline">${n.headline}</div>
            <div class="news-meta">
              <span class="news-source">${n.source}</span>
              <span>${date}</span>
            </div>
          </div>
        </a>
      `;
    }).join("");
  } catch (err) {
    container.innerHTML = `<div class="empty-state">Failed: ${err.message}</div>`;
  }
}

/* ─────────────────────────────────────────────────────────
   CRYPTO SECTION
───────────────────────────────────────────────────────── */

let cryptoSectionLoaded = false;

async function loadCryptoSection() {
  if (cryptoSectionLoaded) return;
  cryptoSectionLoaded = true;

  const CRYPTOS = [
    { id: "btc",  sym: "BINANCE:BTCUSDT",  label: "BTC", priceId: "btcPrice", chgId: "btcChg" },
    { id: "eth",  sym: "BINANCE:ETHUSDT",  label: "ETH", priceId: "ethPrice", chgId: "ethChg" },
    { id: "bnb",  sym: "BINANCE:BNBUSDT",  label: "BNB", priceId: "bnbPrice", chgId: "bnbChg" },
    { id: "sol",  sym: "BINANCE:SOLUSDT",  label: "SOL", priceId: "solPrice", chgId: "solChg" },
  ];

  await Promise.allSettled(CRYPTOS.map(async c => {
    try {
      const q = await apiFetch("/quote", { symbol: c.sym });
      const chg = q.c - q.pc;
      const pct = q.pc ? (chg / q.pc) * 100 : 0;
      const isUp = chg >= 0;

      document.getElementById(c.priceId).textContent = q.c
        ? "$" + q.c.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "—";
      const chgEl = document.getElementById(c.chgId);
      chgEl.textContent = (isUp ? "+" : "") + pct.toFixed(2) + "%";
      chgEl.className = "crypto-chg " + (isUp ? "pos" : "neg");
    } catch {
      document.getElementById(c.priceId).textContent = "N/A";
    }
  }));

  // BTC Chart (7-day hourly)
  try {
    const now  = Math.floor(Date.now() / 1000);
    const from = now - 7 * 86400;
    const data = await apiFetch("/crypto/candle", {
      symbol: "BINANCE:BTCUSDT",
      resolution: "60",
      from, to: now,
    });

    if (data.s === "ok" && data.c?.length) {
      if (cryptoChart) cryptoChart.destroy();
      const ctx = document.getElementById("cryptoChart").getContext("2d");
      const labels = data.t.map(ts => {
        const d = new Date(ts * 1000);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      });
      const grad = ctx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, "rgba(255,171,0,0.25)");
      grad.addColorStop(1, "rgba(255,171,0,0)");

      cryptoChart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: "BTC/USDT",
            data: data.c,
            borderColor: "#ffab00",
            backgroundColor: grad,
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: 800 },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(8,12,24,0.95)",
              borderColor: "#ffab00",
              borderWidth: 1,
              bodyColor: "#ffab00",
              bodyFont: { family: "JetBrains Mono", size: 12 },
              callbacks: { label: c => " $" + c.parsed.y.toFixed(2) }
            }
          },
          scales: {
            x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#445577", font: { family: "JetBrains Mono", size: 10 }, maxTicksLimit: 8 } },
            y: { position: "right", grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#445577", font: { family: "JetBrains Mono", size: 10 }, callback: v => "$" + v.toFixed(0) } }
          }
        }
      });
    }
  } catch { /* crypto chart optional */ }
}

/* ─────────────────────────────────────────────────────────
   FOREX SECTION
───────────────────────────────────────────────────────── */

let forexSectionLoaded = false;

async function loadForexSection() {
  if (forexSectionLoaded) return;
  forexSectionLoaded = true;

  const container = document.getElementById("forexGrid");

  // Show skeletons
  container.innerHTML = FOREX_PAIRS.map(() => `
    <div class="forex-card glass">
      <div class="skel skel-block" style="height:20px; width:120px; margin-bottom:10px;"></div>
      <div class="skel skel-block" style="height:40px; width:160px; margin-bottom:8px;"></div>
      <div class="skel skel-block" style="height:12px; width:80px;"></div>
    </div>
  `).join("");

  try {
    // Fetch USD base rates
    const data = await apiFetch("/forex/rates", { base: "USD" });
    const rates = data.quote || {};

    // Also fetch EUR base for EUR/USD accuracy
    container.innerHTML = FOREX_PAIRS.map(pair => {
      let rate;
      if (pair.from === "USD") {
        rate = rates[pair.to];
      } else if (pair.to === "USD") {
        const r = rates[pair.from];
        rate = r ? (1 / r) : null;
      } else {
        rate = null; // Cross rates — skip
      }

      const rateStr = rate
        ? rate.toFixed(rate > 10 ? 2 : 4)
        : "—";

      return `
        <div class="forex-card glass">
          <div class="forex-pair">${pair.label}</div>
          <div style="font-size:1.1rem; color:var(--txt3); margin-bottom:4px;">${pair.flag}</div>
          <div class="forex-rate">${rateStr}</div>
          <div class="forex-label">Live Rate · USD Base</div>
        </div>
      `;
    }).join("");

  } catch (err) {
    container.innerHTML = `<div class="empty-state">Failed to load forex: ${err.message}</div>`;
  }
}

/* ─────────────────────────────────────────────────────────
   API STATUS SECTION (Admin Only)
───────────────────────────────────────────────────────── */

async function loadApiStatus() {
  const tbody = document.getElementById("apiTableBody");

  // Render all rows as "checking"
  tbody.innerHTML = API_ENDPOINTS.map(ep => `
    <tr id="api-row-${ep.path.replace(/\//g, "-")}">
      <td class="api-endpoint">${ep.label}</td>
      <td style="color:var(--txt3)">—</td>
      <td class="api-latency">…</td>
      <td><span class="badge checking">CHECKING</span></td>
    </tr>
  `).join("");

  // Check each endpoint sequentially (avoid rate limits)
  for (const ep of API_ENDPOINTS) {
    const rowId = "api-row-" + ep.path.replace(/\//g, "-");
    const row   = document.getElementById(rowId);
    if (!row) continue;

    // Small delay between checks
    await new Promise(r => setTimeout(r, 400));

    const result = await apiFetchTimed(ep.path, ep.params || {});
    const now    = new Date().toLocaleTimeString();

    let badgeClass, badgeText;
    if (!result.ok) {
      badgeClass = "error";
      badgeText  = "ERROR";
    } else if (result.ms > 1500) {
      badgeClass = "slow";
      badgeText  = "SLOW";
    } else {
      badgeClass = "online";
      badgeText  = "ONLINE";
    }

    row.cells[1].textContent = now;
    row.cells[2].textContent = result.ms + " ms";
    row.cells[2].className   = "api-latency " + (result.ms > 1500 ? "neg" : result.ms > 800 ? "warn" : "pos");
    row.cells[3].innerHTML   = `<span class="badge ${badgeClass}">${badgeText}</span>`;
  }
}

/* ─────────────────────────────────────────────────────────
   STOCKS SECTION SEARCH
───────────────────────────────────────────────────────── */

async function searchFromStocks() {
  const input = document.getElementById("stocksSearch");
  const sym   = input.value.trim().toUpperCase();
  if (!sym) return;

  const container = document.getElementById("stocksResult");
  container.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div>Searching ${sym}…</div>`;

  try {
    const [q, p, metrics] = await Promise.all([
      apiFetch("/quote", { symbol: sym }),
      apiFetch("/stock/profile2", { symbol: sym }),
      apiFetch("/stock/metric", { symbol: sym, metric: "all" }).catch(() => ({})),
    ]);

    const chg = q.c - q.pc;
    const pct = q.pc ? (chg / q.pc) * 100 : 0;
    const isUp = chg >= 0;
    const m = metrics.metric || {};

    container.innerHTML = `
      <div style="display:flex; gap:20px; flex-wrap:wrap; align-items:flex-start;">
        <div style="flex:1; min-width:260px;">
          <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px;">
            ${p.logo ? `<img src="${p.logo}" style="width:52px;height:52px;border-radius:10px;background:rgba(255,255,255,0.05);padding:4px;border:1px solid var(--border2);object-fit:contain;" onerror="this.style.display='none'"/>` : ""}
            <div>
              <div style="font-family:var(--disp);font-size:1.4rem;letter-spacing:3px;color:var(--acc);font-weight:700;">${p.name || sym}</div>
              <div style="font-family:var(--mono);font-size:11px;color:var(--txt3);margin-top:3px;">${p.exchange || ""} · ${p.finnhubIndustry || ""}</div>
              ${p.weburl ? `<a href="${p.weburl}" target="_blank" style="font-family:var(--mono);font-size:11px;color:var(--acc4, var(--acc));">${p.weburl}</a>` : ""}
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
            ${qCell("PRICE",     fmtPrice(q.c), isUp ? "pos" : "neg")}
            ${qCell("CHANGE",    (isUp?"+":"") + chg.toFixed(2) + " (" + fmtPct(pct) + ")", isUp ? "pos" : "neg")}
            ${qCell("OPEN",      fmtPrice(q.o))}
            ${qCell("HIGH",      fmtPrice(q.h), "pos")}
            ${qCell("LOW",       fmtPrice(q.l), "neg")}
            ${qCell("PREV",      fmtPrice(q.pc))}
            ${qCell("52W HIGH",  q.h52Week ? fmtPrice(q.h52Week) : "—", "pos")}
            ${qCell("52W LOW",   q.l52Week ? fmtPrice(q.l52Week) : "—", "neg")}
          </div>
        </div>

        <div style="flex:1; min-width:260px;">
          <div style="font-family:var(--mono);font-size:9px;letter-spacing:3px;color:var(--txt3);margin-bottom:12px;">FUNDAMENTALS</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${fRow("Market Cap",  p.marketCapitalization ? fmtNum(p.marketCapitalization * 1e6) : "—")}
            ${fRow("P/E Ratio",   m.peBasicExclExtraTTM ? m.peBasicExclExtraTTM.toFixed(2) : "—")}
            ${fRow("EPS (TTM)",   m.epsBasicExclExtraItemsTTM ? "$" + m.epsBasicExclExtraItemsTTM.toFixed(2) : "—")}
            ${fRow("52W Return",  m["52WeekPriceReturnDaily"] ? fmtPct(m["52WeekPriceReturnDaily"]) : "—", m["52WeekPriceReturnDaily"] >= 0 ? "pos" : "neg")}
            ${fRow("Beta",        m.beta ? m.beta.toFixed(2) : "—")}
            ${fRow("Div Yield",   m.currentDividendYieldTTM ? m.currentDividendYieldTTM.toFixed(2) + "%" : "N/A")}
            ${fRow("ROE (TTM)",   m.roeTTM ? m.roeTTM.toFixed(2) + "%" : "—")}
            ${fRow("IPO Date",    p.ipo || "—")}
          </div>
          <button class="btn-glow" style="margin-top:18px; width:100%;" onclick="selectSymbol('${sym}')">
            VIEW FULL DASHBOARD
          </button>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
  }
}

function qCell(label, val, cls = "") {
  return `
    <div class="quote-cell">
      <div class="qc-label">${label}</div>
      <div class="qc-val ${cls}">${val}</div>
    </div>
  `;
}

function fRow(label, val, cls = "") {
  return `
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);">
      <span style="font-family:var(--mono);font-size:10px;letter-spacing:2px;color:var(--txt3);text-transform:uppercase;">${label}</span>
      <span style="font-family:var(--mono);font-size:12px;" class="${cls}">${val}</span>
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────
   CSS ANIMATION INJECTION (shake for login modal)
───────────────────────────────────────────────────────── */

function injectKeyframes() {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
    @keyframes slideUp { from { transform:translateY(20px); opacity:0; } to { transform:translateY(0); opacity:1; } }
    @keyframes shake   {
      0%, 100% { transform: translateX(0); }
      20%      { transform: translateX(-8px); }
      40%      { transform: translateX(8px); }
      60%      { transform: translateX(-5px); }
      80%      { transform: translateX(5px); }
    }
  `;
  document.head.appendChild(style);
}

/* ─────────────────────────────────────────────────────────
   INIT — runs on DOMContentLoaded
───────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
  injectKeyframes();
  initParticles();
  initClock();
  initNav();
  initSearch();
  initChartTabs();
  loadTrending();

  // Enter key for stocks search
  document.getElementById("stocksSearch")?.addEventListener("keydown", e => {
    if (e.key === "Enter") searchFromStocks();
    e.target.value = e.target.value.toUpperCase();
  });

  // Auto-load AAPL as default symbol after trending loads
  setTimeout(() => {
    if (!currentSymbol) {
      loadSymbol("AAPL");
    }
  }, 1200);

  toast("QuantEdge Terminal loaded", "ok");
});
/* ================================================================
   SCRIPT.JS — Alex Morgan Portfolio
   ================================================================ */

'use strict';

/* ---------------------------------------------------------------
   LOADER
   --------------------------------------------------------------- */
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  setTimeout(() => {
    loader.classList.add('hidden');
    document.body.style.overflow = '';
  }, 2000);
});

document.body.style.overflow = 'hidden';

/* ---------------------------------------------------------------
   CUSTOM CURSOR
   --------------------------------------------------------------- */
const cursorDot  = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');

if (window.matchMedia('(hover: hover)').matches) {
  let mouseX = 0, mouseY = 0;
  let ringX  = 0, ringY  = 0;
  const ease = 0.12;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.left  = mouseX + 'px';
    cursorDot.style.top   = mouseY + 'px';
  });

  (function animateRing() {
    ringX += (mouseX - ringX) * ease;
    ringY += (mouseY - ringY) * ease;
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top  = ringY + 'px';
    requestAnimationFrame(animateRing);
  })();

  // Hover effect on interactive elements
  const hoverTargets = 'a, button, .portfolio-card, .service-card, .stat-card, .exp-card, input, textarea, .filter-btn';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(hoverTargets)) {
      cursorRing.classList.add('hovered');
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(hoverTargets)) {
      cursorRing.classList.remove('hovered');
    }
  });
}

/* ---------------------------------------------------------------
   PARTICLE CANVAS
   --------------------------------------------------------------- */
(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles = [];
  const COUNT = 60;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent').trim() || '#00ff88';

  class Particle {
    constructor() { this.reset(true); }
    reset(initial = false) {
      this.x  = Math.random() * W;
      this.y  = initial ? Math.random() * H : H + 10;
      this.r  = Math.random() * 1.5 + 0.3;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = -(Math.random() * 0.5 + 0.1);
      this.alpha = Math.random() * 0.5 + 0.1;
      this.life  = Math.random() * 300 + 200;
      this.age   = initial ? Math.floor(Math.random() * this.life) : 0;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.age++;
      if (this.age > this.life || this.y < -10) this.reset();
    }
    draw() {
      const progress = this.age / this.life;
      const fade = progress < 0.1
        ? progress / 0.1
        : progress > 0.8
          ? 1 - (progress - 0.8) / 0.2
          : 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.globalAlpha = this.alpha * fade;
      ctx.fill();
    }
  }

  for (let i = 0; i < COUNT; i++) particles.push(new Particle());

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  }
  loop();
})();

/* ---------------------------------------------------------------
   NAVBAR — scroll + active link + hamburger
   --------------------------------------------------------------- */
const navbar   = document.getElementById('navbar');
const navLinks = document.getElementById('navLinks');
const hamburger = document.getElementById('hamburger');
const allNavLinks = document.querySelectorAll('.nav-link');

// Scroll effects
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
  document.getElementById('scrollTop')
    .classList.toggle('visible', window.scrollY > 400);
  updateActiveLink();
}, { passive: true });

// Hamburger
hamburger.addEventListener('click', () => {
  const open = hamburger.classList.toggle('open');
  navLinks.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', open);
});

// Close menu on link click
allNavLinks.forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// Active link on scroll
function updateActiveLink() {
  const sections = document.querySelectorAll('section[id]');
  let current = '';
  sections.forEach(sec => {
    const top = sec.offsetTop - 100;
    if (window.scrollY >= top) current = sec.getAttribute('id');
  });
  allNavLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}

/* ---------------------------------------------------------------
   THEME TOGGLE
   --------------------------------------------------------------- */
const themeToggle = document.getElementById('themeToggle');
const themeIcon   = document.getElementById('themeIcon');
const html        = document.documentElement;

// Load saved preference
const savedTheme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
});

function updateThemeIcon(theme) {
  themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

/* ---------------------------------------------------------------
   TYPING EFFECT
   --------------------------------------------------------------- */
(function initTyping() {
  const el = document.querySelector('.typing-text');
  if (!el) return;

  let words, wordIdx = 0, charIdx = 0, isDeleting = false;

  try {
    words = JSON.parse(el.dataset.words);
  } catch {
    words = ['Developer'];
  }

  function type() {
    const word    = words[wordIdx];
    const current = isDeleting
      ? word.slice(0, charIdx--)
      : word.slice(0, charIdx++);

    el.textContent = current;

    let delay = isDeleting ? 60 : 100;

    if (!isDeleting && charIdx > word.length) {
      isDeleting = true;
      delay = 1800;
    } else if (isDeleting && charIdx < 0) {
      isDeleting = false;
      charIdx    = 0;
      wordIdx    = (wordIdx + 1) % words.length;
      delay      = 400;
    }

    setTimeout(type, delay);
  }

  type();
})();

/* ---------------------------------------------------------------
   SCROLL REVEAL
   --------------------------------------------------------------- */
(function initReveal() {
  const elements = document.querySelectorAll('[data-reveal]');

  const observer = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger delay based on siblings
        const siblings = Array.from(entry.target.parentElement?.children || []);
        const idx = siblings.filter(s => s.hasAttribute('data-reveal')).indexOf(entry.target);
        entry.target.style.transitionDelay = `${Math.min(idx, 5) * 80}ms`;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  elements.forEach(el => observer.observe(el));
})();

/* ---------------------------------------------------------------
   COUNTER ANIMATION
   --------------------------------------------------------------- */
(function initCounters() {
  const counters = document.querySelectorAll('.stat-num[data-count]');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = +el.dataset.count;
      const dur    = 1600;
      const step   = 16;
      const steps  = dur / step;
      let current  = 0;

      const timer = setInterval(() => {
        current += target / steps;
        if (current >= target) {
          el.textContent = target;
          clearInterval(timer);
        } else {
          el.textContent = Math.floor(current);
        }
      }, step);

      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
})();

/* ---------------------------------------------------------------
   SKILL BAR ANIMATION
   --------------------------------------------------------------- */
(function initSkillBars() {
  const fills = document.querySelectorAll('.skill-fill[data-width]');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const fill = entry.target;
      // Delay slightly for visual delight
      setTimeout(() => {
        fill.style.width = fill.dataset.width + '%';
      }, 200);
      observer.unobserve(fill);
    });
  }, { threshold: 0.3 });

  fills.forEach(f => observer.observe(f));
})();

/* ---------------------------------------------------------------
   PORTFOLIO FILTER
   --------------------------------------------------------------- */
(function initPortfolioFilter() {
  const btns  = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.portfolio-card');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;

      cards.forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        if (match) {
          card.classList.remove('hidden');
          card.style.animation = 'fadeIn 0.4s ease forwards';
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });
})();

/* ---------------------------------------------------------------
   CONTACT FORM (Wired up to Formspree)
   --------------------------------------------------------------- */
(function initContactForm() {
  const form        = document.getElementById('contactForm');
  const nameInput   = document.getElementById('name');
  const emailInput  = document.getElementById('email');
  const msgInput    = document.getElementById('message');
  const nameError   = document.getElementById('nameError');
  const emailError  = document.getElementById('emailError');
  const msgError    = document.getElementById('messageError');
  const successMsg  = document.getElementById('formSuccess');

  if (!form) return;

  function showError(el, msg) { el.textContent = msg; }
  function clearError(el)     { el.textContent = ''; }

  function validateEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  // Live validation
  nameInput.addEventListener('input',  () => nameInput.value.trim()             ? clearError(nameError)  : showError(nameError,  'Name is required.'));
  emailInput.addEventListener('input', () => validateEmail(emailInput.value)    ? clearError(emailError) : showError(emailError, 'Enter a valid email.'));
  msgInput.addEventListener('input',   () => msgInput.value.trim().length >= 10 ? clearError(msgError)   : showError(msgError,   'Message must be at least 10 characters.'));

  form.addEventListener('submit', e => {
    e.preventDefault();
    let valid = true;

    if (!nameInput.value.trim()) {
      showError(nameError, 'Name is required.');
      valid = false;
    } else {
      clearError(nameError);
    }

    if (!validateEmail(emailInput.value)) {
      showError(emailError, 'Enter a valid email address.');
      valid = false;
    } else {
      clearError(emailError);
    }

    if (msgInput.value.trim().length < 10) {
      showError(msgError, 'Message must be at least 10 characters.');
      valid = false;
    } else {
      clearError(msgError);
    }

    if (!valid) return;

    // UI Loading State
    const btn = form.querySelector('button[type="submit"]');
    const btnSpan = btn.querySelector('span');
    btn.disabled = true;
    btnSpan.textContent = 'Sending…';

    // Package the form input fields
    const formData = new FormData(form);

    // Send data to Formspree via AJAX Fetch API
    fetch(form.action, {
      method: form.method,
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(response => {
      if (response.ok) {
        // Success Handling
        form.reset();
        successMsg.classList.add('show');
        setTimeout(() => successMsg.classList.remove('show'), 4000);
      } else {
        // Handle response failures (e.g., Formspree field layout rules broken)
        response.json().then(data => {
          if (Object.hasOwn(data, 'errors')) {
            alert(data['errors'].map(error => error['message']).join(", "));
          } else {
            alert("Oops! There was a problem submitting your form.");
          }
        });
      }
    })
    .catch(error => {
      // Handle physical network/connection dropouts
      alert("Oops! There was a network problem submitting your form. Check your connection.");
    })
    .finally(() => {
      // Re-enable submission controls regardless of result
      btn.disabled = false;
      btnSpan.textContent = 'Send Message';
    });
  });
})();

/* ---------------------------------------------------------------
   SCROLL TO TOP
   --------------------------------------------------------------- */
document.getElementById('scrollTop').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ---------------------------------------------------------------
   FOOTER YEAR
   --------------------------------------------------------------- */
const yearEl = document.getElementById('footerYear');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------------------------------------------------------------
   SMOOTH ANCHOR SCROLL (for browsers that need help)
   --------------------------------------------------------------- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY
              - parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'));
    window.scrollTo({ top, behavior: 'smooth' });
  });
});
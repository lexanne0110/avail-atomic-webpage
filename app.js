/* Avail Atomic — page interactions */
(function () {
  'use strict';

  /* ---- Mobile menu ---- */
  var toggle = document.querySelector('.nav-menu');
  var menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      menu.hidden = open;
      document.body.classList.toggle('menu-open', !open);
    });
  }

  /* ---- How It Works: timed auto-advance + click (no scroll) ---- */
  var steps = Array.prototype.slice.call(document.querySelectorAll('.hiw__step'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.hiw__panel'));
  var fills = steps.map(function (s) { return s.querySelector('.hiw__fill'); });
  var STEP_MS = 4000; // time held on each step before auto-advancing

  if (steps.length) {
    var current = 0, elapsed = 0, lastTs = 0, paused = false;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function render() {
      steps.forEach(function (s, k) {
        var on = k === current;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach(function (p) {
        p.classList.toggle('is-active', +p.getAttribute('data-panel') === current);
      });
      fills.forEach(function (f, k) {
        if (f) f.style.height = (k === current ? Math.min(100, elapsed / STEP_MS * 100) : 0) + '%';
      });
    }

    function goTo(i) { current = i; elapsed = 0; render(); }

    function tick(ts) {
      if (!lastTs) lastTs = ts;
      var dt = ts - lastTs; lastTs = ts;
      if (!paused) {
        elapsed += dt;
        var f = fills[current];
        if (f) f.style.height = Math.min(100, elapsed / STEP_MS * 100) + '%';
        if (elapsed >= STEP_MS) goTo((current + 1) % steps.length);
      }
      requestAnimationFrame(tick);
    }

    goTo(0);

    steps.forEach(function (s, i) {
      s.addEventListener('click', function () { goTo(i); });
      s.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(i); }
      });
    });

    /* pause the timer while the visitor is reading/hovering the section */
    var grid = document.querySelector('.hiw__grid');
    if (grid) {
      grid.addEventListener('mouseenter', function () { paused = true; });
      grid.addEventListener('mouseleave', function () { paused = false; });
      grid.addEventListener('focusin', function () { paused = true; });
      grid.addEventListener('focusout', function () { paused = false; });
    }

    if (!reduceMotion) requestAnimationFrame(tick);
  }

  /* ---- Atomic swap hero animation: cycle through the 7 Figma states ---- */
  var anim = document.querySelector('.atomic-anim');
  if (anim) {
    var DURATIONS = [1600, 1300, 1300, 900, 900, 1800, 1400]; // ms held on state 1..7
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var step = 1; // HTML starts at data-state="1"
    var timer = null;
    var visible = true;

    function advance() {
      step = (step % DURATIONS.length) + 1;
      anim.setAttribute('data-state', String(step));
      if (step === 2) {
        anim.querySelectorAll('.atomic-anim__fan-line').forEach(function (line) {
          line.style.animation = 'none';
          void line.offsetWidth;
          line.style.removeProperty('animation');
        });
      }
      timer = window.setTimeout(advance, DURATIONS[step - 1]);
    }

    function start() {
      if (timer || reduceMotion || !visible) return;
      timer = window.setTimeout(advance, DURATIONS[step - 1]);
    }

    function stop() {
      if (timer) { window.clearTimeout(timer); timer = null; }
    }

    if (!reduceMotion) {
      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          if (visible) { start(); } else { stop(); }
        }, { threshold: 0.1 });
        observer.observe(anim);
      } else {
        start();
      }
    }
  }
})();

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

  /* ---- How It Works: active step on scroll AND on click ---- */
  var steps = Array.prototype.slice.call(document.querySelectorAll('.hiw__step'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.hiw__panel'));

  function setActive(i) {
    steps.forEach(function (s) { s.classList.toggle('is-active', +s.getAttribute('data-step') === i); });
    panels.forEach(function (p) { p.classList.toggle('is-active', +p.getAttribute('data-panel') === i); });
  }

  if (steps.length) {
    var current = -1;

    /* scroll sync — activate the step whose centre is nearest the viewport centre.
       Smoother than an IntersectionObserver band (no abrupt mid-scroll jumps). */
    function syncActive() {
      var mid = window.innerHeight / 2;
      var best = 0, bestDist = Infinity;
      for (var i = 0; i < steps.length; i++) {
        var r = steps[i].getBoundingClientRect();
        var d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) { bestDist = d; best = +steps[i].getAttribute('data-step'); }
      }
      if (best !== current) { current = best; setActive(best); }
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () { syncActive(); ticking = false; });
      }
    }, { passive: true });
    window.addEventListener('resize', syncActive, { passive: true });
    syncActive();

    /* click sync */
    steps.forEach(function (s) {
      s.addEventListener('click', function () {
        setActive(+s.getAttribute('data-step'));
        s.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
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

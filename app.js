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
    /* scroll sync */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) setActive(+e.target.getAttribute('data-step'));
        });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      steps.forEach(function (s) { io.observe(s); });
    }

    /* click sync */
    steps.forEach(function (s) {
      s.addEventListener('click', function () {
        var i = +s.getAttribute('data-step');
        setActive(i);
        s.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }
})();

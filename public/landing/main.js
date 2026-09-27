(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function format(value, decimals) {
    return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  }

  function runCount(el, index) {
    var target = parseFloat(el.getAttribute('data-count') || '0');
    var suffix = el.getAttribute('data-suffix') || '';
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var duration = 1500 + index * 80;
    var start = performance.now();

    if (REDUCED) {
      el.textContent = format(target, decimals) + suffix;
      return;
    }

    function tick(now) {
      var t = Math.min(1, (now - start) / duration);
      el.textContent = format(target * easeOutCubic(t), decimals) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function initStats() {
    var values = Array.prototype.slice.call(
      document.querySelectorAll('.metric-value[data-count]')
    );
    if (!values.length) return;

    var fired = false;

    function fireAll() {
      if (fired) return;
      fired = true;
      values.forEach(function (el, i) {
        setTimeout(function () {
          runCount(el, i);
        }, 120 + i * 90);
      });
    }

    if (!('IntersectionObserver' in window)) {
      fireAll();
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            fireAll();
            io.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    values.forEach(function (el) {
      io.observe(el);
    });
  }

  function initReveal() {
    var blocks = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!blocks.length) return;

    if (REDUCED || !('IntersectionObserver' in window)) {
      blocks.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    blocks.forEach(function (el) {
      io.observe(el);
    });
  }

  function initMenu() {
    var burger = document.querySelector('.burger');
    var overlay = document.getElementById('mobile-menu');
    if (!burger || !overlay) return;

    function setOpen(open) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('menu-open', open);
      overlay.hidden = !open;
    }

    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) setOpen(false);
    });

    overlay.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        burger.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 720 && burger.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
      }
    });

    setOpen(false);
  }

  function initVideo() {
    var video = document.querySelector('.bg-video');
    if (!video) return;

    function tryPlay() {
      var promise = video.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(function () {});
      }
    }

    video.addEventListener('loadeddata', tryPlay);
    tryPlay();
  }

  function boot() {
    initStats();
    initReveal();
    initMenu();
    initVideo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

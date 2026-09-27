(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var ScrollToPlugin = window.ScrollToPlugin;
  var Lenis = window.Lenis;

  var lenis = null;

  function format(value, decimals) {
    return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  }

  function initSmoothScroll() {
    if (REDUCED || !Lenis || !gsap || !ScrollTrigger) return null;

    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    document.querySelectorAll('.js-scroll').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (!href || href.charAt(0) !== '#') return;
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -72, duration: 1.1 });
      });
    });

    return lenis;
  }

  function initHero() {
    if (!gsap || REDUCED) return;

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.js-hero-item', {
      y: 24,
      opacity: 0,
      duration: 0.65,
      stagger: 0.08,
    })
      .from(
        '.js-hero-line',
        {
          y: 28,
          opacity: 0,
          duration: 0.7,
          stagger: 0.1,
        },
        '-=0.45'
      )
      .from(
        '.js-hero-fact',
        {
          y: 16,
          opacity: 0,
          duration: 0.5,
          stagger: 0.07,
        },
        '-=0.35'
      );

    gsap.from('.header', {
      y: -20,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
    });
  }

  function initMarquee() {
    if (!gsap || REDUCED) return;

    var track = document.querySelector('.scope-track');
    if (!track) return;

    gsap.to(track, {
      xPercent: -50,
      ease: 'none',
      duration: 35,
      repeat: -1,
    });
  }

  function initScrollAnimations() {
    if (!gsap || !ScrollTrigger || REDUCED) return;

    gsap.utils.toArray('.js-section').forEach(function (section) {
      gsap.from(section.querySelectorAll('.label, .title, .lede'), {
        scrollTrigger: {
          trigger: section,
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
        y: 20,
        opacity: 0,
        duration: 0.55,
        stagger: 0.07,
        ease: 'power2.out',
      });
    });

    gsap.utils.toArray('.js-stagger').forEach(function (el) {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
        x: -12,
        opacity: 0,
        duration: 0.45,
        ease: 'power2.out',
      });
    });

    gsap.utils.toArray('.js-step').forEach(function (step, i) {
      gsap.from(step, {
        scrollTrigger: {
          trigger: step,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
        y: 24,
        opacity: 0,
        duration: 0.5,
        delay: i * 0.06,
        ease: 'power2.out',
      });

      gsap.from(step.querySelector('.step-dot'), {
        scrollTrigger: {
          trigger: step,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
        scale: 0,
        duration: 0.4,
        delay: i * 0.06,
        ease: 'back.out(2)',
      });
    });

    gsap.utils.toArray('.js-slide-left').forEach(function (el) {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        x: -40,
        opacity: 0,
        duration: 0.65,
        ease: 'power2.out',
      });
    });

    gsap.utils.toArray('.js-slide-right').forEach(function (el) {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        x: 40,
        opacity: 0,
        duration: 0.65,
        ease: 'power2.out',
      });
    });

    gsap.utils.toArray('.js-engine-row').forEach(function (row, i) {
      gsap.from(row, {
        scrollTrigger: {
          trigger: row,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
        x: -30,
        opacity: 0,
        duration: 0.5,
        delay: i * 0.05,
        ease: 'power2.out',
      });
    });

    gsap.utils.toArray('.js-usp').forEach(function (item, i) {
      gsap.from(item, {
        scrollTrigger: {
          trigger: item,
          start: 'top 92%',
          toggleActions: 'play none none none',
        },
        y: 18,
        opacity: 0,
        duration: 0.45,
        delay: i * 0.04,
        ease: 'power2.out',
      });
    });

    gsap.utils.toArray('.js-chip').forEach(function (chip, i) {
      gsap.from(chip, {
        scrollTrigger: {
          trigger: chip,
          start: 'top 94%',
          toggleActions: 'play none none none',
        },
        scale: 0.85,
        opacity: 0,
        duration: 0.4,
        delay: (i % 6) * 0.04,
        ease: 'back.out(1.6)',
      });
    });
  }

  function initMetrics() {
    if (!gsap || !ScrollTrigger) return;

    document.querySelectorAll('.js-metric .stat-num[data-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count') || '0');
      var suffix = el.getAttribute('data-suffix') || '';
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var counter = { val: 0 };

      if (REDUCED) {
        el.textContent = format(target, decimals) + suffix;
        return;
      }

      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          gsap.to(counter, {
            val: target,
            duration: 1.4,
            ease: 'power2.out',
            onUpdate: function () {
              el.textContent = format(counter.val, decimals) + suffix;
            },
          });
        },
      });
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
      if (open && lenis) lenis.stop();
      if (!open && lenis) lenis.start();
    }

    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) setOpen(false);
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
    var video = document.querySelector('.hero-video');
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
    initSmoothScroll();
    initHero();
    initMarquee();
    initScrollAnimations();
    initMetrics();
    initMenu();
    initVideo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

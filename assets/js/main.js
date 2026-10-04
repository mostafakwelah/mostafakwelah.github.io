/* Mostafa Kwelah — portfolio interactions */
(function () {
  'use strict';

  var doc = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) body.classList.add('no-motion');

  /* ---------- Settings you can tweak ---------- */
  var SHOWREEL_VIMEO_ID = '';      // e.g. '123456789' — when set, "Watch the reel" opens the video in a lightbox
  var BLUR_MAX = 14;               // max blur in px while scrolling fast
  var BLUR_SENSITIVITY = 5.5;      // how quickly blur builds with scroll speed
  var SKEW_MAX = 3;                // max lean in degrees

  /* ---------- Nav: border on scroll + mobile menu ---------- */
  var nav = document.querySelector('.nav');
  var menuBtn = document.querySelector('.menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = body.classList.toggle('menu-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    document.querySelectorAll('.mobile-menu a').forEach(function (a) {
      a.addEventListener('click', function () {
        body.classList.remove('menu-open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Hero slider ---------- */
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('.dots button'));
  var current = 0, timer = null;
  var CLIP_SECONDS = 10;           // how long each hero clip plays before cutting to the next
  function show(i) {
    if (!slides.length) return;
    current = (i + slides.length) % slides.length;
    slides.forEach(function (s, k) {
      var on = k === current;
      s.classList.toggle('is-active', on);
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
      var v = s.querySelector('video');
      if (!v) return;
      if (on) {
        v.preload = 'auto';
        try { v.currentTime = 0; } catch (e) {}
        if (!reduceMotion) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      } else {
        v.pause();
      }
    });
    // warm up the next clip so the cut is instant
    var nextSlide = slides[(current + 1) % slides.length];
    var nv = nextSlide && nextSlide.querySelector('video');
    if (nv && nv.preload !== 'auto') nv.preload = 'auto';
    dots.forEach(function (d, k) { d.setAttribute('aria-current', k === current ? 'true' : 'false'); });
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (reduceMotion || slides.length < 2) return;
    var v = slides[current].querySelector('video');
    var secs = v ? CLIP_SECONDS : 6.5;
    if (v && v.duration && isFinite(v.duration)) secs = Math.min(CLIP_SECONDS, v.duration);
    timer = setTimeout(function () { show(current + 1); }, secs * 1000);
  }
  slides.forEach(function (s, k) {
    var v = s.querySelector('video');
    if (v) v.addEventListener('ended', function () { if (k === current && slides.length > 1) show(current + 1); });
  });
  if (slides.length) {
    var prev = document.querySelector('.hero .prev');
    var next = document.querySelector('.hero .next');
    if (prev) prev.addEventListener('click', function () { show(current - 1); });
    if (next) next.addEventListener('click', function () { show(current + 1); });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { show(k); }); });
    show(0);
  }

  /* ---------- Showreel lightbox (Vimeo) ---------- */
  var lightbox = document.querySelector('.lightbox');
  function openVideo(id, src) {
    if (!lightbox || !id) return false;
    src = src || ('https://player.vimeo.com/video/' + id + '?autoplay=1&title=0&byline=0&portrait=0&dnt=1');
    lightbox.querySelector('.lightbox__frame').innerHTML =
      '<iframe src="' + src + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video player"></iframe>';
    lightbox.classList.add('is-open');
    lightbox.querySelector('.round-btn').focus();
    return true;
  }
  document.querySelectorAll('[data-reel]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (SHOWREEL_VIMEO_ID && openVideo(SHOWREEL_VIMEO_ID)) e.preventDefault(); // else falls back to the Vimeo profile link
    });
  });
  document.querySelectorAll('[data-youtube]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey) return;
      var id = el.getAttribute('data-youtube'), start = el.getAttribute('data-start') || 0;
      if (openVideo(id, 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&start=' + start + '&rel=0')) e.preventDefault();
    });
  });
  document.querySelectorAll('[data-vimeo]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey) return; // let people open Vimeo in a new tab if they want
      if (openVideo(el.getAttribute('data-vimeo'))) e.preventDefault();
    });
  });
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.querySelector('.lightbox__frame').innerHTML = '';
  }
  if (lightbox) {
    lightbox.querySelector('.round-btn').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.remove('is-pending'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) {
      // only hide what is below the first screen, so the page is complete at rest
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('is-pending'); io.observe(el); }
    });
  }

  /* ---------- Scroll / swipe blur ---------- */
  var lastY = window.scrollY, lastT = performance.now();
  var blur = 0, skew = 0, targetBlur = 0, targetSkew = 0, idleAt = 0, running = false;
  function onScroll() {
    var y = window.scrollY, t = performance.now();
    var dt = Math.max(8, t - lastT);
    var v = (y - lastY) / dt;              // px per ms
    lastY = y; lastT = t;
    if (nav) nav.classList.toggle('is-scrolled', y > 8);
    if (reduceMotion) return;
    targetBlur = Math.min(BLUR_MAX, Math.abs(v) * BLUR_SENSITIVITY);
    targetSkew = Math.max(-SKEW_MAX, Math.min(SKEW_MAX, v * 1.2));
    idleAt = t + 110;
    if (!running) { running = true; body.classList.add('is-moving'); requestAnimationFrame(tick); }
  }
  function tick(t) {
    if (t > idleAt) { targetBlur = 0; targetSkew = 0; }
    blur += (targetBlur - blur) * 0.22;
    skew += (targetSkew - skew) * 0.18;
    doc.style.setProperty('--blur', blur.toFixed(2) + 'px');
    doc.style.setProperty('--skew', skew.toFixed(3) + 'deg');
    if (Math.abs(blur) < 0.05 && Math.abs(skew) < 0.01 && t > idleAt) {
      doc.style.setProperty('--blur', '0px');
      doc.style.setProperty('--skew', '0deg');
      body.classList.remove('is-moving');
      running = false;
      return;
    }
    requestAnimationFrame(tick);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Work filter ---------- */
  var filterBtns = document.querySelectorAll('.filters button');
  var cards = document.querySelectorAll('.card');
  var countEl = document.querySelector('[data-count]');
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-filter');
      filterBtns.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      var n = 0;
      cards.forEach(function (c) {
        var on = f === 'all' || c.getAttribute('data-cat') === f;
        c.hidden = !on;
        if (on) { n++; c.classList.remove('is-pending'); }
      });
      if (countEl) countEl.textContent = n;
    });
  });
})();

(function () {
  'use strict';
  var root = document.documentElement;
  var header = document.querySelector('.top');
  var index = document.querySelector('.page-index');
  var toggle = index && index.querySelector('.page-index-toggle');
  var current = index && index.querySelector('.page-index-current');
  var links = index ? Array.from(index.querySelectorAll('.page-index-links a')) : [];
  var sections = links.map(function (a) { return document.getElementById(a.hash.slice(1)); });
  var compact = window.matchMedia('(max-width: 980px)');
  var frame = 0;

  function closeIndex(returnFocus) {
    if (!index) return;
    index.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) toggle.focus();
  }

  function measure() {
    frame = 0;
    var h = header && getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height : 0;
    var n = index && getComputedStyle(index).position === 'sticky' ? index.getBoundingClientRect().height : 0;
    root.style.setProperty('--header-height', h + 'px');
    root.style.setProperty('--index-height', n + 'px');
    if (!index) return;
    var active = -1;
    sections.forEach(function (s, i) {
      if (s && s.getBoundingClientRect().top <= h + n + 40) active = i;
    });
    links.forEach(function (a, i) {
      if (i === active) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    var label = active < 0 ? 'Выбрать раздел' : links[active].textContent.trim();
    if (current.textContent !== label) current.textContent = label;
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(measure); }

  if (index) {
    toggle.hidden = false;
    index.classList.add('is-ready');
    toggle.addEventListener('click', function () {
      var open = !index.classList.contains('is-open');
      index.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || !sections[i]) return;
        e.preventDefault();
        closeIndex(false);
        current.textContent = a.textContent.trim();
        root.style.setProperty('--index-height', (getComputedStyle(index).position === 'sticky' ? index.getBoundingClientRect().height : 0) + 'px');
        if (!sections[i].hasAttribute('tabindex')) sections[i].setAttribute('tabindex', '-1');
        if (location.hash !== a.hash) history.pushState(null, '', a.hash);
        sections[i].focus({ preventScroll: true });
        sections[i].scrollIntoView({ block: 'start', behavior: 'instant' });
        schedule();
      });
    });
    document.addEventListener('click', function (e) { if (!index.contains(e.target)) closeIndex(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && index.classList.contains('is-open')) { closeIndex(true); e.preventDefault(); }
    });
    index.addEventListener('focusout', function () {
      requestAnimationFrame(function () { if (!index.contains(document.activeElement)) closeIndex(false); });
    });
    if (compact.addEventListener) compact.addEventListener('change', function () { closeIndex(false); schedule(); });
  }

  if ('ResizeObserver' in window) {
    var observer = new ResizeObserver(schedule);
    if (header) observer.observe(header);
    if (index) observer.observe(index);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('load', schedule);
  document.addEventListener('focusin', function (e) {
    if ((header && header.contains(e.target)) || (index && index.contains(e.target))) return;
    if (!e.target.matches('a, button, input, textarea, select, summary, .form-err')) return;
    var edge = parseFloat(root.style.getPropertyValue('--header-height')) + parseFloat(root.style.getPropertyValue('--index-height')) + 12;
    if (e.target.getBoundingClientRect().top < edge) e.target.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  measure();
}());

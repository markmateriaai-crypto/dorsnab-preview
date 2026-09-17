(function () {
  'use strict';
  var stages = document.querySelectorAll('[data-relief]');
  if (!stages.length || !window.matchMedia) return;
  var motion = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  var resets = [];
  stages.forEach(function (stage) {
    var frame = 0;
    var x = 0;
    var y = 0;
    function reset() {
      if (!frame && !stage.classList.contains('is-interacting')) return;
      cancelAnimationFrame(frame);
      frame = 0;
      stage.classList.remove('is-interacting');
      stage.style.removeProperty('--relief-x');
      stage.style.removeProperty('--relief-y');
    }
    resets.push(reset);
    stage.addEventListener('pointermove', function (event) {
      if (!motion.matches || event.pointerType !== 'mouse' || document.documentElement.dataset.reliefPreview === 'off') return;
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        var box = stage.getBoundingClientRect();
        if (!box.width || !box.height) return;
        var dx = Math.max(-1, Math.min(1, (x - box.left) / box.width * 2 - 1));
        var dy = Math.max(-1, Math.min(1, (y - box.top) / box.height * 2 - 1));
        stage.classList.add('is-interacting');
        stage.style.setProperty('--relief-x', (-dy * 2.4).toFixed(2) + 'deg');
        stage.style.setProperty('--relief-y', (dx * 2.4).toFixed(2) + 'deg');
      });
    }, { passive: true });
    stage.addEventListener('pointerleave', reset);
    stage.addEventListener('pointercancel', reset);
  });
  function resetAll() { resets.forEach(function (reset) { reset(); }); }
  if (motion.addEventListener) motion.addEventListener('change', resetAll);
  document.addEventListener('relief:reset', resetAll);
  document.addEventListener('visibilitychange', function () { if (document.hidden) resetAll(); });
  window.addEventListener('blur', resetAll);
  window.addEventListener('scroll', resetAll, { passive: true });
})();

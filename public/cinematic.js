/* Native scrolling and progressive enhancement. No API calls or scroll interception. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const short = matchMedia('(max-height: 700px)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const story = document.querySelector('.command-story');
  const journey = document.querySelector('.story-journey');
  const feature = document.querySelector('.story-feature-story');
  const demos = [...document.querySelectorAll('.story-demo')];
  const buttons = [...document.querySelectorAll('.story-step-button')];
  const cores = new Map();
  let frame = 0, observer, stopped = false, modulePromise, generation = 0;
  const clamp = value => Math.max(0, Math.min(1, value));
  const staticLayout = () => reduced.matches || mobile.matches || short.matches;
  function selectStep(step) {
    if (!feature) return;
    feature.dataset.step = String(step);
    demos.forEach((demo, index) => {
      demo.classList.toggle('is-current', index === step);
      demo.setAttribute('aria-hidden', String(!staticLayout() && index !== step));
    });
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === step)));
  }
  function update() {
    frame = 0;
    if (stopped || document.hidden) return;
    const pageProgress=clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight));
    document.documentElement.style.setProperty('--page-scroll',pageProgress.toFixed(4));
    for(const [host,core] of cores)if(host.classList.contains('route-core') || host.classList.contains('dashboard-core'))core?.setProgress(pageProgress);
    if (!story || story.closest('[hidden]')) return;
    const bounds = journey.getBoundingClientRect();
    const progress = staticLayout() ? 0 : clamp((90 - bounds.top) / Math.max(1, bounds.height - innerHeight * .7));
    story.style.setProperty('--story-progress', progress.toFixed(4));
    story.dataset.progress = progress.toFixed(4);
    for (const [host, core] of cores) if (host.closest('.story-world')) core?.setProgress(progress);
    if (!staticLayout()) {
      const rect = feature.getBoundingClientRect();
      const amount = clamp((innerHeight * .08 - rect.top) / Math.max(1, rect.height - innerHeight * .8));
      selectStep(Math.min(2, Math.floor(amount * 3)));
    } else selectStep(0);
  }
  function schedule() { if (!frame && !stopped && !document.hidden) frame = requestAnimationFrame(update); }
  async function loadCore(host) {
    if (stopped || reduced.matches || cores.has(host)) return;
    const mountingGeneration = generation;
    cores.set(host, null);
    try {
      // Resolve beside this script so GitHub Pages and the Pi share the same module.
      const moduleUrl = new URL('command-core.js', scriptUrl);
      moduleUrl.search = new URL(scriptUrl).search;
      modulePromise ||= import(moduleUrl.href);
      const { mountCore } = await modulePromise;
      if (mountingGeneration !== generation) return;
      if (stopped || reduced.matches || !host.isConnected) { cores.delete(host); return; }
      cores.set(host, mountCore(host));
    } catch { if (mountingGeneration === generation) cores.delete(host); /* Keep the fallback. */ }
  }
  const scriptUrl = document.currentScript.src;
  function observeCores() {
    observer?.disconnect();
    if (reduced.matches || stopped) return;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) { observer.unobserve(entry.target); void loadCore(entry.target); }
      }, { rootMargin: '80px', threshold: 0 });
      document.querySelectorAll('.command-core').forEach(host => observer.observe(host));
    } // Unsupported devices retain the static illustration.
  }
  function preferenceChanged() {
    generation++;
    for (const core of cores.values()) core?.destroy();
    cores.clear(); observeCores(); schedule();
  }
  function onPointer(event) {
    if (reduced.matches || !fine.matches || mobile.matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--tilt-x', `${((event.clientY - rect.top) / rect.height - .5) * -3}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${((event.clientX - rect.left) / rect.width - .5) * 3}deg`);
  }
  function resetPointer(event) {
    event.currentTarget.style.removeProperty('--tilt-x'); event.currentTarget.style.removeProperty('--tilt-y');
  }
  if (story) {
    story.classList.add('story-enhanced');
    try {
      if (!sessionStorage.getItem('dexzu.story.seen.v1')) {
        story.classList.add('story-first-visit'); sessionStorage.setItem('dexzu.story.seen.v1', '1');
      }
    } catch { /* Content remains visible when storage is unavailable. */ }
    buttons.forEach((button, index) => button.addEventListener('click', () => {
      if(staticLayout()){selectStep(index);return;}
      const distance=Math.max(1,feature.offsetHeight-innerHeight*.8);
      const top=scrollY+feature.getBoundingClientRect().top-innerHeight*.08+(index+.15)/3*distance;
      window.scrollTo({top,behavior:'smooth'});
    }));
    demos.forEach(demo => { demo.addEventListener('pointermove', onPointer); demo.addEventListener('pointerleave', resetPointer); });
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('dexzu-page',schedule);
  window.addEventListener('dexzu-data-ready',schedule);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', preferenceChanged);
  short.addEventListener('change', schedule);
  mobile.addEventListener('change', () => { demos.forEach(demo => { demo.style.removeProperty('--tilt-x'); demo.style.removeProperty('--tilt-y'); }); schedule(); });
  window.addEventListener('pageshow', () => { stopped = false; observeCores(); schedule(); });
  window.addEventListener('pagehide', () => {
    generation++;
    stopped = true; cancelAnimationFrame(frame); frame = 0; observer?.disconnect();
    for (const core of cores.values()) core?.destroy();
    cores.clear();
  });
  observeCores(); schedule();
})();

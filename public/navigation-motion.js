/* Register before first paint. A skipped cross-document transition is normal
   when navigating to a page without an opt-in or when a document reloads. */
(() => {
  const onTransition = event => {
    const transition = event.viewTransition;
    if (!transition) return;
    transition.ready.catch(() => { /* Navigation itself still completes. */ });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) transition.skipTransition();
  };
  window.addEventListener('pageswap', onTransition);
  window.addEventListener('pagereveal', onTransition);
})();

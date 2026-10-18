/* Register before first paint. A skipped cross-document transition is normal
   when navigating to a page without an opt-in or when a document reloads. */
(() => {
  const onTransition = event => {
    const transition = event.viewTransition;
    if (!transition) return;
    transition.ready.catch(() => { /* Navigation itself still completes. */ });
    let serverSwitch = true;
    if (event.type === 'pageswap') {
      const next = event.activation?.entry?.url;
      const target = next ? new URL(next) : null;
      serverSwitch = target?.origin === location.origin && target.pathname === location.pathname
        && (target.searchParams.get('workspace') || 'main') !== (new URL(location.href).searchParams.get('workspace') || 'main');
    }
    // Only retain a shell for a server switch. Authentication reloads must show
    // their new state directly, without retaining a prior server snapshot.
    if (!serverSwitch || matchMedia('(prefers-reduced-motion: reduce)').matches) transition.skipTransition();
  };
  window.addEventListener('pageswap', onTransition);
  window.addEventListener('pagereveal', onTransition);
})();

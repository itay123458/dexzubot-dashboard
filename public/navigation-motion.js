/* Only explicit server switches opt in. Auth reloads use ordinary navigation. */
(() => {
  const key = 'dexzu.navigation-motion.v1';
  const lifetime = 10000;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const current = new URL(location.href);
  const workspace = url => url.searchParams.get('workspace') || 'main';
  const rule = document.createElement('style');
  rule.textContent = '@view-transition { navigation: none; }';
  document.head.append(rule);
  let prepared = null, incoming = false, expiry;
  const enable = () => { rule.textContent = '@view-transition { navigation: auto; }'; };
  const disable = () => {
    clearTimeout(expiry);
    prepared = null; incoming = false;
    rule.textContent = '@view-transition { navigation: none; }';
    try { sessionStorage.removeItem(key); } catch { /* Motion remains optional. */ }
  };
  const matches = (marker, url) => marker && marker.path === url.pathname
    && marker.workspace === workspace(url) && Date.now() - marker.time >= 0
    && Date.now() - marker.time < lifetime;
  try {
    const marker = JSON.parse(sessionStorage.getItem(key));
    sessionStorage.removeItem(key);
    if (!reduced.matches && matches(marker, current)) {
      incoming = true; enable(); expiry = setTimeout(disable, lifetime);
    }
  } catch { /* Storage denial never affects navigation. */ }
  window.DexzuNavigationMotion = Object.freeze({
    prepare(destination) {
      disable();
      const target = new URL(destination, location.href);
      if (reduced.matches || target.origin !== current.origin || target.pathname !== current.pathname
        || target.searchParams.getAll('workspace').length !== 1 || workspace(target) === workspace(current)) return;
      const marker = { path: target.pathname, workspace: workspace(target), time: Date.now() };
      try {
        sessionStorage.setItem(key, JSON.stringify(marker));
        prepared = marker; enable();
        // Expire an attempted navigation if its beforeunload dialog is cancelled.
        expiry = setTimeout(disable, lifetime);
      } catch { /* Use normal navigation if the destination cannot opt in. */ }
    },
  });
  const onTransition = event => {
    const transition = event.viewTransition;
    if (!transition) { disable(); return; }
    transition.ready.catch(() => {});
    transition.finished.then(disable, disable);
    let allowed = incoming;
    if (event.type === 'pageswap') {
      const next = event.activation?.entry?.url;
      allowed = next && matches(prepared, new URL(next));
    }
    if (!allowed || reduced.matches) transition.skipTransition();
  };
  window.addEventListener('pageswap', onTransition);
  window.addEventListener('pagereveal', onTransition);
  window.addEventListener('pageshow', event => { if (event.persisted) disable(); });
})();

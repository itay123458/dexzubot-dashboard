// Pages hosts only public assets. The Pi authorizes every data request.
(() => {
  const config = window.DexzuPagesConfig;
  window.dashboardSignedOut = () => location.assign('/dashboard/auth/login');
  if (!config) return;
  const api = new URL(config.apiOrigin);
  if (api.protocol !== 'https:' || api.origin !== config.apiOrigin || config.siteOrigin !== location.origin || !/^\/[a-zA-Z0-9_-]+\/$/.test(config.basePath)) throw Error('Invalid dashboard hosting configuration.');
  const base = config.basePath;
  const backend = api.origin + '/dashboard' + '/';
  const originalFetch = window.fetch.bind(window);
  const tokenKey = 'dexzu.pages.session.v1', verifierKey = 'dexzu.pages.verifier.v1';
  const gate = document.getElementById('pages-signin');
  const status = document.getElementById('pages-signin-status');
  const button = document.getElementById('pages-signin-button');
  let token = null, signedOut = false;
  let readyResolve;
  const ready = new Promise(resolve => { readyResolve = resolve; });
  const clear = () => { token = null; try { sessionStorage.removeItem(tokenKey); } catch { /* Still clear memory. */ } };
  window.dashboardSignedOut = () => {
    if (signedOut) return;
    signedOut = true; clear();
    document.body.classList.add('pages-locked'); gate.hidden = false;
    document.querySelector('.app-shell').inert = true;
    // A fresh document also removes prior server data and in-flight UI updates.
    location.replace(location.pathname + location.search);
  };
  const direct = (path, options = {}) => originalFetch(backend + path, { ...options, credentials: 'omit', cache: 'no-store', signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
  const encoded = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  button.addEventListener('click', async () => {
    button.disabled = true; status.textContent = 'Connecting to Discord?';
    try {
      const verifier = encoded(crypto.getRandomValues(new Uint8Array(32)));
      sessionStorage.setItem(verifierKey, verifier);
      const challenge = encoded(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
      const target = new URL(backend + 'auth/login');
      target.searchParams.set('pages', '1'); target.searchParams.set('challenge', challenge);
      const invite = new URLSearchParams(location.search).get('invite');
      if (invite) target.searchParams.set('invite', invite);
      location.assign(target.href);
    } catch { status.textContent = 'Allow storage for this site, then try signing in again.'; button.disabled = false; }
  });
  window.fetch = async (input, options) => {
    const source = input instanceof Request ? input.url : String(input);
    const target = new URL(source, location.href);
    const prefix = location.origin + base;
    if (!target.href.startsWith(prefix) || !/^(api|auth)\//.test(target.href.slice(prefix.length))) return originalFetch(input, options);
    await ready;
    if (signedOut || !token) throw Error('Your session ended. Sign in again.');
    const request = new Request(input instanceof Request ? input : target.href, options);
    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const path = target.href.slice(prefix.length);
    const response = await direct(path, { method: request.method, headers, body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(), signal: request.signal });
    if (response.status === 401) window.dashboardSignedOut();
    return response;
  };
  // Navigation downloads cannot send a bearer header. Fetch the file first.
  document.getElementById('config-export').addEventListener('click', async event => {
    event.preventDefault();
    const link = event.currentTarget;
    if (link.getAttribute('aria-disabled') === 'true') return;
    link.setAttribute('aria-disabled', 'true');
    try {
      const response = await fetch(link.href);
      if (!response.ok) throw Error('Could not download the configuration. Try again.');
      const url = URL.createObjectURL(await response.blob());
      const download = document.createElement('a'); download.href = url; download.download = 'dexzubot-config.json';
      download.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { if (typeof window.toast === 'function') window.toast(error.message, true); }
    finally { link.removeAttribute('aria-disabled'); }
  });
  async function start() {
    try {
      const ticket = new URLSearchParams(location.hash.slice(1)).get('login_ticket');
      if (ticket) {
        history.replaceState(null, '', location.pathname + location.search);
        const verifier = sessionStorage.getItem(verifierKey);
        sessionStorage.removeItem(verifierKey);
        clear();
        const response = await direct('auth/pages/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket, verifier }) });
        if (!response.ok) throw Error('Sign-in expired. Please continue with Discord again.');
        const data = await response.json();
        if (typeof data.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(data.token)) throw Error('Could not complete sign-in. Please try again.');
        sessionStorage.setItem(tokenKey, data.token);
      }
      const params = new URLSearchParams(location.search);
      // An invitation must be accepted explicitly even if another account was signed in.
      if (params.has('invite')) { clear(); return; }
      token = sessionStorage.getItem(tokenKey);
      if (!token) return;
      const response = await direct('auth/session', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        if (response.status === 401) clear();
        throw Error(response.status === 401 ? 'Your session ended. Sign in again.' : 'The bot is unavailable. Please try again shortly.');
      }
      gate.hidden = true; document.body.classList.remove('pages-locked'); readyResolve();
    } catch (error) { status.textContent = error.name === 'TypeError' || error.name === 'TimeoutError' ? 'Cannot reach DexzuBot right now. Please try again shortly.' : error.message; }
  }
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  void start();
})();

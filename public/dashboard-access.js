// Session presentation is advisory; every public API request is authorized on the server.
(() => {
  const element = id => document.getElementById(id);
  const sessionStatus = element('dashboard-session-status');
  let session;
  let readOnly = false;
  const readControls = '#pages-signin *, [data-page], [data-workspace], #server-selector, #mobile-navigation, #open-control-search, #control-search-dialog *, #refresh-dashboard, #view-logs, #refresh-roles, #community-refresh, #role-edit-selected, #dashboard-logout, input[type="search"], .toast-close';

  async function request(path, body) {
    const response = await fetch(`/dashboard/auth/${path}`, {
      credentials: 'same-origin', cache: 'no-store',
      ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    if (response.status === 401) {
      window.dashboardSignedOut();
      throw new Error('Your session ended. Sign in again.');
    }
    const result = await response.json();
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'The request failed. Try again.');
    return result;
  }

  function lockControls() {
    if (!readOnly) return;
    document.querySelectorAll('button,input,select,textarea').forEach(control => {
      if (control.matches(readControls)) return;
      if (!control.disabled) control.disabled = true;
      if (control.title !== 'Read-only dashboard access') control.title = 'Read-only dashboard access';
    });
  }
  // Existing page renderers can replace controls or enable them after polling.
  const observer = new MutationObserver(lockControls);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  for (const type of ['click', 'submit', 'change']) {
    document.addEventListener(type, event => {
      if (!readOnly) return;
      const control = event.target.closest('button,input,select,textarea,form');
      if (!control || control.matches(readControls)) return;
      event.preventDefault(); event.stopImmediatePropagation();
    }, true);
  }

  element('dashboard-logout').addEventListener('click', async event => {
    event.currentTarget.disabled = true; sessionStatus.textContent = 'Logging out…';
    try { await request('logout', {}); window.dashboardSignedOut(); }
    catch (error) {
      if (window.DexzuPagesConfig) { window.dashboardSignedOut(); }
      else { sessionStatus.textContent = error.message; element('dashboard-logout').disabled = false; }
    }
  });
  async function start() {
    try {
      session = await request('session');
      await dashboardGuildsReady;
      if (session.public) {
        readOnly = !dashboardGuilds.some(guild => guild.id === document.body.dataset.guildId);
        element('dashboard-session').hidden = false;
        element('dashboard-logout').hidden = false;
        element('dashboard-session-label').textContent = `${session.user?.username || 'Discord account'} \u00b7 ${readOnly ? 'No server access' : 'Server administrator'}`;
        document.querySelector('.sidebar-footer small').textContent = 'Discord administrator access';
        if (readOnly) sessionStatus.textContent = 'Choose a server you own or administer. DexzuBot must be in that server.';
      }
      lockControls();

    } catch (error) {
      readOnly = true; lockControls();
      element('dashboard-session').hidden = false;
      sessionStatus.textContent = `Access could not be verified. Controls are read only. ${error.message}`;
    }
  }
  void start();
})();

// Each document has one immutable server context, including polling and downloads.
// Switching navigates to a fresh document so drafts and in-flight responses cannot cross servers.
const workspaceParams = new URLSearchParams(location.search).getAll('workspace');
const dashboardWorkspace = workspaceParams.length > 1 ? 'invalid' : (workspaceParams[0] ?? 'main');
const dashboardApiUrl = path => `/dashboard/api/${path}${dashboardWorkspace === 'main' ? '' : `?workspace=${encodeURIComponent(dashboardWorkspace)}`}`;

document.body.dataset.workspace = dashboardWorkspace;
document.title = `DexzuBot ${dashboardWorkspace === 'beta' ? 'Beta' : 'Control'} Center`;
const workspaceNotice = document.getElementById('workspace-notice');
workspaceNotice.hidden = dashboardWorkspace !== 'beta';
document.getElementById('workspace-label').textContent = dashboardWorkspace === 'beta' ? 'Managing beta server' : 'Currently managing';
document.getElementById('config-export').href = dashboardApiUrl('operations/export');
for (const link of document.querySelectorAll('a[data-workspace]')) {
  if (link.dataset.workspace === dashboardWorkspace) link.setAttribute('aria-current', 'page');
  link.addEventListener('click', event => {
    if (link.getAttribute('aria-disabled') === 'true' || link.dataset.workspace === dashboardWorkspace) event.preventDefault();
    else if (pendingDashboardWrites > 0) {
      event.preventDefault();
      toast('Wait for the current save to finish before switching servers.', 'info');
    }
  });
}
// Full navigation keeps pending reads and drafts tied to their original document.
const serverSelector = document.getElementById('server-selector');
let dashboardGuilds = [];
serverSelector.addEventListener('change', () => {
  const destination = serverSelector.value;
  // A cancelled beforeunload prompt must not leave another server selected.
  serverSelector.value = dashboardGuilds.find(g => g.workspace === dashboardWorkspace || g.id === dashboardWorkspace)?.workspace ?? dashboardWorkspace;
  if (pendingDashboardWrites > 0) {
    toast('Wait for the current save to finish before switching servers.', 'info');
    return;
  }
  location.assign(`/dashboard/?workspace=${encodeURIComponent(destination)}`);
});
async function loadDashboardGuilds() {
  try {
    const response = await fetch('/dashboard/api/guilds', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.guilds)) throw Error('Could not load your servers.');
    dashboardGuilds = data.guilds;
    serverSelector.replaceChildren();
    for (const guild of dashboardGuilds) {
      const option = new Option(guild.name, guild.workspace);
      serverSelector.add(option);
    }
    const selected = dashboardGuilds.find(g => g.workspace === dashboardWorkspace || g.id === dashboardWorkspace);
    if (!selected && !workspaceParams.length && dashboardGuilds.length) {
      location.replace(`/dashboard/?workspace=${encodeURIComponent(dashboardGuilds[0].workspace)}`);
      return;
    }
    if (selected) {
      serverSelector.value = selected.workspace;
      document.body.dataset.guildId = selected.id;
      const preview = selected.serverUpdateEnabled === true;
      // Dashboard presentation is released everywhere; backend feature gates stay independent.
      document.getElementById('halloween-theme').media = 'all';
      document.querySelector('.halloween-brand').hidden = false;
      document.querySelector('.regular-brand').hidden = true;
      document.querySelector('.server-select-label').hidden = !(selected.multiServerEnabled === true || preview);
    } else { serverSelector.selectedIndex = -1; }
    serverSelector.disabled = !dashboardGuilds.length;
    for (const link of document.querySelectorAll('a[data-workspace]')) {
      const available = dashboardGuilds.some(g => g.workspace === link.dataset.workspace);
      link.hidden = !available;
      link.setAttribute('aria-disabled', String(!available));
    }
    window.dispatchEvent(new CustomEvent('dexzu-guilds', { detail: dashboardGuilds }));
  } catch (error) {
    serverSelector.disabled = true;
    serverSelector.replaceChildren(new Option('Servers unavailable', ''));
    toast(error.message, true);
  }
}
const dashboardGuildsReady = loadDashboardGuilds();

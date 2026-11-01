// Presentation only. Summaries use the current authenticated state; configuration
// shortcuts navigate through the existing router, permissions and dirty guards.
(() => {
  'use strict';
  const field = id => document.getElementById(id);
  const number = new Intl.NumberFormat();
  const clock = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  const fullClock = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  document.querySelectorAll('[data-overview-icon]').forEach(element => {
    element.innerHTML = icons[element.dataset.overviewIcon] || icons.command;
  });
  function setFeature(id, enabled, configured = true) {
    const element = field(id);
    element.textContent = enabled ? (configured ? 'On' : 'Choose a channel') : 'Off';
    element.dataset.state = enabled ? (configured ? 'on' : 'incomplete') : 'off';
  }
  function renderOverview(current) {
    if (!current?.server || !current.bot) return;
    const stamp = field('overview-updated');
    if (typeof dashboardFetchedAt === 'number' && Number.isFinite(dashboardFetchedAt)) {
      const received = new Date(dashboardFetchedAt);
      stamp.dateTime = received.toISOString();
      stamp.textContent = `Updated ${clock.format(received)}`;
      stamp.title = fullClock.format(received);
    }
    setFeature('overview-welcome-status', current.greetings?.welcomeEnabled === true, Boolean(current.greetings?.welcomeChannelId));
    setFeature('overview-logging-status', current.logging?.enabled === true, Boolean(current.logging?.moderationChannelId || current.logging?.serverChannelId));
    setFeature('overview-spam-status', current.safetyAdvanced?.antiSpam === true);
    const health = current.operations?.health;
    const failures = Math.max(0, Number(health?.failed) || 0);
    const warnings = Math.max(0, Number(health?.warnings) || 0);
    const notices = failures + warnings;
    const summary = field('overview-health-summary');
    const detail = field('overview-health-detail');
    summary.textContent = health ? (notices ? `${number.format(notices)} check${notices === 1 ? '' : 's'} need${notices === 1 ? 's' : ''} attention` : 'All checks passed') : 'Diagnostics not checked yet';
    detail.textContent = health ? (notices ? `${number.format(failures)} issue${failures === 1 ? '' : 's'} · ${number.format(warnings)} setup notice${warnings === 1 ? '' : 's'}. Review diagnostics.` : 'Review permissions, channels and bot access.') : 'Open diagnostics to review this server.';
    field('overview-health-link').dataset.state = !health ? 'pending' : (failures ? 'issue' : (warnings ? 'notice' : 'ready'));
  }
  window.addEventListener('dexzu-state', event => renderOverview(event.detail));
  window.addEventListener('dexzu-page', event => { if (event.detail?.route === 'overview' && typeof state !== 'undefined') renderOverview(state); });
  if (typeof state !== 'undefined' && state) renderOverview(state);
})();

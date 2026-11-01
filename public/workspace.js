// Presentation only: never writes server settings or rebuilds form controls.
(() => {
  try { localStorage.removeItem('dexzu-dashboard-layout'); } catch { /* Optional preference cleanup. */ }
  const menu = document.getElementById('mobile-navigation');
  const navigation = document.getElementById('dashboard-navigation');
  const mobile = matchMedia('(max-width: 1100px)');
  const workspace = document.querySelector('.workspace');
  const closeNavigation = document.getElementById('close-navigation');
  const backgroundControls = [document.querySelector('.brand'), document.getElementById('open-control-search'), menu];
  function setMenuModal(open) {
    workspace.inert = open;
    backgroundControls.forEach(element => { element.inert = open; });
    if (open) {
      navigation.setAttribute('role', 'dialog');
      navigation.setAttribute('aria-modal', 'true');
      navigation.setAttribute('aria-labelledby', 'navigation-sheet-title');
    } else {
      navigation.removeAttribute('role');
      navigation.removeAttribute('aria-modal');
      navigation.removeAttribute('aria-labelledby');
    }
  }
  let menuClosing = false;
  let menuAnimation;
  function closeMenu(returnFocus = false) {
    menu.setAttribute('aria-expanded', 'false');
    setMenuModal(false);
    if (returnFocus) menu.focus();
    if (!document.body.classList.contains('navigation-open')) return;
    menuClosing = true;
    menuAnimation?.cancel();
    const animation = mobile.matches ? window.DexzuMotion?.animate(navigation, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 }) : null;
    menuAnimation = animation;
    const finish = () => {
      if (menuAnimation !== animation || !menuClosing) return;
      document.body.classList.remove('navigation-open'); menuClosing = false; menuAnimation = null;
    };
    if (animation) animation.finished.then(finish, () => {}); else finish();
  }
  function markCurrent() {
    navigation.querySelectorAll('[data-page]').forEach(button => {
      if (button.classList.contains('active')) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }
  menu.addEventListener('click', () => {
    if (document.body.classList.contains('navigation-open') && !menuClosing) { closeMenu(true); return; }
    menuClosing = false; menuAnimation?.cancel(); menuAnimation = null;
    document.body.classList.add('navigation-open'); menu.setAttribute('aria-expanded', 'true');
    setMenuModal(true);
    window.DexzuMotion?.animate(navigation, [{opacity:0,translate:'0 -8px'},{opacity:1,translate:'0 0'}], {duration:220});
    navigation.querySelector('.active')?.focus();
  });
  closeNavigation.addEventListener('click', () => closeMenu(true));
  navigation.addEventListener('click', event => {
    const button = event.target.closest('[data-page]');
    if (!button || !navigation.contains(button)) return;
    markCurrent();
    if (mobile.matches) { closeMenu(); document.getElementById('dashboard-main').focus({ preventScroll: true }); }
  });
  document.addEventListener('keydown', event => {
    if (!document.body.classList.contains('navigation-open') || menuClosing) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { closeMenu(true); return; }
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); }
    if (event.key === 'Tab') {
      const targets = [...navigation.querySelectorAll('button:not([hidden]):not(:disabled), a[href]')].filter(element => element.getClientRects().length);
      const first = targets[0], last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  mobile.addEventListener('change', () => closeMenu());
  window.addEventListener('pagehide', () => { menuClosing = false; menuAnimation?.cancel(); menuAnimation = null; document.body.classList.remove('navigation-open'); menu.setAttribute('aria-expanded', 'false'); setMenuModal(false); });
  markCurrent();
  document.getElementById('refresh-dashboard').innerHTML = icon('<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3"/>');
  const navigationIcons = { overview: icons.chart, safety: icons.shield, greetings: icons.members,
    leveling: icons.trend, logging: icons.command, youtube: icon('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/>'),
    faith: icon('<path d="M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z"/>'),
    'ai-voice': icon('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>'),
    operations: icons.shield, 'module-counting': icons.hash, 'module-economy': icons.wallet,
    'module-moderation': icons.shield, 'module-ticket': icons.ticket, 'module-serverstats': icons.chart };
  navigation.querySelectorAll('[data-page]').forEach(button => {
    button.querySelector('.nav-icon').innerHTML = navigationIcons[button.dataset.page] || icons.command;
    button.querySelector('.nav-icon').setAttribute('aria-hidden', 'true');
  });
  const labels = { 'promo-enabled': 'Enable promotion filter', 'spam-enabled': 'Enable spam protection',
    'mentions-enabled': 'Enable mention limit', 'greeting-cards': 'Enable greeting cards',
    'welcome-enabled': 'Enable welcome messages', 'goodbye-enabled': 'Enable goodbye messages',
    'leveling-enabled': 'Enable leveling', 'leveling-announce': 'Enable level-up announcements',
    'logging-enabled': 'Enable server logging', 'logging-search': 'Search recorded events' };
  Object.entries(labels).forEach(([id, label]) => document.getElementById(id)?.setAttribute('aria-label', label));
})();

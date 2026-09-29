(() => {
  const card = $('beta-release-notes'), root = $('beta-release-content');
  if (!card || !root) return;
  card.hidden = false;
  if (dashboardWorkspace === 'invalid') $('open-beta-roles').hidden = true;
  card.querySelector('h2').textContent = 'What\u2019s new';
  function releaseEntry(release) {
    const entry = document.createElement('section');
    entry.className = 'release-entry';
    const heading = document.createElement('h3'), description = document.createElement('p');
    heading.textContent = release.title; description.textContent = release.summary;
    const details = document.createElement('details'), toggle = document.createElement('summary'), list = document.createElement('ul');
    toggle.textContent = 'Read the release notes';
    for (const text of [...release.changes, ...release.tryIt, release.scope]) {
      const item = document.createElement('li'); item.textContent = text; list.append(item);
    }
    details.append(toggle, list); entry.append(heading, description, details);
    return entry;
  }
  void (async () => {
    try {
      const response = await fetch(dashboardApiUrl('releases'), { cache: 'no-store' });
      if (!response.ok) throw Error('Release notes could not be loaded.');
      const { releases } = await response.json();
      root.replaceChildren();
      if (!releases.length) { root.textContent = 'No release notes yet.'; return; }
      root.append(releaseEntry(releases[0]));
      if (releases.length > 1) {
        const history = document.createElement('details'), summary = document.createElement('summary');
        history.className = 'release-history'; summary.textContent = `Previous updates (${releases.length - 1})`;
        history.append(summary, ...releases.slice(1).map(releaseEntry)); root.append(history);
      }
    } catch (error) { root.textContent = error.message; }
  })();
})();

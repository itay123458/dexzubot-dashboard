(() => {
  const section = $('security-section'), form = $('security-form'), fields = $('security-fields');
  let data = null, dirty = false, busy = false;
  const ids = {
    raid: { enabled: 'enabled', mode: 'mode', joinThreshold: 'threshold', windowSeconds: 'window', accountAgeDays: 'age', timeoutMinutes: 'timeout' },
    nuke: { enabled: 'enabled', mode: 'mode', actionThreshold: 'threshold', windowSeconds: 'window' },
  };
  const status = (message, error = false) => {
    $('security-status').textContent = message;
    $('security-status').dataset.error = String(error);
  };
  function markDirty(value) {
    dirty = value; setDirty('safety', value, 'security');
    $('security-draft').textContent = value ? 'Unsaved protection changes.' : 'No unsaved protection changes.';
  }
  function setBusy(value) {
    busy = value;
    fields.disabled = value || data?.available !== true || data?.canEdit !== true;
    $('security-preview').disabled = value || data?.available !== true;
    $('security-refresh').disabled = value;
    if (value) section.setAttribute('aria-busy', 'true'); else section.removeAttribute('aria-busy');
  }
  function channels() {
    const select = $('security-alert-channel'), selected = select.value || data?.settings?.alertChannelId || '';
    const items = state?.channels || [];
    select.replaceChildren(new Option('Not configured', ''), ...items.map(channel => new Option(`#${channel.name}`, channel.id)));
    if (selected && !items.some(channel => channel.id === selected)) select.add(new Option('Unavailable channel — choose another', selected));
    select.value = selected;
  }
  function renderSettings() {
    if (!data?.settings) return;
    for (const [feature, mapping] of Object.entries(ids)) for (const [key, suffix] of Object.entries(mapping)) {
      const input = $(`security-${feature}-${suffix}`);
      if (key === 'enabled') input.checked = data.settings[feature][key] === true;
      else input.value = data.settings[feature][key];
    }
    $('security-alert-channel').value = data.settings.alertChannelId || '';
    channels();
    $('security-trusted').value = (data.settings.trustedUserIds || []).join('\n');
    validateTrusted();
  }
  function line(parent, text, tag = 'li') {
    const element = document.createElement(tag); element.textContent = text; parent.append(element); return element;
  }
  function renderStatus() {
    const available = data?.available === true;
    $('security-content').hidden = !available;
    $('security-access').textContent = !available ? 'Server protection is available in Beta only during this trial.'
      : data.canEdit === true ? 'Beta trial · Only you, the current server owner, can edit protection settings.'
        : 'Beta trial · View only. Only the current server owner can edit protection settings.';
    $('security-incidents').replaceChildren(); $('security-readiness').replaceChildren();
    if (!available) { $('security-preview-result').textContent = ''; return; }
    for (const feature of ['raid', 'nuke']) {
      const readiness = data.readiness?.[feature], name = feature === 'raid' ? 'Anti-raid' : 'Anti-nuke';
      line($('security-readiness'), `${name}: ${readiness?.ready ? 'Required bot permissions present' : `Missing permissions: ${(readiness?.missingPermissions || []).join(', ') || 'Readiness unavailable'}`}`);
    }
    for (const warning of data.readiness?.warnings || []) line($('security-readiness'), warning);
    for (const incident of (data.incidents || []).slice(0, 100)) {
      const item = document.createElement('details'); item.className = 'security-incident';
      const date = new Date(incident.createdAt);
      line(item, `${incident.feature === 'raid' ? 'Anti-raid' : 'Anti-nuke'} · ${incident.status || 'Unknown status'} · ${Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString()}`, 'summary');
      line(item, `Incident ${incident.id}${incident.actorId ? ` · Actor ${incident.actorId}` : ''}`, 'p');
      const actions = document.createElement('ul'); item.append(actions);
      for (const action of incident.actions || []) line(actions, `${action.type || 'Action'} · Member ${action.userId || 'unknown'}${action.roleId ? ` · Role ${action.roleId}` : ''} · ${action.status || 'Unknown status'}${action.reason ? ` — ${action.reason}` : ''}`);
      if (!actions.childElementCount) line(actions, 'No containment actions recorded.');
      const notification = incident.notification;
      line(item, `Alert: ${typeof notification === 'string' ? notification : notification?.status || 'Not recorded'}${notification?.reason ? ` — ${notification.reason}` : ''}`, 'p');
      if (incident.evidence) { line(item, 'Recorded evidence', 'strong'); line(item, JSON.stringify(incident.evidence, null, 2), 'pre'); }
      $('security-incidents').append(item);
    }
    if (!$('security-incidents').childElementCount) line($('security-incidents'), 'No recent incidents. Protection starts disabled; an empty history does not mean it is enabled.', 'p');
  }
  function trustedIds() { return [...new Set($('security-trusted').value.trim().split(/[\s,]+/).filter(Boolean))]; }
  function validateTrusted() {
    const values = trustedIds();
    const error = values.length > 50 ? 'Enter no more than 50 trusted member IDs.' : values.some(value => !/^\d{17,20}$/.test(value)) ? 'Use Discord member IDs: 17–20 digits each, separated by commas or spaces.' : '';
    $('security-trusted').setCustomValidity(error);
    $('security-trusted').setAttribute('aria-invalid', String(Boolean(error)));
    $('security-trusted-error').textContent = error;
    return !error;
  }
  function inputSettings() {
    const input = { alertChannelId: $('security-alert-channel').value || null, trustedUserIds: trustedIds() };
    for (const [feature, mapping] of Object.entries(ids)) {
      input[feature] = {};
      for (const [key, suffix] of Object.entries(mapping)) {
        const field = $(`security-${feature}-${suffix}`);
        input[feature][key] = key === 'enabled' ? field.checked : key === 'mode' ? field.value : Number(field.value);
      }
    }
    return input;
  }
  async function load() {
    if (busy) return;
    setBusy(true); status('Loading protection settings...');
    try {
      const response = await fetch(dashboardApiUrl('security'), { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Protection settings could not be loaded.');
      data = result; renderStatus(); $('security-preview-result').textContent = '';
      if (!dirty) renderSettings();
      status(data.available ? 'Protection status loaded.' : 'This trial has not been enabled for this server.');
    } catch (error) {
      data = null; $('security-content').hidden = true;
      $('security-incidents').replaceChildren(); $('security-preview-result').textContent = '';
      $('security-access').textContent = 'Protection access could not be verified. Refresh to try again.';
      status(error.message, true);
    } finally { setBusy(false); }
  }
  form.addEventListener('input', () => {
    if (data?.canEdit !== true || busy) return;
    markDirty(true); validateTrusted(); status('Unsaved protection changes.');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || data?.available !== true || data?.canEdit !== true || !validateTrusted() || !form.reportValidity()) return;
    const input = inputSettings(); setBusy(true); status('Saving protection settings...');
    try {
      data = await post('security', input); markDirty(false); renderStatus(); renderSettings();
      $('security-preview-result').textContent = ''; status('Protection settings saved.');
    } catch (error) { status(error.message, true); }
    finally { setBusy(false); }
  });
  $('security-preview').addEventListener('click', async () => {
    if (busy || data?.available !== true) return;
    setBusy(true); $('security-preview-result').textContent = 'Running synthetic preview...';
    try {
      const result = await post('security/preview', {});
      const preview = $('security-preview-result'); preview.replaceChildren();
      if (result.synthetic !== true) preview.textContent = 'The preview could not be verified. Refresh and try again.';
      else {
        line(preview, result.summary, 'p');
        for (const [feature, name] of [['raid', 'Anti-raid'], ['nuke', 'Anti-nuke']]) {
          const example = result[feature];
          if (example) line(preview, `${name}: ${example.action}`, 'p');
        }
      }
    } catch (error) { $('security-preview-result').textContent = error.message; }
    finally { setBusy(false); }
  });
  $('security-refresh').addEventListener('click', () => {
    if (dirty && !confirm('Discard unsaved protection settings and refresh?')) return;
    markDirty(false); void load();
  });
  window.addEventListener('dexzu-state', () => { if (!dirty) channels(); });
  window.addEventListener('dexzu-page', event => { if (event.detail.panel?.dataset.panel === 'safety' && !dirty) void load(); });
  window.addEventListener('dexzu-discard', event => {
    if (event.detail !== 'safety') return;
    markDirty(false); renderSettings(); status('Protection draft discarded.');
  });
  if (dashboardWorkspace === 'invalid') { setBusy(false); status('Choose a valid server workspace.', true); }
  else void load();
})();

/* Shared dashboard motion. Content stays visible when motion or JS is unavailable. */
(() => {
  'use strict';
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const styles = getComputedStyle(document.documentElement);
  const duration = (name, fallback) => parseFloat(styles.getPropertyValue(`--motion-${name}`)) || fallback;
  const timing = { interaction: duration('interaction', 150), panel: duration('panel', 240), count: duration('count', 450), stagger: duration('stagger', 50) };
  const selector = '.bot-banner, .feature-heading, .summary-card, .metric, .card, .empty-state, #control-search-results > button';
  const entered = new WeakSet();
  const seen = new Set();
  const pending = new Map();
  const counters = new Map();
  const animations = new Map();
  const closing = new Map();
  let intersection;
  let mutations;
  let running = false;
  let refreshFrame = 0;
  let route = location.hash.slice(1) || 'overview';
  const details = new Map();
  const paused = () => preference.matches || document.hidden || !running;
  const eligible = element => element.isConnected && !element.closest('.page:not(.active)') && !element.closest('[hidden]')
    && !(element.closest('[data-panel]') && document.body.dataset.dashboardReady!=='true')
    && !(document.body.classList.contains('pages-locked') && element.closest('.app-shell'));
  const keyFor = element => {
    const path=[];
    for(let node=element;node && path.length<7;node=node.parentElement){
      if(node.id){path.push(`#${node.id}`);break;}
      path.push(`${node.tagName}.${node.classList[0]||''}:${[...(node.parentElement?.children||[])].indexOf(node)}`);
      if(node.matches('[data-panel]'))break;
    }
    return `${route}:${path.join('/')}`;
  };

  function enter(element, order = 0) {
    pending.delete(element);
    intersection?.unobserve(element);
    if (!eligible(element) || entered.has(element)) return;
    entered.add(element);
    seen.add(keyFor(element));
    if (paused()) return;
    element.style.setProperty('--motion-delay', `${Math.min(order * timing.stagger, 200)}ms`);
    element.classList.add('motion-enter');
  }

  function discover(root, startingOrder = 0) {
    if (!(root instanceof Element) || !running || !eligible(root)) return startingOrder;
    const candidates = [...(root.matches(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    let order = startingOrder;
    for (const element of candidates) {
      if (!eligible(element) || entered.has(element) || seen.has(keyFor(element)) || pending.has(element) || element.classList.contains('skeleton')) continue;
      // Animate the outer card only, so nested cards/metrics do not move twice.
      if (element.parentElement?.closest(selector)) continue;
      const delay = order++;
      if (paused() || !intersection) enter(element, delay);
      else { pending.set(element, delay); intersection.observe(element); }
    }
    return order;
  }

  function cancelCount(element, finish = false) {
    const active = counters.get(element);
    if (!active) return;
    cancelAnimationFrame(active.frame);
    counters.delete(element);
    if (finish && element.isConnected) element.textContent = active.final;
  }

  function count(element, from, to, duration = timing.count) {
    if (!element) return;
    cancelCount(element);
    if (!element.isConnected) return;
    const final = to === null || to === undefined ? '—' : String(to);
    const numeric = value => typeof value === 'number' && Number.isFinite(value);
    if (paused() || !numeric(from) || !numeric(to) || from === to || !(duration > 0)) {
      element.textContent = final;
      return;
    }
    const active = { frame: 0, final };
    const start = performance.now();
    counters.set(element, active);
    const tick = now => {
      if (counters.get(element) !== active) return;
      if (!element.isConnected) { counters.delete(element); return; }
      const progress = Math.min(1, Math.max(0, (now - start) / Math.min(duration, 600)));
      const value = from + (to - from) * (1 - (1 - progress) ** 3);
      element.textContent = progress === 1 ? final : String(Math.round(value));
      if (progress < 1) active.frame = requestAnimationFrame(tick);
      else counters.delete(element);
    };
    active.frame = requestAnimationFrame(tick);
  }

  function setCount(element, value) {
    cancelCount(element);
    if (element?.isConnected) element.textContent = String(value ?? "\u2014");
  }

  function animate(element, keyframes, options = {}) {
    animations.get(element)?.cancel();
    animations.delete(element);
    if (!element?.isConnected || paused() || typeof element.animate !== 'function') return null;
    const animation = element.animate(keyframes, { duration: timing.interaction, easing: styles.getPropertyValue('--motion-ease').trim() || 'ease-out', ...options });
    animations.set(element, animation);
    const cleanup = () => { if (animations.get(element) === animation) animations.delete(element); };
    animation.finished.then(cleanup, cleanup);
    return animation;
  }

  async function leave(panel) {
    // Keep the outgoing section mounted until its short exit finishes. Rapid
    // navigation cancels this animation; the router commits only its latest ID.
    const animation=animate(panel,[{opacity:1,translate:'0 0'},{opacity:0,translate:'0 -6px'}],{duration:120});
    try { await animation?.finished; } catch { /* Superseded navigation. */ }
  }
  function cancel(element) { animations.get(element)?.cancel();animations.delete(element); }

  function capture(container) {
    if(paused() || !eligible(container))return new Map();
    return new Map([...container.children].filter(el=>!el.hidden).map(el=>[el,el.getBoundingClientRect()]));
  }
  function flip(container,before) {
    if(paused() || !before?.size || !eligible(container))return;
    // Read every final box before starting animations; preserve the actual nodes,
    // selection and focus instead of rebuilding lists to animate them.
    const moves=[...container.children].filter(el=>!el.hidden && before.has(el)).map(el=>{
      const old=before.get(el),next=el.getBoundingClientRect();return {el,x:old.left-next.left,y:old.top-next.top};
    });
    for(const {el,x,y} of moves)if(Math.abs(x)+Math.abs(y)>1 && !el.contains(document.activeElement))animate(el,[{translate:`${x}px ${y}px`},{translate:'0 0'}],{duration:260});
  }

  function toggleDetails(event) {
    const summary=event.target.closest('summary'),element=summary?.parentElement;
    if(!element?.matches('details') || event.target.closest('a,button,input,select'))return;
    if(paused() || !eligible(element) || typeof element.animate!=='function')return;
    event.preventDefault();
    const before=element.getBoundingClientRect().height;
    const expanded=!(details.get(element)?.expanded ?? element.open);
    animations.get(element)?.cancel();
    element.open=true;
    const after=expanded?element.getBoundingClientRect().height:summary.getBoundingClientRect().height;
    const token={expanded};details.set(element,token);
    token.animation=animate(element,[{height:`${before}px`,overflow:'clip'},{height:`${after}px`,overflow:'clip'}],{duration:260});
    const finish=()=>{if(details.get(element)!==token)return;details.delete(element);element.open=expanded;};
    if(token.animation)token.animation.finished.then(finish,()=>{});else finish();
  }

  function pointerMove(event) {
    const card=event.target.closest('[data-motion-tilt]');
    if(!card || paused() || !matchMedia('(hover:hover) and (pointer:fine)').matches)return;
    const box=card.getBoundingClientRect();
    card.style.setProperty('--surface-x',`${((event.clientY-box.top)/box.height-.5)*-3}deg`);
    card.style.setProperty('--surface-y',`${((event.clientX-box.left)/box.width-.5)*3}deg`);
  }
  function pointerOut(event) {
    const card=event.target.closest('[data-motion-tilt]');
    if(card && !card.contains(event.relatedTarget)){card.style.removeProperty('--surface-x');card.style.removeProperty('--surface-y');}
  }

  function cancelDialogClose(dialog) {
    const token = closing.get(dialog);
    if (!token) return;
    closing.delete(dialog);
    token.animation?.cancel();
    dialog.classList.remove('motion-closing');
  }

  async function closeDialog(dialog) {
    if (!dialog?.open) return false;
    cancelDialogClose(dialog);
    const token = {};
    closing.set(dialog, token);
    dialog.classList.add('motion-closing');
    token.animation = animate(dialog, [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(6px) scale(.985)' }], { duration: timing.panel });
    if (token.animation) {
      try { await token.animation.finished; }
      catch { if (closing.get(dialog) === token) cancelDialogClose(dialog); return false; }
    }
    if (closing.get(dialog) !== token) return false;
    closing.delete(dialog);
    dialog.classList.remove('motion-closing');
    if (!dialog.isConnected || !dialog.open) return false;
    dialog.close();
    return true;
  }

  function pageChanged(panel = document.querySelector('.page.active'), navigation = false) {
    if(navigation){
      route=document.body.dataset.motionRoute || location.hash.slice(1) || 'overview';
      seen.clear();
      document.querySelectorAll('.motion-enter').forEach(clearEntrance);
      panel?.querySelectorAll(selector).forEach(el=>entered.delete(el));
      for(const [el,animation] of animations)if(el.closest('.page')){animation.cancel();animations.delete(el);}
      for(const [el,token] of details){token.animation?.cancel();el.open=token.expanded;details.delete(el);}
      animate(document.getElementById('page-title'),[{clipPath:'inset(0 0 100% 0)',translate:'0 8px'},{clipPath:'inset(0 0 0 0)',translate:'0 0'}],{duration:300});
      animate(document.querySelector('.breadcrumb'),[{opacity:.4},{opacity:1}],{duration:180});
      animate(document.getElementById('page-description'),[{opacity:0,translate:'0 5px'},{opacity:1,translate:'0 0'}],{duration:260,delay:50});
    }
    for (const [element] of pending) {
      if (!eligible(element)) { intersection?.unobserve(element); pending.delete(element); }
    }
    for (const [element] of counters) if (!eligible(element)) cancelCount(element, true);
    if (panel) {
      const newCards = [...panel.querySelectorAll(selector)].some(element => eligible(element) && !entered.has(element) && !element.classList.contains('skeleton') && !element.parentElement?.closest(selector));
      discover(panel);
      if (navigation && !newCards) animate(panel, [{ opacity: .65, translate: '0 5px' }, { opacity: 1, translate: '0 0' }], { duration: timing.panel });
      panel.querySelectorAll('.module-command-card, .discord-preview').forEach(el=>el.setAttribute('data-motion-tilt',''));
    }
  }
  const onPage = event => pageChanged(event.detail?.panel instanceof Element ? event.detail.panel : undefined,true);
  const refresh=()=>{if(!refreshFrame && running)refreshFrame=requestAnimationFrame(()=>{refreshFrame=0;discover(document.body);});};
  function clearEntrance(element) {
    element.classList.remove('motion-enter');
    element.style.removeProperty('--motion-delay');
  }
  const onAnimationEnd = event => {
    if (!(event.target instanceof Element)) return;
    if (event.animationName==='motion-enter' && event.target.classList.contains('motion-enter')) clearEntrance(event.target);
    event.target.classList.remove('activity-new', 'status-value-updated');
  };
  function onVisibility() {
    document.body?.classList.toggle('motion-paused', paused());
    if (paused()) {
      document.querySelectorAll('.motion-enter').forEach(clearEntrance);
      document.querySelectorAll('.activity-new, .status-value-updated').forEach(element => element.classList.remove('activity-new', 'status-value-updated'));
      for (const [element] of counters) cancelCount(element, true);
      for (const animation of animations.values()) {
        try { animation.finish(); } catch { animation.cancel(); }
      }
    }
  }
  function start() {
    if (running || !document.body) return;
    running = true;
    if ('IntersectionObserver' in window) intersection = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) enter(entry.target, pending.get(entry.target) || 0);
    }, { threshold: 0.08 });
    mutations = new MutationObserver(records => {
      let changedElements = false;
      let order = 0;
      for (const record of records) {
        for (const node of record.addedNodes) if (node instanceof Element) { changedElements = true; order = discover(node, order); }
        if ([...record.removedNodes].some(node => node instanceof Element)) changedElements = true;
      }
      if (!changedElements) return;
      // Drop detached nodes held by active observers or animations.
      for (const [element] of pending) if (!element.isConnected) { intersection?.unobserve(element); pending.delete(element); }
      for (const [element] of counters) if (!element.isConnected) cancelCount(element);
      for (const [element, animation] of animations) if (!element.isConnected) { animation.cancel(); animations.delete(element); }
      for (const [element,token] of details) if(!element.isConnected){token.animation?.cancel();details.delete(element);}
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('dexzu-page', onPage);
    window.addEventListener('dexzu-data-ready', refresh);
    window.addEventListener('dexzu-state', refresh);
    document.addEventListener('click',toggleDetails);
    document.addEventListener('pointermove',pointerMove,{passive:true});
    document.addEventListener('pointerout',pointerOut,{passive:true});
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('animationend', onAnimationEnd);
    preference.addEventListener('change', onVisibility);
    onVisibility();
    discover(document.body);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(refreshFrame);refreshFrame=0;
    intersection?.disconnect();
    mutations?.disconnect();
    pending.clear();
    for (const [element] of counters) cancelCount(element, true);
    for (const [dialog] of closing) cancelDialogClose(dialog);
    for (const animation of animations.values()) animation.cancel();
    animations.clear();
    for(const [el,token] of details){el.open=token.expanded;}details.clear();
    window.removeEventListener('dexzu-page', onPage);
    window.removeEventListener('dexzu-data-ready',refresh);
    window.removeEventListener('dexzu-state',refresh);
    document.removeEventListener('click',toggleDetails);
    document.removeEventListener('pointermove',pointerMove);
    document.removeEventListener('pointerout',pointerOut);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('animationend', onAnimationEnd);
    preference.removeEventListener('change', onVisibility);
    document.body?.classList.add('motion-paused');
    document.querySelectorAll('.motion-enter').forEach(clearEntrance);
  }

  window.DexzuMotion = Object.freeze({ pageChanged, reveal: discover, count, setCount, animate, cancel, leave, capture, flip, closeDialog, cancelDialogClose });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', start);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

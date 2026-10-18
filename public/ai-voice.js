(() => {
  let enabled=false,data=null,dirty=false,busy=false,timer=null,visible=document.querySelector('[data-panel="ai-voice"]')?.classList.contains('active')===true,request=null,sequence=0;
  const form=$('ai-voice-form'),fields=$('ai-voice-fields');
  const feedback=(message,error=false)=>{$('ai-voice-feedback').textContent=message;$('ai-voice-feedback').dataset.error=String(error);};
  const markDirty=value=>{dirty=value;setDirty('ai-voice',value);};
  const selected=id=>[...$(id).selectedOptions].map(option=>option.value);
  function fill(id,items,ids){$(id).replaceChildren(...items.map(item=>{const option=new Option(item.name||item.label,item.id);option.selected=ids.includes(item.id);return option;}));}
  function render(result,renderForm){
    data=result;
    $('ai-voice-helper').textContent=result.helper.ready?'Local helper ready.':'Local helper unavailable. Start it on the owner’s PC.';
    $('ai-voice-session-state').textContent=result.session.state==='idle'?'No active session.':`Session ${result.session.state}. ${result.session.speakerCount??1} people can participate.${result.session.answeringUserId?` Answering ${result.session.answeringName||'the current speaker'}.`:''}`;
    if(result.session.sourceNoticeFailed)$('ai-voice-session-state').textContent+=' Source links could not be posted. Check the voice channel permissions.';
    $('ai-voice-stop').disabled=result.session.state==='idle'||busy;
    if(!renderForm)return;
    const settings=result.settings;
    $('ai-voice-enabled').checked=settings.enabled;
    $('ai-voice-research').checked=settings.webResearch===true;
    fill('ai-voice-roles',result.roles,settings.allowedRoleIds);
    fill('ai-voice-channels',result.channels,settings.allowedChannelIds);
    const voices=[...result.voices];
    if(!voices.some(voice=>voice.id===settings.voice))voices.push({id:settings.voice,label:`${({'en_US-ljspeech-high':'LJ Speech (English, high quality)','en_US-lessac-medium':'Lessac (English)'})[settings.voice]||'Saved voice'} — unavailable`});
    fill('ai-voice-voice',voices,[settings.voice]);$('ai-voice-limit').value=settings.maxSessionSeconds;
  }
  function stopPolling(){clearTimeout(timer);timer=null;sequence++;request?.abort();request=null;}
  function poll(){clearTimeout(timer);if(enabled&&visible&&!document.hidden)timer=setTimeout(()=>void load(false),5000);}
  async function load(initial=true){
    if(!enabled||busy){poll();return;}
    const generation=++sequence,controller=new AbortController();request=controller;
    try{
      const response=await fetch(dashboardApiUrl('ai-voice'),{cache:'no-store',signal:controller.signal});
      const result=await response.json();
      if(generation!==sequence)return;
      if(!response.ok){
        if(response.status===401||response.status===403){enabled=false;fields.disabled=true;$('ai-voice-stop').disabled=true;stopPolling();}
        throw Error(result.error||'AI voice could not be loaded.');
      }
      render(result,!dirty);fields.disabled=busy||!enabled;
      if(initial&&!dirty)feedback('Settings loaded.');
    }catch(error){if(error.name!=='AbortError'&&generation===sequence)feedback(error.message,true);}
    finally{if(generation===sequence){request=null;poll();}}
  }
  form.addEventListener('input',()=>{markDirty(true);feedback('Unsaved changes.');});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!enabled||busy||!data||!form.reportValidity())return;
    stopPolling();busy=true;fields.disabled=true;form.setAttribute('aria-busy','true');feedback('Saving…');
    const settings={enabled:$('ai-voice-enabled').checked,webResearch:$('ai-voice-research').checked,allowedRoleIds:selected('ai-voice-roles'),allowedChannelIds:selected('ai-voice-channels'),voice:$('ai-voice-voice').value,maxSessionSeconds:Number($('ai-voice-limit').value)};
    try{const saved=await post('ai-voice/settings',settings);data={...data,settings:saved.settings||settings};markDirty(false);render(data,true);feedback(saved.sessionStopped?'AI voice settings saved. Any active session has ended.':'AI voice settings saved.');}
    catch(error){feedback(error.message,true);}
    finally{busy=false;fields.disabled=!enabled;form.removeAttribute('aria-busy');render(data,false);poll();}
  });
  $('ai-voice-stop').addEventListener('click',async()=>{
    if(!enabled||busy)return;busy=true;$('ai-voice-stop').disabled=true;
    try{await post('ai-voice/stop',{});feedback('AI voice stopped.');}
    catch(error){feedback(error.message,true);}
    finally{busy=false;void load(false);}
  });
  window.addEventListener('dexzu-state',event=>{
    enabled=event.detail?.server?.aiVoiceBeta===true;
    $('ai-voice-nav').hidden=!enabled;$('ai-voice-controls').hidden=!enabled;
    if(!enabled){fields.disabled=true;stopPolling();}else if(visible&&!data)void load();
  });
  window.addEventListener('dexzu-page',event=>{visible=event.detail.panel?.dataset.panel==='ai-voice';stopPolling();if(visible&&enabled)void load();});
  window.addEventListener('dexzu-discard',event=>{if(event.detail==='ai-voice'){markDirty(false);if(data)render(data,true);}});
  document.addEventListener('visibilitychange',()=>{stopPolling();if(!document.hidden&&visible&&enabled)void load(false);});
  window.addEventListener('pagehide',stopPolling);
})();

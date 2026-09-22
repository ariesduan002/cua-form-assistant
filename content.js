(() => {
  if (globalThis.__cuaFormAssistantLoaded) return;
  globalThis.__cuaFormAssistantLoaded = true;
  function fields() {
    return [...document.querySelectorAll('input, textarea, select')].filter(el => {
      const type = (el.type || '').toLowerCase();
      if (['hidden','password','file','submit','reset','button','image','checkbox','radio','date','datetime-local','time','color','range'].includes(type)) return false;
      if (el.disabled || el.readOnly || el.getAttribute('aria-hidden') === 'true') return false;
      const style = getComputedStyle(el);
      return el.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    });
  }
  function label(el) {
    const names = [...(el.labels || [])].map(item => item.innerText);
    names.push(...(el.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.innerText || ''));
    names.push(el.getAttribute('aria-label'));
    if (!names.some(item => String(item || '').trim())) {
      let container = el.parentElement;
      for (let depth = 0; depth < 3 && container; depth++, container = container.parentElement) {
        const directLabel = [...container.children].find(child => child.tagName === 'LABEL');
        if (directLabel && (container.querySelectorAll('input, select, textarea').length === 1 || el.tagName !== 'SELECT')) {
          names.push(directLabel.innerText);
          break;
        }
      }
    }
    names.push(el.placeholder, el.name, el.id);
    return names.map(item => String(item || '').trim()).find(Boolean) || 'Unnamed field';
  }
  function assign(el, value) {
    if (el instanceof HTMLSelectElement) {
      const normalize = text => String(text || '').trim().toLowerCase();
      const option = [...el.options].find(item => normalize(item.value) === normalize(value) || normalize(item.textContent) === normalize(value));
      if (!option) return false;
      el.value = option.value;
    } else {
      const prototype = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(el, value);
    }
    el.dispatchEvent(new Event('input', {bubbles: true}));
    el.dispatchEvent(new Event('change', {bubbles: true}));
    return true;
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'scan') {
      sendResponse({title: document.title, items: fields().map((el, index) => ({index, label: label(el), value: el.value || '', type: el.tagName.toLowerCase()}))});
    } else if (message.action === 'fill') {
      const current = fields();
      let filled = 0;
      for (const item of message.items || []) {
        const el = current[item.index];
        if (!el || label(el) !== item.label || el.value !== item.previous || !item.value) continue;
        if (el.value && !message.overwrite) continue;
        if (assign(el, item.value)) filled++;
      }
      sendResponse({filled});
    }
  });
})();

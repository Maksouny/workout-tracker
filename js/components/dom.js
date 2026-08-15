/* =========================================================================
   COMPONENTS — DOM HELPER
   Tiny hyperscript-style builder so components create real DOM nodes
   instead of HTML strings, plus a delegation helper so screens attach
   ONE listener per root instead of inline onclick/onchange/oninput.
   ========================================================================= */
App.Dom = (function(){

  /** h('div.card', {onClick:fn, style:{...}, dataset:{...}}, [children...]) */
  function h(tag, attrs, children){
    let tagName = tag, id = null, classes = [];
    const dotParts = tag.split('.');
    tagName = dotParts[0].split('#')[0] || 'div';
    const hashParts = tag.split('#');
    if(hashParts[1]) id = hashParts[1].split('.')[0];
    classes = tag.split('.').slice(1).map(c=>c.split('#')[0]);

    const el = document.createElement(tagName);
    if(id) el.id = id;
    if(classes.length) el.className = classes.join(' ');

    attrs = attrs || {};
    Object.keys(attrs).forEach(key=>{
      const val = attrs[key];
      if(val==null || val===false) return;
      if(key==='class' || key==='className'){ el.className = (el.className?el.className+' ':'')+val; }
      else if(key==='style' && typeof val==='object'){ Object.assign(el.style, val); }
      else if(key==='dataset'){ Object.keys(val).forEach(k=>{ el.dataset[k]=val[k]; }); }
      else if(key.startsWith('on') && typeof val==='function'){ el.addEventListener(key.slice(2).toLowerCase(), val); }
      else if(key==='html'){ el.innerHTML = val; } // escape hatch for the rare static SVG/markup block
      else if(key==='checked' || key==='disabled' || key==='selected' || key==='autofocus'){ el[key] = !!val; if(val) el.setAttribute(key,''); }
      else if(val!==undefined){ el.setAttribute(key, val); }
    });

    (children||[]).forEach(child=>append(el, child));
    return el;
  }
  function append(el, child){
    if(child==null || child===false) return;
    if(Array.isArray(child)){ child.forEach(c=>append(el,c)); return; }
    if(child instanceof Node){ el.appendChild(child); return; }
    el.appendChild(document.createTextNode(String(child)));
  }
  function text(str){ return document.createTextNode(str==null?'':String(str)); }
  function clear(el){ while(el.firstChild) el.removeChild(el.firstChild); }
  function replaceChildren(el, nodes){ clear(el); (Array.isArray(nodes)?nodes:[nodes]).forEach(n=>append(el,n)); }

  /**
   * Event delegation: one listener per root+eventType, dispatched by
   * data-action on the closest matching ancestor. Screens register a
   * handlers map instead of inline on* attributes.
   *   Dom.delegate(root, 'click', {save:(e,ds)=>..., 'toggle-like':(e,ds)=>...})
   */
  function delegate(root, eventType, handlers){
    root.addEventListener(eventType, e=>{
      let node = e.target;
      while(node && node!==root){
        const action = node.dataset && node.dataset.action;
        if(action && handlers[action]){ handlers[action](e, node.dataset, node); return; }
        node = node.parentElement;
      }
    });
  }

  return {h, text, clear, replaceChildren, delegate};
})();

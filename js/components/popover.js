/* =========================================================================
   COMPONENTS — PORTAL POPOVER
   Appended to <body> so it's never clipped by a scrolling card. Pure DOM
   utility — the caller supplies the HTML content and click handlers.
   ========================================================================= */
App.UI = App.UI || {};
App.UI.Popover = (function(){
  function close(){
    const pop = document.getElementById('activePortalPopover');
    if(!pop) return;
    if(pop._reposition){ window.removeEventListener('scroll', pop._reposition, true); window.removeEventListener('resize', pop._reposition); }
    document.removeEventListener('click', outsideClick, true);
    pop.remove();
  }
  function outsideClick(e){
    const pop = document.getElementById('activePortalPopover');
    if(!pop) return;
    if(pop.contains(e.target) || (pop._anchor && pop._anchor.contains(e.target))) return;
    close();
  }
  function position(anchorEl, pop){
    const r = anchorEl.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    let top = r.bottom + 8, left = r.left;
    if(left + pr.width > window.innerWidth - 8) left = window.innerWidth - pr.width - 8;
    if(left < 8) left = 8;
    if(top + pr.height > window.innerHeight - 8) top = r.top - pr.height - 8;
    if(top < 8) top = 8;
    pop.style.top = top+'px'; pop.style.left = left+'px';
  }
  function open(anchorEl, content){
    close();
    const pop = document.createElement('div');
    pop.className = 'portal-popover'; pop.id = 'activePortalPopover';
    if(content instanceof Node) pop.appendChild(content); else pop.innerHTML = content;
    document.body.appendChild(pop);
    position(anchorEl, pop);
    requestAnimationFrame(()=>pop.classList.add('show'));
    const reposition = ()=>position(anchorEl, pop);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    pop._reposition = reposition; pop._anchor = anchorEl;
    setTimeout(()=>document.addEventListener('click', outsideClick, true), 0);
    return pop;
  }
  return {open, close};
})();

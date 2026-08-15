/* =========================================================================
   COMPONENTS — UTILITIES
   Small helpers that aren't full components (ProgressRing/Chart/StatCard/
   etc. now live in primitives.js and cards.js as real DOM factories).
   ========================================================================= */
App.UI = (function(){
  const {h} = App.Dom;
  function esc(s){ return String(s==null?'':s); } // kept for legacy call sites; DOM text nodes escape automatically
  function emptyState(text){ return h('div.empty-state', {}, [text]); }
  function toast(text){
    let el = document.getElementById('appToast');
    if(!el){ el = document.createElement('div'); el.id='appToast'; el.className='toast'; document.body.appendChild(el); }
    el.textContent = text;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(()=>el.classList.remove('show'), 4000);
  }
  return {esc, emptyState, toast};
})();

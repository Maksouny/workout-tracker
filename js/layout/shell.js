/* =========================================================================
   LAYOUT — APP SHELL
   Knows only about *where* screens go and how the user moves between them
   (swipe, bottom nav, overview grid). Screen content itself is supplied
   by js/screens/*.js — this file never renders feature UI. The center
   "start workout" action is supplied by the caller (app.js) so Layout
   never has to know which screen owns that feature.
   ========================================================================= */
App.Layout = App.Layout || {};
App.Layout.Shell = (function(){
  const screensDef = []; // {id, icon, label, mount(container), onEnter?}
  let currentIndex = 0;
  let isOverview = false;
  let appEl, screenEls = [], navIconEls = [];
  let onStart = null;

  function register(def){ screensDef.push(def); }

  function init(rootSelector, opts={}){
    onStart = opts.onStart || null;
    appEl = document.querySelector(rootSelector);
    appEl.innerHTML = `
      <div class="overview-overlay" id="overviewOverlay"></div>
      <div class="bottom-nav" id="bottomNav"></div>
    `;
    // Screens are inserted before the chrome elements so they sit at the back in DOM order.
    screensDef.forEach((def, i)=>{
      const screen = document.createElement('div');
      screen.className = 'screen';
      screen.dataset.index = i;
      screen.innerHTML = `<div class="screen-content" id="screen-content-${def.id}"></div>`;
      appEl.insertBefore(screen, appEl.firstChild);
      screenEls.push(screen);
      def.mount(screen.querySelector('.screen-content'));
    });

    buildBottomNav();
    document.getElementById('overviewOverlay').addEventListener('click', closeOverview);
    screenEls.forEach((el,i)=>el.addEventListener('click', ()=>{ if(isOverview){ currentIndex=i; closeOverview(); updatePositions(); } }));

    bindSwipe();
    updatePositions();
  }

  function buildBottomNav(){
    const nav = document.getElementById('bottomNav');
    nav.innerHTML = '';
    const mid = Math.ceil(screensDef.length/2);
    const left = screensDef.slice(0, mid), right = screensDef.slice(mid);
    left.forEach((def,i)=>nav.appendChild(navIconButton(def, i)));
    const startBtn = document.createElement('button');
    startBtn.className = 'nav-start';
    startBtn.setAttribute('aria-label', 'Начать тренировку');
    startBtn.innerHTML = '<span>▶</span>';
    startBtn.addEventListener('click', ()=>{ if(onStart) onStart(); });
    nav.appendChild(startBtn);
    right.forEach((def,i)=>nav.appendChild(navIconButton(def, mid+i)));
  }
  function navIconButton(def, index){
    const btn = document.createElement('button');
    btn.className = 'nav-icon';
    btn.dataset.index = index;
    btn.innerHTML = `<span class="nav-icon-glyph">${def.icon||'•'}</span>`;
    btn.addEventListener('click', ()=>goTo(index));
    navIconEls.push(btn);
    return btn;
  }

  function updatePositions(){
    screenEls.forEach((el,i)=>{
      const pos = i - currentIndex;
      el.dataset.pos = (pos<-2||pos>2) ? 'far' : pos;
    });
    navIconEls.forEach(btn=>btn.classList.toggle('active', parseInt(btn.dataset.index)===currentIndex));
    const def = screensDef[currentIndex];
    if(def && typeof def.onEnter==='function') def.onEnter();
  }

  function goTo(i){
    if(i<0 || i>=screensDef.length) return;
    currentIndex = i;
    closeOverview();
    updatePositions();
  }
  function next(){ if(currentIndex<screensDef.length-1){ currentIndex++; updatePositions(); } }
  function prev(){ if(currentIndex>0){ currentIndex--; updatePositions(); } }

  function toggleOverview(){
    isOverview = !isOverview;
    appEl.classList.toggle('overview', isOverview);
    layoutOverviewGrid();
  }
  function closeOverview(){
    if(!isOverview) return;
    isOverview = false;
    appEl.classList.remove('overview');
  }
  function layoutOverviewGrid(){
    if(!isOverview) return;
    const cols = 2;
    const n = screensDef.length;
    const rows = Math.ceil(n/cols);
    screenEls.forEach((el,i)=>{
      const col = i%cols, row = Math.floor(i/cols);
      el.style.transform = `translate(${3+col*100}%, ${5+row*(96/rows)}%) scale(${0.9/cols})`;
      el.dataset.pos = 0;
    });
  }

  function isInteractiveTarget(target){
    return !!(target && target.closest && target.closest('select, input, textarea, button, a, label, .btn, [data-action]'));
  }

  function bindSwipe(){
    let startX=0, startY=0, dragging=false, mouseDown=false;
    appEl.addEventListener('touchstart', e=>{
      if(isOverview || isInteractiveTarget(e.target)) return;
      startX=e.touches[0].clientX; startY=e.touches[0].clientY; dragging=true;
    }, {passive:true});
    appEl.addEventListener('touchmove', e=>{
      if(!dragging||isOverview) return;
      const dx=e.touches[0].clientX-startX, dy=e.touches[0].clientY-startY;
      if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>10) e.preventDefault();
    }, {passive:false});
    appEl.addEventListener('touchend', e=>{
      if(!dragging||isOverview) return;
      dragging=false;
      const dx=e.changedTouches[0].clientX-startX, dy=e.changedTouches[0].clientY-startY;
      if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>50){ dx>0 ? prev() : next(); }
    }, {passive:true});
    appEl.addEventListener('mousedown', e=>{
      if(isOverview || isInteractiveTarget(e.target)) return;
      mouseDown=true; startX=e.clientX;
    });
    appEl.addEventListener('mouseup', e=>{
      if(!mouseDown||isOverview) return; mouseDown=false;
      if(isInteractiveTarget(e.target)) return;
      const dx=e.clientX-startX;
      if(Math.abs(dx)>80){ dx>0 ? prev() : next(); }
    });
  }

  return {register, init, goTo, next, prev, toggleOverview, closeOverview, refresh:updatePositions};
})();

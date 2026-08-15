/* =========================================================================
   SCREENS — SHARED TABBED-SCREEN SHELL
   Each of the 4 top-level screens (Training/Home/Health/Settings) is a
   header + a Tabs component for its sections + a body region. Switching
   a sub-tab only replaces the body region — the header/tab bar and the
   rest of the app are untouched.
   ========================================================================= */
App.Screens = App.Screens || {};
App.Screens.makeTabbedScreen = function({icon, label, title, subtitle, sections, defaultKey, onTitleClick}){
  const {h, clear} = App.Dom;
  let activeKey = defaultKey || sections[0].key;
  let bodyEl, tabs, headerEl;
  let mounted = false;

  function renderBody(){
    clear(bodyEl);
    const section = sections.find(s=>s.key===activeKey) || sections[0];
    section.build(bodyEl);
  }

  function mount(container){
    const titleEl = h('div.screen-header', {style:onTitleClick?{cursor:'pointer',userSelect:'none'}:{}}, [title]);
    if(onTitleClick) titleEl.addEventListener('click', onTitleClick);
    headerEl = h('div', {}, [
      titleEl,
      h('div.screen-sub', {}, [subtitle]),
    ]);
    tabs = App.Components.Tabs({
      items: sections.map(s=>({key:s.key, label:s.label})),
      active: activeKey,
      onChange(key){ activeKey = key; renderBody(); },
    });
    bodyEl = h('div');
    clear(container);
    container.appendChild(headerEl);
    container.appendChild(tabs.el);
    container.appendChild(bodyEl);
    renderBody();
    mounted = true;
  }

  function onEnter(){ if(mounted) renderBody(); }
  function goToSection(key){ activeKey = key; if(tabs) tabs.setActive(key); if(mounted) renderBody(); }

  return {mount, onEnter, icon, label, goToSection};
};

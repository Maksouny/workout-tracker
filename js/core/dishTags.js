/* =========================================================================
   CORE — DISH TAGS
   ========================================================================= */
App.Core = App.Core || {};
App.Core.DishTags = (function(){
  const S = App.State;
  function load(){ return S.get('dishTagOptions'); }
  function save(arr){ S.set('dishTagOptions', arr); }
  function addCustom(name){
    name = (name||'').trim();
    if(!name) return {ok:false};
    const options = load();
    if(!options.includes(name)){ options.push(name); save(options); }
    return {ok:true, name};
  }
  return {load, save, addCustom};
})();

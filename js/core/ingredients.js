/* =========================================================================
   CORE — INGREDIENTS
   ========================================================================= */
App.Core = App.Core || {};
App.Core.Ingredients = (function(){
  const S = App.State;
  function load(){
    const saved = S.get('ingredients');
    if(saved) return saved;
    const seed = App.Core.CookingMethods.DEFAULT_INGREDIENTS;
    S.set('ingredients', seed);
    return seed.slice();
  }
  function save(arr){ S.set('ingredients', arr); }
  function add(ing){
    const list = load();
    const clean = {name:(ing.name||'').trim(), kcal:+ing.kcal||0, protein:+ing.protein||0, fat:+ing.fat||0,
      carb:+ing.carb||0, fiber:+ing.fiber||0, price:+ing.price||0};
    if(ing.pieceWeight!=null && ing.pieceWeight!=='') clean.pieceWeight = +ing.pieceWeight||0;
    if(ing.pricePiece!=null && ing.pricePiece!=='') clean.pricePiece = +ing.pricePiece||0;
    list.push(clean);
    save(list);
    return clean;
  }
  function remove(index){ const list = load(); list.splice(index,1); save(list); }
  function pricePer100(ing){
    if(!ing) return 0;
    if(ing.pricePiece && ing.pieceWeight) return ing.pricePiece/ing.pieceWeight*100;
    return ing.price||0;
  }
  return {load, save, add, remove, pricePer100};
})();

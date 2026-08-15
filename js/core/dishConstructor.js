/* =========================================================================
   CORE — DISH CONSTRUCTOR
   Holds the in-progress "chain" of ingredient/method columns. This is
   editor state (not persisted data) so it lives here as module state,
   same role as the old global `dishColumns`, just without any DOM code.
   ========================================================================= */
App.Core = App.Core || {};
App.Core.DishConstructor = (function(){
  const S = App.State;
  const Ing = ()=>App.Core.Ingredients;
  const Methods = ()=>App.Core.CookingMethods.COOKING_METHODS;

  function newIngItem(){ return {ingredientIndex:0, qty:100}; }
  function newIngColumn(){ return {type:'ing', items:[newIngItem()]}; }
  function newMethodColumn(){ return {type:'method', methodIndex:0}; }
  function freshColumns(){ return [newIngColumn()]; }

  let columns = freshColumns();
  let selectedTags = [];

  function getColumns(){ return columns; }
  function reset(){ columns = freshColumns(); selectedTags = []; }

  function addColumnPair(){ columns.push(newMethodColumn(), newIngColumn()); }
  function addBranchIngredient(ci){ columns[ci].items.push(newIngItem()); }
  function removeChainItem(ci, ii){
    columns[ci].items.splice(ii,1);
    if(!columns[ci].items.length) columns[ci].items.push(newIngItem());
  }
  function setIngredient(ci, ii, ingredientIndex){ columns[ci].items[ii].ingredientIndex = parseInt(ingredientIndex); }
  function setQty(ci, ii, qty){ columns[ci].items[ii].qty = parseFloat(qty)||0; }
  function setMethod(ci, methodIndex){ columns[ci].methodIndex = parseInt(methodIndex); }

  function methodMultAfter(ci){
    const next = columns[ci+1];
    if(next && next.type==='method') return Methods()[next.methodIndex];
    return Methods()[0];
  }

  function calc(){
    const ingredients = Ing().load();
    let rawWeight=0, cookedWeight=0, kcal=0, protein=0, fat=0, carb=0, fiber=0, priceAuto=0;
    columns.forEach((col,ci)=>{
      if(col.type!=='ing') return;
      const mult = methodMultAfter(ci).mult;
      col.items.forEach(item=>{
        const ing = ingredients[item.ingredientIndex];
        if(!ing) return;
        const grams = item.qty||0;
        rawWeight += grams;
        cookedWeight += grams*mult;
        kcal += grams/100*ing.kcal;
        protein += grams/100*ing.protein;
        fat += grams/100*ing.fat;
        carb += grams/100*ing.carb;
        fiber += grams/100*(ing.fiber||0);
        priceAuto += grams/100*Ing().pricePer100(ing);
      });
    });
    return {rawWeight, cookedWeight, kcal, protein, fat, carb, fiber, priceAuto};
  }

  function toggleTag(t){
    if(selectedTags.includes(t)) selectedTags = selectedTags.filter(x=>x!==t);
    else selectedTags.push(t);
  }
  function getSelectedTags(){ return selectedTags; }

  function saveDish(name){
    name = (name||'').trim();
    if(!name) return {ok:false, error:'name'};
    const totals = calc();
    const ingredients = Ing().load();
    const composition = [];
    columns.forEach((col,ci)=>{
      if(col.type!=='ing') return;
      const methodName = methodMultAfter(ci).name;
      col.items.forEach(item=>{
        const ing = ingredients[item.ingredientIndex];
        if(!ing) return;
        composition.push({name:ing.name, rawGrams:Math.round(item.qty||0), method:methodName});
      });
    });
    const dishes = S.get('dishes');
    const id = dishes.length ? Math.max(...dishes.map(d=>d.id))+1 : 1;
    dishes.push({
      id, name, tags: selectedTags.slice(), favorite:'none', composition,
      rawWeight: Math.round(totals.rawWeight), cookedWeight: Math.round(totals.cookedWeight),
      kcal: Math.round(totals.kcal), protein: Math.round(totals.protein*10)/10,
      fat: Math.round(totals.fat*10)/10, carb: Math.round(totals.carb*10)/10,
      fiber: Math.round(totals.fiber*10)/10, price: Math.round(totals.priceAuto),
    });
    S.set('dishes', dishes);
    reset();
    return {ok:true};
  }

  function deleteDish(id){ S.set('dishes', S.get('dishes').filter(d=>d.id!==id)); }
  function toggleFavorite(id){
    const dishes = S.get('dishes');
    const d = dishes.find(x=>x.id===id);
    if(!d) return null;
    const order = {none:'liked', liked:'disliked', disliked:'none'};
    d.favorite = order[d.favorite||'none'];
    S.set('dishes', dishes);
    return d.favorite;
  }
  function favoriteLabel(fav){
    if(fav==='liked') return '★ Любимое';
    if(fav==='disliked') return '👎 Не нравится';
    return '☆ Отметить';
  }

  function listDishes(){ return S.get('dishes'); }

  return {
    listDishes,
    getColumns, reset, addColumnPair, addBranchIngredient, removeChainItem,
    setIngredient, setQty, setMethod, methodMultAfter, calc,
    toggleTag, getSelectedTags, saveDish, deleteDish, toggleFavorite, favoriteLabel,
  };
})();

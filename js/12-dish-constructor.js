// ---------------------------------------------------------------------
// Dish constructor — horizontal chains (Ingredient -> Method -> Ingredient
// -> Method -> ...), several chains stack top to bottom. Clicking an
// ingredient node opens a popover below it with qty + unit + price.
// ---------------------------------------------------------------------
function newIngItem(){ return {ingredientIndex:0, qty:100}; }
function newIngColumn(){ return {type:'ing', items:[newIngItem()]}; }
function newMethodColumn(){ return {type:'method', methodIndex:0}; }
function freshDishColumns(){ return [newIngColumn()]; } // starts (and by default ends) on an ingredient — a trailing
  // method column is only added when the user explicitly clicks "+", which prevents two method
  // selects ever appearing back to back.
let dishColumns = freshDishColumns();

function addColumnPair(){
  closePortalPopover();
  dishColumns.push(newMethodColumn(), newIngColumn());
  renderDishChains();
  requestAnimationFrame(()=>{
    const row = document.getElementById('chainRow0');
    if(row) row.scrollLeft = row.scrollWidth;
  });
}
function addBranchIngredient(ci){
  closePortalPopover();
  dishColumns[ci].items.push(newIngItem());
  renderDishChains();
}
function removeChainItem(ci, ii){
  closePortalPopover();
  dishColumns[ci].items.splice(ii,1);
  if(!dishColumns[ci].items.length) dishColumns[ci].items.push(newIngItem());
  renderDishChains();
}

function ingNodeLabelHtml(ci, ii){
  const item = dishColumns[ci].items[ii];
  const ing = loadIngredients()[item.ingredientIndex];
  return `<div class="node-name">${ing?ing.name:'—'}</div><div class="node-sub">${formatDishWeight(item.qty||0)}</div>`;
}
function updateChainNodeLabel(ci, ii){
  const nodeEl = document.querySelector(`.ing-node[data-ci="${ci}"][data-ii="${ii}"]`);
  if(nodeEl) nodeEl.innerHTML = ingNodeLabelHtml(ci, ii);
}
function ingredientPopoverHtml(ci, ii){
  const item = dishColumns[ci].items[ii];
  const ingredients = loadIngredients();
  const ingOpts = ingredients.map((x,xi)=>`<option value="${xi}" ${xi===item.ingredientIndex?'selected':''}>${x.name}</option>`).join('');
  return `
    <div class="popover-title">Ингредиент</div>
    <select class="popover-ing-select" onchange="onChainIngredientChange(${ci},${ii},this.value)">${ingOpts}</select>
    <div class="popover-row">
      <input type="number" value="${item.qty}" oninput="onChainQtyChange(${ci},${ii},this.value)">
      <span style="font-size:11px;color:var(--muted);white-space:nowrap;">г (сырых)</span>
    </div>
    <div class="popover-meta" id="popoverMeta">—</div>
    <button class="btn secondary small" style="margin-top:10px;width:100%;" onclick="removeChainItem(${ci},${ii})">✕ Удалить ингредиент</button>
  `;
}
function updatePopoverMeta(ci, ii){
  const meta = document.getElementById('popoverMeta');
  if(!meta) return;
  const item = dishColumns[ci].items[ii];
  const ing = loadIngredients()[item.ingredientIndex];
  const grams = item.qty||0;
  const cost = grams/100*ingredientPricePer100(ing);
  meta.textContent = `${formatDishWeight(grams)} · ${Math.round(cost)} руб`;
}
function onChainIngredientChange(ci, ii, val){
  dishColumns[ci].items[ii].ingredientIndex = parseInt(val);
  updateChainNodeLabel(ci, ii);
  updatePopoverMeta(ci, ii);
  calcDish();
}
function onChainQtyChange(ci, ii, val){
  dishColumns[ci].items[ii].qty = parseFloat(val)||0;
  updateChainNodeLabel(ci, ii);
  updatePopoverMeta(ci, ii);
  calcDish();
}
function openIngredientPopover(e, ci, ii){
  e.stopPropagation();
  const anchor = e.currentTarget;
  openPortalPopover(anchor, ingredientPopoverHtml(ci, ii));
  updatePopoverMeta(ci, ii);
}

// method mult that governs a given ingredient column: the method column
// immediately to its right, or "raw" (mult 1) if the chain ends there
function methodMultAfter(ci){
  const next = dishColumns[ci+1];
  if(next && next.type==='method') return COOKING_METHODS[next.methodIndex];
  return COOKING_METHODS[0];
}

function columnHtml(col, ci){
  const methodOptionsHtml = (selectedMi)=>COOKING_METHODS.map((m,mi)=>`<option value="${mi}" ${mi===selectedMi?'selected':''}>${m.name}</option>`).join('');
  if(col.type==='method'){
    return `<div class="chain-node method-node">
      <select onchange="dishColumns[${ci}].methodIndex=parseInt(this.value);calcDish();">${methodOptionsHtml(col.methodIndex)}</select>
    </div>`;
  }
  const ingredients = loadIngredients();
  const stackHtml = col.items.map((item,ii)=>{
    const ing = ingredients[item.ingredientIndex];
    const node = `<div class="chain-node ing-node" data-ci="${ci}" data-ii="${ii}" onclick="openIngredientPopover(event,${ci},${ii})">
      <div class="node-name">${ing?ing.name:'—'}</div><div class="node-sub">${formatDishWeight(item.qty||0)}</div>
    </div>`;
    const connector = ii<col.items.length-1 ? `<div class="stack-connector">↓</div>` : '';
    return node + connector;
  }).join('');
  return `<div class="ing-stack">
    ${stackHtml}
    <div class="stack-add" onclick="addBranchIngredient(${ci})" title="Добавить ингредиент ниже, под текущим">+</div>
  </div>`;
}

function renderDishChains(){
  const el = document.getElementById('dishChains');
  if(!el) return;
  const partsHtml = dishColumns.map((col,ci)=> (ci>0?'<span class="chain-arrow">→</span>':'') + columnHtml(col,ci)).join('');
  el.innerHTML = `<div class="chain-row" id="chainRow0">
    ${partsHtml}
    <span class="chain-arrow">→</span>
    <div class="chain-add-node" onclick="addColumnPair()" title="Добавить способ готовки и ингредиент">+</div>
  </div>`;
  calcDish();
}

function calcDish(){
  const ingredients = loadIngredients();
  let rawWeight=0, cookedWeight=0, kcal=0, protein=0, fat=0, carb=0, fiber=0, priceAuto=0;
  dishColumns.forEach((col,ci)=>{
    if(col.type!=='ing') return;
    const mult = methodMultAfter(ci).mult;
    col.items.forEach(item=>{
      const ing = ingredients[item.ingredientIndex];
      if(!ing) return;
      const grams = item.qty||0;
      const cooked = grams*mult;
      rawWeight += grams;
      cookedWeight += cooked;
      kcal += grams/100*ing.kcal;
      protein += grams/100*ing.protein;
      fat += grams/100*ing.fat;
      carb += grams/100*ing.carb;
      fiber += grams/100*(ing.fiber||0);
      priceAuto += grams/100*ingredientPricePer100(ing);
    });
  });
  document.getElementById('dishRawWeight').textContent = formatDishWeight(rawWeight);
  document.getElementById('dishCookedWeight').textContent = formatDishWeight(cookedWeight);
  document.getElementById('dishKcal').textContent = Math.round(kcal);
  document.getElementById('dishProtein').textContent = Math.round(protein*10)/10+' г';
  document.getElementById('dishFat').textContent = Math.round(fat*10)/10+' г';
  document.getElementById('dishCarb').textContent = Math.round(carb*10)/10+' г';
  document.getElementById('dishFiber').textContent = Math.round(fiber*10)/10+' г';
  document.getElementById('dishPriceAuto').textContent = Math.round(priceAuto)+' руб';
  return {rawWeight, cookedWeight, kcal, protein, fat, carb, fiber, priceAuto};
}

function saveDish(){
  const name = document.getElementById('dishName').value.trim();
  if(!name){ alert('Укажи название блюда'); return; }
  const totals = calcDish();
  const price = totals.priceAuto;
  const tagsRaw = document.getElementById('dishTags').value.trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t=>t.trim()).filter(Boolean) : [];

  const ingredients = loadIngredients();
  const composition = [];
  dishColumns.forEach((col,ci)=>{
    if(col.type!=='ing') return;
    const methodName = methodMultAfter(ci).name;
    col.items.forEach(item=>{
      const ing = ingredients[item.ingredientIndex];
      if(!ing) return;
      composition.push({name:ing.name, rawGrams:Math.round(item.qty||0), method:methodName});
    });
  });

  const dishes = loadDishes();
  const id = dishes.length ? Math.max(...dishes.map(d=>d.id))+1 : 1;
  dishes.push({
    id, name, tags, favorite:'none', composition,
    rawWeight: Math.round(totals.rawWeight),
    cookedWeight: Math.round(totals.cookedWeight),
    kcal: Math.round(totals.kcal),
    protein: Math.round(totals.protein*10)/10,
    fat: Math.round(totals.fat*10)/10,
    carb: Math.round(totals.carb*10)/10,
    fiber: Math.round(totals.fiber*10)/10,
    price: Math.round(price)
  });
  saveDishes(dishes);

  document.getElementById('dishName').value='';
  document.getElementById('dishTags').value='';
  selectedDishTags = [];
  renderDishTagChips();
  dishColumns = freshDishColumns();
  renderDishChains();
  renderDishList();
}

function deleteDish(id){
  let dishes = loadDishes();
  dishes = dishes.filter(d=>d.id!==id);
  saveDishes(dishes);
  renderDishList();
}

function toggleFavorite(id){
  const dishes = loadDishes();
  const d = dishes.find(x=>x.id===id);
  if(!d) return;
  const order = {none:'liked', liked:'disliked', disliked:'none'};
  d.favorite = order[d.favorite||'none'];
  saveDishes(dishes);
  renderDishList();
}

function favoriteLabel(fav){
  if(fav==='liked') return '★ Любимое';
  if(fav==='disliked') return '👎 Не нравится';
  return '☆ Отметить';
}

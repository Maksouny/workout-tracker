// ---------------------------------------------------------------------
// Ingredients table
// ---------------------------------------------------------------------
function toggleIngredientBlock(){
  const block = document.getElementById('ingredientBlock');
  const btn = document.getElementById('ingToggleBtn');
  const isHidden = block.style.display === 'none';
  block.style.display = isHidden ? 'block' : 'none';
  btn.textContent = isHidden ? 'Скрыть список ингредиентов' : 'Показать список ингредиентов';
}

function renderIngredients(){
  const ingredients = loadIngredients();
  const searchEl = document.getElementById('ingredientSearch');
  const search = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const tbody = document.getElementById('ingredientTable');
  const filtered = ingredients
    .map((ing,i)=>({ing,i}))
    .filter(({ing})=> !search || ing.name.toLowerCase().includes(search));
  tbody.innerHTML = filtered.map(({ing,i})=>`<tr>
    <td><b>${ing.name}</b></td>
    <td class="mono">${ing.kcal}</td>
    <td class="mono">${ing.protein}</td>
    <td class="mono">${ing.fat}</td>
    <td class="mono">${ing.carb}</td>
    <td class="mono">${ing.fiber||0}</td>
    <td class="mono">${ing.price||0}</td>
    <td class="mono">${ing.pieceWeight ? ing.pieceWeight+' г' : '—'}</td>
    <td class="mono">${ing.pricePiece ? ing.pricePiece : '—'}</td>
    <td><span style="color:var(--danger);cursor:pointer;" onclick="deleteIngredient(${i})">✕</span></td>
  </tr>`).join('') || '<tr><td colspan="10" class="note">Ничего не найдено</td></tr>';
  refreshDishIngredientOptions();
}

function addIngredient(){
  const name = document.getElementById('newIngName').value.trim();
  const kcal = parseFloat(document.getElementById('newIngKcal').value)||0;
  const protein = parseFloat(document.getElementById('newIngProtein').value)||0;
  const fat = parseFloat(document.getElementById('newIngFat').value)||0;
  const carb = parseFloat(document.getElementById('newIngCarb').value)||0;
  const fiber = parseFloat(document.getElementById('newIngFiber').value)||0;
  const price = parseFloat(document.getElementById('newIngPrice').value)||0;
  const pieceWeightRaw = document.getElementById('newIngPieceWeight').value;
  const piecePriceRaw = document.getElementById('newIngPiecePrice').value;
  if(!name){ alert('Укажи название ингредиента'); return; }
  const ingredients = loadIngredients();
  const ing = {name, kcal, protein, fat, carb, fiber, price};
  if(pieceWeightRaw!=='') ing.pieceWeight = parseFloat(pieceWeightRaw)||0;
  if(piecePriceRaw!=='') ing.pricePiece = parseFloat(piecePriceRaw)||0;
  ingredients.push(ing);
  saveIngredients(ingredients);
  ['newIngName','newIngKcal','newIngProtein','newIngFat','newIngCarb','newIngFiber','newIngPrice','newIngPieceWeight','newIngPiecePrice']
    .forEach(id=>document.getElementById(id).value='');
  renderIngredients();
}

function deleteIngredient(index){
  const ingredients = loadIngredients();
  ingredients.splice(index,1);
  saveIngredients(ingredients);
  renderIngredients();
}

// Effective price per 100g of raw ingredient, whichever way it was priced
function ingredientPricePer100(ing){
  if(!ing) return 0;
  if(ing.pricePiece && ing.pieceWeight){
    return ing.pricePiece / ing.pieceWeight * 100;
  }
  return ing.price||0;
}

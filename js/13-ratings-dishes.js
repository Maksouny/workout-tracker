// ---------------------------------------------------------------------
// Multi-criteria rating system (dishes & exercises)
// ---------------------------------------------------------------------
const DISH_RATING_CRITERIA = [
  {key:'taste', label:'Вкус'},
  {key:'satiety', label:'Сытость'},
  {key:'easiness', label:'Простота готовки'},
  {key:'value', label:'Цена/качество'},
  {key:'repeat', label:'Готовил(а) бы ещё'},
  {key:'family', label:'Понравилось бы близким'},
];
const EXERCISE_RATING_CRITERIA = [
  {key:'effectiveness', label:'Ощущаемая эффективность'},
  {key:'enjoyment', label:'Удовольствие от процесса'},
  {key:'difficulty', label:'Сложность выполнения'},
  {key:'fatigue', label:'Утомляемость после'},
  {key:'mood', label:'Настроение после'},
  {key:'equipment', label:'Удобство/доступность места'},
];

function starRow(entityType, entityId, key, current){
  let stars = '';
  for(let i=1;i<=5;i++){
    stars += `<span class="star ${i<=current?'filled':''}" onclick="setRating('${entityType}',${entityId},'${key}',${i})">★</span>`;
  }
  return `<span class="star-rate">${stars}</span>`;
}

function setRating(entityType, entityId, key, value){
  if(entityType==='dish'){
    const dishes = loadDishes();
    const d = dishes.find(x=>x.id===entityId);
    if(!d) return;
    if(!d.ratings) d.ratings = {};
    d.ratings[key] = (d.ratings[key]===value) ? 0 : value;
    saveDishes(dishes);
    renderDishList();
  } else if(entityType==='ratingFlow'){
    const exName = ratingFlow.exercises[entityId];
    if(!ratingFlow.ratings[exName]) ratingFlow.ratings[exName] = {};
    ratingFlow.ratings[exName][key] = (ratingFlow.ratings[exName][key]===value) ? 0 : value;
    renderRatingFlowStep();
  }
}

function ratingAverage(ratings, criteria){
  const vals = criteria.map(c=>ratings[c.key]||0).filter(v=>v>0);
  return vals.length ? Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*10)/10 : null;
}

function dishRatingsHtml(d){
  const ratings = d.ratings || {};
  const avg = ratingAverage(ratings, DISH_RATING_CRITERIA);
  return `<details class="rating-toggle">
    <summary>Подробные оценки${avg!==null?` · <span class="rating-avg">${avg}/5</span>`:''}</summary>
    <div class="rating-grid" style="margin-top:8px;">
      ${DISH_RATING_CRITERIA.map(c=>`<span>${c.label}</span>${starRow('dish', d.id, c.key, ratings[c.key]||0)}`).join('')}
    </div>
  </details>`;
}

// Exercise ratings are collected only right after a workout (see
// js/03-workout-session.js — post-session rating flow) and saved into the
// ratings history log. The reference page shows the average FROM THAT
// HISTORY, read-only — muscle groups & this average aren't hand-edited here.
function exerciseRatingsHtml(e, i){
  const stats = exerciseRatingHistoryAverage(e.name);
  if(!stats.count){
    return `<div class="note" style="margin-top:10px;">Оценок пока нет — появятся после того, как оценишь упражнение по завершении тренировки.</div>`;
  }
  return `<details class="rating-toggle">
    <summary>Средние оценки по истории (${stats.count})${stats.overall!==null?` · <span class="rating-avg">${stats.overall}/5</span>`:''}</summary>
    <div class="rating-grid" style="margin-top:8px;">
      ${stats.perCriteria.map(c=>`<span>${c.label}</span><span class="mono" style="color:var(--accent);">${c.avg!==null?c.avg+'/5':'—'}</span>`).join('')}
    </div>
  </details>`;
}

function toggleResultsBlock(){
  const block = document.getElementById('resultsBlock');
  const btn = document.getElementById('resultsToggleBtn');
  const isHidden = block.style.display === 'none';
  block.style.display = isHidden ? 'block' : 'none';
  btn.textContent = isHidden ? 'Скрыть' : 'Показать все';
}

function toggleDishBlock(){
  const block = document.getElementById('dishBlock');
  const btn = document.getElementById('dishToggleBtn');
  const isHidden = block.style.display === 'none';
  block.style.display = isHidden ? 'block' : 'none';
  btn.textContent = isHidden ? 'Скрыть наши блюда' : 'Показать наши блюда';
}

function dishCardHtml(d){
  const per100 = d.cookedWeight>0 ? {
    kcal: Math.round(d.kcal/d.cookedWeight*100),
    protein: Math.round(d.protein/d.cookedWeight*100*10)/10,
    fat: Math.round(d.fat/d.cookedWeight*100*10)/10,
    carb: Math.round(d.carb/d.cookedWeight*100*10)/10,
    fiber: Math.round((d.fiber||0)/d.cookedWeight*100*10)/10,
  } : {kcal:0,protein:0,fat:0,carb:0,fiber:0};
  const compositionHtml = (d.composition && d.composition.length) ? `
    <details style="margin-top:8px;">
      <summary style="cursor:pointer;font-size:11px;color:var(--muted);">Состав (${d.composition.length})</summary>
      <div class="note" style="margin-top:6px;">
        ${d.composition.map(c=>`${c.name} — <b>${formatDishWeight(c.rawGrams)}</b>${c.method && c.method.indexOf('Без обработки')===-1 ? ' · '+c.method : ''}`).join('<br>')}
      </div>
    </details>` : '';
  return `<div class="dish-card">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div class="name">${d.name}</div>
      <div style="display:flex;gap:10px;align-items:center;">
        <span style="cursor:pointer;font-size:11px;color:var(--muted);" onclick="toggleFavorite(${d.id})">${favoriteLabel(d.favorite)}</span>
        <span style="color:var(--danger);cursor:pointer;font-size:12px;" onclick="deleteDish(${d.id})">✕ удалить</span>
      </div>
    </div>
    <div class="pill-row">
      <span>Вес готового: <b>${formatDishWeight(d.cookedWeight)}</b></span>
      <span>Цена: <b>${d.price} руб</b></span>
    </div>
    <div class="pill-row" style="margin-top:6px;">
      <span>Всего: <b>${d.kcal} ккал</b> / Б <b>${d.protein}</b> / Ж <b>${d.fat}</b> / У <b>${d.carb}</b> / Клетчатка <b>${d.fiber||0}</b></span>
    </div>
    <div class="pill-row" style="margin-top:6px;">
      <span>На 100г: <b>${per100.kcal} ккал</b> / Б <b>${per100.protein}</b> / Ж <b>${per100.fat}</b> / У <b>${per100.carb}</b> / Клетчатка <b>${per100.fiber}</b></span>
    </div>
    ${compositionHtml}
    ${dishRatingsHtml(d)}
  </div>`;
}

function renderDishList(){
  const dishes = loadDishes();
  const el = document.getElementById('dishList');
  const searchEl = document.getElementById('dishSearch');
  const search = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const visible = search ? dishes.filter(d=>{
    const inName = d.name.toLowerCase().includes(search);
    const inTags = (d.tags||[]).some(t=>t.toLowerCase().includes(search));
    return inName || inTags;
  }) : dishes;
  if(!dishes.length){ el.innerHTML = '<div class="note">Пока нет сохранённых блюд</div>'; return; }
  if(!visible.length){ el.innerHTML = '<div class="note">Ничего не найдено</div>'; return; }

  const folders = {};
  visible.forEach(d=>{
    const tags = (d.tags && d.tags.length) ? d.tags : ['Без тега'];
    tags.forEach(t=>{
      if(!folders[t]) folders[t]=[];
      folders[t].push(d);
    });
  });

  el.innerHTML = Object.keys(folders).sort().map(tag=>`
    <details style="margin-bottom:10px;" ${search?'open':''}>
      <summary style="cursor:pointer;font-family:'Oswald',sans-serif;text-transform:uppercase;letter-spacing:.03em;
        color:var(--accent);font-size:13px;padding:8px 0;">${tag} (${folders[tag].length})</summary>
      <div style="padding-top:8px;">${folders[tag].map(dishCardHtml).join('')}</div>
    </details>
  `).join('');
}

// ---------------------------------------------------------------------
// Разнообразие питания
// Анализирует повторяемость блюд по журналу приёмов пищи (loadMealLog(),
// js/05-storage.js: записи вида {date, slot, dishId}) за скользящее окно
// и рассчитывает показатель разнообразия — нормализованную энтропию
// Шеннона (0 = всегда одно и то же блюдо, 100 = каждый приём пищи другое
// блюдо). Не зависит от других модулей и не трогает интерфейс.
// ---------------------------------------------------------------------
const DIET_DIVERSITY_WINDOW_DAYS = 30;

/**
 * Повторяемость блюд: сколько раз каждое dishId встретилось в журнале
 * приёмов пищи за последние `days` дней.
 * @param {number} [days=DIET_DIVERSITY_WINDOW_DAYS]
 * @returns {Object.<number, number>} {dishId: количество приёмов пищи}
 */
function dishRepetitionCounts(days){
  const windowDays = days || DIET_DIVERSITY_WINDOW_DAYS;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate()-windowDays);
  const cutoffStr = cutoff.toISOString().slice(0,10);
  const log = loadMealLog().filter(e=>e.date>=cutoffStr);
  const counts = {};
  log.forEach(e=>{ counts[e.dishId] = (counts[e.dishId]||0)+1; });
  return counts;
}

/**
 * Рассчитывает показатель разнообразия питания за скользящее окно.
 * Использует нормализованную энтропию Шеннона по частоте блюд: чем более
 * равномерно распределены приёмы пищи между разными блюдами (и чем больше
 * самих блюд), тем выше показатель.
 * @param {number} [days=DIET_DIVERSITY_WINDOW_DAYS]
 * @returns {{index:number|null, uniqueDishes:number, totalMeals:number}}
 *   index — 0..100 (null, если за период не было ни одного приёма пищи)
 */
function calculateDietDiversityIndex(days){
  const counts = dishRepetitionCounts(days);
  const dishIds = Object.keys(counts);
  const totalMeals = dishIds.reduce((sum,id)=>sum+counts[id], 0);
  if(!totalMeals) return {index:null, uniqueDishes:0, totalMeals:0};

  const uniqueDishes = dishIds.length;
  if(uniqueDishes===1) return {index:0, uniqueDishes, totalMeals};

  let entropy = 0;
  dishIds.forEach(id=>{
    const p = counts[id]/totalMeals;
    entropy -= p*Math.log2(p);
  });
  const maxEntropy = Math.log2(uniqueDishes);
  const normalized = maxEntropy>0 ? entropy/maxEntropy : 0;
  return {index: Math.round(normalized*100), uniqueDishes, totalMeals};
}

/**
 * Функция получения показателя разнообразия питания — то, что запрошено
 * как публичный доступ к результату calculateDietDiversityIndex().
 * @param {number} [days=DIET_DIVERSITY_WINDOW_DAYS]
 * @returns {number|null} 0..100, или null, если данных за период нет
 */
function getDietDiversityIndex(days){
  return calculateDietDiversityIndex(days).index;
}

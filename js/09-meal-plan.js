// ---------------------------------------------------------------------
// Meal plan auto-picker
// ---------------------------------------------------------------------
const MEAL_SLOTS = [
  {key:'breakfast', label:'Завтрак', frac:0.25},
  {key:'lunch', label:'Обед', frac:0.35},
  {key:'dinner', label:'Ужин', frac:0.30},
  {key:'snack', label:'Перекус', frac:0.10},
];
let currentPlan = [];

function computeTargetMacros(s){
  if(!s) return {kcal:2000, protein:100, fat:60, carb:250};
  const bmr = 10*s.weight + 6.25*s.height - 5*s.age + 5;
  const tdee = bmr*s.activity;
  const target = tdee + s.surplus;
  const proteinG = s.weight*s.proteinPerKg;
  const fatKcal = target*(s.fatPct/100);
  const fatG = fatKcal/9;
  const carbKcal = target - proteinG*4 - fatKcal;
  const carbG = carbKcal/4;
  return {kcal:target, protein:proteinG, fat:fatG, carb:carbG};
}

function scoreDish(dish, ideal, todayStr, avgPrice){
  let score = 100;
  const days = daysSinceLastEaten(dish.id, todayStr);
  if(days===1) score -= 60;
  else if(days===2) score -= 30;
  else if(days>=7) score += 20;

  const dims = [[dish.kcal,ideal.kcal],[dish.protein,ideal.protein],[dish.fat,ideal.fat],[dish.carb,ideal.carb]];
  const errs = dims.map(([actual,idealVal])=> idealVal>0 ? Math.abs(actual-idealVal)/idealVal : (actual>0?1:0));
  let avgErr = errs.reduce((a,b)=>a+b,0)/errs.length;
  avgErr = Math.min(avgErr,1);
  score += Math.round(40 - avgErr*110);

  if(avgPrice>0){
    if(dish.price < avgPrice*0.8) score += 15;
    else if(dish.price > avgPrice*1.2) score -= 15;
  }
  if(dish.favorite==='liked') score += 10;
  else if(dish.favorite==='disliked') score -= 50;
  if(dish.ratings){
    const avg = ratingAverage(dish.ratings, DISH_RATING_CRITERIA);
    if(avg!==null) score += Math.round((avg-3)*6);
  }

  return score;
}

function weightedPick(scoredList){
  if(!scoredList.length) return null;
  const minScore = Math.min(...scoredList.map(s=>s.score));
  const shift = minScore<1 ? (1-minScore) : 0;
  const weights = scoredList.map(s=>s.score+shift);
  const total = weights.reduce((a,b)=>a+b,0);
  if(total<=0) return scoredList[Math.floor(Math.random()*scoredList.length)];
  let r = Math.random()*total;
  for(let i=0;i<scoredList.length;i++){
    r -= weights[i];
    if(r<=0) return scoredList[i];
  }
  return scoredList[scoredList.length-1];
}

function regenerateFrom(startIndex, forceDifferentAtStart){
  const dishes = loadDishes();
  if(!dishes.length){
    document.getElementById('dayPlanWrap').innerHTML = '<div class="note">Сначала сохрани хотя бы пару блюд в конструкторе ниже.</div>';
    return;
  }
  if(!currentPlan.length){
    currentPlan = MEAL_SLOTS.map(s=>({slot:s, picked:null, score:null, remainingAfter:null, idealPortion:null}));
  }
  const todayStr = new Date().toISOString().slice(0,10);
  const avgPrice = dishes.length ? dishes.reduce((a,d)=>a+(d.price||0),0)/dishes.length : 0;
  const target = computeTargetMacros(loadKbju());

  let remaining = startIndex===0 ? {...target} : {...currentPlan[startIndex-1].remainingAfter};
  const usedIds = new Set();
  for(let i=0;i<startIndex;i++){ if(currentPlan[i].picked) usedIds.add(currentPlan[i].picked.id); }
  const prevPickId = (forceDifferentAtStart && currentPlan[startIndex].picked) ? currentPlan[startIndex].picked.id : null;

  let fracSum = 0;
  for(let i=startIndex;i<MEAL_SLOTS.length;i++) fracSum += MEAL_SLOTS[i].frac;

  for(let i=startIndex;i<MEAL_SLOTS.length;i++){
    const slot = MEAL_SLOTS[i];
    const share = fracSum>0 ? slot.frac/fracSum : 0;
    const idealPortion = {
      kcal: Math.max(remaining.kcal,0)*share,
      protein: Math.max(remaining.protein,0)*share,
      fat: Math.max(remaining.fat,0)*share,
      carb: Math.max(remaining.carb,0)*share,
    };
    let candidates = dishes.filter(d=>!usedIds.has(d.id));
    if(i===startIndex && prevPickId){
      const filtered = candidates.filter(d=>d.id!==prevPickId);
      if(filtered.length) candidates = filtered;
    }
    let pick = null, pickedScore = null;
    if(candidates.length){
      const scored = candidates.map(d=>({dish:d, score:scoreDish(d, idealPortion, todayStr, avgPrice)}))
                                .sort((a,b)=>b.score-a.score);
      const top = scored.slice(0, Math.min(5, scored.length));
      const chosen = weightedPick(top);
      pick = chosen.dish;
      pickedScore = chosen.score;
      usedIds.add(pick.id);
      remaining = {
        kcal: remaining.kcal - pick.kcal,
        protein: remaining.protein - pick.protein,
        fat: remaining.fat - pick.fat,
        carb: remaining.carb - pick.carb,
      };
    }
    logMealChoice(todayStr, slot.key, pick ? pick.id : null);
    currentPlan[i] = {slot, picked:pick, score:pickedScore, remainingAfter:{...remaining}, idealPortion};
    fracSum -= slot.frac;
  }
  renderDayPlan(target);
}

function buildDayPlan(){ regenerateFrom(0, false); }
function rerollSlot(i){ regenerateFrom(i, true); }

function renderDayPlan(target){
  const t = target || computeTargetMacros(loadKbju());
  const el = document.getElementById('dayPlanWrap');
  if(!currentPlan.length){
    el.innerHTML = `<div class="note">Нужно на день: ${Math.round(t.kcal)} ккал / Б ${Math.round(t.protein)} / Ж ${Math.round(t.fat)} / У ${Math.round(t.carb)}. Нажми «Собрать день».</div>`;
    return;
  }
  el.innerHTML = `<div class="note" style="margin-bottom:12px;">Нужно на день: <b>${Math.round(t.kcal)} ккал</b> / Б ${Math.round(t.protein)} / Ж ${Math.round(t.fat)} / У ${Math.round(t.carb)}</div>` +
    currentPlan.map((p,i)=>{
      if(!p.picked){
        return `<div class="stat-card">
          <div class="name">${p.slot.label}</div>
          <div class="note">Нет подходящих блюд (добавь ещё блюда в конструкторе)</div>
        </div>`;
      }
      const d = p.picked;
      return `<div class="stat-card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="name">${p.slot.label}: ${d.name}</div>
          <button class="btn secondary small" onclick="rerollSlot(${i})">🔄 Пересобрать</button>
        </div>
        <div class="pill-row" style="margin-top:6px;">
          <span>Ккал: <b>${d.kcal}</b></span>
          <span>Белки: <b>${d.protein}</b></span>
          <span>Жиры: <b>${d.fat}</b></span>
          <span>Углеводы: <b>${d.carb}</b></span>
          <span>Score: <b>${p.score}</b></span>
        </div>
        <div class="note" style="margin-top:6px;">Осталось после этого приёма: ${Math.round(p.remainingAfter.kcal)} ккал / Б ${Math.round(p.remainingAfter.protein)} / Ж ${Math.round(p.remainingAfter.fat)} / У ${Math.round(p.remainingAfter.carb)}</div>
      </div>`;
    }).join('');
}

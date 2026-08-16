/* =========================================================================
   CORE — MEAL PLAN AUTO-PICKER
   ========================================================================= */
App.Core = App.Core || {};
App.Core.MealPlan = (function(){
  const S = App.State;
  const Rt = ()=>App.Core.Ratings;
  const Kb = ()=>App.Core.Kbju;

  const MEAL_SLOTS = [
    {key:'breakfast', label:'Завтрак', frac:0.25},
    {key:'lunch', label:'Обед', frac:0.35},
    {key:'dinner', label:'Ужин', frac:0.30},
    {key:'snack', label:'Перекус', frac:0.10},
  ];
  const WEEK_DAY_LABELS = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
  const DIET_DIVERSITY_WINDOW_DAYS = 30;

  let currentPlan = [];
  let currentWeekPlan = [];

  function daysSinceLastEaten(dishId, todayStr){
    const log = S.get('mealLog').filter(e=>e.dishId===dishId && e.date<todayStr);
    if(!log.length) return Infinity;
    const todayDate = new Date(todayStr);
    const diffs = log.map(e=>Math.round((todayDate-new Date(e.date))/86400000));
    return Math.min(...diffs);
  }
  function logMealChoice(date, slotKey, dishId){
    let log = S.get('mealLog');
    log = log.filter(e=>!(e.date===date && e.slot===slotKey));
    if(dishId) log.push({date, slot:slotKey, dishId});
    S.set('mealLog', log);
  }

  function scoreDishWithRecency(dish, ideal, days, avgPrice){
    let score = 100;
    if(days===1) score -= 60; else if(days===2) score -= 30; else if(days>=7) score += 20;
    const dims = [[dish.kcal,ideal.kcal],[dish.protein,ideal.protein],[dish.fat,ideal.fat],[dish.carb,ideal.carb]];
    const errs = dims.map(([actual,idealVal])=> idealVal>0 ? Math.abs(actual-idealVal)/idealVal : (actual>0?1:0));
    let avgErr = Math.min(errs.reduce((a,b)=>a+b,0)/errs.length, 1);
    score += Math.round(40 - avgErr*110);
    if(avgPrice>0){
      if(dish.price < avgPrice*0.8) score += 15;
      else if(dish.price > avgPrice*1.2) score -= 15;
    }
    if(dish.favorite==='liked') score += 10; else if(dish.favorite==='disliked') score -= 50;
    if(dish.ratings){
      const avg = Rt().average(dish.ratings, Rt().DISH_RATING_CRITERIA);
      if(avg!==null) score += Math.round((avg-3)*6);
    }
    return score;
  }
  function scoreDish(dish, ideal, todayStr, avgPrice){
    return scoreDishWithRecency(dish, ideal, daysSinceLastEaten(dish.id, todayStr), avgPrice);
  }
  function weightedPick(scoredList){
    if(!scoredList.length) return null;
    const minScore = Math.min(...scoredList.map(s=>s.score));
    const shift = minScore<1 ? (1-minScore) : 0;
    const weights = scoredList.map(s=>s.score+shift);
    const total = weights.reduce((a,b)=>a+b,0);
    if(total<=0) return scoredList[Math.floor(Math.random()*scoredList.length)];
    let r = Math.random()*total;
    for(let i=0;i<scoredList.length;i++){ r -= weights[i]; if(r<=0) return scoredList[i]; }
    return scoredList[scoredList.length-1];
  }

  function getCurrentPlan(){ return currentPlan; }
  function regenerateFrom(startIndex, forceDifferentAtStart){
    const dishes = S.get('dishes');
    if(!dishes.length){ currentPlan = []; return {ok:false, error:'no-dishes'}; }
    if(!currentPlan.length) currentPlan = MEAL_SLOTS.map(s=>({slot:s, picked:null, score:null, remainingAfter:null, idealPortion:null}));
    const todayStr = new Date().toISOString().slice(0,10);
    const avgPrice = dishes.length ? dishes.reduce((a,d)=>a+(d.price||0),0)/dishes.length : 0;
    const target = Kb().computeTargetMacros(S.get('kbju'));

    let remaining = startIndex===0 ? {...target} : {...currentPlan[startIndex-1].remainingAfter};
    const usedIds = new Set();
    for(let i=0;i<startIndex;i++){ if(currentPlan[i].picked) usedIds.add(currentPlan[i].picked.id); }
    const prevPickId = (forceDifferentAtStart && currentPlan[startIndex].picked) ? currentPlan[startIndex].picked.id : null;

    let fracSum = 0;
    for(let i=startIndex;i<MEAL_SLOTS.length;i++) fracSum += MEAL_SLOTS[i].frac;

    for(let i=startIndex;i<MEAL_SLOTS.length;i++){
      const slot = MEAL_SLOTS[i];
      const share = fracSum>0 ? slot.frac/fracSum : 0;
      const idealPortion = {kcal:Math.max(remaining.kcal,0)*share, protein:Math.max(remaining.protein,0)*share,
        fat:Math.max(remaining.fat,0)*share, carb:Math.max(remaining.carb,0)*share};
      let candidates = dishes.filter(d=>!usedIds.has(d.id));
      if(i===startIndex && prevPickId){
        const filtered = candidates.filter(d=>d.id!==prevPickId);
        if(filtered.length) candidates = filtered;
      }
      let pick = null, pickedScore = null;
      if(candidates.length){
        const scored = candidates.map(d=>({dish:d, score:scoreDish(d, idealPortion, todayStr, avgPrice)})).sort((a,b)=>b.score-a.score);
        const top = scored.slice(0, Math.min(5, scored.length));
        const chosen = weightedPick(top);
        pick = chosen.dish; pickedScore = chosen.score;
        usedIds.add(pick.id);
        remaining = {kcal:remaining.kcal-pick.kcal, protein:remaining.protein-pick.protein, fat:remaining.fat-pick.fat, carb:remaining.carb-pick.carb};
      }
      logMealChoice(todayStr, slot.key, pick ? pick.id : null);
      currentPlan[i] = {slot, picked:pick, score:pickedScore, remainingAfter:{...remaining}, idealPortion};
      fracSum -= slot.frac;
    }
    return {ok:true, target};
  }
  function buildDayPlan(){ return regenerateFrom(0, false); }
  function rerollSlot(i){ return regenerateFrom(i, true); }

  // ---- Week preview (does not write to real meal log) ----
  function computeVirtualDaysSince(dishId, dateStr, virtualLog){
    const realDays = daysSinceLastEaten(dishId, dateStr);
    const priorVirtual = virtualLog.filter(e=>e.dishId===dishId && e.date<dateStr);
    if(!priorVirtual.length) return realDays;
    const d0 = new Date(dateStr);
    const diffs = priorVirtual.map(e=>Math.round((d0-new Date(e.date))/86400000));
    return Math.min(realDays, ...diffs);
  }
  function getCurrentWeekPlan(){ return currentWeekPlan; }
  function buildWeekPlan(){
    const dishes = S.get('dishes');
    if(!dishes.length){ currentWeekPlan = []; return {ok:false, error:'no-dishes'}; }
    const target = Kb().computeTargetMacros(S.get('kbju'));
    const avgPrice = dishes.reduce((a,d)=>a+(d.price||0),0)/dishes.length;
    const virtualLog = [];
    const weekPlan = [];
    const baseDate = new Date();
    for(let dayOffset=0; dayOffset<7; dayOffset++){
      const d = new Date(baseDate); d.setDate(baseDate.getDate()+dayOffset);
      const dateStr = d.toISOString().slice(0,10);
      const dayLabel = WEEK_DAY_LABELS[(d.getDay()+6)%7];
      let remaining = {...target};
      const usedToday = new Set();
      let fracSum = MEAL_SLOTS.reduce((a,s)=>a+s.frac,0);
      const meals = [];
      MEAL_SLOTS.forEach(slot=>{
        const share = fracSum>0 ? slot.frac/fracSum : 0;
        const idealPortion = {kcal:Math.max(remaining.kcal,0)*share, protein:Math.max(remaining.protein,0)*share,
          fat:Math.max(remaining.fat,0)*share, carb:Math.max(remaining.carb,0)*share};
        let candidates = dishes.filter(d2=>!usedToday.has(d2.id));
        if(!candidates.length) candidates = dishes.slice();
        const scored = candidates.map(d2=>{
          const days = computeVirtualDaysSince(d2.id, dateStr, virtualLog);
          return {dish:d2, score:scoreDishWithRecency(d2, idealPortion, days, avgPrice)};
        }).sort((a,b)=>b.score-a.score);
        const top = scored.slice(0, Math.min(5, scored.length));
        const chosen = weightedPick(top);
        const pick = chosen ? chosen.dish : null;
        const pickedScore = chosen ? chosen.score : null;
        if(pick){
          usedToday.add(pick.id);
          virtualLog.push({date:dateStr, dishId:pick.id});
          remaining = {kcal:remaining.kcal-pick.kcal, protein:remaining.protein-pick.protein, fat:remaining.fat-pick.fat, carb:remaining.carb-pick.carb};
        }
        meals.push({slot, picked:pick, score:pickedScore});
        fracSum -= slot.frac;
      });
      weekPlan.push({dateStr, dayLabel, meals});
    }
    currentWeekPlan = weekPlan;
    return {ok:true, target};
  }

  // ---- Diet diversity index (Shannon entropy over meal log) ----
  function dishRepetitionCounts(days){
    const windowDays = days || DIET_DIVERSITY_WINDOW_DAYS;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-windowDays);
    const cutoffStr = cutoff.toISOString().slice(0,10);
    const log = S.get('mealLog').filter(e=>e.date>=cutoffStr);
    const counts = {};
    log.forEach(e=>{ counts[e.dishId] = (counts[e.dishId]||0)+1; });
    return counts;
  }
  function calculateDietDiversityIndex(days){
    const counts = dishRepetitionCounts(days);
    const dishIds = Object.keys(counts);
    const totalMeals = dishIds.reduce((sum,id)=>sum+counts[id], 0);
    if(!totalMeals) return {index:null, uniqueDishes:0, totalMeals:0};
    const uniqueDishes = dishIds.length;
    if(uniqueDishes===1) return {index:0, uniqueDishes, totalMeals};
    let entropy = 0;
    dishIds.forEach(id=>{ const p = counts[id]/totalMeals; entropy -= p*Math.log2(p); });
    const maxEntropy = Math.log2(uniqueDishes);
    const normalized = maxEntropy>0 ? entropy/maxEntropy : 0;
    return {index:Math.round(normalized*100), uniqueDishes, totalMeals};
  }
  function getMealsForDate(dateStr){
    const dishes = S.get('dishes');
    const log = S.get('mealLog').filter(e=>e.date===dateStr);
    return MEAL_SLOTS.map(slot=>{
      const entry = log.find(e=>e.slot===slot.key);
      const dish = entry ? dishes.find(d=>d.id===entry.dishId) : null;
      return {slot, dish};
    });
  }
  function getTodayMeals(){ return getMealsForDate(new Date().toISOString().slice(0,10)); }

  // ---- Учёт съеденных блюд (отдельное состояние — данные самого блюда не меняются) ----
  function isMealEaten(date, slotKey){ return S.get('eatenMeals').some(e=>e.date===date && e.slot===slotKey); }
  function toggleMealEaten(date, slotKey){
    let log = S.get('eatenMeals');
    if(log.some(e=>e.date===date && e.slot===slotKey)) log = log.filter(e=>!(e.date===date && e.slot===slotKey));
    else log = [...log, {date, slot:slotKey}];
    S.set('eatenMeals', log);
    return isMealEaten(date, slotKey);
  }
  /** Получено сегодня — сумма ккал блюд, отмеченных как съеденные. */
  function dailyConsumedCalories(dateStr){
    return getMealsForDate(dateStr).reduce((sum,m)=> sum + (m.dish && isMealEaten(dateStr, m.slot.key) ? (m.dish.kcal||0) : 0), 0);
  }

  return {
    MEAL_SLOTS, WEEK_DAY_LABELS,
    getCurrentPlan, buildDayPlan, rerollSlot,
    getCurrentWeekPlan, buildWeekPlan, getMealsForDate, getTodayMeals,
    calculateDietDiversityIndex,
    isMealEaten, toggleMealEaten, dailyConsumedCalories,
  };
})();

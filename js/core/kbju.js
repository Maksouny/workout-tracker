/* =========================================================================
   CORE — KBJU CALCULATOR
   ========================================================================= */
App.Core = App.Core || {};
App.Core.Kbju = (function(){
  const AS = App.State;
  const S = ()=>App.Core.Settings;
  const J = ()=>App.Core.Journal;

  const GOAL_BASE_KCAL = {};
  function initGoalBase(){
    GOAL_BASE_KCAL[S().GOAL_GAIN] = 300;
    GOAL_BASE_KCAL[S().GOAL_LOSE] = -300;
    GOAL_BASE_KCAL[S().GOAL_MAINTAIN] = 0;
  }
  function goalBaseKcal(goal){
    if(!Object.keys(GOAL_BASE_KCAL).length) initGoalBase();
    return GOAL_BASE_KCAL.hasOwnProperty(goal) ? GOAL_BASE_KCAL[goal] : 0;
  }

  let manualCorrection = 0;
  function getManualCorrection(){ return manualCorrection; }
  function adjustCorrection(delta){ manualCorrection += delta; return manualCorrection; }
  function setManualCorrection(v){ manualCorrection = v; }

  function stepsCalorieBonus(weightKg){
    const steps = J().latestSteps();
    if(!steps) return 0;
    return J().calculateCaloriesFromSteps(steps, weightKg);
  }

  /**
   * Full KBJU calculation. inputs: {height, age, activity, proteinPerKg, fatPct(0-100), weight(optional manual fallback)}
   * Weight prefers the last logged weight (journal), same as legacy behavior.
   */
  function calc(inputs){
    const loggedWeight = J().latestWeight();
    const w = loggedWeight!==null ? loggedWeight : (parseFloat(inputs.weight)||0);
    const h = parseFloat(inputs.height)||0;
    const age = parseFloat(inputs.age)||0;
    const act = parseFloat(inputs.activity)||1.2;
    const proteinPerKg = parseFloat(inputs.proteinPerKg)||0;
    const fatPct = (parseFloat(inputs.fatPct)||0)/100;

    const bmr = 10*w + 6.25*h - 5*age + 5;
    const tdee = bmr*act;
    const goal = S().getGoal();
    const surplus = goalBaseKcal(goal) + manualCorrection;
    const walkKcal = stepsCalorieBonus(w);
    const target = tdee + surplus + walkKcal;
    const proteinG = w*proteinPerKg;
    const proteinKcal = proteinG*4;
    const fatKcal = target*fatPct;
    const fatG = fatKcal/9;
    const carbKcal = target - proteinKcal - fatKcal;
    const carbG = carbKcal/4;
    const fiberG = target/1000*14;
    const activityFrac = Math.min(1, Math.max(0, (act-1.2)/(1.9-1.2)));
    const waterMlPerKg = 30 + activityFrac*5;
    const waterMl = w*waterMlPerKg;

    const result = {
      weight:w, bmr, tdee, target, proteinG, fatG, carbG, fiberG, waterMl,
      surplus, goal, walkKcal,
    };
    AS.set('kbju', {weight:w, height:h, age, activity:act, surplus, goalAdjust:manualCorrection,
      proteinPerKg, fatPct:fatPct*100, goal, walkKcal});
    return result;
  }

  function restoreManualCorrection(saved){
    const goal = S().getGoal();
    if(saved && typeof saved.goalAdjust==='number') manualCorrection = saved.goalAdjust;
    else if(saved && typeof saved.surplus==='number') manualCorrection = Math.round(saved.surplus - goalBaseKcal(goal));
    else manualCorrection = 0;
  }

  /** Target macros used by the meal planner — same formula, from saved KBJU settings. */
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

  function getSaved(){ return AS.get('kbju'); }

  /** Pure read-only recompute of BMR/TDEE/target from a saved snapshot — no fresh inputs needed. */
  function computeAll(saved){
    if(!saved) return null;
    const bmr = 10*saved.weight + 6.25*saved.height - 5*saved.age + 5;
    const tdee = bmr*saved.activity;
    const target = tdee + saved.surplus + (saved.walkKcal||0);
    const proteinG = saved.weight*saved.proteinPerKg;
    const fatG = (target*(saved.fatPct/100))/9;
    const carbG = (target - proteinG*4 - fatG*9)/4;
    return {bmr, tdee, target, proteinG, fatG, carbG};
  }

  return {goalBaseKcal, getManualCorrection, adjustCorrection, setManualCorrection,
    calc, restoreManualCorrection, computeTargetMacros, getSaved, computeAll};
})();

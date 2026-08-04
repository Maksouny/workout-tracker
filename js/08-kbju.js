// ---------------------------------------------------------------------
// KBJU calculator
// ---------------------------------------------------------------------
const kbjuIds = ['inWeight','inHeight','inAge','inActivity','inSurplus','inProtein','inFatPct'];

// Goal-driven automatic calorie adjustment on top of TDEE, before the
// manual "Профицит калорий" slider is added as a fine-tune on top.
// Uses the existing global goal setting (getUserGoal(), js/05-storage.js).
function goalAdjustmentKcal(goal, tdee){
  if(goal===GOAL_LOSE) return -Math.round(tdee*0.20);
  if(goal===GOAL_GAIN) return Math.round(tdee*0.15);
  return 0; // GOAL_MAINTAIN
}

// Calorie bonus from walking, based on the most recently logged step
// count and the current weight — uses the existing journal helpers
// (latestSteps() from js/05-storage.js, calculateCaloriesFromSteps()
// from js/15-journal.js).
function stepsCalorieBonus(weightKg){
  const steps = typeof latestSteps==='function' ? latestSteps() : null;
  if(!steps) return 0;
  return typeof calculateCaloriesFromSteps==='function' ? calculateCaloriesFromSteps(steps, weightKg) : 0;
}

function calcKbju(){
  // Weight: prefer the last weight actually logged by the user (journal);
  // fall back to the manual slider only if nothing's been logged yet, so
  // fresh installs / old saves keep working.
  const loggedWeight = typeof getLastWeight==='function' ? getLastWeight() : null;
  const w = loggedWeight!==null ? loggedWeight : (parseFloat(document.getElementById('inWeight').value)||0);
  if(loggedWeight!==null){
    document.getElementById('inWeight').value = w;
    const wVal = document.getElementById('inWeightVal');
    if(wVal) wVal.textContent = w;
  }

  const h = parseFloat(document.getElementById('inHeight').value)||0;
  const age = parseFloat(document.getElementById('inAge').value)||0;
  const act = parseFloat(document.getElementById('inActivity').value)||1.2;
  const manualSurplus = parseFloat(document.getElementById('inSurplus').value)||0;
  const proteinPerKg = parseFloat(document.getElementById('inProtein').value)||0;
  const fatPct = (parseFloat(document.getElementById('inFatPct').value)||0)/100;

  const bmr = 10*w + 6.25*h - 5*age + 5;
  const tdee = bmr*act;

  // Global goal (Похудеть/Удержание/Набрать массу) from user settings.
  const goal = typeof getUserGoal==='function' ? getUserGoal() : GOAL_MAINTAIN;
  const goalKcal = goalAdjustmentKcal(goal, tdee);

  // Walking calories on top of the daily target.
  const walkKcal = stepsCalorieBonus(w);

  const target = tdee + goalKcal + manualSurplus + walkKcal;
  const proteinG = w*proteinPerKg;
  const proteinKcal = proteinG*4;
  const fatKcal = target*fatPct;
  const fatG = fatKcal/9;
  const carbKcal = target - proteinKcal - fatKcal;
  const carbG = carbKcal/4;
  // Клетчатка: общепринятый ориентир ~14г на 1000 ккал рациона (USDA/IOM).
  const fiberG = target/1000*14;
  // Вода: базовая формула 30 мл/кг веса, до 35 мл/кг при высокой активности
  // (стандартный диапазон 30-40 мл/кг из общих рекомендаций по гидратации).
  const activityFrac = Math.min(1, Math.max(0, (act-1.2)/(1.9-1.2)));
  const waterMlPerKg = 30 + activityFrac*5;
  const waterMl = w*waterMlPerKg;

  document.getElementById('outBmr').textContent = Math.round(bmr)+" ккал";
  document.getElementById('outTdee').textContent = Math.round(tdee)+" ккал";
  document.getElementById('outTarget').textContent = Math.round(target)+" ккал";
  document.getElementById('outProteinG').textContent = Math.round(proteinG)+" г";
  document.getElementById('outFatG').textContent = Math.round(fatG)+" г";
  document.getElementById('outCarbG').textContent = Math.round(carbG)+" г";
  document.getElementById('outFiberG').textContent = Math.round(fiberG)+" г";
  document.getElementById('outWaterMl').textContent = (Math.round(waterMl/50)*50/1000).toFixed(1)+" л";

  saveKbju({weight:w,height:h,age,activity:act,surplus:manualSurplus,proteinPerKg,fatPct:fatPct*100,goal,goalKcal,walkKcal});
}
kbjuIds.forEach(id=>document.getElementById(id).addEventListener('input', calcKbju));

// Automatic recalculation whenever the user logs a new weight (or sleep/
// steps, which also feed the target) via the Дневник vitals form —
// without touching js/05-storage.js, we wrap the existing saveVitals().
if(typeof saveVitals==='function'){
  const _origSaveVitals = saveVitals;
  saveVitals = function(){
    _origSaveVitals.apply(this, arguments);
    calcKbju();
  };
}

function initKbju(){
  const saved = loadKbju();
  if(saved){
    document.getElementById('inWeight').value = saved.weight;
    document.getElementById('inHeight').value = saved.height;
    document.getElementById('inAge').value = saved.age;
    document.getElementById('inActivity').value = saved.activity;
    document.getElementById('inSurplus').value = saved.surplus;
    document.getElementById('inProtein').value = saved.proteinPerKg;
    document.getElementById('inFatPct').value = saved.fatPct;
  }
  ['inWeight','inHeight','inAge','inSurplus','inProtein','inFatPct'].forEach(id=>{
    const el = document.getElementById(id);
    const val = document.getElementById(id+'Val');
    if(el && val) val.textContent = el.value;
  });
  calcKbju();
}

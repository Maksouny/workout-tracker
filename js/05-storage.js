// ---------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------
const LS_KBJU = "zt_kbju";
const LS_JOURNAL = "zt_journal";
const LS_INGREDIENTS = "zt_ingredients";
const LS_DISHES = "zt_dishes";

// ---------------------------------------------------------------------
// User settings — global, cross-module preferences (currently: goal).
// Stored under their own key, separate from feature-specific logs, using
// the same load/save-to-localStorage pattern as the rest of the app.
// ---------------------------------------------------------------------
const LS_SETTINGS = "zt_settings";
const GOAL_LOSE = "lose";
const GOAL_MAINTAIN = "maintain";
const GOAL_GAIN = "gain";
const GOAL_OPTIONS = [GOAL_LOSE, GOAL_MAINTAIN, GOAL_GAIN];
const GOAL_LABELS = {[GOAL_LOSE]:"Похудеть", [GOAL_MAINTAIN]:"Удержание", [GOAL_GAIN]:"Набрать массу"};
const DEFAULT_SETTINGS = {goal: GOAL_MAINTAIN};

/**
 * Загружает пользовательские настройки. Отсутствующие ключи (в т.ч. в
 * сохранениях, сделанных до появления этой настройки) заполняются
 * значениями по умолчанию — старые сохранения остаются рабочими.
 * @returns {{goal: string}}
 */
function loadSettings(){
  const raw = localStorage.getItem(LS_SETTINGS);
  const saved = raw ? JSON.parse(raw) : {};
  const settings = {...DEFAULT_SETTINGS, ...saved};
  if(!GOAL_OPTIONS.includes(settings.goal)) settings.goal = DEFAULT_SETTINGS.goal;
  return settings;
}
function saveSettings(settings){ localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); }

// Loaded once at startup, like EXERCISES/other module-level state, so it's
// available immediately without an extra call.
let USER_SETTINGS = loadSettings();

/** Текущая глобальная цель пользователя ("lose" | "maintain" | "gain"). */
function getUserGoal(){
  return USER_SETTINGS.goal;
}
/**
 * Устанавливает глобальную цель и сразу сохраняет настройки.
 * Неизвестные значения игнорируются — текущая цель не меняется.
 * @param {string} goal - GOAL_LOSE | GOAL_MAINTAIN | GOAL_GAIN
 */
function setUserGoal(goal){
  if(!GOAL_OPTIONS.includes(goal)) return;
  USER_SETTINGS = {...USER_SETTINGS, goal};
  saveSettings(USER_SETTINGS);
}
/** Человекочитаемая подпись для значения цели. */
function goalLabel(goal){
  return GOAL_LABELS[goal] || GOAL_LABELS[DEFAULT_SETTINGS.goal];
}

function loadKbju(){
  const raw = localStorage.getItem(LS_KBJU);
  return raw ? JSON.parse(raw) : null;
}
function saveKbju(data){ localStorage.setItem(LS_KBJU, JSON.stringify(data)); }

const LS_WEIGHT_LOG = "zt_weight_log";
const LS_SLEEP_LOG = "zt_sleep_log";
const LS_STEPS_LOG = "zt_steps_log";
function loadWeightLog(){
  const raw = localStorage.getItem(LS_WEIGHT_LOG);
  return raw ? JSON.parse(raw) : [];
}
function saveWeightLog(arr){ localStorage.setItem(LS_WEIGHT_LOG, JSON.stringify(arr)); }
function loadSleepLog(){
  const raw = localStorage.getItem(LS_SLEEP_LOG);
  return raw ? JSON.parse(raw) : [];
}
function saveSleepLog(arr){ localStorage.setItem(LS_SLEEP_LOG, JSON.stringify(arr)); }
function loadStepsLog(){
  const raw = localStorage.getItem(LS_STEPS_LOG);
  return raw ? JSON.parse(raw) : [];
}
function saveStepsLog(arr){ localStorage.setItem(LS_STEPS_LOG, JSON.stringify(arr)); }

const LS_EXERCISE_RATINGS = "zt_exercise_ratings_history";
// Per-workout exercise ratings history (filled in by the post-session
// rating flow in js/03-workout-session.js). One record per exercise rated
// on a given day. The Справочник average (js/13-ratings-dishes.js) is
// computed from this log, not from a hand-edited value.
function loadExerciseRatingHistory(){
  const raw = localStorage.getItem(LS_EXERCISE_RATINGS);
  return raw ? JSON.parse(raw) : [];
}
function saveExerciseRatingHistory(arr){ localStorage.setItem(LS_EXERCISE_RATINGS, JSON.stringify(arr)); }
function addExerciseRatingRecord(date, exercise, ratings){
  const hasAny = Object.values(ratings).some(v=>v>0);
  if(!hasAny) return;
  const history = loadExerciseRatingHistory();
  const id = history.length ? Math.max(...history.map(r=>r.id))+1 : 1;
  history.push({id, date, exercise, ratings});
  saveExerciseRatingHistory(history);
}
function exerciseRatingHistoryAverage(exName){
  const history = loadExerciseRatingHistory().filter(r=>r.exercise===exName);
  if(!history.length) return {count:0, overall:null, perCriteria:[]};
  const perCriteria = EXERCISE_RATING_CRITERIA.map(c=>{
    const vals = history.map(r=>r.ratings[c.key]||0).filter(v=>v>0);
    return {key:c.key, label:c.label, avg: vals.length ? Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*10)/10 : null};
  });
  const overallVals = perCriteria.map(c=>c.avg).filter(v=>v!==null);
  const overall = overallVals.length ? Math.round((overallVals.reduce((a,b)=>a+b,0)/overallVals.length)*10)/10 : null;
  return {count: history.length, overall, perCriteria};
}

function saveVitals(){
  const date = document.getElementById('vitalsDate').value || new Date().toISOString().slice(0,10);
  const weightVal = parseFloat(document.getElementById('vitalsWeight').value);
  const sleepVal = parseFloat(document.getElementById('vitalsSleep').value);
  const stepsVal = parseInt(document.getElementById('vitalsSteps').value);
  if(isNaN(weightVal) && isNaN(sleepVal) && isNaN(stepsVal)){ alert('Укажи вес, сон или шаги'); return; }
  if(!isNaN(weightVal)){
    const log = loadWeightLog();
    const existing = log.find(w=>w.date===date);
    if(existing) existing.weight = weightVal;
    else log.push({id: log.length?Math.max(...log.map(w=>w.id))+1:1, date, weight: weightVal});
    saveWeightLog(log);
  }
  if(!isNaN(sleepVal)){
    const log = loadSleepLog();
    const existing = log.find(w=>w.date===date);
    if(existing) existing.hours = sleepVal;
    else log.push({id: log.length?Math.max(...log.map(w=>w.id))+1:1, date, hours: sleepVal});
    saveSleepLog(log);
  }
  if(!isNaN(stepsVal)){
    const log = loadStepsLog();
    const existing = log.find(w=>w.date===date);
    if(existing) existing.steps = stepsVal;
    else log.push({id: log.length?Math.max(...log.map(w=>w.id))+1:1, date, steps: stepsVal});
    saveStepsLog(log);
  }
  document.getElementById('vitalsWeight').value = '';
  document.getElementById('vitalsSleep').value = '';
  document.getElementById('vitalsSteps').value = '';
  renderJournalList();
  renderVitalsCharts();
}

function latestSteps(){
  const log = loadStepsLog().slice().sort((a,b)=> a.date<b.date?1:-1);
  return log.length ? log[0].steps : null;
}
function stepsOnDate(date){
  const s = loadStepsLog().find(x=>x.date===date);
  return s ? s.steps : null;
}

function latestWeight(){
  const log = loadWeightLog().slice().sort((a,b)=> a.date<b.date?1:-1);
  return log.length ? log[0].weight : null;
}
function latestSleep(){
  const log = loadSleepLog().slice().sort((a,b)=> a.date<b.date?1:-1);
  return log.length ? log[0].hours : null;
}
function weightOnDate(date){
  const w = loadWeightLog().find(x=>x.date===date);
  return w ? w.weight : null;
}
function sleepOnDate(date){
  const s = loadSleepLog().find(x=>x.date===date);
  return s ? s.hours : null;
}

function sparkSVG(values, opts={}){
  if(!values.length) return '<div class="note">Пока нет данных</div>';
  const w=280,h=64,pad=6;
  const maxV = Math.max(...values)*1.08 || 1;
  const minV = opts.minZero===false ? Math.min(...values)*0.94 : 0;
  const range = (maxV-minV)||1;
  const step = values.length>1 ? (w-pad*2)/(values.length-1) : 0;
  const xy = values.map((v,i)=>[Math.round(pad+i*step), Math.round(h-pad-((v-minV)/range)*(h-pad*2))]);
  const points = xy.map(p=>p.join(',')).join(' ');
  const areaPoints = `${pad},${h-pad} ${points} ${xy[xy.length-1][0]},${h-pad}`;
  const color = opts.color || 'var(--steel)';
  return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polygon points="${areaPoints}" fill="${color}" opacity=".18"/>
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    ${xy.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4" fill="var(--accent)" stroke="var(--bg)" stroke-width="1.5"/>`).join('')}
  </svg>`;
}

function renderVitalsCharts(){
  const el = document.getElementById('vitalsCharts');
  if(!el) return;
  const wLog = loadWeightLog().slice().sort((a,b)=> a.date<b.date?-1:1).slice(-14);
  const sLog = loadSleepLog().slice().sort((a,b)=> a.date<b.date?-1:1).slice(-14);
  const stLog = loadStepsLog().slice().sort((a,b)=> a.date<b.date?-1:1).slice(-14);
  const wVals = wLog.map(w=>w.weight);
  const sVals = sLog.map(s=>s.hours);
  const stVals = stLog.map(s=>s.steps);
  const wLast = wVals.length ? wVals[wVals.length-1] : null;
  const wFirst = wVals.length ? wVals[0] : null;
  const wDiff = (wLast!==null && wFirst!==null && wVals.length>1) ? Math.round((wLast-wFirst)*10)/10 : null;
  const sLast = sVals.length ? sVals[sVals.length-1] : null;
  const sAvg = sVals.length ? Math.round((sVals.reduce((a,b)=>a+b,0)/sVals.length)*10)/10 : null;
  const stLast = stVals.length ? stVals[stVals.length-1] : null;
  const stAvg = stVals.length ? Math.round(stVals.reduce((a,b)=>a+b,0)/stVals.length) : null;
  el.innerHTML = `<div class="grid3">
    <div>
      <div class="stat-meta" style="margin:0 0 8px;"><span>Вес: <b>${wLast!==null?wLast+' кг':'—'}</b></span>${wDiff!==null?`<span>Изменение: <b>${wDiff>=0?'+':''}${wDiff} кг</b></span>`:''}</div>
      ${sparkSVG(wVals, {minZero:false, color:'var(--accent)'})}
    </div>
    <div>
      <div class="stat-meta" style="margin:0 0 8px;"><span>Сон: <b>${sLast!==null?sLast+' ч':'—'}</b></span>${sAvg!==null?`<span>Средний: <b>${sAvg} ч</b></span>`:''}</div>
      ${sparkSVG(sVals, {minZero:false, color:'var(--cyan)'})}
    </div>
    <div>
      <div class="stat-meta" style="margin:0 0 8px;"><span>Шаги: <b>${stLast!==null?stLast:'—'}</b></span>${stAvg!==null?`<span>Средние: <b>${stAvg}</b></span>`:''}</div>
      ${sparkSVG(stVals, {minZero:true, color:'var(--steel)'})}
    </div>
  </div>`;
}

const vitalsDateEl = document.getElementById('vitalsDate');
if(vitalsDateEl) vitalsDateEl.value = new Date().toISOString().slice(0,10);


function loadJournal(){
  const raw = localStorage.getItem(LS_JOURNAL);
  if(raw) return JSON.parse(raw);
  const seed = [
    {id:1, date:"2026-07-06", exercise:"Подтягивания", sets:[2,2,1,0], notes:"надо начинать треню с этого"},
    {id:2, date:"2026-07-06", exercise:"Отжимания классические", sets:[14,9,8,6], notes:""},
    {id:3, date:"2026-07-06", exercise:"Обратные отжимания (скамья/стул)", sets:[9,9,8,6], notes:""},
    {id:4, date:"2026-07-06", exercise:"Планка", sets:[60,40,30,20], notes:""},
    {id:5, date:"2026-07-07", exercise:"Приседания", sets:[20,20,18,15], notes:""},
    {id:6, date:"2026-07-07", exercise:"Пресс (подъём на 90°)", sets:[15,15,8,7], notes:""},
    {id:7, date:"2026-07-07", exercise:"Скручивания пресса", sets:[20,18,17,17], notes:"Исправить технику"},
  ];
  localStorage.setItem(LS_JOURNAL, JSON.stringify(seed));
  return seed;
}
function saveJournal(data){ localStorage.setItem(LS_JOURNAL, JSON.stringify(data)); }

function loadIngredients(){
  const raw = localStorage.getItem(LS_INGREDIENTS);
  if(raw) return JSON.parse(raw);
  localStorage.setItem(LS_INGREDIENTS, JSON.stringify(DEFAULT_INGREDIENTS));
  return DEFAULT_INGREDIENTS.slice();
}
function saveIngredients(data){ localStorage.setItem(LS_INGREDIENTS, JSON.stringify(data)); }

function loadDishes(){
  const raw = localStorage.getItem(LS_DISHES);
  return raw ? JSON.parse(raw) : [];
}
function saveDishes(data){ localStorage.setItem(LS_DISHES, JSON.stringify(data)); }

const LS_MEALLOG = "zt_meallog";
function loadMealLog(){
  const raw = localStorage.getItem(LS_MEALLOG);
  return raw ? JSON.parse(raw) : [];
}
function saveMealLog(log){ localStorage.setItem(LS_MEALLOG, JSON.stringify(log)); }
function logMealChoice(date, slotKey, dishId){
  let log = loadMealLog();
  log = log.filter(e=> !(e.date===date && e.slot===slotKey));
  if(dishId) log.push({date, slot:slotKey, dishId});
  saveMealLog(log);
}
function daysSinceLastEaten(dishId, todayStr){
  const log = loadMealLog().filter(e=>e.dishId===dishId && e.date<todayStr);
  if(!log.length) return Infinity;
  const todayDate = new Date(todayStr);
  const diffs = log.map(e=>Math.round((todayDate-new Date(e.date))/86400000));
  return Math.min(...diffs);
}

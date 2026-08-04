// ---------------------------------------------------------------------
// Guided workout session (timer + set-by-set logging)
// ---------------------------------------------------------------------
const REST_SECONDS = 180;
const GET_READY_SECONDS = 180;
let workoutSession = null; // {queue, index, results, dayLabel, timerId, timeLeft, phase}
let ratingFlow = null; // {exercises, index, date, dayLabel, summary, ratings}

// ---------------------------------------------------------------------
// 1. Влияние сна на тренировку
// Ниже нормы сна (SLEEP_NORM_HOURS) — снижаем нагрузку упражнения: сперва
// пробуем срезать подходы (не ниже 1), а если срезать уже нечего —
// снижаем целевой диапазон повторов. Использует существующие данные сна
// (latestSleep() из js/05-storage.js) и коэффициент восстановления
// (getSleepRecoveryCoefficient() из js/15-journal.js).
// ---------------------------------------------------------------------
const SLEEP_NORM_HOURS = 7;

function getRecentSleepHours(){
  return typeof latestSleep==='function' ? latestSleep() : null;
}

/**
 * Возвращает копию упражнения, скорректированную под недосып.
 * Если сна не хватает (< SLEEP_NORM_HOURS), количество подходов или
 * повторов пропорционально уменьшается через коэффициент восстановления.
 * Если сна достаточно или данных о сне нет — возвращает исходное
 * упражнение без изменений.
 * @param {object} ex - упражнение из EXERCISES
 * @returns {object} упражнение (возможно скорректированное) + adjusted-флаг
 */
function sleepAdjustedExercise(ex){
  const hours = getRecentSleepHours();
  if(hours===null || hours>=SLEEP_NORM_HOURS) return {...ex, adjusted:false};

  const coef = typeof getSleepRecoveryCoefficient==='function'
    ? getSleepRecoveryCoefficient(hours)
    : Math.max(0.5, hours/SLEEP_NORM_HOURS);

  const reducedSets = Math.max(1, Math.round(ex.sets*coef));
  if(reducedSets < ex.sets){
    return {...ex, sets:reducedSets, adjusted:true, adjustReason:'sets', sleepHours:hours};
  }
  // Подходы уже минимальны (1) — снижаем целевой диапазон повторов вместо них.
  const reducedMax = Math.max(1, Math.round(ex.max*coef));
  const reducedMin = Math.max(1, Math.min(reducedMax, Math.round(ex.min*coef)));
  if(reducedMax < ex.max || reducedMin < ex.min){
    return {...ex, min:reducedMin, max:reducedMax, adjusted:true, adjustReason:'reps', sleepHours:hours};
  }
  return {...ex, adjusted:false};
}

// ---------------------------------------------------------------------
// 2. Подсчёт нагрузки на группы мышц
// Переводит результаты тренировки (суммарный объём по каждому упражнению)
// в нагрузку по конкретным мышцам, используя основные и второстепенные
// мышцы упражнения с их коэффициентами (ex.muscles.primary/secondary —
// см. справочник, js/01-exercises.js). Второстепенные мышцы учитываются
// с дополнительным понижающим множителем, т.к. они лишь ассистируют.
// ---------------------------------------------------------------------
const SECONDARY_MUSCLE_WEIGHT = 0.5;

/**
 * @param {Object.<string, number[]>} results - {имя упражнения: [повторы по подходам]}, формат как в workoutSession.results
 * @returns {Object.<string, number>} нагрузка по каждой мышце (условные единицы объём×коэффициент)
 */
function calculateMuscleLoad(results){
  const loadByMuscle = {};
  Object.keys(results||{}).forEach(exName=>{
    const ex = EXERCISES.find(e=>e.name===exName);
    if(!ex || !ex.muscles) return;
    const volume = (results[exName]||[]).reduce((a,b)=>a+b,0);
    if(!volume) return;
    (ex.muscles.primary||[]).forEach(m=>{
      loadByMuscle[m.name] = (loadByMuscle[m.name]||0) + volume*m.load;
    });
    (ex.muscles.secondary||[]).forEach(m=>{
      loadByMuscle[m.name] = (loadByMuscle[m.name]||0) + volume*m.load*SECONDARY_MUSCLE_WEIGHT;
    });
  });
  Object.keys(loadByMuscle).forEach(k=>{ loadByMuscle[k] = Math.round(loadByMuscle[k]*10)/10; });
  return loadByMuscle;
}

// Нагрузка по мышцам за последнюю завершённую тренировку (заполняется в
// finishWorkoutSession) — доступна для будущих экранов/алгоритмов.
let lastSessionMuscleLoad = null;

// ---------------------------------------------------------------------
// 3. Прогнозирование рабочего веса
// Смотрит на последние записи упражнения в журнале: если пользователь
// стабильно выполняет/перевыполняет целевой объём (sets×max) — предлагает
// прибавить вес (прогрессия нагрузки); если стабильно недобирает —
// предлагает снизить. Использует существующие данные журнала (loadJournal).
// ---------------------------------------------------------------------
const WORKING_WEIGHT_STEP_KG = 1;
const PROGRESS_RATIO = 1.0;   // объём >= цели -> прибавить вес
const REGRESS_RATIO = 0.8;    // объём < 80% от цели -> снизить вес
const WORKING_WEIGHT_HISTORY_DEPTH = 3;

/**
 * Прогнозирует рабочий вес для следующей тренировки по упражнению.
 * @param {string} exerciseName - название упражнения (как в EXERCISES/журнале)
 * @param {number} [currentWeightKg=0] - вес, использовавшийся сейчас
 * @returns {{weight:number, trend:'up'|'down'|'hold', ratio:number|null}}
 */
function predictWorkingWeight(exerciseName, currentWeightKg){
  const base = typeof currentWeightKg==='number' ? currentWeightKg : 0;
  const ex = EXERCISES.find(e=>e.name===exerciseName);
  if(!ex) return {weight:base, trend:'hold', ratio:null};

  const history = loadJournal()
    .filter(j=>j.exercise===exerciseName)
    .sort((a,b)=> a.date<b.date ? 1 : -1)
    .slice(0, WORKING_WEIGHT_HISTORY_DEPTH);
  if(!history.length) return {weight:base, trend:'hold', ratio:null};

  const targetVolume = ex.sets*ex.max;
  const ratio = targetVolume ? history.reduce((sum,j)=>{
    const vol = j.sets.reduce((a,b)=>a+b,0);
    return sum + vol/targetVolume;
  },0)/history.length : null;

  if(ratio===null) return {weight:base, trend:'hold', ratio};
  if(ratio>=PROGRESS_RATIO) return {weight:Math.round((base+WORKING_WEIGHT_STEP_KG)*10)/10, trend:'up', ratio};
  if(ratio<REGRESS_RATIO) return {weight:Math.max(0, Math.round((base-WORKING_WEIGHT_STEP_KG)*10)/10), trend:'down', ratio};
  return {weight:base, trend:'hold', ratio};
}

function todayWeekdayIndex(){
  // JS getDay(): 0=Sunday..6=Saturday -> convert to our arrays where 0=Monday..6=Sunday
  const jsDay = new Date().getDay();
  return jsDay===0 ? 6 : jsDay-1;
}

function startWorkoutSession(){
  const p = getActiveProfile();
  const dayIndex = todayWeekdayIndex();

  if(p.preset==='classic'){
    if(!classicPlan.length || !classicPlan.some(c=>c.picks.length)) loadPlanFromProfile(p);
    const today = classicPlan[dayIndex];
    if(!today || !today.picks.length){
      alert('На сегодня в этом профиле план не собран (или это день отдыха). Собери неделю на графике ниже.');
      return;
    }
    buildQueueAndStart(today.picks.map(pk=>pk.ex), today.dayInfo.day);
  } else {
    if(!splitPlan.length || !splitPlan.some(c=>c.picks.length)) loadPlanFromProfile(p);
    const today = splitPlan[dayIndex];
    if(!today || !today.picks.length){
      alert('На сегодня в этом профиле план не собран (или это день отдыха). Собери неделю на графике ниже.');
      return;
    }
    buildQueueAndStart(today.picks, today.dayInfo.day);
  }
}

function buildQueueAndStart(exercises, dayLabel){
  const queue = [];
  exercises.forEach(ex=>{
    const adjustedEx = sleepAdjustedExercise(ex);
    for(let s=1; s<=adjustedEx.sets; s++){
      queue.push({ex: adjustedEx, setNumber:s, totalSets:adjustedEx.sets});
    }
  });
  workoutSession = {queue, index:0, results:{}, dayLabel, timerId:null, timeLeft:0, phase:'timer'};
  document.getElementById('workoutModalOverlay').classList.add('open');
  startPhaseTimer(GET_READY_SECONDS, 'Приготовься к первому подходу');
}

function cancelWorkoutSession(){
  if(workoutSession && workoutSession.timerId) clearInterval(workoutSession.timerId);
  workoutSession = null;
  document.getElementById('workoutModalOverlay').classList.remove('open');
}

function startPhaseTimer(seconds, label){
  workoutSession.phase = 'timer';
  workoutSession.timeLeft = seconds;
  workoutSession.timerTotal = seconds;
  workoutSession.timerLabel = label;
  renderWorkoutSession();
  workoutSession.timerId = setInterval(()=>{
    workoutSession.timeLeft--;
    if(workoutSession.timeLeft<=0){
      clearInterval(workoutSession.timerId);
      workoutSession.timerId = null;
      workoutSession.phase = 'input';
      renderWorkoutSession();
    } else {
      renderWorkoutSession();
    }
  }, 1000);
}
function startRestTimer(){
  startPhaseTimer(REST_SECONDS, 'Отдых перед следующим подходом');
}

function skipRest(){
  if(workoutSession.timerId){ clearInterval(workoutSession.timerId); workoutSession.timerId = null; }
  workoutSession.phase = 'input';
  renderWorkoutSession();
}

function confirmSetResult(){
  const input = document.getElementById('setResultInput');
  const value = parseInt(input.value)||0;
  const step = workoutSession.queue[workoutSession.index];
  if(!workoutSession.results[step.ex.name]) workoutSession.results[step.ex.name] = [];
  workoutSession.results[step.ex.name].push(value);

  workoutSession.index++;
  if(workoutSession.index >= workoutSession.queue.length){
    finishWorkoutSession();
    return;
  }
  startRestTimer();
}

function finishWorkoutSession(){
  const todayStr = new Date().toISOString().slice(0,10);
  const journal = loadJournal();
  let nextId = journal.length ? Math.max(...journal.map(j=>j.id))+1 : 1;
  const exNames = Object.keys(workoutSession.results);
  exNames.forEach(exName=>{
    const vals = workoutSession.results[exName].slice(0,4);
    while(vals.length<4) vals.push(0);
    journal.push({id: nextId++, date: todayStr, exercise: exName, sets: vals, notes: 'через таймер тренировки'});
  });
  saveJournal(journal);
  lastSessionMuscleLoad = calculateMuscleLoad(workoutSession.results);
  const dayLabel = workoutSession.dayLabel;
  const summary = exNames.map(name=>`${name}: ${workoutSession.results[name].join('/')}`).join('<br>');
  workoutSession = null;
  renderJournalList();
  renderDashboard();

  ratingFlow = {exercises: exNames, index:0, date: todayStr, dayLabel, summary, ratings:{}};
  renderRatingFlowStep();
}

function renderRatingFlowStep(){
  const el = document.getElementById('workoutModalContent');
  if(!ratingFlow) return;

  if(ratingFlow.index >= ratingFlow.exercises.length){
    Object.keys(ratingFlow.ratings).forEach(exName=>{
      addExerciseRatingRecord(ratingFlow.date, exName, ratingFlow.ratings[exName]);
    });
    const dayLabel = ratingFlow.dayLabel, summary = ratingFlow.summary;
    ratingFlow = null;
    renderReference();
    el.innerHTML = `
      <div class="flash-confirm">
        <div class="name" style="font-size:18px;">Тренировка завершена ✅</div>
        <div class="note" style="margin-top:2px;">${dayLabel}</div>
        <div class="note" style="margin-top:14px;line-height:1.8;">${summary}</div>
        <div class="note" style="margin-top:10px;">Результаты записаны в журнал, оценки — в историю упражнений.</div>
        <button class="btn" style="margin-top:16px;width:100%;" onclick="closeWorkoutModal()">Ок</button>
      </div>`;
    return;
  }

  const exName = ratingFlow.exercises[ratingFlow.index];
  const current = ratingFlow.ratings[exName] || {};
  el.innerHTML = `
    <div>
      <div class="note" style="margin-bottom:4px;">Оцени упражнение ${ratingFlow.index+1} из ${ratingFlow.exercises.length}</div>
      <div class="name" style="font-size:18px;">${exName}</div>
      <div class="rating-grid" style="margin-top:16px;">
        ${EXERCISE_RATING_CRITERIA.map(c=>`<span>${c.label}</span>${starRow('ratingFlow', ratingFlow.index, c.key, current[c.key]||0)}`).join('')}
      </div>
      <div style="display:flex;gap:10px;margin-top:18px;">
        <button class="btn secondary small" style="flex:1;" onclick="skipRatingFlowStep()">Пропустить</button>
        <button class="btn small" style="flex:1;" onclick="nextRatingFlowStep()">Далее</button>
      </div>
    </div>`;
}

function nextRatingFlowStep(){
  if(!ratingFlow) return;
  ratingFlow.index++;
  renderRatingFlowStep();
}
function skipRatingFlowStep(){
  if(!ratingFlow) return;
  const exName = ratingFlow.exercises[ratingFlow.index];
  delete ratingFlow.ratings[exName];
  ratingFlow.index++;
  renderRatingFlowStep();
}

function closeWorkoutModal(){
  document.getElementById('workoutModalOverlay').classList.remove('open');
}

function renderWorkoutSession(){
  const el = document.getElementById('workoutModalContent');
  if(!workoutSession){ closeWorkoutModal(); return; }
  const step = workoutSession.queue[workoutSession.index];
  const setsProgressPct = Math.round((workoutSession.index/workoutSession.queue.length)*100);
  const progressBarHtml = `
    <div class="note" style="margin-bottom:4px;">Подход ${workoutSession.index+1} из ${workoutSession.queue.length} · день: ${workoutSession.dayLabel}</div>
    <div class="progress-gauge" style="height:10px;"><div class="progress-fill" style="width:${setsProgressPct}%"></div></div>
  `;

  if(workoutSession.phase==='timer'){
    const timerPct = Math.round(((workoutSession.timerTotal - workoutSession.timeLeft)/workoutSession.timerTotal)*100);
    el.innerHTML = `
      <div class="name" style="font-size:18px;">${step.ex.name} — подход ${step.setNumber} из ${step.totalSets}</div>
      ${progressBarHtml}
      <div style="text-align:center;margin:22px 0;">
        <div class="mono timer-num" style="font-size:60px;color:var(--accent);font-weight:600;">${workoutSession.timeLeft}с</div>
        <div class="note" style="margin:8px 0;">${workoutSession.timerLabel}</div>
        <div class="progress-gauge" style="max-width:280px;margin:10px auto 0;"><div class="progress-fill" style="width:${timerPct}%"></div></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="btn secondary small" onclick="skipRest()">Пропустить</button>
        <button class="btn danger small" onclick="cancelWorkoutSession()">Прервать тренировку</button>
      </div>`;
  } else {
    el.innerHTML = `
      <div>
        <div class="name" style="font-size:18px;">${step.ex.name} — подход ${step.setNumber} из ${step.totalSets}</div>
        ${progressBarHtml}
        <div class="note" style="margin-top:10px;">Цель: ${step.ex.min}-${step.ex.max} ${step.ex.unit}</div>
        <div style="margin-top:16px;">
          <div class="field" style="margin:0;">
            <label>Сколько сделал (${step.ex.unit})?</label>
            <input type="number" id="setResultInput" placeholder="${step.ex.min}-${step.ex.max}" autofocus style="font-size:20px;text-align:center;padding:14px;">
          </div>
          <button class="btn" style="width:100%;margin-top:12px;" onclick="confirmSetResult()">Подтвердить</button>
          <button class="btn danger small" style="width:100%;margin-top:8px;" onclick="cancelWorkoutSession()">Прервать</button>
        </div>
      </div>`;
    const inputEl = document.getElementById('setResultInput');
    if(inputEl){
      inputEl.focus();
      inputEl.addEventListener('keydown', e=>{ if(e.key==='Enter') confirmSetResult(); });
    }
  }
}

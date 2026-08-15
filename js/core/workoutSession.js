/* =========================================================================
   CORE — WORKOUT SESSION
   The session/timer/rating-flow state machine. Screens subscribe via
   callbacks (onTick/onPhaseChange) instead of this module touching the
   DOM directly, so it can run the same way under Tauri/Capacitor.
   ========================================================================= */
App.Core = App.Core || {};
App.Core.WorkoutSession = (function(){
  const J = ()=>App.Core.Journal;
  const Ex = ()=>App.Core.Exercises;
  const Rt = ()=>App.Core.Ratings;
  const Sched = ()=>App.Core.Schedule;

  const REST_SECONDS = 180;
  const GET_READY_SECONDS = 180;
  const WORK_LABEL = 'Погнали — работай в своём темпе!'; // временная мотивирующая надпись
  const SLEEP_NORM_HOURS = 7;
  const WORKING_WEIGHT_STEP_KG = 1;
  const PROGRESS_RATIO = 1.0;
  const REGRESS_RATIO = 0.8;
  const WORKING_WEIGHT_HISTORY_DEPTH = 3;

  let session = null;    // {queue, index, results, dayLabel, timerId, timeLeft, phase, timerTotal, timerLabel}
  let ratingFlow = null; // {exercises, index, date, dayLabel, summary, ratings}
  let onChange = ()=>{}; // screen hook: called whenever session/ratingFlow state changes

  function setOnChange(fn){ onChange = fn || (()=>{}); }
  function notify(){ onChange(); }

  function sleepAdjustedExercise(ex){
    const hours = J().latestSleep();
    if(hours===null || hours>=SLEEP_NORM_HOURS) return {...ex, adjusted:false};
    const coef = J().getSleepRecoveryCoefficient(hours);
    const reducedSets = Math.max(1, Math.round(ex.sets*coef));
    if(reducedSets < ex.sets) return {...ex, sets:reducedSets, adjusted:true, adjustReason:'sets', sleepHours:hours};
    const reducedMax = Math.max(1, Math.round(ex.max*coef));
    const reducedMin = Math.max(1, Math.min(reducedMax, Math.round(ex.min*coef)));
    if(reducedMax < ex.max || reducedMin < ex.min) return {...ex, min:reducedMin, max:reducedMax, adjusted:true, adjustReason:'reps', sleepHours:hours};
    return {...ex, adjusted:false};
  }

  function predictWorkingWeight(exerciseName, currentWeightKg){
    const base = typeof currentWeightKg==='number' ? currentWeightKg : 0;
    const ex = Ex().findByName(exerciseName);
    if(!ex) return {weight:base, trend:'hold', ratio:null};
    const history = J().loadJournal().filter(j=>j.exercise===exerciseName).sort((a,b)=>a.date<b.date?1:-1).slice(0, WORKING_WEIGHT_HISTORY_DEPTH);
    if(!history.length) return {weight:base, trend:'hold', ratio:null};
    const targetVolume = ex.sets*ex.max;
    const ratio = targetVolume ? history.reduce((sum,j)=>sum + j.sets.reduce((a,b)=>a+b,0)/targetVolume, 0)/history.length : null;
    if(ratio===null) return {weight:base, trend:'hold', ratio};
    if(ratio>=PROGRESS_RATIO) return {weight:Math.round((base+WORKING_WEIGHT_STEP_KG)*10)/10, trend:'up', ratio};
    if(ratio<REGRESS_RATIO) return {weight:Math.max(0, Math.round((base-WORKING_WEIGHT_STEP_KG)*10)/10), trend:'down', ratio};
    return {weight:base, trend:'hold', ratio};
  }

  function getSession(){ return session; }
  function getRatingFlow(){ return ratingFlow; }

  function startFromToday(){
    const p = Sched().getActiveProfile();
    const dayIndex = Sched().todayWeekdayIndex();
    if(p.preset==='classic'){
      if(!Sched().getClassicPlan().length || !Sched().getClassicPlan().some(c=>c.picks.length)) Sched().loadPlanFromProfile(p);
      const today = Sched().getClassicPlan()[dayIndex];
      if(!today || !today.picks.length) return {ok:false, error:'no-plan'};
      buildQueueAndStart(today.picks.map(pk=>pk.ex), today.dayInfo.day);
    } else {
      if(!Sched().getSplitPlan().length || !Sched().getSplitPlan().some(c=>c.picks.length)) Sched().loadPlanFromProfile(p);
      const today = Sched().getSplitPlan()[dayIndex];
      if(!today || !today.picks.length) return {ok:false, error:'no-plan'};
      buildQueueAndStart(today.picks, today.dayInfo.day);
    }
    return {ok:true};
  }

  function buildQueueAndStart(exercises, dayLabel){
    const queue = [];
    exercises.forEach(ex=>{
      const adjustedEx = sleepAdjustedExercise(ex);
      for(let s=1; s<=adjustedEx.sets; s++) queue.push({ex:adjustedEx, setNumber:s, totalSets:adjustedEx.sets});
    });
    session = {queue, index:0, results:{}, dayLabel, timerId:null, timeLeft:0, phase:'prep'};
    notify();
  }

  // Экран 1 («Готовы?») confirmed — starts the work timer for the first подход.
  function beginWorkout(){
    if(!session || session.phase!=='prep') return;
    startPhaseTimer(GET_READY_SECONDS, WORK_LABEL, 'work');
  }

  function cancelSession(){
    if(session && session.timerId) clearInterval(session.timerId);
    session = null;
    notify();
  }

  // kind: 'work' (Экран 2 — рабочий таймер, ведёт к вводу результата) or
  // 'rest' (Экран 3 — отдых, ведёт к следующему рабочему таймеру).
  function startPhaseTimer(seconds, label, kind){
    session.phase = 'timer';
    session.timerKind = kind;
    session.timeLeft = seconds;
    session.timerTotal = seconds;
    session.timerLabel = label;
    notify();
    session.timerId = setInterval(()=>{
      session.timeLeft--;
      if(session.timeLeft<=0){
        clearInterval(session.timerId);
        session.timerId = null;
        if(session.timerKind==='rest'){ startPhaseTimer(GET_READY_SECONDS, WORK_LABEL, 'work'); return; }
        session.phase = 'input';
      }
      notify();
    }, 1000);
  }
  function startRestTimer(){ startPhaseTimer(REST_SECONDS, 'Отдых перед следующим подходом', 'rest'); }
  function skipRest(){
    if(!session) return;
    if(session.timerId){ clearInterval(session.timerId); session.timerId = null; }
    if(session.timerKind==='rest'){ startPhaseTimer(GET_READY_SECONDS, WORK_LABEL, 'work'); return; }
    session.phase = 'input';
    notify();
  }

  function confirmSetResult(value){
    value = parseInt(value)||0;
    const step = session.queue[session.index];
    if(!session.results[step.ex.name]) session.results[step.ex.name] = [];
    session.results[step.ex.name].push(value);
    session.index++;
    if(session.index >= session.queue.length){ finishSession(); return; }
    startRestTimer();
  }

  function finishSession(){
    const todayStr = new Date().toISOString().slice(0,10);
    const exNames = Object.keys(session.results);
    const entries = exNames.map(exName=>{
      const vals = session.results[exName].slice(0,4);
      while(vals.length<4) vals.push(0);
      return {date:todayStr, exercise:exName, sets:vals, notes:'через таймер тренировки'};
    });
    J().appendEntries(entries);
    const dayLabel = session.dayLabel;
    const summary = exNames.map(name=>`${name}: ${session.results[name].join('/')}`).join('<br>');
    session = null;

    ratingFlow = {exercises:exNames, index:0, date:todayStr, dayLabel, summary, ratings:{}};
    notify();
  }

  function setRatingFlowValue(key, value){
    if(!ratingFlow) return;
    const exName = ratingFlow.exercises[ratingFlow.index];
    if(!ratingFlow.ratings[exName]) ratingFlow.ratings[exName] = {};
    ratingFlow.ratings[exName][key] = (ratingFlow.ratings[exName][key]===value) ? 0 : value;
    notify();
  }
  function nextRatingFlowStep(){ if(!ratingFlow) return; ratingFlow.index++; notify(); }
  function skipRatingFlowStep(){
    if(!ratingFlow) return;
    delete ratingFlow.ratings[ratingFlow.exercises[ratingFlow.index]];
    ratingFlow.index++;
    notify();
  }
  function finalizeRatingFlow(){
    if(!ratingFlow) return null;
    Object.keys(ratingFlow.ratings).forEach(exName=>{
      Rt().addExerciseRatingRecord(ratingFlow.date, exName, ratingFlow.ratings[exName]);
    });
    const result = {dayLabel: ratingFlow.dayLabel, summary: ratingFlow.summary};
    ratingFlow = null;
    notify();
    return result;
  }
  function closeAll(){
    if(session && session.timerId) clearInterval(session.timerId);
    session = null; ratingFlow = null;
    notify();
  }

  return {
    REST_SECONDS, GET_READY_SECONDS,
    setOnChange, sleepAdjustedExercise, predictWorkingWeight,
    getSession, getRatingFlow, startFromToday, beginWorkout, cancelSession, skipRest, confirmSetResult,
    setRatingFlowValue, nextRatingFlowStep, skipRatingFlowStep, finalizeRatingFlow, closeAll,
  };
})();

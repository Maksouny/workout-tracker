/* =========================================================================
   CORE — JOURNAL & VITALS
   ========================================================================= */
App.Core = App.Core || {};
App.Core.Journal = (function(){
  const S = App.State;

  // ---------------- Vitals (weight / sleep / steps) ----------------
  function upsertByDate(log, date, field, value){
    const existing = log.find(x=>x.date===date);
    if(existing){ existing[field] = value; }
    else log.push({id: log.length?Math.max(...log.map(x=>x.id))+1:1, date, [field]:value});
    return log;
  }
  function saveVitals({date, weight, sleep, steps}){
    date = date || new Date().toISOString().slice(0,10);
    let any = false;
    if(!isNaN(weight)){ S.set('weightLog', upsertByDate(S.get('weightLog'), date, 'weight', weight)); any = true; }
    if(!isNaN(sleep)){ S.set('sleepLog', upsertByDate(S.get('sleepLog'), date, 'hours', sleep)); any = true; }
    if(!isNaN(steps)){ S.set('stepsLog', upsertByDate(S.get('stepsLog'), date, 'steps', steps)); any = true; }
    return any;
  }
  function latestSteps(){ const log=S.get('stepsLog').slice().sort((a,b)=>a.date<b.date?1:-1); return log.length?log[0].steps:null; }
  function stepsOnDate(date){ const s=S.get('stepsLog').find(x=>x.date===date); return s?s.steps:null; }
  function latestWeight(){ const log=S.get('weightLog').slice().sort((a,b)=>a.date<b.date?1:-1); return log.length?log[0].weight:null; }
  function latestSleep(){ const log=S.get('sleepLog').slice().sort((a,b)=>a.date<b.date?1:-1); return log.length?log[0].hours:null; }
  function weightOnDate(date){ const w=S.get('weightLog').find(x=>x.date===date); return w?w.weight:null; }
  function sleepOnDate(date){ const s=S.get('sleepLog').find(x=>x.date===date); return s?s.hours:null; }
  function deleteVitalEntry(type, date){
    if(type==='weight') S.set('weightLog', S.get('weightLog').filter(w=>w.date!==date));
    else if(type==='sleep') S.set('sleepLog', S.get('sleepLog').filter(s=>s.date!==date));
    else if(type==='steps') S.set('stepsLog', S.get('stepsLog').filter(s=>s.date!==date));
  }

  // ---------------- Journal ----------------
  function loadJournal(){
    const saved = S.get('journal');
    if(saved) return saved;
    const seed = [
      {id:1, date:"2026-07-06", exercise:"Подтягивания", sets:[2,2,1,0], notes:"надо начинать треню с этого"},
      {id:2, date:"2026-07-06", exercise:"Отжимания классические", sets:[14,9,8,6], notes:""},
      {id:3, date:"2026-07-06", exercise:"Обратные отжимания (скамья/стул)", sets:[9,9,8,6], notes:""},
      {id:4, date:"2026-07-06", exercise:"Планка", sets:[60,40,30,20], notes:""},
      {id:5, date:"2026-07-07", exercise:"Приседания", sets:[20,20,18,15], notes:""},
      {id:6, date:"2026-07-07", exercise:"Пресс (подъём на 90°)", sets:[15,15,8,7], notes:""},
      {id:7, date:"2026-07-07", exercise:"Скручивания пресса", sets:[20,18,17,17], notes:"Исправить технику"},
    ];
    S.set('journal', seed);
    return seed;
  }
  function saveJournal(d){ S.set('journal', d); }
  function deleteEntry(id){ saveJournal(loadJournal().filter(j=>j.id!==id)); }
  function updateEntryNotes(id, value){
    const journal = loadJournal();
    const entry = journal.find(j=>j.id===id);
    if(!entry) return;
    entry.notes = value;
    saveJournal(journal);
  }
  function weekdayName(dateStr){
    const days = ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
    return days[new Date(dateStr+"T00:00:00").getDay()];
  }
  function appendEntries(entries){
    const journal = loadJournal();
    let nextId = journal.length ? Math.max(...journal.map(j=>j.id))+1 : 1;
    entries.forEach(e=>journal.push({id:nextId++, ...e}));
    saveJournal(journal);
    return journal;
  }

  // ---------------- Analytics (pure) ----------------
  function calculateCaloriesFromSteps(steps, weightKg){
    if(!steps || steps<=0) return 0;
    const weight = weightKg || latestWeight() || 70;
    const KCAL_PER_STEP_PER_KG = 0.0005;
    return Math.round(steps*weight*KCAL_PER_STEP_PER_KG);
  }
  /** Потрачено сегодня = базовое суточное потребление (TDEE, как в существующем
      расчёте КБЖУ) + калории от шагов + калории от тренировок (по объёму повторений). */
  function dailyBurnedCalories(dateStr){
    const weight = weightOnDate(dateStr)!==null ? weightOnDate(dateStr) : (latestWeight()||70);
    const steps = stepsOnDate(dateStr);
    const walkKcal = steps ? calculateCaloriesFromSteps(steps, weight) : 0;
    const dayEntries = loadJournal().filter(j=>j.date===dateStr);
    const totalReps = dayEntries.reduce((sum,j)=>sum+j.sets.reduce((a,b)=>a+b,0), 0);
    const TRAINING_KCAL_PER_REP_PER_KG = 0.003;
    const trainKcal = Math.round(totalReps*weight*TRAINING_KCAL_PER_REP_PER_KG);
    const savedKbju = App.Core.Kbju.getSaved();
    const baseKcal = savedKbju ? Math.round(App.Core.Kbju.computeAll(savedKbju).tdee) : 0;
    return baseKcal + walkKcal + trainKcal;
  }
  function getSleepRecoveryCoefficient(hours){
    if(!hours || hours<=0) return 0;
    let coef;
    if(hours>=7 && hours<=9) coef = 1;
    else if(hours<7) coef = hours/7;
    else coef = 9/hours;
    return Math.round(Math.max(0, Math.min(1, coef))*100)/100;
  }
  function isScheduledRestDay(dateStr){
    const dayName = weekdayName(dateStr);
    const entry = App.Core.Exercises.SCHEDULE.find(s=>s.day===dayName);
    return entry ? entry.place==='rest' : false;
  }
  function healthyDayIndexComponents(dateStr){
    const components = [];
    const sleepHours = sleepOnDate(dateStr);
    if(sleepHours!==null) components.push({label:'Сон', score:getSleepRecoveryCoefficient(sleepHours)*100});
    const steps = stepsOnDate(dateStr);
    if(steps!==null) components.push({label:'Шаги', score:Math.min(100, Math.round(steps/10000*100))});
    const kbju = S.get('kbju');
    if(kbju){
      const mealsToday = S.get('mealLog').filter(m=>m.date===dateStr && m.dishId);
      if(mealsToday.length){
        const dishes = S.get('dishes');
        const eatenKcal = mealsToday.reduce((sum,m)=>{ const dish=dishes.find(d=>d.id===m.dishId); return sum+(dish?dish.kcal:0); },0);
        const targetKcal = App.Core.Kbju.computeTargetMacros(kbju).kcal;
        if(targetKcal>0){
          const ratio = eatenKcal/targetKcal;
          components.push({label:'Питание', score:Math.max(0, Math.round(100-Math.abs(1-ratio)*100))});
        }
      }
    }
    const trainedToday = loadJournal().some(j=>j.date===dateStr && j.sets.reduce((a,b)=>a+b,0)>0);
    const restDay = isScheduledRestDay(dateStr);
    components.push({label: trainedToday?'Тренировка':(restDay?'День отдыха':'Тренировка'), score:(trainedToday||restDay)?100:0});
    return components;
  }
  function getHealthyDayIndex(dateStr){
    const components = healthyDayIndexComponents(dateStr);
    if(!components.length) return null;
    return Math.round(components.reduce((a,c)=>a+c.score,0)/components.length);
  }

  function journalStats(){
    const journal = loadJournal();
    const weightLog = S.get('weightLog'), sleepLog = S.get('sleepLog'), stepsLog = S.get('stepsLog');
    const ratingHistory = S.get('exerciseRatingHistory');

    const totalWorkouts = journal.length;
    const trainingDays = new Set(journal.map(j=>j.date)).size;
    const totalVolume = journal.reduce((sum,j)=>sum+j.sets.reduce((a,b)=>a+b,0), 0);
    const avgVolume = totalWorkouts ? Math.round(totalVolume/totalWorkouts) : null;

    let mostFrequent = null;
    if(journal.length){
      const counts = {};
      journal.forEach(j=>{ counts[j.exercise]=(counts[j.exercise]||0)+1; });
      const topName = Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
      mostFrequent = {name:topName, count:counts[topName]};
    }
    let bestResult = null;
    journal.forEach(j=>{
      j.sets.forEach(v=>{ if(v>0 && (!bestResult||v>bestResult.value)) bestResult={value:v, exercise:j.exercise, date:j.date}; });
    });
    const distinctExercises = new Set(journal.map(j=>j.exercise)).size;
    const ratingsCount = ratingHistory.length;
    const lastWeight = latestWeight();
    let weightChange = null;
    if(weightLog.length>=2){
      const sorted = weightLog.slice().sort((a,b)=>a.date<b.date?-1:1);
      weightChange = Math.round((sorted[sorted.length-1].weight - sorted[0].weight)*10)/10;
    }
    const avgSleep = sleepLog.length ? Math.round((sleepLog.reduce((a,s)=>a+s.hours,0)/sleepLog.length)*10)/10 : null;
    const avgSteps = stepsLog.length ? Math.round(stepsLog.reduce((a,s)=>a+s.steps,0)/stepsLog.length) : null;

    return { totalWorkouts, trainingDays, totalVolume, avgVolume, mostFrequent, bestResult,
      distinctExercises, ratingsCount, lastWeight, weightChange, avgSleep, avgSteps };
  }

  return {
    saveVitals, latestSteps, stepsOnDate, latestWeight, latestSleep, weightOnDate, sleepOnDate,
    deleteVitalEntry,
    getWeightLog:()=>S.get('weightLog'), getSleepLog:()=>S.get('sleepLog'), getStepsLog:()=>S.get('stepsLog'),
    loadJournal, saveJournal, deleteEntry, updateEntryNotes, weekdayName, appendEntries,
    calculateCaloriesFromSteps, dailyBurnedCalories, getSleepRecoveryCoefficient,
    isScheduledRestDay, healthyDayIndexComponents, getHealthyDayIndex, journalStats,
  };
})();

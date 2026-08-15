/* =========================================================================
   CORE — SCHEDULE GENERATION & PROFILES
   ========================================================================= */
App.Core = App.Core || {};
App.Core.Schedule = (function(){
  const S = App.State;
  const Ex = ()=>App.Core.Exercises;
  const Rt = ()=>App.Core.Ratings;
  const J = ()=>App.Core.Journal;

  const CLASSIC_DAYS = [
    {day:"Понедельник", muscleGroup:"Грудь"}, {day:"Вторник", muscleGroup:"Спина"},
    {day:"Среда", muscleGroup:"Ноги"}, {day:"Четверг", muscleGroup:"Плечи"},
    {day:"Пятница", muscleGroup:"Руки"}, {day:"Суббота", muscleGroup:"Кардио"},
    {day:"Воскресенье", muscleGroup:null},
  ];
  const SPLIT_DAYS = [
    {day:"Понедельник", place:"home", pairs:[["Грудь","Спина"],["Плечи","Спина"]], solo:["Кор"]},
    {day:"Вторник", place:"home", pairs:[["Ноги","Ноги"],["Ноги","Ноги"]], solo:["Кор"]},
    {day:"Среда", place:null, pairs:null, solo:null},
    {day:"Четверг", place:"outside", pairs:[["Спина","Грудь"],["Спина","Плечи"]], solo:["Кор"]},
    {day:"Пятница", place:"outside", pairs:[["Ноги","Ноги"],["Ноги","Ноги"]], solo:["Кор"]},
    {day:"Суббота", place:"outside", pairs:null, solo:["Кардио","Кор"]},
    {day:"Воскресенье", place:null, pairs:null, solo:null},
  ];
  const EXERCISES_PER_DAY = 4;
  let classicPlan = [], splitPlan = [];

  function daysSinceExerciseDone(exerciseName, todayStr){
    const journal = J().loadJournal().filter(j=>j.exercise===exerciseName && j.date<todayStr && j.sets.reduce((a,b)=>a+b,0)>0);
    if(!journal.length) return Infinity;
    const todayDate = new Date(todayStr);
    const diffs = journal.map(j=>Math.round((todayDate-new Date(j.date))/86400000));
    return Math.min(...diffs);
  }
  function scoreExercise(ex, todayStr, favoriteGroup){
    let score = 100;
    const days = daysSinceExerciseDone(ex.name, todayStr);
    if(days<=2) score -= 30; else if(days>=14) score += 15;
    if(ex.liked==='liked') score += 20; else if(ex.liked==='disliked') score -= 50;
    if(favoriteGroup && ex.muscleGroup===favoriteGroup) score += 15;
    if(ex.ratings){
      const avg = Rt().average(ex.ratings, Rt().EXERCISE_RATING_CRITERIA);
      if(avg!==null) score += Math.round((avg-3)*6);
    }
    return score;
  }
  function weightedPickN(scoredList, n){
    const pool = scoredList.slice();
    const picked = [];
    while(picked.length<n && pool.length){
      const minScore = Math.min(...pool.map(s=>s.score));
      const shift = minScore<1 ? (1-minScore) : 0;
      const weights = pool.map(s=>s.score+shift);
      const total = weights.reduce((a,b)=>a+b,0);
      let idx = 0;
      if(total>0){
        let r = Math.random()*total;
        for(let i=0;i<pool.length;i++){ r -= weights[i]; if(r<=0){ idx=i; break; } }
      } else idx = Math.floor(Math.random()*pool.length);
      picked.push(pool[idx]);
      pool.splice(idx,1);
    }
    return picked;
  }
  function locationMatch(exWhere, place){ if(!place) return true; return exWhere===place || exWhere==='both'; }

  function buildClassicDay(dayIndex, favoriteGroup, place){
    const dayInfo = CLASSIC_DAYS[dayIndex];
    const todayStr = new Date().toISOString().slice(0,10);
    if(!dayInfo.muscleGroup){ classicPlan[dayIndex] = {dayInfo, picks:[]}; return; }
    const candidates = Ex().list().filter(e=>e.muscleGroup===dayInfo.muscleGroup && locationMatch(e.where, place));
    const scored = candidates.map(e=>({ex:e, score:scoreExercise(e, todayStr, favoriteGroup)})).sort((a,b)=>b.score-a.score);
    const picks = weightedPickN(scored, Math.min(EXERCISES_PER_DAY, scored.length));
    classicPlan[dayIndex] = {dayInfo, picks};
  }
  function buildClassicWeek(){
    const p = getActiveProfile();
    classicPlan = CLASSIC_DAYS.map((d,i)=>{ buildClassicDay(i, p.favoriteGroup, p.place); return classicPlan[i]; });
    persistActiveProfilePlan();
    return classicPlan;
  }
  function rerollClassicDay(dayIndex){
    const p = getActiveProfile();
    buildClassicDay(dayIndex, p.favoriteGroup, p.place);
    persistActiveProfilePlan();
    return classicPlan;
  }

  function pickOneForGroup(group, place, favoriteGroup, todayStr, excludeNames){
    const candidates = Ex().list().filter(e=>e.muscleGroup===group && locationMatch(e.where, place) && !excludeNames.has(e.name));
    const scored = candidates.map(e=>({ex:e, score:scoreExercise(e, todayStr, favoriteGroup)})).sort((a,b)=>b.score-a.score);
    const chosen = weightedPickN(scored, 1);
    return chosen.length ? chosen[0].ex : null;
  }
  function buildSplitDay(dayIndex, favoriteGroup){
    const dayInfo = SPLIT_DAYS[dayIndex];
    const todayStr = new Date().toISOString().slice(0,10);
    if(!dayInfo.pairs && !dayInfo.solo){ splitPlan[dayIndex] = {dayInfo, rounds:[], picks:[]}; return; }
    const rounds = []; const usedNames = new Set();
    (dayInfo.pairs||[]).forEach((pair,i)=>{
      const exA = pickOneForGroup(pair[0], dayInfo.place, favoriteGroup, todayStr, usedNames);
      if(exA) usedNames.add(exA.name);
      const exB = pickOneForGroup(pair[1], dayInfo.place, favoriteGroup, todayStr, usedNames);
      if(exB) usedNames.add(exB.name);
      const exList = [exA, exB].filter(Boolean);
      if(exList.length) rounds.push({label:`Круг ${i+1}`, exList});
    });
    (dayInfo.solo||[]).forEach(group=>{
      const ex = pickOneForGroup(group, dayInfo.place, favoriteGroup, todayStr, usedNames);
      if(ex){ usedNames.add(ex.name); rounds.push({label:"—", exList:[ex]}); }
    });
    const picks = rounds.flatMap(r=>r.exList);
    splitPlan[dayIndex] = {dayInfo, rounds, picks};
  }
  function buildSplitWeek(){
    const p = getActiveProfile();
    splitPlan = SPLIT_DAYS.map((d,i)=>{ buildSplitDay(i, p.favoriteGroup); return splitPlan[i]; });
    persistActiveProfilePlan();
    return splitPlan;
  }
  function rerollSplitDay(dayIndex){
    const p = getActiveProfile();
    buildSplitDay(dayIndex, p.favoriteGroup);
    persistActiveProfilePlan();
    return splitPlan;
  }

  // ---- Profiles ----
  let activeProfileId = null;
  function loadProfiles(){
    const saved = S.get('profiles');
    if(saved) return saved;
    const seed = [{id:1, name:"Основной", preset:"split", place:"home", favoriteGroup:"", classicPlan:[], splitPlan:[]}];
    S.set('profiles', seed);
    return seed;
  }
  function saveProfiles(arr){ S.set('profiles', arr); }
  function getActiveProfile(){
    const profiles = loadProfiles();
    let p = profiles.find(x=>x.id===activeProfileId);
    if(!p){ p = profiles[0]; activeProfileId = p.id; }
    return p;
  }
  function persistActiveProfilePlan(){
    const profiles = loadProfiles();
    const p = profiles.find(x=>x.id===activeProfileId);
    if(!p) return;
    p.classicPlan = classicPlan.map(cp=>({dayIndex:CLASSIC_DAYS.indexOf(cp.dayInfo), exerciseNames:cp.picks.map(pk=>pk.ex.name)}));
    p.splitPlan = splitPlan.map(sp=>({dayIndex:SPLIT_DAYS.indexOf(sp.dayInfo),
      rounds:sp.rounds.map(r=>({label:r.label, names:r.exList.map(ex=>ex.name)}))}));
    saveProfiles(profiles);
  }
  function loadPlanFromProfile(p){
    classicPlan = CLASSIC_DAYS.map((dayInfo,i)=>{
      const saved = (p.classicPlan||[]).find(x=>x.dayIndex===i);
      if(saved){
        const picks = (saved.exerciseNames||[]).map(name=>{ const ex=Ex().findByName(name); return ex?{ex, score:null}:null; }).filter(Boolean);
        return {dayInfo, picks};
      }
      return {dayInfo, picks:[]};
    });
    splitPlan = SPLIT_DAYS.map((dayInfo,i)=>{
      const saved = (p.splitPlan||[]).find(x=>x.dayIndex===i);
      if(saved && Array.isArray(saved.rounds)){
        const rounds = saved.rounds.map(r=>({label:r.label, exList:(r.names||[]).map(name=>Ex().findByName(name)).filter(Boolean)})).filter(r=>r.exList.length);
        return {dayInfo, rounds, picks: rounds.flatMap(r=>r.exList)};
      }
      return {dayInfo, rounds:[], picks:[]};
    });
  }
  function addProfile(name){
    if(!name) return null;
    const profiles = loadProfiles();
    const id = profiles.length ? Math.max(...profiles.map(p=>p.id))+1 : 1;
    profiles.push({id, name, preset:"split", place:"home", favoriteGroup:"", classicPlan:[], splitPlan:[]});
    saveProfiles(profiles);
    activeProfileId = id;
    return id;
  }
  function deleteProfile(id){
    let profiles = loadProfiles();
    if(profiles.length<=1) return {ok:false, error:'last'};
    profiles = profiles.filter(p=>p.id!==id);
    saveProfiles(profiles);
    if(activeProfileId===id) activeProfileId = profiles[0].id;
    return {ok:true};
  }
  function switchProfile(id){ activeProfileId = id; }
  function updateProfileSetting(field, value){
    const profiles = loadProfiles();
    const p = profiles.find(x=>x.id===activeProfileId);
    if(!p) return;
    p[field] = value;
    saveProfiles(profiles);
  }
  function todayWeekdayIndex(){ const jsDay = new Date().getDay(); return jsDay===0 ? 6 : jsDay-1; }

  return {
    CLASSIC_DAYS, SPLIT_DAYS,
    buildClassicWeek, rerollClassicDay, buildSplitWeek, rerollSplitDay,
    getClassicPlan:()=>classicPlan, getSplitPlan:()=>splitPlan,
    loadProfiles, getActiveProfile, loadPlanFromProfile, addProfile, deleteProfile, switchProfile,
    updateProfileSetting, todayWeekdayIndex,
  };
})();

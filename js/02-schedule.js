// ---------------------------------------------------------------------
// Schedule generation: classic split (day = muscle group) and split (day = several
// muscle groups, dom/outside superset-style) — both scored + rerollable, driven by profiles
// ---------------------------------------------------------------------
const CLASSIC_DAYS = [
  {day:"Понедельник", muscleGroup:"Грудь"},
  {day:"Вторник", muscleGroup:"Спина"},
  {day:"Среда", muscleGroup:"Ноги"},
  {day:"Четверг", muscleGroup:"Плечи"},
  {day:"Пятница", muscleGroup:"Руки"},
  {day:"Суббота", muscleGroup:"Кардио"},
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
let classicPlan = [];
let splitPlan = [];

function daysSinceExerciseDone(exerciseName, todayStr){
  const journal = loadJournal().filter(j=>j.exercise===exerciseName && j.date<todayStr
    && j.sets.reduce((a,b)=>a+b,0)>0);
  if(!journal.length) return Infinity;
  const todayDate = new Date(todayStr);
  const diffs = journal.map(j=>Math.round((todayDate-new Date(j.date))/86400000));
  return Math.min(...diffs);
}

function scoreExercise(ex, todayStr, favoriteGroup){
  let score = 100;
  const days = daysSinceExerciseDone(ex.name, todayStr);
  if(days<=2) score -= 30;
  else if(days>=14) score += 15;
  if(ex.liked==='liked') score += 20;
  else if(ex.liked==='disliked') score -= 50;
  if(favoriteGroup && ex.muscleGroup===favoriteGroup) score += 15;
  if(ex.ratings){
    const avg = ratingAverage(ex.ratings, EXERCISE_RATING_CRITERIA);
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
    } else {
      idx = Math.floor(Math.random()*pool.length);
    }
    picked.push(pool[idx]);
    pool.splice(idx,1);
  }
  return picked;
}

function locationMatch(exWhere, place){
  if(!place) return true;
  return exWhere===place || exWhere==='both';
}

// ---- Classic ----
function buildClassicDay(dayIndex, favoriteGroup, place){
  const dayInfo = CLASSIC_DAYS[dayIndex];
  const todayStr = new Date().toISOString().slice(0,10);
  if(!dayInfo.muscleGroup){
    classicPlan[dayIndex] = {dayInfo, picks: []};
    return;
  }
  const candidates = EXERCISES.filter(e=>e.muscleGroup===dayInfo.muscleGroup && locationMatch(e.where, place));
  const scored = candidates.map(e=>({ex:e, score:scoreExercise(e, todayStr, favoriteGroup)})).sort((a,b)=>b.score-a.score);
  const picks = weightedPickN(scored, Math.min(EXERCISES_PER_DAY, scored.length));
  classicPlan[dayIndex] = {dayInfo, picks};
}
function buildClassicWeek(){
  const p = getActiveProfile();
  classicPlan = CLASSIC_DAYS.map((d,i)=>{ buildClassicDay(i, p.favoriteGroup, p.place); return classicPlan[i]; });
  persistActiveProfilePlan();
  renderSchedule();
}
function rerollClassicDay(dayIndex){
  const p = getActiveProfile();
  buildClassicDay(dayIndex, p.favoriteGroup, p.place);
  persistActiveProfilePlan();
  renderSchedule();
}

// ---- Split ----
function pickOneForGroup(group, place, favoriteGroup, todayStr, excludeNames){
  const candidates = EXERCISES.filter(e=>e.muscleGroup===group && locationMatch(e.where, place) && !excludeNames.has(e.name));
  const scored = candidates.map(e=>({ex:e, score:scoreExercise(e, todayStr, favoriteGroup)})).sort((a,b)=>b.score-a.score);
  const chosen = weightedPickN(scored, 1);
  return chosen.length ? chosen[0].ex : null;
}

function buildSplitDay(dayIndex, favoriteGroup){
  const dayInfo = SPLIT_DAYS[dayIndex];
  const todayStr = new Date().toISOString().slice(0,10);
  if(!dayInfo.pairs && !dayInfo.solo){
    splitPlan[dayIndex] = {dayInfo, rounds: [], picks: []};
    return;
  }
  const rounds = [];
  const usedNames = new Set();
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
  renderSchedule();
}
function rerollSplitDay(dayIndex){
  const p = getActiveProfile();
  buildSplitDay(dayIndex, p.favoriteGroup);
  persistActiveProfilePlan();
  renderSchedule();
}

// ---- Profiles ----
const LS_PROFILES = "zt_profiles";
let activeProfileId = null;

function loadProfiles(){
  const raw = localStorage.getItem(LS_PROFILES);
  if(raw) return JSON.parse(raw);
  const seed = [{id:1, name:"Основной", preset:"split", place:"home", favoriteGroup:"", classicPlan:[], splitPlan:[]}];
  localStorage.setItem(LS_PROFILES, JSON.stringify(seed));
  return seed;
}
function saveProfiles(arr){ localStorage.setItem(LS_PROFILES, JSON.stringify(arr)); }

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
  p.classicPlan = classicPlan.map(cp=>({dayIndex: CLASSIC_DAYS.indexOf(cp.dayInfo), exerciseNames: cp.picks.map(pk=>pk.ex.name)}));
  p.splitPlan = splitPlan.map(sp=>({
    dayIndex: SPLIT_DAYS.indexOf(sp.dayInfo),
    rounds: sp.rounds.map(r=>({label:r.label, names:r.exList.map(ex=>ex.name)}))
  }));
  saveProfiles(profiles);
}

function loadPlanFromProfile(p){
  classicPlan = CLASSIC_DAYS.map((dayInfo,i)=>{
    const saved = (p.classicPlan||[]).find(x=>x.dayIndex===i);
    if(saved){
      const picks = (saved.exerciseNames||[]).map(name=>{
        const ex = EXERCISES.find(e=>e.name===name);
        return ex ? {ex, score:null} : null;
      }).filter(Boolean);
      return {dayInfo, picks};
    }
    return {dayInfo, picks: []};
  });
  splitPlan = SPLIT_DAYS.map((dayInfo,i)=>{
    const saved = (p.splitPlan||[]).find(x=>x.dayIndex===i);
    if(saved && Array.isArray(saved.rounds)){
      const rounds = saved.rounds.map(r=>({
        label: r.label,
        exList: (r.names||[]).map(name=>EXERCISES.find(e=>e.name===name)).filter(Boolean)
      })).filter(r=>r.exList.length);
      const picks = rounds.flatMap(r=>r.exList);
      return {dayInfo, rounds, picks};
    }
    return {dayInfo, rounds: [], picks: []};
  });
}

function addProfile(){
  const name = prompt('Название профиля:');
  if(!name) return;
  const profiles = loadProfiles();
  const id = profiles.length ? Math.max(...profiles.map(p=>p.id))+1 : 1;
  profiles.push({id, name, preset:"split", place:"home", favoriteGroup:"", classicPlan:[], splitPlan:[]});
  saveProfiles(profiles);
  activeProfileId = id;
  renderProfileTabs();
  renderSchedule();
}

function deleteProfile(id){
  let profiles = loadProfiles();
  if(profiles.length<=1){ alert('Должен остаться хотя бы один профиль'); return; }
  if(!confirm('Удалить профиль?')) return;
  profiles = profiles.filter(p=>p.id!==id);
  saveProfiles(profiles);
  if(activeProfileId===id) activeProfileId = profiles[0].id;
  renderProfileTabs();
  renderSchedule();
}

function switchProfile(id){
  activeProfileId = id;
  renderProfileTabs();
  renderSchedule();
}

function updateProfileSetting(field, value){
  const profiles = loadProfiles();
  const p = profiles.find(x=>x.id===activeProfileId);
  if(!p) return;
  p[field] = value;
  saveProfiles(profiles);
  renderSchedule();
}

function renderProfileTabs(){
  const profiles = loadProfiles();
  if(!activeProfileId) activeProfileId = profiles[0].id;
  const el = document.getElementById('profileTabs');
  el.innerHTML = profiles.map(p=>`
    <button class="btn ${p.id===activeProfileId?'':'secondary'} small" onclick="switchProfile(${p.id})">
      ${p.name}${profiles.length>1 ? ` <span onclick="event.stopPropagation();deleteProfile(${p.id})" style="margin-left:6px;">✕</span>` : ''}
    </button>
  `).join('');

  const p = getActiveProfile();
  const settingsEl = document.getElementById('profileSettings');
  const muscleOptions = ['<option value="">Без предпочтения</option>'].concat(
    MUSCLE_GROUPS.map(m=>`<option value="${m}" ${m===p.favoriteGroup?'selected':''}>${m}</option>`)
  ).join('');
  settingsEl.innerHTML = `
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:end;">
      <div>
        <div class="note" style="margin-bottom:4px;">Формат</div>
        <select onchange="updateProfileSetting('preset', this.value)">
          <option value="split" ${p.preset==='split'?'selected':''}>Сплит (по дням, дом/улица)</option>
          <option value="classic" ${p.preset==='classic'?'selected':''}>Классический (день = группа мышц)</option>
        </select>
      </div>
      <div>
        <div class="note" style="margin-bottom:4px;">Локация (для классического формата)</div>
        <select onchange="updateProfileSetting('place', this.value)">
          <option value="home" ${p.place==='home'?'selected':''}>Дом</option>
          <option value="outside" ${p.place==='outside'?'selected':''}>Улица</option>
          <option value="both" ${p.place==='both'?'selected':''}>Любая</option>
        </select>
      </div>
      <div>
        <div class="note" style="margin-bottom:4px;">Любимая группа мышц</div>
        <select onchange="updateProfileSetting('favoriteGroup', this.value)">${muscleOptions}</select>
      </div>
    </div>
  `;
}

function renderSchedule(){
  const p = getActiveProfile();
  const subtitle = document.getElementById('scheduleSubtitle');
  const el = document.getElementById('scheduleContent');

  if(p.preset==='classic'){
    subtitle.textContent = 'Каждый день — новая группа мышц. Упражнения подбираются автоматически: избранные, давно не выполнявшиеся и любимая группа мышц профиля получают приоритет.';
    if(!classicPlan.length || !classicPlan.some(c=>c.picks.length)) loadPlanFromProfile(p);
    if(!classicPlan.some(c=>c.picks.length)){
      el.innerHTML = `<div class="card"><button class="btn" onclick="buildClassicWeek()">Собрать неделю</button></div>`;
      return;
    }
    el.innerHTML = `<div class="card"><button class="btn" onclick="buildClassicWeek()">Пересобрать всю неделю</button></div>` +
      classicPlan.map((cp,i)=>{
        if(!cp.dayInfo.muscleGroup){
          return `<div class="day-block card"><div class="day-head"><span class="dname">${cp.dayInfo.day}</span><span class="tag rest">Отдых</span></div></div>`;
        }
        const rows = cp.picks.map(pk=>{
          const [label, cls] = WHERE_LABEL[pk.ex.where];
          return `<div class="circle-label">${pk.ex.muscleGroup}${pk.score!==null?' · score '+pk.score:''} <span class="tag ${cls}" style="margin-left:6px;">${label}</span></div>
          <div>${pk.ex.name}</div>
          <div class="note">${pk.ex.sets}×${pk.ex.min}-${pk.ex.max} ${pk.ex.unit}</div>`;
        }).join('');
        return `<div class="day-block card">
          <div class="day-head"><span class="dname">${cp.dayInfo.day}</span><span class="tag both">${cp.dayInfo.muscleGroup}</span></div>
          ${rows || '<div class="note">Нет упражнений с этой группой мышц и локацией в справочнике</div>'}
          <div style="margin-top:12px;"><button class="btn secondary small" onclick="rerollClassicDay(${i})">🔄 Пересобрать день</button></div>
        </div>`;
      }).join('');
  } else {
    subtitle.textContent = 'Суперсет = пара упражнений на противоположные группы мышц, подобранная автоматически. Подход первого → 15-30 сек → подход второго → отдых 60-90 сек → повтор круга.';
    if(!splitPlan.length || !splitPlan.some(c=>c.picks.length)) loadPlanFromProfile(p);
    if(!splitPlan.some(c=>c.picks.length)){
      el.innerHTML = `<div class="card"><button class="btn" onclick="buildSplitWeek()">Собрать неделю</button></div>`;
      return;
    }
    el.innerHTML = `<div class="card"><button class="btn" onclick="buildSplitWeek()">Пересобрать всю неделю</button></div>` +
      splitPlan.map((sp,i)=>{
        if(!sp.dayInfo.pairs && !sp.dayInfo.solo){
          return `<div class="day-block card"><div class="day-head"><span class="dname">${sp.dayInfo.day}</span><span class="tag rest">Отдых</span></div></div>`;
        }
        const [placeLabel, placeCls] = WHERE_LABEL[sp.dayInfo.place] || ["Любое","both"];
        const rows = sp.rounds.map(r=>{
          const exHtml = r.exList.map(ex=>{
            const [label, cls] = WHERE_LABEL[ex.where];
            return `${ex.name} <span class="tag ${cls}" style="margin-left:4px;">${label}</span> <span class="note" style="display:inline;">(${ex.sets}×${ex.min}-${ex.max} ${ex.unit})</span>`;
          }).join(' ↔ ');
          return `<div class="circle-label">${r.label}</div><div>${exHtml}</div>`;
        }).join('');
        return `<div class="day-block card">
          <div class="day-head"><span class="dname">${sp.dayInfo.day}</span><span class="tag ${placeCls}">${placeLabel}</span></div>
          ${rows || '<div class="note">Нет подходящих упражнений в справочнике</div>'}
          <div style="margin-top:12px;"><button class="btn secondary small" onclick="rerollSplitDay(${i})">🔄 Пересобрать день</button></div>
        </div>`;
      }).join('');
  }
}

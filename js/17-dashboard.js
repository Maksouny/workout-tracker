// ---------------------------------------------------------------------
// Dashboard / stats
// ---------------------------------------------------------------------
const LS_PROGRESS_LAYOUT = "zt_progress_layout";
const LS_STATS_EXPANDED = "zt_stats_expanded";
function toggleStatsExpanded(){
  const cur = localStorage.getItem(LS_STATS_EXPANDED)==='1';
  localStorage.setItem(LS_STATS_EXPANDED, cur ? '0' : '1');
  renderDashboard();
}
function setProgressLayout(mode){
  localStorage.setItem(LS_PROGRESS_LAYOUT, mode);
  renderDashboard();
}

let calNav = {week:0, month:0, year:0};
function navigateCal(dir){
  const chartPeriodEl = document.getElementById('chartPeriod');
  const period = chartPeriodEl ? chartPeriodEl.value : 'week';
  calNav[period] += dir;
  renderDashboard();
}
function resetCalNav(){
  calNav = {week:0, month:0, year:0};
  renderDashboard();
}

// ---------------------------------------------------------------------
// Калории за день: ходьба (calculateCaloriesFromSteps, js/15-journal.js)
// + тренировки (упрощённая MET-оценка по muscleGroup и unit упражнения).
// Используется вместо графика шагов в блоке "Вес и сон" (renderVitalsCharts
// ниже переопределяет одноимённую функцию из js/05-storage.js).
// ---------------------------------------------------------------------
const MET_BY_GROUP = {"Кардио":8, "Ноги":6, "Спина":5, "Грудь":5, "Плечи":4.5, "Руки":4, "Кор":4};
function estimateWorkoutCalories(entry, weightKg){
  const exDef = EXERCISES.find(x=>x.name===entry.exercise);
  const total = entry.sets.reduce((a,b)=>a+b,0);
  if(!exDef || total<=0) return 0;
  const met = MET_BY_GROUP[exDef.muscleGroup] || 5;
  let minutes;
  if(exDef.unit==='минут') minutes = total;
  else if(exDef.unit==='секунд') minutes = total/60;
  else if(exDef.unit==='интервалов') minutes = total*1.5; // спринт+отдых ≈ 1.5 мин на интервал
  else minutes = total*0.05; // повторения (в т.ч. "на ногу"/"на руку"): ≈3 сек на повторение
  return met*3.5*weightKg/200*minutes; // стандартная формула ккал/мин = MET×3.5×вес(кг)/200
}
function workoutCaloriesForDate(dateStr, weightKg){
  return loadJournal().filter(j=>j.date===dateStr)
    .reduce((sum,j)=>sum+estimateWorkoutCalories(j, weightKg), 0);
}
function dailyBurnedCalories(dateStr){
  const weight = weightOnDate(dateStr) || (typeof getLastWeight==='function' ? getLastWeight() : null) || 70;
  const steps = stepsOnDate(dateStr) || 0;
  const stepsKcal = typeof calculateCaloriesFromSteps==='function' ? calculateCaloriesFromSteps(steps, weight) : 0;
  return Math.round(stepsKcal + workoutCaloriesForDate(dateStr, weight));
}

// Переопределяет renderVitalsCharts (изначально в js/05-storage.js): третья
// колонка теперь "Калории" (ходьба+тренировки) вместо "Шаги". Т.к. этот файл
// подключается позже js/05-storage.js, объявление ниже заменяет исходную
// функцию везде, включая её вызовы из saveVitals() и js/19-init.js.
function renderVitalsCharts(){
  const el = document.getElementById('vitalsCharts');
  if(!el) return;
  const wLog = loadWeightLog().slice().sort((a,b)=> a.date<b.date?-1:1).slice(-14);
  const sLog = loadSleepLog().slice().sort((a,b)=> a.date<b.date?-1:1).slice(-14);
  const wVals = wLog.map(w=>w.weight);
  const sVals = sLog.map(s=>s.hours);
  const wLast = wVals.length ? wVals[wVals.length-1] : null;
  const wFirst = wVals.length ? wVals[0] : null;
  const wDiff = (wLast!==null && wFirst!==null && wVals.length>1) ? Math.round((wLast-wFirst)*10)/10 : null;
  const sLast = sVals.length ? sVals[sVals.length-1] : null;
  const sAvg = sVals.length ? Math.round((sVals.reduce((a,b)=>a+b,0)/sVals.length)*10)/10 : null;

  const today = new Date();
  const calDates = []; for(let i=13;i>=0;i--){ const d=new Date(today); d.setDate(today.getDate()-i); calDates.push(d.toISOString().slice(0,10)); }
  const calVals = calDates.map(dailyBurnedCalories);
  const calLast = calVals.length ? calVals[calVals.length-1] : null;
  const calAvg = calVals.length ? Math.round(calVals.reduce((a,b)=>a+b,0)/calVals.length) : null;

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
      <div class="stat-meta" style="margin:0 0 8px;"><span>Калории: <b>${calLast!==null?calLast:'—'}</b></span>${calAvg!==null?`<span>Средние: <b>${calAvg}</b></span>`:''}</div>
      ${sparkSVG(calVals, {minZero:true, color:'var(--danger)'})}
    </div>
  </div>`;
}

// ---------------------------------------------------------------------
// Прогресс-бары нагрузки мышц: суммарный объём (сеты×повторы) за 7 дней,
// взвешенный коэффициентом load из exDef.muscles.primary/secondary
// (js/01-exercises.js). Секонд. мышцы учитываются с понижающим коэфф. 0.6.
// Полоски — относительно самой нагруженной мышцы за период (100%).
// ---------------------------------------------------------------------
function computeMuscleLoad(days){
  days = days || 7;
  const today = new Date();
  const cutoff = new Date(today); cutoff.setDate(today.getDate()-(days-1));
  const cutoffStr = cutoff.toISOString().slice(0,10);
  const loads = {};
  loadJournal().filter(j=>j.date>=cutoffStr).forEach(j=>{
    const exDef = EXERCISES.find(x=>x.name===j.exercise);
    if(!exDef || !exDef.muscles) return;
    const total = j.sets.reduce((a,b)=>a+b,0);
    if(total<=0) return;
    (exDef.muscles.primary||[]).forEach(m=>{ loads[m.name] = (loads[m.name]||0) + total*m.load; });
    (exDef.muscles.secondary||[]).forEach(m=>{ loads[m.name] = (loads[m.name]||0) + total*m.load*0.6; });
  });
  return loads;
}
function ensureMuscleLoadCard(){
  if(document.getElementById('muscleLoadBars')) return;
  const anchor = document.getElementById('vitalsCharts');
  const anchorCard = anchor ? anchor.closest('.card') : null;
  if(!anchorCard || !anchorCard.parentNode) return;
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<h2>Нагрузка мышц</h2>
    <div class="note" style="margin-top:-6px;margin-bottom:10px;">За последние 7 дней, относительно самой нагруженной мышцы за этот период.</div>
    <div id="muscleLoadBars"></div>`;
  anchorCard.parentNode.insertBefore(card, anchorCard.nextSibling);
}
function renderMuscleLoadBars(){
  const el = document.getElementById('muscleLoadBars');
  if(!el) return;
  const loads = computeMuscleLoad(7);
  const entries = Object.entries(loads).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if(!entries.length){ el.innerHTML = '<div class="note">Пока нет тренировок за последние 7 дней</div>'; return; }
  const max = entries[0][1] || 1;
  el.innerHTML = entries.map(([name,val])=>{
    const pct = Math.round(Math.min(1, val/max)*100);
    return `<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:4px;">
        <span>${name}</span><span class="mono">${pct}%</span>
      </div>
      <div style="position:relative;height:12px;background:var(--surface2);border-radius:6px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;border-radius:6px;background:linear-gradient(90deg,var(--steel),var(--accent));transition:width .4s ease;"></div>
      </div>
    </div>`;
  }).join('');
}

// ---------------------------------------------------------------------
// Индекс здорового дня (getHealthyDayIndex, js/15-journal.js) над кнопкой
// «Начать тренировку».
// ---------------------------------------------------------------------
function ensureHealthyDayIndexEl(){
  if(document.getElementById('healthyDayIndexWrap')) return;
  const wrap = document.getElementById('workoutSessionWrap');
  if(!wrap) return;
  const div = document.createElement('div');
  div.id = 'healthyDayIndexWrap';
  div.style.marginBottom = '14px';
  wrap.insertBefore(div, wrap.firstChild);
}
function renderHealthyDayIndex(){
  const el = document.getElementById('healthyDayIndexWrap');
  if(!el || typeof getHealthyDayIndex!=='function') return;
  const today = new Date().toISOString().slice(0,10);
  const idx = getHealthyDayIndex(today);
  el.innerHTML = `<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">Индекс здорового дня: <b class="mono" style="color:var(--text);">${idx}</b></div>
    <div style="position:relative;height:10px;background:var(--surface2);border-radius:5px;overflow:hidden;max-width:280px;margin:0 auto;">
      <div style="height:100%;width:${idx}%;border-radius:5px;background:linear-gradient(90deg,var(--steel),var(--accent));transition:width .4s ease;"></div>
    </div>`;
}

// ---------------------------------------------------------------------
// Индикатор разнообразия питания — полоска в самом верху "Дневник здоровья".
// Доля уникальных блюд, выбранных автоподбором (loadMealLog, js/05-storage.js)
// за 14 дней, относительно ориентира из 10 разных блюд (или всех блюд, если
// их меньше 10).
// ---------------------------------------------------------------------
function computeDietVarietyPct(){
  const days = 14;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-(days-1));
  const cutoffStr = cutoff.toISOString().slice(0,10);
  const log = loadMealLog().filter(e=>e.date>=cutoffStr);
  const uniqueIds = new Set(log.map(e=>e.dishId));
  const totalDishes = loadDishes().length;
  if(!totalDishes) return 0;
  const target = Math.min(totalDishes, 10);
  return Math.round(Math.min(1, uniqueIds.size/target)*100);
}
function ensureDietVarietyBar(){
  if(document.getElementById('dietVarietyBar')) return;
  const page = document.getElementById('page-nutrition');
  if(!page) return;
  const div = document.createElement('div');
  div.id = 'dietVarietyBar';
  div.className = 'card';
  div.style.marginBottom = '20px';
  page.insertBefore(div, page.firstChild);
}
function renderDietVarietyBar(){
  const el = document.getElementById('dietVarietyBar');
  if(!el) return;
  const pct = computeDietVarietyPct();
  el.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:6px;">
      <span>Разнообразие питания (14 дней)</span><span class="mono">${pct}%</span>
    </div>
    <div style="position:relative;height:10px;background:var(--surface2);border-radius:5px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;border-radius:5px;background:linear-gradient(90deg,var(--cyan),var(--good));transition:width .4s ease;"></div>
    </div>`;
}
// Автообновление при каждом изменении автоподбора рациона (logMealChoice —
// единая точка сохранения выбора блюда, js/05-storage.js), без правки
// файла со сборкой плана дня.
if(typeof logMealChoice==='function'){
  const _origLogMealChoice = logMealChoice;
  logMealChoice = function(){
    _origLogMealChoice.apply(this, arguments);
    renderDietVarietyBar();
  };
}

// ---------------------------------------------------------------------
// Переключатель цели (набор массы/похудение/удержание) в "Настройках".
// Логика уже реализована в js/05-storage.js (getUserGoal/setUserGoal/
// GOAL_OPTIONS/GOAL_LABELS) и используется в расчёте КБЖУ (js/08-kbju.js) —
// здесь только недостающий переключатель в интерфейсе.
// ---------------------------------------------------------------------
function ensureGoalSetting(){
  if(document.getElementById('inGoal')) return;
  const card = document.querySelector('#page-settings .card');
  if(!card || typeof GOAL_OPTIONS==='undefined') return;
  const current = typeof getUserGoal==='function' ? getUserGoal() : GOAL_MAINTAIN;
  const field = document.createElement('div');
  field.className = 'field';
  field.innerHTML = `<label>Цель</label>
    <select id="inGoal" onchange="setUserGoal(this.value); if(typeof calcKbju==='function') calcKbju(); renderDashboard();">
      ${GOAL_OPTIONS.map(g=>`<option value="${g}" ${g===current?'selected':''}>${GOAL_LABELS[g]}</option>`).join('')}
    </select>`;
  card.insertBefore(field, card.firstChild);
}

// ---------------------------------------------------------------------
// "Прогресс по упражнениям": показать только упражнения из графика
// упражнений (недельного плана активного профиля — classicPlan/splitPlan,
// js/02-schedule.js).
// ---------------------------------------------------------------------
const LS_ONLY_SCHEDULED = "zt_only_scheduled_ex";
function toggleOnlyScheduled(checked){
  localStorage.setItem(LS_ONLY_SCHEDULED, checked ? '1' : '0');
  renderDashboard();
}
function getScheduledExerciseNames(){
  if(typeof getActiveProfile!=='function') return null;
  const p = getActiveProfile();
  if(!p) return null;
  if(p.preset==='classic'){
    if((!classicPlan.length || !classicPlan.some(c=>c.picks.length)) && typeof loadPlanFromProfile==='function') loadPlanFromProfile(p);
    return new Set(classicPlan.flatMap(c=>c.picks.map(pk=>pk.ex.name)));
  }
  if((!splitPlan.length || !splitPlan.some(c=>c.picks.length)) && typeof loadPlanFromProfile==='function') loadPlanFromProfile(p);
  return new Set(splitPlan.flatMap(sp=>sp.picks.map(pk=>pk.name)));
}
function ensureOnlyScheduledToggle(){
  if(document.getElementById('onlyScheduledEx')) return;
  const styleSelect = document.getElementById('progressStyle');
  const bar = styleSelect ? styleSelect.closest('.filter-bar') : null;
  if(!bar) return;
  const checked = localStorage.getItem(LS_ONLY_SCHEDULED)==='1';
  const label = document.createElement('label');
  label.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);cursor:pointer;';
  label.innerHTML = `<input type="checkbox" id="onlyScheduledEx" ${checked?'checked':''} onchange="toggleOnlyScheduled(this.checked)"> Только по графику`;
  const buttonsGroup = bar.children[1];
  if(buttonsGroup) bar.insertBefore(label, buttonsGroup); else bar.appendChild(label);
}

// Переименование пункта меню "График" → "График упражнений" (п.5) — сделано
// здесь, а не правкой index.html, чтобы не трогать другие файлы проекта.
const scheduleNavBtn = document.querySelector('nav button[data-page="schedule"]');
if(scheduleNavBtn) scheduleNavBtn.textContent = 'График упражнений';

// Разово создаём вставленные блоки/элементы управления в разметке других
// страниц (без правки index.html — только вставка DOM-узлов из этого файла).
ensureMuscleLoadCard();
ensureHealthyDayIndexEl();
ensureDietVarietyBar();
ensureGoalSetting();
ensureOnlyScheduledToggle();
renderDietVarietyBar();

// saveVitals уже обёрнута один раз в js/08-kbju.js (пересчёт КБЖУ) — здесь
// оборачиваем ещё раз, чтобы вес/сон/шаги сразу обновляли индекс здорового
// дня, полоски нагрузки мышц и график калорий на главной.
if(typeof saveVitals==='function'){
  const _origSaveVitalsForDashboard = saveVitals;
  saveVitals = function(){
    _origSaveVitalsForDashboard.apply(this, arguments);
    renderDashboard();
  };
}

function renderDashboard(){
  const journal = loadJournal();
  const dates = journal.map(j=>j.date).filter(Boolean).sort();
  const startDate = dates.length ? dates[0] : new Date().toISOString().slice(0,10);
  const today = new Date().toISOString().slice(0,10);
  const weekNum = Math.floor((new Date(today) - new Date(startDate))/(7*86400000)) + 1;

  document.getElementById('dbWeek').textContent = weekNum;
  document.getElementById('dbSessions').textContent = journal.length;
  document.getElementById('dbDishes').textContent = loadDishes().length;
  renderVitalsCharts();
  ensureHealthyDayIndexEl();
  renderHealthyDayIndex();
  ensureMuscleLoadCard();
  renderMuscleLoadBars();
  ensureOnlyScheduledToggle();

  const chartTypeEl = document.getElementById('chartType');
  const chartType = chartTypeEl ? chartTypeEl.value : 'volume';
  const chartPeriodEl = document.getElementById('chartPeriod');
  const chartPeriod = chartPeriodEl ? chartPeriodEl.value : 'week';

  function dayValue(dateStr){
    const entries = journal.filter(j=>j.date===dateStr);
    if(!entries.length) return 0;
    if(chartType==='sessions') return entries.length;
    if(chartType==='variety') return new Set(entries.map(e=>e.exercise)).size;
    if(chartType==='progress'){
      const pcts = entries.map(e=>{
        const exDef = EXERCISES.find(x=>x.name===e.exercise);
        if(!exDef) return null;
        const target = exDef.finalGoal || (exDef.sets*exDef.max);
        const total = e.sets.reduce((a,b)=>a+b,0);
        return target>0 ? Math.min(1, total/target)*100 : null;
      }).filter(v=>v!==null);
      return pcts.length ? Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length) : 0;
    }
    return entries.reduce((a,e)=>a+e.sets.reduce((x,y)=>x+y,0), 0);
  }

  function calCell(dateKey, label, value, ringPct, isToday, subLabel){
    const r = 19, circ = 2*Math.PI*r;
    const clampedPct = Math.max(0, Math.min(1, ringPct));
    const offset = circ*(1-clampedPct);
    const color = isToday ? 'var(--accent)' : 'var(--steel)';
    return `<div class="cal-cell ${isToday?'today':''}" title="${dateKey}: ${value}">
      <svg class="cal-ring" viewBox="0 0 44 44" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <circle cx="22" cy="22" r="${r}" fill="none" stroke="var(--line)" stroke-width="3"/>
        ${value>0 ? `<circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="3"
          stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"
          transform="rotate(-90 22 22)" style="filter:drop-shadow(0 0 3px ${color});transition:stroke-dashoffset .4s ease;"/>` : ''}
      </svg>
      <div class="cal-daynum">${label}</div>
      ${subLabel ? `<div class="cal-sub">${subLabel}</div>` : ''}
    </div>`;
  }

  const weekdayNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const now = new Date();
  let calHtml = '';
  let legendText = '';

  if(chartPeriod==='week'){
    const dow = (now.getDay()+6)%7;
    const monday = new Date(now); monday.setDate(now.getDate()-dow+calNav.week*7);
    const days = []; for(let i=0;i<7;i++){ const d=new Date(monday); d.setDate(monday.getDate()+i); days.push(d); }
    const dateStrs = days.map(d=>d.toISOString().slice(0,10));
    const values = dateStrs.map(dayValue);
    const localMax = Math.max(1, ...values);
    const head = weekdayNames.map(w=>`<div class="cal-weekday">${w}</div>`).join('');
    const cells = days.map((d,i)=>{
      const val = values[i];
      const pct = chartType==='progress' ? val/100 : val/localMax;
      return calCell(dateStrs[i], d.getDate(), val, pct, dateStrs[i]===today, weekdayNames[i]);
    }).join('');
    const navLabel = `${days[0].getDate().toString().padStart(2,'0')}.${(days[0].getMonth()+1).toString().padStart(2,'0')} – ${days[6].getDate().toString().padStart(2,'0')}.${(days[6].getMonth()+1).toString().padStart(2,'0')}.${days[6].getFullYear()}`;
    calHtml = `<div class="cal-wrap">
      <div class="cal-nav">
        <button class="cal-nav-btn" onclick="navigateCal(-1)">‹</button>
        <div class="cal-nav-label">${navLabel}</div>
        <button class="cal-nav-btn" onclick="navigateCal(1)">›</button>
        ${calNav.week!==0 ? `<span class="cal-nav-today" onclick="resetCalNav()">Сегодня</span>` : ''}
      </div>
      <div class="cal-grid">${head}${cells}</div>
    </div>`;
    legendText = 'Кольцо — заполненность дня относительно лучшего дня недели, сегодня подсвечено золотым.';
  } else if(chartPeriod==='month'){
    const base = new Date(now.getFullYear(), now.getMonth()+calNav.month, 1);
    const y = base.getFullYear(), m = base.getMonth();
    const daysInMonth = new Date(y,m+1,0).getDate();
    const leadPad = (new Date(y,m,1).getDay()+6)%7;
    const dateStrs = []; for(let d=1; d<=daysInMonth; d++) dateStrs.push(`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    const values = dateStrs.map(dayValue);
    const localMax = Math.max(1, ...values);
    const head = weekdayNames.map(w=>`<div class="cal-weekday">${w}</div>`).join('');
    let cells = '';
    for(let i=0;i<leadPad;i++) cells += `<div class="cal-cell pad"></div>`;
    dateStrs.forEach((ds,i)=>{
      const val = values[i];
      const pct = chartType==='progress' ? val/100 : val/localMax;
      cells += calCell(ds, i+1, val, pct, ds===today, '');
    });
    const monthNamesFull = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    calHtml = `<div class="cal-wrap">
      <div class="cal-nav">
        <button class="cal-nav-btn" onclick="navigateCal(-1)">‹</button>
        <div class="cal-nav-label">${monthNamesFull[m]} ${y}</div>
        <button class="cal-nav-btn" onclick="navigateCal(1)">›</button>
        ${calNav.month!==0 ? `<span class="cal-nav-today" onclick="resetCalNav()">Сегодня</span>` : ''}
      </div>
      <div class="cal-grid month-grid">${head}${cells}</div>
    </div>`;
    legendText = 'Кольцо — заполненность дня относительно лучшего дня месяца, сегодня подсвечено золотым.';
  } else {
    const y = now.getFullYear() + calNav.year;
    const monthNames = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
    const values = [];
    for(let mo=0; mo<12; mo++){
      const daysInM = new Date(y,mo+1,0).getDate();
      let sum=0, cnt=0, pctSum=0, pctCnt=0;
      for(let d=1; d<=daysInM; d++){
        const ds = `${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const v = dayValue(ds);
        if(v>0){ if(chartType==='progress'){ pctSum+=v; pctCnt++; } else { sum+=v; cnt++; } }
      }
      values.push(chartType==='progress' ? (pctCnt?Math.round(pctSum/pctCnt):0) : sum);
    }
    const localMax = Math.max(1, ...values);
    const curMonth = now.getMonth();
    const cells = values.map((val,i)=>{
      const pct = chartType==='progress' ? val/100 : val/localMax;
      return calCell(y+'-'+String(i+1).padStart(2,'0'), monthNames[i], val, pct, i===curMonth && calNav.year===0, '');
    }).join('');
    calHtml = `<div class="cal-wrap">
      <div class="cal-nav">
        <button class="cal-nav-btn" onclick="navigateCal(-1)">‹</button>
        <div class="cal-nav-label">${y}</div>
        <button class="cal-nav-btn" onclick="navigateCal(1)">›</button>
        ${calNav.year!==0 ? `<span class="cal-nav-today" onclick="resetCalNav()">Сегодня</span>` : ''}
      </div>
      <div class="cal-grid year-grid">${cells}</div>
    </div>`;
    legendText = `Кольцо — заполненность месяца относительно лучшего месяца года, текущий месяц подсвечен золотым.`;
  }
  document.getElementById('weekChart').innerHTML = calHtml;
  const legendEl = document.getElementById('calLegend');
  if(legendEl) legendEl.textContent = legendText;

  const statEl = document.getElementById('statList');
  const layout = localStorage.getItem(LS_PROGRESS_LAYOUT) || 'list';
  statEl.className = layout==='grid' ? 'grid-view' : '';
  const listBtn = document.getElementById('layoutListBtn');
  const gridBtn = document.getElementById('layoutGridBtn');
  if(listBtn && gridBtn){
    listBtn.className = 'btn small ' + (layout==='list' ? '' : 'secondary');
    gridBtn.className = 'btn small ' + (layout==='grid' ? '' : 'secondary');
  }
  const progressStyleEl = document.getElementById('progressStyle');
  const progressStyle = progressStyleEl ? progressStyleEl.value : 'bar';

  function renderProgressViz(pct, totals, target){
    const pctRound = Math.round(pct*100);
    if(progressStyle==='ring'){
      const r = 46, circ = 2*Math.PI*r;
      const offset = circ*(1-pct);
      return `<div style="display:flex;align-items:center;gap:16px;">
        <svg width="112" height="112" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r="${r}" fill="none" stroke="var(--surface2)" stroke-width="11"/>
          <circle cx="56" cy="56" r="${r}" fill="none" stroke="var(--accent)" stroke-width="11"
            stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"
            transform="rotate(-90 56 56)" style="filter:drop-shadow(0 0 4px rgba(232,178,61,.5));transition:stroke-dashoffset .4s ease;"/>
          <text x="56" y="52" text-anchor="middle" font-size="22" font-weight="600" fill="var(--text)" font-family="IBM Plex Mono, monospace">${pctRound}%</text>
          <text x="56" y="70" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="Inter, sans-serif">цели</text>
        </svg>
      </div>`;
    }
    if(progressStyle==='spark'){
      if(!totals.length) return '<div class="note">Пока нет данных</div>';
      const last8 = totals.slice(-8);
      const maxT = Math.max(target, ...last8) * 1.05;
      const w = 280, h = 70, pad = 6;
      const step = last8.length>1 ? (w-pad*2)/(last8.length-1) : 0;
      const xy = last8.map((t,i)=>[Math.round(pad+i*step), Math.round(h-pad-(t/maxT)*(h-pad*2))]);
      const points = xy.map(p=>p.join(',')).join(' ');
      const areaPoints = `${pad},${h-pad} ${points} ${xy[xy.length-1][0]},${h-pad}`;
      const targetY = Math.round(h-pad-(target/maxT)*(h-pad*2));
      return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--steel)" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="var(--steel)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <line x1="${pad}" y1="${targetY}" x2="${w-pad}" y2="${targetY}" stroke="var(--muted)" stroke-dasharray="4,4" stroke-width="1"/>
        <polygon points="${areaPoints}" fill="url(#sparkFill)"/>
        <polyline points="${points}" fill="none" stroke="var(--steel)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
        ${xy.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4.5" fill="var(--accent)" stroke="var(--bg)" stroke-width="1.5"/>`).join('')}
      </svg>`;
    }
    if(progressStyle==='dots'){
      if(!totals.length) return '<div class="note">Пока нет данных</div>';
      const last12 = totals.slice(-12);
      return `<div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center;padding:4px 0;">${last12.map(t=>{
        const ok = t/target >= 0.8;
        const mid = t/target >= 0.4;
        const color = ok ? 'var(--good)' : (mid ? 'var(--accent)' : 'var(--danger)');
        return `<span title="${t}" style="width:20px;height:20px;border-radius:50%;background:${color};display:inline-block;
          box-shadow:0 0 8px ${color}77;border:2px solid var(--surface);"></span>`;
      }).join('')}</div>`;
    }
    // default: bar (bigger, gradient fill, percent overlaid)
    return `<div style="position:relative;height:26px;background:var(--surface2);border-radius:13px;overflow:hidden;
      background-image:repeating-linear-gradient(90deg,var(--line) 0 1px,transparent 1px 10%);">
      <div style="height:100%;width:${pctRound}%;border-radius:13px 0 0 13px;
        background:linear-gradient(90deg,var(--steel),var(--accent));transition:width .4s ease;"></div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:flex-end;padding-right:10px;
        font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:var(--text);text-shadow:0 1px 2px rgba(0,0,0,.6);">${pctRound}%</div>
    </div>`;
  }

  const onlyScheduled = localStorage.getItem(LS_ONLY_SCHEDULED)==='1';
  let statExercises = EXERCISES;
  if(onlyScheduled){
    const scheduledNames = getScheduledExerciseNames();
    if(scheduledNames && scheduledNames.size) statExercises = EXERCISES.filter(e=>scheduledNames.has(e.name));
  }
  const statCardsHtml = statExercises.map(e=>{
    const entries = journal.filter(j=>j.exercise===e.name && j.sets.reduce((a,b)=>a+b,0)>0)
                            .sort((a,b)=> a.date < b.date ? -1 : 1);
    const target = e.finalGoal || targetVolume(e);
    if(!entries.length){
      return `<div class="stat-card">
        <div class="name">${e.name}</div>
        ${renderProgressViz(0, [], target)}
        <div class="stat-meta"><span>Тренировок: <b>0</b></span><span>Финальная цель: <b>${target}</b></span></div>
      </div>`;
    }
    const totals = entries.map(j=>j.sets.reduce((a,b)=>a+b,0));
    const last = totals[totals.length-1];
    const first = totals[0];
    const best = Math.max(...totals);
    const avg = Math.round((totals.reduce((a,b)=>a+b,0)/totals.length)*10)/10;
    const pct = Math.min(1, last/target);
    const remaining = Math.max(0, target-last);
    const progress = entries.length>1 ? last-first : null;
    return `<div class="stat-card">
      <div class="name">${e.name}</div>
      ${renderProgressViz(pct, totals, target)}
      <div class="stat-meta">
        <span>Последний: <b>${last}</b></span>
        <span>Финальная цель: <b>${target}</b></span>
        <span>Осталось: <b>${remaining}</b></span>
        <span>Тренировок: <b>${entries.length}</b></span>
        <span>Средний: <b>${avg}</b></span>
        <span>Лучший: <b>${best}</b></span>
        ${progress!==null ? `<span>С начала: <b>${progress>=0?'+':''}${progress}</b></span>` : ''}
      </div>
    </div>`;
  });

  const expanded = localStorage.getItem(LS_STATS_EXPANDED)==='1';
  const rowLimit = layout==='grid' ? 4 : 1;
  statEl.innerHTML = (expanded ? statCardsHtml : statCardsHtml.slice(0, rowLimit)).join('');
  const expandBtn = document.getElementById('expandStatsBtn');
  if(expandBtn){
    expandBtn.style.display = statCardsHtml.length>rowLimit ? 'inline-block' : 'none';
    expandBtn.textContent = expanded ? 'Свернуть' : `Показать всё (${statCardsHtml.length})`;
  }
}

// ---------------------------------------------------------------------
// Journal page
// ---------------------------------------------------------------------
function toggleAddEntryBlock(){
  const block = document.getElementById('addEntryBlock');
  const btn = document.getElementById('addEntryToggleBtn');
  const isHidden = block.style.display === 'none';
  block.style.display = isHidden ? 'block' : 'none';
  btn.textContent = isHidden ? 'Скрыть форму' : '+ Добавить тренировку';
}

function initJournalForm(){
  const sel = document.getElementById('jExercise');
  sel.innerHTML = EXERCISES.map(e=>`<option value="${e.name}">${e.name}</option>`).join('');
  const filterSel = document.getElementById('filterExercise');
  filterSel.innerHTML += EXERCISES.map(e=>`<option value="${e.name}">${e.name}</option>`).join('');
  document.getElementById('jDate').value = new Date().toISOString().slice(0,10);
}

function addEntry(){
  const date = document.getElementById('jDate').value;
  const exercise = document.getElementById('jExercise').value;
  const s1 = parseInt(document.getElementById('jS1').value)||0;
  const s2 = parseInt(document.getElementById('jS2').value)||0;
  const s3 = parseInt(document.getElementById('jS3').value)||0;
  const s4 = parseInt(document.getElementById('jS4').value)||0;
  const notes = document.getElementById('jNotes').value;
  if(!date){ alert('Укажи дату'); return; }

  const journal = loadJournal();
  const id = journal.length ? Math.max(...journal.map(j=>j.id))+1 : 1;
  journal.push({id, date, exercise, sets:[s1,s2,s3,s4], notes});
  saveJournal(journal);

  document.getElementById('jS1').value='';
  document.getElementById('jS2').value='';
  document.getElementById('jS3').value='';
  document.getElementById('jS4').value='';
  document.getElementById('jNotes').value='';

  renderJournalList();
  renderDashboard();
}

function deleteEntry(id){
  let journal = loadJournal();
  journal = journal.filter(j=>j.id!==id);
  saveJournal(journal);
  renderJournalList();
  renderDashboard();
}

function weekdayName(dateStr){
  const days = ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
  return days[new Date(dateStr+"T00:00:00").getDay()];
}

function updateEntryNotes(id, value){
  const journal = loadJournal();
  const entry = journal.find(j=>j.id===id);
  if(!entry) return;
  entry.notes = value;
  saveJournal(journal);
}

function deleteVitalEntry(type, date){
  if(type==='weight') saveWeightLog(loadWeightLog().filter(w=>w.date!==date));
  else if(type==='sleep') saveSleepLog(loadSleepLog().filter(s=>s.date!==date));
  else if(type==='steps') saveStepsLog(loadStepsLog().filter(s=>s.date!==date));
  renderJournalList();
  renderVitalsCharts();
}

function deleteExerciseRatingEntry(id){
  saveExerciseRatingHistory(loadExerciseRatingHistory().filter(r=>r.id!==id));
  renderJournalList();
  renderReference();
}

let journalShowAll = false;
function toggleJournalShowAll(){
  journalShowAll = !journalShowAll;
  renderJournalList();
}
let journalVitalsExpanded = false;
function toggleJournalVitals(){
  journalVitalsExpanded = !journalVitalsExpanded;
  renderJournalList();
}
function renderJournalList(){
  const journal = loadJournal().slice().sort((a,b)=> a.date < b.date ? 1 : -1);
  const filter = document.getElementById('filterExercise').value;
  const dateQuery = (document.getElementById('filterDate').value || '').trim().toLowerCase();
  const weekdayFilter = document.getElementById('filterWeekday').value;
  let filtered = filter ? journal.filter(j=>j.exercise===filter) : journal;
  if(dateQuery){
    filtered = filtered.filter(j=>{
      const isoDate = j.date;
      const ruDate = j.date.split('-').reverse().join('.');
      return isoDate.toLowerCase().includes(dateQuery) || ruDate.toLowerCase().includes(dateQuery);
    });
  }
  const todayWeekday = String(new Date().getDay());
  if(!journalShowAll){
    filtered = filtered.filter(j=> String(new Date(j.date+"T00:00:00").getDay()) === todayWeekday);
  } else if(weekdayFilter!==''){
    filtered = filtered.filter(j=> String(new Date(j.date+"T00:00:00").getDay()) === weekdayFilter);
  }
  const btn = document.getElementById('journalShowAllBtn');
  if(btn) btn.textContent = journalShowAll ? 'Показать только сегодня' : 'Показать всё';
  const modeNote = document.getElementById('journalModeNote');
  if(modeNote) modeNote.textContent = journalShowAll
    ? ''
    : `Показаны записи только за ${weekdayName(new Date().toISOString().slice(0,10))} — нажми «Показать всё», чтобы увидеть остальные дни.`;
  const el = document.getElementById('journalList');
  if(!filtered.length){ el.innerHTML = '<div class="note">Ничего не найдено</div>'; return; }

  let html = '';
  let lastDate = null;
  filtered.forEach(j=>{
    if(j.date !== lastDate){
      lastDate = j.date;
      const w = weightOnDate(j.date);
      const s = sleepOnDate(j.date);
      const st = stepsOnDate(j.date);
      const metaParts = [];
      if(w!==null) metaParts.push(`<span>Вес: <b>${w} кг</b> <span class="del-inline" title="Удалить запись веса за этот день" onclick="deleteVitalEntry('weight','${j.date}')">✕</span></span>`);
      if(s!==null) metaParts.push(`<span>Сон: <b>${s} ч</b> <span class="del-inline" title="Удалить запись сна за этот день" onclick="deleteVitalEntry('sleep','${j.date}')">✕</span></span>`);
      if(st!==null) metaParts.push(`<span>Шаги: <b>${st}</b> <span class="del-inline" title="Удалить запись шагов за этот день" onclick="deleteVitalEntry('steps','${j.date}')">✕</span></span>`);
      const dayRatings = loadExerciseRatingHistory().filter(r=>r.date===j.date);
      dayRatings.forEach(r=>{
        metaParts.push(`<span>Оценка «${r.exercise}» <span class="del-inline" title="Удалить эту оценку" onclick="deleteExerciseRatingEntry(${r.id})">✕</span></span>`);
      });
      html += `<div class="journal-day-divider">
        <div class="dname">${j.date.split('-').reverse().join('.')} · ${weekdayName(j.date)}</div>
        ${metaParts.length ? `<span class="journal-vitals-toggle" onclick="toggleJournalVitals()">${journalVitalsExpanded?'Скрыть данные ▲':'Вес / сон / шаги ▾'}</span>` : ''}
        ${(metaParts.length && journalVitalsExpanded) ? `<div class="journal-day-meta">${metaParts.join('')}</div>` : ''}
      </div>`;
    }
    const total = j.sets.reduce((a,b)=>a+b,0);
    html += `<div class="journal-row">
      <div>${j.date}</div>
      <div>${weekdayName(j.date)}</div>
      <div>${j.exercise}</div>
      <div class="mono">${j.sets[0]||''}</div>
      <div class="mono">${j.sets[1]||''}</div>
      <div class="mono">${j.sets[2]||''}</div>
      <div class="mono">${j.sets[3]||''}</div>
      <div class="mono">${total}</div>
      <div><input type="text" value="${(j.notes||'').replace(/"/g,'&quot;')}" placeholder="заметка"
        style="width:100%;background:transparent;border:1px solid transparent;color:var(--text);font-size:12px;
        padding:3px 4px;border-radius:4px;" onchange="updateEntryNotes(${j.id}, this.value)"
        onfocus="this.style.background='var(--surface)';this.style.borderColor='var(--line)';"
        onblur="this.style.background='transparent';this.style.borderColor='transparent';"></div>
      <div class="del" onclick="deleteEntry(${j.id})">✕</div>
    </div>`;
  });
  el.innerHTML = html;
}

// ---------------------------------------------------------------------
// Journal analytics — standalone helper functions built on top of the
// existing journal/weight/sleep/steps storage (loadJournal, loadWeightLog,
// sleepOnDate, stepsOnDate from js/05-storage.js). Pure calculations only:
// no DOM access, no rendering, each callable independently.
// ---------------------------------------------------------------------

/**
 * Последний зафиксированный вес по записям журнала.
 * @returns {number|null} вес в кг, или null если записей нет.
 */
function getLastWeight(){
  const log = loadWeightLog();
  if(!log.length) return null;
  const sorted = log.slice().sort((a,b)=> a.date < b.date ? 1 : -1);
  return sorted[0].weight;
}

/**
 * Оценка калорий, сожжённых за заданное количество шагов.
 * Упрощённая модель: ккал ≈ шаги × вес(кг) × эмпирический коэффициент.
 * Если вес не передан явно, берётся последний зафиксированный в журнале
 * (или 70 кг, если записей о весе ещё нет).
 * @param {number} steps - количество шагов
 * @param {number} [weightKg] - вес в кг
 * @returns {number} ккал, округлено до целого
 */
function calculateCaloriesFromSteps(steps, weightKg){
  if(!steps || steps<=0) return 0;
  const weight = weightKg || getLastWeight() || 70;
  const KCAL_PER_STEP_PER_KG = 0.0005; // ккал на шаг на кг веса при среднем темпе ходьбы
  return Math.round(steps * weight * KCAL_PER_STEP_PER_KG);
}

/**
 * Коэффициент восстановления в зависимости от продолжительности сна.
 * 7-9 часов → 1.0 (полное восстановление); меньше или больше — коэффициент
 * пропорционально снижается в обе стороны.
 * @param {number} hours - часы сна
 * @returns {number} коэффициент от 0 до 1 (округлён до сотых)
 */
function getSleepRecoveryCoefficient(hours){
  if(!hours || hours<=0) return 0;
  let coef;
  if(hours>=7 && hours<=9) coef = 1;
  else if(hours<7) coef = hours/7;
  else coef = 9/hours;
  return Math.round(Math.max(0, Math.min(1, coef))*100)/100;
}

/**
 * Индекс здорового дня (0-100) за конкретную дату — сводная оценка,
 * учитывающая восстановление после сна (40%), активность по шагам (30%,
 * цель — 10000 шагов) и наличие тренировки в журнале за этот день (30%).
 * Компоненты без данных за день считаются нейтрально (50 баллов), чтобы
 * отсутствие одной записи не обнуляло весь индекс.
 * @param {string} date - дата в формате YYYY-MM-DD
 * @returns {number} индекс от 0 до 100
 */
function getHealthyDayIndex(date){
  const sleepHours = sleepOnDate(date);
  const steps = stepsOnDate(date);
  const trained = loadJournal().some(j=> j.date===date && j.sets.reduce((a,b)=>a+b,0)>0);

  const sleepScore = sleepHours!==null ? getSleepRecoveryCoefficient(sleepHours)*100 : 50;
  const STEPS_GOAL = 10000;
  const stepsScore = steps!==null ? Math.min(100, Math.round((steps/STEPS_GOAL)*100)) : 50;
  const trainingScore = trained ? 100 : 50;

  const index = sleepScore*0.4 + stepsScore*0.3 + trainingScore*0.3;
  return Math.round(index);
}

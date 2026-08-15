/* =========================================================================
   TRAINING SECTION — СЕГОДНЯ
   Today's plan preview, plus the guided workout-session modal (timer,
   set input, post-workout rating flow).
   ========================================================================= */
App.Screens = App.Screens || {};
App.Screens.TrainingSections = App.Screens.TrainingSections || {};

App.Screens.TrainingSections.today = (function(){
  const {h, clear} = App.Dom;
  const C = App.Components;
  const WS = ()=>App.Core.WorkoutSession;
  const Sched = ()=>App.Core.Schedule;
  const Rt = ()=>App.Core.Ratings;
  const Db = ()=>App.Core.Dashboard;
  const J = ()=>App.Core.Journal;
  const Modal = C.Modal;

  const MUSCLE_ICONS = {'Грудь':'🎯','Спина':'🔙','Плечи':'🏔️','Руки':'💪','Ноги':'🦵','Кор':'⭕'};

  function todaysPicks(){
    const p = Sched().getActiveProfile();
    const dayIndex = Sched().todayWeekdayIndex();
    const isClassic = p.preset==='classic';
    const plan = isClassic ? Sched().getClassicPlan() : Sched().getSplitPlan();
    if(!plan.length || !plan.some(c=>c.picks.length)) Sched().loadPlanFromProfile(p);
    const today = (isClassic ? Sched().getClassicPlan() : Sched().getSplitPlan())[dayIndex];
    return {
      dayLabel: today ? today.dayInfo.day : '',
      picks: today ? (isClassic ? today.picks.map(pk=>pk.ex) : today.picks) : [],
    };
  }

  function build(container){
    const {dayLabel, picks} = todaysPicks();
    const dateStr = new Date().toLocaleDateString('ru-RU', {weekday:'long', day:'numeric', month:'long'});
    container.appendChild(h('div.screen-sub', {}, [`${dayLabel}${dayLabel?' · ':''}${dateStr}`]));

    container.appendChild(C.CompactWeekCalendar({
      getValue: dateStr2 => Db().dayValue(J().loadJournal(), 'volume', dateStr2),
      onOpen: openFullCalendar,
    }).el);

    if(!picks.length){
      container.appendChild(C.Card({children:[App.UI.emptyState('На сегодня план не собран (или день отдыха). Собери неделю во вкладке «График».')]}).el);
    } else {
      const card = C.Card();
      picks.forEach((ex,i)=>card.el.appendChild(C.ExerciseRow({num:i+1, name:ex.name, meta:`${ex.sets} × ${ex.min}-${ex.max} ${ex.unit}`}).el));
      container.appendChild(card.el);
      container.appendChild(C.Button({label:'Начать тренировку', block:true, onClick:startSession}).el);
    }

    buildMuscleLoad(container);
  }

  function openFullCalendar(){
    const wrap = h('div');
    App.Screens.TrainingSections.calendar(wrap);
    Modal.open(wrap);
  }

  let muscleLoadDays = 7;
  let repaintMuscleLoad = null;

  function buildMuscleLoad(container){
    container.appendChild(h('div.section-title', {}, ['Нагрузка мышц']));
    const wrap = h('div');
    container.appendChild(wrap);
    function paint(days){
      muscleLoadDays = days;
      clear(wrap);
      const data = Db().muscleGroupLoad(days).map(m=>({name:m.name, pct:m.pct, icon:MUSCLE_ICONS[m.name]}));
      wrap.appendChild(C.HexagonChart({data, size:240}).el);
    }
    repaintMuscleLoad = paint;
    container.appendChild(C.Tabs({items:[{key:'7',label:'7 дней'},{key:'30',label:'30 дней'}], active:'7', onChange:key=>paint(parseInt(key))}).el);
    paint(7);
  }

  // Recompute muscle load without waiting for a manual «7 дней»/«30 дней» tap —
  // called right after a workout ends (normally or cut short).
  function refreshMuscleLoad(){ if(repaintMuscleLoad) repaintMuscleLoad(muscleLoadDays); }

  function startSession(){
    const res = WS().startFromToday();
    if(!res.ok){ App.UI.toast('На сегодня план не собран (или день отдыха). Собери неделю во вкладке «График».'); return; }
    WS().setOnChange(renderSessionModal);
    Modal.open(h('div'), {dismissible:false});
    renderSessionModal();
  }

  function renderSessionModal(){
    const session = WS().getSession();
    const ratingFlow = WS().getRatingFlow();
    if(ratingFlow){ renderRatingFlow(ratingFlow); return; }
    if(!session){ Modal.close(); return; }

    if(session.phase==='prep'){ renderPrepScreen(session); return; }

    const step = session.queue[session.index];
    const pct = Math.round((session.index/session.queue.length)*100);
    const progressBlock = h('div', {}, [
      h('div.note.mb-2', {}, [`Подход ${session.index+1} из ${session.queue.length} · день: ${session.dayLabel}`]),
      C.ProgressBar({pct}).el,
    ]);
    const stepTitle = h('div.title-md.mb-3', {}, [`${step.ex.name} — подход ${step.setNumber} из ${step.totalSets}`]);

    if(session.phase==='timer'){
      const timerPct = Math.round(((session.timerTotal-session.timeLeft)/session.timerTotal)*100);
      Modal.setContent(h('div', {}, [
        stepTitle, progressBlock,
        h('div.text-center.timer-block', {}, [
          h('div.mono.timer-display', {}, [session.timeLeft+'с']),
          h('div.note.timer-label', {}, [session.timerLabel]),
          h('div.timer-gauge-wrap', {}, [C.ProgressBar({pct:timerPct}).el]),
        ]),
        h('div.flex-gap-3.justify-center', {}, [
          C.Button({label:'Пропустить', variant:'secondary', size:'small', onClick:()=>WS().skipRest()}).el,
          C.Button({label:'Прервать тренировку', variant:'danger', size:'small', onClick:cancelSession}).el,
        ]),
      ]));
      return;
    }

    const input = h('input.input-large', {type:'number', placeholder:`${step.ex.min}-${step.ex.max}`, autofocus:true});
    input.addEventListener('keydown', e=>{ if(e.key==='Enter') WS().confirmSetResult(input.value); });
    Modal.setContent(h('div', {}, [
      stepTitle, progressBlock,
      h('div.note.note-spaced', {}, [`Цель: ${step.ex.min}-${step.ex.max} ${step.ex.unit}`]),
      C.Field(`Сколько сделал (${step.ex.unit})?`, input),
      C.Button({label:'Подтвердить', block:true, onClick:()=>WS().confirmSetResult(input.value)}).el,
      C.Button({label:'Прервать', variant:'danger', block:true, onClick:cancelSession}).el,
    ]));
    input.focus();
  }
  function cancelSession(){ WS().cancelSession(); Modal.close(); refreshMuscleLoad(); }

  // Экран 1 — подготовка: название тренировки, число подходов, «Готовы?» → «Начать».
  function renderPrepScreen(session){
    Modal.setContent(h('div.text-center', {}, [
      h('div.title-md.mb-2', {}, [session.dayLabel || 'Тренировка']),
      h('div.note.mb-4', {}, [`${session.queue.length} подходов`]),
      h('div.title-md.mb-4', {}, ['Готовы?']),
      C.Button({label:'Начать', block:true, onClick:()=>WS().beginWorkout()}).el,
      C.Button({label:'Отмена', variant:'secondary', block:true, onClick:cancelSession}).el,
    ]));
  }

  function renderRatingFlow(flow){
    if(flow.index >= flow.exercises.length){
      const result = WS().finalizeRatingFlow();
      Modal.setContent(h('div.text-center', {}, [
        h('div.title-md', {}, ['Тренировка завершена ✅']),
        h('div.note.mt-1', {}, [result.dayLabel]),
        h('div.note.mt-3', {class:'summary-text', html: result.summary}),
        h('div.note.mt-2', {}, ['Результаты записаны в журнал, оценки — в историю упражнений.']),
        C.Button({label:'Ок', block:true, onClick:()=>{ Modal.close(); refreshMuscleLoad(); }}).el,
      ]));
      return;
    }
    const exName = flow.exercises[flow.index];
    const current = flow.ratings[exName] || {};
    const grid = h('div.rating-grid.mt-4');
    Rt().EXERCISE_RATING_CRITERIA.forEach(c=>{
      const slider = C.RatingSlider({value:current[c.key]||0, onRate:v=>WS().setRatingFlowValue(c.key, v)});
      grid.append(h('span', {}, [c.label]), slider.el);
    });
    Modal.setContent(h('div', {}, [
      h('div.note.mb-1', {}, [`Оцени упражнение ${flow.index+1} из ${flow.exercises.length}`]),
      h('div.title-md', {}, [exName]),
      grid,
      h('div.flex-gap-3.mt-4', {}, [
        C.Button({label:'Пропустить', variant:'secondary', size:'small', block:true, onClick:()=>WS().skipRatingFlowStep()}).el,
        C.Button({label:'Далее', size:'small', block:true, onClick:()=>WS().nextRatingFlowStep()}).el,
      ]),
    ]));
  }

  return {build, startSession};
})();

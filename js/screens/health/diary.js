/* =========================================================================
   HEALTH SECTION — ДНЕВНИК
   Порядок: Разнообразное питание → Блюдо на сегодня → Показатели дня
   (роллеры) → КБЖУ (одна строка) → история показателей.
   «Быстрый импорт» перенесён в Настройки → Данные.
   ========================================================================= */
App.Screens = App.Screens || {};
App.Screens.HealthSections = App.Screens.HealthSections || {};

App.Screens.HealthSections.diary = (function(){
  const {h, clear} = App.Dom;
  const C = App.Components;
  const J = ()=>App.Core.Journal;
  const MP = ()=>App.Core.MealPlan;
  const Kb = ()=>App.Core.Kbju;

  // Порядок: Разнообразное питание → Блюдо на сегодня → Показатели дня → КБЖУ → история.
  function build(container){
    buildDietDiversity(container);
    buildTodayMeals(container);
    buildVitalsForm(container);
    buildKbjuSummary(container);

    let historyVisible = false;
    const historyWrap = h('div.mt-3');
    const historyToggle = C.Button({label:'Показать историю показателей', variant:'secondary', block:true, onClick:()=>{
      historyVisible = !historyVisible;
      historyToggle.update({label: historyVisible ? 'Скрыть историю показателей' : 'Показать историю показателей'});
      clear(historyWrap); if(historyVisible) paintVitalsHistory(historyWrap);
    }});
    container.append(historyToggle.el, historyWrap);
  }

  // Показатели дня: Дата (📅, открывает календарь) · Вес · Сон · Шаги —
  // под каждым числовым показателем роллер с шагом ±1 / ±1 / ±100.
  function buildVitalsForm(container){
    let date = new Date().toISOString().slice(0,10);
    const lastWeight = J().getWeightLog().slice(-1)[0];
    const lastSleep = J().getSleepLog().slice(-1)[0];
    const lastSteps = J().getStepsLog().slice(-1)[0];

    const dateBtn = h('button.roller-date-btn', {type:'button'}, ['📅']);
    const dateLabel = h('div.note.text-center', {}, [date.split('-').reverse().join('.')]);
    dateBtn.addEventListener('click', ()=>{
      const wrap = h('div');
      const calendarComp = App.Components.Calendar({
        period:'month', navOffset:0, isProgressType:false,
        getValue: ds => ds===date ? 1 : 0,
        onNavigate(dir){ state.navOffset += dir; calendarComp.render(state); },
        onReset(){ state.navOffset = 0; calendarComp.render(state); },
      });
      const state = {period:'month', navOffset:0};
      wrap.appendChild(calendarComp.el);
      // click-to-pick: delegate on the grid cells rendered by Calendar
      wrap.addEventListener('click', e=>{
        const cellEl = e.target.closest('.cal-cell');
        if(!cellEl || cellEl.classList.contains('pad')) return;
        const dayNum = cellEl.querySelector('.cal-daynum');
        if(!dayNum) return;
        const base = new Date(); base.setDate(1);
        const picked = new Date(base.getFullYear(), base.getMonth()+state.navOffset, parseInt(dayNum.textContent));
        date = picked.toISOString().slice(0,10);
        dateLabel.textContent = date.split('-').reverse().join('.');
        C.Modal.close();
      });
      C.Modal.open(wrap);
    });

    const weightRoller = C.Roller({min:30, max:200, step:1, value: lastWeight?Math.round(lastWeight.weight):70});
    const sleepRoller = C.Roller({min:0, max:14, step:1, value: lastSleep?Math.round(lastSleep.hours):7});
    const stepsRoller = C.Roller({min:0, max:30000, step:100, value: lastSteps?Math.round(lastSteps.steps/100)*100:5000});

    const saveBtn = C.Button({label:'Сохранить', block:true, onClick:()=>{
      const ok = J().saveVitals({date, weight:weightRoller.getValue(), sleep:sleepRoller.getValue(), steps:stepsRoller.getValue()});
      if(!ok){ alert('Укажи вес, сон или шаги'); return; }
      App.UI.toast('Показатели сохранены');
    }});

    container.appendChild(C.Card({title:'Показатели дня', children:[
      h('div.roller-header-row', {}, [
        h('div.roller-header-col', {}, ['Дата']), h('div.roller-header-col', {}, ['Вес']),
        h('div.roller-header-col', {}, ['Сон']), h('div.roller-header-col', {}, ['Шаги']),
      ]),
      h('div.row', {}, [
        h('div.roller-col', {}, [dateBtn, dateLabel]),
        h('div.roller-col', {}, [weightRoller.el]),
        h('div.roller-col', {}, [sleepRoller.el]),
        h('div.roller-col', {}, [stepsRoller.el]),
      ]),
      saveBtn.el,
    ]}).el);
  }

  function buildTodayMeals(container){
    const today = MP().getTodayMeals();
    const card = h('div.card.meal-today-card', {}, [
      h('div.card-head', {}, [h('div.card-title-text', {}, ['Блюда на сегодня']), h('span.note', {}, ['Неделя →'])]),
      ...today.map(m=>h('div.meal-today-row', {}, [
        h('span.note', {}, [m.slot.label]),
        h('span', {}, [m.dish ? m.dish.name : '—']),
      ])),
    ]);
    card.addEventListener('click', openWeekMeals);
    container.appendChild(card);
  }

  function openWeekMeals(){
    const wrap = h('div', {}, [h('div.title-md.mb-3', {}, ['Блюда на неделю'])]);
    if(!MP().getCurrentWeekPlan().length) MP().buildWeekPlan();
    const plan = MP().getCurrentWeekPlan();
    if(!plan.length){ wrap.appendChild(App.UI.emptyState('Сначала сохрани блюда во вкладке «Рацион».')); }
    plan.forEach(day=>{
      const dayCard = C.Card({title:day.dayLabel, subtitle:day.dateStr});
      day.meals.forEach(m=>dayCard.el.appendChild(h('div.meal-today-row', {}, [
        h('span.note', {}, [m.slot.label]), h('span', {}, [m.picked ? m.picked.name : '—']),
      ])));
      wrap.appendChild(dayCard.el);
    });
    C.Modal.open(wrap);
  }

  function buildKbjuSummary(container){
    const saved = Kb().getSaved();
    const hasRealData = saved && saved.height>0 && saved.age>0;
    const all = hasRealData ? Kb().computeAll(saved) : null;
    const card = C.Card({title:'КБЖУ'});
    if(!all){
      card.el.appendChild(App.UI.emptyState('Заполни параметры на экране «Настройки», чтобы увидеть расчёт.'));
    } else {
      card.el.append(
        h('div.kbju-row', {}, [
          h('div.kbju-cell', {}, [h('div.value', {}, [Math.round(all.target)]), h('div.label', {}, ['Ккал'])]),
          h('div.kbju-cell', {}, [h('div.value.macro-protein', {}, [Math.round(all.proteinG)]), h('div.label', {}, ['Белки, г'])]),
          h('div.kbju-cell', {}, [h('div.value.macro-fat', {}, [Math.round(all.fatG)]), h('div.label', {}, ['Жиры, г'])]),
          h('div.kbju-cell', {}, [h('div.value.macro-carb', {}, [Math.round(all.carbG)]), h('div.label', {}, ['Углеводы, г'])]),
        ]),
        h('div.pill-row.mt-3', {}, [h('span',{},['BMR: ', h('b',{},[Math.round(all.bmr)+' ккал'])]), h('span',{},['TDEE: ', h('b',{},[Math.round(all.tdee)+' ккал'])])]),
      );
    }
    container.appendChild(card.el);
  }

  function buildDietDiversity(container){
    const diversity = MP().calculateDietDiversityIndex();
    const divBar = C.ProgressBar({pct:diversity.index||0});
    container.appendChild(C.Card({title:'Разнообразное питание', children:[
      h('div.note', {}, ['Разнообразие питания: ', h('b',{},[diversity.index!==null?String(diversity.index):'—'])]),
      divBar.el,
      diversity.index!==null ? h('div.note.mt-1', {}, [`${diversity.uniqueDishes} блюд за период`]) : null,
    ]}).el);
  }

  function paintVitalsHistory(wrap){
    clear(wrap);
    const dates = new Set([...J().getWeightLog().map(w=>w.date), ...J().getSleepLog().map(s=>s.date), ...J().getStepsLog().map(s=>s.date)]);
    if(!dates.size){ wrap.appendChild(App.UI.emptyState('Пока нет записей')); return; }
    Array.from(dates).sort((a,b)=>a<b?1:-1).forEach(date=>{
      const w=J().weightOnDate(date), s=J().sleepOnDate(date), st=J().stepsOnDate(date);
      const parts = [];
      function part(label, val, type){
        const del = C.IconDelete(()=>{ J().deleteVitalEntry(type, date); paintVitalsHistory(wrap); });
        parts.push(h('span', {}, [`${label}: `, h('b',{},[String(val)]), ' ', del]));
      }
      if(w!==null) part('Вес', w+' кг', 'weight');
      if(s!==null) part('Сон', s+' ч', 'sleep');
      if(st!==null) part('Шаги', st, 'steps');
      wrap.appendChild(h('div.list-card', {}, [h('div.lc-name',{},[`${date.split('-').reverse().join('.')} · ${J().weekdayName(date)}`]), h('div.pill-row',{},parts)]));
    });
  }

  return build;
})();

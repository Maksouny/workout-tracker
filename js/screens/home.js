/* =========================================================================
   SCREEN — HOME (Главная)
   Sections: Обзор · Прогресс · История
   ========================================================================= */
App.Screens = App.Screens || {};
App.Screens.Home = (function(){
  const {h, clear} = App.Dom;
  const C = App.Components;
  const J = ()=>App.Core.Journal;
  const Db = ()=>App.Core.Dashboard;
  const UiPrefs = ()=>App.Core.UiPrefs;

  // ---------------- Обзор ----------------
  function buildOverview(container){
    const todayStr = new Date().toISOString().slice(0,10);
    const idx = J().getHealthyDayIndex(todayStr);

    const ring = C.ProgressRing({size:100, radius:40, stroke:8, pct:(idx||0)/100, color:'var(--accent)', label:idx!==null?idx:'—', sub:'индекс'});
    const indexCard = C.Card();
    indexCard.el.classList.add('card-centered');
    indexCard.el.append(
      ring.el,
      h('div.status-label', {}, [idx===null?'Пока нет данных':(idx>=70?'Здоровый день':idx>=40?'Средняя активность':'Стоит поднажать')]),
      h('div.note', {}, [idx===null?'Отметь вес, сон, шаги или тренировку на экране «Здоровье».':'Учитывает сон, шаги, питание и тренировку за сегодня.']),
    );
    container.appendChild(indexCard.el);

    // Сон / Вес / Калории / Шаги — один компактный модуль 2×2; тап по показателю
    // раскрывает его полноценный график (тот же homeChartCard, но в модалке).
    const statDefs = [
      {icon:'⚖️', label:'Вес', unit:'кг', entries:J().getWeightLog().map(w=>({date:w.date, v:w.weight})), color:'var(--accent)', fillGaps:false},
      {icon:'😴', label:'Сон', unit:'ч', entries:J().getSleepLog().map(s=>({date:s.date, v:s.hours})), color:'var(--accent-blue)', fillGaps:false},
      {icon:'🔥', label:'Калории', unit:'ккал', entries:last14Days().map(d=>({date:d, v:J().dailyBurnedCalories(d)})), color:'var(--accent-orange)', fillGaps:true},
      {icon:'👣', label:'Шаги', unit:'', entries:J().getStepsLog().map(s=>({date:s.date, v:s.steps})), color:'var(--accent-red)', fillGaps:true},
    ];
    container.appendChild(homeStatGrid(statDefs));

    const sectionHead = h('div.section-title', {}, [
      h('span', {}, ['Топ прогресс']),
      h('button.link', {}, ['Всё →']),
    ]);
    sectionHead.addEventListener('click', openFullProgress);
    container.appendChild(sectionHead);

    const journal = J().loadJournal();
    const top = Db().exerciseStatCards(journal).filter(c=>c.entriesCount>0).sort((a,b)=>b.pct-a.pct).slice(0,3);
    if(!top.length){ container.appendChild(C.Card({children:[App.UI.emptyState('Начни тренировку, чтобы увидеть прогресс')]}).el); return; }
    top.forEach(c=>container.appendChild(topProgressCard(c)));
  }

  function last14Days(){
    const today = new Date();
    const days = []; for(let i=13;i>=0;i--){ const d=new Date(today); d.setDate(today.getDate()-i); days.push(d.toISOString().slice(0,10)); }
    return days;
  }
  function homeStatGrid(statDefs){
    const grid = h('div.quick-grid');
    statDefs.forEach(sd=>{
      const vals = sd.entries.slice().sort((a,b)=>a.date<b.date?-1:1).filter(v=>!sd.fillGaps || v.v>0);
      const latest = vals.length ? vals[vals.length-1].v : null;
      const tile = h('div.quick-card', {}, [
        h('div.icon', {}, [sd.icon]),
        h('div.value.mono', {}, [latest!==null ? `${latest}${sd.unit?' '+sd.unit:''}` : '—']),
        h('div.label', {}, [sd.label]),
      ]);
      tile.style.cursor = 'pointer';
      tile.addEventListener('click', ()=>{
        const wrap = h('div');
        wrap.appendChild(homeChartCard(sd.icon, sd.label, sd.unit, sd.entries, sd.color, sd.fillGaps));
        C.Modal.open(wrap);
      });
      grid.appendChild(tile);
    });
    return grid;
  }

  function homeChartCard(icon, label, unit, entries, color, fillGaps){
    let vals = entries.slice().sort((a,b)=>a.date<b.date?-1:1).slice(-14);
    if(fillGaps) vals = vals.filter(v=>v.v>0);
    const values = vals.map(v=>v.v);
    const latest = values.length ? values[values.length-1] : null;
    return C.Card({tight:true, children:[
      h('div.justify-between.mb-1', {}, [
        h('div.flex-gap-2', {}, [h('span', {}, [icon]), h('span.note', {}, [label])]),
        h('span', {}, [latest!==null ? h('b', {}, [`${latest}${unit?' '+unit:''}`]) : h('span.note',{},['—'])]),
      ]),
      C.Chart({values, minZero:false, color}).el,
    ]}).el;
  }

  function openFullProgress(){
    const wrap = h('div');
    buildProgress(wrap);
    C.Modal.open(wrap);
  }

  function topProgressCard(c){
    const pct = Math.round(c.pct*100);
    const color = pct>=70?'var(--accent)':pct>=40?'var(--accent-orange)':'var(--accent-red)';
    const bar = C.ProgressBar({pct, color});
    return C.Card({tight:true, children:[
      h('div.flex-gap-3', {}, [
        h('div.progress-icon', {style:{background:'var(--accent-dim)',color}}, ['💪']),
        h('div.progress-info', {}, [
          h('div.progress-name', {}, [c.name]),
          bar.el,
          h('div.progress-meta', {}, [h('span',{},[`Цель: ${c.target}`]), h('span',{},[`Лучший: ${c.best||0}`])]),
        ]),
        h('div.progress-percent', {style:{color}}, [pct+'%']),
      ]),
    ]}).el;
  }

  // ---------------- Прогресс (все упражнения, в т.ч. в модалке "Топ прогресс") ----------------
  function buildProgress(container){
    const journal = J().loadJournal();
    const cards = Db().exerciseStatCards(journal);

    container.appendChild(h('div.title-md.mb-3', {}, ['Весь прогресс']));

    const displayTypes = [
      {key:'bar', icon:'▬', title:'Полоска'}, {key:'ring', icon:'◔', title:'Кольцо'}, {key:'number', icon:'%', title:'Числом'},
    ];
    const displayRow = h('div.icon-toggle-row');
    displayTypes.forEach(dt=>{
      const btn = h('button.icon-toggle'+(UiPrefs().getProgressDisplayType()===dt.key?'.active':''), {title:dt.title}, [dt.icon]);
      btn.addEventListener('click', ()=>{ UiPrefs().setProgressDisplayType(dt.key); paint(); repaintDisplayActive(); });
      displayRow.appendChild(btn);
    });
    function repaintDisplayActive(){
      Array.from(displayRow.children).forEach((btn,i)=>btn.classList.toggle('active', displayTypes[i].key===UiPrefs().getProgressDisplayType()));
    }
    container.appendChild(displayRow);

    container.appendChild(viewModeSlider(()=>paint()));
    const listWrap = h('div');
    container.appendChild(listWrap);
    const moreBtn = C.Button({label:'', variant:'secondary', block:true, onClick:()=>{ UiPrefs().setStatsExpanded(!UiPrefs().getStatsExpanded()); paint(); }});

    function paint(){
      clear(listWrap);
      const layout = UiPrefs().getProgressLayout();
      const displayType = UiPrefs().getProgressDisplayType();
      const expanded = UiPrefs().getStatsExpanded();
      const rowLimit = layout==='grid' ? 8 : 3;
      const shown = expanded ? cards : cards.slice(0, rowLimit);
      listWrap.className = layout==='grid' ? 'progress-grid' : '';
      if(!shown.length){ listWrap.appendChild(App.UI.emptyState('Нет данных')); }
      shown.forEach(c=>listWrap.appendChild(progressStatCard(c, displayType)));
      if(cards.length>rowLimit){
        moreBtn.update({label: expanded ? 'Свернуть' : `Показать всё (${cards.length})`});
        if(!listWrap.parentElement.contains(moreBtn.el)) container.appendChild(moreBtn.el);
      } else if(moreBtn.el.parentElement){ moreBtn.el.parentElement.removeChild(moreBtn.el); }
    }
    paint();
  }

  function viewModeSlider(onChange){
    const modes = [{key:'list', icon:'☰', title:'Список'}, {key:'grid', icon:'▦', title:'Сетка'}];
    const current = UiPrefs().getProgressLayout();
    const activeIdx = Math.max(0, modes.findIndex(m=>m.key===current));
    const thumb = h('div.view-slider-thumb');
    const track = h('div.view-slider', {}, [thumb, ...modes.map(m=>h('button.view-slider-opt', {title:m.title}, [m.icon]))]);
    function positionThumb(idx){
      thumb.style.transform = `translateX(${idx*100}%)`;
      track.querySelectorAll('.view-slider-opt').forEach((b,i)=>b.classList.toggle('active', i===idx));
    }
    positionThumb(activeIdx);
    Array.from(track.querySelectorAll('.view-slider-opt')).forEach((btn,i)=>{
      btn.addEventListener('click', ()=>{
        UiPrefs().setProgressLayout(modes[i].key);
        positionThumb(i);
        onChange();
      });
    });
    return track;
  }

  function progressStatCard(c, displayType){
    const pct = Math.round(c.pct*100);
    const color = pct>=70?'var(--accent)':pct>=40?'var(--accent-orange)':'var(--accent-red)';
    const visual = displayType==='ring' ? C.ProgressRing({size:44, radius:18, stroke:5, pct:c.pct, color, label:pct+'%'}).el
      : displayType==='number' ? h('div.progress-percent', {style:{color}}, [pct+'%'])
      : C.ProgressBar({pct, color}).el;
    return h('div.list-card', {}, [
      h('div.lc-name', {}, [c.name]),
      visual,
      h('div.pill-row', {}, [
        h('span',{},['Последний: ', h('b',{},[String(c.last)])]), h('span',{},['Цель: ', h('b',{},[String(c.target)])]),
        c.remaining!==undefined ? h('span',{},['Осталось: ', h('b',{},[String(c.remaining)])]) : null,
        h('span',{},['Тренировок: ', h('b',{},[String(c.entriesCount)])]),
      ]),
    ]);
  }

  // ---------------- История (журнал тренировок) ----------------
  function buildHistory(container){
    const Ex = App.Core.Exercises;
    let showAll = false, filterExercise = '', filterDate = '';
    const exerciseSelect = C.Select({value:'', options:[{value:'',label:'Все'}, ...Ex.list().map(e=>({value:e.name,label:e.name}))], onChange(v){ filterExercise=v; paint(); }});
    const dateInput = h('input', {type:'text', placeholder:'дд.мм или гггг-мм-дд'});
    dateInput.addEventListener('input', e=>{ filterDate=e.target.value; paint(); });
    const toggleBtn = C.Button({label:'Показать всё', variant:'secondary', size:'small', onClick:()=>{ showAll=!showAll; toggleBtn.update({label: showAll?'Показать только сегодня':'Показать всё'}); paint(); }});

    container.appendChild(C.Card({children:[
      h('div.row', {}, [C.Field('Упражнение', exerciseSelect), C.Field('Дата содержит', dateInput)]),
      toggleBtn.el,
    ]}).el);

    const listWrap = h('div');

    function paint(){
      clear(listWrap);
      let journal = J().loadJournal().slice().sort((a,b)=>a.date<b.date?1:-1);
      if(filterExercise) journal = journal.filter(j=>j.exercise===filterExercise);
      if(filterDate){
        const q = filterDate.trim().toLowerCase();
        journal = journal.filter(j=>{ const ru=j.date.split('-').reverse().join('.'); return j.date.toLowerCase().includes(q) || ru.toLowerCase().includes(q); });
      }
      const todayWeekday = String(new Date().getDay());
      if(!showAll) journal = journal.filter(j=>String(new Date(j.date+"T00:00:00").getDay())===todayWeekday);
      if(!journal.length){ listWrap.appendChild(App.UI.emptyState('Ничего не найдено')); return; }
      let lastDate = null;
      journal.forEach(j=>{
        if(j.date!==lastDate){
          lastDate = j.date;
          listWrap.appendChild(h('div.note.date-group-label', {}, [`${j.date.split('-').reverse().join('.')} · ${J().weekdayName(j.date)}`]));
        }
        listWrap.appendChild(historyRow(j, paint));
      });
    }

    // Сначала статистика, затем список тренировок ("все соответствующие показатели старой версии")
    container.appendChild(h('div.section-title', {}, ['Статистика']));
    container.appendChild(statsGrid(J().journalStats()));

    container.appendChild(listWrap);
    paint();
  }

  function historyRow(j, onChanged){
    const total = j.sets.reduce((a,b)=>a+b,0);
    const delBtn = C.IconDelete(()=>{ J().deleteEntry(j.id); onChanged(); });
    return h('div.list-card.justify-between.flex-gap-2', {}, [
      h('div.flex-grow-min0', {}, [h('div.lc-name',{},[j.exercise]), h('div.note.mono',{},[`${j.sets.join(' / ')} · всего ${total}`])]),
      delBtn,
    ]);
  }

  function statsGrid(s){
    const fmt = (v,u)=> v===null||v===undefined ? '—' : `${v}${u?' '+u:''}`;
    const statPairs = [
      ['Всего тренировок', fmt(s.totalWorkouts)], ['Тренировочных дней', fmt(s.trainingDays)],
      ['Общий объём', fmt(s.totalVolume,'повт.')], ['Средний объём', fmt(s.avgVolume,'повт.')],
      ['Частое упражнение', s.mostFrequent?`${s.mostFrequent.name} (${s.mostFrequent.count})`:'—'],
      ['Лучший результат', s.bestResult?`${s.bestResult.exercise}: ${s.bestResult.value}`:'—'],
      ['Разных упражнений', fmt(s.distinctExercises)], ['Оценок сохранено', fmt(s.ratingsCount)],
      ['Последний вес', fmt(s.lastWeight,'кг')], ['Изменение веса', s.weightChange===null?'—':`${s.weightChange>0?'+':''}${s.weightChange} кг`],
      ['Средний сон', fmt(s.avgSleep,'ч')], ['Средние шаги', fmt(s.avgSteps)],
    ];
    const grid = h('div.quick-grid');
    statPairs.forEach(([label,value])=>grid.appendChild(h('div.quick-card', {}, [h('div.label',{},[label]), h('div.value.mono.stat-value-accent',{},[value])])));
    return grid;
  }

  return App.Screens.makeTabbedScreen({
    icon:'🏠', label:'Главная', title:'Главная', subtitle:'Статистика, графики и история',
    onTitleClick(){ App.UI.toast(App.Core.EasterEgg.trigger()); },
    sections:[
      {key:'overview', label:'Обзор', build:buildOverview},
      {key:'history', label:'История', build:buildHistory},
    ],
  });
})();

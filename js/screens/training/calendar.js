/* =========================================================================
   TRAINING SECTION — КАЛЕНДАРЬ
   ========================================================================= */
App.Screens = App.Screens || {};
App.Screens.TrainingSections = App.Screens.TrainingSections || {};

App.Screens.TrainingSections.calendar = (function(){
  const {h} = App.Dom;
  const C = App.Components;
  const Db = ()=>App.Core.Dashboard;
  const J = ()=>App.Core.Journal;

  function build(container){
    // Открывается всегда на текущем месяце; выбор недели/года убран —
    // показывается только полноценный месячный календарь.
    const state = {chartType:'volume', period:'month', navOffset:0};
    const typeSelect = C.Select({
      value: state.chartType,
      options:[
        {value:'volume', label:'Объём'}, {value:'sessions', label:'Тренировок'},
        {value:'variety', label:'Разных упражнений'}, {value:'progress', label:'% от цели'},
      ],
      onChange(v){ state.chartType = v; calendarComp.render(state); },
    });

    const card = C.Card();
    card.el.appendChild(C.Field('Показатель', typeSelect));

    const calendarComp = App.Components.Calendar({
      period: state.period, navOffset: state.navOffset, isProgressType: state.chartType==='progress',
      getValue: dateStr => Db().dayValue(J().loadJournal(), state.chartType, dateStr),
      onNavigate(dir){ state.navOffset += dir; calendarComp.render(state); },
      onReset(){ state.navOffset = 0; calendarComp.render(state); },
    });
    card.el.appendChild(calendarComp.el);
    container.appendChild(card.el);
  }

  return build;
})();

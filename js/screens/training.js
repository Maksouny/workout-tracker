/* =========================================================================
   SCREEN — TRAINING (Тренировки)
   Composes the 2 section modules from js/screens/training/*.js into one
   tabbed screen. Календарь and Упражнения are still fully available —
   they open from within «Сегодня» (compact calendar widget) and «График»
   (edit-exercises button) as modals rather than being separate tabs.
   ========================================================================= */
App.Screens = App.Screens || {};
App.Screens.Training = App.Screens.makeTabbedScreen({
  icon:'🏋️', label:'Тренировки', title:'Тренировки', subtitle:'Сегодняшняя тренировка и график',
  onTitleClick(){ App.UI.toast(App.Core.EasterEgg.trigger()); },
  sections:[
    {key:'today', label:'Сегодня', build:App.Screens.TrainingSections.today.build},
    {key:'schedule', label:'График', build:App.Screens.TrainingSections.schedule},
  ],
});

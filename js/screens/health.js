/* =========================================================================
   SCREEN — HEALTH (Здоровье)
   Sections: Дневник (показатели+КБЖУ-сводка+блюда на сегодня) и Рацион
   (автоподбор + список блюд + конструктор + ингредиенты + единицы).
   ========================================================================= */
App.Screens = App.Screens || {};
App.Screens.Health = App.Screens.makeTabbedScreen({
  icon:'❤️', label:'Здоровье', title:'Здоровье', subtitle:'Показатели, КБЖУ и питание',
  onTitleClick(){ App.UI.toast(App.Core.EasterEgg.trigger()); },
  sections:[
    {key:'diary', label:'Дневник', build:App.Screens.HealthSections.diary},
    {key:'diet', label:'Рацион', build:App.Screens.HealthSections.diet},
  ],
});

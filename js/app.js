/* =========================================================================
   APP INIT
   Exactly 4 top-level screens (Тренировки/Главная/Здоровье/Настройки).
   Each screen internally manages its own sections via Tabs — this file
   only wires the 4 screens into the shell, plus the center "start
   workout" nav button (owned by Training's "Сегодня" section).
   ========================================================================= */
(function(){
  function boot(){
    const Shell = App.Layout.Shell;
    const S = App.Screens;

    Shell.register({id:'training', icon:S.Training.icon, label:S.Training.label, mount:S.Training.mount, onEnter:S.Training.onEnter});
    Shell.register({id:'home', icon:S.Home.icon, label:S.Home.label, mount:S.Home.mount, onEnter:S.Home.onEnter});
    Shell.register({id:'health', icon:S.Health.icon, label:S.Health.label, mount:S.Health.mount, onEnter:S.Health.onEnter});
    Shell.register({id:'settings', icon:S.Settings.icon, label:S.Settings.label, mount:S.Settings.mount, onEnter:S.Settings.onEnter});

    Shell.init('#app', {
      onStart(){
        Shell.goTo(0);
        App.Screens.TrainingSections.today.startSession();
      },
    });
    Shell.goTo(1); // start on Home
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* =========================================================================
   CORE — SETTINGS (global cross-module preferences)
   ========================================================================= */
App.Core = App.Core || {};
App.Core.Settings = (function(){
  const S = App.State;
  const GOAL_LOSE = "lose", GOAL_MAINTAIN = "maintain", GOAL_GAIN = "gain";
  const GOAL_OPTIONS = [GOAL_LOSE, GOAL_MAINTAIN, GOAL_GAIN];
  const GOAL_LABELS = {[GOAL_LOSE]:"Похудеть", [GOAL_MAINTAIN]:"Удержание", [GOAL_GAIN]:"Набрать массу"};
  const DEFAULT_SETTINGS = {goal: GOAL_MAINTAIN};

  function load(){
    const saved = S.get('settings') || {};
    const settings = {...DEFAULT_SETTINGS, ...saved};
    if(!GOAL_OPTIONS.includes(settings.goal)) settings.goal = DEFAULT_SETTINGS.goal;
    return settings;
  }
  let USER_SETTINGS = load();
  function getGoal(){ return USER_SETTINGS.goal; }
  function setGoal(goal){
    if(!GOAL_OPTIONS.includes(goal)) return;
    USER_SETTINGS = {...USER_SETTINGS, goal};
    S.set('settings', USER_SETTINGS);
  }
  function goalLabel(goal){ return GOAL_LABELS[goal] || GOAL_LABELS[DEFAULT_SETTINGS.goal]; }

  return {GOAL_LOSE, GOAL_MAINTAIN, GOAL_GAIN, GOAL_OPTIONS, GOAL_LABELS, getGoal, setGoal, goalLabel};
})();

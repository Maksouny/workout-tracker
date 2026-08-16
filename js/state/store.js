/* =========================================================================
   STATE LAYER — AppState
   The single store every Core module reads/writes through:
     localStorage  <-->  Data  <-->  AppState  <-->  Core  <-->  UI
   Nothing above Core should ever call App.Data directly. AppState caches
   each logical key in memory, persists through Data on write, and notifies
   subscribers so Components/Screens can react without a full re-render.
   ========================================================================= */
window.App = window.App || {};
App.State = (function(){
  const D = App.Data;
  const cache = {};
  const listeners = {};   // key -> Set(fn)
  const wildcard = new Set(); // fn(key, value) on any change

  // Logical key -> [getter, setter] on the Data layer. This is the only
  // place that maps a "domain" key onto the legacy zt_* storage calls, so
  // a future migration only ever touches this table.
  const registry = {
    exercises:            [D.loadExercisesRaw,          D.saveExercises],
    customMuscleGroups:   [D.loadCustomMuscleGroups,     D.saveCustomMuscleGroups],
    profiles:              [D.loadProfilesRaw,            D.saveProfiles],
    settings:               [D.loadSettingsRaw,            D.saveSettings],
    kbju:                    [D.loadKbju,                    D.saveKbju],
    journal:                 [D.loadJournalRaw,             D.saveJournal],
    ingredients:              [D.loadIngredientsRaw,          D.saveIngredients],
    dishes:                   [D.loadDishes,                  D.saveDishes],
    weightLog:                 [D.loadWeightLog,               D.saveWeightLog],
    sleepLog:                   [D.loadSleepLog,                D.saveSleepLog],
    stepsLog:                    [D.loadStepsLog,                D.saveStepsLog],
    exerciseRatingHistory:        [D.loadExerciseRatingHistory,   D.saveExerciseRatingHistory],
    mealLog:                       [D.loadMealLog,                 D.saveMealLog],
    eatenMeals:                     [D.loadEatenMeals,              D.saveEatenMeals],
    dishTagOptions:                 [D.loadDishTagOptions,          D.saveDishTagOptions],
    dishUnitMode:                    [D.loadDishUnitMode,            D.saveDishUnitMode],
    progressLayout:                   [D.loadProgressLayout,          D.saveProgressLayout],
    progressDisplayType:              [D.loadProgressDisplayType,     D.saveProgressDisplayType],
    statsExpanded:                     [D.loadStatsExpanded,           D.saveStatsExpanded],
  };

  function get(key){
    if(!(key in cache)){
      const entry = registry[key];
      if(!entry) throw new Error('App.State: unknown key "'+key+'"');
      cache[key] = entry[0]();
    }
    return cache[key];
  }
  function set(key, value){
    const entry = registry[key];
    if(!entry) throw new Error('App.State: unknown key "'+key+'"');
    cache[key] = value;
    entry[1](value);
    (listeners[key]||new Set()).forEach(fn=>fn(value));
    wildcard.forEach(fn=>fn(key, value));
    return value;
  }
  /** Read-modify-write in one step; returns the new value. */
  function update(key, updater){ return set(key, updater(get(key))); }

  function subscribe(key, fn){
    if(!listeners[key]) listeners[key] = new Set();
    listeners[key].add(fn);
    return ()=>listeners[key].delete(fn);
  }
  function subscribeAny(fn){ wildcard.add(fn); return ()=>wildcard.delete(fn); }

  // --- Migration layer -----------------------------------------------
  // Bumps a schema version stamp so future changes to the registry above
  // (renamed/restructured keys) can run one-time transforms here before
  // anything else reads from the store. No transform needed yet — the
  // legacy zt_* keys are used verbatim — but the hook is wired in at boot.
  const CURRENT_SCHEMA = 1;
  function runMigrations(){
    const version = D.loadSchemaVersion();
    // if(version < 1){ ...one-time transform... }
    if(version !== CURRENT_SCHEMA) D.saveSchemaVersion(CURRENT_SCHEMA);
  }
  runMigrations();

  return {get, set, update, subscribe, subscribeAny};
})();

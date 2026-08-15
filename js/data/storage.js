/* =========================================================================
   DATA LAYER
   The only place that touches localStorage. Every key here is identical
   to the legacy app so existing user data keeps working unmodified.
   Nothing in this file knows about the DOM or about business rules —
   it only reads/writes JSON blobs and seeds sane defaults.
   ========================================================================= */
window.App = window.App || {};
App.Data = (function(){

  function readJSON(key, fallback){
    const raw = localStorage.getItem(key);
    if(raw===null) return fallback;
    try{ return JSON.parse(raw); } catch(e){ return fallback; }
  }
  function writeJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

  // --- Keys (unchanged from legacy "zt_" namespace) ---
  const KEYS = {
    EXERCISES:"zt_exercises",
    CUSTOM_MUSCLE_GROUPS:"zt_custom_muscle_groups",
    PROFILES:"zt_profiles",
    SETTINGS:"zt_settings",
    KBJU:"zt_kbju",
    JOURNAL:"zt_journal",
    INGREDIENTS:"zt_ingredients",
    DISHES:"zt_dishes",
    WEIGHT_LOG:"zt_weight_log",
    SLEEP_LOG:"zt_sleep_log",
    STEPS_LOG:"zt_steps_log",
    EXERCISE_RATINGS:"zt_exercise_ratings_history",
    MEALLOG:"zt_meallog",
    DISH_TAG_OPTIONS:"zt_dish_tag_options",
    DISH_UNIT_MODE:"zt_dish_unit_mode",
    PROGRESS_LAYOUT:"zt_progress_layout",
    PROGRESS_DISPLAY_TYPE:"zt_progress_display_type",
    STATS_EXPANDED:"zt_stats_expanded",
    SCHEMA_VERSION:"zt_schema_version",
  };

  return {
    KEYS, readJSON, writeJSON,

    // Exercises
    loadExercisesRaw:  ()=>readJSON(KEYS.EXERCISES, null),
    saveExercises:     (arr)=>writeJSON(KEYS.EXERCISES, arr),
    loadCustomMuscleGroups: ()=>readJSON(KEYS.CUSTOM_MUSCLE_GROUPS, []),
    saveCustomMuscleGroups: (arr)=>writeJSON(KEYS.CUSTOM_MUSCLE_GROUPS, arr),

    // Profiles / schedule
    loadProfilesRaw:   ()=>readJSON(KEYS.PROFILES, null),
    saveProfiles:      (arr)=>writeJSON(KEYS.PROFILES, arr),

    // Settings (global goal)
    loadSettingsRaw:   ()=>readJSON(KEYS.SETTINGS, null),
    saveSettings:      (s)=>writeJSON(KEYS.SETTINGS, s),

    // KBJU
    loadKbju:  ()=>readJSON(KEYS.KBJU, null),
    saveKbju:  (d)=>writeJSON(KEYS.KBJU, d),

    // Journal
    loadJournalRaw: ()=>readJSON(KEYS.JOURNAL, null),
    saveJournal:    (d)=>writeJSON(KEYS.JOURNAL, d),

    // Ingredients / dishes
    loadIngredientsRaw: ()=>readJSON(KEYS.INGREDIENTS, null),
    saveIngredients:    (d)=>writeJSON(KEYS.INGREDIENTS, d),
    loadDishes: ()=>readJSON(KEYS.DISHES, []),
    saveDishes: (d)=>writeJSON(KEYS.DISHES, d),

    // Vitals
    loadWeightLog: ()=>readJSON(KEYS.WEIGHT_LOG, []),
    saveWeightLog: (a)=>writeJSON(KEYS.WEIGHT_LOG, a),
    loadSleepLog:  ()=>readJSON(KEYS.SLEEP_LOG, []),
    saveSleepLog:  (a)=>writeJSON(KEYS.SLEEP_LOG, a),
    loadStepsLog:  ()=>readJSON(KEYS.STEPS_LOG, []),
    saveStepsLog:  (a)=>writeJSON(KEYS.STEPS_LOG, a),

    // Exercise rating history
    loadExerciseRatingHistory: ()=>readJSON(KEYS.EXERCISE_RATINGS, []),
    saveExerciseRatingHistory: (a)=>writeJSON(KEYS.EXERCISE_RATINGS, a),

    // Meal log
    loadMealLog: ()=>readJSON(KEYS.MEALLOG, []),
    saveMealLog: (a)=>writeJSON(KEYS.MEALLOG, a),

    // Dish tags / display unit
    loadDishTagOptions: ()=>readJSON(KEYS.DISH_TAG_OPTIONS, ['Завтрак','Обед','Ужин']),
    saveDishTagOptions: (a)=>writeJSON(KEYS.DISH_TAG_OPTIONS, a),
    loadDishUnitMode: ()=>localStorage.getItem(KEYS.DISH_UNIT_MODE) || 'g',
    saveDishUnitMode: (v)=>localStorage.setItem(KEYS.DISH_UNIT_MODE, v),

    // UI persistence (layout choices — legitimately data, not DOM)
    loadProgressLayout: ()=>localStorage.getItem(KEYS.PROGRESS_LAYOUT) || 'list',
    saveProgressLayout: (v)=>localStorage.setItem(KEYS.PROGRESS_LAYOUT, v),
    loadProgressDisplayType: ()=>localStorage.getItem(KEYS.PROGRESS_DISPLAY_TYPE) || 'bar',
    saveProgressDisplayType: (v)=>localStorage.setItem(KEYS.PROGRESS_DISPLAY_TYPE, v),
    loadStatsExpanded: ()=>localStorage.getItem(KEYS.STATS_EXPANDED)==='1',
    saveStatsExpanded: (v)=>localStorage.setItem(KEYS.STATS_EXPANDED, v?'1':'0'),

    // Schema version stamp (used by State's migration hook)
    loadSchemaVersion: ()=>parseInt(localStorage.getItem(KEYS.SCHEMA_VERSION))||0,
    saveSchemaVersion: (v)=>localStorage.setItem(KEYS.SCHEMA_VERSION, v),
  };
})();

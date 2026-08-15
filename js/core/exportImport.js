/* =========================================================================
   CORE — EXPORT / IMPORT
   ========================================================================= */
App.Core = App.Core || {};
App.Core.ExportImport = (function(){
  const S = App.State;
  const Ex = ()=>App.Core.Exercises;

  function buildExportBundle(){
    return {
      kbju: S.get('kbju'), journal: App.Core.Journal.loadJournal(), ingredients: App.Core.Ingredients.load(),
      dishes: S.get('dishes'), exercises: Ex().list(), mealLog: S.get('mealLog'),
      weightLog: S.get('weightLog'), sleepLog: S.get('sleepLog'),
    };
  }

  function applyImportBundle(data){
    if(data.kbju) S.set('kbju', data.kbju);
    if(data.journal) App.Core.Journal.saveJournal(data.journal);
    if(data.ingredients) App.Core.Ingredients.save(data.ingredients);
    if(data.dishes) S.set('dishes', data.dishes);
    if(data.exercises){ Ex().replaceAll(data.exercises); }
    if(data.mealLog) S.set('mealLog', data.mealLog);
    if(data.weightLog) S.set('weightLog', data.weightLog);
    if(data.sleepLog) S.set('sleepLog', data.sleepLog);
    return true;
  }

  return {buildExportBundle, applyImportBundle};
})();

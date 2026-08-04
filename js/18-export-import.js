// ---------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------
function exportData(){
  const data = { kbju: loadKbju(), journal: loadJournal(), ingredients: loadIngredients(), dishes: loadDishes(), exercises: EXERCISES, mealLog: loadMealLog(), weightLog: loadWeightLog(), sleepLog: loadSleepLog() };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trening_data_'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  URL.revokeObjectURL(url);
}
function importData(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      const data = JSON.parse(e.target.result);
      if(data.kbju) saveKbju(data.kbju);
      if(data.journal) saveJournal(data.journal);
      if(data.ingredients) saveIngredients(data.ingredients);
      if(data.dishes) saveDishes(data.dishes);
      if(data.exercises){ saveExercises(data.exercises); EXERCISES = loadExercises(); }
      if(data.mealLog) saveMealLog(data.mealLog);
      if(data.weightLog) saveWeightLog(data.weightLog);
      if(data.sleepLog) saveSleepLog(data.sleepLog);
      initKbju();
      renderIngredients();
      renderDishList();
      renderJournalList();
      renderReference();
      renderVitalsCharts();
      renderDashboard();
      currentPlan = [];
      renderDayPlan();
      alert('Данные импортированы');
    }catch(err){ alert('Не удалось прочитать файл'); }
  };
  reader.readAsText(file);
}

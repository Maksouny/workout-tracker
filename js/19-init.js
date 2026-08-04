// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------
initKbju();
renderProfileTabs();
renderSchedule();
renderReference();
initJournalForm();
renderJournalList();
renderIngredients();
renderDishChains();
renderDishTagChips();
const dishUnitModeEl = document.getElementById('dishUnitMode');
if(dishUnitModeEl) dishUnitModeEl.value = dishDisplayUnit;
renderDishList();
renderVitalsCharts();
renderDashboard();
renderDayPlan();

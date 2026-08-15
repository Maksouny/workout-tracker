/* =========================================================================
   CORE — RATINGS
   ========================================================================= */
App.Core = App.Core || {};
App.Core.Ratings = (function(){
  const S = App.State;

  const DISH_RATING_CRITERIA = [
    {key:'taste', label:'Вкус'},
    {key:'satiety', label:'Сытость'},
    {key:'easiness', label:'Простота готовки'},
    {key:'value', label:'Цена/качество'},
    {key:'repeat', label:'Готовил(а) бы ещё'},
    {key:'family', label:'Понравилось бы близким'},
  ];
  const EXERCISE_RATING_CRITERIA = [
    {key:'effectiveness', label:'Ощущаемая эффективность'},
    {key:'enjoyment', label:'Удовольствие от процесса'},
    {key:'difficulty', label:'Сложность выполнения'},
    {key:'fatigue', label:'Утомляемость после'},
    {key:'mood', label:'Настроение после'},
    {key:'equipment', label:'Удобство/доступность места'},
  ];

  function average(ratings, criteria){
    const vals = criteria.map(c=>ratings[c.key]||0).filter(v=>v>0);
    return vals.length ? Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*10)/10 : null;
  }

  function setDishRating(dishId, key, value){
    const dishes = S.get('dishes');
    const d = dishes.find(x=>x.id===dishId);
    if(!d) return null;
    if(!d.ratings) d.ratings = {};
    d.ratings[key] = (d.ratings[key]===value) ? 0 : value;
    S.set('dishes', dishes);
    return d.ratings[key];
  }

  function addExerciseRatingRecord(date, exercise, ratings){
    const hasAny = Object.values(ratings).some(v=>v>0);
    if(!hasAny) return;
    const history = S.get('exerciseRatingHistory');
    const id = history.length ? Math.max(...history.map(r=>r.id))+1 : 1;
    history.push({id, date, exercise, ratings});
    S.set('exerciseRatingHistory', history);
  }

  function exerciseRatingHistoryAverage(exName){
    const history = S.get('exerciseRatingHistory').filter(r=>r.exercise===exName);
    if(!history.length) return {count:0, overall:null, perCriteria:[]};
    const perCriteria = EXERCISE_RATING_CRITERIA.map(c=>{
      const vals = history.map(r=>r.ratings[c.key]||0).filter(v=>v>0);
      return {key:c.key, label:c.label, avg: vals.length ? Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*10)/10 : null};
    });
    const overallVals = perCriteria.map(c=>c.avg).filter(v=>v!==null);
    const overall = overallVals.length ? Math.round((overallVals.reduce((a,b)=>a+b,0)/overallVals.length)*10)/10 : null;
    return {count:history.length, overall, perCriteria};
  }

  return {
    DISH_RATING_CRITERIA, EXERCISE_RATING_CRITERIA,
    average, setDishRating, addExerciseRatingRecord, exerciseRatingHistoryAverage,
  };
})();

/* =========================================================================
   CORE — DASHBOARD ANALYTICS
   ========================================================================= */
App.Core = App.Core || {};
App.Core.Dashboard = (function(){
  const Ex = ()=>App.Core.Exercises;
  const J = ()=>App.Core.Journal;

  function dayValue(journal, chartType, dateStr){
    const entries = journal.filter(j=>j.date===dateStr);
    if(!entries.length) return 0;
    if(chartType==='sessions') return entries.length;
    if(chartType==='variety') return new Set(entries.map(e=>e.exercise)).size;
    if(chartType==='progress'){
      const pcts = entries.map(e=>{
        const exDef = Ex().findByName(e.exercise);
        if(!exDef) return null;
        const target = exDef.finalGoal || (exDef.sets*exDef.max);
        const total = e.sets.reduce((a,b)=>a+b,0);
        return target>0 ? Math.min(1, total/target)*100 : null;
      }).filter(v=>v!==null);
      return pcts.length ? Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length) : 0;
    }
    return entries.reduce((a,e)=>a+e.sets.reduce((x,y)=>x+y,0), 0);
  }

  /** One card per known exercise: progress toward its finalGoal from journal history. */
  function exerciseStatCards(journal){
    return Ex().list().map(e=>{
      const entries = journal.filter(j=>j.exercise===e.name && j.sets.reduce((a,b)=>a+b,0)>0).sort((a,b)=>a.date<b.date?-1:1);
      const target = e.finalGoal || Ex().targetVolume(e);
      if(!entries.length) return {name:e.name, target, entriesCount:0, last:0, pct:0};
      const totals = entries.map(j=>j.sets.reduce((a,b)=>a+b,0));
      const last = totals[totals.length-1];
      const best = Math.max(...totals);
      const avg = Math.round((totals.reduce((a,b)=>a+b,0)/totals.length)*10)/10;
      return {name:e.name, target, entriesCount:entries.length, last, best, avg,
        pct: Math.min(1, last/target), remaining: Math.max(0, target-last), totals};
    });
  }

  /** Muscle-group training load over the trailing N days (normalized 0-100 vs. the busiest group). */
  function muscleGroupLoad(days){
    days = days || 7;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-days);
    const cutoffStr = cutoff.toISOString().slice(0,10);
    const journal = J().loadJournal().filter(j=>j.date>=cutoffStr);
    const byGroup = {};
    journal.forEach(j=>{
      const ex = Ex().findByName(j.exercise);
      if(!ex) return;
      const vol = j.sets.reduce((a,b)=>a+b,0);
      byGroup[ex.muscleGroup] = (byGroup[ex.muscleGroup]||0) + vol;
    });
    const max = Math.max(1, ...Object.values(byGroup));
    return Ex().MUSCLE_GROUPS.filter(g=>g!=='Кардио').map(g=>({
      name:g, volume: byGroup[g]||0, pct: Math.round((byGroup[g]||0)/max*100),
    }));
  }

  return {dayValue, exerciseStatCards, muscleGroupLoad};
})();

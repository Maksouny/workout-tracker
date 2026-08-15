/* =========================================================================
   CORE — UNITS (gram <-> "normal" household units)
   ========================================================================= */
App.Core = App.Core || {};
App.Core.Units = (function(){
  const S = App.State;
  const NORMAL_UNITS = [
    {name:'тарелка', g:350}, {name:'половник', g:250}, {name:'стакан', g:200},
    {name:'ст.л.', g:15}, {name:'ч.л.', g:5},
  ];
  function gramsToNormal(grams){
    grams = grams||0;
    if(grams<=0) return '0 г';
    for(const u of NORMAL_UNITS){
      if(grams>=u.g){
        let count = Math.round(grams/u.g*2)/2;
        const countStr = (count%1===0) ? count.toFixed(0) : count.toFixed(1);
        return `≈ ${countStr} ${u.name}`;
      }
    }
    return Math.round(grams)+' г';
  }
  let displayUnit = S.get('dishUnitMode');
  function getDisplayUnit(){ return displayUnit; }
  function setDisplayUnit(v){ displayUnit = v; S.set('dishUnitMode', v); }
  function formatWeight(grams){ return displayUnit==='normal' ? gramsToNormal(grams) : Math.round(grams)+' г'; }

  return {NORMAL_UNITS, gramsToNormal, getDisplayUnit, setDisplayUnit, formatWeight};
})();

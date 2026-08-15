/* =========================================================================
   CORE — UI PREFERENCES
   Small persisted UI choices (not really "business logic", but Screens
   still shouldn't reach into State/Data directly, so they go through
   Core like everything else).
   ========================================================================= */
App.Core = App.Core || {};
App.Core.UiPrefs = (function(){
  const S = App.State;
  return {
    getProgressLayout:()=>S.get('progressLayout'), setProgressLayout:(v)=>S.set('progressLayout', v),
    getProgressDisplayType:()=>S.get('progressDisplayType'), setProgressDisplayType:(v)=>S.set('progressDisplayType', v),
    getStatsExpanded:()=>S.get('statsExpanded'), setStatsExpanded:(v)=>S.set('statsExpanded', v),
  };
})();

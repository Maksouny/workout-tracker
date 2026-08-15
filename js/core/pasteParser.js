/* =========================================================================
   CORE — PASTE PARSER
   ========================================================================= */
App.Core = App.Core || {};
App.Core.PasteParser = (function(){
  const Ex = ()=>App.Core.Exercises;
  const J = ()=>App.Core.Journal;

  function normalizeStr(s){ return s.toLowerCase().replace(/[()«»"']/g,'').replace(/\s+/g,' ').trim(); }

  function guessExercise(rawName){
    const norm = normalizeStr(rawName);
    if(!norm) return null;
    const list = Ex().list();
    let match = list.find(e=>normalizeStr(e.name)===norm);
    if(match) return match.name;
    match = list.find(e=>normalizeStr(e.name).includes(norm) || norm.includes(normalizeStr(e.name)));
    if(match) return match.name;
    const words = norm.split(' ').filter(w=>w.length>2);
    let best = null, bestScore = 0;
    list.forEach(e=>{
      const eNorm = normalizeStr(e.name);
      const score = words.filter(w=>eNorm.includes(w)).length;
      if(score>bestScore){ bestScore = score; best = e.name; }
    });
    return bestScore>0 ? best : null;
  }

  function parseDateLine(line){
    const m = line.trim().match(/^(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?\s*$/);
    if(!m) return null;
    const day = m[1].padStart(2,'0'), month = m[2].padStart(2,'0');
    let year = m[3] || String(new Date().getFullYear());
    if(year.length===2) year = '20'+year;
    return `${year}-${month}-${day}`;
  }

  function parseExerciseLine(line){
    let notes = '', text = line;
    const noteMatch = text.match(/\/\/\s*(.+)$/) || text.match(/\s-\s(.+)$/);
    if(noteMatch){ notes = noteMatch[1].trim(); text = text.slice(0, noteMatch.index).trim(); }
    const m = text.match(/^(.*?)[\s:–—-]*([\d]+(?:[\s,x×хXХ]+[\d]+)*)\s*$/);
    if(!m) return null;
    const rawName = m[1].trim();
    const nums = m[2].split(/[\s,x×хXХ]+/).map(n=>parseInt(n)).filter(n=>!isNaN(n));
    if(!rawName || nums.length===0) return null;
    return {rawName, nums, notes};
  }

  function parsePaste(text){
    const lines = text.split('\n').map(l=>l.trim()).filter(l=>l.length>0);
    let currentDate = new Date().toISOString().slice(0,10);
    const results = [];
    lines.forEach(line=>{
      const d = parseDateLine(line);
      if(d){ currentDate = d; return; }
      const parsed = parseExerciseLine(line);
      if(parsed){
        const matched = guessExercise(parsed.rawName);
        let sets = parsed.nums.slice(0,4);
        while(sets.length<4) sets.push('');
        let extraNote = parsed.notes;
        if(parsed.nums.length>4){
          extraNote = (extraNote ? extraNote+'; ' : '') + 'доп. подходы: '+parsed.nums.slice(4).join(', ');
        }
        results.push({date:currentDate, rawName:parsed.rawName, exercise:matched, sets, notes:extraNote, include:true});
      }
    });
    return results;
  }

  function commit(parsedRows){
    const toAdd = parsedRows.filter(p=>p.include && p.exercise && p.date);
    if(!toAdd.length) return {ok:false, error:'empty'};
    const entries = toAdd.map(p=>({date:p.date, exercise:p.exercise, sets:p.sets.map(s=>parseInt(s)||0), notes:p.notes||''}));
    J().appendEntries(entries);
    return {ok:true, count:toAdd.length};
  }

  return {parsePaste, commit};
})();

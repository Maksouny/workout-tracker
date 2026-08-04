// ---------------------------------------------------------------------
// Quick paste parser
// ---------------------------------------------------------------------
let pasteParsed = [];

function normalizeStr(s){
  return s.toLowerCase().replace(/[()«»"']/g,'').replace(/\s+/g,' ').trim();
}

function guessExercise(rawName){
  const norm = normalizeStr(rawName);
  if(!norm) return null;
  let match = EXERCISES.find(e=>normalizeStr(e.name)===norm);
  if(match) return match.name;
  match = EXERCISES.find(e=>normalizeStr(e.name).includes(norm) || norm.includes(normalizeStr(e.name)));
  if(match) return match.name;
  const words = norm.split(' ').filter(w=>w.length>2);
  let best = null, bestScore = 0;
  EXERCISES.forEach(e=>{
    const eNorm = normalizeStr(e.name);
    const score = words.filter(w=>eNorm.includes(w)).length;
    if(score>bestScore){ bestScore = score; best = e.name; }
  });
  return bestScore>0 ? best : null;
}

function parseDateLine(line){
  const m = line.trim().match(/^(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?\s*$/);
  if(!m) return null;
  const day = m[1].padStart(2,'0');
  const month = m[2].padStart(2,'0');
  let year = m[3] || String(new Date().getFullYear());
  if(year.length===2) year = '20'+year;
  return `${year}-${month}-${day}`;
}

function parseExerciseLine(line){
  let notes = '';
  let text = line;
  const noteMatch = text.match(/\/\/\s*(.+)$/) || text.match(/\s-\s(.+)$/);
  if(noteMatch){
    notes = noteMatch[1].trim();
    text = text.slice(0, noteMatch.index).trim();
  }
  const m = text.match(/^(.*?)[\s:–—-]*([\d]+(?:[\s,x×хXХ]+[\d]+)*)\s*$/);
  if(!m) return null;
  const rawName = m[1].trim();
  const numsBlob = m[2];
  const nums = numsBlob.split(/[\s,x×хXХ]+/).map(n=>parseInt(n)).filter(n=>!isNaN(n));
  if(!rawName || nums.length===0) return null;
  return { rawName, nums, notes };
}

function parsePaste(){
  const text = document.getElementById('pasteInput').value;
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
        const extra = parsed.nums.slice(4).join(', ');
        extraNote = (extraNote ? extraNote+'; ' : '') + 'доп. подходы: '+extra;
      }
      results.push({
        date: currentDate,
        rawName: parsed.rawName,
        exercise: matched,
        sets,
        notes: extraNote,
        include: true
      });
    }
  });

  pasteParsed = results;
  renderPastePreview();
}

function renderPastePreview(){
  const wrap = document.getElementById('pastePreviewWrap');
  const el = document.getElementById('pastePreview');
  wrap.style.display = 'block';
  if(!pasteParsed.length){
    el.innerHTML = '<div class="note">Не удалось распознать ни одной строки. Проверь формат выше.</div>';
    return;
  }
  el.innerHTML = pasteParsed.map((p,i)=>{
    const options = EXERCISES.map(e=>`<option value="${e.name}" ${e.name===p.exercise?'selected':''}>${e.name}</option>`).join('');
    const unmatchedFlag = !p.exercise ? '<span style="color:var(--danger);font-size:10px;">не распознано — выбери вручную</span>' : '';
    return `<div class="stat-card">
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
        <input type="checkbox" ${p.include?'checked':''} onchange="pasteParsed[${i}].include=this.checked">
        <input type="date" value="${p.date}" style="background:var(--surface);border:1px solid var(--line);color:var(--text);
          padding:5px 8px;border-radius:5px;font-family:'IBM Plex Mono',monospace;font-size:12px;"
          onchange="pasteParsed[${i}].date=this.value">
        <select style="background-color:var(--surface);border:1px solid var(--line);color:var(--text);padding:5px 26px 5px 8px;
          border-radius:5px;font-size:12px;flex:1;min-width:160px;" onchange="pasteParsed[${i}].exercise=this.value">
          ${options}
        </select>
        ${unmatchedFlag}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${[0,1,2,3].map(si=>`<input type="number" value="${p.sets[si]}" style="width:56px;background:var(--surface);
          border:1px solid var(--line);color:var(--text);padding:5px 6px;border-radius:5px;font-family:'IBM Plex Mono',monospace;font-size:12px;"
          onchange="pasteParsed[${i}].sets[${si}]=this.value">`).join('')}
        <input type="text" value="${p.notes||''}" placeholder="заметка" style="flex:1;min-width:120px;background:var(--surface);
          border:1px solid var(--line);color:var(--text);padding:5px 8px;border-radius:5px;font-size:12px;"
          onchange="pasteParsed[${i}].notes=this.value">
      </div>
      <div class="note" style="margin-top:6px;">исходная строка: «${p.rawName}»</div>
    </div>`;
  }).join('');
}

function commitPaste(){
  const toAdd = pasteParsed.filter(p=>p.include && p.exercise && p.date);
  if(!toAdd.length){ alert('Нечего добавлять — отметь строки и убедись, что упражнение и дата указаны'); return; }
  const journal = loadJournal();
  let nextId = journal.length ? Math.max(...journal.map(j=>j.id))+1 : 1;
  toAdd.forEach(p=>{
    const sets = p.sets.map(s=>parseInt(s)||0);
    journal.push({ id: nextId++, date: p.date, exercise: p.exercise, sets, notes: p.notes||'' });
  });
  saveJournal(journal);
  pasteParsed = [];
  document.getElementById('pastePreviewWrap').style.display='none';
  document.getElementById('pasteInput').value='';
  renderJournalList();
  renderDashboard();
  alert(`Добавлено записей: ${toAdd.length}`);
}

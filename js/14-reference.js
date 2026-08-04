// ---------------------------------------------------------------------
// Reference page
// ---------------------------------------------------------------------
function targetVolume(e){ return e.sets*e.max; }
function targetLabel(e){
  const suffix = e.unit.includes('на ногу') ? '(на ногу)' : e.unit.includes('на руку') ? '(на руку)' : e.unit;
  return `${e.sets}×${e.min}-${e.max} ${suffix}`;
}
function renderReference(){
  const el = document.getElementById('refList');
  const searchEl = document.getElementById('refSearch');
  const search = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const entries = EXERCISES.map((e,i)=>({e,i})).filter(({e})=> !search || e.name.toLowerCase().includes(search));
  el.innerHTML = entries.map(({e,i})=>{
    const [label, cls] = WHERE_LABEL[e.where];
    const suffix = e.unit.includes('на ногу') ? '(на ногу)' : e.unit.includes('на руку') ? '(на руку)' : e.unit;
    const primaryMuscles = (e.muscles && e.muscles.primary) || [];
    const secondaryMuscles = (e.muscles && e.muscles.secondary) || [];
    const fmtMuscle = m => `${m.name} <span class="mono" style="color:var(--muted);">(${m.load})</span>`;
    return `<div class="dish-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div class="name">${e.name}</div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
          <select class="tag ${cls}" style="border:none;font-family:inherit;letter-spacing:inherit;text-transform:uppercase;
            cursor:pointer;" onchange="updateExerciseWhere(${i},this.value)">
            <option value="home" ${e.where==='home'?'selected':''}>Дом</option>
            <option value="outside" ${e.where==='outside'?'selected':''}>Улица</option>
            <option value="both" ${e.where==='both'?'selected':''}>Дом / Улица</option>
          </select>
          <span style="cursor:pointer;font-size:11px;color:var(--muted);" onclick="toggleExerciseLike(${i})">${likeLabel(e.liked)}</span>
          <span style="color:var(--danger);cursor:pointer;font-size:12px;" onclick="deleteExercise(${i})">✕ удалить</span>
        </div>
      </div>

      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-top:10px;">
        <div>
          <div class="note" style="margin-bottom:4px;">Группа мышц (задана при создании)</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <span class="tag-chip active" style="cursor:default;">${e.muscleGroup}</span>
          </div>
          ${primaryMuscles.length ? `<div class="note" style="margin-top:6px;">Основные мышцы: <span style="color:var(--text);">${primaryMuscles.map(fmtMuscle).join(', ')}</span></div>` : ''}
          ${secondaryMuscles.length ? `<div class="note" style="margin-top:2px;">Второстепенные мышцы: <span style="color:var(--text);">${secondaryMuscles.map(fmtMuscle).join(', ')}</span></div>` : ''}
        </div>
        <div>
          <div class="note" style="margin-bottom:4px;">Подходы × повторы</div>
          <div style="display:flex;align-items:center;gap:4px;">
            <input type="number" value="${e.sets}" style="width:44px;background:var(--surface2);border:1px solid var(--line);
              color:var(--text);padding:6px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:12px;"
              onchange="updateExerciseField(${i},'sets',this.value)">×
            <input type="number" value="${e.min}" style="width:50px;background:var(--surface2);border:1px solid var(--line);
              color:var(--text);padding:6px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:12px;"
              onchange="updateExerciseField(${i},'min',this.value)">-
            <input type="number" value="${e.max}" style="width:50px;background:var(--surface2);border:1px solid var(--line);
              color:var(--text);padding:6px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:12px;"
              onchange="updateExerciseField(${i},'max',this.value)">
            <span class="note">${suffix}</span>
          </div>
        </div>
        <div>
          <div class="note" style="margin-bottom:4px;">Финальная цель</div>
          <input type="number" value="${e.finalGoal}" style="width:70px;background:var(--surface2);border:1px solid var(--line);
            color:var(--text);padding:6px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:12px;"
            onchange="updateExerciseField(${i},'finalGoal',this.value)">
        </div>
      </div>

      <div class="tech-note" style="margin-top:10px;">Объём цели уровня: ${targetVolume(e)}. ${e.tech}</div>
      ${exerciseRatingsHtml(e, i)}
    </div>`;
  }).join('');
}

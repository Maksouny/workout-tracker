// ---------------------------------------------------------------------
// "Нормальные" единицы измерения — используются в «Наших блюдах», когда
// включён режим отображения "Нормальный" вместо чистых граммов.
// Значения ориентировочные (усреднённые по бытовым таблицам мер: вода/
// сыпучие продукты без горки), точный вес всегда зависит от продукта —
// поэтому рядом всегда показываем граммы в скобках.
// ---------------------------------------------------------------------
const NORMAL_UNITS = [
  {name:'тарелка', g:350},
  {name:'половник', g:250},
  {name:'стакан', g:200},
  {name:'ст.л.', g:15},
  {name:'ч.л.', g:5},
];
function gramsToNormal(grams){
  grams = grams||0;
  if(grams<=0) return '0 г';
  for(const u of NORMAL_UNITS){
    if(grams >= u.g){
      let count = Math.round(grams/u.g*2)/2;
      const countStr = (count%1===0) ? count.toFixed(0) : count.toFixed(1);
      return `≈ ${countStr} ${u.name}`;
    }
  }
  return Math.round(grams)+' г';
}
let dishDisplayUnit = localStorage.getItem('zt_dish_unit_mode') || 'g';
function setDishDisplayUnit(v){
  dishDisplayUnit = v;
  localStorage.setItem('zt_dish_unit_mode', v);
  renderDishList();
  if(typeof renderDishChains==='function') renderDishChains();
  if(typeof calcDish==='function') calcDish();
}
function formatDishWeight(grams){
  return dishDisplayUnit==='normal' ? gramsToNormal(grams) : Math.round(grams)+' г';
}

// ---------------------------------------------------------------------
// Generic portal popover — appended to <body> so it's never clipped by
// a parent card's overflow:hidden or a horizontally-scrolling chain row.
// ---------------------------------------------------------------------
function closePortalPopover(){
  const pop = document.getElementById('activePortalPopover');
  if(!pop) return;
  if(pop._reposition){
    window.removeEventListener('scroll', pop._reposition, true);
    window.removeEventListener('resize', pop._reposition);
  }
  document.removeEventListener('click', portalOutsideClick, true);
  pop.remove();
}
function portalOutsideClick(e){
  const pop = document.getElementById('activePortalPopover');
  if(!pop) return;
  if(pop.contains(e.target) || (pop._anchor && pop._anchor.contains(e.target))) return;
  closePortalPopover();
}
function positionPortalPopover(anchorEl, pop){
  const r = anchorEl.getBoundingClientRect();
  const pr = pop.getBoundingClientRect();
  let top = r.bottom + 8;
  let left = r.left;
  if(left + pr.width > window.innerWidth - 8) left = window.innerWidth - pr.width - 8;
  if(left < 8) left = 8;
  if(top + pr.height > window.innerHeight - 8) top = r.top - pr.height - 8;
  if(top < 8) top = 8;
  pop.style.top = top+'px';
  pop.style.left = left+'px';
}
function openPortalPopover(anchorEl, html){
  closePortalPopover();
  const pop = document.createElement('div');
  pop.className = 'portal-popover';
  pop.id = 'activePortalPopover';
  pop.innerHTML = html;
  document.body.appendChild(pop);
  positionPortalPopover(anchorEl, pop);
  requestAnimationFrame(()=>pop.classList.add('show'));
  const reposition = ()=>positionPortalPopover(anchorEl, pop);
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);
  pop._reposition = reposition;
  pop._anchor = anchorEl;
  setTimeout(()=>document.addEventListener('click', portalOutsideClick, true), 0);
  return pop;
}

// ---------------------------------------------------------------------
// Unified tag select + create combobox (opens as a portal popover —
// fixes it being invisible/clipped inside an overflow:hidden card)
// ---------------------------------------------------------------------
const LS_DISH_TAG_OPTIONS = "zt_dish_tag_options";
function loadDishTagOptions(){
  const raw = localStorage.getItem(LS_DISH_TAG_OPTIONS);
  return raw ? JSON.parse(raw) : ['Завтрак','Обед','Ужин'];
}
function saveDishTagOptions(arr){ localStorage.setItem(LS_DISH_TAG_OPTIONS, JSON.stringify(arr)); }
let selectedDishTags = [];

function tagPopoverHtml(){
  const options = loadDishTagOptions();
  return `<div id="dishTagChips" class="tag-chip-row">${options.map(t=>`<span class="tag-chip ${selectedDishTags.includes(t)?'active':''}"
      onclick="toggleDishTagChip('${t.replace(/'/g,"\\'")}')">${t}</span>`).join('')}</div>
    <div class="tag-combo-new">
      <input type="text" id="newTagInput" placeholder="+ создать новый тег…"
        onkeydown="if(event.key==='Enter'){event.preventDefault();addCustomDishTag();}">
      <button class="btn secondary small" onclick="addCustomDishTag()">Создать</button>
    </div>`;
}
function toggleTagDropdown(e){
  if(e) e.stopPropagation();
  const combo = document.getElementById('tagCombo');
  if(combo.classList.contains('open')){
    closePortalPopover();
    combo.classList.remove('open');
    return;
  }
  const anchor = document.getElementById('tagComboDisplay');
  combo.classList.add('open');
  const pop = openPortalPopover(anchor, tagPopoverHtml());
  // make sure the caret flips back when this particular popover closes
  const obs = new MutationObserver(()=>{
    if(!document.body.contains(pop)){
      combo.classList.remove('open');
      obs.disconnect();
    }
  });
  obs.observe(document.body, {childList:true});
}
function renderDishTagChips(){
  const hidden = document.getElementById('dishTags');
  if(hidden) hidden.value = selectedDishTags.join(', ');
  const combo = document.getElementById('tagCombo');
  const summary = document.getElementById('tagComboSummary');
  if(combo && summary){
    combo.classList.toggle('has-tags', selectedDishTags.length>0);
    summary.textContent = selectedDishTags.length ? selectedDishTags.join(', ') : 'Выбери или создай тег…';
  }
  // if the popover is currently open, refresh its chip list in place
  const chipsEl = document.getElementById('dishTagChips');
  if(chipsEl){
    const options = loadDishTagOptions();
    chipsEl.innerHTML = options.map(t=>`<span class="tag-chip ${selectedDishTags.includes(t)?'active':''}"
      onclick="toggleDishTagChip('${t.replace(/'/g,"\\'")}')">${t}</span>`).join('');
  }
}
function toggleDishTagChip(t){
  if(selectedDishTags.includes(t)) selectedDishTags = selectedDishTags.filter(x=>x!==t);
  else selectedDishTags.push(t);
  renderDishTagChips();
}
function addCustomDishTag(){
  const input = document.getElementById('newTagInput');
  const val = input.value.trim();
  if(!val) return;
  const options = loadDishTagOptions();
  if(!options.includes(val)){ options.push(val); saveDishTagOptions(options); }
  if(!selectedDishTags.includes(val)) selectedDishTags.push(val);
  input.value = '';
  input.focus();
  renderDishTagChips();
}

function refreshDishIngredientOptions(){
  renderDishChains();
}

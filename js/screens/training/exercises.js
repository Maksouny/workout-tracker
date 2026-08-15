/* =========================================================================
   TRAINING SECTION — УПРАЖНЕНИЯ (справочник/редактор)
   ========================================================================= */
App.Screens = App.Screens || {};
App.Screens.TrainingSections = App.Screens.TrainingSections || {};

App.Screens.TrainingSections.exercises = (function(){
  const {h, clear} = App.Dom;
  const C = App.Components;
  const Ex = ()=>App.Core.Exercises;
  const Rt = ()=>App.Core.Ratings;

  let filter = 'all', search = '';
  let sectionRef = null;

  function build(container){
    sectionRef = container;
    const list = Ex().list();
    const groups = ['all', ...Ex().allMuscleGroups()];

    const searchInput = h('input', {type:'text', placeholder:'Поиск упражнения...', value:search});
    searchInput.addEventListener('input', e=>{ search = e.target.value; paintList(); });
    container.appendChild(h('div.search-bar', {}, ['🔎', searchInput]));

    const filterRow = h('div.filters');
    groups.forEach(g=>{
      const chip = h('button.filter-chip'+(g===filter?'.active':''), {}, [g==='all'?'Все':g]);
      chip.addEventListener('click', ()=>{ filter = g; paintList(); repaintChips(); });
      filterRow.appendChild(chip);
    });
    function repaintChips(){ Array.from(filterRow.children).forEach((c,i)=>{ c.className = 'filter-chip'+(groups[i]===filter?' active':''); }); }
    container.appendChild(filterRow);

    let showAddForm = false;
    const addFormWrap = h('div.mt-3');
    const addToggleBtn = C.Button({label:'+ Добавить своё упражнение', variant:'secondary', block:true, onClick:()=>{
      showAddForm = !showAddForm;
      addToggleBtn.update({label: showAddForm?'Скрыть форму':'+ Добавить своё упражнение'});
      clear(addFormWrap); if(showAddForm) addFormWrap.appendChild(buildAddForm());
    }});
    container.appendChild(addToggleBtn.el);
    container.appendChild(addFormWrap);

    const listWrap = h('div.mt-4');
    container.appendChild(listWrap);
    function paintList(){
      clear(listWrap);
      const entries = list.map((e,i)=>({e,i})).filter(({e})=>
        (filter==='all' || e.muscleGroup===filter) && (!search || e.name.toLowerCase().includes(search.toLowerCase())));
      if(!entries.length){ listWrap.appendChild(App.UI.emptyState('Ничего не найдено')); return; }
      entries.forEach(({e,i})=>listWrap.appendChild(exerciseCardNode(e,i)));
    }
    paintList();
  }

  function ratingSummaryNode(ex){
    const stats = Rt().exerciseRatingHistoryAverage(ex.name);
    if(!stats.count) return h('div.note.mt-2', {}, ['Оценок пока нет — появятся после тренировки.']);
    const grid = h('div.rating-grid.mt-2');
    stats.perCriteria.forEach(c=>{
      grid.appendChild(h('span',{},[c.label]));
      grid.appendChild(h('span.mono.text-accent', {}, [c.avg!==null?c.avg+'/5':'—']));
    });
    return h('details.rating-toggle.mt-2', {}, [
      h('summary', {}, [`Средние оценки (${stats.count})${stats.overall!==null?` · ${stats.overall}/5`:''}`]),
      grid,
    ]);
  }

  function exerciseCardNode(ex, i){
    const [label] = Ex().WHERE_LABEL[ex.where];
    return C.ExerciseCard({
      ex, index:i, whereLabel:label, likeLabel:Ex().likeLabel(ex.liked), ratingSummary:ratingSummaryNode(ex),
      onFieldChange(idx, field, value){ Ex().updateField(idx, field, value); },
      onWhereChange(idx, value){ Ex().updateWhere(idx, value); },
      onToggleLike(idx){ Ex().toggleLike(idx); refresh(); },
      onRemove(idx){ if(!confirm(`Удалить упражнение "${Ex().list()[idx].name}"? Записи в журнале останутся.`)) return; Ex().remove(idx); refresh(); },
    }).el;
  }
  function refresh(){ if(sectionRef){ clear(sectionRef); build(sectionRef); } }

  function buildAddForm(){
    const groups = Ex().allMuscleGroups();
    let secondary = [];
    const nameInput = h('input', {type:'text'});
    const setsInput = h('input', {type:'number', value:3});
    const minInput = h('input', {type:'number', value:10});
    const maxInput = h('input', {type:'number', value:15});
    const finalInput = h('input', {type:'number', placeholder:'сеты×макс'});
    const unitInput = h('input', {type:'text', value:'повторений'});
    const whereSelect = C.Select({value:'both', options:[{value:'home',label:'Дом'}, {value:'outside',label:'Улица'}, {value:'both',label:'Дом / Улица'}]});
    const muscleSelect = C.Select({value:groups[0], options:groups});
    const secondaryWrap = h('div.flex-wrap-gap-2');
    function paintSecondary(){
      clear(secondaryWrap);
      groups.forEach(g=>{
        const disabled = g===muscleSelect.value;
        const cb = h('input', {type:'checkbox', value:g, checked:secondary.includes(g), disabled});
        cb.addEventListener('change', ()=>{ if(cb.checked) secondary.push(g); else secondary = secondary.filter(x=>x!==g); });
        secondaryWrap.appendChild(h('label.tag-chip-check', {}, [cb, ' '+g]));
      });
    }
    muscleSelect.addEventListener('change', ()=>{ secondary = secondary.filter(x=>x!==muscleSelect.value); paintSecondary(); });
    paintSecondary();
    const techInput = h('textarea', {rows:2});

    const card = C.Card();
    card.el.append(
      C.Field('Название', nameInput),
      h('div.row', {}, [C.Field('Подходы', setsInput), C.Field('Мин', minInput), C.Field('Макс', maxInput)]),
      h('div.row', {}, [C.Field('Финальная цель', finalInput), C.Field('Единица', unitInput)]),
      h('div.row', {}, [C.Field('Место', whereSelect), C.Field('Основная группа мышц', muscleSelect)]),
      C.Field('Второстепенные группы', secondaryWrap),
      C.Field('Техника (заметка)', techInput),
      C.Button({label:'Добавить упражнение', block:true, onClick:()=>{
        if(!nameInput.value.trim()){ alert('Укажи название упражнения'); return; }
        Ex().add({name:nameInput.value, sets:setsInput.value, min:minInput.value, max:maxInput.value, finalGoal:finalInput.value,
          unit:unitInput.value, where:whereSelect.value, muscleGroup:muscleSelect.value, secondaryMuscles:secondary, tech:techInput.value});
        refresh();
      }}).el,
    );
    return card.el;
  }

  return build;
})();

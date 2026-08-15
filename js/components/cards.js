/* =========================================================================
   COMPONENTS — DOMAIN CARDS
   ========================================================================= */
(function(){
  const {h, text, clear} = App.Dom;

  // ---------------- StatCard (quick-stat tile, e.g. Home screen grid) ----------------
  App.Components.StatCard = function({icon, value, label, colorVar='var(--accent)', dimVar='var(--accent-dim)'}){
    const valueEl = h('div.value', {}, [value]);
    const el = h('div.quick-card', {}, [
      h('div.icon', {style:{background:dimVar, color:colorVar}}, [icon]),
      valueEl,
      h('div.label', {}, [label]),
    ]);
    function update(newValue){ clear(valueEl); valueEl.appendChild(text(newValue)); }
    return {el, update};
  };

  // ---------------- RatingStars (used inside ExerciseCard / DishCard) ----------------
  App.Components.RatingStars = function({value=0, onRate, dataset={}}){
    const stars = [];
    const el = h('span.star-row');
    for(let i=1;i<=5;i++){
      const star = h('span.star'+(i<=value?'.filled':''), {dataset:{action:'rate-star', ...dataset, star:i}}, ['★']);
      stars.push(star);
      el.appendChild(star);
    }
    App.Dom.delegate(el, 'click', { 'rate-star'(e, ds){ if(onRate) onRate(parseInt(ds.star)); } });
    function update(newValue){ stars.forEach((s,i)=>{ s.className = 'star'+(i+1<=newValue?' filled':''); }); }
    return {el, update};
  };

  // ---------------- RatingSlider (1–5 slider — used in the post-workout rating flow) ----------------
  App.Components.RatingSlider = function({value=0, onRate}){
    const valueLabel = h('span.rating-slider-value', {}, [String(value||3)]);
    const input = h('input.rating-slider', {type:'range', min:'1', max:'5', step:'1', value:String(value||3)});
    input.addEventListener('input', ()=>{ valueLabel.textContent = input.value; });
    input.addEventListener('change', ()=>{ if(onRate) onRate(parseInt(input.value)); });
    const el = h('span.rating-slider-row', {}, [input, valueLabel]);
    function update(newValue){ input.value = String(newValue||3); valueLabel.textContent = input.value; }
    return {el, update};
  };

  // ---------------- ExerciseCard (reference/library entry — editable) ----------------
  App.Components.ExerciseCard = function({ex, index, whereLabel, likeLabel, ratingSummary, onFieldChange, onWhereChange, onToggleLike, onRemove}){
    const primary = (ex.muscles && ex.muscles.primary) || [];
    const secondary = (ex.muscles && ex.muscles.secondary) || [];
    const fmtMuscle = m=>`${m.name} (${m.load})`;

    const whereSelect = h('select.tag', {dataset:{action:'where-change', index}}, [
      h('option', {value:'home', selected:ex.where==='home'}, ['Дом']),
      h('option', {value:'outside', selected:ex.where==='outside'}, ['Улица']),
      h('option', {value:'both', selected:ex.where==='both'}, ['Дом / Улица']),
    ]);

    function numField(labelText, field, value){
      return h('div.field.'+(field==='finalGoal'?'field-md':'field-sm'), {}, [
        h('label', {}, [labelText]),
        h('input', {type:'number', value, dataset:{action:'field-change', index, field}}),
      ]);
    }

    const el = h('div.list-card', {}, [
      h('div.lc-head', {}, [
        h('div.lc-name', {}, [ex.name]),
        h('div.lc-actions', {}, [
          whereSelect,
          h('span.note.note-action', {dataset:{action:'toggle-like', index}}, [likeLabel]),
          h('span.icon-delete-card', {dataset:{action:'remove', index}}, ['✕']),
        ]),
      ]),
      h('div.row.mt-10', {}, [
        h('div', {}, [
          h('div.note.mb-1', {}, [ex.muscleGroup]),
          primary.length ? h('div.note', {}, ['Основные: '+primary.map(fmtMuscle).join(', ')]) : null,
          secondary.length ? h('div.note', {}, ['Второстепенные: '+secondary.map(fmtMuscle).join(', ')]) : null,
        ]),
      ]),
      h('div.row.mt-10.align-center', {}, [
        numField('Подх.', 'sets', ex.sets), numField('Мин', 'min', ex.min),
        numField('Макс', 'max', ex.max), numField('Цель', 'finalGoal', ex.finalGoal),
      ]),
      h('div.note.mt-6', {}, [`Объём цели уровня: ${ex.sets*ex.max}. ${ex.tech||''}`]),
      ratingSummary,
    ]);

    App.Dom.delegate(el, 'change', {
      'where-change'(e, ds){ onWhereChange && onWhereChange(parseInt(ds.index), e.target.value); },
      'field-change'(e, ds){ onFieldChange && onFieldChange(parseInt(ds.index), ds.field, e.target.value); },
    });
    App.Dom.delegate(el, 'click', {
      'toggle-like'(e, ds){ onToggleLike && onToggleLike(parseInt(ds.index)); },
      'remove'(e, ds){ onRemove && onRemove(parseInt(ds.index)); },
    });
    return {el};
  };

  // ---------------- ExerciseRow (compact row: today's plan / history) ----------------
  App.Components.ExerciseRow = function({num, name, meta, dataset={}}){
    const el = h('div.exercise-row', {dataset}, [
      num!=null ? h('div.ex-num', {}, [String(num)]) : null,
      h('div.ex-detail', {}, [
        h('div.ex-detail-name', {}, [name]),
        h('div.ex-detail-meta', {}, [meta]),
      ]),
    ]);
    return {el};
  };

  // ---------------- SetButton (one set's target/result pill) ----------------
  App.Components.SetButton = function({label, state='pending', dataset={}, onClick}){
    // state: pending | active | done — visual variants are CSS modifier classes, not inline style.
    const el = h('button.set-pill', {dataset:{action:'set-pill', ...dataset}, onClick: onClick||null}, [label]);
    if(state!=='pending') el.classList.add('set-pill--'+state);
    function update({label:newLabel, state:newState}={}){
      if(newLabel!=null){ clear(el); el.appendChild(text(newLabel)); }
      if(newState){
        el.classList.remove('set-pill--done', 'set-pill--active');
        if(newState!=='pending') el.classList.add('set-pill--'+newState);
      }
    }
    return {el, update};
  };

  // ---------------- WorkoutCard (today's plan / schedule day card) ----------------
  App.Components.WorkoutCard = function({dayLabel, tagEl, bodyChildren, footerEl}){
    const el = h('div.card', {}, [
      h('div.justify-between', {}, [h('b', {}, [dayLabel]), tagEl||null]),
      ...(bodyChildren||[]),
      footerEl||null,
    ]);
    return {el};
  };

  // ---------------- MealCard (meal-plan slot) ----------------
  App.Components.MealCard = function({slotLabel, dishName, macros, score, remaining, dataset={}, onReroll}){
    const rerollBtn = onReroll ? h('button.btn.secondary.small', {dataset:{action:'reroll', ...dataset}}, ['🔄']) : null;
    const el = h('div.list-card', {}, [
      h('div.lc-head', {}, [
        h('div.lc-name', {}, [`${slotLabel}: ${dishName||'—'}`]),
        rerollBtn,
      ]),
      dishName ? h('div.pill-row', {}, macros.map(([k,v])=>h('span',{},[k+': ', h('b',{},[String(v)])]))) : h('div.empty-state', {}, ['Нет подходящих блюд']),
      remaining ? h('div.note.mt-6', {}, [remaining]) : null,
    ]);
    if(onReroll) App.Dom.delegate(el, 'click', {reroll(e,ds){ onReroll(ds); }});
    return {el};
  };

  // ---------------- DishCard (saved dish) ----------------
  App.Components.DishCard = function({dish, favoriteLabel, per100, ratingCriteria, onToggleFavorite, onDelete, onRate}){
    const compRows = (dish.composition||[]).map(c=>`${c.name} — ${c.rawGrams} г${c.method&&c.method.indexOf('Без обработки')===-1?' · '+c.method:''}`);
    const compBlock = compRows.length ? h('details.mt-2', {}, [
      h('summary.summary-compact', {}, [`Состав (${compRows.length})`]),
      h('div.note.mt-6', {html: compRows.join('<br>')}),
    ]) : null;

    const ratingRows = ratingCriteria.map(c=>{
      const stars = App.Components.RatingStars({value:(dish.ratings&&dish.ratings[c.key])||0, dataset:{dishId:dish.id, key:c.key}, onRate:(v)=>onRate&&onRate(dish.id, c.key, v)});
      return [h('span', {}, [c.label]), stars.el];
    });
    const ratingsBlock = h('details.rating-toggle.mt-2', {}, [
      h('summary', {}, ['Подробные оценки']),
      h('div.rating-grid.mt-2', {}, ratingRows.flat()),
    ]);

    const el = h('div.list-card', {}, [
      h('div.lc-head', {}, [
        h('div.lc-name', {}, [dish.name]),
        h('div.lc-actions', {}, [
          h('span.note.note-action', {dataset:{action:'toggle-favorite', dishId:dish.id}}, [favoriteLabel]),
          h('span.icon-delete-card', {dataset:{action:'delete', dishId:dish.id}}, ['✕']),
        ]),
      ]),
      h('div.pill-row', {}, [h('span',{},['Готовый вес: ', h('b',{},[dish.cookedWeight+' г'])]), h('span',{},['Цена: ', h('b',{},[dish.price+' руб'])])]),
      h('div.pill-row', {}, [h('span',{},[`Всего: `, h('b',{},[dish.kcal+' ккал']), ' / Б ', h('b',{},[dish.protein]), ' / Ж ', h('b',{},[dish.fat]), ' / У ', h('b',{},[dish.carb])])]),
      h('div.pill-row', {}, [h('span',{},[`На 100г: `, h('b',{},[per100.kcal+' ккал']), ' / Б ', h('b',{},[per100.protein]), ' / Ж ', h('b',{},[per100.fat]), ' / У ', h('b',{},[per100.carb])])]),
      compBlock, ratingsBlock,
    ]);
    App.Dom.delegate(el, 'click', {
      'toggle-favorite'(e,ds){ onToggleFavorite && onToggleFavorite(parseInt(ds.dishId)); },
      'delete'(e,ds){ onDelete && onDelete(parseInt(ds.dishId)); },
    });
    return {el};
  };
})();

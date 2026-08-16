/* =========================================================================
   HEALTH SECTION — РАЦИОН
   Единицы отображения сверху экрана, затем автоподбор (день/неделя) и
   переключатель «Блюда ↔ Конструктор блюд» (с отступом друг от друга).
   Редактирование ингредиентов свёрнуто внутрь конструктора (кнопка
   «Редактировать ингредиенты»).
   ========================================================================= */
App.Screens = App.Screens || {};
App.Screens.HealthSections = App.Screens.HealthSections || {};

App.Screens.HealthSections.diet = (function(){
  const {h, clear} = App.Dom;
  const C = App.Components;
  const MP = ()=>App.Core.MealPlan;
  const Kb = ()=>App.Core.Kbju;
  const DC = ()=>App.Core.DishConstructor;
  const Ing = ()=>App.Core.Ingredients;
  const Tags = ()=>App.Core.DishTags;
  const Units = ()=>App.Core.Units;
  const Rt = ()=>App.Core.Ratings;

  let mode = 'list'; // 'list' | 'construct'

  // Порядок: Единицы отображения (сверху, над «Собрать день») → автоподбор →
  // переключатель Блюда/Конструктор блюд.
  function build(container){
    buildUnitSelector(container);
    buildAutoPicker(container);

    const modeTabs = C.Tabs({items:[{key:'list',label:'Блюда'},{key:'construct',label:'Конструктор блюд'}], active:mode, onChange(key){ mode=key; paintMode(); }});
    modeTabs.el.classList.add('mt-4');
    container.appendChild(modeTabs.el);
    const modeWrap = h('div');
    container.appendChild(modeWrap);
    function paintMode(){ clear(modeWrap); mode==='construct' ? buildConstructor(modeWrap) : buildDishList(modeWrap); }
    paintMode();
  }

  // ================= Автоподбор =================
  function buildAutoPicker(container){
    const dayWrap = h('div.mt-3');
    container.appendChild(C.Button({label:'Собрать день', block:true, onClick:()=>{
      const res = MP().buildDayPlan();
      if(!res.ok){ clear(dayWrap); dayWrap.appendChild(App.UI.emptyState('Сначала сохрани хотя бы пару блюд ниже.')); return; }
      paintDay();
    }}).el);
    container.appendChild(dayWrap);

    function paintDay(){
      clear(dayWrap);
      const plan = MP().getCurrentPlan();
      const t = Kb().computeTargetMacros(Kb().getSaved());
      if(!plan.length){ dayWrap.appendChild(h('div.note', {}, [`Нужно на день: ${Math.round(t.kcal)} ккал / Б ${Math.round(t.protein)} / Ж ${Math.round(t.fat)} / У ${Math.round(t.carb)}. Нажми «Собрать день».`])); return; }
      dayWrap.appendChild(h('div.note.mb-3', {}, ['Нужно на день: ', h('b',{},[Math.round(t.kcal)+' ккал']), ` / Б ${Math.round(t.protein)} / Ж ${Math.round(t.fat)} / У ${Math.round(t.carb)}`]));
      plan.forEach((p,i)=>{
        const macros = p.picked ? [['Ккал',p.picked.kcal],['Б',p.picked.protein],['Ж',p.picked.fat],['У',p.picked.carb],['Score',p.score]] : [];
        const remaining = p.picked ? `Осталось: ${Math.round(p.remainingAfter.kcal)} ккал / Б ${Math.round(p.remainingAfter.protein)} / Ж ${Math.round(p.remainingAfter.fat)} / У ${Math.round(p.remainingAfter.carb)}` : null;
        dayWrap.appendChild(C.MealCard({slotLabel:p.slot.label, dishName:p.picked?p.picked.name:null, macros, remaining, onReroll:()=>{ MP().rerollSlot(i); paintDay(); }}).el);
      });
    }

    let weekOpen = false;
    const weekWrap = h('div.hidden.mt-3');
    const weekToggle = C.Button({label:'Показать всю неделю', variant:'secondary', block:true, onClick:()=>{
      weekOpen = !weekOpen;
      weekToggle.update({label: weekOpen?'Скрыть неделю':'Показать всю неделю'});
      weekWrap.classList.toggle('hidden', !weekOpen);
      if(weekOpen){ if(!MP().getCurrentWeekPlan().length) MP().buildWeekPlan(); paintWeek(); }
    }});
    container.append(weekToggle.el, weekWrap);

    function paintWeek(){
      clear(weekWrap);
      const plan = MP().getCurrentWeekPlan();
      const t = Kb().computeTargetMacros(Kb().getSaved());
      if(!plan.length){ weekWrap.appendChild(App.UI.emptyState('Нажми ещё раз после сохранения блюд.')); return; }
      plan.forEach(day=>{
        const dayKcal = day.meals.reduce((a,m)=>a+(m.picked?m.picked.kcal:0),0);
        const card = C.Card({title:day.dayLabel, subtitle:`${day.dateStr} · ${Math.round(dayKcal)}/${Math.round(t.kcal)} ккал`});
        day.meals.forEach(m=>{
          const macros = m.picked ? [['Ккал',m.picked.kcal],['Б',m.picked.protein],['Ж',m.picked.fat],['У',m.picked.carb]] : [];
          card.el.appendChild(h('div.list-card', {}, [
            h('div.lc-name', {}, [`${m.slot.label}: ${m.picked?m.picked.name:'—'}`]),
            m.picked ? h('div.pill-row', {}, macros.map(([k,v])=>h('span',{},[k+': ',h('b',{},[String(v)])]))) : App.UI.emptyState('Нет подходящих блюд'),
          ]));
        });
        weekWrap.appendChild(card.el);
      });
      weekWrap.appendChild(h('div.note.mt-2', {}, ['Предварительный план — не пишется в журнал автоматически.']));
    }
    paintDay();
  }

  // ================= Блюда (список) =================
  function buildDishList(container){
    let search = '';
    const searchInput = h('input', {type:'text', placeholder:'Поиск блюда или тега…'});
    container.appendChild(h('div.search-bar', {}, [searchInput]));
    const listWrap = h('div');
    container.appendChild(listWrap);
    searchInput.addEventListener('input', ()=>{ search = searchInput.value; paint(); });

    function paint(){
      clear(listWrap);
      const dishes = DC().listDishes();
      const q = search.trim().toLowerCase();
      const visible = q ? dishes.filter(d=>d.name.toLowerCase().includes(q) || (d.tags||[]).some(t=>t.toLowerCase().includes(q))) : dishes;
      if(!dishes.length){ listWrap.appendChild(App.UI.emptyState('Пока нет сохранённых блюд — переключись на «Конструктор блюд».')); return; }
      if(!visible.length){ listWrap.appendChild(App.UI.emptyState('Ничего не найдено')); return; }

      const folders = {};
      visible.forEach(d=>{ (d.tags&&d.tags.length?d.tags:['Без тега']).forEach(t=>{ (folders[t]=folders[t]||[]).push(d); }); });
      Object.keys(folders).sort().forEach(tag=>{
        const body = h('div.dish-folder-body');
        folders[tag].forEach(d=>body.appendChild(dishCardNode(d, paint)));
        listWrap.appendChild(h('details.mb-3', {open:!!q}, [
          h('summary.dish-folder-summary', {}, [`${tag} (${folders[tag].length})`]),
          body,
        ]));
      });
    }
    paint();
  }

  function dishCardNode(dish, onChanged){
    const per100 = dish.cookedWeight>0 ? {
      kcal:Math.round(dish.kcal/dish.cookedWeight*100), protein:Math.round(dish.protein/dish.cookedWeight*100*10)/10,
      fat:Math.round(dish.fat/dish.cookedWeight*100*10)/10, carb:Math.round(dish.carb/dish.cookedWeight*100*10)/10,
    } : {kcal:0,protein:0,fat:0,carb:0};
    return C.DishCard({
      dish, favoriteLabel:DC().favoriteLabel(dish.favorite), per100, ratingCriteria:Rt().DISH_RATING_CRITERIA,
      onToggleFavorite(id){ DC().toggleFavorite(id); onChanged(); },
      onDelete(id){ DC().deleteDish(id); onChanged(); },
      onRate(id,key,val){ Rt().setDishRating(id,key,val); onChanged(); },
    }).el;
  }

  // ================= Конструктор блюд =================
  function buildConstructor(container){
    const card = C.Card();
    const chainsWrap = h('div.chain-column');
    card.el.appendChild(chainsWrap);
    const totalsRow = h('div.pill-row.mt-3');
    card.el.appendChild(totalsRow);

    const nameInput = h('input', {type:'text'});
    const tagSummary = h('span', {}, ['Выбери или создай тег…']);
    const tagBar = h('div.search-bar.tag-picker-bar', {}, [tagSummary]);
    tagBar.addEventListener('click', ()=>openTagPopover(tagBar, paintTagSummary));
    card.el.append(
      h('div.mt-3', {}, [C.Field('Название блюда', nameInput)]),
      C.Field('Теги', tagBar),
      C.Button({label:'Сохранить блюдо', block:true, onClick:()=>{
        const res = DC().saveDish(nameInput.value);
        if(!res.ok){ alert('Укажи название блюда'); return; }
        App.UI.toast('Блюдо сохранено');
        nameInput.value=''; paintTagSummary();
        paintChains();
      }}).el,
    );
    container.appendChild(card.el);

    let ingredientsOpen = false;
    const ingredientsWrap = h('div.hidden.mt-3');
    const ingredientsToggle = C.Button({label:'✎ Редактировать ингредиенты', variant:'secondary', block:true, onClick:()=>{
      ingredientsOpen = !ingredientsOpen;
      ingredientsToggle.update({label: ingredientsOpen?'Скрыть ингредиенты':'✎ Редактировать ингредиенты'});
      ingredientsWrap.classList.toggle('hidden', !ingredientsOpen);
      if(ingredientsOpen){ clear(ingredientsWrap); App.Screens.HealthSections.ingredients(ingredientsWrap); }
    }});
    container.append(ingredientsToggle.el, ingredientsWrap);

    function paintTagSummary(){
      clear(tagSummary);
      const sel = DC().getSelectedTags();
      tagSummary.appendChild(document.createTextNode(sel.length ? sel.join(', ') : 'Выбери или создай тег…'));
    }
    function paintTotals(){
      clear(totalsRow);
      const t = DC().calc();
      [['Сырой вес',Units().formatWeight(t.rawWeight)], ['Готовый',Units().formatWeight(t.cookedWeight)],
        ['Ккал',Math.round(t.kcal)], ['Б',Math.round(t.protein*10)/10+' г'], ['Ж',Math.round(t.fat*10)/10+' г'],
        ['У',Math.round(t.carb*10)/10+' г'], ['Клетч.',Math.round(t.fiber*10)/10+' г'], ['Цена',Math.round(t.priceAuto)+' руб']
      ].forEach(([k,v])=>totalsRow.appendChild(h('span',{},[k+': ',h('b',{},[String(v)])])));
    }
    function paintChains(){
      clear(chainsWrap);
      const cols = DC().getColumns();
      cols.forEach((col,ci)=>{
        if(ci>0) chainsWrap.appendChild(h('span.chain-arrow-down',{},['↓']));
        chainsWrap.appendChild(columnNode(col, ci, paintChains, paintTotals));
      });
      chainsWrap.appendChild(h('span.chain-arrow-down',{},['↓']));
      const addBtn = h('div.chain-add-node', {title:'Добавить способ готовки и ингредиент'}, ['+']);
      addBtn.addEventListener('click', ()=>{ DC().addColumnPair(); paintChains(); });
      chainsWrap.appendChild(addBtn);
      paintTotals();
    }
    paintChains();
  }

  function columnNode(col, ci, repaintChains, repaintTotals){
    if(col.type==='method'){
      const methods = App.Core.CookingMethods.COOKING_METHODS;
      const sel = C.Select({value:col.methodIndex, options:methods.map((m,mi)=>({value:mi,label:m.name})), onChange(v){ DC().setMethod(ci, v); repaintTotals(); }});
      return h('div.chain-node.method-node', {}, [sel]);
    }
    const ingredients = Ing().load();
    const stack = h('div.ing-stack');
    col.items.forEach((item,ii)=>{
      const ing = ingredients[item.ingredientIndex];
      const node = h('div.chain-node.ing-node', {}, [h('div.node-name',{},[ing?ing.name:'—']), h('div.node-sub',{},[Units().formatWeight(item.qty||0)])]);
      node.addEventListener('click', ()=>openIngredientPopover(node, ci, ii, repaintChains, repaintTotals));
      stack.appendChild(node);
      if(ii<col.items.length-1) stack.appendChild(h('div.stack-connector',{},['↓']));
    });
    const addBranch = h('div.stack-add', {}, ['+']);
    addBranch.addEventListener('click', ()=>{ DC().addBranchIngredient(ci); repaintChains(); });
    stack.appendChild(addBranch);
    return stack;
  }

  function openIngredientPopover(anchorEl, ci, ii, repaintChains, repaintTotals){
    const item = DC().getColumns()[ci].items[ii];
    const ingredients = Ing().load();
    const select = C.Select({value:item.ingredientIndex, options:ingredients.map((x,xi)=>({value:xi,label:x.name}))});
    select.classList.add('mb-2');
    const qtyInput = h('input.field-flush', {type:'number', value:item.qty});
    const infoLine = h('div.note.mt-2');
    function paintInfo(){
      const ing = ingredients[select.value|0];
      const cost = (parseFloat(qtyInput.value)||0)/100*Ing().pricePer100(ing);
      clear(infoLine); infoLine.appendChild(document.createTextNode(`${Units().formatWeight(parseFloat(qtyInput.value)||0)} · ${Math.round(cost)} руб`));
    }
    select.addEventListener('change', ()=>{ DC().setIngredient(ci, ii, select.value); paintInfo(); repaintChains(); });
    qtyInput.addEventListener('input', ()=>{ DC().setQty(ci, ii, qtyInput.value); paintInfo(); repaintChains(); });
    paintInfo();
    const removeBtn = C.Button({label:'✕ Удалить ингредиент', variant:'secondary', size:'small', block:true, onClick:()=>{
      App.UI.Popover.close(); DC().removeChainItem(ci, ii); repaintChains();
    }});
    App.UI.Popover.open(anchorEl, h('div', {}, [h('div.popover-title',{},['Ингредиент']), select, qtyInput, infoLine, removeBtn.el]));
  }

  function openTagPopover(anchorEl, onTagsChanged){
    const options = Tags().load();
    const chipsWrap = h('div.flex-wrap-gap-2');
    function paintChips(){
      clear(chipsWrap);
      const sel = DC().getSelectedTags();
      options.forEach(t=>{
        const chip = h('span.tag-chip'+(sel.includes(t)?'.active':''), {}, [t]);
        chip.addEventListener('click', ()=>{ DC().toggleTag(t); paintChips(); onTagsChanged(); });
        chipsWrap.appendChild(chip);
      });
    }
    paintChips();
    const newTagInput = h('input.grow-select', {type:'text', placeholder:'+ новый тег…'});
    const addBtn = C.Button({label:'Создать', variant:'secondary', size:'small', onClick:()=>{
      const val = newTagInput.value.trim(); if(!val) return;
      Tags().addCustom(val); DC().toggleTag(val); newTagInput.value='';
      paintChips(); onTagsChanged();
    }});
    App.UI.Popover.open(anchorEl, h('div', {}, [chipsWrap, h('div.flex-gap-2.mt-2', {}, [newTagInput, addBtn.el])]));
  }

  // ================= Единицы отображения (сверху экрана, над «Собрать день») =================
  function buildUnitSelector(container){
    const unitSelect = C.Select({
      value:Units().getDisplayUnit(),
      options:[{value:'g',label:'Граммы'}, {value:'normal',label:'Нормальные (тарелки/ложки)'}],
      onChange(v){ Units().setDisplayUnit(v); },
    });
    container.appendChild(C.Card({children:[C.Field('Единицы отображения', unitSelect)]}).el);
  }

  return build;
})();

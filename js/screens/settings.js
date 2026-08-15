/* =========================================================================
   SCREEN — SETTINGS (Настройки)
   Sections: Основное · Данные
   («Профили» убраны из настроек — полное управление профилями теперь на
   Тренировки → График. buildProfiles/profileCard оставлены неиспользуемыми
   на случай, если понадобятся снова.)
   ========================================================================= */
App.Screens = App.Screens || {};
App.Screens.Settings = (function(){
  const {h, clear} = App.Dom;
  const C = App.Components;
  const S = ()=>App.Core.Settings;
  const Sched = ()=>App.Core.Schedule;
  const Ex = ()=>App.Core.Exercises;
  const EI = ()=>App.Core.ExportImport;
  const Kb = ()=>App.Core.Kbju;
  const PP = ()=>App.Core.PasteParser;

  const ACTIVITY_OPTIONS = [
    {value:'1.2', label:'Минимальная'}, {value:'1.375', label:'Лёгкая'}, {value:'1.55', label:'Средняя'},
    {value:'1.725', label:'Высокая'}, {value:'1.9', label:'Очень высокая'},
  ];

  // ---------------- Основное ----------------
  function buildGeneral(container){
    const saved = Kb().getSaved();
    Kb().restoreManualCorrection(saved);

    const goalSelect = C.Select({value:S().getGoal(), options:S().GOAL_OPTIONS.map(g=>({value:g,label:S().goalLabel(g)})), onChange(v){ S().setGoal(v); recalc(); }});
    const adjustLabel = h('div.note.mb-2');
    const weightInput = h('input', {type:'number'}), heightInput = h('input', {type:'number'}), ageInput = h('input', {type:'number'});
    const activitySelect = C.Select({options:ACTIVITY_OPTIONS, onChange:recalc});
    const proteinInput = h('input', {type:'number', step:'0.1'}), fatPctInput = h('input', {type:'number'});
    const targetPreview = h('div.kbju-target-value', {}, ['—']);

    container.appendChild(C.Card({title:'Цель и расчёт питания', children:[
      h('div.field', {}, [goalSelect]),
      adjustLabel,
      h('div.flex-gap-2.mb-3', {}, [
        C.Button({label:'−100 ккал', variant:'secondary', size:'small', block:true, onClick:()=>{ Kb().adjustCorrection(-100); recalc(); }}).el,
        C.Button({label:'+100 ккал', variant:'secondary', size:'small', block:true, onClick:()=>{ Kb().adjustCorrection(100); recalc(); }}).el,
      ]),
      h('div.row', {}, [C.Field('Вес, кг', weightInput), C.Field('Рост, см', heightInput)]),
      h('div.row', {}, [C.Field('Возраст', ageInput), C.Field('Активность', activitySelect)]),
      h('div.row', {}, [C.Field('Белок, г/кг', proteinInput), C.Field('Жиры, % от нормы', fatPctInput)]),
      h('div.text-center.mt-3', {}, [targetPreview, h('div.note', {}, ['целевая норма — расчёт виден также на экране «Здоровье»'])]),
    ]}).el);

    function recalc(){
      const r = Kb().calc({
        height:heightInput.value, age:ageInput.value, activity:activitySelect.value||1.2,
        proteinPerKg:proteinInput.value, fatPct:fatPctInput.value, weight:weightInput.value,
      });
      clear(targetPreview); targetPreview.appendChild(document.createTextNode(Math.round(r.target)+' ккал'));
      const goal = S().getGoal(), base = Kb().goalBaseKcal(goal), total = base+Kb().getManualCorrection();
      const sign = v=>(v>=0?'+':'')+v;
      clear(adjustLabel);
      adjustLabel.append(`${S().goalLabel(goal)} (${sign(base)}) · коррекция ${sign(Kb().getManualCorrection())} · итог `, h('b.text-accent',{},[sign(total)]));
      if(weightInput.value==='' && r.weight) weightInput.value = r.weight;
    }
    [weightInput,heightInput,ageInput,proteinInput,fatPctInput].forEach(inp=>inp.addEventListener('input', recalc));
    if(saved){
      weightInput.value=saved.weight; heightInput.value=saved.height; ageInput.value=saved.age;
      activitySelect.value=saved.activity; proteinInput.value=saved.proteinPerKg; fatPctInput.value=saved.fatPct;
    }
    recalc();

    container.appendChild(C.Card({children:[
      h('div.section-label', {}, ['О приложении']),
      h('div.note', {}, ['Железо — тренировки и питание. Данные хранятся локально на устройстве.']),
    ]}).el);
  }

  // ---------------- Профили ----------------
  function buildProfiles(container){
    const rebuild = ()=>{ clear(container); buildProfiles(container); };
    const profiles = Sched().loadProfiles();
    const active = Sched().getActiveProfile();

    container.appendChild(C.Button({label:'+ Новый профиль', variant:'secondary', block:true, onClick:()=>{
      const name = prompt('Название профиля:'); if(!name) return; Sched().addProfile(name); rebuild();
    }}).el);

    profiles.forEach(p=>container.appendChild(profileCard(p, p.id===active.id, profiles.length>1, rebuild)));
  }

  function profileCard(p, isActive, canDelete, rebuild){
    const activateThenSet = (field, value)=>{
      if(Sched().getActiveProfile().id!==p.id) Sched().switchProfile(p.id);
      Sched().updateProfileSetting(field, value);
    };
    const presetSelect = C.Select({
      value:p.preset, options:[{value:'split',label:'Сплит (по дням)'}, {value:'classic',label:'Классический (день=группа)'}],
      onChange:v=>activateThenSet('preset', v),
    });
    const placeSelect = C.Select({
      value:p.place, options:[{value:'home',label:'Дом'}, {value:'outside',label:'Улица'}, {value:'both',label:'Любая'}],
      onChange:v=>activateThenSet('place', v),
    });
    const favSelect = C.Select({
      value:p.favoriteGroup, options:[{value:'',label:'Без предпочтения'}, ...Ex().MUSCLE_GROUPS.map(m=>({value:m,label:m}))],
      onChange:v=>activateThenSet('favoriteGroup', v),
    });
    const activateBtn = !isActive ? C.Button({label:'Сделать активным', variant:'secondary', size:'small', onClick:()=>{ Sched().switchProfile(p.id); rebuild(); }}) : null;
    const deleteBtn = canDelete ? C.Button({label:'Удалить', variant:'danger', size:'small', onClick:()=>{
      if(!confirm(`Удалить профиль «${p.name}»?`)) return;
      const res = Sched().deleteProfile(p.id);
      if(!res.ok) alert('Должен остаться хотя бы один профиль');
      rebuild();
    }}) : null;

    return C.Card({children:[
      h('div.justify-between', {}, [
        h('div.profile-name', {}, [p.name + (isActive?' (активный)':'')]),
        h('div.flex-gap-2', {}, [activateBtn?activateBtn.el:null, deleteBtn?deleteBtn.el:null]),
      ]),
      h('div.row.mt-3', {}, [C.Field('Формат', presetSelect), C.Field('Локация', placeSelect)]),
      C.Field('Любимая группа мышц', favSelect),
    ]}).el;
  }

  // ---------------- Данные ----------------
  function buildData(container){
    container.appendChild(C.Card({title:'Данные', children:[
      C.Button({label:'Экспортировать в JSON', block:true, onClick:exportData}).el,
      importButton(),
      h('div.note.mt-2', {}, ['Импорт заменяет журнал, блюда, ингредиенты, упражнения и КБЖУ данными из файла.']),
    ]}).el);
    buildPasteImport(container);
  }
  // Перенесено со «Здоровья → Дневник»: быстрый импорт тренировок вставкой текста.
  function buildPasteImport(container){
    const pasteArea = h('textarea.paste-textarea', {rows:4});
    const previewWrap = h('div.hidden.mt-3');
    let parsed = [];
    const importCard = C.Card({title:'Быстрый импорт'});
    importCard.el.append(
      h('div.note.mb-2', {}, ['Вставь текст вида «Отжимания 15 12 10 8» — по строке на упражнение, дата отдельной строкой (07.08).']),
      pasteArea,
      C.Button({label:'Распознать', variant:'secondary', block:true, onClick:()=>{
        parsed = PP().parsePaste(pasteArea.value);
        previewWrap.classList.remove('hidden');
        paintPreview();
      }}).el,
      previewWrap,
    );
    container.appendChild(importCard.el);

    function paintPreview(){
      clear(previewWrap);
      if(!parsed.length){ previewWrap.appendChild(App.UI.emptyState('Не удалось распознать ни одной строки.')); return; }
      parsed.forEach(p=>{
        const includeCb = h('input', {type:'checkbox', checked:p.include});
        includeCb.addEventListener('change', ()=>{ p.include = includeCb.checked; });
        const dateI = h('input', {type:'date', value:p.date});
        dateI.addEventListener('change', ()=>{ p.date = dateI.value; });
        const exSelect = C.Select({value:p.exercise, options:App.Core.Exercises.list().map(e=>e.name)});
        exSelect.classList.add('grow-select');
        exSelect.addEventListener('change', ()=>{ p.exercise = exSelect.value; });
        const setInputs = [0,1,2,3].map(si=>{
          const inp = h('input.set-num-input', {type:'number', value:p.sets[si]});
          inp.addEventListener('change', ()=>{ p.sets[si] = inp.value; });
          return inp;
        });
        previewWrap.appendChild(h('div.list-card', {}, [
          h('div.flex-wrap-gap-2.mb-2', {}, [includeCb, dateI, exSelect, !p.exercise?h('span.note.text-warn',{},['не распознано']):null]),
          h('div.row', {}, setInputs),
          h('div.note.mt-2', {}, [`строка: «${p.rawName}»`]),
        ]));
      });
      previewWrap.appendChild(C.Button({label:'Добавить в журнал', block:true, onClick:()=>{
        const res = PP().commit(parsed);
        if(!res.ok){ alert('Нечего добавлять — отметь строки и убедись, что упражнение и дата указаны'); return; }
        parsed = []; previewWrap.classList.add('hidden'); pasteArea.value=''; App.UI.toast(`Добавлено записей: ${res.count}`);
      }}).el);
    }
  }
  function importButton(){
    const fileInput = h('input.hidden', {type:'file', accept:'application/json'});
    fileInput.addEventListener('change', ()=>{
      const file = fileInput.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = e=>{
        try{
          EI().applyImportBundle(JSON.parse(e.target.result));
          App.UI.toast('Данные импортированы');
          App.Layout.Shell.refresh();
        } catch(err){ alert('Не удалось прочитать файл'); }
      };
      reader.readAsText(file);
    });
    return h('label.btn.secondary.block.file-label-btn', {}, ['Импортировать из JSON', fileInput]);
  }
  function exportData(){
    const data = EI().buildExportBundle();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'trening_data_'+new Date().toISOString().slice(0,10)+'.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return App.Screens.makeTabbedScreen({
    icon:'⚙️', label:'Настройки', title:'Настройки', subtitle:'Цель и данные приложения',
    onTitleClick(){ App.UI.toast(App.Core.EasterEgg.trigger()); },
    sections:[
      {key:'general', label:'Основное', build:buildGeneral},
      {key:'data', label:'Данные', build:buildData},
    ],
  });
})();

/* =========================================================================
   TRAINING SECTION — ГРАФИК
   Profile format/place/favorite-group settings + generated weekly plan.
   Полное управление профилями (создание, аватар, удаление) — здесь же.
   ========================================================================= */
App.Screens = App.Screens || {};
App.Screens.TrainingSections = App.Screens.TrainingSections || {};

App.Screens.TrainingSections.schedule = (function(){
  const {h, clear} = App.Dom;
  const C = App.Components;
  const Sched = ()=>App.Core.Schedule;
  const Ex = ()=>App.Core.Exercises;

  const AVATAR_CHOICES = ['💪','🏃','🥇','⚡','🔥','🦾','🐺','🚀'];

  function build(container){
    const p = Sched().getActiveProfile();
    const profiles = Sched().loadProfiles();
    const rebuild = ()=>{ clear(container); build(container); };

    container.appendChild(profileAvatarRow(profiles, p, rebuild));

    const presetSelect = C.Select({
      value:p.preset, options:[{value:'split',label:'Сплит (по дням)'}, {value:'classic',label:'Классический (день=группа)'}],
      onChange(v){ Sched().updateProfileSetting('preset', v); rebuild(); },
    });
    const placeSelect = C.Select({
      value:p.place, options:[{value:'home',label:'Дом'}, {value:'outside',label:'Улица'}, {value:'both',label:'Любая'}],
      onChange(v){ Sched().updateProfileSetting('place', v); rebuild(); },
    });
    const favSelect = C.Select({
      value:p.favoriteGroup, options:[{value:'',label:'Без предпочтения'}, ...Ex().MUSCLE_GROUPS.map(m=>({value:m,label:m}))],
      onChange(v){ Sched().updateProfileSetting('favoriteGroup', v); rebuild(); },
    });

    const settingsCard = C.Card();
    settingsCard.el.append(
      h('div.row', {}, [C.Field('Формат', presetSelect), C.Field('Локация', placeSelect)]),
      C.Field('Любимая группа мышц', favSelect),
      C.Button({label:'✎ Редактирование упражнений', variant:'secondary', block:true, onClick:openExercisesEditor}).el,
    );
    if(profiles.length>1){
      settingsCard.el.appendChild(C.Button({label:'Удалить этот профиль', variant:'danger', block:true, onClick:()=>{
        if(!confirm(`Удалить профиль «${p.name}»?`)) return;
        const res = Sched().deleteProfile(p.id);
        if(!res.ok) alert('Должен остаться хотя бы один профиль');
        rebuild();
      }}).el);
    }
    container.appendChild(settingsCard.el);

    const planWrap = h('div');
    container.appendChild(planWrap);
    renderPlan(planWrap);
  }

  function profileAvatarRow(profiles, active, rebuild){
    const row = h('div.avatar-row');
    profiles.forEach(p=>{
      const isActive = p.id===active.id;
      const circle = h('button.avatar-circle'+(isActive?'.active':''), {}, [p.avatar||'💪']);
      circle.addEventListener('click', ()=>{
        if(isActive) openAvatarPicker(circle, p, rebuild);
        else { Sched().switchProfile(p.id); rebuild(); }
      });
      row.append(h('div.avatar-item', {}, [circle, h('div.avatar-name', {}, [p.name])]));
    });
    const addCircle = h('button.avatar-circle.avatar-add', {}, ['+']);
    addCircle.addEventListener('click', ()=>{
      const name = prompt('Название профиля:'); if(!name) return;
      Sched().addProfile(name); rebuild();
    });
    row.append(h('div.avatar-item', {}, [addCircle, h('div.avatar-name', {}, ['Новый'])]));
    return row;
  }

  function openAvatarPicker(anchorEl, profile, rebuild){
    const wrap = h('div', {}, [h('div.popover-title', {}, ['Иконка профиля'])]);
    const grid = h('div.avatar-picker-grid');
    AVATAR_CHOICES.forEach(a=>{
      const opt = h('button.avatar-circle'+(a===profile.avatar?'.active':''), {}, [a]);
      opt.addEventListener('click', ()=>{ Sched().updateProfileSetting('avatar', a); App.UI.Popover.close(); rebuild(); });
      grid.appendChild(opt);
    });
    wrap.appendChild(grid);
    App.UI.Popover.open(anchorEl, wrap);
  }

  function openExercisesEditor(){
    const wrap = h('div');
    App.Screens.TrainingSections.exercises(wrap);
    C.Modal.open(wrap);
  }

  function renderPlan(planWrap){
    const p = Sched().getActiveProfile();
    clear(planWrap);
    planWrap.appendChild(C.Card({children:[C.Button({label:'Пересобрать всю неделю', block:true, onClick:()=>{
      p.preset==='classic' ? Sched().buildClassicWeek() : Sched().buildSplitWeek();
      renderPlan(planWrap);
    }}).el]}).el);

    if(p.preset==='classic') renderClassicWeek(planWrap, p);
    else renderSplitWeek(planWrap, p);
  }

  function renderClassicWeek(planWrap, p){
    if(!Sched().getClassicPlan().length || !Sched().getClassicPlan().some(c=>c.picks.length)) Sched().loadPlanFromProfile(p);
    Sched().getClassicPlan().forEach((cp,i)=>{
      if(!cp.dayInfo.muscleGroup){
        planWrap.appendChild(C.WorkoutCard({dayLabel:cp.dayInfo.day, tagEl:h('span.tag.rest',{},['Отдых'])}).el);
        return;
      }
      const body = cp.picks.length ? cp.picks.map(pk=>h('div.mt-2', {}, [
        h('div.note', {}, [pk.ex.muscleGroup]), h('div', {}, [pk.ex.name]),
        h('div.note', {}, [`${pk.ex.sets}×${pk.ex.min}-${pk.ex.max} ${pk.ex.unit}`]),
      ])) : [App.UI.emptyState('Нет упражнений с этой группой мышц и локацией')];
      const rerollBtn = C.Button({label:'🔄 Пересобрать день', variant:'secondary', size:'small', onClick:()=>{ Sched().rerollClassicDay(i); renderPlan(planWrap); }});
      planWrap.appendChild(C.WorkoutCard({dayLabel:cp.dayInfo.day, tagEl:h('span.tag.both',{},[cp.dayInfo.muscleGroup]), bodyChildren:body, footerEl:rerollBtn.el}).el);
    });
  }

  function renderSplitWeek(planWrap, p){
    if(!Sched().getSplitPlan().length || !Sched().getSplitPlan().some(c=>c.picks.length)) Sched().loadPlanFromProfile(p);
    Sched().getSplitPlan().forEach((sp,i)=>{
      if(!sp.dayInfo.pairs && !sp.dayInfo.solo){
        planWrap.appendChild(C.WorkoutCard({dayLabel:sp.dayInfo.day, tagEl:h('span.tag.rest',{},['Отдых'])}).el);
        return;
      }
      const [placeLabel, placeCls] = Ex().WHERE_LABEL[sp.dayInfo.place] || ['Любое','both'];
      const body = sp.rounds.length ? sp.rounds.map(r=>h('div.mt-2', {}, [
        h('div.note', {}, [r.label]),
        h('div', {}, [r.exList.map(ex=>`${ex.name} (${ex.sets}×${ex.min}-${ex.max} ${ex.unit})`).join(' ↔ ')]),
      ])) : [App.UI.emptyState('Нет подходящих упражнений в справочнике')];
      const rerollBtn = C.Button({label:'🔄 Пересобрать день', variant:'secondary', size:'small', onClick:()=>{ Sched().rerollSplitDay(i); renderPlan(planWrap); }});
      planWrap.appendChild(C.WorkoutCard({dayLabel:sp.dayInfo.day, tagEl:h('span.tag.'+placeCls,{},[placeLabel]), bodyChildren:body, footerEl:rerollBtn.el}).el);
    });
  }

  return build;
})();

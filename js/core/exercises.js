/* =========================================================================
   CORE — EXERCISES
   Business logic only. Every exported function takes/returns plain data;
   nothing here reads or writes the DOM. Screens call these and re-render.
   ========================================================================= */
App.Core = App.Core || {};
App.Core.Exercises = (function(){
  const S = App.State;

  const DEFAULT_EXERCISES = [
    {name:"Отжимания классические", sets:3, min:15, max:20, unit:"повторений", where:"both", muscleGroup:"Грудь",
     muscles:{primary:[{name:"Большая грудная мышца", load:1.0},{name:"Трицепс", load:0.7}],
              secondary:[{name:"Передние дельты", load:0.5},{name:"Прямая мышца живота", load:0.3}]},
     tech:"Локти ~45° к корпусу, грудь почти касается пола, руки полностью выпрямляются вверху."},
    {name:"Отжимания широким хватом", sets:3, min:15, max:20, unit:"повторений", where:"both", muscleGroup:"Грудь",
     muscles:{primary:[{name:"Большая грудная мышца", load:1.0}],
              secondary:[{name:"Передние дельты", load:0.4},{name:"Трицепс", load:0.4}]},
     tech:"Руки заметно шире плеч, акцент на растяжение и сведение груди."},
    {name:"Отжимания с ногами на скамье", sets:3, min:12, max:15, unit:"повторений", where:"outside", muscleGroup:"Грудь",
     muscles:{primary:[{name:"Верх большой грудной мышцы", load:1.0},{name:"Передние дельты", load:0.7}],
              secondary:[{name:"Трицепс", load:0.5}]},
     tech:"Ноги на скамье, руки на полу. Тело прямая линия, акцент на верх груди/плечи."},
    {name:"Обратные отжимания (скамья/стул)", sets:3, min:12, max:15, unit:"повторений", where:"both", muscleGroup:"Руки",
     muscles:{primary:[{name:"Трицепс", load:1.0}],
              secondary:[{name:"Большая грудная мышца", load:0.4},{name:"Передние дельты", load:0.3}]},
     tech:"Локти строго назад, плечи не тянутся к ушам, полная амплитуда вниз до угла ~90°."},
    {name:"Отжимания на брусьях", sets:3, min:8, max:10, unit:"повторений", where:"outside", muscleGroup:"Грудь",
     muscles:{primary:[{name:"Большая грудная мышца", load:0.9},{name:"Трицепс", load:0.8}],
              secondary:[{name:"Передние дельты", load:0.4}]},
     tech:"Корпус слегка наклонён вперёд (акцент на грудь), локти уходят назад."},
    {name:"Тяга гантели в наклоне", sets:3, min:12, max:15, unit:"повторений на руку", where:"home", muscleGroup:"Спина",
     muscles:{primary:[{name:"Широчайшие мышцы спины", load:1.0},{name:"Ромбовидные мышцы", load:0.7}],
              secondary:[{name:"Бицепс", load:0.5},{name:"Задние дельты", load:0.4}]},
     tech:"Наклон корпуса ~45°, спина прямая. Тянуть гантель к поясу, сводя лопатку в верхней точке."},
    {name:"Жим гантели над головой", sets:3, min:10, max:12, unit:"повторений", where:"home", muscleGroup:"Плечи",
     muscles:{primary:[{name:"Передние дельты", load:1.0},{name:"Средние дельты", load:0.7}],
              secondary:[{name:"Трицепс", load:0.5},{name:"Верх трапеции", load:0.3}]},
     tech:"Локоть под кистью, жать строго вверх, не прогибаться в пояснице."},
    {name:"Подтягивания", sets:4, min:8, max:10, unit:"повторений", where:"outside", muscleGroup:"Спина",
     muscles:{primary:[{name:"Широчайшие мышцы спины", load:1.0}],
              secondary:[{name:"Бицепс", load:0.6},{name:"Ромбовидные мышцы", load:0.4},{name:"Задние дельты", load:0.3}]},
     tech:"Без раскачивания корпусом, руки полностью выпрямляются внизу."},
    {name:"Инверсионная тяга", sets:4, min:12, max:15, unit:"повторений", where:"outside", muscleGroup:"Спина",
     muscles:{primary:[{name:"Широчайшие мышцы спины", load:0.9},{name:"Ромбовидные мышцы", load:0.7}],
              secondary:[{name:"Бицепс", load:0.4},{name:"Задние дельты", load:0.4}]},
     tech:"⚠ требует замены — нет подходящей низкой перекладины. Сводить лопатки в конце движения."},
    {name:"Планка", sets:3, min:90, max:120, unit:"секунд", where:"both", muscleGroup:"Кор",
     muscles:{primary:[{name:"Поперечная мышца живота", load:0.9},{name:"Прямая мышца живота", load:0.8}],
              secondary:[{name:"Ягодичные мышцы", load:0.3},{name:"Передние дельты", load:0.2}]},
     tech:"Тело прямая линия от головы до пяток, таз не провисает и не задирается."},
    {name:"Пресс (подъём на 90°)", sets:3, min:20, max:25, unit:"повторений", where:"both", muscleGroup:"Кор",
     muscles:{primary:[{name:"Прямая мышца живота (низ)", load:1.0}],
              secondary:[{name:"Сгибатели бедра", load:0.4}]},
     tech:"Поясница прижата к полу, подъём за счёт живота, без рывков руками."},
    {name:"Скручивания пресса", sets:3, min:25, max:30, unit:"повторений", where:"both", muscleGroup:"Кор",
     muscles:{primary:[{name:"Прямая мышца живота (верх)", load:1.0}],
              secondary:[{name:"Косые мышцы живота", load:0.3}]},
     tech:"Короткая амплитуда, работа именно от живота."},
    {name:"Приседания", sets:3, min:20, max:25, unit:"повторений", where:"both", muscleGroup:"Ноги",
     muscles:{primary:[{name:"Квадрицепс", load:1.0},{name:"Ягодичные мышцы", load:0.7}],
              secondary:[{name:"Бицепс бедра", load:0.3},{name:"Разгибатели спины", load:0.2}]},
     tech:"Пятки не отрываются от пола, колени не проваливаются внутрь."},
    {name:"Выпады назад", sets:3, min:12, max:15, unit:"повторений на ногу", where:"both", muscleGroup:"Ноги",
     muscles:{primary:[{name:"Квадрицепс", load:0.9},{name:"Ягодичные мышцы", load:0.8}],
              secondary:[{name:"Бицепс бедра", load:0.4}]},
     tech:"Колено передней ноги под ~90°, корпус вертикально."},
    {name:"Ягодичный мостик", sets:3, min:20, max:25, unit:"повторений", where:"both", muscleGroup:"Ноги",
     muscles:{primary:[{name:"Ягодичные мышцы", load:1.0}],
              secondary:[{name:"Бицепс бедра", load:0.5},{name:"Разгибатели спины", load:0.2}]},
     tech:"Сжимать ягодицы в верхней точке, не прогибаться в пояснице."},
    {name:"Подъёмы на носки", sets:3, min:20, max:25, unit:"повторений", where:"both", muscleGroup:"Ноги",
     muscles:{primary:[{name:"Икроножные мышцы", load:1.0}],
              secondary:[{name:"Камбаловидная мышца", load:0.7}]},
     tech:"Полная амплитуда, медленный контролируемый спуск ниже уровня стопы."},
    {name:"Болгарские сплит-приседания", sets:3, min:10, max:12, unit:"повторений на ногу", where:"both", muscleGroup:"Ноги",
     muscles:{primary:[{name:"Квадрицепс", load:0.9},{name:"Ягодичные мышцы", load:0.8}],
              secondary:[{name:"Бицепс бедра", load:0.3}]},
     tech:"Задняя нога на возвышении, колено передней ноги не выходит за носок."},
    {name:"Бег (равномерный темп)", sets:1, min:25, max:30, unit:"минут", where:"outside", muscleGroup:"Кардио",
     muscles:{primary:[{name:"Сердечно-сосудистая система", load:1.0},{name:"Квадрицепс", load:0.6}],
              secondary:[{name:"Икроножные мышцы", load:0.6},{name:"Ягодичные мышцы", load:0.5}]},
     tech:"Цель сейчас — 30 мин непрерывно. Через 2-3 мес — 5 км за 28-30 мин."},
    {name:"Интервалы (спринт/отдых)", sets:1, min:8, max:10, unit:"интервалов", where:"outside", muscleGroup:"Кардио",
     muscles:{primary:[{name:"Сердечно-сосудистая система", load:1.0},{name:"Квадрицепс", load:0.7}],
              secondary:[{name:"Икроножные мышцы", load:0.5},{name:"Ягодичные мышцы", load:0.4}]},
     tech:"Сокращать отдых между спринтами по мере роста формы."},
  ];

  const MUSCLE_GROUPS = ["Грудь","Спина","Плечи","Руки","Ноги","Кор","Кардио"];
  const EMPTY_MUSCLES = ()=>({primary:[], secondary:[]});
  const WHERE_LABEL = {home:["Дом","home"], outside:["Улица","outside"], both:["Дом / Улица","both"]};

  // Reference "classic split" table shown on the reference/schedule screen —
  // purely descriptive default program, unrelated to the generated plans.
  const SCHEDULE = [
    {day:"Понедельник", place:"home", circles:[
      {label:"Круг 1", ex:"Отжимания классические ↔ Тяга гантели в наклоне", sets:"3-4×15-20 / 3-4×12-15", muscles:"Грудь vs спина"},
      {label:"Круг 2", ex:"Жим гантели над головой ↔ Тяга гантели в наклоне", sets:"3×10-12 / 3×12-15", muscles:"Плечи vs спина"},
      {label:"—", ex:"Планка", sets:"3×40-60 сек", muscles:"Кор"},
    ]},
    {day:"Вторник", place:"home", circles:[
      {label:"Круг 1", ex:"Приседания ↔ Ягодичный мостик", sets:"3-4×20-25 / 3-4×20-25", muscles:"Квадрицепс vs ягодицы"},
      {label:"Круг 2", ex:"Выпады назад ↔ Подъёмы на носки", sets:"3×12-15 на ногу / 3×20-25", muscles:"Ноги vs икры"},
      {label:"—", ex:"Пресс / скручивания", sets:"3×20-25", muscles:"Живот"},
    ]},
    {day:"Среда", place:"rest", circles:[{label:"—", ex:"Отдых", sets:"-", muscles:"Восстановление"}]},
    {day:"Четверг", place:"outside", circles:[
      {label:"Круг 1", ex:"Подтягивания ↔ Отжимания на брусьях", sets:"4×8-10 / 3×8-10", muscles:"Спина vs грудь/трицепс"},
      {label:"Круг 2", ex:"Инверсионная тяга (замена) ↔ Отжимания с ногами на скамье", sets:"4×12-15 / 3×12-15", muscles:"Спина vs плечи/грудь"},
      {label:"—", ex:"Планка", sets:"3×40-60 сек", muscles:"Кор"},
    ]},
    {day:"Пятница", place:"outside", circles:[
      {label:"Круг 1", ex:"Болгарские сплит-приседания ↔ Ягодичный мостик", sets:"3×10-12 на ногу / 3-4×20-25", muscles:"Квадрицепс vs ягодицы"},
      {label:"Круг 2", ex:"Приседания ↔ Подъёмы на носки", sets:"3×20-25 / 3×20-25", muscles:"Квадрицепс vs икры"},
      {label:"—", ex:"Пресс", sets:"3×20-25", muscles:"Живот"},
    ]},
    {day:"Суббота", place:"outside", circles:[
      {label:"—", ex:"Бег или интервалы", sets:"25-30 мин / 8-10 интервалов", muscles:"Ноги, сердце"},
      {label:"—", ex:"Планка (легко)", sets:"2-3×40-60 сек", muscles:"Кор"},
    ]},
    {day:"Воскресенье", place:"rest", circles:[{label:"—", ex:"Отдых", sets:"-", muscles:"Восстановление"}]},
  ];

  let CUSTOM_MUSCLE_GROUPS = S.get('customMuscleGroups');
  function allMuscleGroups(){ return MUSCLE_GROUPS.concat(CUSTOM_MUSCLE_GROUPS); }
  function addCustomMuscleGroup(name){
    name = (name||'').trim();
    if(!name) return {ok:false, error:'empty'};
    if(allMuscleGroups().some(g=>g.toLowerCase()===name.toLowerCase())) return {ok:false, error:'exists'};
    CUSTOM_MUSCLE_GROUPS.push(name);
    S.set('customMuscleGroups', CUSTOM_MUSCLE_GROUPS);
    return {ok:true};
  }

  function loadExercises(){
    const saved = S.get('exercises');
    if(saved){
      return saved.map(e=>({finalGoal:e.sets*e.max, liked:"none", muscles:EMPTY_MUSCLES(), secondaryMuscles:[], ...e}));
    }
    const seeded = DEFAULT_EXERCISES.map(e=>({...e, finalGoal:e.sets*e.max, liked:"none",
      muscles:e.muscles||EMPTY_MUSCLES(), secondaryMuscles:e.secondaryMuscles||[]}));
    S.set('exercises', seeded);
    return seeded;
  }

  let EXERCISES = loadExercises();
  function list(){ return EXERCISES; }
  function persist(){ S.set('exercises', EXERCISES); }

  function updateField(index, field, value){
    const num = parseInt(value);
    if(isNaN(num) || num<=0) return false;
    EXERCISES[index][field] = num;
    persist();
    return true;
  }
  function updateWhere(index, value){ EXERCISES[index].where = value; persist(); }
  function toggleLike(index){
    const order = {none:'liked', liked:'disliked', disliked:'none'};
    EXERCISES[index].liked = order[EXERCISES[index].liked||'none'];
    persist();
    return EXERCISES[index].liked;
  }
  function likeLabel(liked){
    if(liked==='liked') return '★ Нравится';
    if(liked==='disliked') return '👎 Не нравится';
    return '☆ Отметить';
  }
  function remove(index){ EXERCISES.splice(index,1); persist(); }

  function add({name, sets, min, max, finalGoal, unit, where, muscleGroup, secondaryMuscles, tech}){
    sets = parseInt(sets)||3; min = parseInt(min)||10; max = parseInt(max)||15;
    finalGoal = parseInt(finalGoal) || (sets*max);
    secondaryMuscles = (secondaryMuscles||[]).filter(v=>v!==muscleGroup);
    const muscles = {primary:[{name:muscleGroup, load:1}], secondary:[]};
    EXERCISES.push({name:(name||'').trim(), sets, min, max, finalGoal, unit, where, muscleGroup, secondaryMuscles, muscles, liked:'none', tech:(tech||'').trim()});
    persist();
  }

  function targetVolume(e){ return e.sets*e.max; }
  function targetLabel(e){
    const suffix = e.unit.includes('на ногу') ? '(на ногу)' : e.unit.includes('на руку') ? '(на руку)' : e.unit;
    return `${e.sets}×${e.min}-${e.max} ${suffix}`;
  }
  function findByName(name){ return EXERCISES.find(e=>e.name===name); }

  return {
    MUSCLE_GROUPS, WHERE_LABEL, SCHEDULE,
    allMuscleGroups, addCustomMuscleGroup,
    list, updateField, updateWhere, toggleLike, likeLabel, remove, add,
    targetVolume, targetLabel, findByName,
    reload(){ EXERCISES = loadExercises(); return EXERCISES; },
    replaceAll(arr){ EXERCISES = arr; persist(); },
  };
})();

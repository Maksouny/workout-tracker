/* =========================================================================
   HEALTH SECTION — ИНГРЕДИЕНТЫ
   ========================================================================= */
App.Screens = App.Screens || {};
App.Screens.HealthSections = App.Screens.HealthSections || {};

App.Screens.HealthSections.ingredients = (function(){
  const {h, clear} = App.Dom;
  const C = App.Components;
  const Ing = ()=>App.Core.Ingredients;

  function build(container){
    let search = '';
    const searchInput = h('input', {type:'text', placeholder:'Поиск ингредиента…'});
    container.appendChild(h('div.search-bar', {}, [searchInput]));

    const tableBody = h('tbody');
    container.appendChild(h('div.card.table-scroll', {}, [h('table.data-table', {}, [
      h('thead', {}, [h('tr', {}, ['Название','Ккал','Б','Ж','У','Клетч.','Цена',''].map(t=>h('th',{},[t])))]),
      tableBody,
    ])]));
    searchInput.addEventListener('input', ()=>{ search = searchInput.value; paintRows(); });

    function paintRows(){
      clear(tableBody);
      const q = search.trim().toLowerCase();
      const filtered = Ing().load().map((ing,i)=>({ing,i})).filter(({ing})=>!q || ing.name.toLowerCase().includes(q));
      if(!filtered.length){ tableBody.appendChild(h('tr',{},[h('td.note',{colspan:8},['Ничего не найдено'])])); return; }
      filtered.forEach(({ing,i})=>{
        const delBtn = C.IconDelete(()=>{ Ing().remove(i); paintRows(); });
        tableBody.appendChild(h('tr', {}, [
          h('td', {}, [h('b',{},[ing.name])]), h('td.mono',{},[String(ing.kcal)]), h('td.mono',{},[String(ing.protein)]),
          h('td.mono',{},[String(ing.fat)]), h('td.mono',{},[String(ing.carb)]), h('td.mono',{},[String(ing.fiber||0)]),
          h('td.mono',{},[String(ing.price||0)]), h('td',{},[delBtn]),
        ]));
      });
    }
    paintRows();

    const nameI=h('input',{type:'text'}), kcalI=h('input',{type:'number'}), protI=h('input',{type:'number'}), fatI=h('input',{type:'number'}),
      carbI=h('input',{type:'number'}), fiberI=h('input',{type:'number'}), priceI=h('input',{type:'number'});
    container.appendChild(C.Card({children:[
      C.Field('Название', nameI),
      h('div.row', {}, [C.Field('Ккал/100г', kcalI), C.Field('Белки', protI)]),
      h('div.row', {}, [C.Field('Жиры', fatI), C.Field('Углеводы', carbI)]),
      h('div.row', {}, [C.Field('Клетчатка', fiberI), C.Field('Цена/100г', priceI)]),
      C.Button({label:'Добавить ингредиент', block:true, onClick:()=>{
        if(!nameI.value.trim()){ alert('Укажи название ингредиента'); return; }
        Ing().add({name:nameI.value, kcal:kcalI.value, protein:protI.value, fat:fatI.value, carb:carbI.value, fiber:fiberI.value, price:priceI.value});
        [nameI,kcalI,protI,fatI,carbI,fiberI,priceI].forEach(i=>i.value='');
        paintRows();
      }}).el,
    ]}).el);
  }

  return build;
})();

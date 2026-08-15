/* =========================================================================
   COMPONENTS — CALENDAR (activity heatmap)
   ========================================================================= */
(function(){
  const {h, clear} = App.Dom;
  const WEEKDAY_NAMES = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  function pad2(n){ return String(n).padStart(2,'0'); }

  // Единый «новый» стиль ячейки календаря — маленькая точка вместо SVG-кольца
  // (как в компактном недельном календаре), чтобы вид не откатывался к старому
  // варианту с большими кружками при переключении недели/месяца/года.
  function cell(dayLabel, value, ringPct, isToday, isPad){
    if(isPad) return h('div.cal-cell.pad');
    const clamped = Math.max(0, Math.min(1, ringPct||0));
    const dot = h('div.cal-dot', {style:{opacity: value>0 ? (0.35+clamped*0.65) : 0.15}});
    return h('div.cal-cell'+(isToday?'.today':''), {title:`${value}`}, [dot, h('div.cal-daynum', {}, [String(dayLabel)])]);
  }

  /**
   * App.Components.Calendar({period, getValue, isProgressType, navOffset, onNavigate, onReset})
   * getValue(dateStr) -> number (raw value used both for the ring fill and tooltip)
   */
  App.Components.Calendar = function({period, getValue, isProgressType, navOffset, onNavigate, onReset}){
    const body = h('div');
    const navLabel = h('div.cal-nav-label');
    const todayLink = h('span.cal-nav-today', {dataset:{action:'cal-today'}}, ['Сегодня']);
    const nav = h('div.cal-nav', {}, [
      h('button.cal-nav-btn', {dataset:{action:'cal-prev'}}, ['‹']),
      navLabel,
      h('button.cal-nav-btn', {dataset:{action:'cal-next'}}, ['›']),
    ]);
    const el = h('div', {}, [nav, body]);
    App.Dom.delegate(el, 'click', {
      'cal-prev'(){ onNavigate && onNavigate(-1); },
      'cal-next'(){ onNavigate && onNavigate(1); },
      'cal-today'(){ onReset && onReset(); },
    });

    function render(state){
      const {period:p, navOffset:off} = state;
      const now = new Date();
      const today = now.toISOString().slice(0,10);
      clear(body);
      if(off!==0){ if(!nav.contains(todayLink)) nav.appendChild(todayLink); } else if(nav.contains(todayLink)) nav.removeChild(todayLink);

      if(p==='week'){
        const dow = (now.getDay()+6)%7;
        const monday = new Date(now); monday.setDate(now.getDate()-dow+off*7);
        const days = []; for(let i=0;i<7;i++){ const d=new Date(monday); d.setDate(monday.getDate()+i); days.push(d); }
        const dateStrs = days.map(d=>d.toISOString().slice(0,10));
        const values = dateStrs.map(getValue);
        const localMax = Math.max(1, ...values);
        navLabel.textContent = `${pad2(days[0].getDate())}.${pad2(days[0].getMonth()+1)} – ${pad2(days[6].getDate())}.${pad2(days[6].getMonth()+1)}.${days[6].getFullYear()}`;
        const grid = h('div.cal-grid', {}, [
          ...WEEKDAY_NAMES.map(w=>h('div.cal-weekday',{},[w])),
          ...days.map((d,i)=>cell(d.getDate(), values[i], isProgressType?values[i]/100:values[i]/localMax, dateStrs[i]===today)),
        ]);
        body.appendChild(grid);
      } else if(p==='month'){
        const base = new Date(now.getFullYear(), now.getMonth()+off, 1);
        const y=base.getFullYear(), m=base.getMonth();
        const daysInMonth = new Date(y,m+1,0).getDate();
        const leadPad = (new Date(y,m,1).getDay()+6)%7;
        const dateStrs = []; for(let d=1; d<=daysInMonth; d++) dateStrs.push(`${y}-${pad2(m+1)}-${pad2(d)}`);
        const values = dateStrs.map(getValue);
        const localMax = Math.max(1, ...values);
        const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
        navLabel.textContent = `${monthNames[m]} ${y}`;
        const cells = [];
        for(let i=0;i<leadPad;i++) cells.push(cell(0,0,0,false,true));
        dateStrs.forEach((ds,i)=>cells.push(cell(i+1, values[i], isProgressType?values[i]/100:values[i]/localMax, ds===today)));
        body.appendChild(h('div.cal-grid.month-grid', {}, [...WEEKDAY_NAMES.map(w=>h('div.cal-weekday',{},[w])), ...cells]));
      } else {
        const y = now.getFullYear() + off;
        const monthNames = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
        const values = [];
        for(let mo=0; mo<12; mo++){
          const daysInM = new Date(y,mo+1,0).getDate();
          let sum=0, pctSum=0, pctCnt=0;
          for(let d=1; d<=daysInM; d++){
            const ds = `${y}-${pad2(mo+1)}-${pad2(d)}`;
            const v = getValue(ds);
            if(v>0){ if(isProgressType){ pctSum+=v; pctCnt++; } else sum+=v; }
          }
          values.push(isProgressType ? (pctCnt?Math.round(pctSum/pctCnt):0) : sum);
        }
        const localMax = Math.max(1, ...values);
        const curMonth = now.getMonth();
        navLabel.textContent = String(y);
        const cells = values.map((val,i)=>cell(monthNames[i], val, isProgressType?val/100:val/localMax, i===curMonth && off===0));
        body.appendChild(h('div.cal-grid.year-grid', {}, cells));
      }
    }

    render({period, navOffset});
    return {el, render};
  };
})();

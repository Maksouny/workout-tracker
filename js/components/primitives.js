/* =========================================================================
   COMPONENTS — PRIMITIVES
   Each factory returns { el, update(props), destroy() }. No component
   listens on document/global scope — only on its own el (or delegates
   from a screen root), so screens never need inline on* attributes.
   ========================================================================= */
App.Components = App.Components || {};
(function(){
  const {h, text, clear, replaceChildren} = App.Dom;
  const esc = s=>String(s==null?'':s);

  // ---------------- Field (label + input wrapper) ----------------
  App.Components.Field = function(labelText, inputEl){
    return h('div.field', {}, [h('label', {}, [labelText]), inputEl]);
  };

  // ---------------- Select (options -> <select> with change callback) ----------------
  App.Components.Select = function({options, value, onChange}){
    const sel = h('select', {}, options.map(o=>{
      const optValue = typeof o==='string' ? o : o.value;
      const optLabel = typeof o==='string' ? o : o.label;
      return h('option', {value:optValue, selected:optValue===value}, [optLabel]);
    }));
    if(onChange) sel.addEventListener('change', ()=>onChange(sel.value));
    return sel;
  };

  // ---------------- IconDelete (small "✕" action, e.g. remove a row) ----------------
  App.Components.IconDelete = function(onClick){
    const el = h('span.icon-delete', {}, ['✕']);
    el.addEventListener('click', onClick);
    return el;
  };

  /**
   * App.Components.CompactWeekCalendar({getValue, onOpen})
   * A single-row, tap-to-expand version of the week view — used above
   * today's plan on Training → Сегодня. Tapping it opens the full
   * calendar (with month/year navigation) via onOpen().
   */
  App.Components.CompactWeekCalendar = function({getValue, onOpen}){
    const WEEKDAY_NAMES = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    const now = new Date();
    const dow = (now.getDay()+6)%7;
    const monday = new Date(now); monday.setDate(now.getDate()-dow);
    const today = now.toISOString().slice(0,10);
    const days = []; for(let i=0;i<7;i++){ const d=new Date(monday); d.setDate(monday.getDate()+i); days.push(d); }
    const dateStrs = days.map(d=>d.toISOString().slice(0,10));
    const values = dateStrs.map(getValue);
    const localMax = Math.max(1, ...values);

    const cells = days.map((d,i)=>{
      const isToday = dateStrs[i]===today;
      const pct = Math.min(1, values[i]/localMax);
      return h('div.compact-cal-cell'+(isToday?'.today':''), {}, [
        h('div.compact-cal-dot', {style:{opacity: values[i]>0 ? (0.35+pct*0.65) : 0.15}}),
        h('div.compact-cal-wd', {}, [WEEKDAY_NAMES[i]]),
      ]);
    });
    const el = h('div.compact-calendar', {}, cells);
    el.addEventListener('click', ()=>onOpen && onOpen());
    return {el};
  };

  // ---------------- Card ----------------
  App.Components.Card = function({title, subtitle, tight=false, actionEl, children}={}){
    const head = title!=null ? h('div.card-head', {}, [
      h('div', {}, [
        h('div.card-title-text', {}, [title]),
        subtitle!=null ? h('div', {class:'note'}, [subtitle]) : null,
      ]),
      actionEl||null,
    ]) : null;
    const el = h('div.card'+(tight?'.tight':''), {}, [head, ...(children||[])]);
    function update(newChildren){ replaceChildren(el, newChildren); }
    return {el, update};
  };

  // ---------------- Roller (колесо/роллер выбора значения — Здоровье → Дневник → Показатели дня) ----------------
  App.Components.Roller = function({min, max, step=1, value, itemHeight=30, visibleCount=3, onChange}){
    const values = [];
    for(let v=min; v<=max+step/2; v+=step) values.push(Math.round(v*1000)/1000);
    const track = h('div.roller-track', {style:{paddingTop:(itemHeight*Math.floor(visibleCount/2))+'px', paddingBottom:(itemHeight*Math.floor(visibleCount/2))+'px'}});
    values.forEach(v=>track.appendChild(h('div.roller-item', {style:{height:itemHeight+'px'}}, [String(v)])));
    const viewport = h('div.roller-viewport', {style:{height:(itemHeight*visibleCount)+'px'}}, [track]);
    const el = h('div.roller', {}, [viewport, h('div.roller-center-band', {style:{height:itemHeight+'px', top:(itemHeight*Math.floor(visibleCount/2))+'px'}})]);

    let current = Math.max(min, Math.min(max, value));
    function indexOf(v){ return Math.round((v-min)/step); }
    function highlight(){
      const idx = Math.max(0, Math.min(values.length-1, Math.round(viewport.scrollTop/itemHeight)));
      Array.from(track.children).forEach((c,i)=>c.classList.toggle('active', i===idx));
    }
    function scrollToValue(v, smooth){
      const idx = Math.max(0, Math.min(values.length-1, indexOf(v)));
      viewport.scrollTo({top: idx*itemHeight, behavior: smooth?'smooth':'auto'});
    }
    let scrollTimer = null;
    viewport.addEventListener('scroll', ()=>{
      highlight();
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(()=>{
        const idx = Math.max(0, Math.min(values.length-1, Math.round(viewport.scrollTop/itemHeight)));
        const v = values[idx];
        if(v!==current){ current = v; if(onChange) onChange(v); }
      }, 120);
    });
    setTimeout(()=>{ scrollToValue(current, false); highlight(); }, 0);

    function setValue(v){ current = Math.max(min, Math.min(max, v)); scrollToValue(current, true); }
    function getValue(){ return current; }
    return {el, getValue, setValue};
  };

  // ---------------- Button ----------------
  App.Components.Button = function({label, variant='primary', size='', onClick, action, dataset={}, block=false, disabled=false}={}){
    const cls = ['btn', variant==='secondary'?'secondary':variant==='ghost'?'ghost':variant==='danger'?'danger':'',
      size==='small'?'small':'', block?'block':''].filter(Boolean).join(' ');
    const el = h('button', {class:cls, disabled, dataset: action?{action, ...dataset}:dataset, onClick: onClick||null}, [label]);
    function update({label:newLabel, disabled:newDisabled}={}){
      if(newLabel!=null){ clear(el); el.appendChild(text(newLabel)); }
      if(newDisabled!=null) el.disabled = newDisabled;
    }
    return {el, update};
  };

  // ---------------- ProgressRing ----------------
  App.Components.ProgressRing = function({size=100, radius=40, stroke=8, pct=0, color='var(--accent)', label='', sub=''}={}){
    const circ = 2*Math.PI*radius;
    const svgNS = 'http://www.w3.org/2000/svg';
    function makeCircle(strokeColor){
      const c = document.createElementNS(svgNS,'circle');
      c.setAttribute('cx', size/2); c.setAttribute('cy', size/2); c.setAttribute('r', radius);
      c.setAttribute('fill','none'); c.setAttribute('stroke', strokeColor); c.setAttribute('stroke-width', stroke);
      return c;
    }
    const bg = makeCircle('var(--surface-elevated)');
    const fill = makeCircle(color);
    fill.classList.add('ring-fill');
    fill.setAttribute('stroke-dasharray', circ);
    const svg = document.createElementNS(svgNS,'svg');
    svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.appendChild(bg); svg.appendChild(fill);
    const numEl = h('div.num', {}, [label]);
    const labelEl = sub ? h('div.label', {}, [sub]) : null;
    const textWrap = h('div.ring-text', {}, [numEl, labelEl]);
    const el = h('div.ring-wrap', {style:{width:size+'px', height:size+'px'}}, [svg, textWrap]);
    function setPct(p){ fill.setAttribute('stroke-dashoffset', circ*(1-Math.max(0,Math.min(1,p||0)))); }
    setPct(pct);
    function update({pct:newPct, label:newLabel, sub:newSub}={}){
      if(newPct!=null) setPct(newPct);
      if(newLabel!=null){ clear(numEl); numEl.appendChild(text(newLabel)); }
      if(newSub!=null && labelEl){ clear(labelEl); labelEl.appendChild(text(newSub)); }
    }
    return {el, update};
  };

  // ---------------- ProgressBar ----------------
  App.Components.ProgressBar = function({pct=0, color}={}){
    const fill = h('div.progress-fill', {style:{width:Math.max(0,Math.min(100,pct))+'%', ...(color?{background:color}:{})}});
    const el = h('div.progress-gauge', {}, [fill]);
    function update(newPct){ fill.style.width = Math.max(0,Math.min(100,newPct))+'%'; }
    return {el, update};
  };

  // ---------------- Chart (sparkline) ----------------
  App.Components.Chart = function({values=[], color='var(--accent)', minZero=true}={}){
    const svgNS = 'http://www.w3.org/2000/svg';
    const w=280,h_=64,pad=6;
    const wrap = h('div.spark-wrap');
    function paint(vals){
      clear(wrap);
      if(!vals.length){ wrap.appendChild(h('div.empty-state', {}, ['Пока нет данных'])); return; }
      const maxV = Math.max(...vals)*1.08 || 1;
      const minV = minZero===false ? Math.min(...vals)*0.94 : 0;
      const range = (maxV-minV)||1;
      const step = vals.length>1 ? (w-pad*2)/(vals.length-1) : 0;
      const xy = vals.map((v,i)=>[Math.round(pad+i*step), Math.round(h_-pad-((v-minV)/range)*(h_-pad*2))]);
      const svg = document.createElementNS(svgNS,'svg');
      svg.setAttribute('width','100%'); svg.setAttribute('height',h_); svg.setAttribute('viewBox',`0 0 ${w} ${h_}`); svg.setAttribute('preserveAspectRatio','none');
      const poly = document.createElementNS(svgNS,'polygon');
      poly.setAttribute('points', `${pad},${h_-pad} ${xy.map(p=>p.join(',')).join(' ')} ${xy[xy.length-1][0]},${h_-pad}`);
      poly.setAttribute('fill', color); poly.setAttribute('opacity','.18');
      const line = document.createElementNS(svgNS,'polyline');
      line.setAttribute('points', xy.map(p=>p.join(',')).join(' '));
      line.setAttribute('fill','none'); line.setAttribute('stroke', color); line.setAttribute('stroke-width','3');
      line.setAttribute('stroke-linejoin','round'); line.setAttribute('stroke-linecap','round');
      svg.appendChild(poly); svg.appendChild(line);
      xy.forEach(([x,y])=>{
        const c = document.createElementNS(svgNS,'circle');
        c.setAttribute('cx',x); c.setAttribute('cy',y); c.setAttribute('r',4);
        c.setAttribute('fill',color); c.setAttribute('stroke','var(--surface-elevated)'); c.setAttribute('stroke-width','1.5');
        svg.appendChild(c);
      });
      wrap.appendChild(svg);
    }
    paint(values);
    function update(newValues){ paint(newValues); }
    return {el:wrap, update};
  };

  // ---------------- Tabs (sub-navigation within a screen) ----------------
  App.Components.Tabs = function({items, active, onChange}){
    // items: [{key, label}]
    const buttons = {};
    const row = h('div.tab-row', {role:'tablist'});
    items.forEach(item=>{
      const btn = h('button.btn.small', {
        class: item.key===active ? '' : 'secondary',
        dataset:{action:'tab', tabKey:item.key},
      }, [item.label]);
      buttons[item.key] = btn;
      row.appendChild(btn);
    });
    App.Dom.delegate(row, 'click', {
      tab(e, ds){ setActive(ds.tabKey); if(onChange) onChange(ds.tabKey); }
    });
    function setActive(key){
      Object.keys(buttons).forEach(k=>{ buttons[k].className = 'btn small' + (k===key?'':' secondary'); });
    }
    return {el:row, setActive};
  };

  // ---------------- Modal (thin wrapper over the Layout arrangement) ----------------
  App.Components.Modal = {
    open(node, opts){ App.Layout.Modal.open(node, opts); },
    setContent(node){ App.Layout.Modal.setContent(node); },
    close(){ App.Layout.Modal.close(); },
  };
})();

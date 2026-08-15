/* =========================================================================
   COMPONENTS — HEXAGON CHART
   Radar/hexagon progress visualization: one axis per muscle group (there
   are exactly 6 non-cardio groups, a perfect fit), each axis scaled by
   that group's load %, with an icon at every vertex.
   ========================================================================= */
App.Components = App.Components || {};
App.Components.HexagonChart = function({data, size=220}){
  // data: [{name, pct(0-100), icon}] — exactly 6 entries expected.
  const svgNS = 'http://www.w3.org/2000/svg';
  const c = size/2;
  const R = size/2 - 34; // leave room for icon labels
  const n = data.length;
  const angleFor = i => -Math.PI/2 + i*(2*Math.PI/n);
  const pointAt = (i, r) => [c + r*Math.cos(angleFor(i)), c + r*Math.sin(angleFor(i))];
  const toPath = pts => pts.map(p=>p.join(',')).join(' ');

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  // Background grid rings (25/50/75/100%)
  [0.25,0.5,0.75,1].forEach(ringPct=>{
    const pts = data.map((_,i)=>pointAt(i, R*ringPct));
    const poly = document.createElementNS(svgNS, 'polygon');
    poly.setAttribute('points', toPath(pts));
    poly.setAttribute('fill', 'none'); poly.setAttribute('stroke', 'var(--border)'); poly.setAttribute('stroke-width', '1');
    svg.appendChild(poly);
  });
  // Axis lines
  data.forEach((_,i)=>{
    const [x,y] = pointAt(i, R);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', c); line.setAttribute('y1', c); line.setAttribute('x2', x); line.setAttribute('y2', y);
    line.setAttribute('stroke', 'var(--border)'); line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
  });
  // Data polygon
  const dataPts = data.map((d,i)=>pointAt(i, R*Math.max(0.04, Math.min(1, (d.pct||0)/100))));
  const dataPoly = document.createElementNS(svgNS, 'polygon');
  dataPoly.setAttribute('points', toPath(dataPts));
  dataPoly.setAttribute('fill', 'var(--accent-dim)'); dataPoly.setAttribute('stroke', 'var(--accent)'); dataPoly.setAttribute('stroke-width', '2');
  dataPoly.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(dataPoly);
  // Vertex dots
  dataPts.forEach(([x,y])=>{
    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', 3.5);
    dot.setAttribute('fill', 'var(--accent)');
    svg.appendChild(dot);
  });

  const wrap = App.Dom.h('div.hexagon-chart', {style:{width:size+'px', height:size+'px'}}, [svg]);
  // Icon + label at each vertex, positioned with plain divs over the SVG.
  data.forEach((d,i)=>{
    const [x,y] = pointAt(i, R+26);
    const label = App.Dom.h('div.hexagon-vertex', {style:{left:x+'px', top:y+'px'}}, [
      App.Dom.h('div.hexagon-vertex-icon', {}, [d.icon||'⚡']),
      App.Dom.h('div.hexagon-vertex-name', {}, [d.name]),
    ]);
    wrap.appendChild(label);
  });
  return {el:wrap};
};

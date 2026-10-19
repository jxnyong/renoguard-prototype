/* Small vector scene renderer: projected floors, walls and furniture share one geometry.
   Room regions stay keyboard accessible without a WebGL dependency. */
(() => {
  'use strict';
  const rooms = [
    { name: 'Kitchen', x: 0, y: 0, w: 4, d: 3, colour: '#d8d6cb', area: '9.2 m²' },
    { name: 'Bedroom 2', x: 4, y: 0, w: 4, d: 2.7, colour: '#d5b997', area: '10.4 m²' },
    { name: 'Bathroom', x: 4, y: 2.7, w: 4, d: 1.6, colour: '#b9bfba', area: '4.5 m²' },
    { name: 'Living room', x: 0, y: 3, w: 4, d: 5, colour: '#dbbd96', area: '24.8 m²' },
    { name: 'Main bedroom', x: 4, y: 4.3, w: 4, d: 3.7, colour: '#d5b997', area: '13.6 m²' }
  ];
  const slug = name => name.toLowerCase().replaceAll(' ', '-');
  const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function scene({ only = '', defects = [], mirror = false, tile = 'grigio' } = {}) {
    const chosen = rooms.find(room => slug(room.name) === only);
    const list = chosen ? [{ ...chosen, x: 0, y: 0, w: 5, d: 5 }] : rooms;
    const extent = chosen ? 5 : 8;
    const scale = chosen ? 38 : 25;
    const project = (x, y, z = 0) => [240 + (mirror ? y-x : x-y)*scale, 62 + (x+y)*scale*.52-z*scale];
    const points = vertices => vertices.map(v => project(...v).map(n=>n.toFixed(1)).join(',')).join(' ');
    const poly = (vertices, fill, extra='') => `<polygon points="${points(vertices)}" fill="${fill}" ${extra}/>`;
    const box = (x,y,w,d,h,top='#eee9df',front='#d5cec0',side='#b9b1a2') =>
      poly([[x,y+d,0],[x+w,y+d,0],[x+w,y+d,h],[x,y+d,h]],front) +
      poly([[x+w,y,0],[x+w,y+d,0],[x+w,y+d,h],[x+w,y,h]],side) +
      poly([[x,y,h],[x+w,y,h],[x+w,y+d,h],[x,y+d,h]],top);
    let output = `<svg class="apartment-model${chosen?' single-room':''}" viewBox="0 0 480 ${chosen?310:330}" aria-label="${chosen?safe(chosen.name)+' cutaway':'Interactive apartment cutaway'}"><defs><filter id="model-shadow"><feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#243f35" flood-opacity=".15"/></filter></defs><g filter="url(#model-shadow)">`;
    output += box(-.1,-.1,extent+.2,extent+.2,.13,'#f3f0e9','#d7d5ca','#c5c8bd');
    for (const r of list) {
      const {x,y,w,d}=r;
      const floor=r.name==='Bathroom'?(tile==='sabbia'?'#d3bb94':'#b9bfba'):r.colour;
      output += poly([[x,y,.15],[x+w,y,.15],[x+w,y+d,.15],[x,y+d,.15]],floor,'stroke="#f9f7ef" stroke-width="2"');
      for(let a=.5;a<w;a+=.5) output += poly([[x+a,y,.16],[x+a,y+d,.16]],'none','stroke="#686d5b" stroke-opacity=".12" stroke-width=".6"');
      if(r.name==='Bathroom'||r.name==='Kitchen') for(let a=.6;a<d;a+=.6)output+=poly([[x,y+a,.16],[x+w,y+a,.16]],'none','stroke="#686d5b" stroke-opacity=".17" stroke-width=".7"');
      output += poly([[x,y,.15],[x+w,y,.15],[x+w,y,1.1],[x,y,1.1]],'#eeeae1','stroke="#d6d6cc" stroke-width=".8"');
      output += poly([[x,y,.15],[x,y+d,.15],[x,y+d,1.1],[x,y,1.1]],'#e1dfd5','stroke="#cbcfc3" stroke-width=".8"');
      output += poly([[x,y,1.1],[x+w,y,1.1],[x+w,y+.07,1.1],[x+.07,y+.07,1.1],[x+.07,y+d,1.1],[x,y+d,1.1]],'#fffdf7');
      if(r.name.includes('bedroom')||r.name==='Bedroom 2') {
        output+=box(x+.55,y+.55,w*.57,d*.63,.39,'#e8e5dc','#b6a386','#a49278');
        output+=box(x+.55,y+.5,w*.57,.18,.8,'#b39c7e','#a88e6d','#917b60');
        output+=box(x+.7,y+.72,w*.2,.45,.48,'#fffef7','#e6e6df','#d2d2ca');
        output+=box(x+w*.54,y+.72,w*.2,.45,.48,'#fffef7','#e6e6df','#d2d2ca');
        output+=box(x+.6,y+d*.47,w*.54,d*.2,.42,'#a5b3a0','#899c86','#7b8e78');
        output+=box(x+w*.8,y+.5,w*.17,d*.7,.8,'#d9c7ac','#c7b394','#af9c7f');
      } else if(r.name==='Living room') {
        output+=poly([[x+.45,y+.9,.17],[x+3.6,y+.9,.17],[x+3.6,y+3.7,.17],[x+.45,y+3.7,.17]],'#eee7d9');
        output+=box(x+.3,y+1,.9,2.3,.6,'#dfdacb','#c5c1b2','#b8b7a8');
        output+=box(x+.25,y+1,.18,2.3,.85,'#e8e4d8','#d4cebe','#bbb7a8');
        output+=box(x+1.55,y+1.65,1.2,.9,.4,'#bf9f79','#ad8f69','#947955');
        output+=box(x+3.4,y+1.15,.35,2.2,.38,'#c4a57e','#ac8f68','#8d7657');
        output+=box(x+3.45,y+1.4,.08,1.6,1.2,'#42534b','#2c3b34','#283931');
        output+=box(x+1.1,y+3.8,2,.7,.65,'#c4a57e','#ad8f69','#947955');
      } else if(r.name==='Kitchen') {
        output+=box(x+.18,y+.15,w-.36,.65,.8,'#f4f0e5','#b8a58a','#a28e72');
        output+=box(x+.18,y+.7,.65,d-1,.8,'#f4f0e5','#b8a58a','#a28e72');
        output+=box(x+w*.45,y+.28,.85,.38,.83,'#71817a','#68736c','#617069');
        output+=box(x+w-.8,y+.22,.55,.6,1.1,'#ced1ca','#bec3ba','#a9b3a9');
      } else {
        output+=box(x+.25,y+.15,1,.55,.65,'#faf9ef','#dedfd7','#c4cbc2');
        output+=box(x+1.6,y+.2,.6,.75,.45,'#fffdf6','#e4e6de','#c8d0c5');
        output+=poly([[x+w-1,y+.1,.17],[x+w-1,y+d-.1,.17],[x+w-1,y+d-.1,1.2],[x+w-1,y+.1,1.2]],'#dce9e4','fill-opacity=".5" stroke="#b2c8bd" stroke-width="1"');
      }
    }
    output+='</g>';
    if(!chosen)for(const r of rooms){
      const records=defects.filter(d=>d.room===r.name&&!['verified','withdrawn'].includes(d.status));
      const [cx,cy]=project(r.x+r.w*.5,r.y+r.d*.56,.2);
      output+=`<g class="model-room" role="button" tabindex="0" data-action="open-room" data-room="${slug(r.name)}" aria-label="${safe(r.name)}, ${records.length} open ${records.length===1?'issue':'issues'}. View room details">`;
      output+=poly([[r.x,r.y,.17],[r.x+r.w,r.y,.17],[r.x+r.w,r.y+r.d,.17],[r.x,r.y+r.d,.17]],'transparent','class="room-highlight"');
      output+=`<rect class="room-label-bg" x="${cx-43}" y="${cy-9}" width="86" height="20" rx="7"/><text class="room-label" x="${cx}" y="${cy+4}">${safe(r.name)}</text>`;
      if(records.length)output+=`<circle class="room-alert" cx="${cx+39}" cy="${cy-13}" r="10"/><text class="room-alert-text" x="${cx+39}" y="${cy-9}">!</text>`;
      output+='</g>';
    }
    return output+'</svg>';
  }
  window.RenoGuardRooms=Object.freeze({ rooms, scene });
})();

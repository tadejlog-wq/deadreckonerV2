// Template picker with wireframe previews. Renders into #dr-templates from window.drTemplates.
(function () {
  "use strict";
  var CSS = '.dr-tpl-root{font-family:"IBM Plex Sans",sans-serif;color:#F2F4F5}'
+'.dr-tpl-category{overflow:hidden;margin-bottom:6px;border:1px solid rgba(255,255,255,0.07);border-radius:8px;background:rgba(255,255,255,0.02)}'
+'.dr-tpl-category-row{appearance:none;display:grid;grid-template-columns:minmax(0,1fr) auto 18px;align-items:center;gap:10px;width:100%;min-height:42px;padding:0 13px;border:0;background:rgba(255,255,255,0.02);color:#F2F4F5;font-family:"IBM Plex Sans",sans-serif;text-align:left;cursor:pointer;transition:background-color .16s}'
+'.dr-tpl-category-row:hover{background:rgba(20,176,160,0.10)}'
+'.dr-tpl-category-row:focus-visible,.dr-tpl-card:focus-visible{outline:2px solid #14B0A0;outline-offset:-2px}'
+'.dr-tpl-category-name{overflow:hidden;font-size:12.5px;font-weight:500;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}'
+'.dr-tpl-category-count{color:#8B9196;font-family:"IBM Plex Mono",monospace;font-size:10.5px}'
+'.dr-tpl-chevron{display:inline-flex;align-items:center;justify-content:center;color:#8B9196;transition:transform .16s}'
+'.dr-tpl-chevron svg{width:15px;height:15px}'
+'.dr-tpl-category-row[aria-expanded="true"] .dr-tpl-chevron{transform:rotate(90deg)}'
+'.dr-tpl-panel{padding:8px;border-top:1px solid rgba(255,255,255,0.07)}'
+'.dr-tpl-panel[hidden]{display:none}'
+'.dr-tpl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}'
+'.dr-tpl-card{appearance:none;min-width:0;padding:8px;border:1px solid rgba(255,255,255,0.07);border-radius:6px;background:rgba(255,255,255,0.02);color:#8B9196;font-family:"IBM Plex Sans",sans-serif;text-align:left;cursor:pointer;transition:border-color .16s,transform .16s,background-color .16s}'
+'.dr-tpl-card:hover{border-color:#14B0A0;background:rgba(20,176,160,0.10);transform:translateY(-1px)}'
+'.dr-tpl-preview{display:flex;align-items:center;justify-content:center;min-height:108px;margin-bottom:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);border-radius:4px;background:#0D0D0D}'
+'.dr-tpl-preview svg{display:block;width:100%;height:104px;color:#7A8087}'
+'.dr-tpl-card-name{display:block;overflow:hidden;color:#F2F4F5;font-size:12px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}'
+'@media(prefers-reduced-motion:reduce){.dr-tpl-category-row,.dr-tpl-chevron,.dr-tpl-card{transition:none}}';
  var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);

  function svg(n,a){var e=document.createElementNS('http://www.w3.org/2000/svg',n);Object.keys(a||{}).forEach(function(k){e.setAttribute(k,a[k]);});return e;}
  function base(vb){return svg('svg',{viewBox:vb,'aria-hidden':'true',fill:'none',stroke:'currentColor','stroke-width':'1.5'});}
  function rect(v,x,y,w,h,r){v.appendChild(svg('rect',{x:x,y:y,width:w,height:h,rx:r||0,fill:'rgba(255,255,255,0.02)'}));}
  function line(v,a,b,c,d){v.appendChild(svg('line',{x1:a,y1:b,x2:c,y2:d}));}
  var WF = {
    presentation: function(){var v=base('0 0 160 100');rect(v,9,10,142,80,2);rect(v,21,21,87,9,1);line(v,21,35,139,35);rect(v,21,44,53,32,1);rect(v,86,44,53,32,1);return v;},
    social: function(){var v=base('0 0 160 100');rect(v,45,6,70,88,2);rect(v,52,13,56,52,1);line(v,52,75,98,75);line(v,52,82,88,82);return v;},
    signature: function(){var v=base('0 0 160 100');rect(v,12,30,136,40,2);rect(v,22,39,22,22,1);line(v,56,41,112,41);line(v,56,50,128,50);line(v,56,59,101,59);return v;},
    poster: function(){var v=base('0 0 160 100');rect(v,52,5,56,90,2);rect(v,60,22,40,22,1);line(v,60,51,93,51);line(v,60,57,86,57);rect(v,88,79,12,7,1);return v;},
    pitch: function(){var v=base('0 0 160 100');rect(v,9,10,142,80,2);rect(v,49,36,62,15,1);line(v,52,59,108,59);rect(v,20,74,17,7,1);return v;},
    letterhead: function(){var v=base('0 0 160 100');rect(v,52,5,56,90,2);rect(v,58,11,44,11,1);line(v,61,33,96,33);line(v,61,40,99,40);line(v,61,47,92,47);line(v,61,58,99,58);line(v,61,65,95,65);rect(v,58,82,44,7,1);return v;}
  };
  function wf(t){ return (WF[t] || WF.presentation)(); }
  function chevron(){var v=base('0 0 24 24');v.appendChild(svg('path',{d:'M9 6L15 12L9 18'}));return v;}

  function render() {
    var mount = document.getElementById('dr-templates');
    var cats = window.drTemplates;
    if (!mount) return;
    if (!Array.isArray(cats) || !cats.length) { console.warn('dr-templates: no data'); return; }
    mount.className = 'dr-tpl-root'; mount.innerHTML = '';
    var openId = null;
    function closeAllExcept(id) {
      mount.querySelectorAll('.dr-tpl-category-row').forEach(function(row){
        var rid = row.getAttribute('data-cid');
        var panel = document.getElementById(row.getAttribute('aria-controls'));
        var on = rid === id;
        row.setAttribute('aria-expanded', on ? 'true' : 'false');
        if (panel) panel.hidden = !on;
      });
      openId = id;
    }
    cats.forEach(function(cat, ci){
      var items = Array.isArray(cat.items) ? cat.items : [];
      var cid = String(cat.id || ('cat-' + ci));
      var pid = 'dr-tpl-panel-' + cid.replace(/[^a-zA-Z0-9_-]/g,'-') + '-' + ci;
      var wrap = document.createElement('section'); wrap.className = 'dr-tpl-category';
      var row = document.createElement('button');
      row.type='button'; row.className='dr-tpl-category-row';
      row.setAttribute('data-app-control','');
      row.setAttribute('aria-expanded','false'); row.setAttribute('aria-controls',pid); row.setAttribute('data-cid',cid);
      var nm=document.createElement('span'); nm.className='dr-tpl-category-name'; nm.textContent=cat.name||'';
      var ct=document.createElement('span'); ct.className='dr-tpl-category-count'; ct.textContent=String(items.length);
      var ch=document.createElement('span'); ch.className='dr-tpl-chevron'; ch.setAttribute('aria-hidden','true'); ch.appendChild(chevron());
      row.appendChild(nm); row.appendChild(ct); row.appendChild(ch);
      var panel=document.createElement('div'); panel.className='dr-tpl-panel'; panel.id=pid; panel.hidden=true;
      var grid=document.createElement('div'); grid.className='dr-tpl-grid';
      items.forEach(function(it){
        var card=document.createElement('button');
        card.type='button'; card.className='dr-tpl-card'; card.setAttribute('data-app-control','');
        var pv=document.createElement('span'); pv.className='dr-tpl-preview'; pv.appendChild(wf(it.wireframe));
        var cn=document.createElement('span'); cn.className='dr-tpl-card-name'; cn.textContent=it.name||'';
        card.appendChild(pv); card.appendChild(cn);
        card.addEventListener('click', function(){
          document.dispatchEvent(new CustomEvent('dr:template-chosen',{detail:{categoryId:cat.id,templateId:it.id,name:it.name}}));
        });
        grid.appendChild(card);
      });
      panel.appendChild(grid);
      row.addEventListener('click', function(){ closeAllExcept(openId === cid ? null : cid); });
      wrap.appendChild(row); wrap.appendChild(panel); mount.appendChild(wrap);
    });
  }
  window.drRenderTemplates = render;
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){ if (Array.isArray(window.drTemplates) && window.drTemplates.length) render(); }, 400);
  });
}());

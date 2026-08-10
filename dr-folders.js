// Folder-based asset library. Renders into #dr-folders from window.drFolders.
(function () {
  "use strict";
  var CSS = '.dr-fold-root{font-family:"IBM Plex Sans",sans-serif;color:#F2F4F5}'
+'.dr-fold-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px}'
+'.dr-fold-tile{appearance:none;width:100%;min-width:0;padding:14px 12px 12px;border:1px solid rgba(255,255,255,0.07);border-radius:6px;background:rgba(255,255,255,0.02);color:#8B9196;font:inherit;text-align:left;cursor:pointer;transition:border-color .16s,transform .16s,background-color .16s}'
+'.dr-fold-tile:hover,.dr-fold-tile:focus-visible{border-color:#14B0A0;transform:translateY(-2px)}'
+'.dr-fold-tile:focus-visible,.dr-fold-close:focus-visible,.dr-fold-download:focus-visible,.dr-fold-generate:focus-visible{outline:2px solid #14B0A0;outline-offset:2px}'
+'.dr-fold-icon-wrap{position:relative;display:block;width:72px;height:55px;margin:0 auto 11px}'
+'.dr-fold-icon{display:block;width:72px;height:55px;color:#3A3A42}'
+'.dr-fold-count{position:absolute;right:-3px;bottom:4px;min-width:18px;padding:2px 5px;border:1px solid rgba(255,255,255,0.07);border-radius:4px;background:#0D0D0D;color:#F2F4F5;font-family:"IBM Plex Mono",monospace;font-size:10px;line-height:1.3;text-align:center}'
+'.dr-fold-count-empty{color:#7A8087}'
+'.dr-fold-name{display:block;overflow:hidden;color:#8B9196;font-size:12.5px;line-height:1.35;text-align:center;text-overflow:ellipsis;white-space:nowrap}'
+'.dr-fold-backdrop{position:fixed;z-index:1000;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,5,7,0.72)}'
+'.dr-fold-modal{width:100%;max-width:520px;max-height:min(620px,calc(100vh - 40px));overflow:hidden;border:1px solid rgba(255,255,255,0.07);border-radius:8px;background:rgba(22,22,28,0.94);color:#F2F4F5;box-shadow:0 20px 70px rgba(5,5,7,0.72)}'
+'.dr-fold-modal-header{display:flex;align-items:center;gap:12px;min-height:58px;padding:0 14px 0 18px;border-bottom:1px solid rgba(255,255,255,0.07)}'
+'.dr-fold-modal-title{min-width:0;flex:1;margin:0;color:#F2F4F5;font-size:14px;font-weight:500;line-height:1.4}'
+'.dr-fold-modal-title-count{margin-left:7px;color:#8B9196;font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:400}'
+'.dr-fold-close{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:1px solid rgba(255,255,255,0.07);border-radius:4px;background:rgba(255,255,255,0.02);color:#8B9196;cursor:pointer;transition:border-color .16s,color .16s,background-color .16s}'
+'.dr-fold-close:hover{border-color:#14B0A0;background:rgba(20,176,160,0.10);color:#F2F4F5}'
+'.dr-fold-close svg{width:16px;height:16px}'
+'.dr-fold-modal-body{max-height:calc(min(620px,100vh - 40px) - 59px);overflow-y:auto;padding:8px}'
+'.dr-fold-file-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:12px;min-height:48px;padding:7px 9px 7px 11px;border-bottom:1px solid rgba(255,255,255,0.07)}'
+'.dr-fold-file-row:last-child{border-bottom:0}'
+'.dr-fold-file-name{overflow:hidden;color:#F2F4F5;font-size:12.5px;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}'
+'.dr-fold-file-size{color:#8B9196;font-family:"IBM Plex Mono",monospace;font-size:10.5px;white-space:nowrap}'
+'.dr-fold-download,.dr-fold-generate{appearance:none;border:1px solid #14B0A0;border-radius:4px;background:rgba(20,176,160,0.10);color:#F2F4F5;font-family:"IBM Plex Sans",sans-serif;cursor:pointer;transition:background-color .16s,transform .16s}'
+'.dr-fold-download{padding:5px 8px;font-size:10.5px}'
+'.dr-fold-generate{padding:7px 11px;font-size:11.5px}'
+'.dr-fold-download:hover,.dr-fold-generate:hover{transform:translateY(-1px)}'
+'.dr-fold-empty{padding:42px 20px 46px;text-align:center}'
+'.dr-fold-empty-text{margin:0 0 14px;color:#7A8087;font-size:12.5px}'
+'@media(prefers-reduced-motion:reduce){.dr-fold-tile,.dr-fold-close,.dr-fold-download,.dr-fold-generate{transition:none}}';
  var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);

  function render() {
    var mount = document.getElementById('dr-folders');
    var folders = window.drFolders;
    if (!mount) return;
    if (!Array.isArray(folders) || !folders.length) { console.warn('dr-folders: no data'); return; }
    mount.className = 'dr-fold-root';
    mount.innerHTML = '';
    var activeTrigger = null, activeBackdrop = null;
    function svg(n, a) { var e = document.createElementNS('http://www.w3.org/2000/svg', n); Object.keys(a||{}).forEach(function(k){e.setAttribute(k,a[k]);}); return e; }
    function folderIcon() {
      var v = svg('svg',{class:'dr-fold-icon',viewBox:'0 0 72 55','aria-hidden':'true',fill:'none',stroke:'currentColor','stroke-width':'1.5'});
      v.appendChild(svg('path',{d:'M7 14.5V10.5C7 8.57 8.57 7 10.5 7H27L33 13H61.5C63.43 13 65 14.57 65 16.5V18',fill:'#3A3A42',stroke:'rgba(255,255,255,0.07)'}));
      v.appendChild(svg('path',{d:'M10 10H26L30 14H10Z',fill:'rgba(255,255,255,0.07)',stroke:'rgba(255,255,255,0.07)'}));
      v.appendChild(svg('path',{d:'M7 18H65L61.5 47.5H10.5L7 18Z',fill:'#3A3A42',stroke:'rgba(255,255,255,0.07)'}));
      return v;
    }
    function fmt(b) { var kb = Number(b)/1024; if (!isFinite(kb)||kb<0) kb=0; return kb<1024 ? kb.toFixed(1)+' KB' : (kb/1024).toFixed(1)+' MB'; }
    function close() {
      if (!activeBackdrop) return;
      document.removeEventListener('keydown', onKey);
      activeBackdrop.remove(); activeBackdrop = null;
      if (activeTrigger && document.contains(activeTrigger)) activeTrigger.focus();
      activeTrigger = null;
    }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
    function open(folder, trigger) {
      close(); activeTrigger = trigger;
      var files = Array.isArray(folder.files) ? folder.files : [];
      var back = document.createElement('div'); back.className = 'dr-fold-backdrop';
      var m = document.createElement('div'); m.className = 'dr-fold-modal';
      m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.tabIndex = -1;
      var rows = files.length
        ? files.map(function(f,i){
            return '<div class="dr-fold-file-row"><span class="dr-fold-file-name">'+
              String(f.name||'').replace(/[<>]/g,'')+'</span><span class="dr-fold-file-size">'+
              fmt(f.size)+'</span><button type="button" class="dr-fold-download" data-i="'+i+'">Download</button></div>';
          }).join('')
        : '<div class="dr-fold-empty"><p class="dr-fold-empty-text">Nothing here yet.</p>'+
          '<button type="button" class="dr-fold-generate">Generate assets</button></div>';
      m.innerHTML = '<div class="dr-fold-modal-header"><h2 class="dr-fold-modal-title">'+
        String(folder.name||'').replace(/[<>]/g,'')+'<span class="dr-fold-modal-title-count">('+files.length+')</span></h2>'+
        '<button type="button" class="dr-fold-close" aria-label="Close folder">'+
        '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6L18 18M18 6L6 18"/></svg>'+
        '</button></div><div class="dr-fold-modal-body">'+rows+'</div>';
      back.appendChild(m); document.body.appendChild(back); activeBackdrop = back;
      m.querySelector('.dr-fold-close').addEventListener('click', close);
      back.addEventListener('mousedown', function(e){ if (e.target === back) close(); });
      document.addEventListener('keydown', onKey);
      var gen = m.querySelector('.dr-fold-generate');
      if (gen) gen.addEventListener('click', function(){ document.dispatchEvent(new CustomEvent('dr:generate-assets')); });
      m.querySelectorAll('.dr-fold-download').forEach(function(b){
        b.addEventListener('click', function(){
          var f = files[Number(b.dataset.i)];
          if (f && f.url) window.open(f.url, '_blank');
        });
      });
      var f0 = m.querySelector('button'); (f0 || m).focus();
    }
    var grid = document.createElement('div'); grid.className = 'dr-fold-grid';
    folders.forEach(function(folder){
      var files = Array.isArray(folder.files) ? folder.files : [];
      var tile = document.createElement('button');
      tile.type = 'button'; tile.className = 'dr-fold-tile';
      tile.setAttribute('data-app-control','');
      tile.setAttribute('aria-label', (folder.name||'Folder')+', '+files.length+' files');
      var wrap = document.createElement('span'); wrap.className = 'dr-fold-icon-wrap';
      wrap.appendChild(folderIcon());
      var cnt = document.createElement('span');
      cnt.className = 'dr-fold-count' + (files.length === 0 ? ' dr-fold-count-empty' : '');
      cnt.textContent = String(files.length); wrap.appendChild(cnt);
      var nm = document.createElement('span'); nm.className = 'dr-fold-name'; nm.textContent = folder.name || '';
      tile.appendChild(wrap); tile.appendChild(nm);
      tile.addEventListener('click', function(){ open(folder, tile); });
      grid.appendChild(tile);
    });
    mount.appendChild(grid);
  }
  window.drRenderFolders = render;
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(render, 100); });
}());

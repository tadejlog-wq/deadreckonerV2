// ============================================================
// Deadreckoner — user-facing privacy controls + feedback.
// Loaded on the account page. Makes the rights promised in the
// privacy policy actually exercisable by the user.
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.deadreckonerDB || !window.deadreckonerDB.waitForSession) return;
  const session = await window.deadreckonerDB.waitForSession();
  if (!session) return;

  const danger = document.querySelector('.danger-panel, .danger-zone, [class*="danger"]');
  if (!danger) return;

  const panel = document.createElement('div');
  panel.style.cssText =
    'margin-top:18px;padding:18px;border:1px solid rgba(255,255,255,.09);' +
    'border-radius:8px;background:rgba(255,255,255,.02);';
  panel.innerHTML =
    '<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:var(--text-primary,#F2F4F5)">Your data</p>' +
    '<p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:var(--text-muted,#7A8087)">' +
    'Download everything we hold about you, or ask us to erase it. Erasure anonymises your ' +
    'activity and removes you from this workspace; it cannot be undone.</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
    '<button id="pcExport" type="button" style="padding:8px 14px;border:1px solid rgba(255,255,255,.14);' +
    'border-radius:6px;background:transparent;color:var(--text-primary,#F2F4F5);font-size:13px;cursor:pointer">' +
    'Download my data</button>' +
    '<button id="pcErase" type="button" style="padding:8px 14px;border:1px solid rgba(184,122,106,.45);' +
    'border-radius:6px;background:transparent;color:var(--clay,#B87A6A);font-size:13px;cursor:pointer">' +
    'Erase my data</button>' +
    '</div><p id="pcMsg" style="margin:12px 0 0;font-size:12px;color:var(--text-muted,#7A8087)"></p>';
  danger.parentNode.insertBefore(panel, danger);

  const msg = panel.querySelector('#pcMsg');

  panel.querySelector('#pcExport').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; msg.textContent = 'Preparing your export…';
    const { data, error } = await window.deadreckonerDB.exportMyData();
    btn.disabled = false;
    if (error) { msg.textContent = 'Export failed: ' + error; return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deadreckoner-my-data.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    msg.textContent = 'Downloaded.';
  });

  panel.querySelector('#pcErase').addEventListener('click', async (e) => {
    if (!confirm('Erase your data and remove you from this workspace? This cannot be undone.')) return;
    if (!confirm('Last check — this is permanent. Continue?')) return;
    const btn = e.currentTarget;
    btn.disabled = true; msg.textContent = 'Erasing…';
    const { data, error } = await window.deadreckonerDB.eraseMyData();
    btn.disabled = false;
    if (error) { msg.textContent = error; return; }
    msg.textContent = (data && data.note) || 'Your data has been anonymised.';
  });

  // ── Lightweight CES prompt: the framework's strongest churn predictor ──
  const KEY = 'dr_ces_asked';
  if (!localStorage.getItem(KEY)) {
    setTimeout(() => {
      const bar = document.createElement('div');
      bar.style.cssText =
        'position:fixed;right:20px;bottom:92px;z-index:60;width:min(300px,calc(100vw - 40px));' +
        'padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:10px;' +
        'background:rgba(22,22,28,.96);backdrop-filter:blur(20px);' +
        'box-shadow:0 18px 50px rgba(0,0,0,.5);font-size:13px;color:var(--text-primary,#F2F4F5)';
      bar.innerHTML =
        '<p style="margin:0 0 10px">How easy was it to get set up?</p>' +
        '<div id="cesRow" style="display:flex;gap:6px;margin-bottom:8px"></div>' +
        '<button id="cesSkip" style="border:0;background:none;color:var(--text-muted,#7A8087);' +
        'font-size:11px;cursor:pointer;padding:0">Not now</button>';
      document.body.appendChild(bar);
      const row = bar.querySelector('#cesRow');
      for (let i = 1; i <= 7; i++) {
        const b = document.createElement('button');
        b.textContent = i;
        b.style.cssText =
          'flex:1;padding:7px 0;border:1px solid rgba(255,255,255,.12);border-radius:5px;' +
          'background:transparent;color:inherit;font-size:12px;cursor:pointer';
        b.addEventListener('click', async () => {
          localStorage.setItem(KEY, '1');
          await window.deadreckonerDB.submitFeedback({ kind: 'ces', score: i, context: 'onboarding' });
          bar.innerHTML = '<p style="margin:0">Thank you — noted.</p>';
          setTimeout(() => bar.remove(), 1600);
        });
        row.appendChild(b);
      }
      bar.querySelector('#cesSkip').addEventListener('click', () => {
        localStorage.setItem(KEY, '1'); bar.remove();
      });
    }, 4000);
  }
});

// ── Profile photo upload + generated-asset library ──────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.deadreckonerDB || !window.deadreckonerDB.waitForSession) return;
  const db = window.deadreckonerDB;
  const client = db.getClient();
  const session = await db.waitForSession();
  if (!session || !client) return;

  // Photo upload
  const btn = document.getElementById('avatarBtn');
  const input = document.getElementById('avatarInput');
  const hint = document.getElementById('avatarHint');
  if (btn && input) {
    btn.addEventListener('mouseenter', () => { if (hint) hint.style.display = 'grid'; });
    btn.addEventListener('mouseleave', () => { if (hint) hint.style.display = 'none'; });
    btn.addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const path = `${session.user.id}/avatar-${Date.now()}-${file.name}`;
      const { error: upErr } = await client.storage.from('asset-submissions').upload(path, file);
      if (upErr) { console.warn('avatar upload failed:', upErr.message); return; }
      const { data: pub } = client.storage.from('asset-submissions').getPublicUrl(path);
      const url = pub && pub.publicUrl;
      if (!url) return;
      await client.auth.updateUser({ data: { avatar_url: url } });
      document.querySelectorAll('.avatar').forEach((el) => {
        el.textContent = '';
        el.style.cssText += `background-image:url("${url}");background-size:cover;background-position:center;`;
      });
      db.logEvent('profile.avatar_updated');
    });
  }

  // Generated-asset library
  const left = document.querySelector('.prof-side, .prof-panel');
  if (!left) return;
  const wsId = session.user.app_metadata && session.user.app_metadata.workspace_id;
  let files = [];
  if (wsId) {
    try {
      const { data } = await client.from('asset_submission_files')
        .select('file_name, storage_path, size_bytes, created_at')
        .order('created_at', { ascending: false }).limit(20);
      files = data || [];
    } catch (e) { /* none */ }
  }
  const panel = document.createElement('section');
  panel.className = 'prof-panel';
  panel.style.cssText = 'margin-top:16px';
  panel.innerHTML =
    '<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#F2F4F5">Your assets</p>' +
    '<p style="margin:0 0 12px;font-size:12px;color:#7A8087">Files you have submitted or generated.</p>' +
    (files.length
      ? '<div style="display:flex;flex-direction:column;gap:6px">' + files.map((f) =>
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;' +
          'padding:8px 11px;border:1px solid rgba(255,255,255,.07);border-radius:6px;font-size:12.5px">' +
          '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          (f.file_name || '').replace(/[<>]/g, '') + '</span>' +
          '<span style="color:#7A8087;flex:0 0 auto">' +
          (f.size_bytes ? Math.round(f.size_bytes / 1024) + ' KB' : '') + '</span></div>').join('') + '</div>'
      : '<p style="margin:0;font-size:12.5px;color:#7A8087">Nothing yet.</p>');
  left.parentNode.insertBefore(panel, left.nextSibling);
});

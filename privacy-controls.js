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

  // Generated-asset library is now rendered by dr-folders.js
});

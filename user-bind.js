// ============================================================
// Deadreckoner — binds real signed-in user + workspace data
// into the UI. Replaces the hardcoded demo values.
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.deadreckonerDB || !window.deadreckonerDB.waitForSession) return;

  const client = window.deadreckonerDB.getClient();
  const session = await window.deadreckonerDB.waitForSession();
  if (!session || !session.user) return;

  const user = session.user;
  const meta = user.user_metadata || {};
  const name = meta.full_name || meta.name || (user.email || '').split('@')[0] || 'Account';
  const email = user.email || '';
  const avatarUrl = meta.avatar_url || meta.picture || '';
  const initials = name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const setText = (sel, val) => document.querySelectorAll(sel).forEach(el => { el.textContent = val; });
  const setVal  = (sel, val) => document.querySelectorAll(sel).forEach(el => { el.value = val; });

  setText('.prof-name', name);
  setText('.prof-email', email);
  setVal('#fName', name);
  setVal('#fEmail', email);

  document.querySelectorAll('.avatar').forEach(el => {
    if (avatarUrl) {
      el.textContent = '';
      el.style.cssText += `background-image:url("${avatarUrl}");background-size:cover;background-position:center;`;
    } else {
      el.textContent = initials;
    }
  });

  // Real workspace name in the breadcrumb (replaces hardcoded "Olanzo").
  let wsName = null;
  const wsId = user.app_metadata && user.app_metadata.workspace_id;
  if (wsId && client) {
    try {
      const { data } = await client.from('workspaces').select('name, maturity_tier').eq('id', wsId).single();
      if (data && data.name) wsName = data.name;
    } catch (e) { /* leave as-is */ }
  }
  document.querySelectorAll('.breadcrumb-root, .breadcrumb-parent').forEach(el => {
    el.textContent = wsName || 'Your workspace';
  });

  // Real role label.
  if (window.deadreckonerDB.getCurrentUserRole) {
    try {
      const { role } = await window.deadreckonerDB.getCurrentUserRole();
      if (role) setText('.prof-role', role.charAt(0).toUpperCase() + role.slice(1));
    } catch (e) { /* leave as-is */ }
  }

  // Sign out — the button had no handler at all.
  document.querySelectorAll('.ghost-btn, [data-signout]').forEach(btn => {
    if (!/sign\s*out/i.test(btn.textContent || '')) return;
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = 'Signing out…';
      try { await client.auth.signOut(); } catch (err) { /* fall through */ }
      window.location.replace('index.html');
    });
  });
});

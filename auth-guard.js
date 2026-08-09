// ============================================================
// Deadreckoner — auth guard.
// Redirects signed-out visitors away from app pages.
//
// Must wait for INITIAL_SESSION: after Google OAuth the session
// arrives in the URL and the Supabase client resolves it async.
// Calling getSession() before that returns null and would bounce
// a user who just successfully signed in.
// ============================================================
(() => {
  const LANDING = 'index.html';
  let settled = false;

  const veil = document.createElement('div');
  veil.setAttribute('data-auth-veil', '');
  veil.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:#0D0D0D;' +
    'display:flex;align-items:center;justify-content:center;' +
    'font-family:system-ui,sans-serif;color:#5A6066;font-size:13px;';
  veil.textContent = 'Checking your session…';

  function addVeil() {
    if (document.body) document.body.appendChild(veil);
    else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(veil));
  }
  function removeVeil() { veil.remove(); }

  function allow() { if (!settled) { settled = true; removeVeil(); } }
  function deny()  { if (!settled) { settled = true; window.location.replace(LANDING); } }

  addVeil();

  (async () => {
    let tries = 0;
    while (!window.deadreckonerDB && tries < 60) {
      await new Promise((r) => setTimeout(r, 50));
      tries++;
    }
    const client = window.deadreckonerDB && window.deadreckonerDB.getClient();
    if (!client) { allow(); return; }   // misconfigured — don't trap the user

    // Definitive signal: fires once the client has read storage AND the URL.
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        session ? allow() : deny();
        if (sub && sub.subscription) sub.subscription.unsubscribe();
      } else if (event === 'SIGNED_OUT') {
        deny();
      }
    });

    // Belt and braces: if the event never lands, fall back to a direct check.
    setTimeout(async () => {
      if (settled) return;
      const { data } = await client.auth.getSession();
      data && data.session ? allow() : deny();
    }, 4000);
  })();
})();

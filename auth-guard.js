// ============================================================
// Deadreckoner — auth guard.
// Redirects signed-out visitors away from app pages.
// Uses the shared waitForSession() helper so it never races the
// OAuth redirect (which resolves the session asynchronously).
// ============================================================
(() => {
  const LANDING = 'index.html';

  const veil = document.createElement('div');
  veil.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:#0D0D0D;' +
    'display:flex;align-items:center;justify-content:center;' +
    'font-family:system-ui,sans-serif;color:#5A6066;font-size:13px;';
  veil.textContent = 'Checking your session…';

  function addVeil() {
    if (document.body) document.body.appendChild(veil);
    else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(veil));
  }
  addVeil();

  (async () => {
    let tries = 0;
    while (!window.deadreckonerDB && tries < 60) {
      await new Promise((r) => setTimeout(r, 50));
      tries++;
    }
    if (!window.deadreckonerDB || !window.deadreckonerDB.waitForSession) {
      veil.remove(); // misconfigured — don't trap the user behind a veil
      return;
    }
    const session = await window.deadreckonerDB.waitForSession();
    if (session) veil.remove();
    else window.location.replace(LANDING);
  })();
})();

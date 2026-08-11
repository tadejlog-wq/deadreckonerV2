// ============================================================
// Deadreckoner — assets page usability.
// 1. Collapsible taxonomy groups.
// 2. A jump control so the AI consultant is reachable without
//    scrolling past 53 slot cards.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // ── Collapsible groups ────────────────────────────────────
  document.querySelectorAll('.slot-group').forEach((group) => {
    const head = group.querySelector('.slot-group-head');
    if (!head) return;
    // Collapsed by default: 53 open cards buried everything below them.
    group.classList.add('collapsed');
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    head.setAttribute('aria-expanded', 'false');
    const toggle = () => {
      const collapsed = group.classList.toggle('collapsed');
      head.setAttribute('aria-expanded', String(!collapsed));
    };
    head.addEventListener('click', (e) => {
      if (e.target.closest('.slot-action-btn')) return;
      toggle();
    });
    head.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  // ── Jump to the AI consultant ─────────────────────────────
  const ai = document.querySelector('.ai-main, .ai-shell, #aiMessages');
  const taxonomy = document.querySelector('.slot-taxonomy');
  if (!ai || !taxonomy) return;

  const jump = document.createElement('button');
  jump.type = 'button';
  jump.setAttribute('data-app-control', '');
  jump.textContent = 'Ask the Brand AI ↓';
  jump.style.cssText =
    'margin-left:auto;padding:6px 12px;border:1px solid rgba(20,176,160,.35);' +
    'border-radius:999px;background:rgba(20,176,160,.08);color:var(--teal,#14B0A0);' +
    'font-size:12px;cursor:pointer;flex:0 0 auto';
  jump.addEventListener('click', () => {
    ai.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const input = document.getElementById('aiInput');
    if (input) setTimeout(() => input.focus(), 400);
  });

  // Sit it in the taxonomy panel header so it is visible immediately.
  const header = taxonomy.previousElementSibling;
  const slot = header && header.classList.contains('panel-header') ? header : null;
  if (slot) slot.appendChild(jump);
  else taxonomy.parentNode.insertBefore(jump, taxonomy);

  // ── Collapse-all / expand-all ─────────────────────────────
  const bulk = document.createElement('button');
  bulk.type = 'button';
  bulk.setAttribute('data-app-control', '');
  bulk.textContent = 'Collapse all';
  bulk.style.cssText =
    'margin-left:8px;padding:6px 12px;border:1px solid rgba(255,255,255,.12);' +
    'border-radius:999px;background:transparent;color:var(--text-secondary,#8B9196);' +
    'font-size:12px;cursor:pointer;flex:0 0 auto';
  let collapsed = true;
  bulk.textContent = 'Expand all';
  bulk.addEventListener('click', () => {
    collapsed = !collapsed;
    document.querySelectorAll('.slot-group').forEach((g) => {
      g.classList.toggle('collapsed', collapsed);
      const h = g.querySelector('.slot-group-head');
      if (h) h.setAttribute('aria-expanded', String(!collapsed));
    });
    bulk.textContent = collapsed ? 'Expand all' : 'Collapse all';
  });
  if (slot) slot.appendChild(bulk);
});

// Keyboard activation for the sidebar rows that were pointer-only.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest && e.target.closest('[role="button"][tabindex="0"]');
  if (!el) return;
  e.preventDefault();
  el.click();
});

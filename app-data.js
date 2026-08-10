// ============================================================
// Deadreckoner — real data binding.
// Replaces hardcoded demo figures, table rows and slot states
// with live values. A new workspace yields a genuine empty
// canvas instead of a populated mockup.
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.deadreckonerDB || !window.deadreckonerDB.waitForSession) return;
  const client = window.deadreckonerDB.getClient();
  const session = await window.deadreckonerDB.waitForSession();
  if (!session || !session.user || !client) return;

  const wsId = session.user.app_metadata && session.user.app_metadata.workspace_id;
  const TOTAL_SLOTS = 53;
  const pad = (n) => String(n).padStart(2, '0');

  const c = { approved: 0, pending: 0, rejected: 0, open: 0, assigned: 0, resolved: 0 };
  const approvedSlots = new Set();

  if (wsId) {
    try {
      const [subs, reqs] = await Promise.all([
        client.from('asset_submissions').select('slot_id,status').eq('workspace_id', wsId),
        client.from('requests').select('status').eq('workspace_id', wsId)
      ]);
      (subs.data || []).forEach((r) => {
        if (r.status === 'approved') { c.approved++; approvedSlots.add(r.slot_id); }
        else if (r.status === 'pending') c.pending++;
        else if (r.status === 'rejected') c.rejected++;
      });
      (reqs.data || []).forEach((r) => {
        if (r.status === 'open') c.open++;
        else if (r.status === 'assigned') c.assigned++;
        else if (r.status === 'resolved') c.resolved++;
      });
    } catch (e) { /* zeros stand */ }
  }

  // ── 1. Stat cards, matched by visible label ───────────────
  const STAT_MAP = {
    'pending approvals': c.pending, 'pending requests': c.open,
    'approved assets': c.approved, 'approved requests': c.resolved,
    'rejected assets': c.rejected, 'pending screening': c.pending,
    'approved today': c.approved, 'rejected': c.rejected,
    'open requests': c.open, 'resolved (30d)': c.resolved
  };
  document.querySelectorAll('.panel-title, .stat-label').forEach((label) => {
    const key = (label.textContent || '').trim().toLowerCase();
    if (!(key in STAT_MAP)) return;
    const card = label.closest('.stat-card, .card, article, a');
    if (!card) return;
    const metric = card.querySelector('.stat-metric, .metric-value');
    if (metric) metric.textContent = pad(STAT_MAP[key]);
    card.querySelectorAll('.stat-trend, .stat-delta, .stat-change, .stat-compare').forEach((t) => t.remove());
    if (card.hasAttribute('aria-label')) card.setAttribute('aria-label', `${STAT_MAP[key]} ${key}`);
  });

  // ── 2. Maturity / slot totals ─────────────────────────────
  const filled = c.approved;
  const pct = Math.round((filled / TOTAL_SLOTS) * 100);
  document.querySelectorAll('.segment-value').forEach((el) => {
    const t = (el.textContent || '').trim();
    if (t === '06') el.textContent = pad(filled);
    else if (t === '53') el.textContent = String(TOTAL_SLOTS);
  });
  document.querySelectorAll('.segment-percent').forEach((el) => { el.textContent = pct + '%'; });
  document.querySelectorAll('#levelBarFill, .progress-fill').forEach((el) => { el.style.width = pct + '%'; });
  document.querySelectorAll('*').forEach((el) => {
    if (el.children.length === 0 && /^\s*6\s*\/\s*53\s*$/.test(el.textContent || '')) {
      el.textContent = `${filled} / ${TOTAL_SLOTS}`;
    }
  });

  // ── 3. Clear demo table rows, show honest empty states ────
  document.querySelectorAll('table tbody').forEach((tb) => {
    const cols = tb.closest('table').querySelectorAll('thead th').length || 6;
    tb.innerHTML =
      `<tr><td colspan="${cols}" style="padding:32px 14px;text-align:center;` +
      `color:var(--text-muted,#7A8087);font-size:13px;">Nothing here yet. ` +
      `Assets you upload will appear once submitted.</td></tr>`;
  });
  document.querySelectorAll('.requests-grid, .kanban-cards').forEach((grid) => {
    grid.innerHTML =
      `<p style="padding:28px 4px;color:var(--text-muted,#7A8087);font-size:13px;">` +
      `No requests yet.</p>`;
  });

  // ── 4. Reset slot cards to their true state ───────────────
  document.querySelectorAll('.slot-card').forEach((card) => {
    const id = card.dataset.slotId;
    const isApproved = approvedSlots.has(id);
    card.dataset.slotStatus = isApproved ? 'approved' : 'locked';
    card.classList.toggle('locked', !isApproved);
    const status = card.querySelector('.slot-card-status');
    if (status) status.textContent = isApproved ? 'Approved' : 'Not started';
    const dl = card.querySelector('.slot-action-btn.download');
    const up = card.querySelector('.slot-action-btn.upload');
    if (dl && !isApproved) dl.remove();
    if (up && isApproved) up.remove();
  });
  document.querySelectorAll('.slot-group').forEach((g) => {
    const total = g.querySelectorAll('.slot-card').length;
    const done = g.querySelectorAll('.slot-card:not(.locked)').length;
    const badge = g.querySelector('.slot-group-count');
    if (badge) badge.textContent = `${done} / ${total}`;
  });
  document.querySelectorAll('*').forEach((el) => {
    if (el.children.length === 0 && /slots filled$/.test((el.textContent || '').trim())) {
      el.textContent = `${filled} / ${TOTAL_SLOTS} slots filled`;
    }
  });

  // ── 5. Category depository + personal asset counts ────────
  document.querySelectorAll('.depository-count, .asset-count').forEach((el) => { el.textContent = '0'; });
  document.querySelectorAll('.depository-bar-fill, .category-bar-fill').forEach((el) => { el.style.width = '0%'; });

  // ── 6. Neutralise controls that have no behaviour yet ─────
  document.querySelectorAll('button:not([data-wired])').forEach((btn) => {
    if (btn.closest('[data-shell], .rf-shell, .slot-shell, .ob-shell, .aem-shell')) return;
    if (btn.id || btn.hasAttribute('aria-label') || btn.dataset.tab || btn.dataset.filter) return;
    const label = (btn.textContent || '').trim().toLowerCase();
    const wired = ['sign out','submit','cancel','close','upload','new request','approve','reject','filter','add request'];
    if (wired.some((w) => label.includes(w))) return;
    btn.setAttribute('disabled', '');
    btn.style.opacity = '0.35';
    btn.style.cursor = 'not-allowed';
    btn.title = 'Not available yet';
  });
});

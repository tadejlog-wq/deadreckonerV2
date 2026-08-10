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
    card.querySelectorAll('.delta-line, .stat-trend, .stat-delta, .stat-change, .stat-compare, .sparkline').forEach((t) => t.remove());
    if (card.hasAttribute('aria-label')) card.setAttribute('aria-label', `${STAT_MAP[key]} ${key}`);
  });


  // Fake trend deltas and sparklines are meaningless with no history —
  // remove any not caught alongside a matched stat card.
  document.querySelectorAll('.delta-line, .sparkline').forEach((el) => el.remove());
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

  // ── 7. Brand book: never present Deadreckoner's own identity as the
  //      customer's. Until they have approved brand assets, show an
  //      honest empty state instead of a populated demo brand book.
  const brandSections = ['sec-colour','sec-type','sec-logo','sec-spacing','sec-components','sec-voice'];
  const hasBrandData = c.approved > 0;
  if (document.getElementById('sec-hero') && !hasBrandData) {
    const EMPTY_COPY = {
      'sec-colour':    'Approve colour assets and your palette will be documented here automatically.',
      'sec-type':      'Approve typeface assets and your type system will appear here.',
      'sec-logo':      'Approve your logo assets to generate usage rules and clear-space guidance.',
      'sec-spacing':   'Your spacing scale will be documented here once your foundations are approved.',
      'sec-components':'Component standards are generated from your approved assets.',
      'sec-voice':     'Approve voice and tone assets to publish your writing standards here.'
    };
    brandSections.forEach((id) => {
      const sec = document.getElementById(id);
      if (!sec) return;
      // Keep the section heading; clear only the demo body beneath it.
      Array.from(sec.children).forEach((child) => {
        if (child.querySelector && child.querySelector('.section-title')) return;
        if (child.classList && child.classList.contains('section-head')) return;
        child.remove();
      });
      const msg = document.createElement('p');
      msg.style.cssText = 'padding:28px 4px;color:var(--text-muted,#7A8087);font-size:13px;max-width:560px;';
      msg.textContent = EMPTY_COPY[id] || 'Nothing approved for this section yet.';
      sec.appendChild(msg);
    });
  }

  // ── 8. Plan + trial status banner ─────────────────────────
  if (wsId) {
    try {
      const { data: plan } = await client
        .from('workspace_plan_status').select('*').eq('workspace_id', wsId).maybeSingle();
      if (plan) {
        const seatTxt = plan.seat_limit === null
          ? `${plan.seats_used} seats`
          : `${plan.seats_used} of ${plan.seat_limit} seats`;
        let msg = null;
        if (plan.trial_active) {
          const d = plan.trial_days_left;
          msg = `Trial — ${d} day${d === 1 ? '' : 's'} left · ${seatTxt}`;
        } else if (plan.plan === 'trial') {
          msg = `Your trial has ended · ${seatTxt}`;
        }
        if (msg) {
          const bar = document.createElement('div');
          bar.setAttribute('role', 'status');
          bar.style.cssText =
            'position:fixed;left:0;right:0;bottom:0;z-index:45;padding:9px 16px;' +
            'text-align:center;font-size:12px;letter-spacing:.02em;' +
            'background:rgba(20,176,160,.10);color:var(--teal,#14B0A0);' +
            'border-top:1px solid rgba(20,176,160,.28);backdrop-filter:blur(12px);';
          bar.innerHTML = msg +
            ' · <a href="index.html#pricing" style="color:inherit;text-decoration:underline;">View plans</a>';
          document.body.appendChild(bar);
        }
      }
    } catch (e) { /* plan table not migrated yet — skip silently */ }
  }

  // ── 9. Widget-specific clears (real class names, verified in markup) ──

  // Approvals page stat cards use their own class family.
  const APPROVAL_MAP = {
    'pending screening': c.pending, 'approved today': c.approved,
    'rejected': c.rejected, 'open requests': c.open, 'resolved (30d)': c.resolved
  };
  document.querySelectorAll('.approval-stat-label').forEach((label) => {
    const key = (label.textContent || '').trim().toLowerCase();
    const card = label.parentElement;
    if (!card) return;
    const val = card.querySelector('.approval-stat-value');
    if (val && key in APPROVAL_MAP) val.textContent = pad(APPROVAL_MAP[key]);
    card.querySelectorAll('.approval-stat-delta').forEach((d) => d.remove());
  });

  // Tab counters.
  const TAB_MAP = { screening: c.pending, 'open requests': c.open, assigned: c.assigned, resolved: c.resolved };
  document.querySelectorAll('.tab-count').forEach((el) => {
    const tab = el.closest('[data-tab], button, a');
    const label = tab ? (tab.textContent || '').replace(el.textContent || '', '').trim().toLowerCase() : '';
    for (const k in TAB_MAP) {
      if (label.startsWith(k)) { el.textContent = pad(TAB_MAP[k]); break; }
    }
  });

  // Dashboard brand-book widget: Deadreckoner's own palette and type were
  // being shown as the customer's. Clear until they have real approved assets.
  if (c.approved === 0) {
    document.querySelectorAll('.bb-palette-swatch').forEach((el) => {
      el.style.background = 'rgba(255,255,255,0.05)';
    });
    document.querySelectorAll('.bb-type-row').forEach((el) => el.remove());
  }
  document.querySelectorAll('.bb-count-val').forEach((el) => { el.textContent = '00 / 00'; });
  document.querySelectorAll('.dual-bar-pct-val, .dual-bar-pct-count').forEach((el) => { el.textContent = '0'; });
  document.querySelectorAll('.dual-bar-fill').forEach((el) => { el.style.width = '0%'; });

  // Governance + depository + personal asset rows are seeded demo files.
  ['.governance-row', '.depository-row', '.asset-row'].forEach((sel) => {
    const rows = document.querySelectorAll(sel);
    if (!rows.length) return;
    const parent = rows[0].parentElement;
    rows.forEach((r) => r.remove());
    if (parent && !parent.querySelector('[data-empty]')) {
      const p = document.createElement('p');
      p.setAttribute('data-empty', '');
      p.style.cssText = 'padding:22px 4px;color:var(--text-muted,#7A8087);font-size:13px;';
      p.textContent = 'Nothing yet.';
      parent.appendChild(p);
    }
  });
  document.querySelectorAll('.category-count').forEach((el) => { el.textContent = '0'; });

  // Pagination footers that claim rows we no longer show.
  document.querySelectorAll('*').forEach((el) => {
    if (el.children.length === 0 && /^Showing \d+ of \d+ assets$/.test((el.textContent || '').trim())) {
      el.textContent = 'Showing 0 of 0 assets';
    }
  });

  // ── 10. Brand identity radar reflects real category progress ──
  const radar = document.querySelector('.radar-svg, .radar-body svg');
  if (radar && c.approved === 0) {
    radar.querySelectorAll('polygon[fill], polyline, path[fill]').forEach((shape) => {
      const f = shape.getAttribute('fill');
      if (f && f !== 'none') { shape.setAttribute('fill', 'none'); }
      shape.setAttribute('opacity', '0.15');
    });
    radar.querySelectorAll('circle').forEach((dot) => {
      if (parseFloat(dot.getAttribute('r') || '0') <= 5) dot.setAttribute('opacity', '0.15');
    });
  }
});

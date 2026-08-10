// ============================================================
// Deadreckoner — shared interactive behaviours.
// Request detail + review, inline upload, inline request form,
// stat-card navigation, and topbar sign-out.
// ============================================================
(() => {
  const esc = (s) => { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; };

  // ── Shared modal shell ────────────────────────────────────
  function makeModal(id) {
    let back = document.getElementById(id);
    if (back) return back;
    back = document.createElement('div');
    back.id = id;
    back.style.cssText =
      'position:fixed;inset:0;z-index:130;display:none;place-items:center;' +
      'padding:24px;background:rgba(5,5,7,.72)';
    back.innerHTML =
      '<div class="dr-modal" role="dialog" aria-modal="true" style="' +
      'width:min(520px,100%);max-height:calc(100vh - 48px);overflow:auto;' +
      'background:rgba(22,22,28,0.94);backdrop-filter:blur(28px) saturate(160%) brightness(0.82);' +
      '-webkit-backdrop-filter:blur(28px) saturate(160%) brightness(0.82);' +
      'border:1px solid rgba(255,255,255,0.09);border-radius:8px;' +
      'box-shadow:0 24px 80px rgba(0,0,0,.55);color:#F2F4F5;' +
      'font-family:\'IBM Plex Sans\',sans-serif"></div>';
    document.body.appendChild(back);
    back.addEventListener('click', (e) => { if (e.target === back) close(back); });
    return back;
  }
  function open(back) { back.style.display = 'grid'; }
  function close(back) { back.style.display = 'none'; }
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('[id^="dr-"]').forEach((m) => { if (m.style.display === 'grid') close(m); });
  });

  const HEAD = (title) =>
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;' +
    'padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.09)">' +
    '<h2 style="margin:0;font-size:15px;font-weight:500">' + title + '</h2>' +
    '<button data-app-control data-close aria-label="Close" style="width:30px;height:30px;display:grid;' +
    'place-items:center;border:0;background:none;color:#8B9196;cursor:pointer;border-radius:6px;' +
    'font-size:18px;line-height:1">&times;</button></div>';

  const BTN = 'padding:9px 16px;border:1px solid rgba(255,255,255,0.12);border-radius:6px;' +
              'background:transparent;color:#F2F4F5;font-size:13px;cursor:pointer';
  const BTN_P = 'padding:9px 16px;border:1px solid #14B0A0;border-radius:6px;background:#14B0A0;' +
                'color:#07110f;font-weight:600;font-size:13px;cursor:pointer';

  function wireClose(back) {
    back.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => close(back)));
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const db = window.deadreckonerDB;
    const client = db && db.getClient ? db.getClient() : null;

    // ── 1. Sign out available in the topbar on every page ────
    const topbar = document.querySelector('.topbar');
    if (topbar && !topbar.querySelector('[data-topbar-signout]')) {
      const so = document.createElement('button');
      so.type = 'button';
      so.setAttribute('data-app-control', '');
      so.setAttribute('data-topbar-signout', '');
      so.setAttribute('aria-label', 'Sign out');
      so.title = 'Sign out';
      so.style.cssText =
        'display:grid;place-items:center;width:32px;height:32px;margin-left:8px;' +
        'border:1px solid rgba(255,255,255,0.09);border-radius:6px;background:transparent;' +
        'color:#8B9196;cursor:pointer;flex:0 0 auto';
      so.innerHTML =
        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
        'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>' +
        '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>';
      so.addEventListener('click', async () => {
        so.disabled = true;
        try { if (client) await client.auth.signOut(); } catch (e) {}
        window.location.replace('index.html');
      });
      topbar.appendChild(so);
    }

    // ── 2. Stat cards jump to the matching filtered view ─────
    const TARGET = {
      'pending approvals': 'approvals.html#panel-screening',
      'pending screening': 'approvals.html#panel-screening',
      'pending requests':  'approvals.html#panel-open',
      'open requests':     'approvals.html#panel-open',
      'approved assets':   'assets.html',
      'approved requests': 'approvals.html#panel-resolved',
      'resolved (30d)':    'approvals.html#panel-resolved',
      'rejected assets':   'approvals.html#panel-screening',
      'rejected':          'approvals.html#panel-screening'
    };
    document.querySelectorAll('.panel-title, .stat-label, .approval-stat-label').forEach((label) => {
      const key = (label.textContent || '').trim().toLowerCase();
      if (!(key in TARGET)) return;
      const card = label.closest('a, .stat-card, .card, article, div');
      if (!card || card.tagName === 'A') return;
      card.style.cursor = 'pointer';
      card.setAttribute('role', 'link');
      card.setAttribute('tabindex', '0');
      const go = () => { window.location.href = TARGET[key]; };
      card.addEventListener('click', go);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    });

    // ── 3. Upload asset — inline, no redirect ────────────────
    const upBack = makeModal('dr-upload');
    function renderUpload() {
      let files = [];
      upBack.firstElementChild.innerHTML =
        HEAD('Upload an asset for approval') +
        '<div style="padding:22px">' +
        '<p style="margin:0 0 14px;font-size:13px;color:#8B9196;line-height:1.5">' +
        'The file enters the screening queue and is classified before approval.</p>' +
        '<label for="drUpInput" style="display:block;border:1px dashed rgba(255,255,255,.16);' +
        'border-radius:8px;padding:26px;text-align:center;cursor:pointer;font-size:13px;color:#8B9196">' +
        'Click to choose files, or drop them here</label>' +
        '<input id="drUpInput" type="file" multiple style="display:none">' +
        '<div id="drUpList" style="display:flex;flex-direction:column;gap:6px;margin-top:10px"></div>' +
        '<p id="drUpMsg" style="margin:12px 0 0;font-size:12px;color:#8B9196"></p></div>' +
        '<div style="display:flex;justify-content:flex-end;gap:10px;padding:18px 22px;' +
        'border-top:1px solid rgba(255,255,255,0.09)">' +
        '<button data-app-control data-close style="' + BTN + '">Cancel</button>' +
        '<button data-app-control id="drUpSubmit" style="' + BTN_P + '">Submit for review</button></div>';
      wireClose(upBack);
      const input = upBack.querySelector('#drUpInput');
      const list  = upBack.querySelector('#drUpList');
      const msg   = upBack.querySelector('#drUpMsg');
      const zone  = upBack.querySelector('label[for="drUpInput"]');
      const draw = () => {
        list.innerHTML = files.map((f, i) =>
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 11px;' +
          'border:1px solid rgba(255,255,255,.08);border-radius:6px;font-size:12.5px">' +
          '<span>' + esc(f.name) + '</span>' +
          '<button data-app-control data-rm="' + i + '" aria-label="Remove" style="border:0;background:none;' +
          'color:#8B9196;cursor:pointer">&times;</button></div>').join('');
      };
      input.addEventListener('change', () => { files = files.concat(Array.from(input.files)); input.value=''; draw(); });
      ['dragover','dragenter'].forEach((ev) => zone.addEventListener(ev, (e) => {
        e.preventDefault(); zone.style.borderColor = '#14B0A0';
      }));
      zone.addEventListener('dragleave', () => { zone.style.borderColor = 'rgba(255,255,255,.16)'; });
      zone.addEventListener('drop', (e) => {
        e.preventDefault(); zone.style.borderColor = 'rgba(255,255,255,.16)';
        files = files.concat(Array.from(e.dataTransfer.files)); draw();
      });
      list.addEventListener('click', (e) => {
        const b = e.target.closest('[data-rm]');
        if (!b) return;
        files.splice(Number(b.dataset.rm), 1); draw();
      });
      upBack.querySelector('#drUpSubmit').addEventListener('click', async (e) => {
        if (!files.length) { msg.textContent = 'Choose at least one file first.'; return; }
        const btn = e.currentTarget;
        btn.disabled = true; btn.textContent = 'Submitting…';
        let ok = false;
        if (db && db.submitAssetSlot) {
          const r = await db.submitAssetSlot({
            slotId: 'unsorted', slotName: 'Unsorted upload', category: 'Uncategorised', files
          });
          ok = !r.error;
          if (r.error) msg.textContent = r.error;
        }
        btn.disabled = false; btn.textContent = 'Submit for review';
        if (ok) { msg.textContent = 'Submitted.'; setTimeout(() => { close(upBack); window.location.reload(); }, 900); }
      });
    }
    document.querySelectorAll('a, button').forEach((el) => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (t !== 'upload asset' && t !== 'upload asset ↗') return;
      el.addEventListener('click', (e) => { e.preventDefault(); renderUpload(); open(upBack); });
    });

    // ── 4. Submit a request — inline on any page ─────────────
    document.querySelectorAll('a, button').forEach((el) => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (!/^new request|^submit a request|^new request ↗/.test(t)) return;
      if (el.hasAttribute('data-open-request-form')) return;
      const rf = document.getElementById('rfBackdrop');
      if (!rf) return; // form only exists on approvals.html
      el.addEventListener('click', (e) => { e.preventDefault(); rf.classList.add('open'); });
    });

    // ── 5. Request detail + review ──────────────────────────
    const rBack = makeModal('dr-request');
    async function openRequest(id) {
      const all = window.__drRequests || [];
      const r = all.find((x) => x.id === id);
      if (!r) return;
      const role = db && db.getCurrentUserRole ? (await db.getCurrentUserRole()).role : null;
      const canAct = role === 'admin' || role === 'member';
      rBack.firstElementChild.innerHTML =
        HEAD('Request') +
        '<div style="padding:22px">' +
        '<p style="margin:0 0 4px;font-size:15px;font-weight:500">' + esc(r.title) + '</p>' +
        '<p style="margin:0 0 18px;font-size:12px;color:#8B9196">' + esc(r.type) +
        ' · ' + esc(r.priority) + ' priority · ' + esc(r.status) + '</p>' +
        '<div style="border-top:1px solid rgba(255,255,255,.08);padding-top:14px">' +
        '<p style="margin:0;font-size:13px;color:#c7c7cc;line-height:1.6">' +
        esc(r.description || 'No additional details provided.') + '</p></div>' +
        '<div id="drReqFiles" style="margin:16px 0 0"><p style="margin:0;font-size:12px;color:#8B9196">' +
        ((r.file_count || 0) === 0 ? 'No attached files.' : 'Loading attachments…') + '</p></div>' +
        '<p id="drReqMsg" style="margin:12px 0 0;font-size:12px;color:#8B9196"></p></div>' +
        '<div style="display:flex;justify-content:flex-end;gap:10px;padding:18px 22px;' +
        'border-top:1px solid rgba(255,255,255,0.09)">' +
        '<button data-app-control data-close style="' + BTN + '">Close</button>' +
        (canAct && r.status !== 'resolved'
          ? (r.status !== 'assigned'
              ? '<button data-app-control data-act="assigned" style="' + BTN + '">Assign to me</button>'
              : '') +
            '<button data-app-control data-act="resolved" style="' + BTN_P + '">Mark resolved</button>'
          : '') +
        '</div>';
      wireClose(rBack);

      // Fetch attachment metadata and expose signed download links.
      if ((r.file_count || 0) > 0 && client) {
        (async () => {
          const holder = rBack.querySelector('#drReqFiles');
          try {
            const { data: atts } = await client.from('request_attachments')
              .select('file_name,storage_path,size_bytes').eq('request_id', r.id);
            if (!atts || !atts.length) {
              holder.innerHTML = '<p style="margin:0;font-size:12px;color:#8B9196">No attached files.</p>';
              return;
            }
            holder.innerHTML =
              '<p style="margin:0 0 8px;font-size:12px;color:#8B9196">Attachments</p>' +
              '<div style="display:flex;flex-direction:column;gap:6px">' +
              atts.map((a, i) =>
                '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;' +
                'padding:8px 11px;border:1px solid rgba(255,255,255,.08);border-radius:6px;font-size:12.5px">' +
                '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(a.file_name) + '</span>' +
                '<button data-app-control data-dl="' + i + '" style="border:1px solid rgba(20,176,160,.4);' +
                'background:rgba(20,176,160,.08);color:#14B0A0;border-radius:5px;padding:4px 10px;' +
                'font-size:11.5px;cursor:pointer;flex:0 0 auto">Download</button></div>').join('') + '</div>';
            holder.addEventListener('click', async (ev) => {
              const b = ev.target.closest('[data-dl]');
              if (!b) return;
              const a = atts[Number(b.dataset.dl)];
              b.disabled = true; b.textContent = '...';
              const { data: signed, error } = await client.storage
                .from('request-attachments').createSignedUrl(a.storage_path, 60);
              b.disabled = false; b.textContent = 'Download';
              if (error || !signed) { b.textContent = 'Unavailable'; return; }
              window.open(signed.signedUrl, '_blank');
            });
          } catch (e) {
            holder.innerHTML = '<p style="margin:0;font-size:12px;color:#8B9196">Could not load attachments.</p>';
          }
        })();
      }

      rBack.querySelectorAll('[data-act]').forEach((b) => {
        b.addEventListener('click', async () => {
          const msg = rBack.querySelector('#drReqMsg');
          b.disabled = true; msg.textContent = 'Saving…';
          const res = await db.updateRequestStatus(r.id, b.dataset.act);
          if (res.error) { msg.textContent = res.error; b.disabled = false; return; }
          msg.textContent = 'Updated.';
          setTimeout(() => { close(rBack); window.location.reload(); }, 700);
        });
      });
      open(rBack);
    }
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.request-card[data-request-id], .kanban-card[data-request-id]');
      if (!card) return;
      openRequest(card.dataset.requestId);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const card = e.target.closest && e.target.closest('.request-card[data-request-id]');
      if (card) openRequest(card.dataset.requestId);
    });

    // ── 6. Screening submissions: review + download ─────────
    const sBack = makeModal('dr-submission');
    async function openSubmission(id) {
      const all = window.__drSubmissions || [];
      const s = all.find((x) => x.id === id);
      if (!s || !client) return;
      const role = db && db.getCurrentUserRole ? (await db.getCurrentUserRole()).role : null;
      const isAdmin = role === 'admin';
      sBack.firstElementChild.innerHTML =
        HEAD('Asset submission') +
        '<div style="padding:22px">' +
        '<p style="margin:0 0 4px;font-size:15px;font-weight:500">' + esc(s.slot_name || 'Untitled') + '</p>' +
        '<p style="margin:0 0 16px;font-size:12px;color:#8B9196">' +
        esc(s.category || 'Uncategorised') + ' &middot; ' + esc(s.status) + '</p>' +
        '<div id="drSubFiles"><p style="margin:0;font-size:12px;color:#8B9196">Loading files…</p></div>' +
        '<p id="drSubMsg" style="margin:12px 0 0;font-size:12px;color:#8B9196"></p></div>' +
        '<div style="display:flex;justify-content:flex-end;gap:10px;padding:18px 22px;' +
        'border-top:1px solid rgba(255,255,255,0.09)">' +
        '<button data-app-control data-close style="' + BTN + '">Close</button>' +
        (isAdmin && s.status === 'pending'
          ? '<button data-app-control data-sub="rejected" style="' + BTN + '">Reject</button>' +
            '<button data-app-control data-sub="approved" style="' + BTN_P + '">Approve</button>'
          : '') + '</div>';
      wireClose(sBack);

      (async () => {
        const holder = sBack.querySelector('#drSubFiles');
        try {
          const { data: files } = await client.from('asset_submission_files')
            .select('file_name,storage_path,size_bytes').eq('submission_id', s.id);
          if (!files || !files.length) {
            holder.innerHTML = '<p style="margin:0;font-size:12px;color:#8B9196">No files attached.</p>';
            return;
          }
          holder.innerHTML =
            '<p style="margin:0 0 8px;font-size:12px;color:#8B9196">Files</p>' +
            '<div style="display:flex;flex-direction:column;gap:6px">' +
            files.map((f, i) =>
              '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;' +
              'padding:8px 11px;border:1px solid rgba(255,255,255,.08);border-radius:6px;font-size:12.5px">' +
              '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(f.file_name) + '</span>' +
              '<button data-app-control data-dl="' + i + '" style="border:1px solid rgba(20,176,160,.4);' +
              'background:rgba(20,176,160,.08);color:#14B0A0;border-radius:5px;padding:4px 10px;' +
              'font-size:11.5px;cursor:pointer;flex:0 0 auto">Download</button></div>').join('') + '</div>';
          holder.addEventListener('click', async (ev) => {
            const b = ev.target.closest('[data-dl]');
            if (!b) return;
            const f = files[Number(b.dataset.dl)];
            b.disabled = true; b.textContent = '...';
            const { data: signed, error } = await client.storage
              .from('asset-submissions').createSignedUrl(f.storage_path, 60);
            b.disabled = false; b.textContent = 'Download';
            if (error || !signed) { b.textContent = 'Unavailable'; return; }
            window.open(signed.signedUrl, '_blank');
          });
        } catch (e) {
          holder.innerHTML = '<p style="margin:0;font-size:12px;color:#8B9196">Could not load files.</p>';
        }
      })();

      sBack.querySelectorAll('[data-sub]').forEach((b) => {
        b.addEventListener('click', async () => {
          const msg = sBack.querySelector('#drSubMsg');
          b.disabled = true; msg.textContent = 'Saving…';
          const { error } = await client.from('asset_submissions')
            .update({ status: b.dataset.sub }).eq('id', s.id);
          if (error) { msg.textContent = error.message; b.disabled = false; return; }
          if (db.logEvent) db.logEvent('asset_submission.' + b.dataset.sub,
            { entityType: 'asset_submission', entityId: s.id });
          msg.textContent = 'Updated.';
          setTimeout(() => { close(sBack); window.location.reload(); }, 700);
        });
      });
      open(sBack);
    }

    document.addEventListener('click', async (e) => {
      const approve = e.target.closest('[data-sub-approve]');
      const reject  = e.target.closest('[data-sub-reject]');
      if (approve || reject) {
        e.stopPropagation();
        const btn = approve || reject;
        const id = btn.dataset.subApprove || btn.dataset.subReject;
        btn.disabled = true;
        const { error } = await client.from('asset_submissions')
          .update({ status: approve ? 'approved' : 'rejected' }).eq('id', id);
        if (!error) window.location.reload(); else btn.disabled = false;
        return;
      }
      const row = e.target.closest('.submission-row[data-submission-id]');
      if (row) openSubmission(row.dataset.submissionId);
    });
  });
})();

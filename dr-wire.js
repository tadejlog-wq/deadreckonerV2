// Supplies real data to the folder + template components and handles their events.
document.addEventListener('DOMContentLoaded', async () => {
  const db = window.deadreckonerDB;

  // ── Templates (static catalogue) ──────────────────────────
  if (document.getElementById('dr-templates')) {
    window.drTemplates = [
      { id: 'presentation', name: 'Presentation', items: [
        { id: 'slide-standard', name: 'Standard slide', wireframe: 'presentation' },
        { id: 'slide-data',     name: 'Data slide',     wireframe: 'presentation' } ] },
      { id: 'social', name: 'Social media', items: [
        { id: 'ig-square', name: 'Square post',  wireframe: 'social' },
        { id: 'ig-story',  name: 'Story',        wireframe: 'poster' } ] },
      { id: 'signature', name: 'Email signature', items: [
        { id: 'sig-standard', name: 'Standard signature', wireframe: 'signature' } ] },
      { id: 'print', name: 'Print / OOH', items: [
        { id: 'poster-a2', name: 'Poster',    wireframe: 'poster' },
        { id: 'ooh-board', name: 'Billboard', wireframe: 'social' } ] },
      { id: 'pitch', name: 'Pitch deck', items: [
        { id: 'pitch-cover', name: 'Cover slide', wireframe: 'pitch' } ] },
      { id: 'document', name: 'Document', items: [
        { id: 'letterhead', name: 'Letterhead', wireframe: 'letterhead' } ] }
    ];
    if (window.drRenderTemplates) window.drRenderTemplates();
  }

  // Choosing a template drops a prompt into the AI chat rather than
  // silently doing nothing.
  document.addEventListener('dr:template-chosen', (e) => {
    const d = e.detail || {};
    const input = document.getElementById('aiInput');
    if (!input) return;
    input.value = `Generate a ${d.name || 'template'} from my approved brand assets.`;
    input.focus();
    const chat = document.querySelector('.ai-main, #aiMessages');
    if (chat) chat.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // ── Folders (real data from the database) ─────────────────
  const mount = document.getElementById('dr-folders');
  if (mount && db && db.waitForSession) {
    const client = db.getClient();
    const session = await db.waitForSession();
    const CATS = ['Logo Usage','Color','Typography','Photography','Iconography',
                  'Illustration','Voice & Tone','Templates','Motion','Audio','3D Assets'];
    const byCat = {};
    CATS.forEach((c) => { byCat[c] = []; });

    if (session && client) {
      const wsId = session.user.app_metadata && session.user.app_metadata.workspace_id;
      if (wsId) {
        try {
          const { data: subs } = await client.from('asset_submissions')
            .select('id,category').eq('workspace_id', wsId);
          const ids = (subs || []).map((s) => s.id);
          const catOf = {};
          (subs || []).forEach((s) => { catOf[s.id] = s.category; });
          if (ids.length) {
            const { data: files } = await client.from('asset_submission_files')
              .select('submission_id,file_name,storage_path,size_bytes').in('submission_id', ids);
            for (const f of (files || [])) {
              const cat = catOf[f.submission_id] || 'Templates';
              if (!byCat[cat]) byCat[cat] = [];
              let url = '#';
              try {
                const { data: signed } = await client.storage
                  .from('asset-submissions').createSignedUrl(f.storage_path, 3600);
                if (signed) url = signed.signedUrl;
              } catch (e) { /* leave placeholder */ }
              byCat[cat].push({ name: f.file_name, size: f.size_bytes || 0, url });
            }
          }
        } catch (e) { /* empty folders */ }
      }
    }
    window.drFolders = CATS.map((c) => ({ id: c.toLowerCase().replace(/\W+/g,'-'), name: c, files: byCat[c] || [] }));
    if (window.drRenderFolders) window.drRenderFolders();
  }

  // "Generate assets" from an empty folder goes to the AI generator.
  document.addEventListener('dr:generate-assets', () => {
    window.location.href = 'assets.html';
  });
});

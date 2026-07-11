// ============================================================
// InboxPage — Halaman penuh Inbox (bukan modal)
// Tampilkan daftar + detail isi pesan
// ============================================================

const InboxPage = (() => {

  let _messages  = [];
  let _activeId  = null;

  const TIPE_INFO = {
    INFO:      { icon: 'ℹ️', label: 'Info',             color: '#1A3FAA', bg: '#EFF6FF' },
    APPROVAL:  { icon: '✅', label: 'Perlu Approval',   color: '#059669', bg: '#ECFDF5' },
    RESERVASI: { icon: '📋', label: 'Reservasi Baru',   color: '#D97706', bg: '#FFFBEB' },
    OPNAME:    { icon: '📊', label: 'Opname',           color: '#7C3AED', bg: '#F5F3FF' },
    RETUR:     { icon: '↩️', label: 'Retur Request',    color: '#DC2626', bg: '#FEF2F2' },
    SYSTEM:    { icon: '⚙️', label: 'Sistem',           color: '#475569', bg: '#F8FAFC' },
    LAPORAN:   { icon: '📈', label: 'Laporan',          color: '#0891B2', bg: '#ECFEFF' },
  };

  function mount() {
    const page = document.getElementById('page-inbox');
    if (!page) return;

    page.innerHTML = `
      <div style="display:grid;grid-template-columns:320px 1fr;gap:0;height:calc(100vh - 120px);border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--card)">

        <!-- Panel kiri: daftar inbox -->
        <div style="border-right:1px solid var(--border);display:flex;flex-direction:column">
          <!-- Header daftar -->
          <div style="padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
            <div style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700">Inbox</div>
            <button class="btn btn-outline btn-sm" onclick="InboxPage.markAll()" title="Tandai semua dibaca">✓ Baca Semua</button>
          </div>

          <!-- Filter tipe -->
          <div style="padding:10px 12px;border-bottom:1px solid var(--border);display:flex;gap:6px;flex-wrap:wrap">
            <button class="inbox-filter-btn active" data-tipe="" onclick="InboxPage.filter('')">Semua</button>
            <button class="inbox-filter-btn" data-tipe="APPROVAL" onclick="InboxPage.filter('APPROVAL')">Approval</button>
            <button class="inbox-filter-btn" data-tipe="RESERVASI" onclick="InboxPage.filter('RESERVASI')">Reservasi</button>
            <button class="inbox-filter-btn" data-tipe="OPNAME" onclick="InboxPage.filter('OPNAME')">Opname</button>
            <button class="inbox-filter-btn" data-tipe="LAPORAN" onclick="InboxPage.filter('LAPORAN')">Laporan</button>
          </div>
          <style>
            .inbox-filter-btn{background:none;border:1.5px solid var(--border);border-radius:20px;padding:4px 10px;font-size:11.5px;font-weight:600;color:var(--muted);cursor:pointer;transition:all .15s}
            .inbox-filter-btn.active,.inbox-filter-btn:hover{background:var(--primary);color:#fff;border-color:var(--primary)}
          </style>

          <!-- List -->
          <div id="inboxPageList" style="flex:1;overflow-y:auto"></div>
        </div>

        <!-- Panel kanan: detail -->
        <div id="inboxPageDetail" style="display:flex;flex-direction:column;overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted)">
            <div style="text-align:center">
              <div style="font-size:48px;margin-bottom:12px;opacity:.3">📬</div>
              <div style="font-size:14px">Pilih pesan untuk membaca</div>
            </div>
          </div>
        </div>

      </div>`;

    page.setAttribute('data-mounted', '1');
    load();
  }

  async function load(filterTipe = '') {
    const listEl = document.getElementById('inboxPageList');
    if (!listEl) return;
    listEl.innerHTML = '<div class="empty-state" style="padding:32px"><p>Memuat...</p></div>';

    const res = await apiCall('getInbox', { limit: 100 });
    if (!res?.success) {
      listEl.innerHTML = `<div class="empty-state" style="padding:32px"><p>Gagal memuat inbox.</p></div>`;
      return;
    }

    _messages = res.data || [];
    _renderList(filterTipe);
  }

  function _renderList(filterTipe = '') {
    const listEl = document.getElementById('inboxPageList');
    if (!listEl) return;

    let msgs = _messages;
    if (filterTipe) msgs = msgs.filter(m => m.tipe === filterTipe);

    if (!msgs.length) {
      listEl.innerHTML = '<div class="empty-state" style="padding:32px"><p>Tidak ada pesan.</p></div>';
      return;
    }

    listEl.innerHTML = msgs.map(m => {
      const info    = TIPE_INFO[m.tipe] || TIPE_INFO.INFO;
      const isRead  = m.isRead === true;
      const isActive = _activeId === m.id;
      return `
        <div id="inboxItem_${m.id}" onclick="InboxPage.openMsg('${m.id}')"
          style="padding:12px 16px;border-bottom:1px solid #F3F4F6;cursor:pointer;
                 background:${isActive ? '#EFF6FF' : isRead ? '#fff' : '#F8FBFF'};
                 border-left:3px solid ${isActive ? 'var(--primary)' : 'transparent'};
                 transition:background .1s"
          onmouseover="if('${m.id}'!=='${_activeId}') this.style.background='#F8F9FB'"
          onmouseout="if('${m.id}'!=='${_activeId}') this.style.background='${isRead ? '#fff' : '#F8FBFF'}'">
          <div style="display:flex;gap:10px;align-items:flex-start">
            <div style="width:34px;height:34px;border-radius:8px;background:${info.bg};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${info.icon}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                ${!isRead ? '<div style="width:7px;height:7px;border-radius:50%;background:var(--primary);flex-shrink:0"></div>' : ''}
                <div style="font-size:13px;font-weight:${isRead ? '500' : '700'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.judul}</div>
              </div>
              <div style="font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.isi?.substring(0, 60)}...</div>
              <div style="font-size:10.5px;color:#9CA3AF;margin-top:3px">${m.tanggal ? new Date(m.tanggal).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}</div>
            </div>
            <button onclick="event.stopPropagation();InboxPage.deleteMsg('${m.id}')"
              style="background:none;border:none;cursor:pointer;color:#D1D5DB;font-size:14px;padding:2px;flex-shrink:0;line-height:1"
              onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='#D1D5DB'">✕</button>
          </div>
        </div>`;
    }).join('');
  }

  async function openMsg(id) {
    _activeId = id;
    _renderList(document.querySelector('.inbox-filter-btn.active')?.dataset.tipe || '');

    const msg = _messages.find(m => m.id === id);
    if (!msg) return;

    // Mark as read
    if (!msg.isRead) {
      await apiCall('markInboxRead', { inboxId: id });
      msg.isRead = true;
      if (typeof InboxModule !== 'undefined') InboxModule.refreshUnread();
    }

    const info      = TIPE_INFO[msg.tipe] || TIPE_INFO.INFO;
    const detailEl  = document.getElementById('inboxPageDetail');
    if (!detailEl) return;

    // Render isi pesan berdasarkan tipe
    const bodyContent = _renderMsgBody(msg);

    detailEl.innerHTML = `
      <div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div style="display:flex;gap:12px;align-items:center;min-width:0">
          <div style="width:44px;height:44px;border-radius:10px;background:${info.bg};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${info.icon}</div>
          <div>
            <div style="font-family:'DM Sans',sans-serif;font-size:16px;font-weight:700;line-height:1.3">${msg.judul}</div>
            <div style="font-size:12.5px;color:var(--muted);margin-top:2px">${msg.tanggal ? new Date(msg.tanggal).toLocaleString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}</div>
          </div>
        </div>
        <button onclick="InboxPage.deleteMsg('${msg.id}')"
          style="background:none;border:1.5px solid var(--border);border-radius:7px;padding:5px 10px;cursor:pointer;font-size:12.5px;color:var(--muted);white-space:nowrap;transition:border-color .15s,color .15s"
          onmouseover="this.style.borderColor='var(--danger)';this.style.color='var(--danger)'"
          onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">Hapus</button>
      </div>
      <div style="flex:1;overflow-y:auto;padding:24px">${bodyContent}</div>`;
  }

  // ── Render isi pesan berdasarkan tipe ──
  function _renderMsgBody(msg) {
    const isi = msg.isi || '';
    const lines = isi.split('\n').filter(Boolean);

    // Semua tipe: render isi as text + target link
    const baseContent = `
      <div style="font-size:14px;line-height:1.8;color:var(--text);white-space:pre-line;margin-bottom:20px">${isi}</div>
      ${msg.idTarget && msg.idTarget !== 'OPNAME-REQ' ? `
        <div style="background:#F8F9FB;border-radius:8px;padding:12px 14px;font-size:12.5px;color:var(--muted);margin-bottom:16px">
          ID Terkait: <strong style="font-family:monospace;color:var(--text)">${msg.idTarget}</strong>
        </div>` : ''}`;

    // Action buttons berdasarkan tipe
    let actions = '';
    const role = Session.getUser()?.roleId;

    if (msg.tipe === 'APPROVAL' && ['R-01','R-02'].includes(role)) {
      actions = `
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="navigateTo('harian','Dashboard Harian');InboxPage._markRead('${msg.id}')">
            → Buka Halaman Terkait
          </button>
        </div>`;
    } else if (msg.tipe === 'RESERVASI' && ['R-01','R-02','R-04'].includes(role)) {
      actions = `
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="navigateTo('harian','Dashboard Harian')">
            → Kelola Reservasi
          </button>
        </div>`;
    } else if (msg.tipe === 'OPNAME') {
      actions = `
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="navigateTo('opname','Stock Opname')">
            → Buka Halaman Opname
          </button>
        </div>`;
    } else if (msg.tipe === 'LAPORAN' && msg.idTarget?.startsWith('http')) {
      actions = `
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <a href="${msg.idTarget}" target="_blank" class="btn btn-primary">📥 Download Laporan Excel</a>
        </div>`;
    } else if (msg.tipe === 'RETUR') {
      actions = `
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="navigateTo('harian','Dashboard Harian')">
            → Proses Retur Request
          </button>
        </div>`;
    }

    return baseContent + (actions ? `<div>${actions}</div>` : '');
  }

  function filter(tipe) {
    document.querySelectorAll('.inbox-filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tipe === tipe);
    });
    _activeId = null;
    _renderList(tipe);

    // Reset detail panel
    const detailEl = document.getElementById('inboxPageDetail');
    if (detailEl) {
      detailEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted)">
          <div style="text-align:center">
            <div style="font-size:48px;margin-bottom:12px;opacity:.3">📬</div>
            <div style="font-size:14px">Pilih pesan untuk membaca</div>
          </div>
        </div>`;
    }
  }

  async function markAll() {
    await apiCall('markAllInboxRead', {});
    _messages.forEach(m => { m.isRead = true; });
    _renderList(document.querySelector('.inbox-filter-btn.active')?.dataset.tipe || '');
    if (typeof InboxModule !== 'undefined') InboxModule.refreshUnread();
    showToast('Semua pesan ditandai sudah dibaca.', 'success');
  }

  async function deleteMsg(id) {
    await apiCall('deleteInbox', { inboxId: id });
    _messages = _messages.filter(m => m.id !== id);
    if (_activeId === id) {
      _activeId = null;
      const detailEl = document.getElementById('inboxPageDetail');
      if (detailEl) detailEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted)"><div style="text-align:center"><div style="font-size:48px;margin-bottom:12px;opacity:.3">📬</div><div style="font-size:14px">Pilih pesan untuk membaca</div></div></div>`;
    }
    _renderList(document.querySelector('.inbox-filter-btn.active')?.dataset.tipe || '');
    if (typeof InboxModule !== 'undefined') InboxModule.refreshUnread();
  }

  function _markRead(id) {
    const msg = _messages.find(m => m.id === id);
    if (msg) msg.isRead = true;
  }

  return { mount, load, openMsg, filter, markAll, deleteMsg };
})();

// ============================================================
// inbox.js — Sistem Inbox Internal Staff
// ============================================================

const InboxModule = (() => {

  let _unread  = 0;
  let _polling = null;

  // ── Init: pasang badge di sidebar + mulai polling ──
  function init() {
    _injectInboxButton();
    refreshUnread();
    // Poll unread count setiap 60 detik
    _polling = setInterval(refreshUnread, 60000);
  }

  function destroy() {
    if (_polling) clearInterval(_polling);
  }

  // ── Inject tombol inbox ke topbar ──
  function _injectInboxButton() {
    const topbar = document.querySelector('.topbar');
    if (!topbar || document.getElementById('inboxBtn')) return;

    const btn = document.createElement('button');
    btn.id        = 'inboxBtn';
    btn.title     = 'Inbox';
    btn.onclick   = openInbox;
    btn.style.cssText = `
      position:relative;background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.2);
      border-radius:8px;padding:7px 10px;cursor:pointer;display:flex;align-items:center;
      gap:6px;color:#fff;font-size:13px;font-weight:600;transition:background .15s;`;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span id="inboxBadge" style="display:none;position:absolute;top:-6px;right:-6px;background:#E8B800;color:#1C1C2E;font-size:10px;font-weight:700;min-width:18px;height:18px;border-radius:20px;display:none;align-items:center;justify-content:center;padding:0 4px"></span>`;

    // Masukkan sebelum topbar-time
    const timeEl = document.getElementById('topbarTime');
    topbar.insertBefore(btn, timeEl);
  }

  // ── Refresh unread count ──
  async function refreshUnread() {
    const res = await apiCall('getUnreadCount', {});
    if (!res?.success) return;
    _unread = res.count || 0;
    _updateBadge();
  }

  function _updateBadge() {
    const badge = document.getElementById('inboxBadge');
    if (!badge) return;
    if (_unread > 0) {
      badge.textContent    = _unread > 99 ? '99+' : _unread;
      badge.style.display  = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // ── Buka modal inbox ──
  async function openInbox() {
    // Buat modal kalau belum ada
    if (!document.getElementById('modalInbox')) {
      const m = document.createElement('div');
      m.className = 'modal-overlay';
      m.id = 'modalInbox';
      m.style.cssText = 'z-index:250';
      m.innerHTML = `
        <div class="modal" style="max-width:520px;max-height:80vh;display:flex;flex-direction:column">
          <div class="modal-header">
            <h3>📬 Inbox</h3>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn btn-outline btn-sm" id="btnMarkAllRead" onclick="InboxModule.markAllRead()">Tandai Semua Dibaca</button>
              <button class="modal-close" onclick="document.getElementById('modalInbox').classList.remove('show')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          <div style="overflow-y:auto;flex:1" id="inboxList">
            <div class="empty-state" style="padding:40px"><p>Memuat...</p></div>
          </div>
        </div>`;
      m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
      document.body.appendChild(m);
    }

    document.getElementById('modalInbox').classList.add('show');
    await loadInboxList();
  }

  async function loadInboxList() {
    const list = document.getElementById('inboxList');
    if (!list) return;

    const res = await apiCall('getInbox', { limit: 50 });
    if (!res?.success || !res.data?.length) {
      list.innerHTML = `<div class="empty-state" style="padding:40px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;opacity:.2;margin-bottom:12px"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <p>Inbox kosong.</p></div>`;
      return;
    }

    const tipeIcon = { INFO:'ℹ️', APPROVAL:'✅', RESERVASI:'📋', OPNAME:'📊', RETUR:'↩️', SYSTEM:'⚙️' };
    const tipeBg   = { INFO:'#EFF6FF', APPROVAL:'#ECFDF5', RESERVASI:'#FFF7ED', OPNAME:'#F5F3FF', RETUR:'#FEF2F2', SYSTEM:'#F8FAFC' };

    list.innerHTML = res.data.map(m => `
      <div id="inbox_${m.id}" onclick="InboxModule.openDetail('${m.id}')"
        style="padding:14px 20px;border-bottom:1px solid var(--border);cursor:pointer;
               background:${m.isRead ? '#fff' : '#F0F6FF'};transition:background .1s"
        onmouseover="this.style.background='#F8F9FB'"
        onmouseout="this.style.background='${m.isRead ? '#fff' : '#F0F6FF'}'">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="width:38px;height:38px;border-radius:10px;background:${tipeBg[m.tipe]||'#F8FAFC'};
               display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
            ${tipeIcon[m.tipe] || 'ℹ️'}
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
              ${!m.isRead ? '<div style="width:7px;height:7px;border-radius:50%;background:var(--primary);flex-shrink:0"></div>' : ''}
              <div style="font-size:13.5px;font-weight:${m.isRead ? '500' : '700'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.judul}</div>
            </div>
            <div style="font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.isi}</div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:4px">${m.tanggal ? new Date(m.tanggal).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}</div>
          </div>
          <button onclick="event.stopPropagation();InboxModule.deleteMsg('${m.id}')"
            style="background:none;border:none;cursor:pointer;color:#9CA3AF;font-size:16px;padding:2px 4px;flex-shrink:0"
            title="Hapus">✕</button>
        </div>
      </div>`).join('');
  }

  async function openDetail(inboxId) {
    // Mark as read
    await apiCall('markInboxRead', { inboxId });
    const el = document.getElementById('inbox_' + inboxId);
    if (el) el.style.background = '#fff';
    _unread = Math.max(0, _unread - 1);
    _updateBadge();

    // Get detail dari list yang sudah ada
    const res = await apiCall('getInbox', { limit: 50 });
    const msg = res?.data?.find(m => m.id === inboxId);
    if (!msg) return;

    // Buat modal detail
    const existing = document.getElementById('modalInboxDetail');
    if (existing) existing.remove();

    const tipeIcon = { INFO:'ℹ️', APPROVAL:'✅', RESERVASI:'📋', OPNAME:'📊', RETUR:'↩️', SYSTEM:'⚙️' };
    const m2 = document.createElement('div');
    m2.className = 'modal-overlay show';
    m2.id = 'modalInboxDetail';
    m2.style.cssText = 'z-index:260';
    m2.innerHTML = `
      <div class="modal" style="max-width:460px">
        <div class="modal-header">
          <h3>${tipeIcon[msg.tipe] || 'ℹ️'} ${msg.judul}</h3>
          <button class="modal-close" onclick="document.getElementById('modalInboxDetail').remove()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div style="font-size:11.5px;color:var(--muted);margin-bottom:12px">
            ${msg.tanggal ? new Date(msg.tanggal).toLocaleString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}
          </div>
          <div style="font-size:14px;line-height:1.7;color:var(--text)">${msg.isi}</div>
          ${msg.idTarget ? `<div style="margin-top:16px;padding:10px 14px;background:var(--bg);border-radius:8px;font-size:12.5px;color:var(--muted)">ID Terkait: <strong style="font-family:monospace">${msg.idTarget}</strong></div>` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalInboxDetail').remove()">Tutup</button>
          ${msg.idTarget && ['RESERVASI','APPROVAL','OPNAME','RETUR'].includes(msg.tipe) ?
            `<button class="btn btn-primary" onclick="document.getElementById('modalInboxDetail').remove();document.getElementById('modalInbox').classList.remove('show');navigateTo('${_getTargetPage(msg.tipe)}','${msg.judul}')">Buka →</button>` : ''}
        </div>
      </div>`;
    m2.addEventListener('click', e => { if (e.target === m2) m2.remove(); });
    document.body.appendChild(m2);
  }

  function _getTargetPage(tipe) {
    const map = { RESERVASI:'harian', APPROVAL:'harian', OPNAME:'opname', RETUR:'harian' };
    return map[tipe] || 'dashboard';
  }

  async function markAllRead() {
    await apiCall('markAllInboxRead', {});
    _unread = 0;
    _updateBadge();
    await loadInboxList();
    showToast('Semua inbox ditandai sudah dibaca.', 'success');
  }

  async function deleteMsg(inboxId) {
    await apiCall('deleteInbox', { inboxId });
    await loadInboxList();
    await refreshUnread();
  }

  return { init, destroy, openInbox, openDetail, markAllRead, deleteMsg, refreshUnread, get _unreadCount() { return _unread; } };
})();

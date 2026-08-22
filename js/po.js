// ============================================================
// po.js — PO management + Tmp Inventory cek fisik
// ============================================================

const POPage = (() => {

  let _invHeaders = []; // cache inventory list untuk dropdown
  let _tmpItems   = []; // cache tmp inventory list

  // ── Mount HTML ──
  function mount() {
    const page = document.getElementById('page-po');
    page.innerHTML = `
      <!-- Tab nav -->
      <div style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid var(--border)">
        <button class="po-tab active" data-tab="list" onclick="POPage.switchTab('list')">Daftar PO</button>
        <button class="po-tab" data-tab="buat" onclick="POPage.switchTab('buat')">Buat PO</button>
        <button class="po-tab" data-tab="tmp" onclick="POPage.switchTab('tmp')">Cek Fisik Barang</button>
      </div>
      <style>
        .po-tab{background:none;border:none;padding:10px 20px;font-size:13.5px;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color .15s,border-color .15s}
        .po-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
        .po-tab:hover{color:var(--text)}
      </style>

      <!-- TAB: Daftar PO -->
      <div id="poTabList">
        <div class="section-card">
          <div class="section-head">
            <h2>Daftar Purchase Order</h2>
            <div style="display:flex;gap:8px">
              <select id="poFilterStatus" style="border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px">
                <option value="">Semua Status</option>
                <option value="Menunggu Approval">Menunggu Approval</option>
                <option value="Menunggu Approval Kepala Yayasan">Menunggu Kep.Yayasan</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Ditolak">Ditolak</option>
              </select>
              <button class="btn btn-outline btn-sm" onclick="POPage.loadPOList()">Refresh</button>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>ID PO</th><th>Supplier</th><th>Item</th><th>Status</th><th>Penerimaan</th><th>Aksi</th></tr></thead>
              <tbody id="poListBody">
                <tr><td colspan="6"><div class="empty-state"><p>Memuat...</p></div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB: Buat PO -->
      <div id="poTabBuat" style="display:none">
        <div style="display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start">
          <div class="section-card">
            <div class="section-head"><h2>Item PO</h2>
              <button class="btn btn-outline btn-sm" id="btnAddPoItem">+ Tambah Item</button>
            </div>
            <div style="padding:16px 20px">
              <div id="poItemList">
                <div class="empty-state" style="padding:24px"><p>Belum ada item.</p></div>
              </div>
            </div>
          </div>
          <div>
            <div class="section-card">
              <div class="section-head"><h2>Detail PO</h2></div>
              <div style="padding:18px 20px">
                <div class="form-row">
                  <label>Supplier</label>
                  <select id="poSupplierId" style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:13.5px">
                    <option value="">— Pilih supplier —</option>
                  </select>
                </div>
                <div class="form-row">
                  <label>Catatan</label>
                  <input type="text" id="poCatatan" placeholder="Catatan PO (opsional)"/>
                </div>
                <button class="btn btn-primary" style="width:100%;margin-top:8px" id="btnSubmitPO">Kirim PO</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: Cek Fisik (Tmp Inventory) -->
      <div id="poTabTmp" style="display:none">
        <div class="section-card">
          <div class="section-head">
            <h2>Barang Menunggu Cek Fisik</h2>
            <button class="btn btn-outline btn-sm" onclick="POPage.loadTmpList()">Refresh</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Nama Item</th><th>PO</th><th>Tgl Terima</th><th>Qty Diterima</th><th>Sesuai</th><th>Rusak</th><th>Kurang</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody id="tmpListBody">
                <tr><td colspan="10"><div class="empty-state"><p>Memuat...</p></div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    _bindEvents();
    _loadSuppliers();
    _loadInventoryForDropdown();
    loadPOList();
  }

  function _bindEvents() {
    document.getElementById('btnAddPoItem').onclick = _addPoItemRow;
    document.getElementById('btnSubmitPO').onclick  = _doSubmitPO;
    document.getElementById('poFilterStatus').addEventListener('change', loadPOList);
  }

  function switchTab(tab) {
    ['list','buat','tmp'].forEach(t => {
      document.getElementById(`poTab${t.charAt(0).toUpperCase()+t.slice(1)}`).style.display = t === tab ? '' : 'none';
      document.querySelector(`.po-tab[data-tab="${t}"]`)?.classList.toggle('active', t === tab);
    });
    if (tab === 'tmp') loadTmpList();
  }

  // ── Load suppliers untuk dropdown ──
  async function _loadSuppliers() {
    const res = await SupplierAPI.getAll();
    const sel = document.getElementById('poSupplierId');
    if (!sel) return;
    if (!res?.success || !res.data?.length) {
      sel.innerHTML = '<option value="">— Belum ada supplier —</option>';
      return;
    }
    sel.innerHTML = '<option value="">— Pilih supplier —</option>' +
      res.data.map(s => `<option value="${s.id}">${s.nama}${s.kontak ? ' · ' + s.kontak : ''}</option>`).join('');
  }

  async function _loadInventoryForDropdown() {
    const res = await apiCall('getInventoryList', {});
    _invHeaders = res?.data || [];
  }

  // ── Tambah row item PO ──
  let _poItemSeq = 0;
  function _addPoItemRow() {
    const idx = _poItemSeq++;
    const container = document.getElementById('poItemList');

    // Hapus empty state kalau ada
    const empty = container.querySelector('.empty-state');
    if (empty) empty.parentElement.remove();

    const row = document.createElement('div');
    row.id = `poRow_${idx}`;
    row.style.cssText = 'display:flex;gap:8px;align-items:flex-end;margin-bottom:10px;flex-wrap:wrap';
    row.innerHTML = `
      <div style="flex:2;min-width:180px">
        <label style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">Item</label>
        <select id="poItem_${idx}" style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 10px;font-size:13px">
          <option value="">— Pilih item —</option>
          ${_invHeaders.map(h => `<option value="${h.id}">${h.nama} (${h.barcode})</option>`).join('')}
        </select>
      </div>
      <div style="width:90px">
        <label style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">Qty</label>
        <input type="number" min="1" id="poQty_${idx}" placeholder="0"
          style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 10px;font-size:13px"/>
      </div>
      <div style="width:120px">
        <label style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">Harga Modal</label>
        <input type="number" min="0" id="poModal_${idx}" placeholder="0"
          style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 10px;font-size:13px"/>
      </div>
      <button class="btn btn-outline btn-sm" onclick="document.getElementById('poRow_${idx}').remove()" style="margin-bottom:1px">✕</button>
    `;
    container.appendChild(row);
  }

  // ── Submit PO ──
  async function _doSubmitPO() {
    const supplierId = document.getElementById('poSupplierId').value;
    if (!supplierId) { showToast('Pilih supplier dulu.', 'error'); return; }

    // Kumpulkan semua row item
    const rows  = document.querySelectorAll('[id^="poRow_"]');
    const items = [];
    for (const row of rows) {
      const idx      = row.id.replace('poRow_','');
      const itemId   = document.getElementById(`poItem_${idx}`)?.value;
      const qty      = parseInt(document.getElementById(`poQty_${idx}`)?.value || '0');
      const hargaMod = parseFloat(document.getElementById(`poModal_${idx}`)?.value || '0');
      if (!itemId || qty <= 0) { showToast('Lengkapi semua item (item & qty wajib diisi).', 'error'); return; }
      items.push({ itemId, qty, hargaModal: hargaMod });
    }
    if (!items.length) { showToast('Tambahkan minimal 1 item ke PO.', 'error'); return; }

    const btn = document.getElementById('btnSubmitPO');
    btn.disabled = true; btn.textContent = 'Mengirim...';

    const res = await apiCall('createPO', {
      items,
      supplierId,
      catatan: document.getElementById('poCatatan')?.value.trim() || '',
    });

    btn.disabled = false; btn.textContent = 'Kirim PO';
    showToast(res?.message || (res?.success ? 'PO berhasil dibuat.' : 'Gagal.'), res?.success ? 'success' : 'error');

    if (res?.success) {
      // Reset form
      document.getElementById('poItemList').innerHTML = '<div class="empty-state" style="padding:24px"><p>Belum ada item.</p></div>';
      document.getElementById('poCatatan').value = '';
      switchTab('list');
    }
  }

  // ── Load daftar PO ──
  async function loadPOList() {
    const tbody  = document.getElementById('poListBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Memuat...</p></div></td></tr>`;

    const status = document.getElementById('poFilterStatus')?.value || '';
    const res    = await apiCall('getPOList', { status });
    if (!res?.success) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>${res?.message || 'Gagal.'}</p></div></td></tr>`;
      return;
    }

    const poList = res.data || [];
    if (!poList.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Tidak ada PO ditemukan.</p></div></td></tr>`;
      return;
    }

    const currentUser = Session.getUser();
    tbody.innerHTML = poList.map(po => {
      const statusBadge = {
        'Menunggu Approval':                    '<span class="badge badge-yellow">Menunggu Kep.Bagian</span>',
        'Menunggu Approval Kepala Yayasan':     '<span class="badge badge-blue">Menunggu Kep.Yayasan</span>',
        'Disetujui':                            '<span class="badge badge-green">Disetujui</span>',
        'Ditolak':                              '<span class="badge badge-red">Ditolak</span>',
      }[po.status] || `<span class="badge badge-gray">${po.status}</span>`;

      const penBadge = {
        'Belum Diterima':   '<span class="badge badge-gray">Belum Diterima</span>',
        'Sebagian Diterima':'<span class="badge badge-yellow">Sebagian</span>',
        'Semua Diterima':   '<span class="badge badge-green">Selesai</span>',
      }[po.statusPenerimaan] || '';

      const canApprove = (currentUser.roleId === 'R-02' && po.status === 'Menunggu Approval') ||
                         (currentUser.roleId === 'R-01' && po.status === 'Menunggu Approval Kepala Yayasan');

      const canReceive = currentUser.roleId !== 'R-04' && po.status === 'Disetujui';

      const actions = `
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          ${canApprove ? `
            <button class="btn btn-primary btn-sm" onclick="POPage.approvePO('${po.id}','approve')">✓ Setujui</button>
            <button class="btn btn-danger btn-sm" onclick="POPage.approvePO('${po.id}','reject')">✕ Tolak</button>` : ''}
          ${canReceive ? `<button class="btn btn-outline btn-sm" onclick="POPage.openReceive('${po.id}')">Terima Barang</button>` : ''}
        </div>`;

      return `<tr>
        <td style="font-family:monospace;font-size:12.5px">${po.id}</td>
        <td style="font-size:12.5px">${po.supplierId}</td>
        <td>${po.items.length} item</td>
        <td>${statusBadge}</td>
        <td>${penBadge}</td>
        <td>${actions}</td>
      </tr>`;
    }).join('');
  }

  // ── Approve / reject PO ──
  async function approvePO(poId, action) {
    const catatan = action === 'reject' ? prompt('Alasan penolakan:') : '';
    if (action === 'reject' && catatan === null) return;
    const res = await apiCall('approvePO', { poId, action, catatan: catatan || '' });
    showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
    if (res?.success) loadPOList();
  }

  // ── Modal terima barang ──
  async function openReceive(poId) {
    const res = await apiCall('getPOList', { status: 'Disetujui' });
    const po  = res?.data?.find(p => p.id === poId);
    if (!po) { showToast('PO tidak ditemukan.', 'error'); return; }

    const nameMap = {};
    _invHeaders.forEach(h => { nameMap[h.id] = h.nama; });

    const existing = document.getElementById('modalReceivePO');
    if (existing) existing.remove();

    const m = document.createElement('div');
    m.className = 'modal-overlay show';
    m.id = 'modalReceivePO';
    m.innerHTML = `
      <div class="modal" style="max-width:600px">
        <div class="modal-header">
          <h3>Terima Barang — ${poId}</h3>
          <button class="modal-close" onclick="document.getElementById('modalReceivePO').remove()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="font-size:13px;color:var(--muted);margin-bottom:16px">Isi jumlah aktual barang yang diterima dari supplier.</p>
          ${po.items.map((item, i) => `
            <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:12px">
              <div style="font-weight:600;font-size:13.5px;margin-bottom:10px">${nameMap[item.itemId] || item.itemId}</div>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
                <div>
                  <label style="font-size:10.5px;color:var(--muted);font-weight:600;display:block;margin-bottom:4px">QTY PO</label>
                  <div style="font-weight:700;font-size:18px">${item.qty}</div>
                </div>
                <div>
                  <label style="font-size:10.5px;color:var(--muted);font-weight:600;display:block;margin-bottom:4px">DITERIMA</label>
                  <input type="number" min="0" max="${item.qty}" value="${item.qty}" id="recv_diterima_${i}"
                    style="width:100%;border:1.5px solid var(--border);border-radius:6px;padding:6px 8px;font-size:13px"/>
                </div>
                <div>
                  <label style="font-size:10.5px;color:var(--muted);font-weight:600;display:block;margin-bottom:4px">RUSAK</label>
                  <input type="number" min="0" value="0" id="recv_rusak_${i}"
                    style="width:100%;border:1.5px solid var(--border);border-radius:6px;padding:6px 8px;font-size:13px"/>
                </div>
                <div>
                  <label style="font-size:10.5px;color:var(--muted);font-weight:600;display:block;margin-bottom:4px">KURANG</label>
                  <input type="number" min="0" value="0" id="recv_kurang_${i}"
                    style="width:100%;border:1.5px solid var(--border);border-radius:6px;padding:6px 8px;font-size:13px"/>
                </div>
              </div>
              <div style="margin-top:8px">
                <label style="font-size:10.5px;color:var(--muted);font-weight:600;display:block;margin-bottom:4px">HARGA MODAL (per unit)</label>
                <input type="number" min="0" id="recv_modal_${i}" placeholder="0"
                  style="width:160px;border:1.5px solid var(--border);border-radius:6px;padding:6px 8px;font-size:13px"/>
              </div>
              <input type="hidden" id="recv_itemId_${i}" value="${item.itemId}"/>
            </div>`).join('')}
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalReceivePO').remove()">Batal</button>
          <button class="btn btn-primary" onclick="POPage._submitReceive('${poId}',${po.items.length})">Simpan Penerimaan</button>
        </div>
      </div>`;
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
  }

  async function _submitReceive(poId, count) {
    const items = [];
    for (let i = 0; i < count; i++) {
      const itemId     = document.getElementById(`recv_itemId_${i}`)?.value;
      const diterima   = parseInt(document.getElementById(`recv_diterima_${i}`)?.value || '0');
      const rusak      = parseInt(document.getElementById(`recv_rusak_${i}`)?.value || '0');
      const kurang     = parseInt(document.getElementById(`recv_kurang_${i}`)?.value || '0');
      const hargaModal = parseFloat(document.getElementById(`recv_modal_${i}`)?.value || '0');
      items.push({ itemId, qtyDiterima: diterima, qtySesuai: diterima - rusak - kurang, qtyRusak: rusak, qtyKurang: kurang, hargaModal });
    }

    const res = await apiCall('receivePO', { poId, items });
    showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
    if (res?.success) {
      document.getElementById('modalReceivePO')?.remove();
      loadTmpList();
      switchTab('tmp');
    }
  }

  // ── Load tmp inventory (cek fisik) ──
  async function loadTmpList() {
    const tbody = document.getElementById('tmpListBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><p>Memuat...</p></div></td></tr>`;

    const res = await apiCall('getTmpInventoryList', { status: 'Menunggu Cek' });
    if (!res?.success) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><p>${res?.message || 'Gagal.'}</p></div></td></tr>`;
      return;
    }

    _tmpItems = res.data || [];
    if (!_tmpItems.length) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><p>Tidak ada barang menunggu cek fisik.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = _tmpItems.map(t => `
      <tr>
        <td style="font-family:monospace;font-size:12px">${t.id}</td>
        <td><strong>${t.namaItem}</strong></td>
        <td style="font-family:monospace;font-size:12px">${t.poId}</td>
        <td style="font-size:12.5px">${t.tglTerima ? new Date(t.tglTerima).toLocaleDateString('id-ID') : '—'}</td>
        <td><strong>${t.qtyDiterima}</strong></td>
        <td style="color:var(--success)">${t.qtySesuai}</td>
        <td style="color:${t.qtyRusak > 0 ? 'var(--danger)' : 'var(--muted)'}">${t.qtyRusak}</td>
        <td style="color:${t.qtyKurang > 0 ? 'var(--danger)' : 'var(--muted)'}">${t.qtyKurang}</td>
        <td><span class="badge badge-yellow">${t.statusCek}</span></td>
        <td>
          <div style="display:flex;gap:5px">
            <button class="btn btn-primary btn-sm" onclick="POPage.approveTmp('${t.id}')">✓ Terima</button>
            <button class="btn btn-danger btn-sm" onclick="POPage.rejectTmp('${t.id}')">✕ Retur</button>
          </div>
        </td>
      </tr>`).join('');
  }

  async function approveTmp(tmpId) {
    const t = _tmpItems.find(i => i.id === tmpId);
    const msg = `Terima ${t?.qtySesuai} unit "${t?.namaItem}" ke stock?${t?.qtyRusak || t?.qtyKurang ? ` (${(t?.qtyRusak||0)+(t?.qtyKurang||0)} unit akan diretur ke supplier)` : ''}`;
    if (!confirm(msg)) return;
    const res = await apiCall('approveTmpInventory', { tmpId, keterangan: '' });
    showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
    if (res?.success) loadTmpList();
  }

  async function rejectTmp(tmpId) {
    const alasan = prompt('Alasan retur ke supplier:');
    if (!alasan) return;
    const res = await apiCall('rejectTmpInventory', { tmpId, alasan, keterangan: '' });
    showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
    if (res?.success) loadTmpList();
  }

  return { mount, switchTab, loadPOList, approvePO, openReceive, _submitReceive, loadTmpList, approveTmp, rejectTmp };
})();

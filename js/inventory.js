// ============================================================
// inventory.js — Halaman Inventory dengan sub-menu
// Sub: Dashboard | Manajemen Item | Pengajuan Opname | Opname
// ============================================================

const InventoryPage = (() => {

  let _items       = [];
  let _kategoriList = [];
  let _activeFilter = { kategori: '', search: '' };

  // ── Mount halaman inventory ──
  function mount() {
    const page = document.getElementById('page-inventory');
    if (!page) return;

    page.innerHTML = `
      <!-- Sub menu Inventory -->
      <div style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid var(--border)">
        <button class="inv-tab active" data-tab="dashboard"   onclick="InventoryPage.switchSubMenu('dashboard')">📊 Dashboard</button>
        <button class="inv-tab" data-tab="management"         onclick="InventoryPage.switchSubMenu('management')">📦 Manajemen Item</button>
        <button class="inv-tab" data-tab="opname-req"         onclick="InventoryPage.switchSubMenu('opname-req')">📋 Pengajuan Opname</button>
        <button class="inv-tab" data-tab="opname"             onclick="InventoryPage.switchSubMenu('opname')">✅ Opname</button>
      </div>
      <style>
        .inv-tab{background:none;border:none;padding:10px 18px;font-size:13.5px;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color .15s,border-color .15s}
        .inv-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
        .inv-tab:hover{color:var(--text)}
      </style>

      <!-- SUB: Dashboard -->
      <div id="invSubDashboard">
        <div class="page-header"><h1>Dashboard Inventory</h1><p>Statistik dan kondisi stok barang.</p></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px" id="invStatCards">
          <div class="stat-card"><div class="stat-label">Total Item Aktif</div><div class="stat-value" id="statTotalItem">—</div></div>
          <div class="stat-card"><div class="stat-label">Total Unit Stok</div><div class="stat-value" id="statTotalUnit">—</div></div>
          <div class="stat-card"><div class="stat-label">Item Kosong</div><div class="stat-value" id="statKosong" style="color:var(--danger)">—</div></div>
          <div class="stat-card"><div class="stat-label">Stok Rendah</div><div class="stat-value" id="statRendah" style="color:#E8B800">—</div></div>
        </div>
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:20px">
          <div class="section-card" style="padding:20px">
            <div style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px">Stok per Kategori</div>
            <canvas id="chartBarStok" height="140"></canvas>
          </div>
          <div class="section-card" style="padding:20px">
            <div style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px">Status Stok</div>
            <canvas id="chartPieStatus" height="140"></canvas>
          </div>
        </div>
      </div>

      <!-- SUB: Manajemen Item -->
      <div id="invSubManagement" style="display:none">
        <div class="page-header"><h1>Manajemen Item</h1><p>Tambah, edit, hapus item dan kelola stok masuk.</p></div>
        <!-- Action bar -->
        <div class="section-card" style="margin-bottom:16px">
          <div style="padding:14px 20px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <button class="btn btn-primary btn-sm" onclick="InventoryPage.openAddItem()">+ Tambah Item</button>
            <button class="btn btn-outline btn-sm" id="btnBatchDelete" style="display:none;color:var(--danger);border-color:var(--danger)" onclick="InventoryPage.batchDelete()">
              🗑 Hapus Terpilih (<span id="selectedCount">0</span>)
            </button>
            <select id="invFilterKat" style="border:1.5px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;background:#fff;cursor:pointer">
              <option value="">Semua Kategori</option>
            </select>
            <input id="invSearchInput" type="text" placeholder="Cari nama / barcode..."
              style="flex:1;min-width:180px;border:1.5px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;outline:none"/>
            <button class="btn btn-outline btn-sm" onclick="InventoryPage.load()">Refresh</button>
          </div>
        </div>
        <!-- Tabel -->
        <div class="section-card">
          <div class="table-wrap">
            <table id="invTable">
              <thead><tr>
                <th style="width:36px"><input type="checkbox" id="chkAll" onchange="InventoryPage._toggleAllCheck(this.checked)" style="width:15px;height:15px;accent-color:var(--primary)"/></th>
                <th>Barcode</th><th>Nama Item</th><th>Kategori</th><th>Harga Jual</th><th>Stok</th><th>Status</th><th>Aksi</th>
              </tr></thead>
              <tbody id="invTableBody"><tr><td colspan="8"><div class="empty-state"><p>Memuat...</p></div></td></tr></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- SUB: Pengajuan Opname -->
      <div id="invSubOpnameReq" style="display:none">
        <div class="page-header"><h1>Pengajuan Opname</h1><p>Ajukan permohonan opname ke Kepala Yayasan.</p></div>
        <div class="section-card" style="max-width:560px">
          <div class="section-head"><h2>Form Pengajuan</h2></div>
          <div style="padding:22px 24px">
            <div class="form-row">
              <label>Tanggal Rencana Opname *</label>
              <input type="date" id="opnameReqTgl" style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:10px 12px;font-size:14px;font-family:'Inter',sans-serif;outline:none"/>
            </div>
            <div class="form-row">
              <label>Tipe Item / Jenjang *</label>
              <div id="opnameReqJenjang" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
                ${['TKK','SDK','SMPK','SMAK','National Plus','Semua'].map(j => `
                  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13.5px;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px">
                    <input type="checkbox" value="${j}" style="width:15px;height:15px;accent-color:var(--primary)"/> ${j}
                  </label>`).join('')}
              </div>
            </div>
            <div class="form-row">
              <label>Validator / Peserta *</label>
              <div id="opnameReqValidator" style="margin-top:4px;max-height:160px;overflow-y:auto;border:1.5px solid var(--border);border-radius:8px;padding:8px">
                <div style="font-size:12.5px;color:var(--muted)">Memuat...</div>
              </div>
            </div>
            <div class="form-row">
              <label>Catatan</label>
              <textarea id="opnameReqCatatan" placeholder="Catatan untuk Kepala Yayasan..."
                style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:10px 12px;font-size:14px;font-family:'Inter',sans-serif;outline:none;resize:vertical;min-height:72px"></textarea>
            </div>
            <div id="opnameReqAlert" style="margin-bottom:12px"></div>
            <button class="btn btn-primary" style="width:100%" id="btnSubmitOpnameReq" onclick="InventoryPage.submitPengajuanOpname()">
              Kirim Pengajuan ke Kepala Yayasan
            </button>
          </div>
        </div>
      </div>

      <!-- SUB: Opname -->
      <div id="invSubOpname" style="display:none">
        <div class="section-card" style="text-align:center;padding:40px">
          <div style="font-size:48px;margin-bottom:12px">✅</div>
          <div style="font-family:'DM Sans',sans-serif;font-size:16px;font-weight:700;margin-bottom:8px">Stock Opname</div>
          <div style="font-size:13.5px;color:var(--muted);margin-bottom:20px">Buka halaman opname lengkap untuk mulai scan dan input qty fisik.</div>
          <button class="btn btn-primary" onclick="navigateTo('opname','Stock Opname')">Buka Halaman Opname →</button>
        </div>
      </div>`;

    // Event listeners filter
    document.getElementById('invFilterKat')?.addEventListener('change', e => {
      _activeFilter.kategori = e.target.value;
      _renderTable();
    });
    document.getElementById('invSearchInput')?.addEventListener('input', e => {
      _activeFilter.search = e.target.value.toLowerCase().trim();
      _renderTable();
    });

    load();
    _loadValidatorList();
  }

  // ── Switch sub menu ──
  function switchSubMenu(tab) {
    const tabMap = { 'dashboard':'Dashboard', 'management':'Management', 'opname-req':'OpnameReq', 'opname':'Opname' };
    Object.values(tabMap).forEach(name => {
      const el = document.getElementById('invSub' + name);
      if (el) el.style.display = 'none';
    });
    const target = document.getElementById('invSub' + tabMap[tab]);
    if (target) target.style.display = '';
    document.querySelectorAll('.inv-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'opname-req') _loadValidatorList();
  }

  // ── Load data inventory ──
  async function load() {
    const res  = await apiCall('getInventoryList', {});
    const res2 = await apiCall('getKategoriList',  {});
    if (!res?.success) return;

    _items        = res.data  || [];
    _kategoriList = res2?.data || [];

    // Isi dropdown kategori
    const katSel = document.getElementById('invFilterKat');
    if (katSel) {
      katSel.innerHTML = '<option value="">Semua Kategori</option>' +
        _kategoriList.map(k => `<option value="${k.id}">${k.nama}</option>`).join('');
    }

    // Update stat cards
    const aktif   = _items.filter(i => i.status !== 'Nonaktif');
    const kosong  = aktif.filter(i => i.totalQty === 0);
    const rendah  = aktif.filter(i => i.totalQty > 0 && i.totalQty <= (i.minThreshold||0));
    const totalUnit = aktif.reduce((s, i) => s + (i.totalQty||0), 0);
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('statTotalItem', aktif.length);
    setText('statTotalUnit', totalUnit.toLocaleString('id-ID'));
    setText('statKosong',    kosong.length);
    setText('statRendah',    rendah.length);

    _renderTable();
    _renderCharts();
  }

  // ── Render tabel ──
  function _renderTable() {
    const tbody = document.getElementById('invTableBody');
    if (!tbody) return;

    const katMap = {};
    _kategoriList.forEach(k => { katMap[k.id] = k.nama; });

    let filtered = _items;
    if (_activeFilter.kategori) filtered = filtered.filter(i => i.kategori === _activeFilter.kategori);
    if (_activeFilter.search)   filtered = filtered.filter(i =>
      (i.nama||'').toLowerCase().includes(_activeFilter.search) ||
      (i.barcode||'').toLowerCase().includes(_activeFilter.search)
    );

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state" style="padding:40px"><p>Tidak ada item ditemukan.</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(item => {
      const katNama = katMap[item.kategori] || item.kategori || '—';
      const harga   = 'Rp ' + parseInt(item.sellPrice||0).toLocaleString('id-ID');
      let statusBadge, statusColor;
      if (item.totalQty === 0)                          { statusBadge = 'Kosong';  statusColor = 'badge-red'; }
      else if (item.totalQty <= (item.minThreshold||0)) { statusBadge = 'Rendah';  statusColor = 'badge-yellow'; }
      else                                               { statusBadge = 'Normal';  statusColor = 'badge-green'; }

      return `<tr>
        <td><input type="checkbox" class="invRowChk" value="${item.id}" onchange="InventoryPage._onRowCheck()" style="width:15px;height:15px;accent-color:var(--primary)"/></td>
        <td style="font-family:monospace;font-size:12.5px;color:var(--muted)">${item.barcode||'—'}</td>
        <td><strong>${item.nama||'—'}</strong></td>
        <td style="font-size:12.5px">${katNama}</td>
        <td>${harga}</td>
        <td><strong>${item.totalQty||0}</strong> <span style="font-size:11.5px;color:var(--muted)">unit</span></td>
        <td><span class="badge ${statusColor}">${statusBadge}</span></td>
        <td>
          <div style="display:flex;gap:5px">
            <button class="btn btn-outline btn-sm" onclick="InventoryPage.openDetail('${item.id}')">Detail</button>
            <button class="btn btn-outline btn-sm" onclick="InventoryPage.openEdit('${item.id}')">Edit</button>
            <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="InventoryPage.deleteItem('${item.id}','${(item.nama||'').replace(/'/g,"\\'")}')">Hapus</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // ── Render charts ──
  function _renderCharts() {
    if (typeof Chart === 'undefined') return;
    const katMap = {};
    _kategoriList.forEach(k => { katMap[k.id] = k.nama; });

    // Bar chart stok per kategori
    const barCtx = document.getElementById('chartBarStok');
    if (barCtx) {
      if (barCtx._chart) barCtx._chart.destroy();
      const byKat = {};
      _items.forEach(i => {
        const k = katMap[i.kategori] || i.kategori || 'Lainnya';
        byKat[k] = (byKat[k]||0) + (i.totalQty||0);
      });
      barCtx._chart = new Chart(barCtx, {
        type: 'bar',
        data: { labels: Object.keys(byKat), datasets: [{ label: 'Unit', data: Object.values(byKat), backgroundColor: '#1A3FAA', borderRadius: 6 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
      });
    }

    // Pie chart status
    const pieCtx = document.getElementById('chartPieStatus');
    if (pieCtx) {
      if (pieCtx._chart) pieCtx._chart.destroy();
      const s = { Normal: 0, Rendah: 0, Kosong: 0 };
      _items.forEach(i => {
        if (i.totalQty === 0) s.Kosong++;
        else if (i.totalQty <= (i.minThreshold||0)) s.Rendah++;
        else s.Normal++;
      });
      pieCtx._chart = new Chart(pieCtx, {
        type: 'doughnut',
        data: { labels: Object.keys(s), datasets: [{ data: Object.values(s), backgroundColor: ['#16A34A','#E8B800','#D94040'], borderWidth: 0 }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }
      });
    }
  }

  // ── Detail item + batch list ──
  async function openDetail(itemId) {
    const res = await apiCall('getInventoryDetail', { itemId });
    if (!res?.success) { showToast('Gagal memuat detail.', 'error'); return; }
    const d = res.data;

    const existing = document.getElementById('modalInvDetail');
    if (existing) existing.remove();

    const batchRows = (d.batches||[]).map((b, i) => `
      <tr>
        <td>${i+1}</td>
        <td style="font-size:12px;color:var(--muted)">${b.id}</td>
        <td>${b.tanggalMasuk ? new Date(b.tanggalMasuk).toLocaleDateString('id-ID') : '—'}</td>
        <td>Rp ${parseInt(b.hargaModal||0).toLocaleString('id-ID')}</td>
        <td>${b.qtyMasuk||0}</td>
        <td><strong>${b.qtySisa||0}</strong></td>
        <td><span class="badge ${b.statusBatch==='Tersedia'?'badge-green':'badge-red'}">${b.statusBatch}</span></td>
      </tr>`).join('') || '<tr><td colspan="7"><div class="empty-state"><p>Belum ada batch.</p></div></td></tr>';

    const m = document.createElement('div');
    m.className = 'modal-overlay show';
    m.id = 'modalInvDetail';
    m.innerHTML = `
      <div class="modal" style="max-width:680px">
        <div class="modal-header">
          <h3>${d.nama}</h3>
          <button class="modal-close" onclick="document.getElementById('modalInvDetail').remove()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:24px;margin-bottom:20px;flex-wrap:wrap;align-items:flex-end">
            <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:600">Barcode</div><div style="font-family:monospace;margin-top:4px">${d.barcode}</div></div>
            <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:600">Harga Jual</div><div style="margin-top:4px">Rp ${parseInt(d.sellPrice||0).toLocaleString('id-ID')}</div></div>
            <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:600">Total Stok</div><div style="margin-top:4px"><strong>${d.totalQty||0}</strong> unit</div></div>
            <button class="btn btn-primary btn-sm" onclick="InventoryPage.openAddBatch('${d.id}','${(d.nama||'').replace(/'/g,"\\'")}')">+ Tambah Stok</button>
          </div>
          <div style="font-size:13px;font-weight:600;margin-bottom:10px">Batch FIFO (${(d.batches||[]).length} batch)</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>#</th><th>ID Batch</th><th>Tgl Masuk</th><th>Harga Modal</th><th>Qty Masuk</th><th>Stok Sisa</th><th>Status</th></tr></thead>
              <tbody>${batchRows}</tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalInvDetail').remove()">Tutup</button>
        </div>
      </div>`;
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
  }

  // ── Form tambah / edit item ──
  function openAddItem() {
    _openItemModal(null);
  }

  function openEdit(itemId) {
    const item = _items.find(i => i.id === itemId);
    if (item) _openItemModal(item);
  }

  function _openItemModal(item) {
    const existing = document.getElementById('modalInvItem');
    if (existing) existing.remove();

    const today = new Date().toISOString().split('T')[0];
    const isEdit = !!item;

    const m = document.createElement('div');
    m.className = 'modal-overlay show';
    m.id = 'modalInvItem';
    m.innerHTML = `
      <div class="modal" style="max-width:500px">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Item' : 'Tambah Item Baru'}</h3>
          <button class="modal-close" onclick="document.getElementById('modalInvItem').remove()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="editItemId" value="${item?.id||''}"/>
          <div class="form-row"><label>Barcode *</label>
            <div style="position:relative">
              <input type="text" id="itemBarcode" placeholder="Ketik/scan barcode..." value="${item?.barcode||''}"
                ${isEdit?'disabled':''} style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;font-family:monospace;outline:none${isEdit?';background:#F8F9FB':''}"
                oninput="InventoryPage._barcodeAutocomplete(this.value)" autocomplete="off" autocapitalize="characters"/>
              <div id="barcodeDropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.1);z-index:99;max-height:160px;overflow-y:auto"></div>
            </div>
          </div>
          <div class="form-row"><label>Nama Item *</label>
            <input type="text" id="itemNama" value="${item?.nama||''}" placeholder="Nama barang"
              style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;outline:none"/>
          </div>
          <div class="form-row"><label>Kategori *</label>
            <select id="itemKategori" style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;outline:none">
              <option value="">— Pilih kategori —</option>
              ${_kategoriList.map(k => `<option value="${k.id}" ${item?.kategori===k.id?'selected':''}>${k.nama}</option>`).join('')}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-row"><label>Harga Jual</label>
              <input type="number" id="itemHarga" value="${item?.sellPrice||''}" placeholder="0"
                style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;outline:none"/>
            </div>
            <div class="form-row"><label>Min. Threshold</label>
              <input type="number" id="itemThreshold" value="${item?.minThreshold||''}" placeholder="0"
                style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;outline:none"/>
            </div>
          </div>
          <div class="form-row"><label>Keterangan</label>
            <input type="text" id="itemKet" value="${item?.keterangan||''}" placeholder="Ukuran, warna, dll"
              style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;outline:none"/>
          </div>
          ${!isEdit ? `
          <div style="border-top:1px solid var(--border);padding-top:14px;margin-top:4px" id="sectionStokAwal">
            <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📦 Stok Awal (opsional)</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="form-row"><label>Qty Masuk</label>
                <input type="number" id="itemQtyAwal" placeholder="0" min="0"
                  style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;outline:none"/>
              </div>
              <div class="form-row"><label>Harga Modal/unit</label>
                <input type="number" id="itemHargaModal" placeholder="0" min="0"
                  style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;outline:none"/>
              </div>
            </div>
            <div class="form-row"><label>Tanggal Masuk</label>
              <input type="date" id="itemTglMasuk" value="${today}"
                style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;outline:none"/>
            </div>
          </div>` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalInvItem').remove()">Batal</button>
          <button class="btn btn-primary" onclick="InventoryPage._saveItem()">Simpan</button>
        </div>
      </div>`;
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
  }

  // ── Autocomplete barcode ──
  function _barcodeAutocomplete(q) {
    const drop = document.getElementById('barcodeDropdown');
    if (!drop || !q || q.length < 2) { if(drop) drop.style.display='none'; return; }
    const matches = _items.filter(i =>
      (i.barcode||'').toLowerCase().includes(q.toLowerCase()) ||
      (i.nama||'').toLowerCase().includes(q.toLowerCase())
    ).slice(0, 8);
    if (!matches.length) { drop.style.display='none'; return; }
    drop.style.display = '';
    drop.innerHTML = matches.map(item => `
      <div onclick="InventoryPage._selectBarcode('${item.id}','${item.barcode}','${(item.nama||'').replace(/'/g,"\\'")}','${item.kategori}',${item.sellPrice||0})"
        style="padding:9px 14px;cursor:pointer;font-size:13.5px;border-bottom:1px solid #F3F4F6;transition:background .1s"
        onmouseover="this.style.background='#F8F9FB'" onmouseout="this.style.background=''">
        <div style="font-weight:600">${item.nama}</div>
        <div style="font-size:11.5px;font-family:monospace;color:var(--muted)">${item.barcode}</div>
      </div>`).join('');
    setTimeout(() => {
      document.addEventListener('click', function closeDD(e) {
        if (!drop.contains(e.target)) { drop.style.display='none'; document.removeEventListener('click',closeDD); }
      });
    }, 100);
  }

  function _selectBarcode(itemId, barcode, nama, kategori, sellPrice) {
    const el = (id) => document.getElementById(id);
    if (el('itemBarcode'))  { el('itemBarcode').value = barcode; el('itemBarcode').disabled = true; }
    if (el('itemNama'))     el('itemNama').value    = nama;
    if (el('itemKategori')) el('itemKategori').value = kategori;
    if (el('itemHarga'))    el('itemHarga').value   = sellPrice||'';
    if (el('editItemId'))   el('editItemId').value  = itemId;
    if (el('barcodeDropdown')) el('barcodeDropdown').style.display = 'none';
    const sectionStok = el('sectionStokAwal');
    if (sectionStok) sectionStok.querySelector('div:first-child').textContent = '📦 Tambah Stok Baru';
  }

  // ── Simpan item ──
  async function _saveItem() {
    const el      = (id) => document.getElementById(id);
    const itemId  = el('editItemId')?.value;
    const barcode = el('itemBarcode')?.value.trim();
    const nama    = el('itemNama')?.value.trim();
    const kategori = el('itemKategori')?.value;
    const harga   = el('itemHarga')?.value;
    const threshold = el('itemThreshold')?.value;
    const ket     = el('itemKet')?.value.trim();

    if (!nama || !kategori || (!itemId && !barcode)) {
      showToast('Barcode, nama, dan kategori wajib diisi.', 'error'); return;
    }

    const action  = itemId ? 'updateItem' : 'createItem';
    const payload = itemId
      ? { itemId, nama, kategori, keterangan: ket, sellPrice: harga, minThreshold: threshold }
      : { barcode, nama, kategori, keterangan: ket, sellPrice: harga, minThreshold: threshold,
          qtyAwal: el('itemQtyAwal')?.value||0, hargaModal: el('itemHargaModal')?.value||0,
          tanggalMasuk: el('itemTglMasuk')?.value };

    const res = await apiCall(action, payload);
    showToast(res?.message||(res?.success?'Berhasil.':'Gagal.'), res?.success?'success':'error');
    if (res?.success) { el('modalInvItem')?.remove(); load(); }
  }

  // ── Hapus item ──
  async function deleteItem(itemId, nama) {
    if (!confirm('Nonaktifkan item "' + nama + '"?')) return;
    const res = await apiCall('deleteItem', { itemId });
    showToast(res?.message||(res?.success?'Berhasil.':'Gagal.'), res?.success?'success':'error');
    if (res?.success) load();
  }

  // ── Batch delete ──
  async function batchDelete() {
    const ids = [...document.querySelectorAll('.invRowChk:checked')].map(cb => cb.value);
    if (!ids.length) return;
    if (!confirm('Nonaktifkan ' + ids.length + ' item terpilih?')) return;
    const res = await apiCall('deleteItem', { itemIds: ids });
    showToast(res?.message||(res?.success?'Berhasil.':'Gagal.'), res?.success?'success':'error');
    if (res?.success) load();
  }

  // ── Checkbox ──
  function _toggleAllCheck(checked) {
    document.querySelectorAll('.invRowChk').forEach(cb => { cb.checked = checked; });
    _onRowCheck();
  }

  function _onRowCheck() {
    const checked = document.querySelectorAll('.invRowChk:checked');
    const btn = document.getElementById('btnBatchDelete');
    const cnt = document.getElementById('selectedCount');
    if (btn) btn.style.display = checked.length > 0 ? '' : 'none';
    if (cnt) cnt.textContent = checked.length;
  }

  // ── Tambah batch/stok ──
  function openAddBatch(itemId, itemNama) {
    const existing = document.getElementById('modalAddBatch');
    if (existing) existing.remove();
    const today = new Date().toISOString().split('T')[0];
    const m = document.createElement('div');
    m.className = 'modal-overlay show';
    m.id = 'modalAddBatch';
    m.innerHTML = `
      <div class="modal" style="max-width:400px">
        <div class="modal-header">
          <h3>Tambah Stok Masuk</h3>
          <button class="modal-close" onclick="document.getElementById('modalAddBatch').remove()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div style="background:#EFF6FF;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13.5px">
            Item: <strong>${itemNama}</strong>
          </div>
          <div class="form-row"><label>Qty Masuk *</label>
            <input type="number" id="batchQty" min="1" placeholder="Jumlah unit"
              style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;outline:none"/>
          </div>
          <div class="form-row"><label>Harga Modal per Unit *</label>
            <input type="number" id="batchModal" min="0" placeholder="0"
              style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;outline:none"/>
          </div>
          <div class="form-row"><label>Tanggal Masuk</label>
            <input type="date" id="batchTgl" value="${today}"
              style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;outline:none"/>
          </div>
          <p style="font-size:12px;color:var(--muted)">Batch ini otomatis antri di urutan FIFO terbaru.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalAddBatch').remove()">Batal</button>
          <button class="btn btn-primary" onclick="InventoryPage._saveBatch('${itemId}')">Simpan Stok</button>
        </div>
      </div>`;
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
  }

  async function _saveBatch(itemId) {
    const qty   = document.getElementById('batchQty')?.value;
    const modal = document.getElementById('batchModal')?.value;
    const tgl   = document.getElementById('batchTgl')?.value;
    if (!qty || parseInt(qty) <= 0) { showToast('Qty wajib > 0.', 'error'); return; }
    const res = await apiCall('addInventoryBatch', { itemId, qtyMasuk: parseInt(qty), hargaModal: parseFloat(modal||0), tanggalMasuk: tgl });
    showToast(res?.message||(res?.success?'Berhasil.':'Gagal.'), res?.success?'success':'error');
    if (res?.success) { document.getElementById('modalAddBatch')?.remove(); openDetail(itemId); load(); }
  }

  // ── Validator list untuk pengajuan opname ──
  async function _loadValidatorList() {
    const wrap = document.getElementById('opnameReqValidator');
    if (!wrap) return;
    const res = await apiCall('getUsers', {});
    if (!res?.success) { wrap.innerHTML = '<div style="font-size:12.5px;color:var(--danger);padding:4px">Gagal memuat user.</div>'; return; }
    const validators = (res.data||[]).filter(u => ['R-02','R-05'].includes(u.roleId) && (u.isActive===true||u.isActive==='TRUE'));
    wrap.innerHTML = validators.map(u => `
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 8px;border-radius:6px;font-size:13.5px;transition:background .1s" onmouseover="this.style.background='#F8F9FB'" onmouseout="this.style.background=''">
        <input type="checkbox" value="${u.id}" name="validatorCheck" style="width:15px;height:15px;accent-color:var(--primary)"/>
        ${u.displayName} <span style="font-size:11.5px;color:var(--muted)">(${u.role})</span>
      </label>`).join('') || '<div style="font-size:12.5px;color:var(--muted);padding:4px">Tidak ada validator tersedia.</div>';
  }

  // ── Submit pengajuan opname ──
  async function submitPengajuanOpname() {
    const tgl      = document.getElementById('opnameReqTgl')?.value;
    const catatan  = document.getElementById('opnameReqCatatan')?.value.trim();
    const alertEl  = document.getElementById('opnameReqAlert');
    const jenjang  = [...document.querySelectorAll('#opnameReqJenjang input:checked')].map(cb => cb.value);
    const validator = [...document.querySelectorAll('[name="validatorCheck"]:checked')].map(cb => cb.value);

    const setAlert = (msg, type='error') => {
      alertEl.innerHTML = `<div style="background:${type==='success'?'#DCFCE7':'#FEE2E2'};color:${type==='success'?'#166534':'#991B1B'};padding:10px 14px;border-radius:8px;font-size:13.5px">${msg}</div>`;
    };

    if (!tgl)           { setAlert('Tanggal wajib diisi.'); return; }
    if (!jenjang.length) { setAlert('Pilih minimal 1 jenjang.'); return; }
    if (!validator.length){ setAlert('Pilih minimal 1 validator.'); return; }

    const btn = document.getElementById('btnSubmitOpnameReq');
    btn.disabled = true; btn.textContent = 'Mengirim...';
    const res = await apiCall('submitPengajuanOpname', { tanggalRencana: tgl, jenjang, validatorIds: validator, catatan });
    btn.disabled = false; btn.textContent = 'Kirim Pengajuan ke Kepala Yayasan';

    if (res?.success) {
      setAlert('✓ Pengajuan berhasil dikirim.', 'success');
      document.getElementById('opnameReqTgl').value = '';
      document.getElementById('opnameReqCatatan').value = '';
      document.querySelectorAll('#opnameReqJenjang input, [name="validatorCheck"]').forEach(cb => cb.checked = false);
    } else {
      setAlert(res?.message || 'Gagal mengirim pengajuan.');
    }
  }

  return { mount, load, switchSubMenu, openDetail, openAddItem, openEdit, openAddBatch,
           _saveItem, _saveBatch, deleteItem, batchDelete, _toggleAllCheck, _onRowCheck,
           _barcodeAutocomplete, _selectBarcode, submitPengajuanOpname };
})();

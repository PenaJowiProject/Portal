// ============================================================
// inventory.js — Page Inventory: daftar barang + detail batch
// ============================================================

const InventoryPage = (() => {

  let _items       = [];
  let _kategoriList = [];
  let _activeFilter = { kategori: '', search: '' };

  // ── Inject HTML page ke #page-inventory ──
  function mount() {
    const page = document.getElementById('page-inventory');
    page.innerHTML = `
      <div class="page-header">
        <h1>Daftar Inventory</h1>
        <p>574 item dari 5 kategori seragam.</p>
      </div>

      <!-- Filter bar -->
      <div class="section-card" style="margin-bottom:16px">
        <div style="padding:14px 20px;display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          <select id="invFilterKat" style="border:1.5px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;background:#fff;cursor:pointer">
            <option value="">Semua Kategori</option>
          </select>
          <input id="invSearchInput" type="text" placeholder="Cari nama / kode barcode..."
            style="flex:1;min-width:180px;border:1.5px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px"/>
          <button class="btn btn-outline btn-sm" id="btnInvRefresh">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.17"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- Stock status legend -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;font-size:12px">
        <span><span class="badge badge-green">Normal</span> Stok di atas minimum</span>
        <span><span class="badge badge-yellow">Rendah</span> Di bawah minimum</span>
        <span><span class="badge badge-red">Kosong</span> Stok habis</span>
        <span><span class="badge badge-gray">Belum Diopname</span> Qty belum diisi</span>
      </div>

      <!-- Table -->
      <div class="section-card">
        <div class="section-head">
          <h2 id="invTableTitle">Semua Item</h2>
          <span id="invCount" style="font-size:13px;color:var(--muted)"></span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kode / Barcode</th>
                <th>Nama Item</th>
                <th>Kategori</th>
                <th>Harga Jual</th>
                <th>Stok</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="invTableBody">
              <tr><td colspan="7"><div class="empty-state"><p>Memuat data...</p></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById('invFilterKat').addEventListener('change', e => {
      _activeFilter.kategori = e.target.value;
      _renderTable();
    });
    document.getElementById('invSearchInput').addEventListener('input', e => {
      _activeFilter.search = e.target.value.toLowerCase().trim();
      _renderTable();
    });
    document.getElementById('btnInvRefresh').addEventListener('click', load);
  }

  // ── Load data dari API ──
  async function load() {
    document.getElementById('invTableBody').innerHTML =
      `<tr><td colspan="7"><div class="empty-state"><p>Memuat data...</p></div></td></tr>`;

    const [listRes, katRes] = await Promise.all([
      apiCall('getInventoryList', {}),
      apiCall('getKategoriList', {}),
    ]);

    if (!listRes?.success) {
      document.getElementById('invTableBody').innerHTML =
        `<tr><td colspan="7"><div class="empty-state"><p>${listRes?.message || 'Gagal memuat.'}</p></div></td></tr>`;
      return;
    }

    _items        = listRes.data || [];
    _kategoriList = katRes?.data || [];
    _populateKatFilter();
    _renderTable();
  }

  // ── Isi dropdown kategori ──
  function _populateKatFilter() {
    const sel = document.getElementById('invFilterKat');
    sel.innerHTML = '<option value="">Semua Kategori</option>';
    _kategoriList.forEach(k => {
      sel.innerHTML += `<option value="${k.id}">${k.nama}</option>`;
    });
  }

  // ── Render tabel sesuai filter aktif ──
  function _renderTable() {
    const filtered = _items.filter(item => {
      if (_activeFilter.kategori && item.kategori !== _activeFilter.kategori) return false;
      if (_activeFilter.search) {
        const hay = (item.nama + ' ' + item.barcode + ' ' + item.id).toLowerCase();
        if (!hay.includes(_activeFilter.search)) return false;
      }
      return true;
    });

    document.getElementById('invCount').textContent = `${filtered.length} item`;

    const tbody = document.getElementById('invTableBody');
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>Tidak ada item ditemukan.</p></div></td></tr>`;
      return;
    }

    const katMap = {};
    _kategoriList.forEach(k => { katMap[k.id] = k.nama; });

    tbody.innerHTML = filtered.map(item => {
      const statusBadge = {
        normal:          '<span class="badge badge-green">Normal</span>',
        rendah:          '<span class="badge badge-yellow">Rendah</span>',
        kosong:          '<span class="badge badge-red">Kosong</span>',
        belum_diopname:  '<span class="badge badge-gray">Belum Diopname</span>',
      }[item.stockStatus] || '<span class="badge badge-gray">—</span>';

      const harga = item.sellPrice
        ? 'Rp ' + parseInt(item.sellPrice).toLocaleString('id-ID')
        : '—';

      const katNama = katMap[item.kategori] || item.kategori;

      return `<tr>
        <td style="font-family:monospace;font-size:12.5px;color:var(--muted)">${item.barcode || item.id}</td>
        <td><strong>${item.nama || '—'}</strong>${item.keterangan && item.keterangan !== '-' ? `<br><span style="font-size:11.5px;color:var(--muted)">${item.keterangan}</span>` : ''}</td>
        <td style="font-size:12.5px">${katNama}</td>
        <td>${harga}</td>
        <td><strong>${item.totalQty}</strong><span style="font-size:11.5px;color:var(--muted)"> / ${item.batchCount} batch</span></td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="InventoryPage.openDetail('${item.id}')">Detail</button>
        </td>
      </tr>`;
    }).join('');
  }

  // ── Buka modal detail item + batch ──
  async function openDetail(itemId) {
    // Inject modal kalau belum ada
    if (!document.getElementById('modalInvDetail')) {
      const m = document.createElement('div');
      m.className = 'modal-overlay';
      m.id = 'modalInvDetail';
      m.innerHTML = `
        <div class="modal" style="max-width:580px">
          <div class="modal-header">
            <h3 id="modalInvName">Detail Item</h3>
            <button class="modal-close" onclick="document.getElementById('modalInvDetail').classList.remove('show')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" id="modalInvBody">Memuat...</div>
        </div>`;
      document.body.appendChild(m);
      m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
    }

    const modal = document.getElementById('modalInvDetail');
    modal.classList.add('show');
    document.getElementById('modalInvBody').innerHTML = '<div class="empty-state"><p>Memuat data batch...</p></div>';

    const res = await apiCall('getInventoryDetail', { itemId });
    if (!res?.success) {
      document.getElementById('modalInvBody').innerHTML = `<p style="color:var(--danger)">${res?.message || 'Gagal memuat.'}</p>`;
      return;
    }

    const d = res.data;
    document.getElementById('modalInvName').textContent = d.nama;

    const batchRows = d.batches.map((b, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="font-size:12px;color:var(--muted)">${b.id}</td>
        <td>${b.tanggalMasuk ? new Date(b.tanggalMasuk).toLocaleDateString('id-ID') : '—'}</td>
        <td>Rp ${parseInt(b.hargaModal).toLocaleString('id-ID')}</td>
        <td><strong>${b.qtySisa}</strong></td>
        <td><span class="badge ${b.statusBatch === 'Tersedia' ? 'badge-green' : b.statusBatch === 'Habis' ? 'badge-red' : 'badge-gray'}">${b.statusBatch}</span></td>
      </tr>`).join('');

    document.getElementById('modalInvBody').innerHTML = `
      <div style="display:flex;gap:24px;margin-bottom:20px;flex-wrap:wrap">
        <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:600">Barcode</div>
          <div style="font-family:monospace;margin-top:4px">${d.barcode}</div></div>
        <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:600">Harga Jual</div>
          <div style="margin-top:4px">Rp ${parseInt(d.sellPrice || 0).toLocaleString('id-ID')}</div></div>
        <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:600">Total Stok</div>
          <div style="margin-top:4px"><strong>${d.totalQty}</strong> unit</div></div>
      </div>
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">Batch FIFO (${d.batches.length} batch)</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>ID Batch</th><th>Tgl Masuk</th><th>Harga Modal</th><th>Stok Sisa</th><th>Status</th></tr></thead>
          <tbody>${batchRows || '<tr><td colspan="6"><div class="empty-state"><p>Belum ada batch.</p></div></td></tr>'}</tbody>
        </table>
      </div>`;
  }

  return { mount, load, openDetail };
})();

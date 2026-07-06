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
      <div style="display:flex; align-items:center; gap:15px; margin-bottom:20px; font-size:14px; font-weight:600; color:var(--muted);">
        <button class="btn btn-outline btn-sm" onclick="showPage('page-dashboard')" style="border:none; padding:0;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg> Kembali ke Home
        </button>
        <span style="color:var(--border)">|</span>
        <span style="color:var(--primary)">Inventory</span>
        <span style="color:var(--border)">|</span>
        <span style="cursor:pointer;" onclick="showPage('page-opname')">Opname</span>
        <span style="color:var(--border)">|</span>
        <span style="cursor:pointer;" onclick="showPage('page-po')">Purchase Order (PO)</span>
      </div>

      <div class="page-header">
        <h1>Dashboard Inventory</h1>
      </div>

      <div class="section-card" style="padding:20px; margin-bottom:20px; display:flex; gap:20px;">
        <div style="flex:1;">
            <canvas id="invBarChart" height="100"></canvas>
        </div>
        <div style="width:300px;">
            <canvas id="invPieChart" height="100"></canvas>
        </div>
      </div>

      <div class="section-card" style="margin-bottom:16px">
        <div style="padding:14px 20px;display:flex;gap:12px;flex-wrap:wrap;align-items:center; justify-content:space-between;">
          <div style="display:flex; gap:10px;">
              <select id="invFilterKat" style="border:1px solid var(--border);border-radius:8px;padding:8px;"></select>
              <input id="invSearchInput" type="text" placeholder="Cari nama / kode..." style="border:1px solid var(--border);border-radius:8px;padding:8px;"/>
          </div>
          <div style="display:flex; gap:10px;">
              <button class="btn btn-primary btn-sm" onclick="alert('Buka Modal Tambah Item')">+ Tambah Item</button>
              <button class="btn btn-danger btn-sm" onclick="InventoryPage.batchDelete()">Hapus Terpilih</button>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" id="cbSelectAll" onchange="InventoryPage.toggleAllCb(this)"></th>
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
              <tr><td colspan="8"><div class="empty-state"><p>Memuat data...</p></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    _initCharts(); // Panggil fungsi render chart
    
    // Event listeners sisanya sama...
  }

  function _initCharts() {
      // Pastikan ada Chart.js di index.html/dashboard.html lo
      if(typeof Chart === 'undefined') return;
      
      const ctxBar = document.getElementById('invBarChart').getContext('2d');
      new Chart(ctxBar, {
          type: 'bar',
          data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
              datasets: [{ label: 'Barang Masuk', data: [65, 59, 80, 81, 56, 55], backgroundColor: '#1A3FAA' }]
          }
      });

      const ctxPie = document.getElementById('invPieChart').getContext('2d');
      new Chart(ctxPie, {
          type: 'doughnut',
          data: {
              labels: ['Seragam', 'Buku', 'Atribut'],
              datasets: [{ data: [300, 50, 100], backgroundColor: ['#1A3FAA', '#E8B800', '#D94040'] }]
          }
      });
  }

  function toggleAllCb(source) {
      const checkboxes = document.querySelectorAll('.cb-batch');
      checkboxes.forEach(cb => cb.checked = source.checked);
  }

  function batchDelete() {
      const selected = document.querySelectorAll('.cb-batch:checked');
      if(selected.length === 0) { showToast('Pilih minimal 1 item untuk dihapus', 'error'); return; }
      if(confirm('Hapus ' + selected.length + ' item terpilih?')) {
          showToast('Berhasil menghapus item terpilih', 'success');
          // Hit API Delete di sini
      }
  }

  // Update render tbody untuk masukin checkbox 
  // <td><input type="checkbox" class="cb-batch" value="${item.id}"></td>
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

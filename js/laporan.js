// ============================================================
// laporan.js — Laporan ringkasan & Activity Log
// ============================================================

const LaporanPage = (() => {

  function mount() {
    const page = document.getElementById('page-laporan');
    page.innerHTML = `
      <div style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid var(--border)">
        <button class="lap-tab active" data-tab="rekap" onclick="LaporanPage.switchTab('rekap')">Rekap Stok</button>
        <button class="lap-tab" data-tab="log" onclick="LaporanPage.switchTab('log')">Activity Log</button>
      </div>
      <style>
        .lap-tab{background:none;border:none;padding:10px 20px;font-size:13.5px;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color .15s,border-color .15s}
        .lap-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
      </style>

      <!-- TAB: Rekap Stok -->
      <div id="lapTabRekap">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:24px" id="lapStatCards">
          <div class="stat-card"><div class="skeleton" style="height:12px;width:60%;margin-bottom:12px"></div><div class="skeleton" style="height:28px;width:40%"></div></div>
          <div class="stat-card"><div class="skeleton" style="height:12px;width:60%;margin-bottom:12px"></div><div class="skeleton" style="height:28px;width:40%"></div></div>
          <div class="stat-card"><div class="skeleton" style="height:12px;width:60%;margin-bottom:12px"></div><div class="skeleton" style="height:28px;width:40%"></div></div>
        </div>

        <div class="section-card">
          <div class="section-head">
            <h2>Ringkasan per Kategori</h2>
            <button class="btn btn-outline btn-sm" onclick="LaporanPage.loadRekap()">Refresh</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Kategori</th><th>Total Item</th><th>Total Unit Stok</th><th>Item Kosong</th><th>Belum Diopname</th><th>Estimasi Nilai Stok</th></tr></thead>
              <tbody id="lapRekapBody">
                <tr><td colspan="6"><div class="empty-state"><p>Memuat...</p></div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB: Activity Log -->
      <div id="lapTabLog" style="display:none">
        <div class="section-card">
          <div class="section-head">
            <h2>Activity Log</h2>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <select id="logFilterTipe" style="border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px">
                <option value="">Semua Aksi</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="CREATE">Create</option>
                <option value="EDIT">Edit</option>
                <option value="DELETE">Delete</option>
                <option value="APPROVE">Approve</option>
                <option value="REJECT">Reject</option>
              </select>
              <button class="btn btn-outline btn-sm" onclick="LaporanPage.loadLog()">Refresh</button>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Modul</th><th>Target</th><th>Deskripsi</th><th>Status</th></tr></thead>
              <tbody id="lapLogBody">
                <tr><td colspan="7"><div class="empty-state"><p>Memuat...</p></div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('logFilterTipe').addEventListener('change', loadLog);
    loadRekap();
  }

  function switchTab(tab) {
    ['rekap','log'].forEach(t => {
      document.getElementById(`lapTab${t.charAt(0).toUpperCase()+t.slice(1)}`).style.display = t === tab ? '' : 'none';
      document.querySelector(`.lap-tab[data-tab="${t}"]`)?.classList.toggle('active', t === tab);
    });
    if (tab === 'log') loadLog();
  }

  // ── Rekap stok per kategori ──
  async function loadRekap() {
    const tbody = document.getElementById('lapRekapBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Memuat...</p></div></td></tr>`;

    const [listRes, katRes, statsRes] = await Promise.all([
      apiCall('getInventoryList', {}),
      apiCall('getKategoriList', {}),
      StatsAPI.getDashboard(),
    ]);

    // Update stat cards
    if (statsRes?.success) {
      const d    = statsRes.data;
      const grid = document.getElementById('lapStatCards');
      if (grid && d.inventory) {
        grid.innerHTML = [
          { label: 'Total Item Aktif',  value: d.inventory.activeItems, sub: 'dari semua kategori' },
          { label: 'Total Unit Stok',   value: d.inventory.totalStok,   sub: 'di semua batch' },
          { label: 'Item Stok Kosong',  value: d.inventory.kosong,      sub: 'perlu restock', alert: d.inventory.kosong > 0 },
          { label: 'Belum Diopname',    value: d.inventory.belumOpname, sub: 'qty belum diisi', alert: d.inventory.belumOpname > 0 },
        ].map(s => `
          <div class="stat-card" style="${s.alert ? 'border-left:3px solid var(--accent)' : ''}">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value">${s.value}</div>
            <div class="stat-sub">${s.sub}</div>
          </div>`).join('');
      }
    }

    if (!listRes?.success || !katRes?.success) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Gagal memuat data.</p></div></td></tr>`;
      return;
    }

    const items   = listRes.data || [];
    const katList = katRes.data || [];
    const katMap  = {};
    katList.forEach(k => { katMap[k.id] = k.nama; });

    // Group by kategori
    const byKat = {};
    items.forEach(item => {
      const k = item.kategori;
      if (!byKat[k]) byKat[k] = { nama: katMap[k] || k, items: 0, totalQty: 0, kosong: 0, belumOpname: 0, nilaiEstimasi: 0 };
      byKat[k].items++;
      byKat[k].totalQty    += item.totalQty || 0;
      if (item.stockStatus === 'kosong')         byKat[k].kosong++;
      if (item.stockStatus === 'belum_diopname') byKat[k].belumOpname++;
      byKat[k].nilaiEstimasi += (item.totalQty || 0) * (item.sellPrice || 0);
    });

    const rows = Object.entries(byKat);
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Tidak ada data.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(([katId, d]) => `
      <tr>
        <td><strong>${d.nama}</strong><br><span style="font-family:monospace;font-size:11px;color:var(--muted)">${katId}</span></td>
        <td>${d.items} item</td>
        <td><strong>${d.totalQty.toLocaleString('id-ID')}</strong> unit</td>
        <td>${d.kosong > 0 ? `<span class="badge badge-red">${d.kosong}</span>` : `<span style="color:var(--muted)">0</span>`}</td>
        <td>${d.belumOpname > 0 ? `<span class="badge badge-yellow">${d.belumOpname}</span>` : `<span style="color:var(--muted)">0</span>`}</td>
        <td style="font-size:12.5px">Rp ${d.nilaiEstimasi.toLocaleString('id-ID')}</td>
      </tr>`).join('');
  }

  // ── Activity Log ──
  async function loadLog() {
    const tbody      = document.getElementById('lapLogBody');
    const filterTipe = document.getElementById('logFilterTipe')?.value || '';
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>Memuat...</p></div></td></tr>`;

    const res = await LogAPI.getAll(200);
    if (!res?.success) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>${res?.message || 'Gagal memuat.'}</p></div></td></tr>`;
      return;
    }

    let logs = res.data || [];
    if (filterTipe) logs = logs.filter(l => l.tipe === filterTipe);

    if (!logs.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>Tidak ada log ditemukan.</p></div></td></tr>`;
      return;
    }

    const tipeBadge = {
      'LOGIN':  'badge-green', 'LOGOUT': 'badge-gray',
      'CREATE': 'badge-blue',  'EDIT':   'badge-yellow',
      'DELETE': 'badge-red',   'APPROVE':'badge-green',
      'REJECT': 'badge-red',   'REKON':  'badge-yellow',
    };

    tbody.innerHTML = logs.map(l => `
      <tr>
        <td style="font-size:12px;white-space:nowrap">${l.time ? new Date(l.time).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}</td>
        <td style="font-family:monospace;font-size:12px">${l.userId || '—'}</td>
        <td><span class="badge ${tipeBadge[l.tipe] || 'badge-gray'}">${l.tipe}</span></td>
        <td style="font-size:12.5px">${l.modul}${l.subModul ? ' · '+l.subModul : ''}</td>
        <td style="font-family:monospace;font-size:11.5px;color:var(--muted)">${l.target || '—'}</td>
        <td style="font-size:12.5px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${l.deskripsi}">${l.deskripsi || '—'}</td>
        <td><span class="badge ${l.status === 'SUCCESS' ? 'badge-green' : 'badge-red'}">${l.status}</span></td>
      </tr>`).join('');
  }

  return { mount, switchTab, loadRekap, loadLog };
})();

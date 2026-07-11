// ============================================================
// laporan.js — Laporan ringkasan & Activity Log
// ============================================================

const LaporanPage = (() => {

  function mount() {
    const page = document.getElementById('page-laporan');
    page.innerHTML = `
      <div style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid var(--border)">
        <button class="lap-tab active" data-tab="export" onclick="LaporanPage.switchTab('export')">📥 Stok</button>
        <button class="lap-tab" data-tab="penjualan" onclick="LaporanPage.switchTab('penjualan')">💰 Penjualan</button>
        <button class="lap-tab" data-tab="rekap" onclick="LaporanPage.switchTab('rekap')">📊 Rekap</button>
        <button class="lap-tab" data-tab="log" onclick="LaporanPage.switchTab('log')">📋 Activity Log</button>
      </div>
      <style>
        .lap-tab{background:none;border:none;padding:10px 20px;font-size:13.5px;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color .15s,border-color .15s}
        .lap-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
      </style>

      <!-- TAB: Export Laporan Excel -->
      <div id="lapTabExport">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:760px">

          <!-- Laporan Harian -->
          <div class="section-card">
            <div class="section-head"><h2>📅 Laporan Harian</h2></div>
            <div style="padding:20px 22px">
              <p style="font-size:13.5px;color:var(--muted);margin-bottom:16px;line-height:1.6">
                Laporan stok inventory hari ini. Berisi ringkasan per kategori
                dan detail per item dalam format Excel (.xlsx).
              </p>
              <div class="form-row">
                <label>Tanggal</label>
                <input type="date" id="tglHarian"
                  style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;font-family:'Inter',sans-serif;outline:none"/>
              </div>
              <button class="btn btn-primary" style="width:100%;margin-bottom:8px" id="btnGenHarian" onclick="LaporanPage.generate('harian')">
                Generate & Download Harian
              </button>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <button class="btn btn-outline" style="font-size:12.5px" onclick="LaporanPage.printLaporan('harian','stok')">🖨️ Print</button>
                <button class="btn btn-outline" style="font-size:12.5px" onclick="LaporanPage.openSendEmail('harian','stok')">📧 Send Email</button>
              </div>
              <div id="statusHarian" style="margin-top:10px;font-size:13px"></div>
            </div>
          </div>

          <!-- Laporan Bulanan -->
          <div class="section-card">
            <div class="section-head"><h2>📆 Laporan Bulanan</h2></div>
            <div style="padding:20px 22px">
              <p style="font-size:13.5px;color:var(--muted);margin-bottom:16px;line-height:1.6">
                Laporan stok inventory per bulan. Cocok untuk evaluasi
                bulanan dan laporan ke pimpinan yayasan.
              </p>
              <div class="form-row">
                <label>Bulan & Tahun</label>
                <input type="month" id="blnBulanan"
                  style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;font-family:'Inter',sans-serif;outline:none"/>
              </div>
              <button class="btn btn-primary" style="width:100%;margin-bottom:8px" id="btnGenBulanan" onclick="LaporanPage.generate('bulanan')">
                Generate & Download Bulanan
              </button>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <button class="btn btn-outline" style="font-size:12.5px" onclick="LaporanPage.printLaporan('bulanan','stok')">🖨️ Print</button>
                <button class="btn btn-outline" style="font-size:12.5px" onclick="LaporanPage.openSendEmail('bulanan','stok')">📧 Send Email</button>
              </div>
              <div id="statusBulanan" style="margin-top:10px;font-size:13px"></div>
            </div>
          </div>
        </div>

        <!-- Info auto email -->
        <div class="section-card" style="max-width:760px;margin-top:20px">
          <div class="section-head"><h2>⏰ Jadwal Email Otomatis</h2></div>
          <div style="padding:16px 22px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:13.5px">
              <div style="background:#EFF6FF;border-radius:8px;padding:14px">
                <div style="font-weight:700;color:#1A3FAA;margin-bottom:4px">📧 Email Harian</div>
                <div style="color:#6B7280">Dikirim setiap hari pukul <strong>06:00</strong> ke email Kepala Yayasan</div>
              </div>
              <div style="background:#F5F3FF;border-radius:8px;padding:14px">
                <div style="font-weight:700;color:#7C3AED;margin-bottom:4px">📧 Email Bulanan</div>
                <div style="color:#6B7280">Dikirim setiap tanggal <strong>1</strong> pukul 07:00 ke email Kepala Yayasan</div>
              </div>
            </div>
            <p style="font-size:12.5px;color:#9CA3AF;margin-top:12px">
              ⚙️ Untuk mengaktifkan email otomatis: buka GAS Editor → jalankan fungsi
              <code style="background:#F3F4F6;padding:2px 6px;border-radius:4px">setupLaporanTriggers()</code> sekali.
            </p>
          </div>
        </div>
      </div>

      <!-- TAB: Laporan Penjualan -->
      <div id="lapTabPenjualan" style="display:none">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:760px">

          <!-- Penjualan Harian -->
          <div class="section-card">
            <div class="section-head"><h2>📅 Penjualan Harian</h2></div>
            <div style="padding:20px 22px">
              <p style="font-size:13.5px;color:var(--muted);margin-bottom:16px;line-height:1.6">Rekap penjualan hari ini: total omzet, item terlaris, detail per transaksi.</p>
              <div class="form-row"><label>Tanggal</label>
                <input type="date" id="tglPenjHarian"
                  style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;font-family:'Inter',sans-serif;outline:none"/>
              </div>
              <button class="btn btn-primary" style="width:100%;margin-bottom:8px" id="btnGenPenjHarian" onclick="LaporanPage.generatePenjualan('harian')">
                Generate & Download
              </button>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <button class="btn btn-outline" style="font-size:12.5px" onclick="LaporanPage.printLaporan('harian','penjualan')">🖨️ Print</button>
                <button class="btn btn-outline" style="font-size:12.5px" onclick="LaporanPage.openSendEmail('harian','penjualan')">📧 Send Email</button>
              </div>
              <div id="statusPenjHarian" style="margin-top:10px;font-size:13px"></div>
            </div>
          </div>

          <!-- Penjualan Bulanan -->
          <div class="section-card">
            <div class="section-head"><h2>📆 Penjualan Bulanan</h2></div>
            <div style="padding:20px 22px">
              <p style="font-size:13.5px;color:var(--muted);margin-bottom:16px;line-height:1.6">Rekap penjualan per bulan untuk evaluasi dan laporan ke pimpinan.</p>
              <div class="form-row"><label>Bulan & Tahun</label>
                <input type="month" id="blnPenjBulanan"
                  style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;font-family:'Inter',sans-serif;outline:none"/>
              </div>
              <button class="btn btn-primary" style="width:100%;margin-bottom:8px" id="btnGenPenjBulanan" onclick="LaporanPage.generatePenjualan('bulanan')">
                Generate & Download
              </button>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <button class="btn btn-outline" style="font-size:12.5px" onclick="LaporanPage.printLaporan('bulanan','penjualan')">🖨️ Print</button>
                <button class="btn btn-outline" style="font-size:12.5px" onclick="LaporanPage.openSendEmail('bulanan','penjualan')">📧 Send Email</button>
              </div>
              <div id="statusPenjBulanan" style="margin-top:10px;font-size:13px"></div>
            </div>
          </div>
        </div>
      </div>

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

    // Set tanggal default
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);
    ['tglHarian','tglPenjHarian'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = today;
    });
    ['blnBulanan','blnPenjBulanan'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = thisMonth;
    });

    // Default tab: export
    switchTab('export');
  }

  function switchTab(tab) {
    ['export','penjualan','rekap','log'].forEach(t => {
      const el = document.getElementById('lapTab' + t.charAt(0).toUpperCase() + t.slice(1));
      if (el) el.style.display = t === tab ? '' : 'none';
      document.querySelector(`.lap-tab[data-tab="${t}"]`)?.classList.toggle('active', t === tab);
    });
    if (tab === 'log')  loadLog();
    if (tab === 'rekap') loadRekap();
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

  // ── Generate & Download Laporan ──
  async function generate(tipe) {
    const btnId    = tipe === 'harian' ? 'btnGenHarian' : 'btnGenBulanan';
    const statusId = tipe === 'harian' ? 'statusHarian' : 'statusBulanan';
    const inputId  = tipe === 'harian' ? 'tglHarian'   : 'blnBulanan';

    const btn      = document.getElementById(btnId);
    const statusEl = document.getElementById(statusId);
    const inputVal = document.getElementById(inputId)?.value;

    if (!inputVal) { showToast('Pilih tanggal/bulan dulu.', 'error'); return; }

    btn.disabled    = true;
    btn.textContent = 'Generating...';
    statusEl.innerHTML = '<span style="color:var(--muted)">⏳ Sedang membuat laporan Excel di server... (30-60 detik)</span>';

    const tanggal = tipe === 'harian' ? inputVal : inputVal + '-01';
    const res     = await apiCall('generateLaporan', { tipe, tanggal });

    btn.disabled    = false;
    btn.textContent = tipe === 'harian' ? 'Generate & Download Harian' : 'Generate & Download Bulanan';

    if (!res?.success) {
      statusEl.innerHTML = `<span style="color:var(--danger)">✗ ${res?.message || 'Gagal generate laporan.'}</span>`;
      showToast(res?.message || 'Gagal.', 'error');
      return;
    }

    statusEl.innerHTML = `
      <div style="background:#DCFCE7;border:1px solid #BBF7D0;border-radius:8px;padding:12px 14px">
        <div style="color:#166534;font-weight:600;margin-bottom:6px">✓ Laporan berhasil dibuat!</div>
        <div style="font-size:12.5px;color:#166534;margin-bottom:10px">
          ${res.stats?.totalItem} item · ${res.stats?.itemKosong} kosong
        </div>
        <a href="${res.downloadUrl}" target="_blank"
          style="display:inline-block;background:#16A34A;color:#fff;padding:8px 20px;border-radius:7px;text-decoration:none;font-size:13px;font-weight:700">
          📥 Download ${res.fileName}.xlsx
        </a>
      </div>`;
    showToast('Laporan berhasil dibuat!', 'success');
  }

  // ── Generate laporan penjualan ──
  async function generatePenjualan(tipe) {
    const btnId    = tipe === 'harian' ? 'btnGenPenjHarian' : 'btnGenPenjBulanan';
    const statusId = tipe === 'harian' ? 'statusPenjHarian' : 'statusPenjBulanan';
    const inputId  = tipe === 'harian' ? 'tglPenjHarian'   : 'blnPenjBulanan';
    const btn      = document.getElementById(btnId);
    const statusEl = document.getElementById(statusId);
    const inputVal = document.getElementById(inputId)?.value;
    if (!inputVal) { showToast('Pilih tanggal/bulan dulu.', 'error'); return; }
    btn.disabled = true; btn.textContent = 'Generating...';
    statusEl.innerHTML = '<span style="color:var(--muted)">⏳ Membuat laporan... (30-60 detik)</span>';

    const tanggal = tipe === 'harian' ? inputVal : inputVal + '-01';
    const res     = await apiCall('generateLaporanPenjualan', { tipe, tanggal });
    btn.disabled = false; btn.textContent = 'Generate & Download';

    if (!res?.success) {
      statusEl.innerHTML = `<span style="color:var(--danger)">✗ ${res?.message||'Gagal.'}</span>`;
      showToast(res?.message||'Gagal.','error'); return;
    }
    statusEl.innerHTML = `
      <div style="background:#DCFCE7;border:1px solid #BBF7D0;border-radius:8px;padding:12px 14px">
        <div style="color:#166534;font-weight:600;margin-bottom:6px">✓ Laporan berhasil dibuat!</div>
        <div style="font-size:12.5px;color:#166534;margin-bottom:10px">${res.stats?.totalTx} transaksi · Rp ${parseInt(res.stats?.totalNilai||0).toLocaleString('id-ID')}</div>
        <a href="${res.downloadUrl}" target="_blank"
          style="display:inline-block;background:#16A34A;color:#fff;padding:8px 20px;border-radius:7px;text-decoration:none;font-size:13px;font-weight:700">
          📥 Download ${res.fileName}.xlsx
        </a>
      </div>`;
    showToast('Laporan penjualan berhasil dibuat!','success');
  }

  // ── Print laporan (generate → buka tab baru → print) ──
  async function printLaporan(tipe, jenis) {
    showToast('Generate laporan untuk print...', 'info');
    const inputId = tipe==='harian' ? (jenis==='stok'?'tglHarian':'tglPenjHarian') : (jenis==='stok'?'blnBulanan':'blnPenjBulanan');
    const inputVal = document.getElementById(inputId)?.value;
    if (!inputVal) { showToast('Pilih tanggal dulu.','error'); return; }
    const tanggal = tipe==='harian' ? inputVal : inputVal+'-01';
    const action  = jenis==='stok' ? 'generateLaporan' : 'generateLaporanPenjualan';
    const res     = await apiCall(action, { tipe, tanggal });
    if (!res?.success) { showToast(res?.message||'Gagal generate.','error'); return; }
    // Buka spreadsheet di tab baru (user bisa print dari sana)
    const printUrl = res.downloadUrl.replace('/export?format=xlsx', '/export?format=pdf&portrait=true&size=A4');
    window.open(printUrl, '_blank');
    showToast('Laporan dibuka di tab baru. Gunakan Ctrl+P untuk print.','success');
  }

  // ── Modal send email ──
  function openSendEmail(tipe, jenis) {
    const existing = document.getElementById('modalSendEmail');
    if (existing) existing.remove();
    const inputId  = tipe==='harian' ? (jenis==='stok'?'tglHarian':'tglPenjHarian') : (jenis==='stok'?'blnBulanan':'blnPenjBulanan');
    const inputVal = document.getElementById(inputId)?.value || '';

    const m = document.createElement('div');
    m.className = 'modal-overlay show';
    m.id = 'modalSendEmail';
    m.innerHTML = `
      <div class="modal" style="max-width:400px">
        <div class="modal-header">
          <h3>📧 Kirim Laporan via Email</h3>
          <button class="modal-close" onclick="document.getElementById('modalSendEmail').remove()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div style="font-size:13.5px;color:var(--muted);margin-bottom:14px">
            Laporan: <strong>${jenis==='stok'?'Stok':'Penjualan'} ${tipe==='harian'?'Harian':'Bulanan'}</strong><br>
            Periode: <strong>${inputVal||'—'}</strong>
          </div>
          <div class="form-row"><label>Email Tujuan *</label>
            <input type="email" id="sendEmailTo" placeholder="email@gmail.com"
              style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;font-family:'Inter',sans-serif;outline:none"/>
          </div>
          <div id="sendEmailStatus" style="margin-top:8px;font-size:13px"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalSendEmail').remove()">Batal</button>
          <button class="btn btn-primary" id="btnSendEmailNow" onclick="LaporanPage._doSendEmail('${tipe}','${jenis}','${inputVal}')">Kirim</button>
        </div>
      </div>`;
    m.addEventListener('click', e => { if (e.target===m) m.remove(); });
    document.body.appendChild(m);
  }

  async function _doSendEmail(tipe, jenis, tanggalInput) {
    const emailTo = document.getElementById('sendEmailTo')?.value.trim();
    const statusEl = document.getElementById('sendEmailStatus');
    if (!emailTo || !emailTo.includes('@')) {
      statusEl.innerHTML = '<span style="color:var(--danger)">Masukkan email yang valid.</span>'; return;
    }
    const btn = document.getElementById('btnSendEmailNow');
    btn.disabled = true; btn.textContent = 'Mengirim...';
    statusEl.innerHTML = '<span style="color:var(--muted)">⏳ Generate dan kirim laporan...</span>';

    const tanggal = tipe==='harian' ? tanggalInput : tanggalInput+'-01';
    const res     = await apiCall('kirimEmailLaporan', { tipe, jenis, tanggal, emailTujuan: emailTo });

    btn.disabled = false; btn.textContent = 'Kirim';
    if (res?.success) {
      statusEl.innerHTML = '<span style="color:var(--success)">✓ Email berhasil dikirim!</span>';
      setTimeout(() => document.getElementById('modalSendEmail')?.remove(), 1500);
      showToast('Laporan berhasil dikirim ke ' + emailTo, 'success');
    } else {
      statusEl.innerHTML = `<span style="color:var(--danger)">✗ ${res?.message||'Gagal kirim.'}</span>`;
    }
  }

  return { mount, switchTab, loadRekap, loadLog, generate, generatePenjualan, printLaporan, openSendEmail, _doSendEmail };
})();

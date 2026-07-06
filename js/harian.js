// ============================================================
// harian.js — Dashboard Harian + Retur Request Management
// ============================================================

const HarianPage = (() => {

  function mount() {
    const page = document.getElementById('page-harian');
    page.innerHTML = `
      <div style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid var(--border)">
        <button class="har-tab active" data-tab="dashboard" onclick="HarianPage.switchTab('dashboard')">Dashboard Harian</button>
        <button class="har-tab" data-tab="reservasi" onclick="HarianPage.switchTab('reservasi')">Reservasi</button>
        <button class="har-tab" data-tab="retur" onclick="HarianPage.switchTab('retur')">Retur Request</button>
      </div>
      <style>
        .har-tab{background:none;border:none;padding:10px 20px;font-size:13.5px;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color .15s,border-color .15s}
        .har-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
      </style>

      <!-- TAB: Dashboard Harian -->
      <div id="harTabDashboard">
        <div class="stat-grid" id="harStatGrid" style="margin-bottom:24px"></div>
        <div class="section-card">
          <div class="section-head">
            <h2>Penjualan per Item Hari Ini</h2>
            <button class="btn btn-outline btn-sm" onclick="HarianPage.loadDashboard()">Refresh</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Total Qty Terjual</th><th>Total Nilai</th></tr></thead>
              <tbody id="harPenjualanBody">
                <tr><td colspan="3"><div class="empty-state"><p>Memuat...</p></div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB: Reservasi -->
      <div id="harTabReservasi" style="display:none">
        <div class="section-card">
          <div class="section-head">
            <h2>Daftar Reservasi</h2>
            <div style="display:flex;gap:8px">
              <select id="resFilterStatus" style="border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px">
                <option value="">Semua Status</option>
                <option value="Menunggu">Menunggu</option>
                <option value="Dikonfirmasi">Dikonfirmasi</option>
                <option value="Dibatalkan">Dibatalkan</option>
                <option value="Selesai">Selesai</option>
              </select>
              <button class="btn btn-outline btn-sm" onclick="HarianPage.loadReservasi()">Refresh</button>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Tanggal</th><th>Orang Tua</th><th>Anak / Kelas</th><th>Item</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody id="resTableBody">
                <tr><td colspan="7"><div class="empty-state"><p>Memuat...</p></div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB: Retur Request -->
      <div id="harTabRetur" style="display:none">
        <div class="section-card">
          <div class="section-head">
            <h2>Retur Request dari Orang Tua</h2>
            <div style="display:flex;gap:8px">
              <select id="rrFilterStatus" style="border:1.5px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px">
                <option value="">Semua Status</option>
                <option value="Menunggu Review">Menunggu Review</option>
                <option value="Approval Kep.Bagian">Approval Kep.Bagian</option>
                <option value="Approval Kep.Yayasan">Approval Kep.Yayasan</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Ditolak Admin">Ditolak</option>
              </select>
              <button class="btn btn-outline btn-sm" onclick="HarianPage.loadReturRequest()">Refresh</button>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Tanggal</th><th>Nama</th><th>No HP</th><th>Kode TX</th><th>Item</th><th>Qty</th><th>Kondisi</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody id="rrTableBody">
                <tr><td colspan="10"><div class="empty-state"><p>Memuat...</p></div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('resFilterStatus').addEventListener('change', loadReservasi);
    document.getElementById('rrFilterStatus').addEventListener('change', loadReturRequest);
    loadDashboard();
  }

  function switchTab(tab) {
    ['dashboard','reservasi','retur'].forEach(t => {
      const key = t.charAt(0).toUpperCase()+t.slice(1);
      document.getElementById(`harTab${key}`).style.display = t===tab?'':'none';
      document.querySelector(`.har-tab[data-tab="${t}"]`)?.classList.toggle('active',t===tab);
    });
    if (tab==='reservasi') loadReservasi();
    if (tab==='retur')     loadReturRequest();
  }

  // ── Dashboard Harian ──
  async function loadDashboard() {
    const grid  = document.getElementById('harStatGrid');
    const tbody = document.getElementById('harPenjualanBody');
    if (!grid || !tbody) return;

    const res = await apiCall('getDashboardHarian', {});
    if (!res?.success) {
      tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state"><p>Gagal memuat.</p></div></td></tr>`;
      return;
    }

    const d = res.data;
    const today = new Date(d.tanggal).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

    // Stat cards
    grid.innerHTML = [
      { label: 'Transaksi Hari Ini', value: d.totalTransaksi, sub: today },
      { label: 'Total Penjualan',    value: 'Rp '+parseInt(d.totalNilaiHariIni).toLocaleString('id-ID'), sub: 'nilai hari ini' },
      { label: 'Retur Masuk',        value: d.returHariIni, sub: 'pengajuan hari ini', alert: d.returHariIni>0 },
      { label: 'Reservasi Pending',  value: d.reservasiPending, sub: 'menunggu konfirmasi', alert: d.reservasiPending>0 },
    ].map(s => `
      <div class="stat-card" style="${s.alert?'border-left:3px solid var(--accent)':''}">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-sub">${s.sub}</div>
      </div>`).join('');

    // Tabel penjualan per item
    const items = d.penjualanPerItem;
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state"><p>Belum ada penjualan hari ini.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(i => `
      <tr>
        <td><strong>${i.namaItem || i.itemId}</strong></td>
        <td><strong>${i.totalQty}</strong> unit</td>
        <td>Rp ${parseInt(i.totalNilai).toLocaleString('id-ID')}</td>
      </tr>`).join('');
  }

  // ── Reservasi ──
  async function loadReservasi() {
    const tbody  = document.getElementById('resTableBody');
    const status = document.getElementById('resFilterStatus')?.value || '';
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>Memuat...</p></div></td></tr>`;

    const res = await apiCall('getReservasiList', { status });
    if (!res?.success) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>${res?.message||'Gagal.'}</p></div></td></tr>`;
      return;
    }

    const list = res.data || [];
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>Tidak ada reservasi.</p></div></td></tr>`;
      return;
    }

    const role       = Session.getUser()?.roleId;
    const canKonfirm = ['R-01','R-02','R-04'].includes(role);

    const statusBadge = s => ({
      'Menunggu':     '<span class="badge badge-yellow">Menunggu</span>',
      'Dikonfirmasi': '<span class="badge badge-green">Dikonfirmasi</span>',
      'Dibatalkan':   '<span class="badge badge-red">Dibatalkan</span>',
      'Selesai':      '<span class="badge badge-blue">Selesai</span>',
    }[s] || `<span class="badge badge-gray">${s}</span>`);

    tbody.innerHTML = list.map(r => `
      <tr>
        <td style="font-family:monospace;font-size:12px">${r.id}</td>
        <td style="font-size:12.5px">${r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID',{day:'numeric',month:'short'}) : '—'}</td>
        <td>
          <strong>${r.namaOrtu}</strong>
          <div style="font-size:12px;color:var(--muted)">${r.noHp}</div>
        </td>
        <td>
          ${r.namaAnak}
          <div style="font-size:12px;color:var(--muted)">${r.kelas}${r.jenjang?' · '+r.jenjang:''}</div>
        </td>
        <td style="font-size:12.5px">${r.items.map(i=>`${i.namaItem} (${i.qty})`).join(', ')}</td>
        <td>${statusBadge(r.status)}</td>
        <td>
          ${r.status==='Menunggu' && canKonfirm ? `
            <div style="display:flex;gap:5px">
              <button class="btn btn-primary btn-sm" onclick="HarianPage.konfirmasi('${r.id}','konfirmasi')">✓</button>
              <button class="btn btn-outline btn-sm" onclick="HarianPage.konfirmasi('${r.id}','tolak')">✕</button>
            </div>` : `<span style="font-size:12px;color:var(--muted)">${r.catatanStaff||'—'}</span>`}
        </td>
      </tr>`).join('');
  }

  async function konfirmasi(resId, action) {
    const catatan = action==='tolak' ? prompt('Alasan pembatalan:') || '' : '';
    if (action==='tolak' && catatan===null) return;

    const res = await apiCall('konfirmasiReservasi', { resId, action, catatanStaff: catatan });
    showToast(res?.message||(res?.success?'Berhasil.':'Gagal.'), res?.success?'success':'error');
    if (res?.success) loadReservasi();
  }

  // ── Retur Request ──
  async function loadReturRequest() {
    const tbody  = document.getElementById('rrTableBody');
    const status = document.getElementById('rrFilterStatus')?.value || '';
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><p>Memuat...</p></div></td></tr>`;

    const res = await apiCall('getReturRequestList', { status });
    if (!res?.success) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><p>${res?.message||'Gagal.'}</p></div></td></tr>`;
      return;
    }

    const list = res.data || [];
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><p>Tidak ada retur request.</p></div></td></tr>`;
      return;
    }

    const role      = Session.getUser()?.roleId;
    const statusMap = {
      'Menunggu Review':       '<span class="badge badge-yellow">Menunggu Review</span>',
      'Ditolak Admin':         '<span class="badge badge-red">Ditolak</span>',
      'Ditolak Kep.Bagian':    '<span class="badge badge-red">Ditolak Kbag</span>',
      'Ditolak Kep.Yayasan':   '<span class="badge badge-red">Ditolak Kyay</span>',
      'Approval Kep.Bagian':   '<span class="badge badge-blue">Menunggu Kbag</span>',
      'Approval Kep.Yayasan':  '<span class="badge badge-blue">Menunggu Kyay</span>',
      'Disetujui':             '<span class="badge badge-green">Disetujui</span>',
    };

    tbody.innerHTML = list.map(r => {
      // Tentukan aksi berdasarkan status + role
      let actions = '';
      if (r.status==='Menunggu Review' && ['R-01','R-02'].includes(role)) {
        actions = `
          <button class="btn btn-primary btn-sm" onclick="HarianPage.prosesRR('${r.id}','review_ok')">Teruskan</button>
          <button class="btn btn-danger btn-sm" style="margin-top:4px" onclick="HarianPage.prosesRR('${r.id}','reject')">Tolak</button>`;
      } else if (r.status==='Approval Kep.Bagian' && role==='R-02') {
        actions = `
          <button class="btn btn-primary btn-sm" onclick="HarianPage.prosesRR('${r.id}','approve_kbag')">✓ Setujui</button>
          <button class="btn btn-danger btn-sm" style="margin-top:4px" onclick="HarianPage.prosesRR('${r.id}','reject_kbag')">✕ Tolak</button>`;
      } else if (r.status==='Approval Kep.Yayasan' && role==='R-01') {
        actions = `
          <button class="btn btn-primary btn-sm" onclick="HarianPage.prosesRR('${r.id}','approve_kyay')">✓ Setujui</button>
          <button class="btn btn-danger btn-sm" style="margin-top:4px" onclick="HarianPage.prosesRR('${r.id}','reject_kyay')">✕ Tolak</button>`;
      }

      return `<tr>
        <td style="font-family:monospace;font-size:11.5px">${r.id}</td>
        <td style="font-size:12px">${r.tanggal?new Date(r.tanggal).toLocaleDateString('id-ID',{day:'numeric',month:'short'}):'—'}</td>
        <td><strong style="font-size:13px">${r.namaOrtu}</strong></td>
        <td style="font-family:monospace;font-size:12px">${r.noHp}</td>
        <td style="font-family:monospace;font-size:12px">${r.kodeTransaksi}</td>
        <td style="font-size:12.5px">${r.namaItem}</td>
        <td>${r.qty}</td>
        <td style="font-size:12.5px">${r.kondisi}</td>
        <td>${statusMap[r.status]||`<span class="badge badge-gray">${r.status}</span>`}</td>
        <td><div style="display:flex;flex-direction:column;gap:4px">${actions||'—'}</div></td>
      </tr>`;
    }).join('');
  }

  async function prosesRR(rrId, action) {
    let catatan = '';
    if (action.includes('reject') || action.includes('tolak')) {
      catatan = prompt('Alasan penolakan:') || '';
      if (catatan === null) return;
    }
    const res = await apiCall('prosesReturRequest', { rrId, action, catatan });
    showToast(res?.message||(res?.success?'Berhasil.':'Gagal.'), res?.success?'success':'error');
    if (res?.success) loadReturRequest();
  }

  return { mount, switchTab, loadDashboard, loadReservasi, konfirmasi, loadReturRequest, prosesRR };
})();

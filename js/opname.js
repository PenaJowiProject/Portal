// ============================================================
// opname.js — Page Stock Opname: buat sesi, scan, rekon, approval
// ============================================================

const OpnamePage = (() => {

  let _currentSession = null; // sesi aktif
  let _progress       = null; // data progress terakhir
  let _kategoriList   = [];

  // ── Mount HTML ──
  function mount() {
    const page = document.getElementById('page-opname');
    page.innerHTML = `
      <!-- View: Pilih / buat sesi -->
      <div id="opnameViewStart">
        <div class="page-header">
          <h1>Stock Opname</h1>
          <p>Scan barcode dan input qty fisik untuk rekonsiliasi stok.</p>
        </div>
        <div class="section-card" style="max-width:480px">
          <div class="section-head"><h2>Buat Sesi Opname Baru</h2></div>
          <div style="padding:22px 24px">
            <div class="form-row">
              <label>Tipe Cakupan</label>
              <select id="opnameTipe">
                <option value="Partial">Partial (pilih kategori)</option>
                <option value="Full">Full (semua kategori)</option>
              </select>
            </div>
            <div class="form-row" id="rowOpnameKat">
              <label>Pilih Kategori</label>
              <div id="opnameKatCheckboxes" style="display:flex;flex-direction:column;gap:8px;margin-top:4px"></div>
            </div>
            <button class="btn btn-primary" id="btnBuatSesi" style="width:100%;margin-top:8px">Buat Sesi Opname</button>
          </div>
        </div>
      </div>

      <!-- View: Scan aktif -->
      <div id="opnameViewScan" style="display:none">
        <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px">
          <div>
            <h1>Scan Barcode</h1>
            <p id="opnameScanSubtitle">Sesi: — | Ronde: —</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" id="btnAdvanceRonde">Naik Ronde ↑</button>
            <button class="btn btn-primary btn-sm" id="btnCloseScan">Tutup Sesi Scan →</button>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="section-card" style="margin-bottom:16px">
          <div style="padding:14px 20px">
            <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px" id="opnameProgressBar"></div>
          </div>
        </div>

        <!-- Input scan -->
        <div class="section-card" style="margin-bottom:16px">
          <div class="section-head"><h2>Input Barcode</h2></div>
          <div style="padding:18px 22px;display:flex;gap:10px;flex-wrap:wrap">
            <input id="opnameBarcodeInput" type="text" placeholder="Scan / ketik barcode..."
              style="flex:1;min-width:200px;border:1.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;font-family:monospace"
              autocomplete="off" autocapitalize="none" />
            <button class="btn btn-primary" id="btnScanBarcode">Cari</button>
          </div>
          <!-- Hasil scan: nama item + batch untuk input qty -->
          <div id="opnameScanResult" style="padding:0 22px 22px;display:none"></div>
        </div>

        <!-- Tabel progress per item -->
        <div class="section-card">
          <div class="section-head"><h2>Progress Item</h2>
            <button class="btn btn-outline btn-sm" id="btnRefreshProgress">Refresh</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Item / Barcode</th><th>Batch</th><th>Qty Sistem</th><th>Qty Fisik</th><th>Selisih</th><th>Status</th></tr>
              </thead>
              <tbody id="opnameItemTable">
                <tr><td colspan="6"><div class="empty-state"><p>Memuat...</p></div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- View: Approval -->
      <div id="opnameViewApproval" style="display:none">
        <div class="page-header">
          <h1>Approval Opname</h1>
          <p>Checklist item yang disetujui, ditolak, atau perlu rekon ulang.</p>
        </div>
        <div class="section-card">
          <div class="section-head">
            <h2>Daftar Item Menunggu Approval</h2>
            <div style="display:flex;gap:8px">
              <button class="btn btn-outline btn-sm" id="btnApproveAll">✓ Approve Semua Pending</button>
              <button class="btn btn-primary btn-sm" id="btnCommitOpname">Commit ke Stock →</button>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Item</th><th>Batch</th><th>Qty Sistem</th><th>Qty Fisik</th><th>Selisih</th><th>Nilai Selisih</th><th>Status</th><th>Aksi</th></tr>
              </thead>
              <tbody id="opnameApprovalTable">
                <tr><td colspan="8"><div class="empty-state"><p>Memuat...</p></div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    _bindStartView();
    _loadKategori();
  }

  // ── Load kategori untuk checkbox ──
  async function _loadKategori() {
    const res = await apiCall('getKategoriList', {});
    _kategoriList = res?.data || [];
    _renderKatCheckboxes();
  }

  function _renderKatCheckboxes() {
    const wrap = document.getElementById('opnameKatCheckboxes');
    if (!wrap) return;
    wrap.innerHTML = _kategoriList.map(k => `
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13.5px">
        <input type="checkbox" value="${k.id}" style="width:15px;height:15px;cursor:pointer"> ${k.nama}
      </label>`).join('');
  }

  // ── Bind events di view Start ──
  function _bindStartView() {
    document.getElementById('opnameTipe').addEventListener('change', e => {
      document.getElementById('rowOpnameKat').style.display =
        e.target.value === 'Full' ? 'none' : '';
    });

    document.getElementById('btnBuatSesi').addEventListener('click', async () => {
      const tipe = document.getElementById('opnameTipe').value;
      let kategoriIds = [];
      if (tipe === 'Partial') {
        kategoriIds = [...document.querySelectorAll('#opnameKatCheckboxes input:checked')]
          .map(cb => cb.value);
        if (!kategoriIds.length) { showToast('Pilih minimal 1 kategori.', 'error'); return; }
      }

      const btn = document.getElementById('btnBuatSesi');
      btn.disabled = true; btn.textContent = 'Membuat sesi...';

      const res = await apiCall('createOpnameSession', { tipe, kategoriIds });
      btn.disabled = false; btn.textContent = 'Buat Sesi Opname';

      if (!res?.success) { showToast(res?.message || 'Gagal.', 'error'); return; }
      showToast(res.message, 'success');
      _currentSession = { id: res.opnameId, ronde: 1, maxRonde: 3 };
      _switchView('scan');
      _loadProgress();
    });
  }

  // ── Switch view ──
  function _switchView(view) {
    ['Start','Scan','Approval'].forEach(v => {
      const el = document.getElementById(`opnameView${v}`);
      if (el) el.style.display = v.toLowerCase() === view ? '' : 'none';
    });

    if (view === 'scan')     _bindScanView();
    if (view === 'approval') _bindApprovalView();
  }

  // ── Bind events di view Scan ──
  function _bindScanView() {
    document.getElementById('btnScanBarcode').onclick = _doScan;
    document.getElementById('opnameBarcodeInput').onkeydown = e => {
      if (e.key === 'Enter') _doScan();
    };
    document.getElementById('btnRefreshProgress').onclick = _loadProgress;
    document.getElementById('btnAdvanceRonde').onclick    = _doAdvanceRonde;
    document.getElementById('btnCloseScan').onclick       = _doCloseScan;
  }

  // ── Scan barcode: ambil semua batch item ──
  async function _doScan() {
    const barcode = document.getElementById('opnameBarcodeInput').value.trim();
    if (!barcode) return;

    const res = await apiCall('getInventoryByBarcode', { barcode });
    const resultDiv = document.getElementById('opnameScanResult');

    if (!res?.success) {
      resultDiv.style.display = '';
      resultDiv.innerHTML = `<div style="color:var(--danger);font-size:13.5px;padding:8px 0">${res?.message || 'Barcode tidak ditemukan.'}</div>`;
      return;
    }

    // Untuk setiap item (bisa >1 karena NP), tampilkan batch-nya
    const items = res.data;
    resultDiv.style.display = '';
    resultDiv.innerHTML = items.map(item => `
      <div style="margin-bottom:16px">
        <div style="font-weight:600;font-size:14px;margin-bottom:8px">${item.nama}
          <span style="font-size:11.5px;font-weight:400;color:var(--muted);font-family:monospace">${item.barcode}</span>
        </div>
        ${item.batches.map(b => {
          // Cari detail opname untuk batch ini
          const d = _progress?.items?.find(i => i.batchId === b.id);
          const qtyVal = d?.qtyFisik !== null && d?.qtyFisik !== undefined ? d.qtyFisik : '';
          const sudahScan = d?.statusScan === 'Selesai Scan';
          return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--bg);border-radius:8px;margin-bottom:6px;flex-wrap:wrap">
              <div style="flex:1;min-width:160px">
                <div style="font-size:11.5px;color:var(--muted)">Batch ${b.urutanFifo} · ${b.tanggalMasuk ? new Date(b.tanggalMasuk).toLocaleDateString('id-ID') : '—'}</div>
                <div style="font-size:12.5px">Modal: Rp ${parseInt(b.hargaModal).toLocaleString('id-ID')} · Sistem: <strong>${b.qtySistem}</strong></div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <input type="number" min="0" value="${qtyVal}"
                  id="qtyInput_${b.id}" placeholder="Qty fisik"
                  ${sudahScan ? 'disabled style="opacity:.6"' : ''}
                  style="width:90px;border:1.5px solid var(--border);border-radius:6px;padding:7px 10px;font-size:14px;font-family:monospace"/>
                <button class="btn btn-primary btn-sm" onclick="OpnamePage.submitQty('${d?.detailId || ''}','${b.id}')"
                  ${sudahScan ? 'disabled style="opacity:.6"' : ''}>
                  ${sudahScan ? '✓' : 'Submit'}
                </button>
              </div>
            </div>`;
        }).join('')}
      </div>`).join('<hr style="border:none;border-top:1px solid var(--border);margin:12px 0">');
  }

  // ── Submit qty fisik per batch ──
  async function submitQty(detailId, batchId) {
    const input  = document.getElementById(`qtyInput_${batchId}`);
    const qty    = input?.value;
    if (qty === '' || qty === null || qty === undefined) {
      showToast('Masukkan qty fisik dulu.', 'error'); return;
    }
    if (!detailId) {
      showToast('Item ini belum ada di sesi opname. Pastikan sesi sudah dibuat.', 'error'); return;
    }

    const res = await apiCall('submitQtyFisik', {
      opnameId: _currentSession.id,
      detailId: detailId,
      qtyFisik: parseInt(qty),
    });

    showToast(res?.message || (res?.success ? 'Tersimpan.' : 'Gagal.'), res?.success ? 'success' : 'error');
    if (res?.success) {
      _loadProgress();
      _doScan(); // refresh tampilan scan untuk barcode yang sama
    }
  }

  // ── Load progress sesi ──
  async function _loadProgress() {
    if (!_currentSession) return;
    const res = await apiCall('getOpnameProgress', { opnameId: _currentSession.id });
    if (!res?.success) return;

    _progress = res;
    _currentSession.ronde    = res.session.rondeSaatIni;
    _currentSession.maxRonde = res.session.maxRonde;

    // Update subtitle
    const sub = document.getElementById('opnameScanSubtitle');
    if (sub) sub.textContent = `Sesi: ${_currentSession.id} | Ronde ${_currentSession.ronde} dari ${_currentSession.maxRonde} | Status: ${res.session.status}`;

    // Update progress bar
    const pb = document.getElementById('opnameProgressBar');
    if (pb) {
      const s = res.summary;
      pb.innerHTML = `
        <span>Total: <strong>${s.totalItem}</strong></span>
        <span style="color:var(--muted)">Belum discan: <strong>${s.belumDiscan}</strong></span>
        <span style="color:#16A34A">Selesai: <strong>${s.selesaiScan}</strong></span>
        <span style="color:#E8B800">Perlu Rekon: <strong>${s.perluRekon}</strong></span>
        <span style="color:#1A3FAA">Pending Approval: <strong>${s.pending}</strong></span>`;
    }

    // Render tabel item
    _renderItemTable(res.items);

    // Auto switch ke approval kalau sesi udah bukan Berjalan
    if (res.session.status === 'Approval Kep.Bagian' ||
        res.session.status === 'Approval Kepala Yayasan' ||
        res.session.status === 'Siap Commit') {
      _switchView('approval');
      _loadApprovalTable();
    }
  }

  function _renderItemTable(items) {
    const tbody = document.getElementById('opnameItemTable');
    if (!tbody) return;
    if (!items?.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Belum ada data.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = items.map(d => {
      const selisihColor = d.selisih === null ? '' : d.selisih < 0 ? 'color:var(--danger)' : d.selisih > 0 ? 'color:var(--success)' : '';
      const statusBadge = {
        'Belum Discan': '<span class="badge badge-gray">Belum Discan</span>',
        'Berjalan':     '<span class="badge badge-yellow">Berjalan</span>',
        'Selesai Scan': '<span class="badge badge-blue">Selesai Scan</span>',
      }[d.statusScan] || '<span class="badge badge-gray">—</span>';

      const postBadge = {
        'Pending':    '<span class="badge badge-blue">Pending</span>',
        'Perlu Rekon':'<span class="badge badge-yellow">Perlu Rekon</span>',
        'Disetujui':  '<span class="badge badge-green">Disetujui</span>',
        'Ditolak':    '<span class="badge badge-red">Ditolak</span>',
      }[d.statusPosting] || '';

      return `<tr>
        <td style="font-family:monospace;font-size:12px">${d.itemId}</td>
        <td style="font-size:12px;color:var(--muted)">${d.batchId}</td>
        <td>${d.qtySistem}</td>
        <td>${d.qtyFisik !== null ? d.qtyFisik : '—'}</td>
        <td style="${selisihColor};font-weight:600">${d.selisih !== null ? (d.selisih >= 0 ? '+' : '') + d.selisih : '—'}</td>
        <td>${statusBadge} ${postBadge}</td>
      </tr>`;
    }).join('');
  }

  // ── Naik ronde ──
  async function _doAdvanceRonde() {
    if (!_currentSession) return;
    const res = await apiCall('advanceRonde', { opnameId: _currentSession.id });
    showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
    if (res?.success) _loadProgress();
  }

  // ── Tutup sesi scan → ke approval ──
  async function _doCloseScan() {
    if (!_currentSession) return;
    if (!confirm('Tutup sesi scan dan lanjut ke tahap approval?')) return;
    const res = await apiCall('closeOpnameForApproval', { opnameId: _currentSession.id });
    showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
    if (res?.success) { _switchView('approval'); _loadApprovalTable(); }
  }

  // ── Approval view ──
  function _bindApprovalView() {
    document.getElementById('btnApproveAll').onclick  = _doApproveAll;
    document.getElementById('btnCommitOpname').onclick = _doCommit;
    _loadApprovalTable();
  }

  async function _loadApprovalTable() {
    if (!_currentSession) return;
    const res = await apiCall('getOpnameProgress', { opnameId: _currentSession.id });
    if (!res?.success) return;
    _progress = res;

    const role = Session.getUser()?.roleId;
    const isKepBagian = role === 'R-02';
    const isKepYayasan = role === 'R-01';

    const tbody = document.getElementById('opnameApprovalTable');
    if (!tbody) return;

    const items = res.items || [];
    tbody.innerHTML = items.map(d => {
      const canApprove = (isKepBagian && d.statusPosting === 'Pending') ||
                         (isKepYayasan && d.statusPosting === 'Pending');
      const selisihColor = d.selisih === null ? '' : d.selisih < 0 ? 'color:var(--danger)' : d.selisih > 0 ? 'color:var(--success)' : '';
      const nilaiSelisih = d.nilaiSelisih !== null
        ? (d.nilaiSelisih >= 0 ? '+' : '') + 'Rp ' + Math.abs(d.nilaiSelisih).toLocaleString('id-ID')
        : '—';

      const postBadge = {
        'Pending':    '<span class="badge badge-blue">Pending</span>',
        'Perlu Rekon':'<span class="badge badge-yellow">Perlu Rekon</span>',
        'Disetujui':  '<span class="badge badge-green">Disetujui</span>',
        'Ditolak':    '<span class="badge badge-red">Ditolak</span>',
      }[d.statusPosting] || '';

      const actions = canApprove ? `
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="OpnamePage.approveItem('${d.detailId}','approve')">✓</button>
          <button class="btn btn-outline btn-sm" onclick="OpnamePage.approveItem('${d.detailId}','rekon')">Rekon</button>
          <button class="btn btn-danger btn-sm" onclick="OpnamePage.approveItem('${d.detailId}','reject')">✕</button>
        </div>` : postBadge;

      return `<tr>
        <td style="font-family:monospace;font-size:12px">${d.itemId}</td>
        <td style="font-size:12px;color:var(--muted)">${d.batchId}</td>
        <td>${d.qtySistem}</td>
        <td>${d.qtyFisik !== null ? d.qtyFisik : '—'}</td>
        <td style="${selisihColor};font-weight:600">${d.selisih !== null ? (d.selisih >= 0 ? '+' : '') + d.selisih : '—'}</td>
        <td style="${d.nilaiSelisih < 0 ? 'color:var(--danger)' : ''};font-size:12.5px">${nilaiSelisih}</td>
        <td>${postBadge}</td>
        <td>${actions}</td>
      </tr>`;
    }).join('');
  }

  async function approveItem(detailId, action) {
    const res = await apiCall('approveOpnameItem', {
      opnameId: _currentSession.id,
      detailId,
      action,
      catatan: '',
    });
    showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
    if (res?.success) _loadApprovalTable();
  }

  async function _doApproveAll() {
    if (!_progress?.items) return;
    const pendingItems = _progress.items.filter(d => d.statusPosting === 'Pending');
    if (!pendingItems.length) { showToast('Tidak ada item pending.', 'error'); return; }
    if (!confirm(`Approve semua ${pendingItems.length} item pending?`)) return;

    for (const d of pendingItems) {
      await apiCall('approveOpnameItem', { opnameId: _currentSession.id, detailId: d.detailId, action: 'approve', catatan: '' });
    }
    showToast(`${pendingItems.length} item di-approve.`, 'success');
    _loadApprovalTable();
  }

  async function _doCommit() {
    if (!confirm('Commit semua item yang disetujui ke inventory? Tindakan ini tidak bisa dibatalkan.')) return;
    const res = await apiCall('commitOpname', { opnameId: _currentSession.id });
    showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
    if (res?.success) {
      _currentSession = null;
      setTimeout(() => { _switchView('start'); }, 1500);
    }
  }

  return { mount, submitQty, approveItem };
})();

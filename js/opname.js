// ============================================================
// opname.js — Stock Opname (sesi → scan → ronde → approval → commit)
// ============================================================
// DITULIS ULANG TOTAL. Temuan audit versi lama:
// - Mount HTML-nya MOCKUP: kamera palsu, tombol memanggil
//   OpnamePage.submitScannedQty() yang tidak pernah ada, tombol
//   "Kembali" memanggil showPage() yang tidak ada.
// - SEMUA elemen yang dicari logika asli (opnameTipe, btnScanBarcode,
//   opnameItemTable, btnApproveAll, btnCommitOpname, dst — 15 ID)
//   TIDAK ADA SATUPUN di HTML → _bindStartView() TypeError di baris
//   pertama → seluruh alur opname tidak pernah bisa dijalankan dari UI.
// - Tidak ada resume sesi: approver (orang/device lain) tidak punya
//   jalan ke sesi yang sedang berjalan.
// - "Ajukan Opname" & "Kirim ke Kepala Yayasan" = toast PALSU tanpa
//   memanggil API apa pun (yang asli ada di Inventory → tab Pengajuan).
// - 5 fungsi terdefinisi DOBEL (copy-paste).
// - "Approve Semua" memanggil API per item (100 item ≈ 4+ menit).
//
// Versi ini: HTML lengkap & responsive, resume sesi via getOpnameActive,
// tombol approval sadar-level (lvl1Status/lvl2Status), Approve Semua
// via approveOpnameBulk (1 request), guard klik dobel di semua aksi,
// kamera html5-qrcode dipertahankan.
// ============================================================

const OpnamePage = (() => {
  let _currentSession = null;
  let _progress       = null;
  const _busy         = {};

  const esc = s => String(s === null || s === undefined ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  async function _sekali(nama, btn, teksBusy, fn) {
    if (_busy[nama]) return;
    _busy[nama] = true;
    const teksAsli = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; if (teksBusy) btn.textContent = teksBusy; }
    try { await fn(); }
    finally {
      _busy[nama] = false;
      if (btn) { btn.disabled = false; btn.textContent = teksAsli; }
    }
  }

  // ══════════════════ MOUNT ══════════════════
  function mount() {
    const page = document.getElementById('page-opname');
    const role = Session.getUser()?.roleId;

    page.innerHTML = `
      <style>
        .opn-flexhead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .opn-scan-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        @media (max-width:820px){ .opn-scan-grid{grid-template-columns:1fr} }
        .opn-progress{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;padding:12px 16px;background:var(--bg);border-radius:10px;margin-bottom:14px}
      </style>

      <div style="margin-bottom:16px">
        <button class="btn btn-outline btn-sm" onclick="navigateTo('inventory','Inventory Control')">← Kembali ke Inventory</button>
      </div>

      <!-- ══ VIEW: START ══ -->
      <div id="opnameViewStart">
        <div class="page-header opn-flexhead">
          <div>
            <h1>Stock Opname</h1>
            <p>Buat sesi, scan fisik, rekonsiliasi, lalu approval berjenjang.</p>
          </div>
          ${role === 'R-02' ? `<button class="btn btn-outline" onclick="navigateTo('inventory','Inventory Control');setTimeout(()=>InventoryPage.switchSubMenu('opname-req'),150)">📝 Ajukan Opname ke Kep.Yayasan</button>` : ''}
        </div>

        <div class="section-card" style="max-width:520px;margin-top:16px">
          <div style="padding:22px 24px">
            <div class="form-row">
              <label>Tipe Cakupan</label>
              <select id="opnameTipe">
                <option value="Partial">Partial — kategori tertentu</option>
                <option value="Full">Full — semua kategori</option>
              </select>
            </div>
            <div class="form-row" id="rowOpnameKat">
              <label>Kategori</label>
              <div id="opnameKatCheckboxes" style="display:flex;flex-direction:column;gap:8px;max-height:220px;overflow-y:auto;border:1.5px solid var(--border);border-radius:8px;padding:12px">
                <span style="font-size:12.5px;color:var(--muted)">Memuat kategori...</span>
              </div>
            </div>
            <button class="btn btn-primary" id="btnBuatSesi" style="width:100%;margin-top:8px">Buat Sesi &amp; Mulai Scan</button>
            <p style="font-size:11.5px;color:var(--muted);margin-top:10px">Hanya satu sesi opname yang bisa aktif dalam satu waktu. Sesi harus di-commit sampai <strong>Selesai</strong> sebelum sesi baru bisa dibuat.</p>
          </div>
        </div>
      </div>

      <!-- ══ VIEW: SCAN ══ -->
      <div id="opnameViewScan" style="display:none">
        <div class="page-header opn-flexhead">
          <div>
            <h1>Scan Fisik</h1>
            <p id="opnameScanSubtitle">Scan barcode atau ketik manual.</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-outline" id="btnRefreshProgress">⟳ Refresh</button>
            <button class="btn btn-outline" id="btnAdvanceRonde">Naik Ronde →</button>
            <button class="btn btn-primary" id="btnCloseScan">Tutup Scan → Approval</button>
          </div>
        </div>

        <div class="opn-progress" id="opnameProgressBar"></div>

        <div class="opn-scan-grid">
          <div class="section-card" style="padding:18px 20px">
            <div style="font-weight:700;font-size:13.5px;margin-bottom:10px;font-family:'DM Sans',sans-serif">Input Barcode</div>
            <div style="display:flex;gap:8px">
              <input id="opnameBarcodeInput" type="text" placeholder="Scan / ketik barcode lalu Enter"
                autocomplete="off" spellcheck="false"
                style="flex:1;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-family:monospace;font-size:14px"/>
              <button class="btn btn-primary" id="btnScanBarcode">Cari</button>
            </div>
            <button class="btn btn-outline btn-sm" id="btnToggleCamera" style="margin-top:10px">📷 Aktifkan Kamera</button>
            <div id="cameraWrap" style="display:none;margin-top:10px">
              <video id="cameraVideo" style="display:none"></video>
            </div>
            <div id="opnameScanResult" style="display:none;margin-top:14px"></div>
          </div>

          <div class="section-card" style="padding:0;overflow:hidden">
            <div style="padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700;font-size:13.5px;font-family:'DM Sans',sans-serif">Daftar Item Sesi Ini</div>
            <div class="table-wrap" style="max-height:480px;overflow-y:auto">
              <table>
                <thead><tr><th>Item</th><th>Batch</th><th>Sistem</th><th>Fisik</th><th>Selisih</th><th>Status</th></tr></thead>
                <tbody id="opnameItemTable"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ VIEW: APPROVAL ══ -->
      <div id="opnameViewApproval" style="display:none">
        <div class="page-header opn-flexhead">
          <div>
            <h1>Approval Opname</h1>
            <p id="opnameApprovalSubtitle">Kep.Bagian (level 1) → Kepala Yayasan (level 2) → Commit.</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-outline" id="btnRefreshApproval">⟳ Refresh</button>
            ${['R-01','R-02'].includes(role) ? '<button class="btn btn-outline" id="btnApproveAll">✓ Approve Semua</button>' : ''}
            ${role === 'R-01' ? '<button class="btn btn-primary" id="btnCommitOpname">Commit ke Inventory</button>' : ''}
          </div>
        </div>

        <div class="opn-progress" id="opnameApprovalSummary"></div>

        <div class="section-card" style="padding:0;overflow:hidden">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Batch</th><th>Sistem</th><th>Fisik</th><th>Selisih</th><th>Nilai</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody id="opnameApprovalTable"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    _bindStartView();
    _resumeSesi();
  }

  // ── Resume sesi aktif — INI yang bikin approver bisa masuk ──
  async function _resumeSesi() {
    const res = await apiCall('getOpnameActive', {});
    if (!res?.success || !res.data) { _loadKategori(); return; }

    _currentSession = { id: res.data.id, ronde: res.data.rondeSaatIni, maxRonde: res.data.maxRonde };

    if (res.data.status === 'Berjalan') {
      _switchView('scan');
    } else {
      _switchView('approval');
    }
    _loadProgress();
  }

  // ── Kategori untuk sesi partial ──
  async function _loadKategori() {
    const res  = await apiCall('getKategoriList', {});
    const wrap = document.getElementById('opnameKatCheckboxes');
    if (!wrap) return;
    const kats = res?.data || [];
    wrap.innerHTML = kats.length
      ? kats.map(k => `<label style="display:flex;align-items:center;gap:8px;font-size:13.5px;cursor:pointer">
          <input type="checkbox" value="${esc(k.id)}" style="width:15px;height:15px;accent-color:var(--primary)"/> ${esc(k.nama)}
        </label>`).join('')
      : '<span style="font-size:12.5px;color:var(--muted)">Belum ada kategori.</span>';
  }

  function _bindStartView() {
    document.getElementById('opnameTipe')?.addEventListener('change', e => {
      const row = document.getElementById('rowOpnameKat');
      if (row) row.style.display = e.target.value === 'Full' ? 'none' : '';
    });

    document.getElementById('btnBuatSesi')?.addEventListener('click', async () => {
      const tipe = document.getElementById('opnameTipe').value;
      let kategoriIds = [];
      if (tipe === 'Partial') {
        kategoriIds = [...document.querySelectorAll('#opnameKatCheckboxes input:checked')].map(cb => cb.value);
        if (!kategoriIds.length) { showToast('Pilih minimal 1 kategori.', 'error'); return; }
      }

      await _sekali('buatSesi', document.getElementById('btnBuatSesi'), 'Membuat sesi...', async () => {
        const res = await apiCall('createOpnameSession', { tipe, kategoriIds });
        if (!res?.success) { showToast(res?.message || 'Gagal.', 'error'); return; }
        showToast(res.message, 'success');
        _currentSession = { id: res.opnameId, ronde: 1, maxRonde: 3 };
        _switchView('scan');
        _loadProgress();
      });
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

  let _scanBound = false, _aprBound = false;
  function _bindScanView() {
    if (_scanBound) return;
    _scanBound = true;
    document.getElementById('btnScanBarcode').onclick = _doScan;
    document.getElementById('opnameBarcodeInput').onkeydown = e => { if (e.key === 'Enter') _doScan(); };
    document.getElementById('btnRefreshProgress').onclick = _loadProgress;
    document.getElementById('btnAdvanceRonde').onclick    = _doAdvanceRonde;
    document.getElementById('btnCloseScan').onclick       = _doCloseScan;
    document.getElementById('btnToggleCamera').onclick    = () => OpnamePage._toggleCamera();
  }

  function _bindApprovalView() {
    if (!_aprBound) {
      _aprBound = true;
      document.getElementById('btnRefreshApproval').onclick = _loadProgress;
      const ba = document.getElementById('btnApproveAll');
      if (ba) ba.onclick = _doApproveAll;
      const bc = document.getElementById('btnCommitOpname');
      if (bc) bc.onclick = _doCommit;
    }
  }

  // ── Scan barcode ──
  async function _doScan() {
    const barcode = document.getElementById('opnameBarcodeInput').value.trim();
    if (!barcode) return;

    const res = await apiCall('getInventoryByBarcode', { barcode });
    const resultDiv = document.getElementById('opnameScanResult');
    resultDiv.style.display = '';

    if (!res?.success) {
      resultDiv.innerHTML = `<div style="color:var(--danger);font-size:13.5px;padding:8px 0">${esc(res?.message || 'Barcode tidak ditemukan.')}</div>`;
      return;
    }

    const items = res.data;
    resultDiv.innerHTML = items.map(item => `
      <div style="margin-bottom:16px">
        <div style="font-weight:600;font-size:14px;margin-bottom:8px">${esc(item.nama)}
          <span style="font-size:11.5px;font-weight:400;color:var(--muted);font-family:monospace">${esc(item.barcode)}</span>
        </div>
        ${item.batches.map(b => {
          const d = _progress?.items?.find(i => i.batchId === b.id);
          const qtyVal    = d?.qtyFisik !== null && d?.qtyFisik !== undefined ? d.qtyFisik : '';
          const sudahScan = d?.statusScan === 'Selesai Scan';
          return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--bg);border-radius:8px;margin-bottom:6px;flex-wrap:wrap">
              <div style="flex:1;min-width:160px">
                <div style="font-size:11.5px;color:var(--muted)">Batch ${b.urutanFifo} · ${b.tanggalMasuk ? new Date(b.tanggalMasuk).toLocaleDateString('id-ID') : '—'}</div>
                <div style="font-size:12.5px">Modal: Rp ${parseInt(b.hargaModal||0).toLocaleString('id-ID')} · Sistem: <strong>${b.qtySistem}</strong></div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <input type="number" min="0" value="${qtyVal}" id="qtyInput_${esc(b.id)}" placeholder="Qty fisik"
                  ${sudahScan ? 'disabled style="opacity:.6;width:90px;border:1.5px solid var(--border);border-radius:6px;padding:7px 10px;font-size:16px;font-family:monospace"' :
                                'style="width:90px;border:1.5px solid var(--border);border-radius:6px;padding:7px 10px;font-size:16px;font-family:monospace"'}/>
                <button class="btn btn-primary btn-sm" onclick="OpnamePage.submitQty('${esc(d?.detailId || '')}','${esc(b.id)}')" ${sudahScan ? 'disabled' : ''}>
                  ${sudahScan ? '✓' : 'Submit'}
                </button>
              </div>
            </div>`;
        }).join('')}
      </div>`).join('<hr style="border:none;border-top:1px solid var(--border);margin:12px 0">');
  }

  // ── Submit qty fisik ──
  async function submitQty(detailId, batchId) {
    const input = document.getElementById(`qtyInput_${batchId}`);
    const qty   = input?.value;
    if (qty === '' || qty === null || qty === undefined) { showToast('Masukkan qty fisik dulu.', 'error'); return; }
    if (!detailId) { showToast('Item ini tidak masuk cakupan sesi opname ini.', 'error'); return; }

    await _sekali('submit-' + detailId, null, null, async () => {
      const res = await apiCall('submitQtyFisik', {
        opnameId: _currentSession.id, detailId, qtyFisik: parseInt(qty),
      });
      showToast(res?.message || (res?.success ? 'Tersimpan.' : 'Gagal.'), res?.success ? 'success' : 'error');
      if (res?.success) { await _loadProgress(); _doScan(); }
    });
  }

  // ── Progress ──
  async function _loadProgress() {
    if (!_currentSession) return;
    const res = await apiCall('getOpnameProgress', { opnameId: _currentSession.id });
    if (!res?.success) return;

    _progress = res;
    _currentSession.ronde    = res.session.rondeSaatIni;
    _currentSession.maxRonde = res.session.maxRonde;

    const sub = document.getElementById('opnameScanSubtitle');
    if (sub) sub.textContent = `Sesi ${_currentSession.id} · Ronde ${_currentSession.ronde}/${_currentSession.maxRonde} · ${res.session.status}`;
    const sub2 = document.getElementById('opnameApprovalSubtitle');
    if (sub2) sub2.textContent = `Sesi ${_currentSession.id} · Status: ${res.session.status}`;

    const s = res.summary;
    const barHtml = `
      <span>Total: <strong>${s.totalItem}</strong></span>
      <span style="color:var(--muted)">Belum discan: <strong>${s.belumDiscan}</strong></span>
      <span style="color:#16A34A">Selesai: <strong>${s.selesaiScan}</strong></span>
      <span style="color:#E8B800">Perlu Rekon: <strong>${s.perluRekon}</strong></span>
      <span style="color:#1A3FAA">Pending: <strong>${s.pending}</strong></span>
      <span style="color:#16A34A">Disetujui: <strong>${s.disetujui}</strong></span>
      <span style="color:#D94040">Ditolak: <strong>${s.ditolak}</strong></span>`;
    const pb = document.getElementById('opnameProgressBar');
    if (pb) pb.innerHTML = barHtml;
    const ps = document.getElementById('opnameApprovalSummary');
    if (ps) ps.innerHTML = barHtml;

    _renderItemTable(res.items);
    _renderApprovalTable(res.items);

    // Sinkronkan view dengan status sesi (bisa berubah di device lain,
    // termasuk balik ke 'Berjalan' setelah verdict rekon).
    if (res.session.status === 'Berjalan') {
      if (document.getElementById('opnameViewApproval').style.display !== 'none') _switchView('scan');
    } else if (res.session.status !== 'Selesai') {
      if (document.getElementById('opnameViewScan').style.display !== 'none') _switchView('approval');
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
        'Pending':     '<span class="badge badge-blue">Pending</span>',
        'Perlu Rekon': '<span class="badge badge-yellow">Perlu Rekon</span>',
        'Disetujui':   '<span class="badge badge-green">Disetujui</span>',
        'Ditolak':     '<span class="badge badge-red">Ditolak</span>',
      }[d.statusPosting] || '';

      return `<tr>
        <td style="font-family:monospace;font-size:12px">${esc(d.itemId)}</td>
        <td style="font-size:12px;color:var(--muted)">${esc(d.batchId)}</td>
        <td>${d.qtySistem}</td>
        <td>${d.qtyFisik !== null ? d.qtyFisik : '—'}</td>
        <td style="${selisihColor};font-weight:600">${d.selisih !== null ? (d.selisih >= 0 ? '+' : '') + d.selisih : '—'}</td>
        <td>${statusBadge} ${postBadge}</td>
      </tr>`;
    }).join('');
  }

  // ── Ronde & tutup ──
  async function _doAdvanceRonde() {
    if (!_currentSession) return;
    await _sekali('advance', document.getElementById('btnAdvanceRonde'), 'Memproses...', async () => {
      const res = await apiCall('advanceRonde', { opnameId: _currentSession.id });
      showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
      if (res?.success) _loadProgress();
    });
  }

  async function _doCloseScan() {
    if (!_currentSession) return;
    if (!confirm('Tutup sesi scan dan lanjut ke tahap approval?')) return;
    await _sekali('close', document.getElementById('btnCloseScan'), 'Menutup...', async () => {
      const res = await apiCall('closeOpnameForApproval', { opnameId: _currentSession.id });
      showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
      if (res?.success) { _switchView('approval'); _loadProgress(); }
    });
  }

  // ── Approval — tombol sadar-level ──
  function _renderApprovalTable(items) {
    const tbody = document.getElementById('opnameApprovalTable');
    if (!tbody) return;
    const role = Session.getUser()?.roleId;
    const isKB = role === 'R-02', isKY = role === 'R-01';

    if (!items?.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>Belum ada data.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(d => {
      const selisihColor = d.selisih === null ? '' : d.selisih < 0 ? 'color:var(--danger)' : d.selisih > 0 ? 'color:var(--success)' : '';
      const nilaiSelisih = d.nilaiSelisih !== null
        ? (d.nilaiSelisih >= 0 ? '+' : '−') + 'Rp ' + Math.abs(d.nilaiSelisih).toLocaleString('id-ID') : '—';

      // Giliran siapa? lvl1Status/lvl2Status dari backend.
      // R-02 hanya saat level 1 'Menunggu'; R-01 hanya saat level 1
      // sudah 'Disetujui' dan level 2 'Menunggu'. Tanpa ini, R-02 yang
      // sudah approve tetap melihat tombol (status item masih Pending
      // menunggu level 2) dan mengira kliknya gagal.
      const giliranKB = isKB && d.statusPosting === 'Pending' && d.lvl1Status === 'Menunggu';
      const giliranKY = isKY && d.statusPosting === 'Pending' && d.lvl1Status === 'Disetujui' && d.lvl2Status === 'Menunggu';

      let statusCell;
      if (d.statusPosting === 'Disetujui')        statusCell = '<span class="badge badge-green">Disetujui</span>';
      else if (d.statusPosting === 'Ditolak')     statusCell = '<span class="badge badge-red">Ditolak</span>';
      else if (d.statusPosting === 'Perlu Rekon') statusCell = '<span class="badge badge-yellow">Perlu Rekon</span>';
      else if (d.lvl1Status === 'Disetujui')      statusCell = '<span class="badge badge-blue">Menunggu Kep.Yayasan</span>';
      else                                        statusCell = '<span class="badge badge-blue">Menunggu Kep.Bagian</span>';

      const actions = (giliranKB || giliranKY) ? `
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="OpnamePage.approveItem('${esc(d.detailId)}','approve')">✓</button>
          <button class="btn btn-outline btn-sm" onclick="OpnamePage.approveItem('${esc(d.detailId)}','rekon')">Rekon</button>
          <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="OpnamePage.approveItem('${esc(d.detailId)}','reject')">✕</button>
        </div>` : '<span style="font-size:12px;color:var(--muted)">—</span>';

      return `<tr>
        <td style="font-family:monospace;font-size:12px">${esc(d.itemId)}</td>
        <td style="font-size:12px;color:var(--muted)">${esc(d.batchId)}</td>
        <td>${d.qtySistem}</td>
        <td>${d.qtyFisik !== null ? d.qtyFisik : '—'}</td>
        <td style="${selisihColor};font-weight:600">${d.selisih !== null ? (d.selisih >= 0 ? '+' : '') + d.selisih : '—'}</td>
        <td style="font-size:12.5px;${(d.nilaiSelisih||0) < 0 ? 'color:var(--danger)' : ''}">${nilaiSelisih}</td>
        <td>${statusCell}</td>
        <td>${actions}</td>
      </tr>`;
    }).join('');
  }

  async function approveItem(detailId, action) {
    if (!_currentSession) return;
    if (action === 'reject' && !confirm('Tolak item ini? Selisihnya TIDAK akan diterapkan ke stok.')) return;
    if (action === 'rekon'  && !confirm('Kembalikan item ini ke antrian scan? Sesi akan dibuka lagi.')) return;

    await _sekali('apr-' + detailId, null, null, async () => {
      const res = await apiCall('approveOpnameItem', {
        opnameId: _currentSession.id, detailId, action, catatan: '',
      });
      showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
      if (res?.success) _loadProgress();
    });
  }

  // ── Approve semua: SATU request bulk, bukan loop per item ──
  async function _doApproveAll() {
    if (!_currentSession || !_progress?.items) return;
    const role = Session.getUser()?.roleId;
    const eligible = _progress.items.filter(d =>
      d.statusPosting === 'Pending' &&
      (role === 'R-02' ? d.lvl1Status === 'Menunggu'
                       : d.lvl1Status === 'Disetujui' && d.lvl2Status === 'Menunggu'));
    if (!eligible.length) { showToast('Tidak ada item yang menunggu approval Anda.', 'error'); return; }
    if (!confirm(`Approve semua ${eligible.length} item yang menunggu giliran Anda?`)) return;

    await _sekali('aprAll', document.getElementById('btnApproveAll'), 'Memproses...', async () => {
      const res = await apiCall('approveOpnameBulk', { opnameId: _currentSession.id });
      showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
      if (res?.success) _loadProgress();
    });
  }

  // ── Commit ──
  async function _doCommit() {
    if (!_currentSession) return;
    if (!confirm('Commit hasil opname ke inventory? Selisih akan diterapkan ke stok dan tidak bisa dibatalkan.')) return;
    await _sekali('commit', document.getElementById('btnCommitOpname'), 'Meng-commit...', async () => {
      const res = await apiCall('commitOpname', { opnameId: _currentSession.id });
      showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
      if (res?.success) {
        _currentSession = null;
        _progress = null;
        setTimeout(() => { _switchView('start'); _loadKategori(); }, 1200);
      }
    });
  }

  return { mount, submitQty, approveItem };
})();

// ── Kamera barcode (html5-qrcode) — dipertahankan dari versi lama ──
OpnamePage._html5QrScanner = null;

OpnamePage._toggleCamera = async function() {
  const wrap = document.getElementById('cameraWrap');
  const btn  = document.getElementById('btnToggleCamera');
  if (!wrap || !btn) return;

  if (OpnamePage._html5QrScanner) {
    try { await OpnamePage._html5QrScanner.stop(); OpnamePage._html5QrScanner.clear(); } catch (e) {}
    OpnamePage._html5QrScanner = null;
    wrap.style.display = 'none';
    btn.textContent = '📷 Aktifkan Kamera';
    return;
  }

  if (typeof Html5Qrcode === 'undefined') {
    showToast('Library kamera belum siap, coba lagi.', 'error');
    return;
  }

  wrap.style.display = '';
  btn.textContent = '📷 Matikan Kamera';

  if (!document.getElementById('qrReaderOpname')) {
    const div = document.createElement('div');
    div.id = 'qrReaderOpname';
    div.style.cssText = 'width:100%;max-width:380px;margin:0 auto';
    wrap.appendChild(div);
  }

  try {
    const scanner = new Html5Qrcode('qrReaderOpname');
    OpnamePage._html5QrScanner = scanner;
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        const input = document.getElementById('opnameBarcodeInput');
        if (input) {
          input.value = decodedText;
          input.style.borderColor = 'var(--success)';
          setTimeout(() => { input.style.borderColor = 'var(--border)'; }, 800);
        }
        document.getElementById('btnScanBarcode')?.click();
      },
      () => {}
    );
  } catch (e) {
    wrap.style.display = 'none';
    btn.textContent = '📷 Aktifkan Kamera';
    showToast('Tidak bisa mengakses kamera: ' + (e?.message || e), 'error');
    OpnamePage._html5QrScanner = null;
  }
};

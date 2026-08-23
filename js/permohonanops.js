// ============================================================
// permohonanops.js — Permohonan Operasional (Tahap 1)
// ============================================================
// Sub-menu di grup "Pengajuan". 3 jenis: Galon, ATK, Fotocopy.
// Alur: TU ajukan → Kepala Bagian → Keuangan → staf isi harga (ATK)
// & selesaikan → cetak. Galon & fotocopy harga otomatis dari master.
// ============================================================

const PermohonanOpsPage = (() => {
  let _jenjang = [];
  let _harga = { galon: {}, fotocopy: {}, bolehUbah: false };
  let _tab = 'list';
  const _busy = {};

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const rp = n => 'Rp ' + Math.round(Number(n)||0).toLocaleString('id-ID');

  async function _sekali(nama, btn, teksBusy, fn) {
    if (_busy[nama]) return;
    _busy[nama] = true;
    const t = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; if (teksBusy) btn.textContent = teksBusy; }
    try { await fn(); } finally { _busy[nama] = false; if (btn) { btn.disabled = false; btn.textContent = t; } }
  }

  function mount() {
    const page = document.getElementById('page-permohonanops');
    page.innerHTML = `
      <div class="page-header">
        <h1>Permohonan Operasional</h1>
        <p>Pengajuan galon, ATK, dan fotocopy untuk keperluan kantor.</p>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:18px;border-bottom:1px solid var(--border);flex-wrap:wrap">
        <button class="pops-tab active" data-tab="list" onclick="PermohonanOpsPage.switchTab('list')"
          style="background:none;border:none;padding:10px 16px;font-size:13.5px;font-weight:600;cursor:pointer;border-bottom:2px solid var(--primary);color:var(--primary)">Daftar Permohonan</button>
        <button class="pops-tab" data-tab="ajukan" onclick="PermohonanOpsPage.switchTab('ajukan')"
          style="background:none;border:none;padding:10px 16px;font-size:13.5px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;color:var(--muted)">+ Ajukan Baru</button>
        <button class="pops-tab" data-tab="harga" onclick="PermohonanOpsPage.switchTab('harga')"
          style="background:none;border:none;padding:10px 16px;font-size:13.5px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;color:var(--muted)">Master Harga</button>
      </div>

      <div id="popsTabList"></div>
      <div id="popsTabAjukan" style="display:none"></div>
      <div id="popsTabHarga" style="display:none"></div>

      <div class="modal-overlay" id="popsModalDetail">
        <div class="modal" style="max-width:640px">
          <div class="modal-header">
            <h3>Detail Permohonan</h3>
            <button class="modal-close" onclick="document.getElementById('popsModalDetail').classList.remove('show')">✕</button>
          </div>
          <div class="modal-body" id="popsDetailBody" style="padding:20px"></div>
        </div>
      </div>
    `;
    _loadJenjang();
    _loadHarga(() => { _renderAjukan(); });
    _renderList();
    _renderHarga();
    loadList();
  }

  function switchTab(tab) {
    _tab = tab;
    document.querySelectorAll('.pops-tab').forEach(el => {
      const on = el.dataset.tab === tab;
      el.style.borderBottomColor = on ? 'var(--primary)' : 'transparent';
      el.style.color = on ? 'var(--primary)' : 'var(--muted)';
    });
    document.getElementById('popsTabList').style.display   = tab === 'list'   ? 'block' : 'none';
    document.getElementById('popsTabAjukan').style.display = tab === 'ajukan' ? 'block' : 'none';
    document.getElementById('popsTabHarga').style.display  = tab === 'harga'  ? 'block' : 'none';
    if (tab === 'list') loadList();
  }

  async function _loadJenjang() {
    const res = await apiCall('getJenjangList', {});
    if (res?.success) _jenjang = res.data || [];
    const sel = document.getElementById('popsJenjang');
    if (sel) sel.innerHTML = '<option value="">— Pilih jenjang —</option>' +
      _jenjang.map(j => `<option value="${esc(j.id)}">${esc(j.nama)}</option>`).join('');
  }

  async function _loadHarga(cb) {
    const res = await apiCall('getMasterHargaOps', {});
    if (res?.success) _harga = res.data;
    if (cb) cb();
    _renderHarga();
  }

  // ══════════════ TAB: LIST ══════════════
  function _renderList() {
    document.getElementById('popsTabList').innerHTML = `
      <div class="section-card" style="padding:0;overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div style="font-weight:700;font-size:13.5px;font-family:'DM Sans',sans-serif">Semua Permohonan</div>
          <select id="popsFilterJenis" onchange="PermohonanOpsPage.loadList()" style="border:1.5px solid var(--border);border-radius:7px;padding:6px 10px;font-size:12.5px">
            <option value="">Semua Jenis</option>
            <option value="Galon">Galon</option>
            <option value="ATK">ATK</option>
            <option value="Fotocopy">Fotocopy</option>
          </select>
          <select id="popsFilterStatus" onchange="PermohonanOpsPage.loadList()" style="border:1.5px solid var(--border);border-radius:7px;padding:6px 10px;font-size:12.5px">
            <option value="">Semua Status</option>
            <option value="Menunggu Kepala Bagian">Menunggu Kepala Bagian</option>
            <option value="Menunggu Keuangan">Menunggu Keuangan</option>
            <option value="Disetujui">Disetujui</option>
            <option value="Selesai">Selesai</option>
            <option value="Ditolak">Ditolak</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>Jenis</th><th>Pengaju</th><th>Jenjang</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody id="popsListBody"><tr><td colspan="7"><div class="empty-state"><p>Memuat...</p></div></td></tr></tbody>
          </table>
        </div>
      </div>`;
  }

  async function loadList() {
    const tbody = document.getElementById('popsListBody');
    if (!tbody) return;
    const jenis  = document.getElementById('popsFilterJenis')?.value || '';
    const status = document.getElementById('popsFilterStatus')?.value || '';
    const res = await apiCall('getPermohonanOpsList', { jenis, status });
    if (!res?.success) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>Gagal memuat.</p></div></td></tr>`; return; }
    if (!res.data.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>Belum ada permohonan.</p></div></td></tr>`; return; }

    const badge = st => {
      if (st === 'Selesai')  return 'badge-green';
      if (st === 'Disetujui')return 'badge-blue';
      if (st === 'Ditolak')  return 'badge-red';
      return 'badge-yellow';
    };
    tbody.innerHTML = res.data.map(r => `
      <tr>
        <td style="font-size:12.5px">${r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '-'}</td>
        <td><strong>${esc(r.jenis)}</strong></td>
        <td style="font-size:12.5px">${esc(r.namaPengaju)}</td>
        <td style="font-size:12.5px">${esc(r.jenjang)}</td>
        <td>${r.hargaDiisi ? rp(r.total) : '<span style="color:var(--muted);font-size:12px">belum diisi</span>'}</td>
        <td><span class="badge ${badge(r.status)}">${esc(r.status)}</span>${r.isPendingAtMe ? ' <span style="color:var(--danger);font-size:11px">• giliran Anda</span>' : ''}</td>
        <td><button class="btn btn-outline btn-sm" onclick="PermohonanOpsPage.openDetail('${esc(r.id)}')">Detail</button></td>
      </tr>`).join('');
  }

  // ══════════════ TAB: AJUKAN ══════════════
  function _renderAjukan() {
    const el = document.getElementById('popsTabAjukan');
    if (!el) return;
    el.innerHTML = `
      <div class="section-card">
        <div class="section-head"><h2>Ajukan Permohonan Baru</h2></div>
        <div style="padding:20px 22px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
            <div class="form-row"><label>Jenis *</label>
              <select id="popsJenis" onchange="PermohonanOpsPage._onJenisChange()">
                <option value="">— Pilih jenis —</option>
                <option value="Galon">Galon</option>
                <option value="ATK">ATK</option>
                <option value="Fotocopy">Fotocopy</option>
              </select>
            </div>
            <div class="form-row"><label>Jenjang *</label>
              <select id="popsJenjang"><option value="">— Pilih jenjang —</option></select>
            </div>
          </div>

          <div id="popsFormDinamis" style="margin-bottom:14px"></div>

          <div class="form-row"><label>Catatan (opsional)</label>
            <input type="text" id="popsCatatan" placeholder="Keterangan tambahan..."/>
          </div>

          <button class="btn btn-primary" id="popsBtnAjukan" style="width:100%" onclick="PermohonanOpsPage.submitAjukan(this)">Ajukan Permohonan</button>
        </div>
      </div>`;
    _loadJenjang();
  }

  // Form berubah sesuai jenis.
  function _onJenisChange() {
    const jenis = document.getElementById('popsJenis').value;
    const wrap  = document.getElementById('popsFormDinamis');
    if (!wrap) return;

    if (jenis === 'Galon') {
      const hg = _harga.galon || {};
      wrap.innerHTML = `
        <div style="background:#EFF6FF;border-radius:8px;padding:10px 14px;font-size:12px;color:var(--primary);margin-bottom:10px">
          Harga master: Galon ${rp(hg.hargaGalon)} · Liter ${rp(hg.hargaLiter)}. Total dihitung otomatis.
        </div>
        <div style="display:grid;grid-template-columns:1fr 130px;gap:10px">
          <div class="form-row"><label>Jumlah *</label>
            <input type="number" id="popsGalonQty" min="1" placeholder="Qty" oninput="PermohonanOpsPage._hitungGalon()"/>
          </div>
          <div class="form-row"><label>Satuan *</label>
            <select id="popsGalonSatuan" onchange="PermohonanOpsPage._hitungGalon()">
              <option value="galon">Galon</option>
              <option value="liter">Liter</option>
            </select>
          </div>
        </div>
        <div style="text-align:right;font-weight:700;font-size:15px;color:var(--primary)">Perkiraan Total: <span id="popsGalonTotal">Rp 0</span></div>`;
    } else if (jenis === 'Fotocopy') {
      const hf = _harga.fotocopy || {};
      wrap.innerHTML = `
        <div style="background:#EFF6FF;border-radius:8px;padding:10px 14px;font-size:12px;color:var(--primary);margin-bottom:10px">
          Harga master: ${rp(hf.hargaPerLembar)}/lembar. Subtotal = harga × lembar × rangkap.
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Sumber</th><th style="width:80px">Rangkap</th><th style="width:80px">Lembar</th><th style="width:110px">Subtotal</th><th style="width:40px"></th></tr></thead>
          <tbody id="popsFcBody"></tbody>
        </table></div>
        <button class="btn btn-outline btn-sm" onclick="PermohonanOpsPage._addFcRow()" style="margin-top:8px">+ Tambah Baris</button>
        <div style="text-align:right;font-weight:700;font-size:15px;color:var(--primary);margin-top:8px">Total: <span id="popsFcTotal">Rp 0</span></div>`;
      _addFcRow();
    } else if (jenis === 'ATK') {
      wrap.innerHTML = `
        <div style="background:#FEF9C3;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;font-size:12px;color:#854D0E;margin-bottom:10px">
          Harga ATK diisi oleh staf setelah permohonan disetujui — Anda cukup isi barang & jumlahnya.
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Nama Barang</th><th style="width:90px">Qty</th><th style="width:100px">Satuan</th><th style="width:40px"></th></tr></thead>
          <tbody id="popsAtkBody"></tbody>
        </table></div>
        <button class="btn btn-outline btn-sm" onclick="PermohonanOpsPage._addAtkRow()" style="margin-top:8px">+ Tambah Baris</button>`;
      _addAtkRow();
    } else {
      wrap.innerHTML = '';
    }
  }

  function _hitungGalon() {
    const qty = parseFloat(document.getElementById('popsGalonQty')?.value || '0');
    const sat = document.getElementById('popsGalonSatuan')?.value || 'galon';
    const h   = sat === 'liter' ? (_harga.galon?.hargaLiter||0) : (_harga.galon?.hargaGalon||0);
    const el  = document.getElementById('popsGalonTotal');
    if (el) el.textContent = rp(qty * h);
  }

  function _addFcRow() {
    const tb = document.getElementById('popsFcBody');
    if (!tb) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="pops-fc-sumber" placeholder="mis. Ulangan Matematika" style="width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12.5px"/></td>
      <td><input type="number" class="pops-fc-rangkap" min="1" oninput="PermohonanOpsPage._hitungFc()" style="width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12.5px"/></td>
      <td><input type="number" class="pops-fc-lembar" min="1" oninput="PermohonanOpsPage._hitungFc()" style="width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12.5px"/></td>
      <td class="pops-fc-sub" style="font-size:12.5px">Rp 0</td>
      <td><button onclick="this.closest('tr').remove();PermohonanOpsPage._hitungFc()" style="background:none;border:none;cursor:pointer;color:var(--danger)">✕</button></td>`;
    tb.appendChild(tr);
  }

  function _hitungFc() {
    const h = _harga.fotocopy?.hargaPerLembar || 0;
    let total = 0;
    document.querySelectorAll('#popsFcBody tr').forEach(tr => {
      const r = parseInt(tr.querySelector('.pops-fc-rangkap')?.value || '0');
      const l = parseInt(tr.querySelector('.pops-fc-lembar')?.value || '0');
      const sub = h * l * r;
      total += sub;
      tr.querySelector('.pops-fc-sub').textContent = rp(sub);
    });
    const el = document.getElementById('popsFcTotal');
    if (el) el.textContent = rp(total);
  }

  function _addAtkRow() {
    const tb = document.getElementById('popsAtkBody');
    if (!tb) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="pops-atk-nama" placeholder="Nama barang" style="width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12.5px"/></td>
      <td><input type="number" class="pops-atk-qty" min="1" style="width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12.5px"/></td>
      <td><input type="text" class="pops-atk-uom" placeholder="pcs/rim/box" style="width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12.5px"/></td>
      <td><button onclick="this.closest('tr').remove()" style="background:none;border:none;cursor:pointer;color:var(--danger)">✕</button></td>`;
    tb.appendChild(tr);
  }

  async function submitAjukan(btn) {
    const jenis   = document.getElementById('popsJenis')?.value;
    const jenjang = document.getElementById('popsJenjang')?.value;
    const catatan = document.getElementById('popsCatatan')?.value || '';
    if (!jenis)   return showToast('Pilih jenis dulu.', 'error');
    if (!jenjang) return showToast('Pilih jenjang dulu.', 'error');

    let items = [];
    if (jenis === 'Galon') {
      const qty = parseFloat(document.getElementById('popsGalonQty')?.value || '0');
      const sat = document.getElementById('popsGalonSatuan')?.value || 'galon';
      if (qty <= 0) return showToast('Jumlah galon wajib diisi.', 'error');
      items = [{ qty, satuan: sat }];
    } else if (jenis === 'Fotocopy') {
      document.querySelectorAll('#popsFcBody tr').forEach(tr => {
        const sumber  = tr.querySelector('.pops-fc-sumber')?.value.trim();
        const rangkap = parseInt(tr.querySelector('.pops-fc-rangkap')?.value || '0');
        const lembar  = parseInt(tr.querySelector('.pops-fc-lembar')?.value || '0');
        if (sumber && rangkap > 0 && lembar > 0) items.push({ sumber, rangkap, lembar });
      });
      if (!items.length) return showToast('Isi minimal satu baris fotocopy yang lengkap.', 'error');
    } else if (jenis === 'ATK') {
      document.querySelectorAll('#popsAtkBody tr').forEach(tr => {
        const namaBarang = tr.querySelector('.pops-atk-nama')?.value.trim();
        const qty = parseFloat(tr.querySelector('.pops-atk-qty')?.value || '0');
        const uom = tr.querySelector('.pops-atk-uom')?.value.trim();
        if (namaBarang && qty > 0) items.push({ namaBarang, qty, uom });
      });
      if (!items.length) return showToast('Isi minimal satu barang ATK.', 'error');
    }

    await _sekali('ajukan', btn, 'Mengirim...', async () => {
      const res = await apiCall('createPermohonanOps', { jenis, jenjang, catatan, items });
      if (res?.success) {
        showToast(res.message, 'success');
        document.getElementById('popsJenis').value = '';
        document.getElementById('popsFormDinamis').innerHTML = '';
        document.getElementById('popsCatatan').value = '';
        switchTab('list');
      } else {
        showToast(res?.message || 'Gagal.', 'error');
      }
    });
  }

  // ══════════════ TAB: MASTER HARGA ══════════════
  function _renderHarga() {
    const el = document.getElementById('popsTabHarga');
    if (!el) return;
    const hg = _harga.galon || {}, hf = _harga.fotocopy || {};
    const disabled = _harga.bolehUbah ? '' : 'disabled';
    const note = _harga.bolehUbah ? '' : '<div style="font-size:12px;color:var(--muted);margin-bottom:12px">Anda tidak punya akses mengubah harga master (hanya lihat).</div>';
    el.innerHTML = `
      ${note}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
        <div class="section-card">
          <div class="section-head"><h2>Harga Galon</h2></div>
          <div style="padding:18px 20px">
            <div class="form-row"><label>Harga per Galon</label>
              <input type="number" id="popsHargaGalon" min="0" value="${hg.hargaGalon||''}" ${disabled}/>
            </div>
            <div class="form-row"><label>Harga per Liter</label>
              <input type="number" id="popsHargaLiter" min="0" value="${hg.hargaLiter||''}" ${disabled}/>
            </div>
            ${_harga.bolehUbah ? `<button class="btn btn-primary" style="width:100%" onclick="PermohonanOpsPage.simpanHargaGalon(this)">Simpan Harga Galon</button>` : ''}
          </div>
        </div>
        <div class="section-card">
          <div class="section-head"><h2>Harga Fotocopy</h2></div>
          <div style="padding:18px 20px">
            <div class="form-row"><label>Harga per Lembar</label>
              <input type="number" id="popsHargaLembar" min="0" value="${hf.hargaPerLembar||''}" ${disabled}/>
            </div>
            ${_harga.bolehUbah ? `<button class="btn btn-primary" style="width:100%" onclick="PermohonanOpsPage.simpanHargaFotocopy(this)">Simpan Harga Fotocopy</button>` : ''}
          </div>
        </div>
      </div>`;
  }

  async function simpanHargaGalon(btn) {
    const hargaGalon = parseFloat(document.getElementById('popsHargaGalon')?.value || '0');
    const hargaLiter = parseFloat(document.getElementById('popsHargaLiter')?.value || '0');
    await _sekali('hGalon', btn, 'Menyimpan...', async () => {
      const res = await apiCall('setMasterHargaGalon', { hargaGalon, hargaLiter });
      showToast(res?.message || (res?.success?'Tersimpan':'Gagal'), res?.success?'success':'error');
      if (res?.success) _loadHarga();
    });
  }

  async function simpanHargaFotocopy(btn) {
    const hargaPerLembar = parseFloat(document.getElementById('popsHargaLembar')?.value || '0');
    await _sekali('hFc', btn, 'Menyimpan...', async () => {
      const res = await apiCall('setMasterHargaFotocopy', { hargaPerLembar });
      showToast(res?.message || (res?.success?'Tersimpan':'Gagal'), res?.success?'success':'error');
      if (res?.success) _loadHarga();
    });
  }

  // ══════════════ DETAIL MODAL ══════════════
  async function openDetail(id) {
    const body = document.getElementById('popsDetailBody');
    body.innerHTML = '<div class="empty-state"><p>Memuat...</p></div>';
    document.getElementById('popsModalDetail').classList.add('show');
    const res = await apiCall('getPermohonanOpsDetail', { id_ops: id });
    if (!res?.success) { body.innerHTML = `<p>${esc(res?.message||'Gagal.')}</p>`; return; }
    const d = res.data;

    // Tabel detail sesuai jenis.
    let head = '', rows = '';
    if (d.jenis === 'Galon') {
      head = '<tr><th>Qty</th><th>Satuan</th><th>Harga</th><th>Subtotal</th></tr>';
      rows = d.detail.map(x => `<tr><td>${x.qty}</td><td>${esc(x.satuan)}</td><td>${rp(x.hargaSatuan)}</td><td>${rp(x.subtotal)}</td></tr>`).join('');
    } else if (d.jenis === 'Fotocopy') {
      head = '<tr><th>Sumber</th><th>Rangkap</th><th>Lembar</th><th>Subtotal</th></tr>';
      rows = d.detail.map(x => `<tr><td>${esc(x.sumber)}</td><td>${x.rangkap}</td><td>${x.lembar}</td><td>${rp(x.subtotal)}</td></tr>`).join('');
    } else { // ATK
      head = `<tr><th>Nama Barang</th><th>Qty</th><th>Satuan</th><th>Harga</th><th>Subtotal</th></tr>`;
      rows = d.detail.map((x,i) => `<tr>
        <td>${esc(x.namaBarang)}</td><td>${x.qty}</td><td>${esc(x.satuan)}</td>
        <td>${d.bolehIsiHarga
          ? `<input type="number" class="pops-isi-harga" data-id="${esc(x.idDetail)}" value="${x.hargaSatuan||''}" min="0" style="width:100px;border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:12.5px"/>`
          : rp(x.hargaSatuan)}</td>
        <td>${rp(x.subtotal)}</td></tr>`).join('');
    }

    let aksiBtn = '';
    if (d.bolehApprove) {
      aksiBtn += `<button class="btn btn-primary btn-sm" onclick="PermohonanOpsPage.approve('${esc(d.id)}','approve')">✓ Setujui</button>
                  <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="PermohonanOpsPage.approve('${esc(d.id)}','reject')">✕ Tolak</button>`;
    }
    if (d.bolehIsiHarga) {
      aksiBtn += `<button class="btn btn-primary btn-sm" onclick="PermohonanOpsPage.simpanHarga('${esc(d.id)}')">Simpan Harga</button>`;
    }
    if (d.bolehSelesai) {
      aksiBtn += `<button class="btn btn-primary btn-sm" onclick="PermohonanOpsPage.selesaikan('${esc(d.id)}')">Tandai Selesai</button>`;
    }
    if (d.status === 'Selesai') {
      aksiBtn += `<button class="btn btn-outline btn-sm" onclick="PermohonanOpsPage.cetak('${esc(d.id)}')">🖨️ Cetak</button>`;
    }

    body.innerHTML = `
      <table style="width:100%;font-size:13px;margin-bottom:16px">
        <tr><td style="color:var(--muted);width:130px">No</td><td><strong>${esc(d.id)}</strong></td></tr>
        <tr><td style="color:var(--muted)">Jenis</td><td>${esc(d.jenis)}</td></tr>
        <tr><td style="color:var(--muted)">Pengaju</td><td>${esc(d.namaPengaju)}</td></tr>
        <tr><td style="color:var(--muted)">Jenjang</td><td>${esc(d.jenjang)}</td></tr>
        <tr><td style="color:var(--muted)">Status</td><td><strong>${esc(d.status)}</strong></td></tr>
        ${d.catatan ? `<tr><td style="color:var(--muted)">Catatan</td><td>${esc(d.catatan)}</td></tr>` : ''}
      </table>
      <div class="table-wrap"><table><thead>${head}</thead><tbody>${rows}</tbody></table></div>
      <div style="text-align:right;font-weight:700;font-size:16px;color:var(--primary);margin:14px 0">
        Total: ${d.hargaDiisi ? rp(d.total) : '<span style="font-size:13px;color:var(--muted)">belum diisi</span>'}
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">${aksiBtn || '<span style="font-size:12px;color:var(--muted)">Tidak ada aksi tersedia untuk Anda.</span>'}</div>
    `;
    _lastDetail = d;
  }

  let _lastDetail = null;

  async function approve(id, aksi) {
    if (aksi === 'reject' && !confirm('Yakin tolak permohonan ini?')) return;
    const res = await apiCall('approvePermohonanOps', { id_ops: id, aksi });
    showToast(res?.message || (res?.success?'OK':'Gagal'), res?.success?'success':'error');
    if (res?.success) { document.getElementById('popsModalDetail').classList.remove('show'); loadList(); }
  }

  async function simpanHarga(id) {
    const items = [];
    document.querySelectorAll('.pops-isi-harga').forEach(inp => {
      items.push({ idDetail: inp.dataset.id, hargaSatuan: parseFloat(inp.value || '0') });
    });
    if (!items.length) return showToast('Tidak ada harga diisi.', 'error');
    const res = await apiCall('isiHargaOps', { id_ops: id, items });
    showToast(res?.message || (res?.success?'OK':'Gagal'), res?.success?'success':'error');
    if (res?.success) openDetail(id);   // refresh modal
  }

  async function selesaikan(id) {
    if (!confirm('Tandai permohonan ini selesai? Setelah ini bisa dicetak.')) return;
    const res = await apiCall('selesaikanOps', { id_ops: id });
    showToast(res?.message || (res?.success?'OK':'Gagal'), res?.success?'success':'error');
    if (res?.success) openDetail(id);
  }

  function cetak(id) {
    const d = _lastDetail;
    if (!d || d.id !== id) return;
    const tgl = d.tanggal ? new Date(d.tanggal).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '-';
    const tglCetak = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});

    let head='', rows='';
    if (d.jenis === 'Galon') {
      head = '<tr><th>Qty</th><th>Satuan</th><th>Harga</th><th>Subtotal</th></tr>';
      rows = d.detail.map(x=>`<tr><td style="text-align:center">${x.qty}</td><td style="text-align:center">${esc(x.satuan)}</td><td style="text-align:right">${rp(x.hargaSatuan)}</td><td style="text-align:right">${rp(x.subtotal)}</td></tr>`).join('');
    } else if (d.jenis === 'Fotocopy') {
      head = '<tr><th>Sumber</th><th>Rangkap</th><th>Lembar</th><th>Subtotal</th></tr>';
      rows = d.detail.map(x=>`<tr><td>${esc(x.sumber)}</td><td style="text-align:center">${x.rangkap}</td><td style="text-align:center">${x.lembar}</td><td style="text-align:right">${rp(x.subtotal)}</td></tr>`).join('');
    } else {
      head = '<tr><th>Nama Barang</th><th>Qty</th><th>Satuan</th><th>Harga</th><th>Subtotal</th></tr>';
      rows = d.detail.map(x=>`<tr><td>${esc(x.namaBarang)}</td><td style="text-align:center">${x.qty}</td><td style="text-align:center">${esc(x.satuan)}</td><td style="text-align:right">${rp(x.hargaSatuan)}</td><td style="text-align:right">${rp(x.subtotal)}</td></tr>`).join('');
    }

    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(`<html><head><title>Permohonan ${esc(d.id)}</title></head>
      <body style="font-family:Arial,sans-serif;color:#000;padding:40px;max-width:760px;margin:0 auto;line-height:1.5">
        <div style="text-align:center;border-bottom:3px double #000;padding-bottom:12px;margin-bottom:20px">
          <div style="font-size:19px;font-weight:bold">YAYASAN BPK PENABUR</div>
          <div style="font-size:13px">Permohonan Operasional — ${esc(d.jenis)}</div>
        </div>
        <table style="width:100%;font-size:13.5px;margin-bottom:18px">
          <tr><td style="width:150px">No. Permohonan</td><td>: <strong>${esc(d.id)}</strong></td></tr>
          <tr><td>Tanggal</td><td>: ${tgl}</td></tr>
          <tr><td>Pengaju</td><td>: ${esc(d.namaPengaju)}</td></tr>
          <tr><td>Jenjang</td><td>: ${esc(d.jenjang)}</td></tr>
          <tr><td>Status</td><td>: ${esc(d.status)}</td></tr>
        </table>
        <table style="width:100%;border-collapse:collapse;font-size:13px" border="1" cellpadding="6">
          <thead style="background:#eee">${head}</thead><tbody>${rows}</tbody>
        </table>
        <div style="text-align:right;font-weight:bold;font-size:15px;margin-top:14px">TOTAL: ${rp(d.total)}</div>
        <div style="margin-top:50px;display:flex;justify-content:space-between">
          <div style="text-align:center">Diproses,<br><br><br><br><strong>${esc(d.namaStaf || '________')}</strong><br>Staf</div>
          <div style="text-align:center">Mengetahui,<br><br><br><br><strong>Keuangan</strong></div>
        </div>
        <div style="margin-top:30px;font-size:10.5px;color:#666;text-align:center;border-top:1px solid #ccc;padding-top:8px">
          Dicetak dari sistem JOWI pada ${tglCetak}
        </div>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }

  return { mount, switchTab, loadList, openDetail, _onJenisChange, _hitungGalon,
           _addFcRow, _hitungFc, _addAtkRow, submitAjukan, simpanHargaGalon,
           simpanHargaFotocopy, approve, simpanHarga, selesaikan, cetak };
})();

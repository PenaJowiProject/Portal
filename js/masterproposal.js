// ============================================================
// masterproposal.js — Kelola Tipe Proposal & Rute Approval
// ============================================================
// Halaman admin (R-01 Kepala Yayasan & R-11 IT) untuk mengatur "otak"
// alur disposisi proposal:
//   Tab 1 — Tipe Proposal: tambah/edit/nonaktifkan tipe.
//   Tab 2 — Rute Approval: set urutan approver (email step 1..5) per
//           kombinasi (tipe × jenjang). Alur sengaja beda per kombinasi.
//
// Semua data ditarik sekali via getMasterProposalData lalu di-cache di
// memori halaman; setiap simpan/hapus me-refresh.
// ============================================================

const MasterProposalPage = (() => {
  let _tipe = [], _jenjang = [], _route = [];
  const _busy = {};

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  async function _sekali(nama, btn, teksBusy, fn) {
    if (_busy[nama]) return;
    _busy[nama] = true;
    const t = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; if (teksBusy) btn.textContent = teksBusy; }
    try { await fn(); }
    finally { _busy[nama] = false; if (btn) { btn.disabled = false; btn.textContent = t; } }
  }

  function mount() {
    const page = document.getElementById('page-masterproposal');
    page.innerHTML = `
      <div class="page-header">
        <h1>Kelola Proposal & Rute Approval</h1>
        <p>Atur tipe proposal dan alur disposisi (siapa approve dulu, lalu ke siapa) per jenjang.</p>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:18px;border-bottom:1px solid var(--border)">
        <button class="mp-tab active" data-tab="tipe" onclick="MasterProposalPage.switchTab('tipe')"
          style="background:none;border:none;padding:10px 16px;font-size:13.5px;font-weight:600;cursor:pointer;border-bottom:2px solid var(--primary);color:var(--primary)">Tipe Proposal</button>
        <button class="mp-tab" data-tab="rute" onclick="MasterProposalPage.switchTab('rute')"
          style="background:none;border:none;padding:10px 16px;font-size:13.5px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;color:var(--muted)">Rute Approval</button>
      </div>

      <!-- ══ TAB TIPE ══ -->
      <div id="mpTabTipe">
        <div style="display:grid;grid-template-columns:340px 1fr;gap:20px;align-items:start">
          <div class="section-card">
            <div class="section-head"><h2 id="mpTipeFormJudul">Tambah Tipe</h2></div>
            <div style="padding:18px 20px">
              <input type="hidden" id="mpTipeId"/>
              <div class="form-row"><label>Nama Tipe *</label>
                <input type="text" id="mpTipeNama" placeholder="Contoh: Pengajuan ATK" autocomplete="off"/>
              </div>
              <div class="form-row"><label>Keterangan</label>
                <input type="text" id="mpTipeKet" placeholder="Opsional" autocomplete="off"/>
              </div>
              <div class="form-row"><label>Status</label>
                <select id="mpTipeStatus">
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-primary" id="mpBtnSimpanTipe" style="flex:1" onclick="MasterProposalPage.simpanTipe(this)">Simpan</button>
                <button class="btn btn-outline" id="mpBtnResetTipe" onclick="MasterProposalPage.resetTipeForm()" style="display:none">Batal Edit</button>
              </div>
            </div>
          </div>

          <div class="section-card" style="padding:0;overflow:hidden">
            <div style="padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700;font-size:13.5px;font-family:'DM Sans',sans-serif">Daftar Tipe Proposal</div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Nama</th><th>Keterangan</th><th>Status</th><th>Aksi</th></tr></thead>
                <tbody id="mpTipeBody"><tr><td colspan="4"><div class="empty-state"><p>Memuat...</p></div></td></tr></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ TAB RUTE ══ -->
      <div id="mpTabRute" style="display:none">
        <div style="display:grid;grid-template-columns:400px 1fr;gap:20px;align-items:start">
          <div class="section-card">
            <div class="section-head"><h2>Set Rute Approval</h2></div>
            <div style="padding:18px 20px">
              <div class="form-row"><label>Tipe Proposal *</label>
                <select id="mpRouteTipe"><option value="">— Pilih tipe —</option></select>
              </div>
              <div class="form-row"><label>Jenjang *</label>
                <select id="mpRouteJenjang"><option value="">— Pilih jenjang —</option></select>
              </div>
              <div style="font-size:11.5px;color:var(--muted);margin:6px 0 10px;line-height:1.5">
                Isi email approver berurutan. Step 1 = approver pertama. Kosongkan step yang tidak dipakai (dari bawah). Minimal Step 1 wajib.
              </div>
              ${[1,2,3,4,5].map(n => `
                <div class="form-row" style="margin-bottom:8px"><label style="font-size:11px">Step ${n} ${n===1?'*':''}</label>
                  <input type="email" id="mpStep${n}" placeholder="email.approver${n}@sekolah.sch.id" autocomplete="off"
                    style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px"/>
                </div>`).join('')}
              <button class="btn btn-primary" id="mpBtnSimpanRoute" style="width:100%;margin-top:6px" onclick="MasterProposalPage.simpanRoute(this)">Simpan Rute</button>
              <div id="mpRouteHint" style="font-size:12px;margin-top:8px"></div>
            </div>
          </div>

          <div class="section-card" style="padding:0;overflow:hidden">
            <div style="padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700;font-size:13.5px;font-family:'DM Sans',sans-serif">Rute Tersimpan</div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Tipe</th><th>Jenjang</th><th>Alur Approver</th><th>Aksi</th></tr></thead>
                <tbody id="mpRouteBody"><tr><td colspan="4"><div class="empty-state"><p>Memuat...</p></div></td></tr></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
    load();
  }

  function switchTab(tab) {
    document.querySelectorAll('.mp-tab').forEach(el => {
      const on = el.dataset.tab === tab;
      el.style.borderBottomColor = on ? 'var(--primary)' : 'transparent';
      el.style.color = on ? 'var(--primary)' : 'var(--muted)';
      el.classList.toggle('active', on);
    });
    document.getElementById('mpTabTipe').style.display = tab === 'tipe' ? 'block' : 'none';
    document.getElementById('mpTabRute').style.display = tab === 'rute' ? 'block' : 'none';
  }

  async function load() {
    const res = await apiCall('getMasterProposalData', {});
    if (!res?.success) {
      showToast(res?.message || 'Gagal memuat data.', 'error');
      return;
    }
    _tipe    = res.data.tipe    || [];
    _jenjang = res.data.jenjang || [];
    _route   = res.data.route   || [];
    _renderTipe();
    _renderRouteDropdowns();
    _renderRoute();
  }

  // ── TIPE ──
  function _renderTipe() {
    const tbody = document.getElementById('mpTipeBody');
    if (!tbody) return;
    if (!_tipe.length) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><p>Belum ada tipe. Tambah di sebelah kiri.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = _tipe.map(t => `
      <tr>
        <td><strong>${esc(t.nama)}</strong></td>
        <td style="font-size:12.5px;color:var(--muted)">${esc(t.keterangan) || '—'}</td>
        <td><span class="badge ${t.status === 'Aktif' ? 'badge-green' : 'badge-gray'}">${esc(t.status)}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="MasterProposalPage.editTipe('${esc(t.id)}')">Edit</button>
        </td>
      </tr>`).join('');
  }

  function editTipe(id) {
    const t = _tipe.find(x => x.id === id);
    if (!t) return;
    document.getElementById('mpTipeId').value    = t.id;
    document.getElementById('mpTipeNama').value   = t.nama;
    document.getElementById('mpTipeKet').value    = t.keterangan || '';
    document.getElementById('mpTipeStatus').value = t.status;
    document.getElementById('mpTipeFormJudul').textContent = 'Edit Tipe';
    document.getElementById('mpBtnResetTipe').style.display = '';
  }

  function resetTipeForm() {
    document.getElementById('mpTipeId').value    = '';
    document.getElementById('mpTipeNama').value   = '';
    document.getElementById('mpTipeKet').value    = '';
    document.getElementById('mpTipeStatus').value = 'Aktif';
    document.getElementById('mpTipeFormJudul').textContent = 'Tambah Tipe';
    document.getElementById('mpBtnResetTipe').style.display = 'none';
  }

  async function simpanTipe(btn) {
    const nama = document.getElementById('mpTipeNama').value.trim();
    if (!nama) return showToast('Nama tipe wajib diisi.', 'error');
    await _sekali('simpanTipe', btn, 'Menyimpan...', async () => {
      const res = await apiCall('simpanTipeProposal', {
        id:         document.getElementById('mpTipeId').value,
        nama,
        keterangan: document.getElementById('mpTipeKet').value.trim(),
        status:     document.getElementById('mpTipeStatus').value,
      });
      showToast(res?.message || (res?.success ? 'Tersimpan.' : 'Gagal.'), res?.success ? 'success' : 'error');
      if (res?.success) { resetTipeForm(); load(); }
    });
  }

  // ── RUTE ──
  function _renderRouteDropdowns() {
    const selT = document.getElementById('mpRouteTipe');
    const selJ = document.getElementById('mpRouteJenjang');
    if (selT) selT.innerHTML = '<option value="">— Pilih tipe —</option>' +
      _tipe.filter(t => t.status === 'Aktif').map(t => `<option value="${esc(t.nama)}">${esc(t.nama)}</option>`).join('');
    if (selJ) selJ.innerHTML = '<option value="">— Pilih jenjang —</option>' +
      _jenjang.map(j => `<option value="${esc(j.id)}">${esc(j.nama)}</option>`).join('');
  }

  function _renderRoute() {
    const tbody = document.getElementById('mpRouteBody');
    if (!tbody) return;
    if (!_route.length) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><p>Belum ada rute. Set di sebelah kiri.</p></div></td></tr>`;
      return;
    }
    // Peta id jenjang → nama biar tabel kebaca manusiawi.
    const jMap = {}; _jenjang.forEach(j => { jMap[j.id] = j.nama; });
    tbody.innerHTML = _route.map(r => {
      const alur = r.steps.map((e, i) => `<span style="display:inline-block;background:var(--bg);border-radius:5px;padding:2px 7px;margin:2px;font-size:11.5px">${i+1}. ${esc(e)}</span>`).join(' → ');
      return `
      <tr>
        <td><strong>${esc(r.tipe)}</strong></td>
        <td style="font-size:12.5px">${esc(jMap[r.jenjang] || r.jenjang)}</td>
        <td>${alur || '<span style="color:var(--muted)">—</span>'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-outline btn-sm" onclick="MasterProposalPage.editRoute('${esc(r.tipe)}','${esc(r.jenjang)}')">Edit</button>
          <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="MasterProposalPage.hapusRoute('${esc(r.tipe)}','${esc(r.jenjang)}')">Hapus</button>
        </td>
      </tr>`;
    }).join('');
  }

  function editRoute(tipe, jenjang) {
    const r = _route.find(x => x.tipe === tipe && x.jenjang === jenjang);
    if (!r) return;
    document.getElementById('mpRouteTipe').value = tipe;
    document.getElementById('mpRouteJenjang').value = jenjang;
    for (let i = 1; i <= 5; i++) {
      document.getElementById('mpStep' + i).value = r.steps[i-1] || '';
    }
    document.getElementById('mpRouteHint').innerHTML = `<span style="color:var(--muted)">Mengedit rute ${esc(tipe)} × ${esc(jMapNama(jenjang))}. Simpan untuk menimpa.</span>`;
    // Scroll form ke view di layar kecil
    document.getElementById('mpRouteTipe').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function jMapNama(id) {
    const j = _jenjang.find(x => x.id === id);
    return j ? j.nama : id;
  }

  async function simpanRoute(btn) {
    const tipe    = document.getElementById('mpRouteTipe').value;
    const jenjang = document.getElementById('mpRouteJenjang').value;
    if (!tipe || !jenjang) return showToast('Pilih tipe dan jenjang dulu.', 'error');

    const steps = [];
    for (let i = 1; i <= 5; i++) steps.push(document.getElementById('mpStep' + i).value.trim());
    if (!steps[0]) return showToast('Step 1 (approver pertama) wajib diisi.', 'error');

    await _sekali('simpanRoute', btn, 'Menyimpan...', async () => {
      const res = await apiCall('simpanRouteApproval', { tipe, jenjang, steps });
      const hint = document.getElementById('mpRouteHint');
      if (res?.success) {
        hint.innerHTML = `<span style="color:#16A34A">✓ ${esc(res.message)}</span>`;
        showToast(res.message, 'success');
        for (let i = 1; i <= 5; i++) document.getElementById('mpStep' + i).value = '';
        document.getElementById('mpRouteTipe').value = '';
        document.getElementById('mpRouteJenjang').value = '';
        load();
      } else {
        hint.innerHTML = `<span style="color:var(--danger)">✗ ${esc(res?.message || 'Gagal.')}</span>`;
        showToast(res?.message || 'Gagal.', 'error');
      }
    });
  }

  async function hapusRoute(tipe, jenjang) {
    if (!confirm(`Hapus rute ${tipe} × ${jMapNama(jenjang)}? Permohonan tipe ini di jenjang tsb tidak akan bisa diajukan sampai rute dibuat lagi.`)) return;
    const res = await apiCall('hapusRouteApproval', { tipe, jenjang });
    showToast(res?.message || (res?.success ? 'Dihapus.' : 'Gagal.'), res?.success ? 'success' : 'error');
    if (res?.success) load();
  }

  return { mount, load, switchTab, editTipe, resetTipeForm, simpanTipe, editRoute, simpanRoute, hapusRoute };
})();

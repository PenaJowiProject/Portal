// ============================================================
// permohonan.js — Sistem Approval / Disposisi Bertingkat
// ============================================================
// DIROMBAK dari draft awal. Temuan:
// 1. [CRASH PASTI] submitPermohonan() membaca elemen id="permInRole"
//    yang tidak pernah ada di HTML — klik "Ajukan" langsung TypeError.
//    Dihapus total: backend tidak pernah memakai field ini, rutenya
//    100% ditentukan MASTER_ROUTE_APPROVAL di server (lihat #2).
// 2. [KONTRAK RUSAK] List lama cek p.NEXT_APPROVER_ROLE_ID (role-based)
//    padahal backend routing EMAIL-based — field itu tidak pernah
//    dikirim backend, jadi tombol "Proses" TIDAK PERNAH muncul untuk
//    siapapun. Sekarang pakai p.isPendingAtMe yang sudah dihitung
//    SERVER (server yang menentukan otorisasi, bukan client menebak).
// 3. Modal approval dulu punya dropdown "Disposisi ke Level Berikutnya"
//    (pilih role) yang backend TOTAL ABAIKAN — rute sudah baku dari
//    sheet, approver tidak memilih. Dropdown dihapus, diganti info
//    read-only "lanjut ke tahap berikutnya sesuai rute".
// 4. Dropdown jenjang dulu hardcode 4 opsi (J-TK dst, ID sembarang) —
//    sekarang load dari getJenjangList (endpoint yang sudah ada,
//    dipakai juga di kasir) supaya ID-nya konsisten dengan data asli.
// ============================================================

const PermohonanPage = (() => {

  let _permohonanList = [];

  // ── Mount HTML ──
  function mount() {
    const page = document.getElementById('page-permohonan');
    if (!page) return;

    page.innerHTML = `
      <div style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid var(--border)">
        <button class="perm-tab active" data-tab="list" onclick="PermohonanPage.switchTab('list')">Daftar Permohonan</button>
        <button class="perm-tab" data-tab="buat" onclick="PermohonanPage.switchTab('buat')">Buat Pengajuan</button>
      </div>
      <style>
        .perm-tab{background:none;border:none;padding:10px 20px;font-size:13.5px;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color .15s,border-color .15s}
        .perm-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
        .perm-tab:hover{color:var(--text)}
      </style>

      <!-- TAB: DAFTAR PERMOHONAN -->
      <div id="permTabList">
        <div class="section-card">
          <div class="section-head">
            <h2>Monitoring Permohonan</h2>
            <button class="btn btn-outline btn-sm" onclick="PermohonanPage.loadList()">Refresh</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Tanggal</th><th>Tipe & Judul</th><th>Status Keseluruhan</th><th>Posisi Saat Ini</th><th>Aksi</th></tr></thead>
              <tbody id="permListBody">
                <tr><td colspan="6"><div class="empty-state"><p>Memuat...</p></div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB: BUAT PERMOHONAN -->
      <div id="permTabBuat" style="display:none">
        <div class="section-card">
          <div class="section-head"><h2>Form Pengajuan Baru</h2></div>
          <div style="padding:20px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
              <div class="form-row" style="margin:0">
                <label>Tipe Permohonan</label>
                <select id="permInTipe">
                  <option value="Pengajuan ATK">Pengajuan ATK</option>
                  <option value="Permohonan Acara">Permohonan Acara</option>
                  <option value="Permohonan Air">Permohonan Air</option>
                  <option value="Peminjaman Alat">Peminjaman Alat</option>
                </select>
              </div>
              <div class="form-row" style="margin:0">
                <label>Jenjang Unit</label>
                <select id="permInJenjang">
                  <option value="">Memuat...</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <label>Judul Permohonan</label>
              <input type="text" id="permInJudul" placeholder="Contoh: Pengajuan Kertas HVS Bulan Agustus" autocomplete="off"/>
            </div>
            <div class="form-row">
              <label>Deskripsi</label>
              <textarea id="permInDeskripsi" rows="2" placeholder="Catatan atau alasan pengajuan..."></textarea>
            </div>
            
            <hr style="border:0;border-top:1px solid var(--border);margin:24px 0">
            
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <h3 style="font-size:14px;font-weight:700">Detail Kebutuhan / Barang</h3>
              <button class="btn btn-outline btn-sm" onclick="PermohonanPage.addDetailRow()">+ Tambah Item</button>
            </div>
            <div class="table-wrap" style="border:1px solid var(--border);border-radius:8px;margin-bottom:20px">
              <table>
                <thead><tr><th>Nama Item</th><th style="width:100px">Qty</th><th>Keterangan</th><th style="width:50px"></th></tr></thead>
                <tbody id="permDetailBody"></tbody>
              </table>
            </div>

            <div style="text-align:right">
              <button class="btn btn-primary" id="btnSubmitPermohonan" onclick="PermohonanPage.submitPermohonan(this)">Ajukan Permohonan</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: APPROVE/DISPOSISI -->
      <div class="modal-overlay" id="modalApprovePerm">
        <div class="modal">
          <div class="modal-header">
            <h3>Proses Permohonan <span id="apprIdText" style="color:var(--primary)"></span></h3>
            <button class="modal-close" onclick="document.getElementById('modalApprovePerm').classList.remove('show')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="apprIdVal">
            <div class="form-row">
              <label>Aksi Keputusan</label>
              <select id="apprAksi" onchange="document.getElementById('apprRoleRow').style.display = this.value==='Disposisi' ? 'block' : 'none'">
                <option value="Disposisi">Setuju & Disposisi (Naik Level)</option>
                <option value="Approved">Setuju (Approved Final)</option>
                <option value="Rejected">Tolak (Rejected)</option>
              </select>
            </div>
            <!-- Rute approval berikutnya sudah baku dari MASTER_ROUTE_APPROVAL
                 di server -- approver TIDAK memilih tujuan, jadi tidak ada
                 dropdown di sini. Kalau "Disposisi" dipilih, server otomatis
                 mencari email step berikutnya (atau langsung final kalau
                 rutenya sudah habis). -->
            <div class="form-row" id="apprRoleRow" style="background:var(--bg);border-radius:8px;padding:10px 12px;font-size:12.5px;color:var(--muted)">
              &#8505;&#65039; Kalau disetujui, permohonan otomatis diteruskan ke approver berikutnya sesuai jalur yang sudah diatur. Kalau tidak ada approver berikutnya di jalur ini, permohonan langsung selesai (Approved Final).
            </div>
            <div class="form-row">
              <label>Catatan / Instruksi</label>
              <textarea id="apprCatatan" rows="3" placeholder="Pesan untuk pemohon atau pemeriksa selanjutnya..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="document.getElementById('modalApprovePerm').classList.remove('show')">Batal</button>
            <button class="btn btn-primary" id="btnSubmitApprove" onclick="PermohonanPage.submitApprove(this)">Proses Sekarang</button>
          </div>
        </div>
      </div>
    `;
    
    // Add first empty row by default
    addDetailRow();
    _loadJenjangDropdown();
  }

  // ── Muat daftar jenjang -- reuse endpoint yang sama dipakai kasir,
  // supaya ID jenjang yang dikirim konsisten dengan data MASTER_JENJANG
  // asli (dulu hardcode J-TK/J-SD/dst, ID sembarang tanpa jaminan cocok
  // dengan apa yang benar-benar ada di sheet). ──
  async function _loadJenjangDropdown() {
    const sel = document.getElementById('permInJenjang');
    if (!sel) return;
    const res = await apiCall('getJenjangList', {});
    if (!res?.success || !res.data?.length) {
      sel.innerHTML = '<option value="">— Belum ada data jenjang —</option>';
      return;
    }
    sel.innerHTML = res.data.map(j => `<option value="${esc(j.id)}">${esc(j.nama)}</option>`).join('');
  }

  function switchTab(tabId) {
    document.querySelectorAll('.perm-tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tabId));
    document.getElementById('permTabList').style.display = tabId === 'list' ? 'block' : 'none';
    document.getElementById('permTabBuat').style.display = tabId === 'buat' ? 'block' : 'none';
    if (tabId === 'list') loadList();
  }

  // ── Load List & Rendering ──
  async function loadList() {
    const tbody = document.getElementById('permListBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Memuat...</p></div></td></tr>`;

    // Pastikan endpoint API lu di Apps Script namanya ini
    const res = await apiCall('getMonitoringPermohonan', {});
    
    if (!res?.success) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>${res?.message || 'Gagal'}</p></div></td></tr>`;
      return;
    }

    _permohonanList = res.data || [];
    if (!_permohonanList.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Belum ada data permohonan.</p></div></td></tr>`;
      return;
    }

    // isPendingAtMe SUDAH dihitung server (bandingkan email currentUser
    // dengan EMAIL_APPROVER_SAAT_INI dokumen) -- bukan dihitung di sini.
    // Field lama p.NEXT_APPROVER_ROLE_ID (role-based) tidak pernah
    // dikirim backend, jadi versi sebelumnya tombol Proses tidak pernah
    // muncul untuk siapapun.
    tbody.innerHTML = _permohonanList.map(p => {
      let badgeCls = 'badge-gray';
      if (p.status === 'Approved Final') badgeCls = 'badge-green';
      if (p.status === 'Rejected') badgeCls = 'badge-red';
      if (p.status === 'In Progress') badgeCls = 'badge-blue';

      let actHtml = `<button class="btn btn-outline btn-sm" onclick="PermohonanPage.printSurat('${esc(p.id)}')">Cetak</button>`;

      if (p.isPendingAtMe) {
        actHtml += ` <button class="btn btn-primary btn-sm" onclick="PermohonanPage.openApprove('${esc(p.id)}')">Proses</button>`;
      }

      return `
        <tr>
          <td style="font-family:monospace;color:var(--muted)">${esc(p.id)}</td>
          <td style="font-size:12.5px">${new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
          <td>
            <div style="font-weight:600">${esc(p.judul)}</div>
            <div style="font-size:11px;color:var(--muted)">${esc(p.tipe)}</div>
          </td>
          <td><span class="badge ${badgeCls}">${esc(p.status)}</span></td>
          <td style="font-size:12px;color:var(--primary)">${esc(p.posisi)}</td>
          <td><div style="display:flex;gap:6px">${actHtml}</div></td>
        </tr>
      `;
    }).join('');
  }

  // ── Dynamic Form Logic ──
  function addDetailRow() {
    const tbody = document.getElementById('permDetailBody');
    const tr = document.createElement('tr');
    tr.className = 'perm-item-row';
    tr.innerHTML = `
      <td><input type="text" class="inp-nama" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:4px" placeholder="Nama barang/kebutuhan"></td>
      <td><input type="number" class="inp-qty" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:4px" value="1" min="1"></td>
      <td><input type="text" class="inp-ket" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:4px" placeholder="-"></td>
      <td><button class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()" style="padding:4px 8px">✕</button></td>
    `;
    tbody.appendChild(tr);
  }

  async function submitPermohonan(btn) {
    const judul = document.getElementById('permInJudul').value.trim();
    if (!judul) return showToast('Judul wajib diisi', 'error');

    const details = [];
    document.querySelectorAll('.perm-item-row').forEach(tr => {
      const nama = tr.querySelector('.inp-nama').value.trim();
      if (nama) {
        details.push({
          nama_item: nama,
          qty: tr.querySelector('.inp-qty').value || 1,
          keterangan: tr.querySelector('.inp-ket').value
        });
      }
    });

    if (!details.length) return showToast('Minimal isi 1 item kebutuhan!', 'error');

    const jenjangId = document.getElementById('permInJenjang').value;
    if (!jenjangId) return showToast('Jenjang belum termuat/dipilih, coba lagi.', 'error');

    // next_approver_role_id DIHAPUS -- elemen sumbernya (permInRole)
    // tidak pernah ada di HTML (bikin klik Ajukan selalu crash), dan
    // backend tidak pernah memakainya: rute step 1 dicari server dari
    // MASTER_ROUTE_APPROVAL berdasar tipe+jenjang, bukan dari input user.
    const payload = {
      id_jenjang: jenjangId,
      tipe_permohonan: document.getElementById('permInTipe').value,
      judul_permohonan: judul,
      deskripsi: document.getElementById('permInDeskripsi').value,
      details: details // Array of objects
    };

    const res = await withBusy(btn, 'Mengirim...', () => apiCall('createPermohonan', payload));
    
    if (res?.success) {
      showToast('Permohonan berhasil diajukan', 'success');
      document.getElementById('permInJudul').value = '';
      document.getElementById('permInDeskripsi').value = '';
      document.getElementById('permDetailBody').innerHTML = '';
      addDetailRow();
      switchTab('list');
    } else {
      showToast(res?.message || 'Gagal membuat permohonan', 'error');
    }
  }

  // ── Approval Logic ──
  function openApprove(id) {
    document.getElementById('apprIdVal').value = id;
    document.getElementById('apprIdText').textContent = id;
    document.getElementById('apprCatatan').value = '';
    document.getElementById('apprAksi').value = 'Disposisi';
    document.getElementById('apprRoleRow').style.display = 'block';
    document.getElementById('modalApprovePerm').classList.add('show');
  }

  async function submitApprove(btn) {
    const id = document.getElementById('apprIdVal').value;
    const aksi = document.getElementById('apprAksi').value;
    const catatan = document.getElementById('apprCatatan').value;

    // status_keseluruhan / posisi_saat_ini / next_approver_role_id DIHAPUS
    // dari payload -- server SELALU menghitung ulang hasil dari
    // MASTER_ROUTE_APPROVAL + aksi, tidak pernah mempercayai nilai dari
    // client (kalau dulu dikirim pun diabaikan backend -- ini cuma
    // bersih-bersih kode mati yang bisa menyesatkan saat debug nanti).
    const payload = { id_permohonan: id, aksi: aksi, catatan: catatan };

    const res = await withBusy(btn, 'Memproses...', () => apiCall('approvePermohonan', payload));
    
    if (res?.success) {
      showToast('Permohonan berhasil diproses', 'success');
      document.getElementById('modalApprovePerm').classList.remove('show');
      loadList();
    } else {
      showToast(res?.message || 'Gagal memproses', 'error');
    }
  }

  // ── Print PDF/Surat ──
  function printSurat(id) {
    const p = _permohonanList.find(x => x.id === id);
    if(!p) return;

    let htmlDetail = '';
    if (p.details && Array.isArray(p.details)) {
      p.details.forEach((d, i) => {
        htmlDetail += `<tr>
          <td style="border:1px solid #000; padding:6px; text-align:center">${i+1}</td>
          <td style="border:1px solid #000; padding:6px">${esc(d.namaItem)}</td>
          <td style="border:1px solid #000; padding:6px; text-align:center">${esc(d.qty)}</td>
          <td style="border:1px solid #000; padding:6px">${esc(d.keterangan)}</td>
        </tr>`;
      });
    }

    const printHtml = `
      <html><head><title>Surat Permohonan - ${id}</title></head>
      <body style="font-family:Arial,sans-serif;color:#000;padding:40px;line-height:1.5">
        <h2 style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:30px">SURAT PERMOHONAN RESMI</h2>
        <table style="width:100%;margin-bottom:30px">
          <tr><td style="width:150px"><strong>ID Permohonan</strong></td><td>: ${esc(p.id)}</td></tr>
          <tr><td><strong>Tanggal</strong></td><td>: ${new Date(p.tanggal).toLocaleDateString('id-ID')}</td></tr>
          <tr><td><strong>Tipe Permohonan</strong></td><td>: ${esc(p.tipe)}</td></tr>
          <tr><td><strong>Judul</strong></td><td>: ${esc(p.judul)}</td></tr>
          <tr><td><strong>Status</strong></td><td>: ${esc(p.status)}</td></tr>
          <tr><td valign="top"><strong>Deskripsi</strong></td><td>: ${esc(p.deskripsi || '').replace(/\n/g, '<br>')}</td></tr>
        </table>
        
        <h4 style="margin-bottom:10px">Rincian Kebutuhan:</h4>
        <table style="width:100%;border-collapse:collapse;margin-bottom:50px">
          <thead>
            <tr style="background:#eee">
              <th style="border:1px solid #000;padding:6px;width:40px">No</th>
              <th style="border:1px solid #000;padding:6px">Nama Item</th>
              <th style="border:1px solid #000;padding:6px;width:60px">Qty</th>
              <th style="border:1px solid #000;padding:6px">Keterangan</th>
            </tr>
          </thead>
          <tbody>${htmlDetail}</tbody>
        </table>

        <div style="text-align:right;margin-top:50px">
          <p>Disetujui Oleh,</p>
          <br><br><br>
          <p><strong>Sistem Approval PenaJowi</strong></p>
        </div>
      </body></html>
    `;

    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(printHtml);
    win.document.close();
    // Beri waktu sedikit untuk render tabel sebelum diprint
    setTimeout(() => { win.print(); }, 250);
  }

  return { mount, switchTab, loadList, addDetailRow, submitPermohonan, openApprove, submitApprove, printSurat };
})();

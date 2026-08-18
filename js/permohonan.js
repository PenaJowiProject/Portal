// ============================================================
// permohonan.js — Sistem Approval / Disposisi Bertingkat
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
                  <option value="J-TK">TK</option>
                  <option value="J-SD">SD</option>
                  <option value="J-SMP">SMP</option>
                  <option value="J-SMA">SMA</option>
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
            <div class="form-row" id="apprRoleRow">
              <label>Disposisi ke Level Berikutnya</label>
              <select id="apprNextRole">
                <option value="R-02">Kepala Bagian (R-02)</option>
                <option value="R-01">Kepala Yayasan (R-01)</option>
              </select>
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

    const myRole = currentUser.roleId;

    tbody.innerHTML = _permohonanList.map(p => {
      const isPendingAtMe = (p.NEXT_APPROVER_ROLE_ID === myRole && !['Approved Final','Rejected'].includes(p.STATUS_KESELURUHAN));
      
      let badgeCls = 'badge-gray';
      if (p.STATUS_KESELURUHAN === 'Approved Final') badgeCls = 'badge-green';
      if (p.STATUS_KESELURUHAN === 'Rejected') badgeCls = 'badge-red';
      if (p.STATUS_KESELURUHAN === 'In Progress') badgeCls = 'badge-blue';

      let actHtml = `<button class="btn btn-outline btn-sm" onclick="PermohonanPage.printSurat('${esc(p.ID_PERMOHONAN)}')">Cetak</button>`;
      
      if (isPendingAtMe) {
        actHtml += ` <button class="btn btn-primary btn-sm" onclick="PermohonanPage.openApprove('${esc(p.ID_PERMOHONAN)}')">Proses</button>`;
      }

      return `
        <tr>
          <td style="font-family:monospace;color:var(--muted)">${esc(p.ID_PERMOHONAN)}</td>
          <td style="font-size:12.5px">${new Date(p.TANGGAL_PENGAJUAN).toLocaleDateString('id-ID')}</td>
          <td>
            <div style="font-weight:600">${esc(p.JUDUL_PERMOHONAN)}</div>
            <div style="font-size:11px;color:var(--muted)">${esc(p.TIPE_PERMOHONAN)}</div>
          </td>
          <td><span class="badge ${badgeCls}">${esc(p.STATUS_KESELURUHAN)}</span></td>
          <td style="font-size:12px;color:var(--primary)">${esc(p.POSISI_APPROVAL_SAAT_INI)}</td>
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

    const payload = {
      id_jenjang: document.getElementById('permInJenjang').value,
      tipe_permohonan: document.getElementById('permInTipe').value,
      next_approver_role_id: document.getElementById('permInRole').value,
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
    let next_role = document.getElementById('apprNextRole').value;
    let status_keseluruhan = "In Progress";
    let posisi_saat_ini = "Disposisi Lanjut";

    if (aksi === "Approved") {
      status_keseluruhan = "Approved Final";
      posisi_saat_ini = "Selesai";
      next_role = "";
    } else if (aksi === "Rejected") {
      status_keseluruhan = "Rejected";
      posisi_saat_ini = "Ditolak";
      next_role = "";
    } else {
      posisi_saat_ini = "Menunggu Role ID: " + next_role;
    }

    const payload = {
      id_permohonan: id,
      aksi: aksi,
      status_keseluruhan: status_keseluruhan,
      posisi_saat_ini: posisi_saat_ini,
      next_approver_role_id: next_role,
      catatan: catatan
    };

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
    const p = _permohonanList.find(x => x.ID_PERMOHONAN === id);
    if(!p) return;

    let htmlDetail = '';
    if (p.DETAILS && Array.isArray(p.DETAILS)) {
      p.DETAILS.forEach((d, i) => {
        htmlDetail += `<tr>
          <td style="border:1px solid #000; padding:6px; text-align:center">${i+1}</td>
          <td style="border:1px solid #000; padding:6px">${esc(d.NAMA_ITEM_KEBUTUHAN)}</td>
          <td style="border:1px solid #000; padding:6px; text-align:center">${esc(d.QTY)}</td>
          <td style="border:1px solid #000; padding:6px">${esc(d.KETERANGAN_ITEM)}</td>
        </tr>`;
      });
    }

    const printHtml = `
      <html><head><title>Surat Permohonan - ${id}</title></head>
      <body style="font-family:Arial,sans-serif;color:#000;padding:40px;line-height:1.5">
        <h2 style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:30px">SURAT PERMOHONAN RESMI</h2>
        <table style="width:100%;margin-bottom:30px">
          <tr><td style="width:150px"><strong>ID Permohonan</strong></td><td>: ${esc(p.ID_PERMOHONAN)}</td></tr>
          <tr><td><strong>Tanggal</strong></td><td>: ${new Date(p.TANGGAL_PENGAJUAN).toLocaleDateString('id-ID')}</td></tr>
          <tr><td><strong>Tipe Permohonan</strong></td><td>: ${esc(p.TIPE_PERMOHONAN)}</td></tr>
          <tr><td><strong>Judul</strong></td><td>: ${esc(p.JUDUL_PERMOHONAN)}</td></tr>
          <tr><td><strong>Status</strong></td><td>: ${esc(p.STATUS_KESELURUHAN)}</td></tr>
          <tr><td valign="top"><strong>Deskripsi</strong></td><td>: ${esc(p.DESKRIPSI).replace(/\\n/g, '<br>')}</td></tr>
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

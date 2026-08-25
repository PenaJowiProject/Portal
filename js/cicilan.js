// ============================================================
// cicilan.js — Cicilan Perseorangan (Tahap 2A)
// ============================================================
// Sub-menu di grup "Pengajuan". Alur: atasan ajukan → approve 4 tahap
// (by email) → staf isi aktual → keuangan tetapkan bunga (elektronik)
// → cicilan final + jadwal. Tracking bayar bulanan = Tahap 2B.
// ============================================================

const CicilanPage = (() => {
  let _lastDetail = null;
  const _busy = {};

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const rp = n => 'Rp ' + Math.round(Number(n)||0).toLocaleString('id-ID');
  const tgl = d => d ? new Date(d).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '-';

  async function _sekali(nama, btn, teksBusy, fn) {
    if (_busy[nama]) return;
    _busy[nama] = true;
    const t = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; if (teksBusy) btn.textContent = teksBusy; }
    try { await fn(); } finally { _busy[nama] = false; if (btn) { btn.disabled = false; btn.textContent = t; } }
  }

  function _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => { const s = String(r.result); const k = s.indexOf(','); resolve(k>=0?s.slice(k+1):s); };
      r.onerror = reject; r.readAsDataURL(file);
    });
  }

  function mount() {
    const page = document.getElementById('page-cicilan');
    page.innerHTML = `
      <div class="page-header">
        <h1>Cicilan Perseorangan</h1>
        <p>Pengajuan cicilan elektronik & non-elektronik untuk anggota.</p>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:18px;border-bottom:1px solid var(--border);flex-wrap:wrap">
        <button class="cic-tab active" data-tab="list" onclick="CicilanPage.switchTab('list')"
          style="background:none;border:none;padding:10px 16px;font-size:13.5px;font-weight:600;cursor:pointer;border-bottom:2px solid var(--primary);color:var(--primary)">Daftar Cicilan</button>
        <button class="cic-tab" data-tab="ajukan" onclick="CicilanPage.switchTab('ajukan')"
          style="background:none;border:none;padding:10px 16px;font-size:13.5px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;color:var(--muted)">+ Ajukan Cicilan</button>
      </div>

      <div id="cicTabList"></div>
      <div id="cicTabAjukan" style="display:none"></div>

      <div class="modal-overlay" id="cicModalDetail">
        <div class="modal" style="max-width:680px">
          <div class="modal-header">
            <h3>Detail Cicilan</h3>
            <button class="modal-close" onclick="document.getElementById('cicModalDetail').classList.remove('show')">✕</button>
          </div>
          <div class="modal-body" id="cicDetailBody" style="padding:20px"></div>
        </div>
      </div>
    `;
    _renderList();
    _renderAjukan();
    loadList();
  }

  function switchTab(tab) {
    document.querySelectorAll('.cic-tab').forEach(el => {
      const on = el.dataset.tab === tab;
      el.style.borderBottomColor = on ? 'var(--primary)' : 'transparent';
      el.style.color = on ? 'var(--primary)' : 'var(--muted)';
    });
    document.getElementById('cicTabList').style.display   = tab === 'list'   ? 'block' : 'none';
    document.getElementById('cicTabAjukan').style.display = tab === 'ajukan' ? 'block' : 'none';
    if (tab === 'list') loadList();
  }

  // ══════════ LIST ══════════
  function _renderList() {
    document.getElementById('cicTabList').innerHTML = `
      <div class="section-card" style="padding:0;overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div style="font-weight:700;font-size:13.5px;font-family:'DM Sans',sans-serif">Semua Cicilan</div>
          <select id="cicFilterJenis" onchange="CicilanPage.loadList()" style="border:1.5px solid var(--border);border-radius:7px;padding:6px 10px;font-size:12.5px">
            <option value="">Semua Jenis</option>
            <option value="Elektronik">Elektronik</option>
            <option value="Non-Elektronik">Non-Elektronik</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>Jenis</th><th>Atas Nama</th><th>Barang</th><th>Tenor</th><th>Cicilan/bln</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody id="cicListBody"><tr><td colspan="8"><div class="empty-state"><p>Memuat...</p></div></td></tr></tbody>
          </table>
        </div>
      </div>`;
  }

  async function loadList() {
    const tbody = document.getElementById('cicListBody');
    if (!tbody) return;
    const jenis = document.getElementById('cicFilterJenis')?.value || '';
    const res = await apiCall('getCicilanList', { jenis });
    if (!res?.success) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>Gagal memuat.</p></div></td></tr>`; return; }
    if (!res.data.length) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>Belum ada cicilan.</p></div></td></tr>`; return; }

    const badge = st => {
      if (st.indexOf('Final') === 0 || st === 'Lunas') return 'badge-green';
      if (st.indexOf('Disetujui') === 0) return 'badge-blue';
      if (st === 'Ditolak') return 'badge-red';
      return 'badge-yellow';
    };
    tbody.innerHTML = res.data.map(c => `
      <tr>
        <td style="font-size:12.5px">${tgl(c.tanggal)}</td>
        <td><span class="badge ${c.jenis==='Elektronik'?'badge-blue':'badge-gray'}">${esc(c.jenis)}</span></td>
        <td style="font-size:12.5px">${esc(c.atasNama)}</td>
        <td style="font-size:12.5px">${esc(c.namaBarang)}</td>
        <td style="text-align:center">${c.tenor}x</td>
        <td>${c.perBulan ? rp(c.perBulan) : '<span style="color:var(--muted);font-size:12px">—</span>'}</td>
        <td><span class="badge ${badge(c.status)}">${esc(c.status)}</span>${c.isMyApproval?' <span style="color:var(--danger);font-size:11px">• giliran Anda</span>':''}</td>
        <td><button class="btn btn-outline btn-sm" onclick="CicilanPage.openDetail('${esc(c.id)}')">Detail</button></td>
      </tr>`).join('');
  }

  // ══════════ AJUKAN ══════════
  function _renderAjukan() {
    document.getElementById('cicTabAjukan').innerHTML = `
      <div class="section-card">
        <div class="section-head"><h2>Ajukan Cicilan Baru</h2></div>
        <div style="padding:20px 22px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
            <div class="form-row"><label>Jenis Cicilan *</label>
              <select id="cicJenis">
                <option value="">— Pilih jenis —</option>
                <option value="Elektronik">Elektronik (kena bunga)</option>
                <option value="Non-Elektronik">Non-Elektronik (tanpa bunga)</option>
              </select>
            </div>
            <div class="form-row"><label>Atas Nama (anggota) *</label>
              <input type="text" id="cicAtasNama" placeholder="Nama anggota yang dibuatkan"/>
            </div>
          </div>
          <div class="form-row"><label>Nama Barang *</label>
            <input type="text" id="cicNamaBarang" placeholder="mis. Laptop Asus / Buku Paket"/>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:6px">
            <div class="form-row"><label>Harga Estimasi *</label>
              <input type="number" id="cicEstimasi" min="0" placeholder="0" oninput="CicilanPage._hitungEstimasi()"/>
            </div>
            <div class="form-row"><label>Tenor (jumlah cicilan) *</label>
              <input type="number" id="cicTenor" min="1" placeholder="mis. 3" oninput="CicilanPage._hitungEstimasi()"/>
            </div>
          </div>
          <div style="background:#EFF6FF;border-radius:8px;padding:12px 14px;font-size:13px;color:var(--primary);margin-bottom:14px">
            Estimasi cicilan per bulan: <strong id="cicEstimasiBulan">Rp 0</strong>
            <div style="font-size:11px;color:var(--muted);margin-top:3px">*perkiraan awal, nilai final ditentukan setelah belanja & (untuk elektronik) penetapan bunga.</div>
          </div>
          <div class="form-row"><label>Dokumen Pendukung <span style="color:var(--muted);font-weight:400">(opsional, PDF/gambar, maks 10MB)</span></label>
            <input type="file" id="cicFile" accept="application/pdf,image/*" style="width:100%;border:1.5px dashed var(--border);border-radius:8px;padding:10px;font-size:13px;background:#F8FAFC"/>
          </div>
          <div class="form-row"><label>Catatan (opsional)</label>
            <input type="text" id="cicCatatan" placeholder="Keterangan tambahan..."/>
          </div>
          <button class="btn btn-primary" id="cicBtnAjukan" style="width:100%" onclick="CicilanPage.submitAjukan(this)">Ajukan Cicilan</button>
        </div>
      </div>`;
  }

  function _hitungEstimasi() {
    const est = parseFloat(document.getElementById('cicEstimasi')?.value || '0');
    const ten = parseInt(document.getElementById('cicTenor')?.value || '0');
    const el = document.getElementById('cicEstimasiBulan');
    if (el) el.textContent = (ten > 0) ? rp(Math.round(est/ten)) : 'Rp 0';
  }

  async function submitAjukan(btn) {
    const jenis   = document.getElementById('cicJenis')?.value;
    const atasNama= document.getElementById('cicAtasNama')?.value.trim();
    const namaBarang = document.getElementById('cicNamaBarang')?.value.trim();
    const hargaEstimasi = parseFloat(document.getElementById('cicEstimasi')?.value || '0');
    const tenor   = parseInt(document.getElementById('cicTenor')?.value || '0');
    const catatan = document.getElementById('cicCatatan')?.value || '';

    if (!jenis)    return showToast('Pilih jenis cicilan.', 'error');
    if (!atasNama) return showToast('Isi nama anggota (atas nama).', 'error');
    if (!namaBarang) return showToast('Isi nama barang.', 'error');
    if (hargaEstimasi <= 0) return showToast('Isi harga estimasi.', 'error');
    if (tenor <= 0) return showToast('Isi tenor (jumlah cicilan).', 'error');

    await _sekali('ajukan', btn, 'Mengirim...', async () => {
      const res = await apiCall('createCicilan', { jenis, atasNama, namaBarang, hargaEstimasi, tenor, catatan });
      if (!res?.success) { showToast(res?.message || 'Gagal.', 'error'); return; }

      // Upload dokumen kalau ada (setelah create sukses).
      const file = document.getElementById('cicFile')?.files?.[0];
      const idBaru = res.data?.id_cicilan;
      if (file && idBaru) {
        if (file.size > 10*1024*1024) showToast('Cicilan dibuat, tapi lampiran >10MB tidak diunggah.', 'error');
        else {
          try {
            const base64 = await _fileToBase64(file);
            const up = await apiCall('uploadDokumenCicilan', { id_cicilan: idBaru, fileBase64: base64, mimeType: file.type, fileName: file.name });
            showToast(up?.success ? 'Cicilan & dokumen terkirim.' : ('Cicilan terkirim, upload dokumen gagal: '+(up?.message||'')), up?.success?'success':'error');
          } catch(e) { showToast('Cicilan terkirim, dokumen gagal dibaca.', 'error'); }
        }
      } else {
        showToast(res.message, 'success');
      }

      ['cicJenis','cicAtasNama','cicNamaBarang','cicEstimasi','cicTenor','cicCatatan'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
      const f = document.getElementById('cicFile'); if (f) f.value = '';
      document.getElementById('cicEstimasiBulan').textContent = 'Rp 0';
      switchTab('list');
    });
  }

  // ══════════ DETAIL ══════════
  async function openDetail(id) {
    const body = document.getElementById('cicDetailBody');
    body.innerHTML = '<div class="empty-state"><p>Memuat...</p></div>';
    document.getElementById('cicModalDetail').classList.add('show');
    const res = await apiCall('getCicilanDetail', { id_cicilan: id });
    if (!res?.success) { body.innerHTML = `<p>${esc(res?.message||'Gagal.')}</p>`; return; }
    const d = res.data;
    _lastDetail = d;

    // Rincian angka bertahap.
    let angka = `
      <table style="width:100%;font-size:13px;margin-bottom:8px">
        <tr><td style="color:var(--muted);width:150px">Harga Estimasi</td><td>${rp(d.estimasi)}</td></tr>
        <tr><td style="color:var(--muted)">Tenor</td><td>${d.tenor}x → estimasi ${rp(d.estimasiPerBulan)}/bln</td></tr>`;
    if (d.aktual > 0) {
      angka += `<tr><td style="color:var(--muted)">Harga Aktual</td><td>${rp(d.aktual)}</td></tr>
        <tr><td style="color:var(--muted)">Selisih</td><td style="color:${d.selisih>0?'#B91C1C':(d.selisih<0?'#15803D':'inherit')}">${d.selisih>0?'+':''}${rp(d.selisih)} ${d.selisih>0?'(kurang)':(d.selisih<0?'(sisa)':'(pas)')}</td></tr>`;
    }
    if (d.jenis === 'Elektronik' && d.bungaJumlah > 0) {
      angka += `<tr><td style="color:var(--muted)">Bunga</td><td>${d.bungaTipe==='persen'?d.bungaNilai+'%':'nominal'} = ${rp(d.bungaJumlah)}</td></tr>`;
    }
    if (d.totalFinal > 0) {
      angka += `<tr><td style="color:var(--muted)"><strong>Total Final</strong></td><td><strong>${rp(d.totalFinal)}</strong></td></tr>
        <tr><td style="color:var(--muted)"><strong>Cicilan/bulan</strong></td><td><strong style="color:var(--primary)">${rp(d.perBulan)}</strong></td></tr>`;
    }
    angka += `</table>`;

    // Jadwal cicilan (kalau sudah final) + tombol catat bayar.
    let jadwalHtml = '';
    if (d.jadwal && d.jadwal.length) {
      const lunasCount = d.jadwal.filter(j => j.statusBayar === 'Lunas').length;
      jadwalHtml = `<div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 6px">
          <h4 style="margin:0;font-size:13px">Jadwal Cicilan (Potong Gaji)</h4>
          <span style="font-size:12px;color:var(--muted)">${lunasCount}/${d.jadwal.length} bulan lunas</span>
        </div>
        <div class="table-wrap"><table style="font-size:12.5px"><thead><tr><th>Bulan</th><th>Jatuh Tempo</th><th>Nominal</th><th>Status</th><th>Keterangan</th>${d.bolehCatatBayar?'<th>Aksi</th>':''}</tr></thead><tbody>
        ${d.jadwal.map(j => `<tr>
          <td style="text-align:center">${j.bulanKe}</td>
          <td>${tgl(j.jatuhTempo)}</td>
          <td>${rp(j.nominal)}</td>
          <td><span class="badge ${j.statusBayar==='Lunas'?'badge-green':'badge-yellow'}">${esc(j.statusBayar)}</span></td>
          <td style="font-size:11.5px;color:var(--muted)">${esc(j.keteranganPotong)||'-'}</td>
          ${d.bolehCatatBayar?`<td>${j.statusBayar==='Lunas'
            ? `<button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="CicilanPage.batalBayar('${esc(d.id)}','${esc(j.idJadwal)}')">Batal</button>`
            : `<button class="btn btn-primary btn-sm" onclick="CicilanPage.tandaiBayar('${esc(d.id)}','${esc(j.idJadwal)}',${j.bulanKe})">Tandai Lunas</button>`}</td>`:''}
        </tr>`).join('')}
        </tbody></table></div>`;
    }

    // Tombol aksi kontekstual.
    let aksi = '';
    if (d.bolehApprove) {
      aksi += `<button class="btn btn-primary btn-sm" onclick="CicilanPage.approve('${esc(d.id)}','approve')">✓ Setujui (${esc(d.posisiApprover)})</button>
               <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="CicilanPage.approve('${esc(d.id)}','reject')">✕ Tolak</button>`;
    }
    if (d.bolehIsiAktual) {
      aksi += `<div style="width:100%;margin-top:10px;display:flex;gap:8px;align-items:end">
        <div style="flex:1"><label style="font-size:11px;color:var(--muted)">Harga Aktual (setelah belanja)</label>
        <input type="number" id="cicInAktual" min="0" placeholder="0" style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px"/></div>
        <button class="btn btn-primary btn-sm" onclick="CicilanPage.isiAktual('${esc(d.id)}')">Simpan Aktual</button></div>`;
    }
    if (d.bolehTetapkanBunga) {
      aksi += `<div style="width:100%;margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
        <label style="font-size:11px;color:var(--muted)">Tetapkan Bunga (dari harga aktual ${rp(d.aktual)})</label>
        <div style="display:flex;gap:8px;align-items:end;margin-top:4px">
          <select id="cicBungaTipe" style="border:1.5px solid var(--border);border-radius:8px;padding:8px;font-size:13px">
            <option value="persen">Persen (%)</option><option value="nominal">Nominal (Rp)</option>
          </select>
          <input type="number" id="cicBungaNilai" min="0" placeholder="mis. 6" style="flex:1;border:1.5px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px"/>
          <button class="btn btn-primary btn-sm" onclick="CicilanPage.tetapkanBunga('${esc(d.id)}')">Tetapkan</button>
        </div></div>`;
    }

    body.innerHTML = `
      <table style="width:100%;font-size:13px;margin-bottom:14px">
        <tr><td style="color:var(--muted);width:130px">No</td><td><strong>${esc(d.id)}</strong></td></tr>
        <tr><td style="color:var(--muted)">Jenis</td><td>${esc(d.jenis)}</td></tr>
        <tr><td style="color:var(--muted)">Atas Nama</td><td>${esc(d.atasNama)}</td></tr>
        <tr><td style="color:var(--muted)">Pengaju</td><td>${esc(d.namaPengaju)}</td></tr>
        <tr><td style="color:var(--muted)">Barang</td><td>${esc(d.namaBarang)}</td></tr>
        <tr><td style="color:var(--muted)">Status</td><td><strong>${esc(d.status)}</strong>${d.posisiApprover?` <span style="color:var(--muted)">(menunggu ${esc(d.posisiApprover)})</span>`:''}</td></tr>
        ${d.urlDokumen?`<tr><td style="color:var(--muted)">Dokumen</td><td><a href="${esc(d.urlDokumen)}" target="_blank">Lihat lampiran</a></td></tr>`:''}
        ${d.catatan?`<tr><td style="color:var(--muted)">Catatan</td><td>${esc(d.catatan)}</td></tr>`:''}
      </table>
      <div style="background:#F8FAFC;border-radius:8px;padding:12px 14px;margin-bottom:8px">${angka}</div>
      ${jadwalHtml}
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px">${aksi || '<span style="font-size:12px;color:var(--muted)">Tidak ada aksi tersedia untuk Anda saat ini.</span>'}</div>
    `;
  }

  async function approve(id, aksi) {
    if (aksi === 'reject' && !confirm('Yakin tolak cicilan ini?')) return;
    const res = await apiCall('approveCicilan', { id_cicilan: id, aksi });
    showToast(res?.message || (res?.success?'OK':'Gagal'), res?.success?'success':'error');
    if (res?.success) { document.getElementById('cicModalDetail').classList.remove('show'); loadList(); }
  }

  async function isiAktual(id) {
    const aktual = parseFloat(document.getElementById('cicInAktual')?.value || '0');
    if (aktual <= 0) return showToast('Isi harga aktual dulu.', 'error');
    const res = await apiCall('isiAktualCicilan', { id_cicilan: id, hargaAktual: aktual });
    showToast(res?.message || (res?.success?'OK':'Gagal'), res?.success?'success':'error');
    if (res?.success) openDetail(id);
  }

  async function tetapkanBunga(id) {
    const bungaTipe  = document.getElementById('cicBungaTipe')?.value || 'persen';
    const bungaNilai = parseFloat(document.getElementById('cicBungaNilai')?.value || '0');
    const res = await apiCall('tetapkanBungaCicilan', { id_cicilan: id, bungaTipe, bungaNilai });
    showToast(res?.message || (res?.success?'OK':'Gagal'), res?.success?'success':'error');
    if (res?.success) openDetail(id);
  }

  async function tandaiBayar(idCicilan, idJadwal, bulanKe) {
    // Pembayaran lewat potong gaji → wajib isi keterangan (bulan gaji / no slip).
    const ket = prompt(`Tandai bulan ke-${bulanKe} LUNAS (potong gaji).\nIsi keterangan potong gaji (mis. "Gaji Sep 2026" / "Slip #123"):`);
    if (ket === null) return;                 // batal
    if (!ket.trim()) return showToast('Keterangan potong gaji wajib diisi.', 'error');
    const res = await apiCall('tandaiBayarCicilan', { id_jadwal: idJadwal, keterangan: ket.trim() });
    showToast(res?.message || (res?.success?'OK':'Gagal'), res?.success?'success':'error');
    if (res?.success) openDetail(idCicilan);
  }

  async function batalBayar(idCicilan, idJadwal) {
    if (!confirm('Batalkan penandaan lunas bulan ini? Tindakan ini dicatat di log.')) return;
    const res = await apiCall('batalBayarCicilan', { id_jadwal: idJadwal });
    showToast(res?.message || (res?.success?'OK':'Gagal'), res?.success?'success':'error');
    if (res?.success) openDetail(idCicilan);
  }

  return { mount, switchTab, loadList, openDetail, _hitungEstimasi, submitAjukan, approve, isiAktual, tetapkanBunga, tandaiBayar, batalBayar };
})();

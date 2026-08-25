// ============================================================
// voucher.js — Buat & monitoring voucher belanja
// ============================================================
// Voucher = duit sungguhan. Kode diberikan server (acak, 8 karakter,
// bukan diketik manual di sini) — form ini cuma isi nama murid, email
// ortu, nominal, dan tanggal expired. Setelah dibuat, kode langsung
// tampil + email otomatis terkirim ke ortu.
// ============================================================

const VoucherPage = (() => {
  const _busy = {};
  async function _sekali(nama, btn, teksBusy, fn) {
    if (_busy[nama]) return;
    _busy[nama] = true;
    const teksAsli = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; if (teksBusy) btn.textContent = teksBusy; }
    try { await fn(); }
    finally { _busy[nama] = false; if (btn) { btn.disabled = false; btn.textContent = teksAsli; } }
  }

  function mount() {
    const page = document.getElementById('page-voucher');
    page.innerHTML = `
      <style>
        .vch-grid { display:grid; grid-template-columns: 380px 1fr; gap:20px; align-items:start; }
        @media (max-width: 900px) { .vch-grid { grid-template-columns: 1fr; } }
        .vch-result { display:none; margin-top:16px; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:10px; padding:16px; text-align:center; }
        .vch-result .kode { font-size:24px; font-weight:700; color:var(--primary); letter-spacing:2px; font-family:monospace; margin:6px 0; }
      </style>

      <div class="page-header">
        <h1>Voucher Belanja</h1>
        <p>Buat voucher potongan belanja untuk murid — kode otomatis dikirim ke email orang tua.</p>
      </div>

      <div class="vch-grid">
        <!-- Form buat voucher -->
        <div class="section-card">
          <div class="section-head"><h2>Buat Voucher Baru</h2></div>
          <div style="padding:20px 22px">
            <div class="form-row"><label>Nama Murid *</label>
              <input type="text" id="vchNamaMurid" placeholder="Nama lengkap murid" autocomplete="off"/>
            </div>
            <div class="form-row"><label>Email Orang Tua *</label>
              <input type="email" id="vchEmailOrtu" placeholder="email@contoh.com" autocomplete="off"/>
            </div>
            <div class="form-row"><label>Nominal Voucher (Rp) *</label>
              <input type="number" id="vchNominal" min="1" placeholder="Contoh: 50000"/>
            </div>
            <div class="form-row"><label>Berlaku Sampai *</label>
              <input type="date" id="vchExpired"/>
            </div>
            <p style="font-size:11.5px;color:var(--muted);margin:2px 0 14px">
              Kalau belanja lebih kecil dari nominal voucher, sisanya hangus (tidak ada kembalian, tidak bisa dipakai lagi).
            </p>
            <button class="btn btn-primary" id="btnBuatVoucher" style="width:100%">Buat Voucher</button>

            <div class="vch-result" id="vchResult"></div>
          </div>
        </div>

        <!-- Monitoring -->
        <div class="section-card" style="padding:0;overflow:hidden">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
            <div style="font-weight:700;font-size:13.5px;font-family:'DM Sans',sans-serif">Semua Voucher</div>
            <input type="text" id="vchSearch" placeholder="Cari kode / nama murid / email..."
              style="flex:1;max-width:280px;border:1.5px solid var(--border);border-radius:7px;padding:7px 12px;font-size:13px"/>
          </div>
          <div class="table-wrap" style="max-height:600px;overflow-y:auto">
            <table>
              <thead><tr><th>Kode</th><th>Murid</th><th>Nominal</th><th>Status</th><th>Expired</th><th>Dipakai di</th></tr></thead>
              <tbody id="voucherListBody"><tr><td colspan="6"><div class="empty-state"><p>Memuat...</p></div></td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Default tanggal expired: 90 hari dari sekarang, biar gak kosong.
    const def = new Date(); def.setDate(def.getDate() + 90);
    document.getElementById('vchExpired').value = def.toISOString().split('T')[0];

    document.getElementById('btnBuatVoucher').addEventListener('click', _doBuatVoucher);

    let _searchTimer = null;
    document.getElementById('vchSearch').addEventListener('input', () => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(loadList, 250);
    });

    loadList();
  }

  async function _doBuatVoucher() {
    const namaMurid = document.getElementById('vchNamaMurid').value.trim();
    const emailOrtu = document.getElementById('vchEmailOrtu').value.trim();
    const nominal   = parseFloat(document.getElementById('vchNominal').value);
    const expired   = document.getElementById('vchExpired').value;

    if (!namaMurid) return showToast('Nama murid wajib diisi.', 'error');
    if (!emailOrtu || !emailOrtu.includes('@')) return showToast('Email orang tua tidak valid.', 'error');
    if (!nominal || nominal <= 0) return showToast('Nominal voucher wajib diisi.', 'error');
    if (!expired) return showToast('Tanggal expired wajib diisi.', 'error');

    const btn = document.getElementById('btnBuatVoucher');
    await _sekali('buat', btn, 'Membuat...', async () => {
      const res = await apiCall('createVoucher', {
        namaMurid, emailOrtu, nominal, tanggalExpired: expired,
      });

      if (!res?.success) { showToast(res?.message || 'Gagal.', 'error'); return; }

      showToast(res.message, 'success');

      const r = document.getElementById('vchResult');
      r.style.display = '';
      r.innerHTML = `
        <div style="font-size:12px;color:var(--muted)">VOUCHER BERHASIL DIBUAT</div>
        <div class="kode">${esc(res.data.kode)}</div>
        <div style="font-size:13px;color:var(--text)">Rp ${Math.round(res.data.nominal).toLocaleString('id-ID')} — untuk ${esc(res.data.namaMurid)}</div>
        <div style="font-size:11.5px;color:${res.data.emailTerkirim ? '#16A34A' : 'var(--danger)'};margin-top:6px">
          ${res.data.emailTerkirim ? '✓ Email terkirim ke ' + esc(res.data.emailOrtu) : '⚠ Email gagal terkirim — catat kode ini manual untuk ' + esc(res.data.emailOrtu)}
        </div>`;

      // Reset form (kecuali expired biar gak perlu pilih ulang kalau bikin banyak voucher beruntun)
      document.getElementById('vchNamaMurid').value = '';
      document.getElementById('vchEmailOrtu').value = '';
      document.getElementById('vchNominal').value = '';

      loadList();
    });
  }

  async function loadList() {
    const tbody  = document.getElementById('voucherListBody');
    const search = document.getElementById('vchSearch')?.value.trim() || '';
    const res = await apiCall('getVoucherList', { search });

    if (!res?.success) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Gagal memuat.</p></div></td></tr>`;
      return;
    }
    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Belum ada voucher.</p></div></td></tr>`;
      return;
    }

    const badgeMap = {
      Aktif:      'badge-green',
      Terpakai:   'badge-blue',
      Kadaluarsa: 'badge-gray',
    };

    tbody.innerHTML = res.data.map(v => `
      <tr>
        <td style="font-family:monospace;font-weight:600;font-size:12.5px">${esc(v.kode)}</td>
        <td>
          <div style="font-weight:600">${esc(v.namaMurid)}</div>
          <div style="font-size:11px;color:var(--muted)">${esc(v.emailOrtu)}</div>
        </td>
        <td>Rp ${Math.round(v.nominal).toLocaleString('id-ID')}</td>
        <td><span class="badge ${badgeMap[v.status] || 'badge-gray'}">${esc(v.status)}</span></td>
        <td style="font-size:12px;color:var(--muted)">${v.tanggalExpired ? new Date(v.tanggalExpired).toLocaleDateString('id-ID') : '—'}</td>
        <td style="font-family:monospace;font-size:11.5px;color:var(--muted)">${v.idTransaksi ? esc(v.idTransaksi) : '—'}</td>
      </tr>
    `).join('');
  }

  return { mount, loadList };
})();

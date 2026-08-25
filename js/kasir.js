// ============================================================
// kasir.js — Halaman Kasir: scan barcode, keranjang, cetak struk
// Support barcode scanner USB (input otomatis via keyboard event)
// Thermal printer via window.print() dengan CSS khusus
// ============================================================

const KasirPage = (() => {
  // Escape untuk nilai yang masuk innerHTML (nama item = input manusia).
  const escK = s => String(s === null || s === undefined ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');


  let _cart        = [];   // item di keranjang
  let _lastTxId    = null; // ID transaksi terakhir
  let _activeResId = null; // ID reservasi yang sedang diproses
  let _lastCartSnap= [];   // snapshot cart saat transaksi (untuk reprint)
  let _scanBuffer  = '';   // buffer untuk barcode scanner
  let _scanTimer   = null;
  // Voucher yang SUDAH tervalidasi lewat tombol "Cek" (bukan sekadar
  // teks yang diketik). null = tidak ada voucher diterapkan. Diskon
  // aktual dihitung ULANG tiap render dari _cart terkini (bukan
  // disimpan statis) supaya kalau kasir tambah/kurangi item setelah
  // cek voucher, batas "diskon tidak melebihi total" tetap benar.
  let _voucherApplied = null; // { kode, namaMurid, nominal }

  // ── Mount halaman kasir ──
// Di dalam KasirPage
  function mount() {
    const page = document.getElementById('page-kasir');
    page.innerHTML = `
      <style>
        /* @page HARUS di level atas (bukan di dalam @media print) — kalau
           di-nesting, sebagian browser mengabaikannya sehingga header
           (tanggal) & footer (URL) bawaan browser tetap muncul. margin:0
           menghilangkan header/footer itu. size 80mm auto = lebar tetap,
           tinggi mengikuti isi (struk panjang tidak terpotong). */
        @page { margin: 0 !important; size: 80mm auto !important; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          /* strutPreview ter-nesting dalam layout, jadi pakai teknik
             visibility (sembunyikan semua, tampilkan struk & anaknya). */
          body * { visibility: hidden !important; }
          #strutPreview, #strutPreview * { visibility: visible !important; }
          /* position: static (bukan fixed) supaya tinggi struk mengalir
             natural & tidak terpotong di tengah saat isinya panjang.
             absolute di 0,0 memindah struk ke pojok kiri-atas kertas. */
          #strutPreview { position: absolute !important; left: 0 !important; top: 0 !important; width: 80mm !important; font-size: 15px !important; font-weight: 700 !important; line-height: 1.5 !important; font-family: 'Courier New', monospace !important; color: #000 !important; background: #fff !important; padding: 2mm !important; margin: 0 !important; letter-spacing: 0 !important; }
        }
        .kasir-layout { display: grid; grid-template-columns: 1fr 340px; gap: 18px; align-items: start; }
        .cart-table th { font-size: 11px; }
        .cart-table td { padding: 10px 14px; }
        .qty-ctrl { display: flex; align-items: center; gap: 6px; }
        .qty-btn { width: 26px; height: 26px; border: 1px solid var(--border); background: #fff; border-radius: 6px; cursor: pointer; font-size: 15px; line-height: 1; }
        .strut-preview { font-family: 'Courier New', monospace; font-size: 14px; font-weight: 700; line-height: 1.5; white-space: pre-wrap; background: #fff; padding: 16px; margin-bottom: 16px; color: #000; }

        /* ── Rapi ulang: label baris form konsisten di seluruh halaman
             kasir, dulu campur (kadang label ada kadang tidak, ukuran
             font beda-beda per blok). Satu pola dipakai di semua kartu. ── */
        .kasir-card { margin-bottom: 16px; }
        .kasir-card-head {
          padding: 13px 20px; border-bottom: 1px solid var(--border);
          font-size: 12.5px; font-weight: 700; font-family: 'DM Sans', sans-serif;
          color: var(--text); display:flex; align-items:center; justify-content:space-between; gap:10px;
        }
        .kasir-card-body { padding: 16px 20px; }
        .kasir-field { margin-bottom: 12px; }
        .kasir-field:last-child { margin-bottom: 0; }
        .kasir-field label {
          display: block; font-size: 11px; font-weight: 600; color: var(--muted);
          text-transform: uppercase; letter-spacing: .4px; margin-bottom: 6px;
        }
        .kasir-field input, .kasir-field select {
          width: 100%; border: 1.5px solid var(--border); border-radius: 8px;
          padding: 9px 12px; font-size: 13.5px; font-family: 'Inter', sans-serif; outline: none;
          background: #fff; transition: border-color .15s;
        }
        .kasir-field input:focus, .kasir-field select:focus { border-color: var(--primary); }
        .kasir-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .kasir-divider {
          margin: 4px -20px 14px; padding: 0 20px 0; border-top: 1px dashed var(--border);
        }
        .kasir-hint { font-size: 11px; color: var(--muted); margin-top: 5px; line-height: 1.5; }
        .kasir-required::after { content: ' *'; color: var(--danger); }

        /* ── Responsive kasir ── */
        @media (max-width: 1100px) {
          .kasir-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 620px) {
          .kasir-layout { gap: 14px; }
          .kasir-row2 { grid-template-columns: 1fr !important; }
          .cart-table td { padding: 9px 10px; }
          .qty-btn { width: 30px; height: 30px; }
        }
      </style>

      <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div>
          <h1>Kasir & Penjualan</h1>
          <p>Scan barcode, muat reservasi, atau tambah item manual.</p>
        </div>
        <div style="display:flex; gap:10px;">
            <button class="btn btn-outline" onclick="KasirPage.showHistory()">🕒 History & Reprint</button>
            <div id="scannerStatus" class="badge-scanner" style="background:#DCFCE7; padding:8px 12px; border-radius:20px; font-size:12px; font-weight:bold; color:#166534;">✓ Scanner Aktif</div>
        </div>
      </div>

      <div class="kasir-layout">
        <div>
          <!-- ══ KARTU 1: Reservasi & Info Pembeli (opsional, ringkas) ══ -->
          <div class="section-card kasir-card">
            <div class="kasir-card-head">Reservasi & Info Pembeli <span style="font-weight:400;color:var(--muted);font-size:11px">(opsional)</span></div>
            <div class="kasir-card-body">
              <!-- KEPUTUSAN (item roadmap "perlu keputusan"): input ini untuk
                   KODE RESERVASI (RES-xxxx). Backend hanya punya endpoint
                   loadReservasiKeKasir; alur PO ke kasir tidak ada di backend,
                   jadi label "Generate dari PO" yang lama menyesatkan.
                   Dulu juga: tombol ini TIDAK punya handler sama sekali, dan
                   _doLoadReservasi() mencari elemen resInput/btnLoadRes yang
                   tidak pernah ada di HTML — fitur muat-reservasi mati total.
                   Sekarang id-nya disamakan dengan yang dicari kodenya. -->
              <div style="display:flex; gap:8px; margin-bottom:10px;">
                <input id="resInput" type="text" placeholder="Kode Reservasi (Cth: RES-0001)"
                  autocomplete="off" autocapitalize="characters" spellcheck="false"
                  style="flex:1; border:1.5px solid var(--border); border-radius:7px; padding:8px 12px; text-transform:uppercase; font-size:13.5px;">
                <button class="btn btn-outline btn-sm" id="btnLoadRes">Muat</button>
              </div>
              <div id="resTag" style="display:none;background:#DCFCE7;color:#166534;font-size:12.5px;font-weight:600;padding:7px 12px;border-radius:7px;margin-bottom:12px"></div>

              <div class="kasir-row2" style="margin-bottom:10px">
                <input id="custNama" type="text" placeholder="Nama Orang Tua / Pembeli"
                  style="border:1.5px solid var(--border);border-radius:7px;padding:8px 12px;font-size:13px;outline:none"/>
                <input id="custNamaMurid" type="text" placeholder="Nama Murid / Siswa"
                  style="border:1.5px solid var(--border);border-radius:7px;padding:8px 12px;font-size:13px;outline:none"/>
              </div>
              <div class="kasir-row2">
                <input id="custEmail" type="email" placeholder="Email (untuk kirim resi)"
                  style="border:1.5px solid var(--border);border-radius:7px;padding:8px 12px;font-size:13px;outline:none"
                  oninput="KasirPage._onCustEmailInput(this.value)"/>
                <input id="custPhone" type="text" placeholder="No. HP"
                  style="border:1.5px solid var(--border);border-radius:7px;padding:8px 12px;font-size:13px;outline:none"/>
              </div>
              <label id="wrapKirimFaktur" style="display:none;align-items:center;gap:6px;margin-top:10px;font-size:12.5px;color:var(--muted);cursor:pointer">
                <input type="checkbox" id="kirimFakturEmail" checked> Kirim faktur (bukti pembelian) ke email di atas
              </label>
            </div>
          </div>

          <!-- ══ KARTU 2: Tambah Item — scan ATAU cari manual ══ -->
          <div class="section-card kasir-card">
            <div class="kasir-card-head">Tambah Item</div>
            <div class="kasir-card-body">
              <div style="display: flex; gap: 8px; margin-bottom: 4px;">
                <input id="barcodeInput" type="text" placeholder="Scan atau ketik barcode..." style="flex: 1; border: 1.5px solid var(--border); border-radius: 8px; padding: 10px 14px; font-family: monospace; font-size:13.5px;" autocomplete="off"/>
                <button class="btn btn-primary" id="btnScan">Cari</button>
              </div>
              <div id="scanResult" style="margin-top:8px"></div>

              <div class="kasir-divider" style="margin-top:16px">
                <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;padding-top:14px;margin-bottom:8px">atau cari manual (tanpa barcode)</div>
              </div>

              <div style="position:relative;margin-bottom:8px">
                <input id="manualNama" type="text" placeholder="🔍 Cari nama item..."
                  style="width:100%;border:1.5px solid var(--border);border-radius:7px;padding:8px 12px;font-size:13.5px;font-family:'Inter',sans-serif;outline:none"
                  oninput="KasirPage._manualAutocomplete(this.value)"
                  autocomplete="off"/>
                <div id="manualDrop" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.12);z-index:50;max-height:220px;overflow-y:auto"></div>
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                <input id="manualHarga" type="text" placeholder="Harga otomatis" readonly
                  title="Harga diambil otomatis dari database saat item dipilih"
                  style="flex:1;border:1.5px solid var(--border);border-radius:7px;padding:8px 10px;font-size:13px;font-family:'Inter',sans-serif;outline:none;background:#F3F4F6;color:var(--text);cursor:not-allowed"/>
                <input id="manualQty" type="number" placeholder="Qty" min="1" value="1"
                  style="width:72px;border:1.5px solid var(--border);border-radius:7px;padding:8px 10px;font-size:13px;font-family:'Inter',sans-serif;outline:none"/>
                <button class="btn btn-primary btn-sm" onclick="KasirPage._addManual()">+ Tambah</button>
              </div>
              <div class="kasir-hint" style="margin-top:6px">Harga terisi otomatis dari database begitu item dipilih — tidak perlu ketik manual.</div>
            </div>
          </div>

          <!-- ══ KARTU 3: Keranjang ══ -->
          <div class="section-card kasir-card" style="margin-bottom:0">
            <div class="kasir-card-head">
              Keranjang
              <button class="btn btn-outline btn-sm" id="btnClearCart">🗑 Kosongkan</button>
            </div>
            <div class="table-wrap">
              <table class="cart-table">
                <thead><tr><th>Item</th><th>Qty</th><th>Harga</th><th>Subtotal</th><th></th></tr></thead>
                <tbody id="cartBody">
                  <tr><td colspan="5"><div class="empty-state" style="padding:24px"><p>Belum ada item.</p></div></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <!-- ══ KARTU: Ringkasan & Pembayaran ══ -->
          <div class="section-card kasir-card">
            <div class="kasir-card-head">Ringkasan & Pembayaran</div>
            <div class="kasir-card-body">

              <!-- Total — subtotal + diskon voucher tampil begitu voucher
                   berhasil dicek, biar kasir & pembeli lihat angka yang
                   sama sebelum tombol Proses ditekan. -->
              <div id="subtotalRow" style="display:none;justify-content:space-between;font-size:13px;color:var(--muted);margin-bottom:4px">
                <span>Subtotal</span><span id="subtotalEl">Rp 0</span>
              </div>
              <div id="diskonVoucherRow" style="display:none;justify-content:space-between;font-size:13px;color:#16A34A;margin-bottom:4px">
                <span>Voucher <span id="diskonVoucherKode" style="font-family:monospace"></span></span><span id="diskonVoucherEl">− Rp 0</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:20px; font-weight:700; color:var(--primary); margin-bottom:16px; padding-top:6px; border-top:1px solid var(--border)">
                <span>Total</span><span id="totalEl">Rp 0</span>
              </div>

              <!-- JENJANG PEMBELI — dipilih SEKALI per transaksi (satu nota
                   = satu pembeli = satu anak = satu jenjang), bukan per item.
                   Ini yang mengisi DETAIL_TRANSACTION.ID_JENJANG — tanpa ini
                   laporan setoran harian tidak bisa dikelompokkan per jenjang
                   sama sekali (lihat catatan di TransaksiHandler.gs). WAJIB
                   diisi sebelum transaksi bisa diproses. -->
              <div class="kasir-field">
                <label class="kasir-required">Jenjang Pembeli</label>
                <select id="jenjangSelect">
                  <option value="">— Pilih jenjang —</option>
                </select>
              </div>

              <!-- ══ VOUCHER ══
                   Kode + nama murid dicek dulu via validateVoucher (preview,
                   read-only) sebelum submit — supaya kasir & pembeli lihat
                   nominalnya dulu. Validasi FINAL & pemotongan status tetap
                   terjadi di server saat createTransaksi (lihat
                   TransaksiHandler.gs) — hasil cek di sini TIDAK dipercaya
                   mentah-mentah, cuma preview. Field _voucherTerverifikasi
                   di JS memastikan payload voucher CUMA terkirim kalau kasir
                   benar-benar klik "Cek" dan hasilnya valid — bukan asal
                   ngetik kode lalu langsung submit. -->
              <div class="kasir-field">
                <label>Voucher (opsional)</label>
                <div style="display:flex;gap:8px">
                  <input id="voucherKodeInput" type="text" placeholder="Kode voucher"
                    autocomplete="off" autocapitalize="characters" spellcheck="false"
                    style="flex:1;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:13.5px;text-transform:uppercase;font-family:monospace"/>
                  <button class="btn btn-outline btn-sm" id="btnCekVoucher">Cek</button>
                </div>
                <input id="voucherNamaMuridInput" type="text" placeholder="Nama murid (sesuai voucher)"
                  autocomplete="off" style="width:100%;margin-top:8px;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:13.5px"/>
                <div id="voucherStatus" style="margin-top:6px;font-size:12px"></div>
              </div>

              <div class="kasir-field">
                <label>Metode Bayar</label>
                <div style="display:flex;gap:8px">
                  <label id="labelCash" style="flex:1; padding:9px 12px; border:1.5px solid var(--primary); background:#EFF6FF; border-radius:8px; cursor:pointer; text-align:center; font-size:13.5px;">
                    <input type="radio" name="metodeBayar" value="Cash" checked onchange="KasirPage._onMetodeBayar()"> Cash
                  </label>
                  <label id="labelTransfer" style="flex:1; padding:9px 12px; border:1.5px solid var(--border); border-radius:8px; cursor:pointer; text-align:center; font-size:13.5px;">
                    <input type="radio" name="metodeBayar" value="Transfer" onchange="KasirPage._onMetodeBayar()"> Transfer
                  </label>
                </div>
              </div>

              <!-- PERBAIKAN ID: dulu wrap-nya id="uploadTransferWrap" dan
                   file-nya id="buktiTransfer", tapi kode JS mencari
                   "uploadBuktiWrap" dan "buktiFile" — jadi setelah transaksi
                   Transfer, kotak upload tidak pernah muncul dan uploadBukti()
                   selalu bilang "Pilih file dulu". ID disamakan dengan kode. -->
              <div class="kasir-field" id="uploadBuktiWrap" style="display:none; background:#F8FAFC; padding:10px; border-radius:8px; border:1px dashed var(--border);">
                <label style="margin-bottom:5px">Upload Bukti Transfer *</label>
                <input type="file" id="buktiFile" accept="image/*" style="width:100%; font-size:12px;">
                <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
                  <button class="btn btn-primary btn-sm" id="btnUploadBukti" onclick="KasirPage.uploadBukti()">⬆ Upload</button>
                  <span id="uploadStatus" style="font-size:12px;color:var(--muted)"></span>
                </div>
              </div>

              <div class="kasir-field">
                <label>Catatan (opsional)</label>
                <input type="text" id="catatanInput" placeholder="Catatan tambahan...">
              </div>

              <button class="btn btn-primary" id="btnProses" style="width:100%;padding:13px;font-size:15px;margin-top:4px">Proses Transaksi</button>
            </div>
          </div>

          <div class="section-card kasir-card" id="strutCard" style="display:none">
            <div class="kasir-card-body">
              <div id="strutPreview" class="strut-preview"></div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-outline" style="flex:1" onclick="KasirPage.cetakStruk()">🖨️ Cetak Ulang</button>
                <button class="btn btn-primary" style="flex:1" onclick="KasirPage.newTransaction()">+ Transaksi Baru</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-overlay" id="modalHistory">
        <div class="modal" style="max-width:480px;">
            <div class="modal-header">
                <h3>History Transaksi</h3>
                <button class="modal-close" onclick="document.getElementById('modalHistory').classList.remove('show')">✕</button>
            </div>
            <div class="modal-body" style="padding:0">
                <div id="historyList"></div>
            </div>
        </div>
      </div>
    `;

    _bindEvents();
    _initScannerListener();
    _loadInventoryCache(); // preload untuk autocomplete
    loadHistory();
    _loadJenjangDropdown();
  }

  // ── Muat daftar jenjang untuk dropdown "Jenjang Pembeli" ──
  async function _loadJenjangDropdown() {
    const sel = document.getElementById('jenjangSelect');
    if (!sel) return;
    const res = await apiCall('getJenjangList', {});
    if (!res?.success || !res.data?.length) {
      sel.innerHTML = '<option value="">— Belum ada data jenjang —</option>';
      return;
    }
    sel.innerHTML = '<option value="">— Pilih jenjang —</option>' +
      res.data.map(j => `<option value="${escK(j.id)}">${escK(j.nama)}</option>`).join('');
  }

  function showHistory() {
      document.getElementById('modalHistory').classList.add('show');
      loadHistory();
  }

  function _onCustEmailInput(val) {
    const wrap = document.getElementById('wrapKirimFaktur');
    if (wrap) wrap.style.display = val.trim() ? 'flex' : 'none';
  }

  function _bindEvents() {
    const safe = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
    safe('btnScan',      el => el.onclick = _doScan);
    safe('btnClearCart', el => el.onclick = _clearCart);
    safe('btnProses',    el => el.onclick = _doProses);
    safe('btnLoadRes',   el => el.onclick = _doLoadReservasi);
    safe('barcodeInput', el => el.addEventListener('keydown', e => { if (e.key === 'Enter') _doScan(); }));
    safe('resInput',     el => el.addEventListener('keydown', e => { if (e.key === 'Enter') _doLoadReservasi(); }));
    safe('btnCekVoucher', el => el.onclick = _doCekVoucher);
    safe('voucherKodeInput',      el => el.addEventListener('input', _invalidasiVoucherJikaDiedit));
    safe('voucherNamaMuridInput', el => el.addEventListener('input', _invalidasiVoucherJikaDiedit));
  }

  // ── Load dari reservasi ──
  async function _doLoadReservasi() {
    const resId = document.getElementById('resInput').value.trim().toUpperCase();
    if (!resId) { showToast('Masukkan kode reservasi.', 'error'); return; }

    const btn = document.getElementById('btnLoadRes');
    btn.disabled = true; btn.textContent = 'Memuat...';

    const res = await apiCall('loadReservasiKeKasir', { resId });

    btn.disabled = false; btn.textContent = 'Muat';

    if (!res?.success) {
      showToast(res?.message || 'Kode reservasi tidak valid.', 'error');
      return;
    }

    // Tampilkan warning stok kurang (tapi tetap lanjut)
    if (res.warnings?.length) {
      res.warnings.forEach(w => showToast(w, 'error'));
    }

    // Load item ke keranjang
    _cart = [];
    res.items.forEach(item => {
      _cart.push({
        id:      item.itemId,
        barcode: item.barcode,
        nama:    item.nama,
        harga:   parseFloat(item.sellPrice) || 0,
        qty:     item.qty,
        maxQty:  item.stokSaat,
        dariRes: true,
      });
    });

    // Simpan resId aktif
    _activeResId = resId;

    // Update UI
    document.getElementById('resInput').value = '';
    const tag = document.getElementById('resTag');
    tag.style.display = '';
    tag.textContent   = `✓ ${resId} | ${res.namaAnak} (${res.kelas})`;

    // Isi catatan otomatis
    const catatanEl = document.getElementById('catatanInput');
    if (catatanEl) catatanEl.value = `Reservasi ${resId} - ${res.namaOrtu} (${res.noHp})`;

    _renderCart();
    showToast(`Reservasi ${resId} dimuat. ${res.items.length} item ditambahkan.`, 'success');
  }

  // ── Update style metode bayar saat berubah ──
  function _onMetodeBayar() {
    const cash     = document.querySelector('input[name="metodeBayar"][value="Cash"]');
    const lCash    = document.getElementById('labelCash');
    const lTransfer= document.getElementById('labelTransfer');
    if (!cash || !lCash || !lTransfer) return;
    const isCash   = cash.checked;
    lCash.style.borderColor     = isCash ? 'var(--primary)' : 'var(--border)';
    lCash.style.background      = isCash ? '#EFF6FF' : '';
    lTransfer.style.borderColor = !isCash ? 'var(--primary)' : 'var(--border)';
    lTransfer.style.background  = !isCash ? '#EFF6FF' : '';
  }

  // ── Barcode scanner listener (USB scanner = keyboard burst) ──
  let _scannerBound = false;
  function _initScannerListener() {
    // Jangan daftar dua kali kalau mount() dipanggil ulang.
    if (!_scannerBound) {
      document.addEventListener('keydown', _handleScannerKey);
      _scannerBound = true;
    }
    const badge = document.getElementById('scannerStatus');
    if (badge) badge.className = 'badge-scanner';
  }

  function _handleScannerKey(e) {
    // PERBAIKAN: listener ini nempel di document dan tidak pernah dilepas —
    // dulu scan (atau ketikan cepat + Enter) di HALAMAN LAIN tetap
    // memasukkan item ke keranjang kasir diam-diam. Sekarang hanya aktif
    // saat halaman kasir yang sedang tampil.
    const pageKasir = document.getElementById('page-kasir');
    if (!pageKasir || !pageKasir.classList.contains('active')) return;

    // Kalau fokus di input manual, jangan intercept
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

    // Barcode scanner kirim karakter cepat + Enter di akhir
    if (e.key === 'Enter' && _scanBuffer.length > 2) {
      const barcode = _scanBuffer.trim();
      _scanBuffer   = '';
      clearTimeout(_scanTimer);
      _processBarcode(barcode);
    } else if (e.key.length === 1) {
      _scanBuffer += e.key;
      clearTimeout(_scanTimer);
      // Reset buffer kalau tidak ada input 300ms (bukan scanner)
      _scanTimer = setTimeout(() => { _scanBuffer = ''; }, 300);
    }
  }

  // ── Scan manual dari input field ──
  async function _doScan() {
    const input   = document.getElementById('barcodeInput');
    const barcode = input.value.trim();
    if (!barcode) return;
    input.value = '';
    await _processBarcode(barcode);
  }

  // ── Proses barcode → cari item → tambah ke cart ──
  async function _processBarcode(barcode) {
    const resultDiv = document.getElementById('scanResult');
    resultDiv.style.display = '';
    resultDiv.innerHTML = `<span style="color:var(--muted);font-size:13px">Mencari barcode ${barcode}...</span>`;

    const res = await apiCall('getInventoryByBarcode', { barcode });

    if (!res?.success) {
      resultDiv.innerHTML = `<span style="color:var(--danger);font-size:13px">⚠ ${res?.message || 'Barcode tidak ditemukan.'}</span>`;
      setTimeout(() => { resultDiv.style.display = 'none'; }, 2500);
      return;
    }

    const items = res.data;

    if (items.length === 1) {
      // 1 item langsung — cek stok dan tambah
      const item = items[0];
      const totalQty = item.batches?.reduce((s, b) => s + b.qtySistem, 0) || 0;
      if (totalQty <= 0) {
        resultDiv.innerHTML = `<span style="color:var(--danger);font-size:13px">⚠ Stok ${escK(item.nama)} habis.</span>`;
        setTimeout(() => { resultDiv.style.display = 'none'; }, 2000);
        return;
      }
      _addToCart(item.id, item.barcode, item.nama, item.sellPrice || 0, totalQty);
      resultDiv.innerHTML = `<span style="color:var(--success);font-size:13px">✓ ${escK(item.nama)} ditambahkan.</span>`;
      setTimeout(() => { resultDiv.style.display = 'none'; }, 1500);
    } else {
      // >1 item (ada versi NP) — tampilkan pilihan.
      // PERBAIKAN: dulu nama item disuntik ke string onclick pakai trik
      // backtick — nama tertentu bisa mematahkannya. Sekarang DOM + closure.
      resultDiv.innerHTML = '<div style="font-size:12.5px;font-weight:600;margin-bottom:6px">Pilih item:</div>';
      items.forEach(item => {
        const qty = item.batches?.reduce((s,b) => s + b.qtySistem, 0) || 0;
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--bg);border-radius:7px;margin-bottom:5px';
        row.innerHTML = `<div style="flex:1">
            <div style="font-size:13.5px;font-weight:600">${escK(item.nama)}</div>
            <div style="font-size:11.5px;color:var(--muted)">${qty > 0 ? 'Tersedia' : 'Habis'}</div>
          </div>`;
        const b = document.createElement('button');
        b.className = 'btn btn-primary btn-sm';
        b.textContent = 'Pilih';
        if (qty <= 0) b.disabled = true;
        b.addEventListener('click', () =>
          _addFromResult(item.id, item.barcode, item.nama, item.sellPrice || 0, qty));
        row.appendChild(b);
        resultDiv.appendChild(row);
      });
    }
  }

  function _addFromResult(id, barcode, nama, harga, qty) {
    _addToCart(id, barcode, nama, harga, qty);
    document.getElementById('scanResult').style.display = 'none';
  }

function _addToCart(id, barcode, nama, harga, maxQty) {
    const existing = _cart.find(c => 
      (barcode && barcode !== '-' && c.barcode === barcode) || 
      (c.id === id && id !== '' && !id.startsWith('MANUAL-'))
    );
    if (existing) {
      if (existing.qty < existing.maxQty) existing.qty++;
      _renderCart();
      return;
    }
    _cart.push({ id, barcode, nama, harga: parseFloat(harga)||0, qty: 1, maxQty });
    _renderCart();
  }

  
  function _renderCart() {
    const tbody   = document.getElementById('cartBody');
    const totalEl = document.getElementById('totalEl');
    if (!tbody) return;

    if (!_cart.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:24px"><p>Belum ada item. Scan barcode untuk mulai.</p></div></td></tr>`;
      if (totalEl) totalEl.textContent = 'Rp 0';
      _renderVoucherTotals(0);
      return;
    }

    const total = _cart.reduce((s, c) => s + c.qty * c.harga, 0);
    tbody.innerHTML = _cart.map((c, i) => `
      <tr>
        <td>
          <div style="font-weight:600;font-size:13.5px">${escK(c.nama)}</div>
          <div style="font-family:monospace;font-size:11px;color:var(--muted)">${escK(c.barcode)}</div>
        </td>
        <td>
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="KasirPage._changeQty(${i},-1)">−</button>
            <span style="font-weight:600;min-width:22px;text-align:center">${c.qty}</span>
            <button class="qty-btn" onclick="KasirPage._changeQty(${i},1)">+</button>
          </div>
          ${c.qty >= c.maxQty ? `<div style="font-size:10.5px;color:var(--danger)">Maks stok</div>` : ''}
        </td>
        <td>Rp ${c.harga.toLocaleString('id-ID')}</td>
        <td><strong>Rp ${(c.qty*c.harga).toLocaleString('id-ID')}</strong></td>
        <td>
          <button onclick="KasirPage._removeCart(${i})" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:16px;padding:2px 6px;border-radius:4px" title="Hapus">✕</button>
        </td>
      </tr>`).join('');

    _renderVoucherTotals(total);
  }

  // ── Tampilkan subtotal / diskon voucher / total akhir ──
  // Diskon dihitung ULANG di sini (Math.min nominal vs subtotal
  // terkini) — kalau kasir ubah keranjang setelah cek voucher, batas
  // "diskon tidak boleh melebihi total" otomatis ikut ter-update tanpa
  // kasir perlu klik Cek lagi.
  function _renderVoucherTotals(subtotal) {
    const totalEl    = document.getElementById('totalEl');
    const subRow     = document.getElementById('subtotalRow');
    const subEl      = document.getElementById('subtotalEl');
    const diskonRow  = document.getElementById('diskonVoucherRow');
    const diskonEl   = document.getElementById('diskonVoucherEl');
    const diskonKode = document.getElementById('diskonVoucherKode');

    if (!_voucherApplied) {
      if (subRow) subRow.style.display = 'none';
      if (diskonRow) diskonRow.style.display = 'none';
      if (totalEl) totalEl.textContent = 'Rp ' + subtotal.toLocaleString('id-ID');
      return;
    }

    const diskon = Math.min(_voucherApplied.nominal, subtotal);
    if (subRow)  { subRow.style.display = 'flex'; if (subEl) subEl.textContent = 'Rp ' + subtotal.toLocaleString('id-ID'); }
    if (diskonRow) {
      diskonRow.style.display = 'flex';
      if (diskonEl) diskonEl.textContent = '− Rp ' + diskon.toLocaleString('id-ID');
      if (diskonKode) diskonKode.textContent = _voucherApplied.kode;
    }
    if (totalEl) totalEl.textContent = 'Rp ' + (subtotal - diskon).toLocaleString('id-ID');
  }

  // ── Cek voucher (preview) — TIDAK mengklaim apapun di server.
  // Validasi final baru terjadi saat submit (createTransaksi). ──
  async function _doCekVoucher() {
    const kode = document.getElementById('voucherKodeInput')?.value.trim();
    const nama = document.getElementById('voucherNamaMuridInput')?.value.trim();
    const statusEl = document.getElementById('voucherStatus');

    if (!kode || !nama) {
      statusEl.innerHTML = '<span style="color:var(--danger)">Isi kode dan nama murid dulu.</span>';
      return;
    }

    const btn = document.getElementById('btnCekVoucher');
    await _sekaliVoucher(btn, 'Mengecek...', async () => {
      const res = await apiCall('validateVoucher', { kode, namaMurid: nama });
      if (!res?.success) {
        _voucherApplied = null;
        statusEl.innerHTML = `<span style="color:var(--danger)">✗ ${escK(res?.message || 'Voucher tidak valid.')}</span>`;
        _renderCart();
        return;
      }
      _voucherApplied = { kode: res.data.kode, namaMurid: res.data.namaMurid, nominal: res.data.nominal };
      statusEl.innerHTML = `<span style="color:#16A34A">✓ Voucher valid — Rp ${res.data.nominal.toLocaleString('id-ID')} untuk ${escK(res.data.namaMurid)}</span>`;
      _renderCart();
    });
  }

  let _voucherBusy = false;
  async function _sekaliVoucher(btn, teksBusy, fn) {
    if (_voucherBusy) return;
    _voucherBusy = true;
    const teksAsli = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; if (teksBusy) btn.textContent = teksBusy; }
    try { await fn(); }
    finally { _voucherBusy = false; if (btn) { btn.disabled = false; btn.textContent = teksAsli; } }
  }

  // Edit kode/nama setelah voucher tervalidasi → batalkan status
  // "tervalidasi" itu, paksa kasir klik Cek lagi. Mencegah voucher
  // lama tetap "nempel" diterapkan padahal kasir sudah ganti kodenya.
  function _invalidasiVoucherJikaDiedit() {
    if (!_voucherApplied) return;
    _voucherApplied = null;
    const statusEl = document.getElementById('voucherStatus');
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--muted)">Kode diubah — cek ulang untuk menerapkan.</span>';
    _renderCart();
  }


  function _changeQty(idx, d) {
    const item = _cart[idx];
    const newQty = item.qty + d;
    if (newQty < 1) { _removeCart(idx); return; }
    if (newQty > item.maxQty) { showToast(`Stok ${item.nama} hanya ${item.maxQty} unit.`, 'error'); return; }
    item.qty = newQty;
    _renderCart();
  }

  function _removeCart(idx) {
    _cart.splice(idx, 1);
    _renderCart();
  }

  function _clearCart() {
    if (!_cart.length) return;
    if (!confirm('Kosongkan keranjang?')) return;
    _cart = [];
    _renderCart();
    document.getElementById('strutCard').style.display = 'none';
  }

  // ── Proses transaksi ──
  // Guard dua lapis: flag modul + tombol disabled. Lapisan ketiga ada
  // di server (_idem dari apiCall) buat kasus koneksi putus lalu retry.
  let _prosesBusy = false;
  async function _doProses() {
    if (_prosesBusy) return;
    if (!_cart.length) { showToast('Keranjang kosong.', 'error'); return; }

    // Jenjang WAJIB — tanpa ini baris transaksi tidak bisa dikelompokkan
    // di laporan setoran harian (lihat catatan di TransaksiHandler.gs).
    const jenjangId = document.getElementById('jenjangSelect')?.value || '';
    if (!jenjangId) {
      showToast('Pilih jenjang pembeli dulu sebelum memproses transaksi.', 'error');
      document.getElementById('jenjangSelect')?.focus();
      return;
    }

    // Validasi bukti transfer diingatkan di depan, bukan setelah tersimpan.
    const metodeCek = document.querySelector('input[name="metodeBayar"]:checked')?.value || 'Cash';
    if (metodeCek === 'Transfer') {
      showToast('Metode Transfer: jangan lupa upload bukti setelah transaksi tersimpan.', 'success');
    }

    _prosesBusy = true;
    const btn = document.getElementById('btnProses');
    if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }

    let res;
    try {
      const metodeBayar = document.querySelector('input[name="metodeBayar"]:checked')?.value || 'Cash';
    const emailInput   = document.getElementById('custEmail')?.value.trim()     || '';
    const kirimFaktur  = document.getElementById('kirimFakturEmail')?.checked ?? true;
    const emailResi    = (emailInput && kirimFaktur) ? emailInput : '';
    const namaPembeli  = document.getElementById('custNama')?.value.trim()       || '';
    const namaMurid    = document.getElementById('custNamaMurid')?.value.trim()  || '';
    const noHp         = document.getElementById('custPhone')?.value.trim()      || '';
    res = await apiCall('createTransaksi', {
      items:        _cart.map(c => ({ barcode: c.barcode, qty: c.qty, sellPrice: c.harga, nama: c.nama })),
      metodeBayar:  metodeBayar,
      jenjangId:    jenjangId,
      resId:        _activeResId || '',
      emailResi:    emailResi,
      namaPembeli:  namaPembeli,
      namaMurid:    namaMurid,
      noHp:         noHp,
      catatan:      document.getElementById('catatanInput')?.value.trim() || '',
      // Cuma dikirim kalau kasir SUDAH klik "Cek" dan hasilnya valid —
      // bukan sekadar ada teks di kolom kode. Validasi FINAL tetap di
      // server (TransaksiHandler.gs), ini cuma memastikan kita tidak
      // asal kirim kode yang belum pernah dicek sama sekali.
      voucherKode:       _voucherApplied ? _voucherApplied.kode : '',
      voucherNamaMurid:  _voucherApplied ? _voucherApplied.namaMurid : '',
    });
    } finally {
      // Apapun yang terjadi di atas, tombol & flag WAJIB dilepas —
      // kalau tidak, kasir macet sampai reload halaman.
      _prosesBusy = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Proses Transaksi'; }
    }

    if (!res?.success) { showToast(res?.message || 'Gagal.', 'error'); return; }

    _lastTxId    = res.txId;
    _lastCartSnap = [..._cart]; // simpan snapshot sebelum clear
    showToast(`Transaksi ${res.txId} berhasil! (${res.metodeBayar})`, 'success');
    try {
      _generateStruk(res.txId, res.metodeBayar, res.kasirName || '');
    } catch (e) {
      showToast('Transaksi tersimpan, tapi gagal menyiapkan struk: ' + e.message, 'error');
    }

    // Backend otomatis kirim email resi kalau emailResi diisi (lihat handleCreateTransaksi)
    if (emailResi) {
      showToast(res.emailSent ? 'Faktur dikirim ke ' + emailResi : 'Gagal kirim faktur: ' + (res.emailError || 'tidak diketahui'), res.emailSent ? 'success' : 'error');
    }

    // Tampilkan upload bukti kalau transfer
    const uploadWrap = document.getElementById('uploadBuktiWrap');
    if (uploadWrap) uploadWrap.style.display = res.metodeBayar === 'Transfer' ? '' : 'none';

    // Reset reservasi tag
    _activeResId = null;
    const resTag = document.getElementById('resTag');
    if (resTag) resTag.style.display = 'none';

    // Voucher SELALU direset (beda dari jenjang yang sengaja dibiarkan
    // nempel) — voucher yang baru dipakai sudah 'Terpakai' di server,
    // memakai kode yang sama lagi untuk pembeli berikutnya pasti gagal.
    _voucherApplied = null;
    const vk = document.getElementById('voucherKodeInput');
    const vn = document.getElementById('voucherNamaMuridInput');
    const vs = document.getElementById('voucherStatus');
    if (vk) vk.value = '';
    if (vn) vn.value = '';
    if (vs) vs.innerHTML = '';

    _cart = [];
    _renderCart();
    document.getElementById('catatanInput').value = '';
    const emailEl = document.getElementById('custEmail');
    if (emailEl) emailEl.value = '';
    const fakturCb = document.getElementById('kirimFakturEmail');
    if (fakturCb) fakturCb.checked = true;
    const fakturWrap = document.getElementById('wrapKirimFaktur');
    if (fakturWrap) fakturWrap.style.display = 'none';
    _resetCustomerFields();
    loadHistory();
  }

  // ── Generate & tampilkan struk ──
  function _generateStruk(txId, metodeBayar = 'Cash', kasirNama = '', custInfo = null) {
    const now       = new Date();
    const tanggal   = now.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'});
    const jam       = now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
    // NOTE: Session.getUser() adalah API server-side Apps Script, TIDAK bisa dipanggil
    // dari browser (bakal throw ReferenceError). Nama kasir harus dikirim dari backend
    // lewat response createTransaksi (mis. res.kasirNama), atau dari state login client
    // kalau app ini udah simpen currentUser di suatu global saat login.
    const kasir     = kasirNama || '—';
    const items     = _cart.length ? _cart : []; // cart masih ada saat dipanggil sebelum di-clear
    const total     = items.reduce((s,c) => s + (Number(c.qty)||0)*(Number(c.harga)||0), 0);
    // Lebar struk lebih sempit karena font sekarang besar (80mm kira-kira 28 kolom).
    const LEBAR       = 28;
    const separator   = '─'.repeat(LEBAR);
    // Rupiah dengan "Rp" sejajar di depan + angka rata kanan lebar tetap,
    // supaya digit satuan/puluhan/ratusan selalu lurus ke bawah antar
    // baris -> gampang dibaca orang lanjut usia. Lebar 9 muat "9.999.999".
    const LEBAR_ANGKA = 9;
    const fmtRp = n => 'Rp' + Number(n||0).toLocaleString('id-ID').padStart(LEBAR_ANGKA);

    const itemLines = items.map(c => {
      const nama  = c.nama != null ? String(c.nama) : '(item)';
      const qty   = Number(c.qty)   || 0;
      const harga = Number(c.harga) || 0;
      const sub   = qty * harga;
      const namaPotong = nama.substring(0, 22);
      // Baris 1: nama item, qty ditaruh menempel kanan.
      const qStr = qty + 'x';
      const barisNama = namaPotong + ' '.repeat(Math.max(1, LEBAR - namaPotong.length - qStr.length)) + qStr;
      // Baris 2: harga satuan (diawali @), angka sejajar kanan.
      const barisHarga = '  @ ' + fmtRp(harga);
      // Baris 3: subtotal, angka sejajar dengan TOTAL di bawah.
      const barisSub = 'Subtotal'.padEnd(LEBAR - LEBAR_ANGKA - 2) + fmtRp(sub);
      return barisNama + '\n' + barisHarga + '\n' + barisSub;
    }).join('\n' + '·'.repeat(LEBAR) + '\n');

    const resLine      = _activeResId ? `Reservasi : ${_activeResId}` : '';
    const namaPembeli  = custInfo?.namaPembeli ?? (document.getElementById('custNama')?.value.trim()     || '');
    const namaMurid    = custInfo?.namaMurid   ?? (document.getElementById('custNamaMurid')?.value.trim() || '');
    const custPhone    = custInfo?.noHp        ?? (document.getElementById('custPhone')?.value.trim()     || '');
    const custEmail    = custInfo?.email       ?? (document.getElementById('custEmail')?.value.trim()     || '');

    const pembeliLine  = namaPembeli ? `Pembeli  : ${namaPembeli}` : '';
    const muridLine    = namaMurid   ? `Murid    : ${namaMurid}`   : '';
    const phoneLineStr = custPhone   ? `HP       : ${custPhone}`   : '';
    const emailLineStr = custEmail   ? `Email    : ${custEmail}`   : '';

    const struk = `
BPK PENABUR SUKABUMI
Jl. R Syamsudih SH No. 60, Sukabumi
Telp.0266-22193,243696
${separator}
No: ${txId}
Tgl: ${tanggal}  Jam: ${jam}
Kasir: ${kasir}
${resLine      ? resLine      + '\n' : ''}${pembeliLine  ? pembeliLine  + '\n' : ''}${muridLine    ? muridLine    + '\n' : ''}${phoneLineStr ? phoneLineStr + '\n' : ''}${emailLineStr ? emailLineStr + '\n' : ''}${separator}
${itemLines}
${separator}
${'TOTAL'.padEnd(LEBAR - LEBAR_ANGKA - 2) + fmtRp(total)}
${'Bayar'.padEnd(LEBAR - metodeBayar.length) + metodeBayar}
${separator}
   Terima kasih atas
   kunjungan Anda!
${separator}
  Simpan struk ini
  sebagai bukti pembelian.
    `.trim();

    const preview = document.getElementById('strutPreview');
    const card    = document.getElementById('strutCard');
    if (preview) preview.textContent = struk;
    if (card) card.style.display = '';

    // Auto print setelah struk tampil
    setTimeout(() => window.print(), 400);
  }

  function cetakStruk() {
    window.print();
  }

  // ── Bersihin semua field pembeli & input bantu ──
  // Sebelumnya custPhone (No. HP) gak pernah di-clear, jadi nomor pembeli
  // sebelumnya kebawa terus ke transaksi berikutnya.
  function _resetCustomerFields() {
    ['custNama','custNamaMurid','custPhone','custEmail','poInput',
     'manualNama','manualHarga','barcodeInput','catatanInput']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    const namaEl = document.getElementById('manualNama');
    if (namaEl) { namaEl.dataset.itemId = ''; namaEl.dataset.maxQty = ''; namaEl.dataset.barcode = ''; }

    const mQty = document.getElementById('manualQty');
    if (mQty) mQty.value = '1';

    const fakturCb = document.getElementById('kirimFakturEmail');
    if (fakturCb) fakturCb.checked = true;
    const fakturWrap = document.getElementById('wrapKirimFaktur');
    if (fakturWrap) fakturWrap.style.display = 'none';
  }

  function newTransaction() {
    document.getElementById('strutCard').style.display = 'none';
    _resetCustomerFields();
    _cart = [];
    _renderCart();
    document.getElementById('barcodeInput')?.focus();
  }

  // ── Cache inventory untuk autocomplete kasir ──
  let _inventoryCache = [];
  let _kategoriMap = {};   // ID_KATEGORI -> nama, buat label autocomplete
  async function _loadInventoryCache() {
    if (_inventoryCache.length) return;
    // Ambil inventory + kategori sekaligus (paralel) — kategori dipakai
    // buat nampilin NAMA kategori di autocomplete, bukan ID mentah
    // (mis. "Atribut TK" bukan "KAT-01") supaya item yang namanya mirip
    // beda kategori gampang dibedakan.
    const [res, resKat] = await Promise.all([
      apiCall('getInventoryList', {}),
      apiCall('getKategoriList', {}),
    ]);
    if (res?.success) _inventoryCache = res.data || [];
    if (resKat?.success) {
      (resKat.data || []).forEach(k => { _kategoriMap[k.id] = k.nama; });
    }
  }

  // ── Autocomplete nama item di input manual ──
  function _manualAutocomplete(q) {
    const drop = document.getElementById('manualDrop');
    if (!drop) return;
    if (!q || q.length < 2) { drop.style.display = 'none'; return; }

    const matches = _inventoryCache
      .filter(item => item.status !== 'Nonaktif' &&
        // String() wajib: barcode buku yang panjang kebaca sebagai NUMBER
        // dari Sheets, dan number tidak punya .toLowerCase() → crash.
        // Nama pun di-String()-kan biar aman kalau ada nilai non-teks.
        ((String(item.nama||'')).toLowerCase().includes(q.toLowerCase()) ||
         (String(item.barcode||'')).toLowerCase().includes(q.toLowerCase())))
      .slice(0, 8);

    if (!matches.length) { drop.style.display = 'none'; return; }

    // PERBAIKAN: dulu tiap ketikan menambah SATU listener 'click' baru di
    // document (ketik 10 huruf = 10 listener numpuk sebelum ada yang klik).
    // Sekarang: satu listener global didaftar SEKALI, dan pilihan item
    // pakai event delegation + dataset — nama item dengan tanda kutip
    // tidak lagi mematahkan string onclick.
    drop.style.display = '';
    drop.innerHTML = '';
    matches.forEach(item => {
      const stok = item.totalQty || 0;
      const stokColor = stok === 0 ? '#D94040' : stok <= (item.minThreshold||0) ? '#E8B800' : '#16A34A';
      const row = document.createElement('div');
      row.style.cssText = 'padding:9px 14px;cursor:pointer;border-bottom:1px solid #F3F4F6;transition:background .1s';
      row.onmouseover = () => row.style.background = '#F8F9FB';
      row.onmouseout  = () => row.style.background = '';

      const kiri = document.createElement('div');
      kiri.style.cssText = 'min-width:0;flex:1';
      const n1 = document.createElement('div');
      n1.style.cssText = 'font-size:13.5px;font-weight:600';
      n1.textContent = item.nama || '';
      // Baris kedua: keterangan (mis. ukuran "S/M/L") — INI yang bikin
      // item bernama sama tapi beda varian kelihatan bedanya. Kalau
      // keterangan kosong/"-", tidak ditampilkan biar tidak ramai.
      const ket = (item.keterangan && item.keterangan !== '-') ? item.keterangan : '';
      if (ket) {
        const nKet = document.createElement('div');
        nKet.style.cssText = 'font-size:11.5px;color:var(--text);opacity:.75';
        nKet.textContent = ket;
        n1.appendChild(document.createTextNode(''));
        kiri.append(n1, nKet);
      } else {
        kiri.append(n1);
      }
      const n2 = document.createElement('div');
      n2.style.cssText = 'font-size:11px;font-family:monospace;color:var(--muted);margin-top:1px';
      // barcode + nama kategori, dipisah titik
      const katNama = _kategoriMap[item.kategori] || '';
      n2.textContent = (item.barcode || '') + (katNama ? '  ·  ' + katNama : '');
      kiri.append(n2);

      const kanan = document.createElement('div');
      kanan.style.textAlign = 'right';
      kanan.innerHTML = `<div style="font-size:13px;font-weight:700">Rp ${parseInt(item.sellPrice||0).toLocaleString('id-ID')}</div>
        <div style="font-size:11px;color:${stokColor};font-weight:600">Stok: ${stok}</div>`;

      const flex = document.createElement('div');
      flex.style.cssText = 'display:flex;justify-content:space-between;align-items:center';
      flex.append(kiri, kanan);
      row.appendChild(flex);

      row.addEventListener('click', () => {
        _selectManualItem(item.id, item.nama || '', parseFloat(item.sellPrice) || 0, stok, item.barcode || '');
      });
      drop.appendChild(row);
    });

    // Penutup dropdown: SATU listener seumur halaman, bukan numpuk.
    if (!_acCloserBound) {
      _acCloserBound = true;
      document.addEventListener('click', e => {
        const d = document.getElementById('manualDrop');
        if (d && !d.contains(e.target) && e.target.id !== 'manualNama') d.style.display = 'none';
      });
    }
  }
  let _acCloserBound = false;

  function _selectManualItem(itemId, nama, harga, maxQty, barcode) {
    const namaEl  = document.getElementById('manualNama');
    const hargaEl = document.getElementById('manualHarga');
    const drop    = document.getElementById('manualDrop');
    if (namaEl)  namaEl.value  = nama;
    // Field harga read-only & diformat dengan pemisah ribuan biar
    // enak dibaca; angka mentahnya disimpan di dataset buat dihitung.
    if (hargaEl) {
      hargaEl.value = 'Rp ' + (parseFloat(harga) || 0).toLocaleString('id-ID');
      hargaEl.dataset.raw = String(parseFloat(harga) || 0);
    }
    if (drop)    drop.style.display = 'none';
    // Simpan item id + barcode asli untuk referensi (dipakai buat merge qty)
    if (namaEl)  namaEl.dataset.itemId  = itemId;
    if (namaEl)  namaEl.dataset.maxQty  = maxQty;
    if (namaEl)  namaEl.dataset.barcode = barcode || '';
    document.getElementById('manualQty')?.focus();
  }

  // ── Tambah item manual ke keranjang ──
  function _addManual() {
    const namaEl  = document.getElementById('manualNama');
    const nama    = namaEl?.value.trim();
    const hargaEl = document.getElementById('manualHarga');
    const harga   = parseFloat(hargaEl?.dataset.raw || '0');
    const qty     = parseInt(document.getElementById('manualQty')?.value || '1');
    const maxQty  = parseInt(namaEl?.dataset.maxQty || '9999');
    const itemId  = namaEl?.dataset.itemId || '';
    const barcode = namaEl?.dataset.barcode || '-';

    if (!nama)  { showToast('Nama item wajib diisi.', 'error'); return; }
    // Harga read-only, keisi otomatis dari database. Kalau kosong,
    // artinya kasir ngetik nama tapi TIDAK memilih item dari daftar —
    // tolak, jangan biarkan item "hantu" tanpa harga masuk keranjang.
    if (!itemId || harga <= 0) {
      showToast('Pilih item dari daftar yang muncul supaya harganya otomatis terisi.', 'error');
      return;
    }
    if (qty < 1){ showToast('Qty minimal 1.', 'error'); return; }
    if (qty > maxQty && maxQty < 9999) {
      showToast('Stok tersedia hanya ' + maxQty + ' unit.', 'error'); return;
    }

    // Cek item yang sama udah ada di cart (by itemId, atau by barcode kalau bukan '-')
    // — sebelumnya di sini selalu push row baru, makanya barcode sama jadi dobel baris
    // alih-alih nambah qty seperti waktu scan.
    const existing = _cart.find(c =>
      (itemId && c.id === itemId) ||
      (barcode !== '-' && c.barcode === barcode)
    );

    if (existing) {
      const newQty = existing.qty + qty;
      if (newQty > existing.maxQty && existing.maxQty < 9999) {
        showToast('Stok ' + existing.nama + ' hanya ' + existing.maxQty + ' unit.', 'error');
      } else {
        existing.qty = newQty;
        _renderCart();
        showToast(nama + ' ditambah ke item yang sudah ada.', 'success');
      }
    } else {
      _cart.push({
        id:     itemId || 'MANUAL-'+Date.now(),
        barcode: barcode,
        nama, harga, qty,
        maxQty: maxQty,
      });
      _renderCart();
      showToast(nama + ' ditambahkan ke keranjang.', 'success');
    }

    if (namaEl)  { namaEl.value = ''; namaEl.dataset.itemId = ''; namaEl.dataset.maxQty = ''; namaEl.dataset.barcode = ''; }
    const hEl = document.getElementById('manualHarga');
    if (hEl) { hEl.value = ''; hEl.dataset.raw = ''; }
    document.getElementById('manualQty').value   = '1';
    document.getElementById('manualDrop').style.display = 'none';
  }

  // ── Upload bukti transfer ──
  async function uploadBukti() {
    const file = document.getElementById('buktiFile')?.files[0];
    if (!file) { showToast('Pilih file gambar dulu.', 'error'); return; }
    if (!_lastTxId)  { showToast('Tidak ada transaksi aktif.', 'error'); return; }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) { showToast('Ukuran file maksimal 5MB.', 'error'); return; }

    const statusEl = document.getElementById('uploadStatus');
    const btn      = document.getElementById('btnUploadBukti');
    statusEl.textContent = 'Mengupload...';
    btn.disabled = true;

    // Convert ke base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await apiCall('uploadBuktiTransfer', {
      txId:      _lastTxId,
      fileBase64: base64,
      mimeType:   file.type,
      fileName:   file.name,
    });

    btn.disabled = false;
    if (res?.success) {
      statusEl.innerHTML = `<span style="color:var(--success)">✓ Berhasil diupload! <a href="${res.fileUrl}" target="_blank" style="color:var(--primary)">Lihat</a></span>`;
      showToast('Bukti transfer berhasil diupload.', 'success');
    } else {
      statusEl.innerHTML = `<span style="color:var(--danger)">✗ ${res?.message || 'Gagal upload.'}</span>`;
      showToast(res?.message || 'Gagal upload.', 'error');
    }
  }

  // ── Load history transaksi hari ini ──
  async function loadHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;

    list.innerHTML = '<div class="empty-state" style="padding:20px"><p style="font-size:13px">Memuat...</p></div>';

    let res;
    try {
      res = await apiCall('getTransaksiList', {});
    } catch (e) {
      list.innerHTML = '<div class="empty-state" style="padding:20px"><p style="font-size:13px">Gagal memuat history. Cek koneksi lalu buka lagi.</p></div>';
      return;
    }

    if (!res?.success || !res.data?.length) {
      list.innerHTML = '<div class="empty-state" style="padding:20px"><p style="font-size:13px">Belum ada transaksi.</p></div>';
      return;
    }

    const recent = res.data.slice(0, 15); // 15 transaksi terakhir
    list.innerHTML = recent.map(t => `
      <div onclick="KasirPage.showOrderDetail('${t.id}')"
        style="padding:10px 16px;border-bottom:1px solid #F3F4F6;cursor:pointer;transition:background .1s"
        onmouseover="this.style.background='#F8F9FB'" onmouseout="this.style.background=''">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-family:monospace;font-size:12.5px;font-weight:600;color:var(--primary)">${t.id}</div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:2px">${t.itemCount} item · ${new Date(t.tanggal).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:13px;font-weight:700">Rp ${parseInt(t.total).toLocaleString('id-ID')}</div>
          </div>
        </div>
      </div>`).join('');
  }

  // ── Detail order + reprint ──
  async function showOrderDetail(txId) {
    let res;
    try {
      res = await apiCall('getTransaksiDetail', { txId });
    } catch (e) {
      showToast('Gagal memuat detail. Cek koneksi.', 'error');
      return;
    }
    if (!res?.success) { showToast(res?.message || 'Gagal memuat detail.', 'error'); return; }

    const d = res.data;
    const existing = document.getElementById('modalOrderDetail');
    if (existing) existing.remove();

    const m = document.createElement('div');
    m.className = 'modal-overlay show';
    m.id = 'modalOrderDetail';
    m.innerHTML = `
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <h3>Detail Order ${txId}</h3>
          <button class="modal-close" onclick="document.getElementById('modalOrderDetail').remove()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:20px;margin-bottom:16px;font-size:13px;flex-wrap:wrap">
            <div><span style="color:var(--muted)">Tanggal: </span>${new Date(d.tanggal).toLocaleString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
            <div><span style="color:var(--muted)">Total: </span><strong>Rp ${parseInt(d.total).toLocaleString('id-ID')}</strong></div>
          </div>
          <div class="table-wrap" style="margin-bottom:16px">
            <table style="width:100%;border-collapse:collapse;font-size:13.5px">
              <thead><tr style="background:#FAFBFC">
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:var(--muted);font-weight:600">Item</th>
                <th style="padding:8px 12px;text-align:center;font-size:11px;color:var(--muted);font-weight:600">Qty</th>
                <th style="padding:8px 12px;text-align:right;font-size:11px;color:var(--muted);font-weight:600">Subtotal</th>
              </tr></thead>
              <tbody>
                ${d.items.map(i => `<tr style="border-top:1px solid #F3F4F6">
                  <td style="padding:9px 12px">${escK(i.nama)}</td>
                  <td style="padding:9px 12px;text-align:center">${i.qty}</td>
                  <td style="padding:9px 12px;text-align:right">Rp ${parseInt(i.subtotal).toLocaleString('id-ID')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <!-- Alasan reprint -->
          <div id="reprintWrap" style="display:none;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:14px">
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:#92400E">Alasan Cetak Ulang *</div>
            <input type="text" id="reprintAlasan" placeholder="Contoh: Struk pertama rusak/hilang"
              style="width:100%;border:1.5px solid #FED7AA;border-radius:7px;padding:8px 12px;font-size:13.5px;font-family:'Inter',sans-serif;outline:none"/>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalOrderDetail').remove()">Tutup</button>
          <button class="btn btn-primary" id="btnReprint">🖨️ Cetak Ulang</button>
        </div>
      </div>`;
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);

    // Tampilkan form alasan saat tombol reprint diklik, baru proses reprint di klik kedua
    const btnReprint = document.getElementById('btnReprint');
    btnReprint.onclick = async () => {
      const wrap   = document.getElementById('reprintWrap');
      const alasan = document.getElementById('reprintAlasan')?.value.trim();
      if (wrap.style.display === 'none') {
        wrap.style.display = '';
        btnReprint.textContent = '✅ Konfirmasi & Cetak';
        document.getElementById('reprintAlasan').focus();
      } else {
        if (!alasan) { showToast('Isi alasan cetak ulang dulu.', 'error'); return; }
        btnReprint.disabled = true;
        btnReprint.textContent = 'Memproses...';
        await _doReprint(txId, alasan, d);
        btnReprint.disabled = false;
        btnReprint.textContent = '🖨️ Cetak Ulang';
      }
    };
    document.getElementById('reprintAlasan')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); btnReprint.click(); }
    });
  }

  async function _doReprint(txId, alasan, txData) {
    if (!alasan) return;
    try {
      const logRes = await apiCall('logReprint', { txId, alasan });
      if (!logRes?.success) {
        showToast(logRes?.message || 'Gagal mencatat log reprint.', 'error');
        return;
      }
    } catch (e) {
      showToast('Gagal mencatat log reprint. Cek koneksi.', 'error');
      return;
    }
    // Tutup modal
    document.getElementById('modalOrderDetail')?.remove();
    // Generate dan cetak struk
    if (txData) {
      try {
        // Reconstruct cart-like untuk _generateStruk
        const fakeCart = txData.items.map(i => ({
          nama: i.nama, barcode: i.barcode || '', harga: i.sellPrice, qty: i.qty
        }));
        const oldCart = _cart;
        _cart = fakeCart;
        _generateStruk(txId, txData.metodeBayar || 'Cash', txData.kasirName || '', {
          namaPembeli: txData.namaPembeli || '',
          namaMurid:   txData.namaMurid   || '',
          noHp:        txData.noHp        || '',
          email:       '', // email gak disimpan di header transaksi, sengaja dikosongin saat reprint
        });
        _cart = oldCart;
        showToast('Struk dicetak ulang. Alasan: ' + alasan, 'success');
      } catch (e) {
        showToast('Gagal menyiapkan struk: ' + e.message, 'error');
      }
    }
  }

  return { mount, _addFromResult, _changeQty, _removeCart, cetakStruk, newTransaction, uploadBukti, loadHistory, showOrderDetail, _doReprint, _addManual, _selectManualItem, _manualAutocomplete, showHistory, _onMetodeBayar, _onCustEmailInput };
})();

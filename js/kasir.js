// ============================================================
// kasir.js — Halaman Kasir: scan barcode, keranjang, cetak struk
// Support barcode scanner USB (input otomatis via keyboard event)
// Thermal printer via window.print() dengan CSS khusus
// ============================================================

const KasirPage = (() => {

  let _cart        = [];   // item di keranjang
  let _lastTxId    = null; // ID transaksi terakhir
  let _activeResId = null; // ID reservasi yang sedang diproses
  let _scanBuffer  = '';   // buffer untuk barcode scanner
  let _scanTimer   = null;

  // ── Mount halaman kasir ──
  function mount() {
    const page = document.getElementById('page-kasir');
    page.innerHTML = `
      <style>
        /* ── Thermal print CSS ── */
        @media print {
          body * { visibility: hidden !important; }
          #strutPreview, #strutPreview * { visibility: visible !important; }
          #strutPreview {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 80mm !important;
            font-size: 11px !important;
            font-family: monospace !important;
            color: #000 !important;
            background: #fff !important;
            padding: 4mm !important;
          }
        }
        .kasir-layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
        @media(max-width:768px) { .kasir-layout { grid-template-columns: 1fr; } }
        .scan-input-bar { display: flex; gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--border); }
        .scan-input { flex: 1; border: 1.5px solid var(--border); border-radius: 8px; padding: 10px 14px; font-size: 15px; font-family: monospace; outline: none; transition: border-color .15s; }
        .scan-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(26,63,170,.1); }
        .cart-table th { font-size: 11px; }
        .cart-table td { padding: 10px 14px; }
        .qty-ctrl { display: flex; align-items: center; gap: 6px; }
        .qty-btn { width: 26px; height: 26px; border: 1px solid var(--border); border-radius: 5px; background: none; cursor: pointer; font-size: 14px; transition: background .1s; }
        .qty-btn:hover { background: var(--bg); }
        .total-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 14px; }
        .total-row.grand { font-family: 'DM Sans', sans-serif; font-size: 20px; font-weight: 700; color: var(--primary); margin-top: 8px; }
        .strut-preview { font-family: monospace; font-size: 11.5px; line-height: 1.6; white-space: pre-wrap; background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .strut-preview hr { border: none; border-top: 1px dashed #ccc; margin: 6px 0; }
        .badge-scanner { display: inline-flex; align-items: center; gap: 6px; background: #DCFCE7; color: #166534; border-radius: 20px; font-size: 12px; font-weight: 600; padding: 4px 12px; }
        .badge-scanner.off { background: #FEE2E2; color: #991B1B; }
      </style>

      <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div>
          <h1>Kasir</h1>
          <p>Scan barcode atau ketik kode item untuk tambah ke keranjang.</p>
        </div>
        <div id="scannerStatus" class="badge-scanner">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
          Scanner Aktif
        </div>
      </div>

      <div class="kasir-layout">

        <!-- Kiri: input + keranjang -->
        <div>
          <div class="section-card" style="margin-bottom:16px">
            <!-- Input Kode Reservasi -->
            <div style="padding:12px 20px;background:#F0F6FF;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <span style="font-size:12px;font-weight:600;color:var(--primary);white-space:nowrap">📋 Kode Reservasi:</span>
              <input id="resInput" type="text" placeholder="Contoh: RES-0001"
                style="flex:1;min-width:140px;border:1.5px solid #BFDBFE;border-radius:7px;padding:7px 11px;font-size:13.5px;font-family:monospace;text-transform:uppercase;outline:none;background:#fff"
                autocapitalize="characters" autocomplete="off"/>
              <button class="btn btn-primary btn-sm" id="btnLoadRes">Muat Reservasi</button>
              <div id="resTag" style="display:none;background:#DCFCE7;color:#166534;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px"></div>
            </div>

            <!-- Scan barcode -->
            <div class="scan-input-bar">
              <input id="barcodeInput" class="scan-input" type="text"
                placeholder="Scan barcode atau ketik kode item..."
                autocomplete="off" autocapitalize="none" spellcheck="false"/>
              <button class="btn btn-primary" id="btnScan">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M16 16h5v5"/><path d="M16 21h5"/><path d="M21 16v5"/></svg>
                Cari
              </button>
            </div>
            <div id="scanResult" style="padding:0 20px 12px;display:none"></div>
          </div>

          <!-- Keranjang -->
          <div class="section-card">
            <div class="section-head">
              <h2>Keranjang</h2>
              <button class="btn btn-outline btn-sm" id="btnClearCart">Kosongkan</button>
            </div>
            <div class="table-wrap">
              <table class="cart-table">
                <thead><tr><th>Item</th><th>Qty</th><th>Harga</th><th>Subtotal</th><th></th></tr></thead>
                <tbody id="cartBody">
                  <tr><td colspan="5"><div class="empty-state" style="padding:24px"><p>Belum ada item. Scan barcode untuk mulai.</p></div></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Kanan: ringkasan & bayar -->
        <div>
          <div class="section-card" style="margin-bottom:16px">
            <div class="section-head"><h2>Total</h2></div>
            <div style="padding:16px 20px">
              <div class="total-row"><span style="color:var(--muted)">Subtotal</span><span id="subtotalEl">Rp 0</span></div>
              <div class="total-row grand" style="border-top:1px solid var(--border);padding-top:14px;margin-top:6px">
                <span>Total</span><span id="totalEl">Rp 0</span>
              </div>
              <div class="form-row" style="margin-top:18px">
                <label style="font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);display:block;margin-bottom:5px">Metode Bayar *</label>
                <div style="display:flex;gap:8px">
                  <label style="display:flex;align-items:center;gap:6px;flex:1;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;font-size:13.5px;font-weight:500;transition:border-color .15s" id="labelCash">
                    <input type="radio" name="metodeBayar" value="Cash" checked onchange="KasirPage._onMetodeBayar()" style="accent-color:var(--primary)"/> 💵 Cash
                  </label>
                  <label style="display:flex;align-items:center;gap:6px;flex:1;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;font-size:13.5px;font-weight:500;transition:border-color .15s" id="labelTransfer">
                    <input type="radio" name="metodeBayar" value="Transfer" onchange="KasirPage._onMetodeBayar()" style="accent-color:var(--primary)"/> 🏦 Transfer
                  </label>
                </div>
              </div>
              <div class="form-row">
                <label style="font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);display:block;margin-bottom:5px">Catatan (opsional)</label>
                <input type="text" id="catatanInput" placeholder="Nama pembeli / keterangan"
                  style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:13.5px;font-family:'Inter',sans-serif;outline:none"/>
              </div>
              <button class="btn btn-primary" id="btnProses" style="width:100%;padding:13px;font-size:15px;margin-top:8px">
                Proses Transaksi
              </button>
            </div>
          </div>

          <!-- Preview & cetak struk -->
          <div class="section-card" id="strutCard" style="display:none">
            <div class="section-head">
              <h2>Struk</h2>
              <button class="btn btn-outline btn-sm" onclick="KasirPage.cetakStruk()">🖨️ Cetak</button>
            </div>
            <div style="padding:16px 20px">
              <div id="strutPreview" class="strut-preview"></div>
              <button class="btn btn-outline" style="width:100%" onclick="KasirPage.newTransaction()">+ Transaksi Baru</button>
            </div>
          </div>
        </div>

      </div>
    `;

    _bindEvents();
    _initScannerListener();
  }

  function _bindEvents() {
    document.getElementById('btnScan').onclick      = _doScan;
    document.getElementById('btnClearCart').onclick = _clearCart;
    document.getElementById('btnProses').onclick    = _doProses;
    document.getElementById('btnLoadRes').onclick   = _doLoadReservasi;
    document.getElementById('barcodeInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') _doScan();
    });
    document.getElementById('resInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') _doLoadReservasi();
    });
  }

  // ── Load dari reservasi ──
  async function _doLoadReservasi() {
    const resId = document.getElementById('resInput').value.trim().toUpperCase();
    if (!resId) { showToast('Masukkan kode reservasi.', 'error'); return; }

    const btn = document.getElementById('btnLoadRes');
    btn.disabled = true; btn.textContent = 'Memuat...';

    const res = await apiCall('loadReservasiKeKasir', { resId });

    btn.disabled = false; btn.textContent = 'Muat Reservasi';

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
  function _initScannerListener() {
    document.addEventListener('keydown', _handleScannerKey);
    // Tandai scanner aktif
    const badge = document.getElementById('scannerStatus');
    if (badge) badge.className = 'badge-scanner';
  }

  function _handleScannerKey(e) {
    // Kalau fokus di input manual, jangan intercept
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

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
        resultDiv.innerHTML = `<span style="color:var(--danger);font-size:13px">⚠ Stok ${item.nama} habis.</span>`;
        setTimeout(() => { resultDiv.style.display = 'none'; }, 2000);
        return;
      }
      _addToCart(item.id, item.barcode, item.nama, item.sellPrice || 0, totalQty);
      resultDiv.innerHTML = `<span style="color:var(--success);font-size:13px">✓ ${item.nama} ditambahkan.</span>`;
      setTimeout(() => { resultDiv.style.display = 'none'; }, 1500);
    } else {
      // >1 item (ada versi NP) — tampilkan pilihan
      resultDiv.innerHTML = `
        <div style="font-size:12.5px;font-weight:600;margin-bottom:6px">Pilih item:</div>
        ${items.map(item => {
          const qty = item.batches?.reduce((s,b) => s + b.qtySistem, 0) || 0;
          return `<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--bg);border-radius:7px;margin-bottom:5px">
            <div style="flex:1">
              <div style="font-size:13.5px;font-weight:600">${item.nama}</div>
              <div style="font-size:11.5px;color:var(--muted)">${qty > 0 ? 'Tersedia' : 'Habis'}</div>
            </div>
            <button class="btn btn-primary btn-sm" ${qty<=0?'disabled':''} onclick="KasirPage._addFromResult('${item.id}','${item.barcode}',\`${item.nama.replace(/`/g,"'")}\`,${item.sellPrice||0},${qty})">
              Pilih
            </button>
          </div>`;
        }).join('')}`;
    }
  }

  function _addFromResult(id, barcode, nama, harga, qty) {
    _addToCart(id, barcode, nama, harga, qty);
    document.getElementById('scanResult').style.display = 'none';
  }

  function _addToCart(id, barcode, nama, harga, maxQty) {
    const existing = _cart.find(c => c.id === id);
    if (existing) {
      if (existing.qty >= existing.maxQty) {
        showToast(`Stok ${nama} hanya ${maxQty} unit.`, 'error'); return;
      }
      existing.qty++;
    } else {
      _cart.push({ id, barcode, nama, harga: parseFloat(harga)||0, qty: 1, maxQty });
    }
    _renderCart();
  }

  function _renderCart() {
    const tbody   = document.getElementById('cartBody');
    const totalEl = document.getElementById('totalEl');
    const subEl   = document.getElementById('subtotalEl');
    if (!tbody) return;

    if (!_cart.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:24px"><p>Belum ada item. Scan barcode untuk mulai.</p></div></td></tr>`;
      totalEl.textContent = 'Rp 0';
      subEl.textContent   = 'Rp 0';
      return;
    }

    const total = _cart.reduce((s, c) => s + c.qty * c.harga, 0);
    tbody.innerHTML = _cart.map((c, i) => `
      <tr>
        <td>
          <div style="font-weight:600;font-size:13.5px">${c.nama}</div>
          <div style="font-family:monospace;font-size:11px;color:var(--muted)">${c.barcode}</div>
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

    totalEl.textContent = 'Rp ' + total.toLocaleString('id-ID');
    subEl.textContent   = 'Rp ' + total.toLocaleString('id-ID');
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
  async function _doProses() {
    if (!_cart.length) { showToast('Keranjang kosong.', 'error'); return; }

    const btn = document.getElementById('btnProses');
    btn.disabled = true; btn.textContent = 'Memproses...';

    const metodeBayar = document.querySelector('input[name="metodeBayar"]:checked')?.value || 'Cash';
    const res = await apiCall('createTransaksi', {
      items:       _cart.map(c => ({ barcode: c.barcode, qty: c.qty, sellPrice: c.harga })),
      metodeBayar: metodeBayar,
      resId:       _activeResId || '',
      catatan:     document.getElementById('catatanInput')?.value.trim() || '',
    });

    btn.disabled = false; btn.textContent = 'Proses Transaksi';

    if (!res?.success) { showToast(res?.message || 'Gagal.', 'error'); return; }

    _lastTxId = res.txId;
    showToast(`Transaksi ${res.txId} berhasil! (${res.metodeBayar})`, 'success');
    _generateStruk(res.txId, res.metodeBayar);

    // Reset reservasi tag
    _activeResId = null;
    const resTag = document.getElementById('resTag');
    if (resTag) resTag.style.display = 'none';

    _cart = [];
    _renderCart();
    document.getElementById('catatanInput').value = '';
  }

  // ── Generate & tampilkan struk ──
  function _generateStruk(txId, metodeBayar = 'Cash') {
    const now       = new Date();
    const tanggal   = now.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'});
    const jam       = now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
    const kasir     = Session.getUser()?.displayName || '—';
    const items     = _cart.length ? _cart : []; // cart masih ada saat dipanggil sebelum di-clear
    const total     = items.reduce((s,c) => s + c.qty*c.harga, 0);
    const separator = '─'.repeat(32);

    const itemLines = items.map(c =>
      `${c.nama.substring(0,22).padEnd(22)} ${String(c.qty).padStart(2)}x\n` +
      `  Rp ${c.harga.toLocaleString('id-ID').padStart(10)} = Rp ${(c.qty*c.harga).toLocaleString('id-ID').padStart(10)}`
    ).join('\n');

    const resLine = _activeResId ? `Reservasi : ${_activeResId}` : '';

    const struk = `
       YAYASAN BPK PENABUR
     Jl. Contoh No. 1, Sukabumi
${separator}
No: ${txId}
Tgl: ${tanggal}  Jam: ${jam}
Kasir: ${kasir}
${resLine ? resLine + '\n' : ''}${separator}
${itemLines}
${separator}
TOTAL        Rp ${total.toLocaleString('id-ID').padStart(16)}
Bayar        ${metodeBayar.padStart(22)}
${separator}
    Terima kasih atas kunjungan
       dan kepercayaan Anda!
${separator}
Simpan struk ini sebagai bukti
        pembelian Anda.
    `.trim();

    const preview = document.getElementById('strutPreview');
    const card    = document.getElementById('strutCard');
    if (preview) preview.textContent = struk;
    if (card) card.style.display = '';
  }

  function cetakStruk() {
    window.print();
  }

  function newTransaction() {
    document.getElementById('strutCard').style.display = 'none';
    document.getElementById('barcodeInput').focus();
  }

  return { mount, _addFromResult, _changeQty, _removeCart, cetakStruk, newTransaction };
})();

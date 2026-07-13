// ============================================================
// kasir.js — Halaman Kasir: scan barcode, keranjang, cetak struk
// Support barcode scanner USB (input otomatis via keyboard event)
// Thermal printer via window.print() dengan CSS khusus
// ============================================================

const KasirPage = (() => {

  let _cart        = [];   // item di keranjang
  let _lastTxId    = null; // ID transaksi terakhir
  let _activeResId = null; // ID reservasi yang sedang diproses
  let _lastCartSnap= [];   // snapshot cart saat transaksi (untuk reprint)
  let _scanBuffer  = '';   // buffer untuk barcode scanner
  let _scanTimer   = null;

  // ── Mount halaman kasir ──
// Di dalam KasirPage
  function mount() {
    const page = document.getElementById('page-kasir');
    page.innerHTML = `
      <style>
        /* CSS print tetap sama... */
        @media print {
          body * { visibility: hidden !important; }
          #strutPreview, #strutPreview * { visibility: visible !important; }
          #strutPreview { position: fixed !important; top: 0 !important; left: 0 !important; width: 80mm !important; font-size: 11px !important; font-family: monospace !important; color: #000 !important; background: #fff !important; padding: 4mm !important; }
        }
        .kasir-layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
        .cart-table th { font-size: 11px; }
        .cart-table td { padding: 10px 14px; }
        .qty-ctrl { display: flex; align-items: center; gap: 6px; }
        .strut-preview { font-family: monospace; font-size: 11.5px; white-space: pre-wrap; background: #fff; padding: 16px; margin-bottom: 16px; }
      </style>

      <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div>
          <h1>Kasir & Penjualan</h1>
          <p>Scan barcode, input reservasi, atau proses PO.</p>
        </div>
        <div style="display:flex; gap:10px;">
            <button class="btn btn-outline" onclick="KasirPage.showHistory()">🕒 History & Reprint</button>
            <div id="scannerStatus" class="badge-scanner" style="background:#DCFCE7; padding:8px 12px; border-radius:20px; font-size:12px; font-weight:bold; color:#166534;">✓ Scanner Aktif</div>
        </div>
      </div>

      <div class="kasir-layout">
        <div>
          <div class="section-card" style="margin-bottom:16px">
            <div style="padding:16px 20px; background:#F8FAFC; border-bottom:1px solid var(--border);">
              <div style="display:flex; gap:10px; margin-bottom:12px;">
                <input id="poInput" type="text" placeholder="Nomor PO / Reservasi (Cth: PO-001)" style="flex:1; border:1.5px solid var(--border); border-radius:7px; padding:8px 12px; text-transform:uppercase;">
                <button class="btn btn-primary" id="btnLoadPO">Generate dari PO</button>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
                <input id="custNama" type="text" placeholder="Nama Pelanggan" style="border:1.5px solid var(--border); border-radius:7px; padding:8px 12px; font-size:13px;">
                <input id="custEmail" type="email" placeholder="Email" style="border:1.5px solid var(--border); border-radius:7px; padding:8px 12px; font-size:13px;">
                <input id="custPhone" type="text" placeholder="No. HP" style="border:1.5px solid var(--border); border-radius:7px; padding:8px 12px; font-size:13px;">
              </div>
            </div>

            <div style="display: flex; gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--border);">
              <input id="barcodeInput" type="text" placeholder="Scan barcode manual..." style="flex: 1; border: 1.5px solid var(--border); border-radius: 8px; padding: 10px 14px; font-family: monospace;" autocomplete="off"/>
              <button class="btn btn-primary" id="btnScan">Cari Item</button>
            </div>
            <div id="scanResult" style="padding:0 20px 12px;display:none"></div>

            <!-- Tambah baris manual -->
            <div style="padding:0 20px 14px;border-top:1px solid var(--border);margin-top:4px">
              <div style="font-size:11.5px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Tambah Manual</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <input id="manualNama" type="text" placeholder="Nama item"
                  style="flex:2;min-width:140px;border:1.5px solid var(--border);border-radius:7px;padding:7px 10px;font-size:13px;font-family:'Inter',sans-serif;outline:none"/>
                <input id="manualHarga" type="number" placeholder="Harga" min="0"
                  style="width:110px;border:1.5px solid var(--border);border-radius:7px;padding:7px 10px;font-size:13px;font-family:'Inter',sans-serif;outline:none"/>
                <input id="manualQty" type="number" placeholder="Qty" min="1" value="1"
                  style="width:70px;border:1.5px solid var(--border);border-radius:7px;padding:7px 10px;font-size:13px;font-family:'Inter',sans-serif;outline:none"/>
                <button class="btn btn-outline btn-sm" onclick="KasirPage._addManual()">+ Tambah</button>
              </div>
            </div>
          </div>

          <div class="section-card">
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
          <div class="section-card" style="margin-bottom:16px">
            <div style="padding:16px 20px">
              <div style="display:flex; justify-content:space-between; font-size:20px; font-weight:700; color:var(--primary); margin-bottom:16px;">
                <span>Total</span><span id="totalEl">Rp 0</span>
              </div>
              
              <div class="form-row" style="margin-top:18px">
                <label style="font-size:11.5px;font-weight:600;color:var(--muted);margin-bottom:5px">Metode Bayar</label>
                <div style="display:flex;gap:8px">
                  <label id="labelCash" style="flex:1; padding:9px 12px; border:1.5px solid var(--primary); background:#EFF6FF; border-radius:8px; cursor:pointer;">
                    <input type="radio" name="metodeBayar" value="Cash" checked onchange="KasirPage._onMetodeBayar()"> Cash
                  </label>
                  <label id="labelTransfer" style="flex:1; padding:9px 12px; border:1.5px solid var(--border); border-radius:8px; cursor:pointer;">
                    <input type="radio" name="metodeBayar" value="Transfer" onchange="KasirPage._onMetodeBayar()"> Transfer
                  </label>
                </div>
              </div>

              <div class="form-row" id="uploadTransferWrap" style="display:none; margin-top:10px; background:#F8FAFC; padding:10px; border-radius:8px; border:1px dashed var(--border);">
                <label style="font-size:11.5px;font-weight:600;color:var(--muted);margin-bottom:5px">Upload Bukti Transfer *</label>
                <input type="file" id="buktiTransfer" accept="image/*" style="width:100%; font-size:12px;">
              </div>

              <div class="form-row">
                <input type="text" id="catatanInput" placeholder="Catatan Tambahan (Opsional)" style="width:100%; border:1.5px solid var(--border); border-radius:8px; padding:9px 12px; margin-top:10px;">
              </div>
              <button class="btn btn-primary" id="btnProses" style="width:100%;padding:13px;font-size:15px;margin-top:8px">Proses Transaksi</button>
            </div>
          </div>
          
          <div class="section-card" id="strutCard" style="display:none">...</div>
        </div>
      </div>
      
      <div class="modal-overlay" id="modalHistory">
        <div class="modal" style="max-width:600px;">
            <div class="modal-header">
                <h3>History Transaksi</h3>
                <button class="modal-close" onclick="document.getElementById('modalHistory').classList.remove('show')">✕</button>
            </div>
            <div class="modal-body">
                <table class="cart-table">
                    <thead><tr><th>No Order</th><th>Tanggal</th><th>Pelanggan</th><th>Total</th><th>Aksi</th></tr></thead>
                    <tbody id="historyTableBody">
                        <tr><td>TRX-001</td><td>2026-07-04</td><td>Budi</td><td>Rp 150.000</td><td><button class="btn btn-outline btn-sm" onclick="KasirPage.promptReprint('TRX-001')">Reprint</button></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    `;

    _bindEvents();
    _initScannerListener();
  }

  function _onMetodeBayar() {
    const isCash = document.querySelector('input[name="metodeBayar"]:checked').value === 'Cash';
    document.getElementById('labelCash').style.borderColor = isCash ? 'var(--primary)' : 'var(--border)';
    document.getElementById('labelCash').style.background = isCash ? '#EFF6FF' : 'transparent';
    document.getElementById('labelTransfer').style.borderColor = !isCash ? 'var(--primary)' : 'var(--border)';
    document.getElementById('labelTransfer').style.background = !isCash ? '#EFF6FF' : 'transparent';
    
    // Tampilkan/Sembunyikan Upload
    document.getElementById('uploadTransferWrap').style.display = isCash ? 'none' : 'block';
  }

  function showHistory() {
      // Panggil API history di sini (Mocking untuk UI)
      document.getElementById('modalHistory').classList.add('show');
  }

  function promptReprint(txId) {
      const reason = prompt("Masukkan alasan cetak ulang struk untuk " + txId + ":");
      if(reason) {
          showToast('Mencatat alasan reprint ke database...', 'success');
          // Kirim ke API lalu panggil KasirPage.cetakStruk()
          setTimeout(() => cetakStruk(), 1000);
      }
  }

  // Jangan lupa return showHistory dan promptReprint di export bawah modul
  // return { mount, _addFromResult, _changeQty, _removeCart, cetakStruk, newTransaction, _onMetodeBayar, showHistory, promptReprint };
  function _bindEvents() {
    const safe = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
    safe('btnScan',      el => el.onclick = _doScan);
    safe('btnClearCart', el => el.onclick = _clearCart);
    safe('btnProses',    el => el.onclick = _doProses);
    safe('btnLoadRes',   el => el.onclick = _doLoadReservasi);
    safe('barcodeInput', el => el.addEventListener('keydown', e => { if (e.key === 'Enter') _doScan(); }));
    safe('resInput',     el => el.addEventListener('keydown', e => { if (e.key === 'Enter') _doLoadReservasi(); }));
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
    const emailResi   = document.getElementById('emailResi')?.value.trim() || '';
    const res = await apiCall('createTransaksi', {
      items:       _cart.map(c => ({ barcode: c.barcode, qty: c.qty, sellPrice: c.harga, nama: c.nama })),
      metodeBayar: metodeBayar,
      resId:       _activeResId || '',
      emailResi:   emailResi,
      catatan:     document.getElementById('catatanInput')?.value.trim() || '',
    });

    btn.disabled = false; btn.textContent = 'Proses Transaksi';

    if (!res?.success) { showToast(res?.message || 'Gagal.', 'error'); return; }

    _lastTxId    = res.txId;
    _lastCartSnap = [..._cart]; // simpan snapshot sebelum clear
    showToast(`Transaksi ${res.txId} berhasil! (${res.metodeBayar})`, 'success');
    _generateStruk(res.txId, res.metodeBayar);

    // Tampilkan upload bukti kalau transfer
    const uploadWrap = document.getElementById('uploadBuktiWrap');
    if (uploadWrap) uploadWrap.style.display = res.metodeBayar === 'Transfer' ? '' : 'none';

    // Reset reservasi tag
    _activeResId = null;
    const resTag = document.getElementById('resTag');
    if (resTag) resTag.style.display = 'none';

    _cart = [];
    _renderCart();
    document.getElementById('catatanInput').value = '';
    const emailEl = document.getElementById('emailResi');
    if (emailEl) emailEl.value = '';
    loadHistory();
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

  // ── Tambah item manual ke keranjang ──
  function _addManual() {
    const nama  = document.getElementById('manualNama')?.value.trim();
    const harga = parseFloat(document.getElementById('manualHarga')?.value || '0');
    const qty   = parseInt(document.getElementById('manualQty')?.value || '1');
    if (!nama) { showToast('Nama item wajib diisi.', 'error'); return; }
    if (harga < 0) { showToast('Harga tidak valid.', 'error'); return; }
    _cart.push({ id: 'MANUAL-'+Date.now(), barcode: '-', nama, harga, qty, maxQty: 9999 });
    _renderCart();
    document.getElementById('manualNama').value  = '';
    document.getElementById('manualHarga').value = '';
    document.getElementById('manualQty').value   = '1';
    showToast(nama + ' ditambahkan.', 'success');
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

    const res = await apiCall('getTransaksiList', {});
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
    const res = await apiCall('getTransaksiDetail', { txId });
    if (!res?.success) { showToast('Gagal memuat detail.', 'error'); return; }

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
                  <td style="padding:9px 12px">${i.nama}</td>
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
          <button class="btn btn-primary" id="btnReprint" onclick="KasirPage._doReprint('${txId}')">🖨️ Cetak Ulang</button>
        </div>
      </div>`;
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);

    // Tampilkan form alasan saat tombol reprint diklik
    document.getElementById('btnReprint').onclick = () => {
      const wrap   = document.getElementById('reprintWrap');
      const alasan = document.getElementById('reprintAlasan')?.value.trim();
      if (wrap.style.display === 'none') {
        wrap.style.display = '';
        document.getElementById('reprintAlasan').focus();
      } else {
        if (!alasan) { showToast('Isi alasan cetak ulang dulu.', 'error'); return; }
        _doReprint(txId, alasan, d);
      }
    };
  }

  async function _doReprint(txId, alasan, txData) {
    if (!alasan) return;
    // Log reprint
    await apiCall('logReprint', { txId, alasan });
    // Tutup modal
    document.getElementById('modalOrderDetail')?.remove();
    // Generate dan cetak struk
    if (txData) {
      // Reconstruct cart-like untuk _generateStruk
      const fakeCart = txData.items.map(i => ({
        nama: i.nama, barcode: i.barcode || '', harga: i.sellPrice, qty: i.qty
      }));
      const oldCart = _cart;
      _cart = fakeCart;
      _generateStruk(txId, txData.metodeBayar || 'Cash');
      _cart = oldCart;
      setTimeout(() => window.print(), 300);
      showToast('Struk dicetak ulang. Alasan: ' + alasan, 'success');
    }
  }

  return { mount, _addFromResult, _changeQty, _removeCart, cetakStruk, newTransaction, uploadBukti, loadHistory, showOrderDetail, _doReprint };
})();

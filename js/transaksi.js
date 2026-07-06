// ============================================================
// transaksi.js — Halaman Transaksi: input penjualan FIFO + retur
// ============================================================

const TransaksiPage = (() => {

  let _cart       = []; // item di keranjang transaksi aktif
  let _lastTxId   = null;

  // ── Mount HTML ──
  function mount() {
    const page = document.getElementById('page-transaksi');
    page.innerHTML = `
      <!-- Tab nav -->
      <div style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid var(--border)">
        <button class="tx-tab active" data-tab="input" onclick="TransaksiPage.switchTab('input')">Input Penjualan</button>
        <button class="tx-tab" data-tab="riwayat" onclick="TransaksiPage.switchTab('riwayat')">Riwayat Transaksi</button>
        <button class="tx-tab" data-tab="retur" onclick="TransaksiPage.switchTab('retur')">Retur Konsumen</button>
      </div>
      <style>
        .tx-tab{background:none;border:none;padding:10px 20px;font-size:13.5px;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color .15s,border-color .15s}
        .tx-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
        .tx-tab:hover{color:var(--text)}
      </style>

      <!-- TAB: Input Penjualan -->
      <div id="txTabInput">
        <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start" class="tx-grid">

          <!-- Kiri: scan & keranjang -->
          <div>
            <div class="section-card" style="margin-bottom:16px">
              <div class="section-head"><h2>Scan Barang</h2></div>
              <div style="padding:16px 20px;display:flex;gap:10px">
                <input id="txBarcodeInput" type="text" placeholder="Scan / ketik barcode..."
                  style="flex:1;border:1.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;font-family:monospace"
                  autocomplete="off" autocapitalize="none"/>
                <button class="btn btn-primary" id="btnTxScan">Cari</button>
              </div>
              <div id="txScanResult" style="padding:0 20px 16px;display:none"></div>
            </div>

            <div class="section-card">
              <div class="section-head">
                <h2>Keranjang</h2>
                <button class="btn btn-outline btn-sm" id="btnClearCart">Kosongkan</button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Nama</th><th>Qty</th><th>Harga</th><th>Subtotal</th><th></th></tr></thead>
                  <tbody id="txCartBody">
                    <tr><td colspan="5"><div class="empty-state" style="padding:24px"><p>Belum ada item.</p></div></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Kanan: ringkasan & bayar -->
          <div>
            <div class="section-card">
              <div class="section-head"><h2>Ringkasan</h2></div>
              <div style="padding:18px 20px">
                <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:13.5px">
                  <span style="color:var(--muted)">Total Item</span>
                  <span id="txTotalItem">0 item</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:20px;font-size:17px;font-weight:700">
                  <span>Total</span>
                  <span id="txTotalHarga" style="color:var(--primary)">Rp 0</span>
                </div>
                <div class="form-row">
                  <label>Catatan (opsional)</label>
                  <input type="text" id="txCatatan" placeholder="Nama pembeli / keterangan"/>
                </div>
                <button class="btn btn-primary" id="btnTxProses" style="width:100%;padding:13px;font-size:15px;margin-top:8px">
                  Proses Transaksi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: Riwayat -->
      <div id="txTabRiwayat" style="display:none">
        <div class="section-card">
          <div class="section-head">
            <h2>Riwayat Transaksi</h2>
            <button class="btn btn-outline btn-sm" onclick="TransaksiPage.loadRiwayat()">Refresh</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>ID Transaksi</th><th>Tanggal</th><th>Kasir</th><th>Total</th><th>Item</th><th>Aksi</th></tr></thead>
              <tbody id="txRiwayatBody">
                <tr><td colspan="6"><div class="empty-state"><p>Memuat...</p></div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB: Retur Konsumen -->
      <div id="txTabRetur" style="display:none">
        <div class="section-card" style="max-width:540px">
          <div class="section-head"><h2>Retur Konsumen</h2></div>
          <div style="padding:20px 22px">
            <div class="form-row">
              <label>ID Transaksi Asal</label>
              <div style="display:flex;gap:8px">
                <input type="text" id="returTxId" placeholder="TRX-0001" style="flex:1;border:1.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px"/>
                <button class="btn btn-outline btn-sm" onclick="TransaksiPage.loadTxForRetur()">Cari</button>
              </div>
            </div>
            <div id="returTxDetail" style="display:none">
              <div style="font-size:13px;font-weight:600;margin:12px 0 8px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Item Transaksi</div>
              <div id="returItemList"></div>
              <div class="form-row" style="margin-top:16px">
                <label>Alasan Retur</label>
                <input type="text" id="returAlasan" placeholder="Salah ukuran / barang rusak / dll"/>
              </div>
              <button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="TransaksiPage.submitRetur()">Proses Retur</button>
            </div>
          </div>
        </div>
      </div>
    `;

    _bindEvents();
  }

  function _bindEvents() {
    document.getElementById('btnTxScan').onclick   = _doScan;
    document.getElementById('btnClearCart').onclick = () => { _cart = []; _renderCart(); };
    document.getElementById('btnTxProses').onclick  = _doProses;
    document.getElementById('txBarcodeInput').onkeydown = e => { if (e.key === 'Enter') _doScan(); };
  }

  function switchTab(tab) {
    ['input','riwayat','retur'].forEach(t => {
      document.getElementById(`txTab${t.charAt(0).toUpperCase()+t.slice(1)}`).style.display = t === tab ? '' : 'none';
      document.querySelector(`.tx-tab[data-tab="${t}"]`)?.classList.toggle('active', t === tab);
    });
    if (tab === 'riwayat') loadRiwayat();
  }

  // ── Scan barcode → tambah ke keranjang ──
  async function _doScan() {
    const barcode = document.getElementById('txBarcodeInput').value.trim();
    if (!barcode) return;

    const res = await apiCall('getInventoryByBarcode', { barcode });
    const resultDiv = document.getElementById('txScanResult');
    resultDiv.style.display = '';

    if (!res?.success) {
      resultDiv.innerHTML = `<p style="color:var(--danger);font-size:13.5px">${res?.message || 'Tidak ditemukan.'}</p>`;
      return;
    }

    // Kalau 1 item, langsung tambah ke cart; kalau >1 (ada NP), tampilkan pilihan
    const items = res.data;
    if (items.length === 1 && items[0].batches.length > 0) {
      _addToCart(items[0]);
      resultDiv.innerHTML = `<p style="color:var(--success);font-size:13.5px">✓ ${items[0].nama} ditambah ke keranjang.</p>`;
      document.getElementById('txBarcodeInput').value = '';
      setTimeout(() => { resultDiv.style.display = 'none'; }, 1500);
    } else {
      // Tampilkan pilihan
      resultDiv.innerHTML = `
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">Pilih item:</div>
        ${items.map(item => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:8px;margin-bottom:6px">
            <div>
              <div style="font-size:13.5px;font-weight:600">${item.nama}</div>
              <div style="font-size:11.5px;color:var(--muted)">Stok: ${item.totalQtySistem}</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="TransaksiPage._addCartById('${item.id}')">Tambah</button>
          </div>`).join('')}`;
    }
  }

  async function _addCartById(itemId) {
    const res = await apiCall('getInventoryDetail', { itemId });
    if (!res?.success) { showToast(res?.message || 'Gagal.', 'error'); return; }
    _addToCart(res.data);
    document.getElementById('txScanResult').style.display = 'none';
    document.getElementById('txBarcodeInput').value = '';
  }

  function _addToCart(item) {
    const existing = _cart.find(c => c.id === item.id);
    if (existing) {
      existing.qty++;
    } else {
      _cart.push({
        id:        item.id,
        barcode:   item.barcode,
        nama:      item.nama,
        qty:       1,
        sellPrice: parseFloat(item.sellPrice) || 0,
        totalQty:  item.totalQty || item.totalQtySistem || 0,
      });
    }
    _renderCart();
  }

  function _renderCart() {
    const tbody   = document.getElementById('txCartBody');
    const totalEl = document.getElementById('txTotalHarga');
    const countEl = document.getElementById('txTotalItem');

    if (!_cart.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:24px"><p>Belum ada item.</p></div></td></tr>`;
      totalEl.textContent = 'Rp 0';
      countEl.textContent = '0 item';
      return;
    }

    const total = _cart.reduce((s, c) => s + (c.qty * c.sellPrice), 0);
    const count = _cart.reduce((s, c) => s + c.qty, 0);

    tbody.innerHTML = _cart.map((c, idx) => `
      <tr>
        <td><strong>${c.nama}</strong><br><span style="font-size:11.5px;font-family:monospace;color:var(--muted)">${c.barcode}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <button onclick="TransaksiPage._changeQty(${idx},-1)" style="width:24px;height:24px;border:1px solid var(--border);border-radius:4px;background:none;cursor:pointer;font-size:14px">−</button>
            <span style="min-width:24px;text-align:center;font-weight:600">${c.qty}</span>
            <button onclick="TransaksiPage._changeQty(${idx},1)" style="width:24px;height:24px;border:1px solid var(--border);border-radius:4px;background:none;cursor:pointer;font-size:14px">+</button>
          </div>
          ${c.qty > c.totalQty ? `<div style="font-size:11px;color:var(--danger)">Stok: ${c.totalQty}</div>` : ''}
        </td>
        <td>Rp ${c.sellPrice.toLocaleString('id-ID')}</td>
        <td>Rp ${(c.qty * c.sellPrice).toLocaleString('id-ID')}</td>
        <td><button class="btn btn-outline btn-sm" onclick="TransaksiPage._removeCart(${idx})">✕</button></td>
      </tr>`).join('');

    totalEl.textContent = 'Rp ' + total.toLocaleString('id-ID');
    countEl.textContent = count + ' item';
  }

  function _changeQty(idx, delta) {
    _cart[idx].qty = Math.max(1, _cart[idx].qty + delta);
    _renderCart();
  }

  function _removeCart(idx) {
    _cart.splice(idx, 1);
    _renderCart();
  }

  // ── Proses transaksi ──
  async function _doProses() {
    if (!_cart.length) { showToast('Keranjang kosong.', 'error'); return; }

    // Validasi stok
    const invalid = _cart.find(c => c.qty > c.totalQty);
    if (invalid) {
      showToast(`Stok ${invalid.nama} tidak cukup (tersedia: ${invalid.totalQty}).`, 'error');
      return;
    }

    const btn = document.getElementById('btnTxProses');
    btn.disabled = true; btn.textContent = 'Memproses...';

    const res = await apiCall('createTransaksi', {
      items:   _cart.map(c => ({ barcode: c.barcode, qty: c.qty, sellPrice: c.sellPrice })),
      catatan: document.getElementById('txCatatan').value.trim(),
    });

    btn.disabled = false; btn.textContent = 'Proses Transaksi';

    if (!res?.success) { showToast(res?.message || 'Gagal.', 'error'); return; }

    _lastTxId = res.txId;
    showToast(`Transaksi ${res.txId} berhasil! Total: Rp ${res.total?.toLocaleString('id-ID')}`, 'success');
    _cart = [];
    _renderCart();
    document.getElementById('txCatatan').value = '';
  }

  // ── Riwayat ──
  async function loadRiwayat() {
    const tbody = document.getElementById('txRiwayatBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Memuat...</p></div></td></tr>`;

    const res = await apiCall('getTransaksiList', {});
    if (!res?.success) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>${res?.message || 'Gagal.'}</p></div></td></tr>`;
      return;
    }

    const items = res.data || [];
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Belum ada transaksi.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(t => `
      <tr>
        <td style="font-family:monospace;font-size:12.5px">${t.id}</td>
        <td style="font-size:12.5px">${new Date(t.tanggal).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</td>
        <td style="font-size:12.5px;color:var(--muted)">${t.userId}</td>
        <td>Rp ${parseInt(t.total).toLocaleString('id-ID')}</td>
        <td>${t.itemCount} item</td>
        <td><button class="btn btn-outline btn-sm" onclick="TransaksiPage.viewDetail('${t.id}')">Detail</button></td>
      </tr>`).join('');
  }

  async function viewDetail(txId) {
    const res = await apiCall('getTransaksiDetail', { txId });
    if (!res?.success) { showToast(res?.message || 'Gagal.', 'error'); return; }
    const d = res.data;
    const rows = d.items.map(i => `
      <tr>
        <td>${i.nama}</td>
        <td style="font-family:monospace;font-size:12px">${i.barcode}</td>
        <td>${i.qty}</td>
        <td>Rp ${parseInt(i.sellPrice).toLocaleString('id-ID')}</td>
        <td>Rp ${parseInt(i.subtotal).toLocaleString('id-ID')}</td>
      </tr>`).join('');

    const existing = document.getElementById('modalTxDetail');
    if (existing) existing.remove();

    const m = document.createElement('div');
    m.className = 'modal-overlay show';
    m.id = 'modalTxDetail';
    m.innerHTML = `
      <div class="modal" style="max-width:560px">
        <div class="modal-header">
          <h3>Detail Transaksi ${d.id}</h3>
          <button class="modal-close" onclick="document.getElementById('modalTxDetail').remove()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:20px;margin-bottom:16px;font-size:13px;flex-wrap:wrap">
            <div><span style="color:var(--muted)">Tanggal: </span>${new Date(d.tanggal).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
            <div><span style="color:var(--muted)">Total: </span><strong>Rp ${parseInt(d.total).toLocaleString('id-ID')}</strong></div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nama</th><th>Barcode</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modalTxDetail').remove()">Tutup</button>
          <button class="btn btn-primary" onclick="TransaksiPage.prepareRetur('${d.id}')">Retur Konsumen</button>
        </div>
      </div>`;
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
  }

  // ── Retur konsumen ──
  function prepareRetur(txId) {
    const modal = document.getElementById('modalTxDetail');
    if (modal) modal.remove();
    switchTab('retur');
    document.getElementById('returTxId').value = txId;
    loadTxForRetur();
  }

  async function loadTxForRetur() {
    const txId = document.getElementById('returTxId').value.trim();
    if (!txId) { showToast('Masukkan ID transaksi.', 'error'); return; }

    const res = await apiCall('getTransaksiDetail', { txId });
    if (!res?.success) { showToast(res?.message || 'Tidak ditemukan.', 'error'); return; }

    const d = res.data;
    document.getElementById('returTxDetail').style.display = '';
    document.getElementById('returItemList').innerHTML = d.items.map(i => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--bg);border-radius:8px;margin-bottom:6px;flex-wrap:wrap">
        <div style="flex:1">
          <div style="font-size:13.5px;font-weight:600">${i.nama}</div>
          <div style="font-size:12px;color:var(--muted)">Qty beli: ${i.qty}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <label style="font-size:12px;color:var(--muted)">Qty retur:</label>
          <input type="number" min="0" max="${i.qty}" value="0" id="returQty_${i.id}"
            style="width:70px;border:1.5px solid var(--border);border-radius:6px;padding:6px 10px;font-size:13px"/>
          <select id="returKondisi_${i.id}" style="border:1.5px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12px">
            <option value="Baik">Baik</option>
            <option value="Rusak">Rusak</option>
          </select>
        </div>
      </div>
      <input type="hidden" id="returDetailId_${i.id}" value="${i.id}"/>
    `).join('');

    // Simpan items untuk submit
    document._currentReturItems = d.items;
    document._currentReturTxId  = txId;
  }

  async function submitRetur() {
    const txId    = document._currentReturTxId;
    const items   = document._currentReturItems || [];
    const alasan  = document.getElementById('returAlasan')?.value.trim() || '';

    if (!alasan) { showToast('Alasan retur wajib diisi.', 'error'); return; }

    const returItems = items
      .map(i => ({
        detailId: document.getElementById(`returDetailId_${i.id}`)?.value,
        qty:      parseInt(document.getElementById(`returQty_${i.id}`)?.value || '0'),
        kondisi:  document.getElementById(`returKondisi_${i.id}`)?.value || 'Baik',
        alasan:   alasan,
      }))
      .filter(r => r.qty > 0);

    if (!returItems.length) { showToast('Masukkan qty retur minimal 1 item.', 'error'); return; }

    const res = await apiCall('createReturKonsumen', { txId, items: returItems });
    showToast(res?.message || (res?.success ? 'Retur berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
    if (res?.success) {
      document.getElementById('returTxDetail').style.display = 'none';
      document.getElementById('returTxId').value = '';
    }
  }

  return { mount, switchTab, _addCartById, _changeQty, _removeCart, loadRiwayat, viewDetail, prepareRetur, loadTxForRetur, submitRetur };
})();

// ============================================================
// pengajuan.js — Halaman induk "Pengajuan" (3 tab)
// ============================================================
// Menyatukan tiga modul pengajuan yang sudah ada ke dalam SATU halaman
// bertab, TANPA menulis ulang modulnya:
//   - Proposal (Disposisi)   → PermohonanPage
//   - Operasional (galon/dll) → PermohonanOpsPage
//   - Cicilan Perseorangan    → CicilanPage
//
// Caranya: halaman ini menyediakan container `page-permohonan`,
// `page-permohonanops`, `page-cicilan` (ID yang memang dipakai tiap
// modul di mount()-nya), lalu memanggil mount() modul terkait saat
// tab pertama kali dibuka (lazy — biar ringan). Modul aslinya tidak
// diubah sama sekali.
// ============================================================

const PengajuanPage = (() => {
  let _mounted = { proposal: false, operasional: false, cicilan: false };
  let _aktif = 'proposal';

  // Peta tab → { containerId, page object }
  const TABS = [
    { key: 'proposal',    label: 'Proposal',            container: 'page-permohonan',    page: () => (typeof PermohonanPage    !== 'undefined' ? PermohonanPage    : null) },
    { key: 'operasional', label: 'Operasional',         container: 'page-permohonanops', page: () => (typeof PermohonanOpsPage !== 'undefined' ? PermohonanOpsPage : null) },
    { key: 'cicilan',     label: 'Cicilan Perseorangan',container: 'page-cicilan',        page: () => (typeof CicilanPage       !== 'undefined' ? CicilanPage       : null) },
  ];

  function mount() {
    const page = document.getElementById('page-pengajuan');
    if (!page) return;
    page.innerHTML = `
      <div style="display:flex;gap:6px;margin-bottom:6px;border-bottom:2px solid var(--border);flex-wrap:wrap">
        ${TABS.map(t => `
          <button class="peng-tab" data-tab="${t.key}" onclick="PengajuanPage.switchTab('${t.key}')"
            style="background:none;border:none;padding:12px 20px;font-size:14px;font-weight:700;cursor:pointer;border-bottom:3px solid transparent;color:var(--muted);margin-bottom:-2px;font-family:'DM Sans',sans-serif">
            ${t.label}
          </button>`).join('')}
      </div>
      ${TABS.map(t => `<div id="${t.container}" style="display:none"></div>`).join('')}
    `;
    switchTab(_aktif);
  }

  function switchTab(key) {
    _aktif = key;
    // Sorot tab aktif.
    document.querySelectorAll('.peng-tab').forEach(el => {
      const on = el.dataset.tab === key;
      el.style.borderBottomColor = on ? 'var(--primary)' : 'transparent';
      el.style.color = on ? 'var(--primary)' : 'var(--muted)';
    });
    // Tampilkan container yang dipilih, sembunyikan sisanya.
    TABS.forEach(t => {
      const el = document.getElementById(t.container);
      if (el) el.style.display = t.key === key ? 'block' : 'none';
    });

    const tab = TABS.find(t => t.key === key);
    if (!tab) return;
    const pageObj = tab.page();
    if (!pageObj) return;

    // Lazy mount: mount sekali saat pertama dibuka; kunjungan berikutnya
    // cukup refresh datanya (semua modul export loadList).
    if (!_mounted[key]) {
      pageObj.mount();
      _mounted[key] = true;
    } else if (pageObj.loadList) {
      pageObj.loadList();
    }
  }

  return { mount, switchTab };
})();

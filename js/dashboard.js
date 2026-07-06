// ============================================================
// dashboard.js — logika dashboard, navigasi, user management
// ============================================================

// ── Guard: redirect ke login kalau belum login ──
if (!Session.requireLogin()) { /* redirect handled inside */ }

const currentUser = Session.getUser();

// ============================================================
// NAVIGATION CONFIG — per role, menu apa yang muncul
// ============================================================
const NAV_MENU = [
  {
    label: null, // no section label for first group
    items: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        roles: ['R-01','R-02','R-03','R-04','R-05'],
        icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
      },
    ],
  },
  {
    label: 'Administrasi',
    items: [
      {
        id: 'users',
        title: 'Manajemen User',
        roles: ['R-01'],
        icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      },
    ],
  },
  {
    label: 'Inventory',
    items: [
      {
        id: 'inventory',
        title: 'Daftar Barang',
        roles: ['R-01','R-02','R-05'],
        icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3H8l-2 4h12l-2-4z"/></svg>`,
      },
      {
        id: 'opname',
        title: 'Stock Opname',
        roles: ['R-01','R-02','R-05'],
        icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
        badge: null,
      },
    ],
  },
  {
    label: 'Penjualan',
    items: [
      {
        id: 'kasir',
        title: 'Kasir',
        roles: ['R-01','R-02','R-04'],
        icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
      },
      {
        id: 'harian',
        title: 'Dashboard Harian',
        roles: ['R-01','R-02','R-03','R-04'],
        icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>`,
      },
      {
        id: 'transaksi',
        title: 'Riwayat Transaksi',
        roles: ['R-01','R-02','R-04'],
        icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></svg>`,
      },
      {
        id: 'retur',
        title: 'Retur Konsumen',
        roles: ['R-01','R-02','R-04'],
        icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.17"/></svg>`,
      },
      {
        id: 'po',
        title: 'Purchase Order',
        roles: ['R-01','R-02','R-05'],
        icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
      },
    ],
  },
  {
    label: 'Laporan',
    items: [
      {
        id: 'laporan',
        title: 'Rekap & Log',
        roles: ['R-01','R-02','R-03'],
        icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      },
    ],
  },
];

// ============================================================
// RENDER SIDEBAR berdasarkan role currentUser
// ============================================================
function renderNav() {
  const nav  = document.getElementById('navSection');
  const role = currentUser.roleId;
  nav.innerHTML = '';

  NAV_MENU.forEach(section => {
    const visibleItems = section.items.filter(item => item.roles.includes(role));
    if (!visibleItems.length) return;

    if (section.label) {
      const lbl = document.createElement('div');
      lbl.className = 'nav-label';
      lbl.textContent = section.label;
      nav.appendChild(lbl);
    }

    visibleItems.forEach(item => {
      const el = document.createElement('div');
      el.className = 'nav-item';
      el.dataset.page = item.id;
      el.innerHTML = `
        ${item.icon}
        <span>${item.title}</span>
        ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
      `;
      el.addEventListener('click', () => navigateTo(item.id, item.title));
      nav.appendChild(el);
    });
  });
}

// ============================================================
// NAVIGATION
// ============================================================
function navigateTo(pageId, title) {
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

  // Show/hide pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add('active');

  // Update topbar title
  document.getElementById('topbarTitle').textContent = title || 'Dashboard';

  // Load data for page if needed
  if (pageId === 'users') {
    loadUsers();
  } else if (pageId === 'inventory') {
    if (!document.getElementById('invTableBody')) InventoryPage.mount();
    InventoryPage.load();
  } else if (pageId === 'opname') {
    if (!document.getElementById('opnameViewStart')) OpnamePage.mount();
  } else if (pageId === 'transaksi' || pageId === 'retur') {
    if (!document.getElementById('txTabInput')) TransaksiPage.mount();
    if (pageId === 'retur') TransaksiPage.switchTab('retur');
  } else if (pageId === 'po') {
    if (!document.getElementById('poTabList')) POPage.mount();
  } else if (pageId === 'laporan') {
    if (!document.getElementById('lapTabRekap')) LaporanPage.mount();
    else LaporanPage.loadRekap();
  } else if (pageId === 'kasir') {
    if (!document.getElementById('barcodeInput')) KasirPage.mount();
    else document.getElementById('barcodeInput').focus();
  } else if (pageId === 'harian') {
    if (!document.getElementById('harTabDashboard')) HarianPage.mount();
    else HarianPage.loadDashboard();
  }
}

// ============================================================
// CLOCK
// ============================================================
function startClock() {
  const el = document.getElementById('topbarTime');
  function tick() {
    const now = new Date();
    el.textContent = now.toLocaleDateString('id-ID', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    }) + ' · ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  tick();
  setInterval(tick, 1000);
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'success') {
  const wrap = document.getElementById('toastWrap');
  const t    = document.createElement('div');
  t.className = `toast ${type}`;
  const icon = type === 'success'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  t.innerHTML = `${icon}<span>${msg}</span>`;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ============================================================
// DASHBOARD STATS — live dari API
// ============================================================
async function renderStats() {
  const role = currentUser.roleId;
  const grid = document.getElementById('statGrid');
  grid.innerHTML = '';

  // Skeleton loading
  for (let i = 0; i < 4; i++) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <div class="skeleton" style="height:12px;width:60%;margin-bottom:12px"></div>
      <div class="skeleton" style="height:32px;width:40%;margin-bottom:8px"></div>
      <div class="skeleton" style="height:10px;width:70%"></div>`;
    grid.appendChild(card);
  }

  const res = await StatsAPI.getDashboard();
  grid.innerHTML = '';

  if (!res?.success) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:13px">Gagal memuat statistik.</p>';
    return;
  }

  const d = res.data;
  const cards = [];

  if (d.users) {
    cards.push({ label: 'Total Pengguna', value: d.users.total, sub: `${d.users.aktif} aktif · ${d.users.terkunci} terkunci`, alert: d.users.terkunci > 0 });
  }
  if (d.inventory) {
    cards.push({ label: 'Item Aktif', value: d.inventory.activeItems, sub: `${d.inventory.totalStok} unit total stok` });
    if (d.inventory.kosong > 0) cards.push({ label: 'Stok Kosong', value: d.inventory.kosong, sub: 'item perlu restock', alert: true });
    if (d.inventory.belumOpname > 0) cards.push({ label: 'Belum Diopname', value: d.inventory.belumOpname, sub: 'batch qty belum diisi', alert: true });
  }
  if (d.opname) {
    cards.push({ label: 'Opname Berjalan', value: d.opname.berjalan, sub: `${d.opname.menungguApproval} menunggu approval` });
  }
  if (d.transaksi) {
    cards.push({ label: 'Transaksi Hari Ini', value: d.transaksi.jumlahHariIni, sub: 'Rp ' + parseInt(d.transaksi.totalHariIni).toLocaleString('id-ID') });
  }
  if (d.po) {
    if (d.po.menungguApproval > 0 || d.po.perluCekFisik > 0) {
      cards.push({ label: 'PO Perlu Aksi', value: d.po.menungguApproval + d.po.perluCekFisik, sub: `${d.po.menungguApproval} approval · ${d.po.perluCekFisik} cek fisik`, alert: true });
    }
  }

  if (!cards.length) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:13px">Tidak ada data untuk ditampilkan.</p>';
    return;
  }

  cards.forEach(s => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.style.borderLeft = s.alert ? '3px solid var(--accent)' : '';
    card.innerHTML = `
      <div class="stat-label">${s.label}</div>
      <div class="stat-value" style="${s.alert ? 'color:var(--primary)' : ''}">${s.value}</div>
      <div class="stat-sub">${s.sub}</div>`;
    grid.appendChild(card);
  });
}

// ============================================================
// USER MANAGEMENT
// ============================================================
let _users = [];

async function loadUsers() {
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Memuat data...</p></div></td></tr>`;

  const res = await UserAPI.getAll();
  if (!res || !res.success) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>${res?.message || 'Gagal memuat data.'}</p></div></td></tr>`;
    return;
  }

  _users = res.data || [];
  if (!_users.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Belum ada pengguna.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = _users.map(u => {
    const isActive = u.isActive === true || u.isActive === 'TRUE';
    const isLocked = u.isLocked === true || u.isLocked === 'TRUE';
    const statusBadge = isLocked
      ? `<span class="badge badge-red">Terkunci</span>`
      : isActive
        ? `<span class="badge badge-green">Aktif</span>`
        : `<span class="badge badge-gray">Nonaktif</span>`;

    const lastLogin = u.lastLogin
      ? new Date(u.lastLogin).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
      : '—';

    const roleBadge = {
      'R-01': 'badge-blue', 'R-02': 'badge-blue',
      'R-03': 'badge-yellow', 'R-04': 'badge-gray', 'R-05': 'badge-gray',
    }[u.roleId] || 'badge-gray';

    // Jangan tampilkan tombol aksi untuk diri sendiri
    const isSelf = u.id === currentUser.id;
    const actions = isSelf ? `<span style="color:var(--muted);font-size:12px">Akun Anda</span>` : `
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="openEditUser('${u.id}')">Edit</button>
        ${isLocked ? `<button class="btn btn-primary btn-sm" onclick="unlockUser('${u.id}','${u.displayName}')">Unlock</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="openResetPassword('${u.id}','${u.displayName}')">Reset PW</button>
      </div>
    `;

    return `
      <tr>
        <td><strong>${u.displayName}</strong></td>
        <td style="color:var(--muted);font-family:monospace">${u.username}</td>
        <td><span class="badge ${roleBadge}">${u.role}</span></td>
        <td>${statusBadge}</td>
        <td style="color:var(--muted);font-size:12.5px">${lastLogin}</td>
        <td>${actions}</td>
      </tr>
    `;
  }).join('');
}

// ── Tambah user ──
document.getElementById('btnAddUser').addEventListener('click', () => {
  document.getElementById('editUserId').value    = '';
  document.getElementById('inputDisplayName').value = '';
  document.getElementById('inputUsername').value = '';
  document.getElementById('inputRole').value     = '';
  document.getElementById('inputPassword').value = '';
  document.getElementById('inputEmail').value    = '';
  document.getElementById('inputPhone').value    = '';
  document.getElementById('rowPassword').style.display = '';
  document.getElementById('inputUsername').disabled    = false;
  document.getElementById('modalUserTitle').textContent = 'Tambah Pengguna';
  document.getElementById('modalUser').classList.add('show');
});

// ── Edit user ──
function openEditUser(userId) {
  const u = _users.find(u => u.id === userId);
  if (!u) return;
  document.getElementById('editUserId').value        = u.id;
  document.getElementById('inputDisplayName').value  = u.displayName || '';
  document.getElementById('inputUsername').value     = u.username || '';
  document.getElementById('inputUsername').disabled  = true; // username gak bisa diubah
  document.getElementById('inputRole').value         = u.roleId || '';
  document.getElementById('inputPassword').value     = '';
  document.getElementById('inputEmail').value        = u.email || '';
  document.getElementById('inputPhone').value        = u.phone || '';
  document.getElementById('rowPassword').style.display = 'none'; // edit gak ganti PW di sini
  document.getElementById('modalUserTitle').textContent = 'Edit Pengguna';
  document.getElementById('modalUser').classList.add('show');
}

// ── Save user (tambah / edit) ──
document.getElementById('btnSaveUser').addEventListener('click', async () => {
  const userId      = document.getElementById('editUserId').value;
  const displayName = document.getElementById('inputDisplayName').value.trim();
  const username    = document.getElementById('inputUsername').value.trim();
  const roleId      = document.getElementById('inputRole').value;
  const password    = document.getElementById('inputPassword').value;
  const email       = document.getElementById('inputEmail').value.trim();
  const phone       = document.getElementById('inputPhone').value.trim();

  if (!displayName || !roleId || (!userId && (!username || !password))) {
    showToast('Lengkapi semua field yang wajib diisi.', 'error'); return;
  }

  const btn = document.getElementById('btnSaveUser');
  btn.disabled = true; btn.textContent = 'Menyimpan...';

  let res;
  if (userId) {
    res = await UserAPI.update(userId, { displayName, roleId, email, phone });
  } else {
    res = await UserAPI.create({ username, displayName, roleId, password, email, phone });
  }

  btn.disabled = false; btn.textContent = 'Simpan';

  if (res?.success) {
    showToast(res.message, 'success');
    document.getElementById('modalUser').classList.remove('show');
    loadUsers();
  } else {
    showToast(res?.message || 'Gagal menyimpan.', 'error');
  }
});

// ── Unlock user ──
async function unlockUser(userId, name) {
  if (!confirm(`Unlock akun "${name}"?`)) return;
  const res = await UserAPI.unlock(userId);
  showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
  if (res?.success) loadUsers();
}

// ── Deactivate user ──
async function deactivateUser(userId, name) {
  if (!confirm(`Nonaktifkan akun "${name}"? User tidak bisa login dan semua sesi aktif akan dicabut.`)) return;
  const res = await UserAPI.deactivate(userId);
  showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
  if (res?.success) loadUsers();
}

// ── Reset password modal ──
function openResetPassword(userId, name) {
  document.getElementById('resetUserId').value  = userId;
  document.getElementById('resetUserName').textContent = name;
  document.getElementById('inputNewPassword').value = '';
  document.getElementById('modalReset').classList.add('show');
}

document.getElementById('btnConfirmReset').addEventListener('click', async () => {
  const userId   = document.getElementById('resetUserId').value;
  const password = document.getElementById('inputNewPassword').value;
  if (password.length < 6) { showToast('Password minimal 6 karakter.', 'error'); return; }

  const btn = document.getElementById('btnConfirmReset');
  btn.disabled = true; btn.textContent = 'Mereset...';

  const res = await UserAPI.resetPassword(userId, password);
  btn.disabled = false; btn.textContent = 'Reset Password';

  showToast(res?.message || (res?.success ? 'Berhasil.' : 'Gagal.'), res?.success ? 'success' : 'error');
  if (res?.success) document.getElementById('modalReset').classList.remove('show');
});

// ── Close modals ──
['modalUserClose','btnCancelUser'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', () => {
    document.getElementById('modalUser').classList.remove('show');
  });
});
['modalResetClose','btnCancelReset'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', () => {
    document.getElementById('modalReset').classList.remove('show');
  });
});
// Close on overlay click
['modalUser','modalReset'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
});

// ============================================================
// LOGOUT
// ============================================================
document.getElementById('logoutBtn').addEventListener('click', async () => {
  if (!confirm('Yakin ingin keluar?')) return;
  await Auth.logout();
  window.location.href = '/login.html';
});

// ============================================================
// INIT
// ============================================================
function init() {
  // Isi user info di sidebar
  const dn = currentUser.displayName || currentUser.username || '?';
  document.getElementById('userNameEl').textContent  = dn;
  document.getElementById('userRoleEl').textContent  = currentUser.role || '';
  document.getElementById('avatarEl').textContent    = dn.charAt(0).toUpperCase();
  document.getElementById('welcomeMsg').textContent  = `Selamat datang, ${dn.split(' ')[0]}!`;

  renderNav();
  renderStats();
  startClock();

  // Set nav item dashboard active
  const first = document.querySelector('.nav-item');
  if (first) first.classList.add('active');
}

init();

// ============================================================
// auth.js — API client + session manager
// Semua komunikasi ke Worker lewat sini
// ============================================================

// API_URL didefinisikan di config.js

// ============================================================
// Core: kirim request ke Worker
// Semua request pakai format: { action, payload, token }
// ============================================================
async function apiCall(action, payload = {}) {
  const token = Session.getToken();

  try {
    const res = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, payload, token }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // Kalau token expired/invalid → auto logout
    if (!data.success && data.code === 'TOKEN_INVALID') {
      Session.clear();
      window.location.href = '/Portal/login.html';
      return null;
    }

    return data;
  } catch (err) {
    console.error(`[API] ${action} error:`, err);
    return { success: false, message: 'Tidak dapat terhubung ke server.' };
  }
}

// ============================================================
// Auth API
// ============================================================
const Auth = {
  async login(username, password) {
    return apiCall('login', { username, password });
  },

  async logout() {
    const result = await apiCall('logout', {});
    Session.clear();
    return result;
  },
};

// ============================================================
// Session — simpan token + user info di sessionStorage
// sessionStorage: otomatis hilang saat tab/browser ditutup
// TIDAK pakai localStorage (lebih aman, gak persistent)
// ============================================================
const Session = {
  KEY_TOKEN:   'jowi_token',
  KEY_USER:    'jowi_user',
  KEY_EXPIRY:  'jowi_expiry',

  save(token, user, expiredAt) {
    sessionStorage.setItem(this.KEY_TOKEN,  token);
    sessionStorage.setItem(this.KEY_USER,   JSON.stringify(user));
    sessionStorage.setItem(this.KEY_EXPIRY, expiredAt);
  },

  getToken() {
    return sessionStorage.getItem(this.KEY_TOKEN) || null;
  },

  getUser() {
    try {
      return JSON.parse(sessionStorage.getItem(this.KEY_USER)) || null;
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    const token  = this.getToken();
    const expiry = sessionStorage.getItem(this.KEY_EXPIRY);
    if (!token || !expiry) return false;

    // Cek expiry di sisi client juga (defense in depth)
    // Token di server tetap di-validasi, ini cuma buat UX
    return new Date() < new Date(expiry);
  },

  clear() {
    sessionStorage.removeItem(this.KEY_TOKEN);
    sessionStorage.removeItem(this.KEY_USER);
    sessionStorage.removeItem(this.KEY_EXPIRY);
  },

  // Redirect ke login kalau belum login — panggil di awal setiap halaman protected
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = '/Portal/login.html';
      return false;
    }
    return true;
  },

  // Cek permission per modul + aksi
  can(modul, aksi) {
    const user = this.getUser();
    if (!user || !user.permissions) return false;
    const perm = user.permissions[modul] || user.permissions['Semua Modul'];
    if (!perm) return false;
    return perm[aksi] === true;
  },
};

// ============================================================
// User Management API
// ============================================================
const UserAPI = {
  async getAll() {
    return apiCall('getUsers', {});
  },

  async create(data) {
    return apiCall('createUser', data);
  },

  async update(userId, data) {
    return apiCall('updateUser', { userId, ...data });
  },

  async unlock(userId) {
    return apiCall('unlockUser', { userId });
  },

  async resetPassword(userId, newPassword) {
    return apiCall('resetPassword', { userId, newPassword });
  },

  async deactivate(userId) {
    return apiCall('deactivateUser', { userId });
  },

  async getActivityLog(limit = 100, userId = null) {
    return apiCall('getActivityLog', { limit, userId });
  },
};

// ============================================================
// Supplier API
// ============================================================
const SupplierAPI = {
  async getAll() {
    return apiCall('getSupplierList', {});
  },
};

// ============================================================
// Stats API
// ============================================================
const StatsAPI = {
  async getDashboard() {
    return apiCall('getDashboardStats', {});
  },
};

// ============================================================
// Activity Log API
// ============================================================
const LogAPI = {
  async getAll(limit = 100, userId = null) {
    return apiCall('getActivityLog', { limit, userId });
  },
};

// ============================================================
// Reservasi API (staff-side)
// ============================================================
const ReservasiAPI = {
  async getList(status = '') {
    return apiCall('getReservasiList', { status });
  },
  async konfirmasi(resId, action, catatanStaff = '') {
    return apiCall('konfirmasiReservasi', { resId, action, catatanStaff });
  },
};

// ============================================================
// Retur Request API (staff-side)
// ============================================================
const ReturRequestAPI = {
  async getList(status = '') {
    return apiCall('getReturRequestList', { status });
  },
  async proses(rrId, action, catatan = '') {
    return apiCall('prosesReturRequest', { rrId, action, catatan });
  },
};

// ============================================================
// Dashboard Harian API
// ============================================================
const HarianAPI = {
  async get() {
    return apiCall('getDashboardHarian', {});
  },
};

// ============================================================
// Public API — tanpa token (dipanggil dari halaman publik)
// ============================================================
const PublicAPI = {
  async getKatalog(kategori = '', search = '') {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getKatalog', payload: { kategori, search }, token: '' }),
    }).then(r => r.json()).catch(() => ({ success: false, message: 'Tidak dapat terhubung ke server.' }));
  },

  async submitReservasi(payload) {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submitReservasi', payload, token: '' }),
    }).then(r => r.json()).catch(() => ({ success: false, message: 'Tidak dapat terhubung ke server.' }));
  },

  async submitReturPublik(payload) {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submitReturPublik', payload, token: '' }),
    }).then(r => r.json()).catch(() => ({ success: false, message: 'Tidak dapat terhubung ke server.' }));
  },

  async getKategori() {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getKategoriList', payload: {}, token: '' }),
    }).then(r => r.json()).catch(() => ({ success: false, data: [] }));
  },

  async getTxDetail(txId) {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getTransaksiDetail', payload: { txId }, token: '' }),
    }).then(r => r.json()).catch(() => ({ success: false, message: 'Tidak dapat terhubung ke server.' }));
  },

  // Khusus halaman retur publik — tidak expose data sensitif
  async cekKodeTransaksi(txId) {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cekKodeTransaksi', payload: { txId }, token: '' }),
    }).then(r => r.json()).catch(() => ({ success: false, message: 'Tidak dapat terhubung ke server.' }));
  },
};

// ============================================================
// Kasir API — load reservasi ke keranjang
// ============================================================
const KasirAPI = {
  async loadReservasi(resId) {
    return apiCall('loadReservasiKeKasir', { resId });
  },
};

// ============================================================
// Inbox API
// ============================================================
const InboxAPI = {
  async get(limit = 50, onlyUnread = false) {
    return apiCall('getInbox', { limit, onlyUnread });
  },
  async getUnreadCount() {
    return apiCall('getUnreadCount', {});
  },
  async markRead(inboxId) {
    return apiCall('markInboxRead', { inboxId });
  },
  async markAllRead() {
    return apiCall('markAllInboxRead', {});
  },
  async delete(inboxId) {
    return apiCall('deleteInbox', { inboxId });
  },
};

// ============================================================
// Laporan API
// ============================================================
const LaporanAPI = {
  async generate(tipe, tanggal) {
    return apiCall('generateLaporan', { tipe, tanggal });
  },
};

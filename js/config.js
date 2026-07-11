// ============================================================
// config.js — Konfigurasi global frontend JOWI
// GANTI API_URL di sini kalau deploy ke Worker/domain baru
// File ini di-load sebelum auth.js di semua halaman
// ============================================================

// URL Cloudflare Worker (atau URL GAS sementara saat testing)
// Saat testing tanpa Worker: ganti ke URL GAS langsung
//   'https://script.google.com/macros/s/DEPLOYMENT_ID/exec'
// Saat production:
//   'https://api.penabur.id' atau 'https://jowi-api.USERNAME.workers.dev'
const API_URL = 'https://penajowi-api.penajowi-project.workers.dev/';

// Nama sistem (ditampilkan di title, header, dll)
const APP_CONFIG = {
  nama:    'JOWI',
  org:     'Yayasan BPK Penabur',
  version: '1.0.0',
};

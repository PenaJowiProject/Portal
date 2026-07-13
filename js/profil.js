// ============================================================
// profil.js — Halaman Profil Sendiri
// Akses: klik nama user di pojok kanan sidebar
// ============================================================

const ProfilPage = (() => {

  function mount() {
    const page = document.getElementById('page-profil');
    const user = Session.getUser();
    if (!page || !user) return;

    page.innerHTML = `
      <div class="page-header">
        <h1>Profil Saya</h1>
        <p>Kelola informasi akun dan keamanan Anda.</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:760px">

        <!-- Info akun -->
        <div class="section-card">
          <div class="section-head"><h2>Informasi Akun</h2></div>
          <div style="padding:20px 22px">
            <div class="form-row">
              <label>ID User</label>
              <input type="text" value="${user.id || ''}" readonly
                style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:10px 12px;font-size:14px;font-family:monospace;background:#F8F9FB;color:var(--muted);outline:none;cursor:not-allowed"/>
            </div>
            <div class="form-row">
              <label>Username</label>
              <input type="text" value="${user.username || ''}" readonly
                style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:10px 12px;font-size:14px;background:#F8F9FB;color:var(--muted);outline:none;cursor:not-allowed"/>
            </div>
            <div class="form-row">
              <label>Nama Lengkap</label>
              <input type="text" value="${user.displayName || ''}" readonly
                style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:10px 12px;font-size:14px;background:#F8F9FB;color:var(--muted);outline:none;cursor:not-allowed"/>
            </div>
            <div class="form-row">
              <label>Role</label>
              <div style="display:flex;align-items:center;gap:8px;padding:10px 0">
                <span class="badge badge-blue" style="font-size:13px;padding:5px 12px">${user.role || ''}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Ganti password -->
        <div class="section-card">
          <div class="section-head"><h2>Ganti Password</h2></div>
          <div style="padding:20px 22px">
            <div class="form-row">
              <label>Password Lama *</label>
              <div style="position:relative">
                <input type="password" id="oldPassword" maxlength="12" placeholder="Password saat ini"
                  style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:10px 40px 10px 12px;font-size:14px;outline:none;transition:border-color .15s"
                  onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'"/>
                <button type="button" onclick="ProfilPage._togglePw('oldPassword',this)"
                  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:2px">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <div class="form-row">
              <label>Password Baru * <span style="font-size:11px;color:var(--muted)">(maks 12 karakter)</span></label>
              <div style="position:relative">
                <input type="password" id="newPassword" maxlength="12" placeholder="Password baru"
                  style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:10px 40px 10px 12px;font-size:14px;outline:none;transition:border-color .15s"
                  oninput="ProfilPage._checkStrength(this.value)"
                  onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'"/>
                <button type="button" onclick="ProfilPage._togglePw('newPassword',this)"
                  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:2px">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <div id="pwStrength" style="height:4px;border-radius:2px;margin-top:6px;background:var(--border);transition:background .3s"></div>
              <div id="pwStrengthLabel" style="font-size:11.5px;color:var(--muted);margin-top:3px"></div>
            </div>
            <div class="form-row">
              <label>Konfirmasi Password Baru *</label>
              <div style="position:relative">
                <input type="password" id="confirmPassword" maxlength="12" placeholder="Ulangi password baru"
                  style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:10px 40px 10px 12px;font-size:14px;outline:none;transition:border-color .15s"
                  oninput="ProfilPage._checkMatch()"
                  onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'"/>
                <button type="button" onclick="ProfilPage._togglePw('confirmPassword',this)"
                  style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:2px">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <div id="matchLabel" style="font-size:11.5px;margin-top:3px"></div>
            </div>
            <div id="profilAlert" style="margin-bottom:12px"></div>
            <button class="btn btn-primary" style="width:100%" id="btnGantiPassword" onclick="ProfilPage.gantiPassword()">
              Ganti Password
            </button>
          </div>
        </div>

      </div>
    `;
  }

  // ── Toggle show/hide password ──
  function _togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = show
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }

  // ── Cek kekuatan password ──
  function _checkStrength(pw) {
    const bar   = document.getElementById('pwStrength');
    const label = document.getElementById('pwStrengthLabel');
    if (!bar || !label) return;
    if (!pw) { bar.style.background='var(--border)'; label.textContent=''; return; }
    let score = 0;
    if (pw.length >= 6)                   score++;
    if (pw.length >= 10)                  score++;
    if (/[A-Z]/.test(pw))                 score++;
    if (/[0-9]/.test(pw))                 score++;
    if (/[^A-Za-z0-9]/.test(pw))         score++;
    const levels = [
      { color:'#D94040', text:'Sangat Lemah' },
      { color:'#F97316', text:'Lemah' },
      { color:'#E8B800', text:'Sedang' },
      { color:'#16A34A', text:'Kuat' },
      { color:'#059669', text:'Sangat Kuat' },
    ];
    const lv = levels[Math.min(score, 4)];
    bar.style.background = lv.color;
    label.style.color    = lv.color;
    label.textContent    = lv.text;
  }

  // ── Cek match password ──
  function _checkMatch() {
    const pw  = document.getElementById('newPassword')?.value;
    const cfm = document.getElementById('confirmPassword')?.value;
    const lbl = document.getElementById('matchLabel');
    if (!lbl || !cfm) return;
    if (!cfm) { lbl.textContent=''; return; }
    if (pw === cfm) {
      lbl.style.color = 'var(--success)';
      lbl.textContent = '✓ Password cocok';
    } else {
      lbl.style.color = 'var(--danger)';
      lbl.textContent = '✗ Password tidak cocok';
    }
  }

  // ── Submit ganti password ──
  async function gantiPassword() {
    const oldPw = document.getElementById('oldPassword')?.value;
    const newPw = document.getElementById('newPassword')?.value;
    const cfmPw = document.getElementById('confirmPassword')?.value;
    const alert = document.getElementById('profilAlert');

    if (!oldPw || !newPw || !cfmPw) {
      _setAlert('Semua field password wajib diisi.', 'error'); return;
    }
    if (newPw.length < 6) {
      _setAlert('Password baru minimal 6 karakter.', 'error'); return;
    }
    if (newPw !== cfmPw) {
      _setAlert('Password baru dan konfirmasi tidak cocok.', 'error'); return;
    }
    if (oldPw === newPw) {
      _setAlert('Password baru harus berbeda dari password lama.', 'error'); return;
    }

    const btn = document.getElementById('btnGantiPassword');
    btn.disabled = true; btn.textContent = 'Menyimpan...';

    const res = await apiCall('changeOwnPassword', {
      oldPassword: oldPw,
      newPassword: newPw,
    });

    btn.disabled = false; btn.textContent = 'Ganti Password';

    if (res?.success) {
      _setAlert('Password berhasil diganti! Silahkan login ulang.', 'success');
      document.getElementById('oldPassword').value     = '';
      document.getElementById('newPassword').value     = '';
      document.getElementById('confirmPassword').value = '';
      // Auto logout setelah 2 detik
      setTimeout(async () => {
        await Auth.logout();
        window.location.href = '/Portal/login.html';
      }, 2000);
    } else {
      _setAlert(res?.message || 'Gagal ganti password.', 'error');
    }
  }

  function _setAlert(msg, type) {
    const el = document.getElementById('profilAlert');
    if (!el) return;
    const bg  = type === 'success' ? '#DCFCE7' : '#FEE2E2';
    const clr = type === 'success' ? '#166534'  : '#991B1B';
    el.innerHTML = `<div style="background:${bg};color:${clr};padding:10px 14px;border-radius:8px;font-size:13.5px">${msg}</div>`;
  }

  return { mount, gantiPassword, _togglePw, _checkStrength, _checkMatch };
})();

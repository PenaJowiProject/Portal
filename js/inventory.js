
// ── Switch sub menu Inventory ──
function switchSubMenu(tab) {
  ['Dashboard','Management','OpnameReq','Opname'].forEach(t => {
    const el = document.getElementById('invSub' + t);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById('invSub' + tab.charAt(0).toUpperCase() + tab.slice(1).replace(/-./g, m => m[1].toUpperCase()));
  if (target) target.style.display = '';

  document.querySelectorAll('.inv-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  if (tab === 'opname-req') _loadValidatorList();
  if (tab === 'opname') _loadOpnameEmbed();
  if (tab === 'management') {} // sudah di-load saat mount
}

// ── Load daftar validator (user aktif R-05 dan R-02) ──
async function _loadValidatorList() {
  const wrap = document.getElementById('opnameReqValidator');
  if (!wrap) return;
  const res = await apiCall('getUsers', {});
  if (!res?.success) { wrap.innerHTML = '<div style="font-size:12.5px;color:var(--danger);padding:4px">Gagal memuat user.</div>'; return; }

  const validators = (res.data || []).filter(u =>
    ['R-02','R-05'].includes(u.roleId) &&
    (u.isActive === true || u.isActive === 'TRUE')
  );

  wrap.innerHTML = validators.map(u => `
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 8px;border-radius:6px;font-size:13.5px;transition:background .1s" onmouseover="this.style.background='#F8F9FB'" onmouseout="this.style.background=''">
      <input type="checkbox" value="${u.id}" name="validatorCheck"
        style="width:15px;height:15px;accent-color:var(--primary)"/>
      ${u.displayName} <span style="font-size:11.5px;color:var(--muted)">(${u.role})</span>
    </label>`).join('') || '<div style="font-size:12.5px;color:var(--muted);padding:4px">Tidak ada validator tersedia.</div>';
}

// ── Submit pengajuan opname ──
async function submitPengajuanOpname() {
  const tgl       = document.getElementById('opnameReqTgl')?.value;
  const catatan   = document.getElementById('opnameReqCatatan')?.value.trim();
  const alertEl   = document.getElementById('opnameReqAlert');

  const jenjangChecked = [...document.querySelectorAll('#opnameReqJenjang input:checked')].map(cb => cb.value);
  const validatorChecked = [...document.querySelectorAll('[name="validatorCheck"]:checked')].map(cb => cb.value);

  const setAlert = (msg, type='error') => {
    const bg = type==='success'?'#DCFCE7':'#FEE2E2';
    const cl = type==='success'?'#166534':'#991B1B';
    alertEl.innerHTML = `<div style="background:${bg};color:${cl};padding:10px 14px;border-radius:8px;font-size:13.5px;margin-bottom:8px">${msg}</div>`;
  };

  if (!tgl)                    { setAlert('Tanggal wajib diisi.'); return; }
  if (!jenjangChecked.length)  { setAlert('Pilih minimal 1 jenjang.'); return; }
  if (!validatorChecked.length){ setAlert('Pilih minimal 1 validator.'); return; }

  const btn = document.getElementById('btnSubmitOpnameReq');
  btn.disabled = true; btn.textContent = 'Mengirim...';

  const res = await apiCall('submitPengajuanOpname', {
    tanggalRencana: tgl,
    jenjang:        jenjangChecked,
    validatorIds:   validatorChecked,
    catatan:        catatan,
  });

  btn.disabled = false; btn.textContent = 'Kirim Pengajuan ke Kepala Yayasan';

  if (res?.success) {
    setAlert('✓ Pengajuan berhasil dikirim ke inbox dan email Kepala Yayasan.', 'success');
    document.getElementById('opnameReqTgl').value = '';
    document.getElementById('opnameReqCatatan').value = '';
    document.querySelectorAll('#opnameReqJenjang input, [name="validatorCheck"]').forEach(cb => cb.checked = false);
  } else {
    setAlert(res?.message || 'Gagal mengirim pengajuan.');
  }
}

// ── Load opname embedded di sub tab ──
function _loadOpnameEmbed() {
  const embed = document.getElementById('opnameSubEmbed');
  if (!embed) return;
  // Redirect ke halaman opname via navigateTo
  embed.innerHTML = `
    <div class="section-card" style="text-align:center;padding:32px">
      <div style="font-size:40px;margin-bottom:12px">✅</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:16px;font-weight:700;margin-bottom:8px">Halaman Stock Opname</div>
      <div style="font-size:13.5px;color:var(--muted);margin-bottom:20px">Klik tombol di bawah untuk membuka halaman opname lengkap.</div>
      <button class="btn btn-primary" onclick="navigateTo('opname','Stock Opname')">Buka Halaman Opname →</button>
    </div>`;
}

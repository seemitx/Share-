/* =============================================
   SharePay — Expenses Module
   ============================================= */

const Expenses = (() => {

  let allExpenses = [];
  let allGroups   = [];
  let editingExpense = null;
  let activeGroupFilter = 'all';

  const CATEGORIES = ['อาหาร','ที่พัก','น้ำมัน','เดินทาง','อื่นๆ'];
  const CAT_EMOJI  = { 'อาหาร':'🍽️','ที่พัก':'🏨','น้ำมัน':'⛽','เดินทาง':'✈️','อื่นๆ':'📦' };
  const CAT_CLASS  = { 'อาหาร':'cat-food','ที่พัก':'cat-hotel','น้ำมัน':'cat-fuel','เดินทาง':'cat-travel','อื่นๆ':'cat-other' };

  /* ── Render ─────────────────────────────── */
  const render = async () => {
    const [expRes, grpRes] = await Promise.all([
      API.getExpenses(),
      API.getGroups()
    ]);
    allExpenses = expRes.data || [];
    allGroups   = grpRes.data || [];
    renderGroupFilter();
    renderTable(getFilteredExpenses());
  };

  const getFilteredExpenses = () => {
    return activeGroupFilter === 'all'
      ? allExpenses
      : allExpenses.filter(e => e.groupId === activeGroupFilter);
  };

  /* ── Group Filter Tabs ───────────────────── */
  const renderGroupFilter = () => {
    const el = document.getElementById('expense-group-filter');
    if (!el) return;
    el.innerHTML = `
      <button class="tab-btn ${activeGroupFilter==='all'?'active':''}"
        onclick="Expenses.setGroupFilter('all')">ทั้งหมด (${allExpenses.length})</button>
      ${allGroups.map(g => `
        <button class="tab-btn ${activeGroupFilter===g.id?'active':''}"
          onclick="Expenses.setGroupFilter('${g.id}')">
          ${g.emoji} ${g.name} (${allExpenses.filter(e=>e.groupId===g.id).length})
        </button>`
      ).join('')}`;
  };

  const setGroupFilter = (groupId) => {
    activeGroupFilter = groupId;
    renderGroupFilter();
    renderTable(getFilteredExpenses());
  };

  /* ── Table ───────────────────────────────── */
  const renderTable = (expenses) => {
    const tbody = document.getElementById('expenses-tbody');
    if (!tbody) return;

    if (!expenses.length) {
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="empty-state">
            <div class="empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
              </svg>
            </div>
            <h3 class="empty-title">ยังไม่มีรายการ</h3>
            <p class="empty-desc">เพิ่มรายการค่าใช้จ่ายแรกโดยกดปุ่ม "เพิ่มรายการ"</p>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = expenses.map(e => {
      const perPerson = e.splitWith?.length
        ? (e.amount / e.splitWith.length).toFixed(2)
        : e.amount;

      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:34px;height:34px;border-radius:9px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">
                ${CAT_EMOJI[e.category]||'📦'}
              </div>
              <div>
                <div style="font-weight:600;font-size:0.875rem">${e.name}</div>
                ${e.note?`<div style="font-size:0.72rem;color:var(--text-muted)">${e.note}</div>`:''}
              </div>
            </div>
          </td>
          <td><span class="badge ${CAT_CLASS[e.category]||'badge-gray'}">${e.category}</span></td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--text-primary)">
            ฿${Number(e.amount).toLocaleString('th-TH')}
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:6px">
              <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#10B981,#06B6D4);display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;color:white">
                ${(e.paidBy||'?').charAt(0)}
              </div>
              <span style="font-size:0.875rem">${e.paidBy}</span>
            </div>
          </td>
          <td>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${(e.splitWith||[]).map(m=>`<span class="badge badge-gray">${m}</span>`).join('')}
            </div>
          </td>
          <td style="font-family:'JetBrains Mono',monospace;color:var(--text-accent);font-size:0.82rem">
            ฿${Number(perPerson).toLocaleString('th-TH',{minimumFractionDigits:2})}
          </td>
          <td class="td-muted">${e.date||'-'}</td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="btn-icon" onclick="Expenses.openEditModal('${e.id}')" title="แก้ไข">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button class="btn-icon btn-danger" onclick="Expenses.confirmDelete('${e.id}')" title="ลบ">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  };

  /* ── Modals ──────────────────────────────── */
  const openAddModal = async () => {
    editingExpense = null;
    if (!allGroups.length) {
      const res = await API.getGroups();
      allGroups = res.data || [];
    }
    resetForm();
    document.getElementById('expense-modal-title').textContent = 'เพิ่มรายการค่าใช้จ่าย';
    populateGroupDropdown();
    populateCategoryDropdown();
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('expense-modal').classList.add('open');
  };

  const openEditModal = async (id) => {
    editingExpense = allExpenses.find(e => e.id === id);
    if (!editingExpense) return;

    document.getElementById('expense-modal-title').textContent = 'แก้ไขรายการ';
    populateGroupDropdown(editingExpense.groupId);
    populateCategoryDropdown(editingExpense.category);

    document.getElementById('expense-name').value    = editingExpense.name;
    document.getElementById('expense-amount').value  = editingExpense.amount;
    document.getElementById('expense-date').value    = editingExpense.date || '';
    document.getElementById('expense-note').value    = editingExpense.note || '';

    // Load group members then set payer / split
    await loadGroupMembers(editingExpense.groupId);
    document.getElementById('expense-paidby').value  = editingExpense.paidBy || '';
    populateSplitWith(editingExpense.splitWith || []);

    document.getElementById('expense-modal').classList.add('open');
  };

  const closeModal = () => {
    document.getElementById('expense-modal').classList.remove('open');
    editingExpense = null;
  };

  const resetForm = () => {
    ['expense-name','expense-amount','expense-note'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('split-options')?.querySelectorAll('.checkbox-item').forEach(el => {
      el.classList.remove('checked');
    });
  };

  /* ── Dropdowns ───────────────────────────── */
  const populateGroupDropdown = (selectedId = '') => {
    const sel = document.getElementById('expense-group');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- เลือกกลุ่ม --</option>'
      + allGroups.map(g => `<option value="${g.id}" ${g.id===selectedId?'selected':''}>${g.emoji} ${g.name}</option>`).join('');
  };

  const populateCategoryDropdown = (selected = 'อาหาร') => {
    const sel = document.getElementById('expense-category');
    if (!sel) return;
    sel.innerHTML = CATEGORIES.map(c =>
      `<option value="${c}" ${c===selected?'selected':''}>${CAT_EMOJI[c]} ${c}</option>`
    ).join('');
  };

  /* ── Group Members ───────────────────────── */
  const loadGroupMembers = async (groupId) => {
    if (!groupId) {
      document.getElementById('expense-paidby').innerHTML = '<option value="">-- เลือกกลุ่มก่อน --</option>';
      document.getElementById('split-options').innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem">เลือกกลุ่มก่อน</p>';
      return;
    }

    let group = allGroups.find(g => g.id === groupId);
    if (!group) {
      const res = await API.getGroups();
      allGroups = res.data || [];
      group = allGroups.find(g => g.id === groupId);
    }

    const members = group?.members || [];
    populatePaidBy(members);
    populateSplitWith(members, true);
  };

  const populatePaidBy = (members) => {
    const sel = document.getElementById('expense-paidby');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- ใครจ่าย? --</option>'
      + members.map(m => `<option value="${m}">${m}</option>`).join('');
  };

  const populateSplitWith = (members, selectAll = false) => {
    const container = document.getElementById('split-options');
    if (!container) return;

    if (!members || !members.length) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem">ยังไม่มีสมาชิกในกลุ่มนี้</p>';
      return;
    }

    const selectedSet = Array.isArray(members) && !selectAll ? new Set(members) : null;

    container.innerHTML = members.map(m => {
      const checked = selectAll || selectedSet?.has(m) ? 'checked' : '';
      return `
        <div class="checkbox-item ${checked}" onclick="Expenses.toggleMember(this, '${m}')">
          <div style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;color:white;flex-shrink:0">
            ${m.charAt(0)}
          </div>
          ${m}
        </div>`;
    }).join('');
  };

  const toggleMember = (el, name) => {
    el.classList.toggle('checked');
    updateSplitPreview();
  };

  const updateSplitPreview = () => {
    const amount  = parseFloat(document.getElementById('expense-amount')?.value) || 0;
    const checked = document.querySelectorAll('#split-options .checkbox-item.checked');
    const preview = document.getElementById('split-preview');
    if (!preview) return;

    if (!amount || !checked.length) {
      preview.textContent = '';
      return;
    }

    const perPerson = amount / checked.length;
    preview.textContent = `= คนละ ฿${perPerson.toLocaleString('th-TH',{minimumFractionDigits:2})} (${checked.length} คน)`;
  };

  /* ── Save ────────────────────────────────── */
  const save = async () => {
    const groupId  = document.getElementById('expense-group')?.value;
    const name     = document.getElementById('expense-name')?.value.trim();
    const category = document.getElementById('expense-category')?.value;
    const amount   = parseFloat(document.getElementById('expense-amount')?.value);
    const paidBy   = document.getElementById('expense-paidby')?.value;
    const date     = document.getElementById('expense-date')?.value;
    const note     = document.getElementById('expense-note')?.value.trim();

    const splitWith = [...document.querySelectorAll('#split-options .checkbox-item.checked')]
      .map(el => el.textContent.trim());

    if (!groupId)   { showToast('กรุณาเลือกกลุ่ม', 'error'); return; }
    if (!name)      { showToast('กรุณากรอกชื่อรายการ', 'error'); return; }
    if (!amount || amount <= 0) { showToast('กรุณากรอกจำนวนเงินที่ถูกต้อง', 'error'); return; }
    if (!paidBy)    { showToast('กรุณาระบุผู้จ่าย', 'error'); return; }
    if (!splitWith.length) { showToast('กรุณาเลือกผู้ร่วมหารอย่างน้อย 1 คน', 'error'); return; }

    const data = { groupId, name, category, amount, paidBy, date, note, splitWith };
    const res  = editingExpense
      ? await API.updateExpense({ ...data, id: editingExpense.id })
      : await API.addExpense(data);

    if (res.success) {
      showToast(editingExpense ? 'แก้ไขรายการเรียบร้อย' : 'เพิ่มรายการเรียบร้อย', 'success');
      closeModal();
      await render();
    } else {
      showToast('เกิดข้อผิดพลาด: ' + (res.error || 'Unknown'), 'error');
    }
  };

  /* ── Delete ──────────────────────────────── */
  const confirmDelete = (id) => {
    const expense = allExpenses.find(e => e.id === id);
    if (!expense) return;

    const overlay = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = `ลบรายการ "${expense.name}"?`;
    document.getElementById('confirm-desc').textContent  = 'รายการนี้จะถูกลบถาวร ยอดหนี้จะถูกคำนวณใหม่';

    const confirmBtn = document.getElementById('confirm-ok-btn');
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener('click', async () => {
      const res = await API.deleteExpense(id);
      if (res.success) {
        showToast('ลบรายการเรียบร้อย', 'success');
        document.getElementById('confirm-modal').classList.remove('open');
        await render();
      } else {
        showToast('ลบไม่สำเร็จ', 'error');
      }
    });

    overlay.classList.add('open');
  };

  /* ── Search ──────────────────────────────── */
  const search = (query) => {
    const q = query.toLowerCase();
    const filtered = q
      ? getFilteredExpenses().filter(e =>
          e.name.toLowerCase().includes(q) ||
          e.paidBy?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q)
        )
      : getFilteredExpenses();
    renderTable(filtered);
  };

  return {
    render, openAddModal, openEditModal, closeModal, save,
    setGroupFilter, loadGroupMembers, toggleMember,
    updateSplitPreview, confirmDelete, search
  };
})();

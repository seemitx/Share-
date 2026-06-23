/* =============================================
   SharePay — Groups Module
   ============================================= */

const Groups = (() => {

  const EMOJIS = ['🏖️','🏔️','🎉','🍕','🎵','🏕️','🚗','🏠','💼','🎂','🌴','⚽','🎮','🍻','🎭','🛒'];
  const COLORS  = ['#6366F1','#8B5CF6','#06B6D4','#10B981','#F59E0B','#EF4444','#EC4899','#14B8A6'];

  let currentGroups = [];
  let editingGroup  = null;
  let pendingMembers = [];

  /* ── Render ─────────────────────────────── */
  const render = async () => {
    const res = await API.getGroups();
    currentGroups = res.data || [];
    renderGrid();
  };

  const renderGrid = () => {
    const container = document.getElementById('groups-grid');
    if (!container) return;

    if (!currentGroups.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <h3 class="empty-title">ยังไม่มีกลุ่ม</h3>
          <p class="empty-desc">กดปุ่ม "เพิ่มกลุ่ม" เพื่อเริ่มต้นสร้างกลุ่มแรก</p>
        </div>`;
      return;
    }

    container.innerHTML = currentGroups.map(g => buildGroupCard(g)).join('');

    // Bind actions
    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(btn.dataset.edit);
      });
    });
    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDelete(btn.dataset.delete);
      });
    });
  };

  const buildGroupCard = (g) => {
    const memberCount = g.members?.length || 0;
    const preview = (g.members || []).slice(0, 4);
    const overflow = memberCount - 4;

    const avatarColors = ['#6366F1','#8B5CF6','#06B6D4','#10B981','#F59E0B'];
    const avatars = preview.map((m, i) =>
      `<div class="member-avatar-sm" style="background:linear-gradient(135deg,${avatarColors[i%avatarColors.length]},${avatarColors[(i+1)%avatarColors.length]});margin-left:${i>0?'-6px':'0'}">${m.charAt(0)}</div>`
    ).join('');

    return `
      <div class="group-card">
        <div class="group-card-accent" style="background:linear-gradient(90deg,${g.color||'#6366F1'},${g.color||'#6366F1'}88)"></div>
        <div class="group-actions">
          <button class="btn-icon" data-edit="${g.id}" title="แก้ไข">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="btn-icon btn-danger" data-delete="${g.id}" title="ลบ">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
        <span class="group-emoji">${g.emoji || '📁'}</span>
        <h3 class="group-name">${g.name}</h3>
        <p class="group-meta">สร้างเมื่อ ${g.createdAt || '-'} • ${memberCount} สมาชิก</p>
        <div class="group-members-preview">
          ${avatars}
          ${overflow > 0 ? `<div class="member-avatar-more">+${overflow}</div>` : ''}
          ${memberCount === 0 ? '<span style="font-size:0.78rem;color:var(--text-muted)">ยังไม่มีสมาชิก</span>' : ''}
        </div>
        <div class="group-stats">
          <div class="group-stat">สมาชิก <strong>${memberCount} คน</strong></div>
          <div class="group-stat">${(g.members||[]).join(', ').substring(0,30) || '-'}</div>
        </div>
      </div>`;
  };

  /* ── Modal ───────────────────────────────── */
  const openAddModal = () => {
    editingGroup = null;
    pendingMembers = [];
    resetForm();
    document.getElementById('group-modal-title').textContent = 'เพิ่มกลุ่มใหม่';
    document.getElementById('group-modal').classList.add('open');
    renderEmojiPicker();
    renderColorPicker();
    renderMemberTags();
  };

  const openEditModal = (id) => {
    editingGroup = currentGroups.find(g => g.id === id);
    if (!editingGroup) return;

    pendingMembers = [...(editingGroup.members || [])];

    document.getElementById('group-modal-title').textContent = 'แก้ไขกลุ่ม';
    document.getElementById('group-name-input').value = editingGroup.name;
    document.getElementById('group-modal').classList.add('open');

    renderEmojiPicker(editingGroup.emoji);
    renderColorPicker(editingGroup.color);
    renderMemberTags();
  };

  const closeModal = () => {
    document.getElementById('group-modal').classList.remove('open');
    editingGroup = null;
    pendingMembers = [];
  };

  const resetForm = () => {
    document.getElementById('group-name-input').value = '';
    document.getElementById('member-input').value = '';
  };

  /* ── Emoji Picker ────────────────────────── */
  const renderEmojiPicker = (selected = '🏖️') => {
    const el = document.getElementById('emoji-picker');
    if (!el) return;
    el.innerHTML = EMOJIS.map(e => `
      <button type="button" class="emoji-option ${e === selected ? 'selected' : ''}"
        data-emoji="${e}" onclick="Groups.selectEmoji('${e}')"
        style="font-size:1.5rem;padding:6px;border-radius:8px;border:2px solid ${e===selected?'rgba(99,102,241,0.5)':'transparent'};background:${e===selected?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.03)'};cursor:pointer;transition:all 0.2s">
        ${e}
      </button>`
    ).join('');
  };

  const selectEmoji = (emoji) => {
    renderEmojiPicker(emoji);
  };

  /* ── Color Picker ────────────────────────── */
  const renderColorPicker = (selected = '#6366F1') => {
    const el = document.getElementById('color-picker');
    if (!el) return;
    el.innerHTML = COLORS.map(c => `
      <button type="button" onclick="Groups.selectColor('${c}')"
        style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;
               border:3px solid ${c===selected?'white':'transparent'};
               box-shadow:${c===selected?`0 0 0 2px ${c}`:'none'};
               transition:all 0.2s">
      </button>`
    ).join('');
  };

  const selectColor = (color) => {
    renderColorPicker(color);
  };

  /* ── Members ─────────────────────────────── */
  const addMember = () => {
    const input = document.getElementById('member-input');
    const name  = input.value.trim();
    if (!name) return;
    if (pendingMembers.includes(name)) {
      showToast(`"${name}" มีอยู่แล้ว`, 'warning');
      return;
    }
    pendingMembers.push(name);
    input.value = '';
    renderMemberTags();
  };

  const removeMember = (name) => {
    pendingMembers = pendingMembers.filter(m => m !== name);
    renderMemberTags();
  };

  const renderMemberTags = () => {
    const el = document.getElementById('member-tags');
    if (!el) return;
    el.innerHTML = pendingMembers.map(m => `
      <span class="member-tag">
        ${m}
        <span class="remove-tag" onclick="Groups.removeMember('${m}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </span>
      </span>`
    ).join('');
  };

  /* ── Save ────────────────────────────────── */
  const save = async () => {
    const name = document.getElementById('group-name-input').value.trim();
    if (!name) { showToast('กรุณากรอกชื่อกลุ่ม', 'error'); return; }

    const emoji = document.querySelector('.emoji-option.selected')?.dataset?.emoji
      || document.querySelector('#emoji-picker button')?.dataset?.emoji || '📁';
    const color = document.querySelector('#color-picker button[style*="white"]')?.style?.background
      || COLORS[0];

    const data = { name, emoji, color, members: pendingMembers };

    const res = editingGroup
      ? await API.updateGroup({ ...data, id: editingGroup.id })
      : await API.addGroup(data);

    if (res.success) {
      showToast(editingGroup ? 'แก้ไขกลุ่มเรียบร้อย' : 'เพิ่มกลุ่มเรียบร้อย', 'success');
      closeModal();
      await render();
    } else {
      showToast('เกิดข้อผิดพลาด: ' + (res.error || 'Unknown'), 'error');
    }
  };

  /* ── Delete ──────────────────────────────── */
  const confirmDelete = (id) => {
    const group = currentGroups.find(g => g.id === id);
    if (!group) return;

    const overlay = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = `ลบกลุ่ม "${group.name}"?`;
    document.getElementById('confirm-desc').textContent = 'รายการค่าใช้จ่ายทั้งหมดในกลุ่มนี้จะถูกลบด้วย ไม่สามารถกู้คืนได้';

    const confirmBtn = document.getElementById('confirm-ok-btn');
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener('click', async () => {
      const res = await API.deleteGroup(id);
      if (res.success) {
        showToast(`ลบกลุ่ม "${group.name}" แล้ว`, 'success');
        closeConfirmModal();
        await render();
      } else {
        showToast('ลบไม่สำเร็จ', 'error');
      }
    });

    overlay.classList.add('open');
  };

  const closeConfirmModal = () => {
    document.getElementById('confirm-modal').classList.remove('open');
  };

  /* ── Search / Filter ─────────────────────── */
  const filter = (query) => {
    const q = query.toLowerCase();
    const filtered = q
      ? currentGroups.filter(g =>
          g.name.toLowerCase().includes(q) ||
          (g.members || []).some(m => m.toLowerCase().includes(q))
        )
      : currentGroups;

    const container = document.getElementById('groups-grid');
    if (!container) return;

    const temp = currentGroups;
    currentGroups = filtered;
    renderGrid();
    currentGroups = temp;
  };

  return {
    render, openAddModal, openEditModal, closeModal, save,
    addMember, removeMember, selectEmoji, selectColor, filter,
    confirmDelete, closeConfirmModal
  };
})();

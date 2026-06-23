/* =============================================
   SharePay — Google Apps Script API Module
   Handles all data persistence via GAS Web App
   ============================================= */

const API = (() => {

  /* ── Config ─────────────────────────────── */
  // Replace with your deployed Google Apps Script Web App URL
  let GAS_URL = localStorage.getItem('sharepay_api_url') || '';

  const setApiUrl = (url) => {
    GAS_URL = url;
    localStorage.setItem('sharepay_api_url', url);
  };

  const getApiUrl = () => GAS_URL;

  /* ── Status Tracking ─────────────────────── */
  let isConnected = false;

  const getStatus = () => ({
    connected: isConnected,
    url: GAS_URL ? GAS_URL.substring(0, 40) + '...' : 'Not configured'
  });

  /* ── HTTP Helpers ─────────────────────────── */
  const request = async (action, payload = {}) => {
    if (!GAS_URL) {
      // No API URL — return mock data for demo
      return mockHandler(action, payload);
    }

    try {
      const params = new URLSearchParams({ action, ...payload });
      const res = await fetch(`${GAS_URL}?${params}`, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      isConnected = true;
      return data;
    } catch (err) {
      console.warn('[SharePay API] Request failed, using mock data:', err.message);
      isConnected = false;
      return mockHandler(action, payload);
    }
  };

  const postRequest = async (action, payload = {}) => {
    if (!GAS_URL) return mockHandler(action, payload);

    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, ...payload }),
        redirect: 'follow'
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      isConnected = true;
      return data;
    } catch (err) {
      console.warn('[SharePay API] POST failed, using mock data:', err.message);
      isConnected = false;
      return mockHandler(action, payload);
    }
  };

  /* ── Mock In-Memory Store ─────────────────── */
  const store = {
    groups: [
      {
        id: 'g1', name: 'ทริปทะเล', emoji: '🏖️',
        createdAt: '2025-03-15',
        members: ['โอ๊ต', 'บาส', 'ต้น', 'ปอนด์'],
        color: '#6366F1'
      },
      {
        id: 'g2', name: 'ทริปเชียงใหม่', emoji: '🏔️',
        createdAt: '2025-04-20',
        members: ['โอ๊ต', 'บาส', 'มิ้ว'],
        color: '#06B6D4'
      },
      {
        id: 'g3', name: 'ปาร์ตี้ปีใหม่', emoji: '🎉',
        createdAt: '2025-12-28',
        members: ['โอ๊ต', 'บาส', 'ต้น', 'ปอนด์', 'มิ้ว', 'เฟิร์น'],
        color: '#8B5CF6'
      }
    ],
    expenses: [
      {
        id: 'e1', groupId: 'g1', groupName: 'ทริปทะเล',
        name: 'ข้าวเย็นริมทะเล', category: 'อาหาร',
        amount: 1200, paidBy: 'โอ๊ต',
        splitWith: ['โอ๊ต', 'บาส', 'ต้น', 'ปอนด์'],
        date: '2025-03-16', note: ''
      },
      {
        id: 'e2', groupId: 'g1', groupName: 'ทริปทะเล',
        name: 'น้ำมันรถ', category: 'น้ำมัน',
        amount: 800, paidBy: 'บาส',
        splitWith: ['โอ๊ต', 'บาส', 'ต้น', 'ปอนด์'],
        date: '2025-03-15', note: ''
      },
      {
        id: 'e3', groupId: 'g1', groupName: 'ทริปทะเล',
        name: 'ที่พักโรงแรม', category: 'ที่พัก',
        amount: 2400, paidBy: 'ต้น',
        splitWith: ['โอ๊ต', 'บาส', 'ต้น', 'ปอนด์'],
        date: '2025-03-15', note: '2 คืน'
      },
      {
        id: 'e4', groupId: 'g2', groupName: 'ทริปเชียงใหม่',
        name: 'ข้าวต้มเช้า', category: 'อาหาร',
        amount: 360, paidBy: 'บาส',
        splitWith: ['โอ๊ต', 'บาส', 'มิ้ว'],
        date: '2025-04-21', note: ''
      },
      {
        id: 'e5', groupId: 'g2', groupName: 'ทริปเชียงใหม่',
        name: 'ตั๋วเครื่องบิน', category: 'เดินทาง',
        amount: 4500, paidBy: 'โอ๊ต',
        splitWith: ['โอ๊ต', 'บาส', 'มิ้ว'],
        date: '2025-04-20', note: 'ไป-กลับ'
      },
      {
        id: 'e6', groupId: 'g3', groupName: 'ปาร์ตี้ปีใหม่',
        name: 'เครื่องดื่ม + ของว่าง', category: 'อาหาร',
        amount: 2800, paidBy: 'ปอนด์',
        splitWith: ['โอ๊ต', 'บาส', 'ต้น', 'ปอนด์', 'มิ้ว', 'เฟิร์น'],
        date: '2025-12-31', note: ''
      }
    ],
    settlements: []
  };

  // Auto-generate settlements from expenses
  const computeSettlements = () => {
    const settlements = [];
    const balances = {};

    store.expenses.forEach(exp => {
      const perPerson = exp.amount / exp.splitWith.length;
      exp.splitWith.forEach(member => {
        if (!balances[member]) balances[member] = 0;
        balances[member] -= perPerson;
      });
      if (!balances[exp.paidBy]) balances[exp.paidBy] = 0;
      balances[exp.paidBy] += exp.amount;
    });

    const creditors = Object.entries(balances).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]);
    const debtors   = Object.entries(balances).filter(([,v]) => v < 0).sort((a,b) => a[1]-b[1]);

    let ci = 0, di = 0;
    const cred = creditors.map(([n,v]) => ({ name: n, amount: v }));
    const debt = debtors.map(([n,v]) => ({ name: n, amount: -v }));

    while (ci < cred.length && di < debt.length) {
      const settle = Math.min(cred[ci].amount, debt[di].amount);
      if (settle > 0.01) {
        const existingId = store.settlements.find(
          s => s.from === debt[di].name && s.to === cred[ci].name
        );
        settlements.push({
          id: existingId ? existingId.id : `s${Date.now()}_${ci}_${di}`,
          from: debt[di].name,
          to: cred[ci].name,
          amount: Math.round(settle * 100) / 100,
          settled: existingId ? existingId.settled : false
        });
      }
      cred[ci].amount -= settle;
      debt[di].amount -= settle;
      if (cred[ci].amount < 0.01) ci++;
      if (debt[di].amount < 0.01) di++;
    }

    store.settlements = settlements;
    return settlements;
  };

  const mockHandler = (action, payload) => {
    switch (action) {
      case 'GET_GROUPS':
        return { success: true, data: store.groups };

      case 'ADD_GROUP': {
        const newGroup = {
          id: 'g' + Date.now(),
          name: payload.name,
          emoji: payload.emoji || '📁',
          createdAt: new Date().toISOString().split('T')[0],
          members: payload.members ? JSON.parse(payload.members) : [],
          color: payload.color || '#6366F1'
        };
        store.groups.push(newGroup);
        return { success: true, data: newGroup };
      }

      case 'UPDATE_GROUP': {
        const idx = store.groups.findIndex(g => g.id === payload.id);
        if (idx !== -1) {
          store.groups[idx] = {
            ...store.groups[idx],
            name: payload.name || store.groups[idx].name,
            emoji: payload.emoji || store.groups[idx].emoji,
            members: payload.members ? JSON.parse(payload.members) : store.groups[idx].members,
            color: payload.color || store.groups[idx].color
          };
          return { success: true, data: store.groups[idx] };
        }
        return { success: false, error: 'Group not found' };
      }

      case 'DELETE_GROUP': {
        const before = store.groups.length;
        store.groups = store.groups.filter(g => g.id !== payload.id);
        store.expenses = store.expenses.filter(e => e.groupId !== payload.id);
        computeSettlements();
        return { success: store.groups.length < before };
      }

      case 'GET_EXPENSES':
        return {
          success: true,
          data: payload.groupId
            ? store.expenses.filter(e => e.groupId === payload.groupId)
            : store.expenses
        };

      case 'ADD_EXPENSE': {
        const newExp = {
          id: 'e' + Date.now(),
          groupId: payload.groupId,
          groupName: (store.groups.find(g => g.id === payload.groupId) || {}).name || '',
          name: payload.name,
          category: payload.category,
          amount: parseFloat(payload.amount),
          paidBy: payload.paidBy,
          splitWith: JSON.parse(payload.splitWith),
          date: payload.date || new Date().toISOString().split('T')[0],
          note: payload.note || ''
        };
        store.expenses.push(newExp);
        computeSettlements();
        return { success: true, data: newExp };
      }

      case 'UPDATE_EXPENSE': {
        const idx = store.expenses.findIndex(e => e.id === payload.id);
        if (idx !== -1) {
          store.expenses[idx] = {
            ...store.expenses[idx],
            name: payload.name || store.expenses[idx].name,
            category: payload.category || store.expenses[idx].category,
            amount: payload.amount ? parseFloat(payload.amount) : store.expenses[idx].amount,
            paidBy: payload.paidBy || store.expenses[idx].paidBy,
            splitWith: payload.splitWith ? JSON.parse(payload.splitWith) : store.expenses[idx].splitWith,
            note: payload.note !== undefined ? payload.note : store.expenses[idx].note
          };
          computeSettlements();
          return { success: true, data: store.expenses[idx] };
        }
        return { success: false, error: 'Expense not found' };
      }

      case 'DELETE_EXPENSE': {
        const before = store.expenses.length;
        store.expenses = store.expenses.filter(e => e.id !== payload.id);
        computeSettlements();
        return { success: store.expenses.length < before };
      }

      case 'GET_SETTLEMENTS':
        return { success: true, data: computeSettlements() };

      case 'UPDATE_SETTLEMENT': {
        computeSettlements();
        const s = store.settlements.find(s => s.id === payload.id);
        if (s) {
          s.settled = payload.settled === 'true' || payload.settled === true;
          return { success: true, data: s };
        }
        return { success: false, error: 'Settlement not found' };
      }

      case 'GET_STATS': {
        computeSettlements();
        const totalExpenses = store.expenses.reduce((s, e) => s + e.amount, 0);
        const totalPending  = store.settlements.filter(s => !s.settled).reduce((s, e) => s + e.amount, 0);
        return {
          success: true,
          data: {
            groupCount: store.groups.length,
            expenseCount: store.expenses.length,
            totalExpenses,
            totalPending
          }
        };
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  };

  /* ── Public API Methods ───────────────────── */

  // Groups
  const getGroups = () => request('GET_GROUPS');
  const addGroup = (data) => postRequest('ADD_GROUP', {
    name: data.name,
    emoji: data.emoji,
    color: data.color,
    members: JSON.stringify(data.members || [])
  });
  const updateGroup = (data) => postRequest('UPDATE_GROUP', {
    id: data.id,
    name: data.name,
    emoji: data.emoji,
    color: data.color,
    members: JSON.stringify(data.members || [])
  });
  const deleteGroup = (id) => postRequest('DELETE_GROUP', { id });

  // Expenses
  const getExpenses = (groupId = null) => request('GET_EXPENSES', groupId ? { groupId } : {});
  const addExpense = (data) => postRequest('ADD_EXPENSE', {
    groupId: data.groupId,
    name: data.name,
    category: data.category,
    amount: data.amount,
    paidBy: data.paidBy,
    splitWith: JSON.stringify(data.splitWith),
    date: data.date,
    note: data.note || ''
  });
  const updateExpense = (data) => postRequest('UPDATE_EXPENSE', {
    id: data.id,
    name: data.name,
    category: data.category,
    amount: data.amount,
    paidBy: data.paidBy,
    splitWith: JSON.stringify(data.splitWith),
    note: data.note || ''
  });
  const deleteExpense = (id) => postRequest('DELETE_EXPENSE', { id });

  // Settlements
  const getSettlements = () => request('GET_SETTLEMENTS');
  const updateSettlement = (id, settled) => postRequest('UPDATE_SETTLEMENT', {
    id, settled: String(settled)
  });

  // Stats
  const getStats = () => request('GET_STATS');

  return {
    setApiUrl, getApiUrl, getStatus,
    getGroups, addGroup, updateGroup, deleteGroup,
    getExpenses, addExpense, updateExpense, deleteExpense,
    getSettlements, updateSettlement,
    getStats
  };

})();

/* ── Google Apps Script Template (reference) ──
   Paste this in your GAS project as Code.gs

function doGet(e) {
  return handleRequest(e);
}
function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  return handleRequest({ parameter: params });
}
function handleRequest(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = e.parameter.action;
  let result;
  switch (action) {
    case 'GET_GROUPS':    result = getGroups(ss);    break;
    case 'ADD_GROUP':     result = addGroup(ss, e.parameter); break;
    case 'DELETE_GROUP':  result = deleteGroup(ss, e.parameter.id); break;
    case 'GET_EXPENSES':  result = getExpenses(ss, e.parameter.groupId); break;
    case 'ADD_EXPENSE':   result = addExpense(ss, e.parameter); break;
    case 'DELETE_EXPENSE':result = deleteExpense(ss, e.parameter.id); break;
    case 'GET_SETTLEMENTS': result = getSettlements(ss); break;
    case 'UPDATE_SETTLEMENT': result = updateSettlement(ss, e.parameter); break;
    default: result = { success: false, error: 'Unknown action' };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
────────────────────────────────────────────── */

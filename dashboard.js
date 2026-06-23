/* =============================================
   SharePay — Dashboard Module
   ============================================= */

const Dashboard = (() => {

  let charts = {};

  const formatCurrency = (n) =>
    '฿' + Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const render = async () => {
    const [statsRes, expensesRes, settlementsRes] = await Promise.all([
      API.getStats(),
      API.getExpenses(),
      API.getSettlements()
    ]);

    const stats    = statsRes.data || {};
    const expenses = expensesRes.data || [];
    const settlements = settlementsRes.data || [];

    // Update stat cards
    animateCount('stat-groups',   stats.groupCount   || 0);
    animateCount('stat-expenses', stats.expenseCount || 0);
    animateAmount('stat-total',   stats.totalExpenses || 0);
    animateAmount('stat-pending', stats.totalPending  || 0);

    // Render charts
    renderCategoryChart(expenses);
    renderMonthlyChart(expenses);
    renderTopSpenders(expenses);
    renderRecentExpenses(expenses.slice().reverse().slice(0, 6));
    renderSettlementSummary(settlements);
  };

  const animateCount = (id, target) => {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = Math.ceil(target / 25);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 30);
  };

  const animateAmount = (id, target) => {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = target / 30;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = '฿' + Math.floor(current).toLocaleString('th-TH');
      if (current >= target) clearInterval(timer);
    }, 30);
  };

  const getCategoryColor = (cat) => {
    const map = {
      'อาหาร':   '#F59E0B',
      'ที่พัก':   '#6366F1',
      'น้ำมัน':   '#EF4444',
      'เดินทาง':  '#06B6D4',
      'อื่นๆ':    '#94A3B8'
    };
    return map[cat] || '#94A3B8';
  };

  const renderCategoryChart = (expenses) => {
    const canvas = document.getElementById('chart-category');
    if (!canvas) return;

    const catTotals = {};
    expenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });

    const labels = Object.keys(catTotals);
    const data   = Object.values(catTotals);
    const colors = labels.map(getCategoryColor);

    if (charts.category) charts.category.destroy();

    charts.category = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.map(c => c + '99'),
          borderColor: colors,
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#94A3B8',
              font: { family: 'Inter', size: 12 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 8
            }
          },
          tooltip: {
            backgroundColor: '#1E293B',
            borderColor: 'rgba(99,102,241,0.3)',
            borderWidth: 1,
            titleColor: '#F1F5F9',
            bodyColor: '#94A3B8',
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ฿${ctx.raw.toLocaleString('th-TH')}`
            }
          }
        },
        cutout: '68%'
      }
    });
  };

  const renderMonthlyChart = (expenses) => {
    const canvas = document.getElementById('chart-monthly');
    if (!canvas) return;

    const monthlyData = {};
    const now = new Date();

    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleString('th-TH', { month: 'short' });
      monthlyData[key] = { label, amount: 0 };
    }

    expenses.forEach(e => {
      const key = e.date ? e.date.substring(0, 7) : '';
      if (monthlyData[key]) monthlyData[key].amount += e.amount;
    });

    const entries = Object.values(monthlyData);
    const labels  = entries.map(e => e.label);
    const data    = entries.map(e => e.amount);

    if (charts.monthly) charts.monthly.destroy();

    charts.monthly = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'ค่าใช้จ่าย (฿)',
          data,
          backgroundColor: 'rgba(99,102,241,0.35)',
          borderColor: '#6366F1',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
          hoverBackgroundColor: 'rgba(99,102,241,0.6)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            borderColor: 'rgba(99,102,241,0.3)',
            borderWidth: 1,
            titleColor: '#F1F5F9',
            bodyColor: '#94A3B8',
            callbacks: {
              label: (ctx) => ` ฿${ctx.raw.toLocaleString('th-TH')}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#94A3B8', font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: '#94A3B8',
              font: { family: 'Inter', size: 11 },
              callback: (v) => '฿' + v.toLocaleString('th-TH')
            },
            beginAtZero: true
          }
        }
      }
    });
  };

  const renderTopSpenders = (expenses) => {
    const el = document.getElementById('top-spenders');
    if (!el) return;

    const totals = {};
    expenses.forEach(e => {
      totals[e.paidBy] = (totals[e.paidBy] || 0) + e.amount;
    });

    const sorted = Object.entries(totals).sort((a,b) => b[1]-a[1]).slice(0, 5);
    const max = sorted[0]?.[1] || 1;

    if (!sorted.length) {
      el.innerHTML = '<div class="empty-state" style="padding:20px"><p style="color:var(--text-muted);font-size:0.82rem">ยังไม่มีข้อมูล</p></div>';
      return;
    }

    const colors = ['#6366F1','#8B5CF6','#06B6D4','#10B981','#F59E0B'];

    el.innerHTML = sorted.map(([name, amount], i) => `
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,${colors[i]},${colors[(i+1)%colors.length]});display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:white">
              ${name.charAt(0)}
            </div>
            <span style="font-size:0.85rem;font-weight:600;color:var(--text-primary)">${name}</span>
          </div>
          <span style="font-size:0.82rem;font-weight:700;color:var(--text-accent);font-family:'JetBrains Mono',monospace">
            ฿${amount.toLocaleString('th-TH')}
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${(amount/max*100).toFixed(1)}%;background:linear-gradient(90deg,${colors[i]},${colors[(i+1)%colors.length]})"></div>
        </div>
      </div>
    `).join('');
  };

  const renderRecentExpenses = (expenses) => {
    const el = document.getElementById('recent-expenses');
    if (!el) return;

    const catClass = { 'อาหาร':'cat-food','ที่พัก':'cat-hotel','น้ำมัน':'cat-fuel','เดินทาง':'cat-travel','อื่นๆ':'cat-other' };
    const catEmoji = { 'อาหาร':'🍽️','ที่พัก':'🏨','น้ำมัน':'⛽','เดินทาง':'✈️','อื่นๆ':'📦' };

    if (!expenses.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div><p class="empty-title">ยังไม่มีรายการ</p></div>';
      return;
    }

    el.innerHTML = expenses.map(e => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
        <div style="width:38px;height:38px;border-radius:10px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0">
          ${catEmoji[e.category] || '📦'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.875rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">${e.groupName} • ${e.paidBy}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:0.9rem;font-weight:700;color:var(--text-primary);font-family:'JetBrains Mono',monospace">฿${e.amount.toLocaleString('th-TH')}</div>
          <div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px">${e.date || ''}</div>
        </div>
      </div>
    `).join('');
  };

  const renderSettlementSummary = (settlements) => {
    const el = document.getElementById('settlement-summary');
    if (!el) return;

    const pending = settlements.filter(s => !s.settled);

    if (!pending.length) {
      el.innerHTML = `
        <div style="text-align:center;padding:20px">
          <div style="font-size:2rem;margin-bottom:8px">✅</div>
          <p style="font-size:0.875rem;font-weight:600;color:var(--success)">ไม่มียอดค้างชำระ!</p>
          <p style="font-size:0.78rem;color:var(--text-muted);margin-top:4px">ทุกอย่างเรียบร้อยแล้ว</p>
        </div>`;
      return;
    }

    el.innerHTML = pending.slice(0, 4).map(s => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
        <div style="font-size:0.82rem;color:var(--text-primary)">
          <span style="color:var(--danger);font-weight:600">${s.from}</span>
          <span style="color:var(--text-muted);margin:0 6px">→</span>
          <span style="color:var(--success);font-weight:600">${s.to}</span>
        </div>
        <span style="font-size:0.875rem;font-weight:700;color:var(--warning);font-family:'JetBrains Mono',monospace">
          ฿${s.amount.toLocaleString('th-TH')}
        </span>
      </div>
    `).join('') + (pending.length > 4
      ? `<p style="text-align:center;font-size:0.78rem;color:var(--text-muted);margin-top:12px">+ อีก ${pending.length - 4} รายการ</p>`
      : '');
  };

  return { render };
})();

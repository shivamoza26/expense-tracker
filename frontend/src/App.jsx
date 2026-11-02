import React, { useEffect, useMemo, useState } from 'react';
import {
  Apple,
  Receipt,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Edit3,
  User as UserIcon,
  LogOut,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';
import CategoryIcon from './components/CategoryIcon.jsx';
import { INITIAL_CATEGORIES } from './data/categories.js';
import { apiFetch, mapCategory, mapExpense } from './lib/api.js';
import { format12HourTime, formatINR, formatShortDate, getNowDateString, getNowTimeString } from './lib/formatters.js';
import { describePieSlice } from './lib/chartGeometry.js';

export default function App() {
  // -------------------------------------------------------------------------
  // 1. ALL HOOKS UNCONDITIONALLY AT THE COMPONENT ROOT
  // -------------------------------------------------------------------------
  const [currentUser, setCurrentUser] = useState({
    id: 1,
    fullName: 'Aarav Sharma',
    email: 'aarav@pulsepay.in',
    role: 'ROLE_USER',
    jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.pulsepay.user.signature'
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('LOGIN'); // 'LOGIN' | 'REGISTER'
  const [authForm, setAuthForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'ROLE_USER'
  });
  const [authError, setAuthError] = useState('');

  // Primary navigation views: 'DASHBOARD' | 'CATEGORY_DRILLDOWN' | 'ENTER_PAYMENT'
  const [activeView, setActiveView] = useState('DASHBOARD');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', email: '' });
  const [profileError, setProfileError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev && prev.msg === msg ? null : prev));
    }, 3200);
  };

  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [transactions, setTransactions] = useState([]);

  // Filters & Horizons (Flow 3)
  const [periodHorizon, setPeriodHorizon] = useState('MONTHLY'); // 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  const [selectedMonthKey, setSelectedMonthKey] = useState('2026-10'); // '2026-06' .. '2026-12'
  const [selectedWeekKey, setSelectedWeekKey] = useState('W3'); // 'W1' .. 'W4'
  const [selectedWeekMonthKey, setSelectedWeekMonthKey] = useState('2026-10');
  const [monthWindowStart, setMonthWindowStart] = useState('2026-06');
  const [yearWindowStart, setYearWindowStart] = useState(2023);
  const [selectedYearKey, setSelectedYearKey] = useState('2026'); // '2023' .. '2026'
  const [selectedTrendCategoryId, setSelectedTrendCategoryId] = useState('all');
  const [analyticsSubTab, setAnalyticsSubTab] = useState('CATEGORIES'); // 'CATEGORIES' | 'TOP_SPENDS'
  const [hoveredPieSlice, setHoveredPieSlice] = useState(null);

  // Category Drilldown
  const [selectedCategoryId, setSelectedCategoryId] = useState(2); // Groceries
  const [drilldownSort, setDrilldownSort] = useState('AMOUNT_DESC');
  const [drilldownSearch, setDrilldownSearch] = useState('');

  // Receipt & Category Edit
  const [selectedTxId, setSelectedTxId] = useState(105); // Instamart ₹215
  const [pendingCategoryId, setPendingCategoryId] = useState(2);

  // Enter Payment Form
  const [editingTxId, setEditingTxId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    merchantName: '',
    transactionDate: getNowDateString(),
    transactionTime: getNowTimeString(),
    isDateModified: false,
    isTimeModified: false,
    includeTime: true,
    note: '',
    categoryId: 2,
  });
  const [isEditingDateInline, setIsEditingDateInline] = useState(false);
  const [isEditingTimeInline, setIsEditingTimeInline] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    apiFetch('/auth/me')
      .then(async (response) => {
        if (!response.ok) return;
        const user = await response.json();
        setCurrentUser(user);
        setProfileForm({ fullName: user.fullName || '', email: user.email || '' });
        setIsAuthenticated(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiFetch('/categories'),
      apiFetch('/expenses')
    ])
      .then(async ([categoriesResponse, expensesResponse]) => {
        if (!categoriesResponse.ok || !expensesResponse.ok) {
          throw new Error('Unable to load expense data');
        }
        const [categoryData, expenseData] = await Promise.all([
          categoriesResponse.json(),
          expensesResponse.json()
        ]);
        if (!cancelled) {
          setCategories(categoryData.map(mapCategory));
          setTransactions(expenseData.map(mapExpense));
        }
      })
      .catch((error) => {
        if (!cancelled) showToast(error.message, 'error');
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Computations
  const filteredTransactionsForPeriod = useMemo(() => {
    return transactions.filter((tx) => {
      if (periodHorizon === 'MONTHLY') {
        return tx.transactionDate.startsWith(selectedMonthKey);
      }
      if (periodHorizon === 'WEEKLY') {
        if (!tx.transactionDate.startsWith(selectedWeekMonthKey)) return false;
        const day = parseInt(tx.transactionDate.split('-')[2], 10);
        if (selectedWeekKey === 'W1') return day >= 1 && day <= 7;
        if (selectedWeekKey === 'W2') return day >= 8 && day <= 14;
        if (selectedWeekKey === 'W3') return day >= 15 && day <= 21;
        return day >= 22;
      }
      if (periodHorizon === 'YEARLY') {
        return tx.transactionDate.startsWith(selectedYearKey);
      }
      return true;
    });
  }, [transactions, periodHorizon, selectedMonthKey, selectedWeekKey, selectedWeekMonthKey, selectedYearKey]);

  const totalPeriodSpend = useMemo(() => {
    return filteredTransactionsForPeriod.reduce(
      (sum, tx) => sum + (tx.excludedFromTotal ? 0 : Number(tx.amount || 0)),
      0
    );
  }, [filteredTransactionsForPeriod]);

  // Dynamic Multi-Horizon Trend Data (historical/actual spends)
  const trendData = useMemo(() => {
    const sumForFilter = (predicate) =>
      transactions
        .filter((tx) => {
          if (
            selectedTrendCategoryId !== 'all' &&
            tx.categoryId !== Number(selectedTrendCategoryId)
          ) {
            return false;
          }
          return predicate(tx);
        })
        .reduce((acc, tx) => acc + (tx.excludedFromTotal ? 0 : Number(tx.amount || 0)), 0);

    if (periodHorizon === 'MONTHLY') {
      const [startYear, startMonth] = monthWindowStart.split('-').map(Number);
      const months = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(startYear, startMonth - 1 + index, 1);
        return {
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          label: date.toLocaleString('en', { month: 'short' })
        };
      });
      return months.map((m) => ({
        key: m.key,
        label: m.label,
        value: sumForFilter((tx) => tx.transactionDate.startsWith(m.key))
      }));
    }

    if (periodHorizon === 'WEEKLY') {
      const [weekYear, weekMonth] = selectedWeekMonthKey.split('-').map(Number);
      const daysInWeekMonth = new Date(weekYear, weekMonth, 0).getDate();
      const weeks = [1, 2, 3, 4].map((number) => ({
        key: `W${number}`,
        label: `${(number - 1) * 7 + 1}-${Math.min(number * 7, daysInWeekMonth)} ${new Date(weekYear, weekMonth - 1).toLocaleString('en', { month: 'short' })}`,
        min: (number - 1) * 7 + 1,
        max: number === 4 ? daysInWeekMonth : number * 7
      }));
      return weeks.map((w) => ({
        key: w.key,
        label: w.label,
        value: sumForFilter((tx) => {
          if (!tx.transactionDate.startsWith(selectedWeekMonthKey)) return false;
          const d = parseInt(tx.transactionDate.split('-')[2], 10);
          return d >= w.min && d <= w.max;
        })
      }));
    }

    // YEARLY
    const years = Array.from({ length: 4 }, (_, index) => {
      const year = yearWindowStart + index;
      return { key: String(year), label: String(year), base: ({ 2023: 18400, 2024: 29650, 2025: 36200 })[year] || 0 };
    });
    return years.map((y) => ({
      key: y.key,
      label: y.label,
      value:
        y.key === '2026'
          ? sumForFilter((tx) => tx.transactionDate.startsWith('2026'))
          : y.base
    }));
  }, [transactions, selectedTrendCategoryId, periodHorizon, monthWindowStart, selectedWeekMonthKey, yearWindowStart]);

  const activePeriodKey =
    periodHorizon === 'MONTHLY'
      ? selectedMonthKey
      : periodHorizon === 'WEEKLY'
      ? selectedWeekKey
      : selectedYearKey;

  // Category breakdown list
  const categoryBreakdown = useMemo(() => {
    const map = {};
    filteredTransactionsForPeriod.forEach((tx) => {
      if (!map[tx.categoryId]) {
        map[tx.categoryId] = { total: 0, count: 0 };
      }
      map[tx.categoryId].total += tx.excludedFromTotal ? 0 : Number(tx.amount || 0);
      map[tx.categoryId].count += 1;
    });

    const list = Object.keys(map).map((catIdStr) => {
      const catId = Number(catIdStr);
      const cat = categories.find((c) => c.id === catId) || categories[categories.length - 1];
      const total = map[catId].total;
      const rawPct = totalPeriodSpend > 0 ? (total / totalPeriodSpend) * 100 : 0;
      return {
        category: cat,
        total,
        count: map[catId].count,
        percentage: Math.round(rawPct),
        rawPercentage: rawPct
      };
    });

    list.sort((a, b) => b.total - a.total);
    return list;
  }, [filteredTransactionsForPeriod, categories, totalPeriodSpend]);

  const categoryPieSlices = useMemo(() => {
    const items = categoryBreakdown.filter((item) => item.total > 0);
    const total = items.reduce((sum, item) => sum + item.total, 0);
    let currentAngle = -90;

    return items.map((item) => {
      const percentage = total > 0 ? (item.total / total) * 100 : 0;
      const slice = {
        ...item,
        percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + (percentage / 100) * 360
      };
      currentAngle = slice.endAngle;
      return slice;
    });
  }, [categoryBreakdown]);

  const drilldownCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || categories[1],
    [categories, selectedCategoryId]
  );

  const drilldownTransactions = useMemo(() => {
    let list = filteredTransactionsForPeriod.filter((tx) => tx.categoryId === selectedCategoryId);

    if (drilldownSearch.trim()) {
      const q = drilldownSearch.toLowerCase();
      list = list.filter(
        (tx) =>
          tx.merchantName.toLowerCase().includes(q) ||
          (tx.note && tx.note.toLowerCase().includes(q))
      );
    }

    const sorted = [...list];
    if (drilldownSort === 'AMOUNT_DESC') {
      sorted.sort((a, b) => b.amount - a.amount);
    } else if (drilldownSort === 'AMOUNT_ASC') {
      sorted.sort((a, b) => a.amount - b.amount);
    } else if (drilldownSort === 'DATE_DESC') {
      sorted.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
    }
    return sorted;
  }, [filteredTransactionsForPeriod, selectedCategoryId, drilldownSearch, drilldownSort]);

  const drilldownTotal = useMemo(
    () =>
      drilldownTransactions.reduce(
        (sum, tx) => sum + (tx.excludedFromTotal ? 0 : Number(tx.amount || 0)),
        0
      ),
    [drilldownTransactions]
  );

  const selectedTransaction = useMemo(
    () => transactions.find((t) => t.id === selectedTxId) || transactions[0],
    [transactions, selectedTxId]
  );

  const maxTrendValue = Math.max(...trendData.map((d) => d.value), 45000);

  // SVG Chart Geometry
  const chartHeight = 160;
  const chartWidth = 600;
  const chartLeftPad = 32;
  const chartRightPad = 32;
  const usableWidth = chartWidth - chartLeftPad - chartRightPad;

  const chartPoints = trendData.map((pt, idx) => {
    const x =
      trendData.length > 1
        ? chartLeftPad + (idx / (trendData.length - 1)) * usableWidth
        : chartWidth / 2;
    const yRatio = Math.min(Math.max(pt.value / maxTrendValue, 0), 1);
    const y = chartHeight - 24 - yRatio * (chartHeight - 52);
    return { ...pt, x, y };
  });

  const activePointIndex = Math.max(
    chartPoints.findIndex((p) => p.key === activePeriodKey),
    0
  );
  const activePoint = chartPoints[activePointIndex] || chartPoints[0];

  const buildSmoothPath = (pts) => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const ctrlX1 = curr.x + (next.x - curr.x) * 0.45;
      const ctrlY1 = curr.y;
      const ctrlX2 = curr.x + (next.x - curr.x) * 0.55;
      const ctrlY2 = next.y;
      d += ` C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${next.x} ${next.y}`;
    }
    return d;
  };

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authForm.email.includes('@')) {
      setAuthError('Please enter a valid email address');
      return;
    }
    try {
      const response = await apiFetch(`/auth/${authMode === 'LOGIN' ? 'login' : 'register'}`, {
        method: 'POST',
        body: JSON.stringify({
          ...(authMode === 'REGISTER' ? { fullName: authForm.fullName } : {}),
          email: authForm.email,
          password: authForm.password
        })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Authentication failed');
      setCurrentUser(body);
      setProfileForm({ fullName: body.fullName || '', email: body.email || '' });
      setIsAuthenticated(true);
      setActiveView('DASHBOARD');
      showToast(`Signed in as ${body.fullName}`);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const openProfileModal = () => {
    setProfileError('');
    setProfileForm({
      fullName: currentUser.fullName || '',
      email: currentUser.email || ''
    });
    setIsProfileModalOpen(true);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    try {
      const response = await apiFetch('/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || body.details?.email || 'Unable to update profile');
      }
      setCurrentUser(body);
      setProfileForm({ fullName: body.fullName, email: body.email });
      setIsProfileModalOpen(false);
      showToast('Profile updated');
    } catch (error) {
      setProfileError(error.message);
    }
  };

  const handleLogout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setTransactions([]);
    setAuthForm((prev) => ({ ...prev, password: '' }));
  };

  const openNewPaymentScreen = (preselectedCatId = null) => {
    setEditingTxId(null);
    setPaymentForm({
      amount: '',
      merchantName: '',
      transactionDate: getNowDateString(),
      transactionTime: getNowTimeString(),
      isDateModified: false,
      isTimeModified: false,
      includeTime: true,
      note: '',
      categoryId: preselectedCatId || 2,
      accountId: 'acc-1',
    });
    setIsEditingDateInline(false);
    setIsEditingTimeInline(false);
    setFormErrors({});
    setActiveView('ENTER_PAYMENT');
  };

  const openEditPaymentScreen = (tx) => {
    setEditingTxId(tx.id);
    setPaymentForm({
      amount: String(tx.amount),
      merchantName: tx.merchantName,
      transactionDate: tx.transactionDate || getNowDateString(),
      transactionTime: tx.transactionTime || getNowTimeString(),
      isDateModified: true,
      isTimeModified: Boolean(tx.transactionTime),
      includeTime: Boolean(tx.transactionTime),
      note: tx.note || '',
      categoryId: tx.categoryId,
      accountId: tx.accountId || 'acc-1',
    });
    setIsEditingDateInline(false);
    setIsEditingTimeInline(false);
    setFormErrors({});
    setIsReceiptModalOpen(false);
    setActiveView('ENTER_PAYMENT');
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    const errs = {};
    const numAmount = parseFloat(paymentForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      errs.amount = 'Enter a valid amount greater than ₹0';
    }
    if (!paymentForm.merchantName.trim()) {
      errs.merchantName = 'Merchant or recipient name is required';
    }
    const maxAllowedDate = getNowDateString();
    if (paymentForm.transactionDate > maxAllowedDate) {
      errs.transactionDate = 'Invalid date: cannot select future date';
      showToast('Invalid date: cannot select future date', 'error');
    }
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    const finalDate = paymentForm.transactionDate || getNowDateString();
    const finalTime = paymentForm.includeTime
      ? paymentForm.transactionTime || getNowTimeString()
      : '';

    const payload = {
      amount: numAmount,
      merchantName: paymentForm.merchantName.trim(),
      transactionDate: finalDate,
      transactionTime: finalTime || null,
      note: paymentForm.note.trim() || null,
      categoryId: Number(paymentForm.categoryId)
    };

    try {
      const response = await apiFetch(
        `/expenses${editingTxId ? `/${editingTxId}` : ''}`,
        {
          method: editingTxId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      if (!response.ok) throw new Error('Unable to save expense');
      const savedTransaction = mapExpense(await response.json());
      setTransactions((prev) =>
        editingTxId
          ? prev.map((tx) => (tx.id === editingTxId ? savedTransaction : tx))
          : [savedTransaction, ...prev]
      );
      if (finalDate.slice(0, 7) !== selectedMonthKey) setSelectedMonthKey(finalDate.slice(0, 7));
      setSelectedTxId(savedTransaction.id);
      setPendingCategoryId(savedTransaction.categoryId);
      showToast(
        editingTxId
          ? `Updated payment to ${savedTransaction.merchantName}`
          : `Paid ${formatINR(savedTransaction.amount)} to ${savedTransaction.merchantName}`
      );
      setIsReceiptModalOpen(true);
      setActiveView('DASHBOARD');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleUpdateCategoryFromReceipt = async () => {
    if (!selectedTransaction) return;
    try {
      const response = await apiFetch(
        `/expenses/${selectedTransaction.id}/category?categoryId=${pendingCategoryId}`,
        { method: 'PATCH' }
      );
      if (!response.ok) throw new Error('Unable to update expense category');
      const updatedTransaction = mapExpense(await response.json());
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === updatedTransaction.id ? updatedTransaction : tx))
      );
      const updatedCat = categories.find((c) => c.id === pendingCategoryId);
      showToast(`Category updated to ${updatedCat ? updatedCat.name : 'Selected'}`);
      setSelectedCategoryId(pendingCategoryId);
      setIsReceiptModalOpen(false);
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleDeleteTransaction = async (txId) => {
    const target = transactions.find((t) => t.id === txId);
    try {
      const response = await apiFetch(`/expenses/${txId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Unable to delete expense');
      setTransactions((prev) => prev.filter((t) => t.id !== txId));
      setIsReceiptModalOpen(false);
      showToast(`Deleted transaction: ${target ? target.merchantName : txId}`, 'info');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // -------------------------------------------------------------------------
  // RENDER: LOGIN VIEW (Checked safely after all hooks)
  // -------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070709] text-white flex flex-col justify-center items-center p-4 sm:p-8 font-sans">
        <div className="w-full max-w-md bg-[#111115] border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#d91cd2] to-[#7e22ce] flex items-center justify-center shadow-lg shadow-fuchsia-600/30">
              <Receipt size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">PulsePay</h1>
              <p className="text-xs text-zinc-400">Smart Expense Tracker (PC & Mobile Web)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-900 rounded-xl mb-6 border border-zinc-800">
            <button
              type="button"
              onClick={() => setAuthMode('LOGIN')}
              className={`py-2 text-xs font-semibold rounded-lg transition ${
                authMode === 'LOGIN' ? 'bg-[#d91cd2] text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('REGISTER')}
              className={`py-2 text-xs font-semibold rounded-lg transition ${
                authMode === 'REGISTER' ? 'bg-[#d91cd2] text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'REGISTER' && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3.5 top-3 text-zinc-500" />
                  <input
                    type="text"
                    value={authForm.fullName}
                    onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })}
                    placeholder=""
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  placeholder=""
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-[#d91cd2] hover:bg-[#c018ba] text-white font-semibold text-sm shadow-lg shadow-fuchsia-600/30 transition"
            >
              {authMode === 'LOGIN' ? 'Sign In to Dashboard' : 'Create Account'}
            </button>
          </form>

        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // MAIN DASHBOARD APPLICATION
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#070709] text-white font-sans flex flex-col selection:bg-fuchsia-500 selection:text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#0e0e13]/95 backdrop-blur-md border-b border-zinc-800/80 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveView('DASHBOARD')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#d91cd2] via-fuchsia-600 to-purple-600 flex items-center justify-center shadow-lg shadow-fuchsia-600/30 group-hover:scale-105 transition">
                <Receipt size={20} className="text-white" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-fuchsia-300 transition">
                  PulsePay
                </span>
              </div>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1.5 bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveView('DASHBOARD')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                activeView === 'DASHBOARD'
                  ? 'bg-[#d91cd2] text-white shadow-md shadow-fuchsia-600/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Activity size={14} />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId(2);
                setActiveView('CATEGORY_DRILLDOWN');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                activeView === 'CATEGORY_DRILLDOWN'
                  ? 'bg-[#d91cd2] text-white shadow-md shadow-fuchsia-600/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Apple size={14} className="text-emerald-400" />
              <span>Category</span>
            </button>

            <button
              type="button"
              onClick={() => openNewPaymentScreen()}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                activeView === 'ENTER_PAYMENT'
                  ? 'bg-[#d91cd2] text-white shadow-md shadow-fuchsia-600/20'
                  : 'text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800'
              }`}
            >
              <Plus size={14} className="text-fuchsia-400" />
              <span>Payment</span>
            </button>
          </nav>

          {/* User Controls */}
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

            <button
              type="button"
              onClick={openProfileModal}
              title="Edit profile"
              className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-zinc-900 transition text-left"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-fuchsia-400">
                {(currentUser.username || currentUser.fullName || '?').charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-white leading-tight">
                  {currentUser.username || currentUser.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-[10px] text-zinc-400">Profile</p>
              </div>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition"
            >
              <LogOut size={14} />
            </button>
            </div>
          </div>
      </header>

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-zinc-900/95 border ${
            toastMessage.type === 'error'
              ? 'border-rose-500/60 text-rose-200'
              : 'border-fuchsia-500/50 text-white'
          } px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-medium`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="text-[#22c55e] shrink-0" />
          )}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-[#111115] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-white">Profile</h2>
                <p className="text-xs text-zinc-400">Update your account details</p>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                aria-label="Close profile"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Full name</label>
                <input
                  required
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-[#16161e] px-3 py-2.5 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Email (used as username)</label>
                <input
                  required
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-[#16161e] px-3 py-2.5 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                />
              </div>
              {profileError && <p className="text-xs text-rose-300">{profileError}</p>}
              <button
                type="submit"
                className="w-full rounded-xl bg-[#d91cd2] py-3 text-sm font-bold text-white transition hover:bg-[#c018ba]"
              >
                Save Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* VIEW 1: DASHBOARD */}
        {activeView === 'DASHBOARD' && (
          <div className="space-y-5">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Card 1: Total Spend */}
              <div className="bg-[#101015] border border-zinc-800/90 rounded-3xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {periodHorizon === 'MONTHLY'
                      ? 'Monthly Spend'
                      : periodHorizon === 'WEEKLY'
                      ? 'Weekly Spend'
                      : 'Yearly Spend'}
                  </span>
                  <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-full border border-zinc-800">
                    {['WEEKLY', 'MONTHLY', 'YEARLY'].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setPeriodHorizon(h)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition ${
                          periodHorizon === h ? 'bg-[#d91cd2] text-white' : 'text-zinc-400'
                        }`}
                      >
                        {h.charAt(0)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                  {formatINR(totalPeriodSpend)}
                </div>
              </div>

              {/* Card 2: Top Category */}
              <div className="bg-[#101015] border border-zinc-800/90 rounded-3xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                    Top Category
                  </span>
                  <div className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    {categoryBreakdown[0] ? (
                      <>
                        <CategoryIcon
                          iconKey={categoryBreakdown[0].category.icon}
                          color={categoryBreakdown[0].category.color}
                          size={22}
                        />
                        <span>{categoryBreakdown[0].category.name}</span>
                      </>
                    ) : (
                      'Groceries'
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  {categoryBreakdown[0]
                    ? `${formatINR(categoryBreakdown[0].total)} (${categoryBreakdown[0].percentage}% of total)`
                    : '₹0'}
                </p>
              </div>

              {/* Card 3: Transaction Count */}
              <div className="bg-[#101015] border border-zinc-800/90 rounded-3xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                    Transactions
                  </span>
                  <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                    {filteredTransactionsForPeriod.length}
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  {totalPeriodSpend > 0
                    ? `${formatINR(totalPeriodSpend / filteredTransactionsForPeriod.length || 0)} average per transaction`
                    : 'No transactions in this period'}
                </p>
              </div>

              {/* Card 4: Quick Action */}
              <div className="bg-gradient-to-br from-[#1b1429] to-[#121017] border border-fuchsia-900/40 rounded-3xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-fuchsia-300 uppercase tracking-wider block mb-1">
                    Quick Payment
                  </span>
                  <p className="text-xs text-zinc-300">
                    Pre-fills current date & time
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openNewPaymentScreen()}
                  className="w-full mt-3 py-2.5 rounded-xl bg-[#d91cd2] hover:bg-[#c018ba] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-fuchsia-600/30 transition"
                >
                  <Plus size={15} /> Enter Payment Details
                </button>
              </div>
            </div>

            {/* PC 12-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Trend Curve & Transactions */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-[#101015] border border-zinc-800/90 rounded-3xl p-6 relative">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">
                        Spend Horizon Trend
                      </h2>
                      <p className="text-xs text-zinc-400">
                        Smooth trend curve with highlighted active period
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-[#16161f] p-1 rounded-xl border border-zinc-800">
                      {['WEEKLY', 'MONTHLY', 'YEARLY'].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setPeriodHorizon(h)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                            periodHorizon === h
                              ? 'bg-[#d91cd2] text-white shadow'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {h === 'WEEKLY' ? 'Weekly' : h === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <label
                      htmlFor="trend-category"
                      className="text-[10px] uppercase tracking-wider font-bold text-zinc-500"
                    >
                      Category
                    </label>
                    <div className="relative">
                      <select
                        id="trend-category"
                        value={selectedTrendCategoryId}
                        onChange={(event) => setSelectedTrendCategoryId(event.target.value)}
                        className="appearance-none min-w-40 rounded-lg border border-zinc-800 bg-[#16161f] py-2 pl-3 pr-8 text-xs font-semibold text-zinc-200 outline-none transition focus:border-fuchsia-500/60"
                      >
                        <option value="all">All categories</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
                      />
                    </div>
                  </div>

                  {/* SVG Chart */}
                  <div className="relative h-56 w-full flex items-center justify-center">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="w-full h-full overflow-visible"
                    >
                      {/* Highlight Pill behind active point */}
                      {activePoint && (
                        <rect
                          x={activePoint.x - 22}
                          y={10}
                          width={44}
                          height={chartHeight - 20}
                          rx={22}
                          fill="#1d1d27"
                          opacity="0.9"
                        />
                      )}

                      {/* Main Trend Line */}
                      <path
                        d={buildSmoothPath(chartPoints.slice(0, activePointIndex + 1))}
                        fill="none"
                        stroke="#d91cd2"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />

                      {/* Trailing line */}
                      {activePointIndex < chartPoints.length - 1 && (
                        <path
                          d={buildSmoothPath(chartPoints.slice(activePointIndex))}
                          fill="none"
                          stroke="#52525b"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          opacity="0.4"
                        />
                      )}

                      {/* Data Point Nodes */}
                      {activePoint && (
                        <g>
                          <circle
                            cx={activePoint.x}
                            cy={activePoint.y}
                            r="9"
                            fill="#d91cd2"
                            opacity="0.25"
                          />
                          <circle
                            cx={activePoint.x}
                            cy={activePoint.y}
                            r="6"
                            fill="#d91cd2"
                            stroke="#101015"
                            strokeWidth="2.5"
                          />
                        </g>
                      )}
                    </svg>
                  </div>

                  {/* Period Selector Tabs */}
                  <div className="flex items-center justify-between px-1 mt-3 pt-3 border-t border-zinc-800/80 gap-1">
                    <button
                      type="button"
                      aria-label={`Show previous ${periodHorizon === 'MONTHLY' ? 'months' : periodHorizon === 'WEEKLY' ? 'month of weeks' : 'years'}`}
                      title="Show earlier periods"
                      onClick={() => {
                        if (periodHorizon === 'MONTHLY') {
                          const [year, month] = monthWindowStart.split('-').map(Number);
                          const date = new Date(year, month - 2, 1);
                          setMonthWindowStart(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
                        } else if (periodHorizon === 'WEEKLY') {
                          const [year, month] = selectedWeekMonthKey.split('-').map(Number);
                          const date = new Date(year, month - 2, 1);
                          setSelectedWeekMonthKey(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
                        } else setYearWindowStart((year) => year - 1);
                      }}
                      className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {trendData.map((pt) => {
                      const isSelected = pt.key === activePeriodKey;
                      return (
                        <button
                          key={pt.key}
                          type="button"
                          onClick={() => {
                            if (periodHorizon === 'MONTHLY') setSelectedMonthKey(pt.key);
                            else if (periodHorizon === 'WEEKLY') setSelectedWeekKey(pt.key);
                            else setSelectedYearKey(pt.key);
                          }}
                          className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition ${
                            isSelected
                              ? 'bg-[#c018ba] text-white shadow-lg shadow-fuchsia-600/30'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {pt.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      aria-label={`Show next ${periodHorizon === 'MONTHLY' ? 'months' : periodHorizon === 'WEEKLY' ? 'month of weeks' : 'years'}`}
                      title="Show later periods"
                      onClick={() => {
                        if (periodHorizon === 'MONTHLY') {
                          const [year, month] = monthWindowStart.split('-').map(Number);
                          const date = new Date(year, month, 1);
                          setMonthWindowStart(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
                        } else if (periodHorizon === 'WEEKLY') {
                          const [year, month] = selectedWeekMonthKey.split('-').map(Number);
                          const date = new Date(year, month, 1);
                          setSelectedWeekMonthKey(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
                        } else setYearWindowStart((year) => year + 1);
                      }}
                      className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Transactions Feed */}
                <div className="bg-[#101015] border border-zinc-800/90 rounded-3xl p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAnalyticsSubTab('CATEGORIES')}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                          analyticsSubTab === 'CATEGORIES'
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        All Spends
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnalyticsSubTab('TOP_SPENDS')}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                          analyticsSubTab === 'TOP_SPENDS'
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Top Spends
                      </button>
                    </div>

                    <span className="text-xs text-zinc-400">
                      {filteredTransactionsForPeriod.length} transactions
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {[...filteredTransactionsForPeriod]
                      .sort((a, b) =>
                        analyticsSubTab === 'TOP_SPENDS'
                          ? b.amount - a.amount
                          : b.transactionDate.localeCompare(a.transactionDate)
                      )
                      .slice(0, 10)
                      .map((tx) => {
                        const cat =
                          categories.find((c) => c.id === tx.categoryId) || categories[1];
                        return (
                          <div
                            key={tx.id}
                            onClick={() => {
                              setSelectedTxId(tx.id);
                              setPendingCategoryId(tx.categoryId);
                              setIsReceiptModalOpen(true);
                            }}
                            className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/90 border border-zinc-800/60 hover:border-zinc-700 cursor-pointer transition"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                style={{
                                  backgroundColor: tx.avatarBg || '#1e293b',
                                  color: tx.avatarColor || '#94a3b8'
                                }}
                                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                              >
                                {tx.merchantName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">
                                  {tx.merchantName}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-0.5">
                                  <span className="text-zinc-300 font-medium">{cat.name}</span>
                                  <span>•</span>
                                  <span>{formatShortDate(tx.transactionDate)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p
                                className={`text-sm font-bold ${
                                  tx.excludedFromTotal ? 'text-zinc-500' : 'text-white'
                                }`}
                              >
                                {formatINR(tx.amount)}
                              </p>
                              <span className="text-[10px] text-zinc-400 block">
                                {tx.note || 'UPI'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Right Column (5 cols): Category Breakdown */}
              <div className="lg:col-span-5 self-start lg:self-stretch bg-[#101015] border border-zinc-800/90 rounded-3xl p-5 flex flex-col">
                <div className="lg:flex lg:flex-1 lg:min-h-0 lg:flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">
                        Category Breakdown
                      </h2>
                      <p className="text-xs text-zinc-400">
                        Click any category to drill into its transaction history
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4 lg:flex-1 lg:min-h-0">
                    <div className="relative w-full max-w-[220px] aspect-square">
                      <svg
                        viewBox="0 0 220 220"
                        className="w-full h-full"
                        role="img"
                        aria-label="Category spending breakdown pie chart"
                        onMouseLeave={() => setHoveredPieSlice(null)}
                      >
                        <circle
                          cx="110"
                          cy="110"
                          r="84"
                          fill="#181822"
                          stroke="#27272a"
                          strokeWidth="1"
                        />
                        {categoryPieSlices.map((slice) => (
                          slice.percentage >= 99.999 ? (
                            <circle
                              key={slice.category.id}
                              cx="110"
                              cy="110"
                              r="84"
                              fill={slice.category.color}
                              stroke="#101015"
                              strokeWidth={hoveredPieSlice?.category.id === slice.category.id ? 4 : 2}
                              className="cursor-pointer transition-opacity"
                              onMouseEnter={() => setHoveredPieSlice(slice)}
                              onMouseMove={() => setHoveredPieSlice(slice)}
                              onClick={() => {
                                setSelectedCategoryId(slice.category.id);
                                setActiveView('CATEGORY_DRILLDOWN');
                              }}
                            >
                              <title>
                                {slice.category.name}: {formatINR(slice.total)} (
                                {Math.round(slice.percentage)}%)
                              </title>
                            </circle>
                          ) : (
                            <path
                            key={slice.category.id}
                            d={describePieSlice(
                              110,
                              110,
                              84,
                              slice.startAngle,
                              slice.endAngle
                            )}
                            fill={slice.category.color}
                            stroke="#101015"
                            strokeWidth={hoveredPieSlice?.category.id === slice.category.id ? 4 : 2}
                            className={`cursor-pointer transition-opacity ${
                              hoveredPieSlice && hoveredPieSlice.category.id !== slice.category.id
                                ? 'opacity-45'
                                : 'opacity-90 hover:opacity-100'
                            }`}
                            onMouseEnter={() => setHoveredPieSlice(slice)}
                            onMouseMove={() => setHoveredPieSlice(slice)}
                            onClick={() => {
                              setSelectedCategoryId(slice.category.id);
                              setActiveView('CATEGORY_DRILLDOWN');
                            }}
                          >
                            <title>
                              {slice.category.name}: {formatINR(slice.total)} (
                              {Math.round(slice.percentage)}%)
                            </title>
                            </path>
                          )
                        ))}
                        <circle cx="110" cy="110" r="51" fill="#101015" />
                        <text
                          x="110"
                          y="105"
                          textAnchor="middle"
                          fill="#a1a1aa"
                          fontSize="9"
                          fontWeight="600"
                        >
                          PERIOD SPEND
                        </text>
                        <text
                          x="110"
                          y="122"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="13"
                          fontWeight="800"
                        >
                          {formatINR(totalPeriodSpend)}
                        </text>
                      </svg>
                      {hoveredPieSlice && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="rounded-xl border border-fuchsia-500/40 bg-[#181820]/95 px-3 py-2 text-center shadow-xl">
                            <p className="max-w-28 truncate text-[10px] font-semibold text-zinc-400">
                              {hoveredPieSlice.category.name}
                            </p>
                            <p className="text-sm font-bold text-white">
                              {formatINR(hoveredPieSlice.total)}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {Math.round(hoveredPieSlice.percentage)}% of period
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="w-full space-y-1.5 max-h-[260px] overflow-y-auto pr-2 lg:max-h-none lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:flex lg:flex-col">
                    {categoryPieSlices.map((item) => (
                      <button
                        key={item.category.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(item.category.id);
                          setActiveView('CATEGORY_DRILLDOWN');
                        }}
                        className="w-full shrink-0 text-left group p-2 rounded-xl hover:bg-zinc-900/70 border border-transparent hover:border-zinc-800 transition flex items-center gap-2.5"
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.category.color }}
                        />
                        <div className="w-8 h-8 rounded-full bg-[#181822] border border-zinc-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                          <CategoryIcon
                            iconKey={item.category.icon}
                            color={item.category.color}
                            size={15}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-zinc-100 group-hover:text-white truncate">
                              {item.category.name}
                            </span>
                            <span className="text-xs font-bold text-white">
                              {formatINR(item.total)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-zinc-400 w-10 text-right">
                              {Math.round(item.percentage)}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(item.percentage, 100)}%`,
                                backgroundColor: item.category.color
                              }}
                            />
                          </div>
                        </div>
                      </button>
                    ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CATEGORY DRILL-DOWN */}
        {activeView === 'CATEGORY_DRILLDOWN' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#101015] border border-zinc-800 rounded-3xl p-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveView('DASHBOARD')}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <CategoryIcon
                      iconKey={drilldownCategory.icon}
                      color={drilldownCategory.color}
                      size={24}
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{drilldownCategory.name}</h1>
                    <p className="text-xs text-zinc-400">
                      Category Transaction Drill-Down & Spend Analysis
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-zinc-400">
                  {periodHorizon === 'MONTHLY' ? 'Oct Spends' : `${selectedWeekKey} Spends`}
                </span>
                <div className="text-3xl font-extrabold text-white">
                  {formatINR(drilldownTotal)}
                </div>
              </div>
            </div>

            {/* Category Carousel */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 border transition flex items-center gap-1.5 ${
                    c.id === selectedCategoryId
                      ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300 shadow-md'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <CategoryIcon iconKey={c.icon} color={c.color} size={14} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>

            {/* Transactions List */}
            <div className="bg-[#101015] border border-zinc-800 rounded-3xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="text-base font-bold text-white">
                  Transactions • {drilldownTransactions.length}
                </h2>

                <div className="flex items-center gap-3">
                  <div className="relative w-56 sm:w-72">
                    <Search size={14} className="absolute left-3.5 top-3 text-zinc-500" />
                    <input
                      type="text"
                      value={drilldownSearch}
                      onChange={(e) => setDrilldownSearch(e.target.value)}
                      placeholder={`Search in ${drilldownCategory.name}...`}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-500"
                    />
                  </div>

                  <select
                    value={drilldownSort}
                    onChange={(e) => setDrilldownSort(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-500"
                  >
                    <option value="AMOUNT_DESC">Amount: High to Low</option>
                    <option value="AMOUNT_ASC">Amount: Low to High</option>
                    <option value="DATE_DESC">Date: Newest First</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => openNewPaymentScreen(drilldownCategory.id)}
                    className="px-3.5 py-2 rounded-xl bg-[#d91cd2] hover:bg-[#c018ba] text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Plus size={14} /> Add Spend
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {drilldownTransactions.length === 0 ? (
                  <div className="text-center py-16 text-zinc-500 text-sm">
                    No transactions found for {drilldownCategory.name} in this period.
                  </div>
                ) : (
                  drilldownTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => {
                        setSelectedTxId(tx.id);
                        setPendingCategoryId(tx.categoryId);
                        setIsReceiptModalOpen(true);
                      }}
                      className="p-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 flex flex-wrap items-center justify-between gap-4 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          style={{
                            backgroundColor: tx.avatarBg || '#1e293b',
                            color: tx.avatarColor || '#94a3b8'
                          }}
                          className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shrink-0"
                        >
                          {tx.merchantName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-bold text-white truncate">
                            {tx.merchantName}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-1">
                            <span>{formatShortDate(tx.transactionDate)}</span>
                            {tx.transactionTime && (
                              <span>• {format12HourTime(tx.transactionTime)}</span>
                            )}
                            {tx.note && (
                              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                {tx.note}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-lg font-extrabold ${
                            tx.excludedFromTotal ? 'text-zinc-500' : 'text-white'
                          }`}
                        >
                          {formatINR(tx.amount)}
                        </span>
                        <p className="text-[11px] text-zinc-500">Click to view receipt & edit</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: ENTER PAYMENT */}
        {activeView === 'ENTER_PAYMENT' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between bg-[#101015] border border-zinc-800 rounded-3xl p-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveView('DASHBOARD')}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                >
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {editingTxId ? 'Edit Payment Details' : 'Enter Payment Details'}
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Smart date/time defaults for accurate expense tracking
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSavePayment} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Input Column */}
              <div className="lg:col-span-12 bg-[#101015] border border-zinc-800 rounded-3xl p-6 space-y-5">
                {/* Amount */}
                <div className="bg-[#16161e] border border-zinc-800 rounded-2xl p-5 text-center">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Amount (₹) *
                  </label>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-4xl font-bold text-zinc-500">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(e) => {
                        setPaymentForm({ ...paymentForm, amount: e.target.value });
                        if (formErrors.amount) setFormErrors({ ...formErrors, amount: null });
                      }}
                      placeholder="215"
                      className="w-48 bg-transparent text-4xl font-extrabold text-white text-center focus:outline-none"
                    />
                  </div>
                  {formErrors.amount && (
                    <p className="text-xs text-rose-400 mt-1">{formErrors.amount}</p>
                  )}
                  <div className="flex items-center justify-center gap-2 mt-3">
                    {[90, 215, 500, 1600, 2500, 24500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPaymentForm({ ...paymentForm, amount: String(amt) })}
                        className="px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
                      >
                        ₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payee / Merchant */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                    Paid To (Merchant or Recipient) *
                  </label>
                  <input
                    type="text"
                    value={paymentForm.merchantName}
                    onChange={(e) => {
                      setPaymentForm({ ...paymentForm, merchantName: e.target.value });
                      if (formErrors.merchantName)
                        setFormErrors({ ...formErrors, merchantName: null });
                    }}
                    placeholder="e.g., Instamart, Zepto, Mangi Lal Gadri"
                    className="w-full bg-[#16161e] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                  />
                  {formErrors.merchantName && (
                    <p className="text-xs text-rose-400 mt-1">{formErrors.merchantName}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['Instamart', 'Zepto', 'Swiggy', 'Uber India', 'Mangi Lal Gadri'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentForm({ ...paymentForm, merchantName: m })}
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    className={`bg-[#16161e] border rounded-2xl p-4 ${
                      formErrors.transactionDate ? 'border-rose-500/70' : 'border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
                        <Calendar size={13} className="text-fuchsia-400" /> Transaction Date
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold">
                        {paymentForm.isDateModified ? 'Custom' : 'Default: Today'}
                      </span>
                    </div>
                    {!isEditingDateInline ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingDateInline(true)}
                        className="w-full text-left mt-1 py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-between"
                      >
                        <span className="text-sm font-bold text-white">
                          {formatShortDate(paymentForm.transactionDate)}
                        </span>
                        <span className="text-xs text-fuchsia-400 underline">Change</span>
                      </button>
                    ) : (
                      <input
                        type="date"
                        value={paymentForm.transactionDate}
                        onChange={(e) => {
                          const pickedDate = e.target.value;
                          setPaymentForm({
                            ...paymentForm,
                            transactionDate: pickedDate,
                            isDateModified: true
                          });
                          if (pickedDate > getNowDateString()) {
                            setFormErrors({
                              ...formErrors,
                              transactionDate: 'Invalid date: cannot select future date'
                            });
                          } else if (formErrors.transactionDate) {
                            setFormErrors({ ...formErrors, transactionDate: null });
                          }
                        }}
                        onBlur={() => setIsEditingDateInline(false)}
                        className="w-full mt-1 bg-zinc-900 border border-fuchsia-500 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    )}
                    {formErrors.transactionDate && (
                      <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1 font-medium">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{formErrors.transactionDate}</span>
                      </p>
                    )}
                  </div>

                  <div className="bg-[#16161e] border border-zinc-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
                        <Clock size={13} className="text-fuchsia-400" /> Time (Optional)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPaymentForm((prev) => ({ ...prev, includeTime: !prev.includeTime }))
                        }
                        className="text-[10px] text-zinc-400 hover:text-white underline"
                      >
                        {paymentForm.includeTime ? 'Default: Now' : 'Skipped'}
                      </button>
                    </div>
                    {paymentForm.includeTime ? (
                      !isEditingTimeInline ? (
                        <button
                          type="button"
                          onClick={() => setIsEditingTimeInline(true)}
                          className="w-full text-left mt-1 py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-between"
                        >
                          <span className="text-sm font-bold text-white">
                            {format12HourTime(paymentForm.transactionTime)}
                          </span>
                          <span className="text-xs text-fuchsia-400 underline">Change</span>
                        </button>
                      ) : (
                        <input
                          type="time"
                          value={paymentForm.transactionTime}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
                              transactionTime: e.target.value,
                              isTimeModified: true
                            })
                          }
                          onBlur={() => setIsEditingTimeInline(false)}
                          className="w-full mt-1 bg-zinc-900 border border-fuchsia-500 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                      )
                    ) : (
                      <div className="mt-1 py-1.5 px-3 text-xs text-zinc-500 italic">
                        No time attached
                      </div>
                    )}
                  </div>
                </div>

                {/* Category Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-zinc-400">
                      Category * (22 Options)
                    </label>
                    <span className="text-xs font-bold text-emerald-400">
                      Selected:{' '}
                      {categories.find((c) => c.id === Number(paymentForm.categoryId))?.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-3 bg-[#16161e] border border-zinc-800 rounded-2xl">
                    {categories.map((cat) => {
                      const selected = Number(paymentForm.categoryId) === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setPaymentForm({ ...paymentForm, categoryId: cat.id })}
                          style={{
                            backgroundColor: selected ? '#0d3b22' : '#111116',
                            borderColor: selected ? '#22c55e' : '#27272a'
                          }}
                          className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition ${
                            selected ? 'text-[#22c55e] shadow-sm' : 'text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          <CategoryIcon
                            iconKey={cat.icon}
                            color={selected ? '#22c55e' : cat.color}
                            size={14}
                          />
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                    placeholder="Notes: UPI"
                    className="w-full bg-[#16161e] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-[#d91cd2] hover:bg-[#c018ba] text-white font-bold text-sm shadow-xl shadow-fuchsia-600/30 transition"
                >
                  {editingTxId ? 'Save Updated Payment' : 'Confirm & Save Payment'}
                </button>
              </div>

            </form>
          </div>
        )}
      </main>

      {/* MODAL: RECEIPT & EDIT CATEGORY */}
      {isReceiptModalOpen && selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#141418] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
            {/* Receipt Left Side */}
            <div className="md:w-5/12 bg-[#1c1c22] p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-800">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300">
                    Payment Voucher
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditPaymentScreen(selectedTransaction)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      title="Edit transaction details"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTransaction(selectedTransaction.id)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300"
                      title="Delete transaction"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-extrabold text-white">
                      Paid {formatINR(selectedTransaction.amount)}
                    </h2>
                    <p className="text-base font-semibold text-zinc-200 mt-2">
                      To {selectedTransaction.merchantName}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {formatShortDate(selectedTransaction.transactionDate)}
                      {selectedTransaction.transactionTime
                        ? `, ${format12HourTime(selectedTransaction.transactionTime)}`
                        : ''}
                    </p>
                  </div>

                  <div className="w-12 h-12 rounded-full bg-[#2e593f] border-2 border-[#4ade80]/40 flex items-center justify-center shadow-inner shrink-0">
                    <Check size={24} className="text-[#4ade80] stroke-[2.5]" />
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="px-3 py-1.5 rounded-xl bg-zinc-800/80 text-xs text-zinc-300 font-medium">
                    Notes: {selectedTransaction.note || 'UPI'}
                  </div>
                </div>
              </div>

            </div>

            {/* Category Selector Right Side */}
            <div className="md:w-7/12 bg-[#0d0d10] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Edit category</h3>
                  <button
                    type="button"
                    onClick={() => setIsReceiptModalOpen(false)}
                    className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const isSelected = pendingCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPendingCategoryId(cat.id)}
                        style={{
                          backgroundColor: isSelected ? '#0d3b22' : '#141419',
                          borderColor: isSelected ? '#22c55e' : '#27272a'
                        }}
                        className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? 'text-[#22c55e] shadow-sm'
                            : 'text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <CategoryIcon
                          iconKey={cat.icon}
                          color={isSelected ? '#22c55e' : cat.color}
                          size={14}
                        />
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleUpdateCategoryFromReceipt}
                  className="w-full py-3.5 rounded-full bg-[#d91cd2] hover:bg-[#c018ba] text-white font-bold text-sm shadow-lg shadow-fuchsia-600/30 transition"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

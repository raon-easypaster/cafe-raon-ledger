
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY_TRANSACTIONS = 'cafe_raon_transactions';
const STORAGE_KEY_RECEIVABLES = 'cafe_raon_receivables';

// Helper to get data from local storage
const getStoredData = (key) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// Helper to save data to local storage
const setStoredData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const TransactionType = {
  EXPENSE: 'expense',
  SALES: 'sales',
};

export const FinanceType = {
  GENERAL: 'general',
  SPECIAL: 'special',
};

// --- Transactions (Sales & Expenses) ---

export const getAllTransactions = () => {
  return getStoredData(STORAGE_KEY_TRANSACTIONS).sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const addTransaction = (transaction) => {
  const transactions = getStoredData(STORAGE_KEY_TRANSACTIONS);
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const newTransaction = { ...transaction, id: uuidv4(), date: transaction.date || localDate };
  transactions.push(newTransaction);
  setStoredData(STORAGE_KEY_TRANSACTIONS, transactions);
  return newTransaction;
};

export const deleteTransaction = (id) => {
  const transactions = getStoredData(STORAGE_KEY_TRANSACTIONS);
  const filtered = transactions.filter(t => t.id !== id);
  setStoredData(STORAGE_KEY_TRANSACTIONS, filtered);
};

export const updateTransaction = (id, updatedData) => {
  const transactions = getStoredData(STORAGE_KEY_TRANSACTIONS);
  const index = transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    transactions[index] = { ...transactions[index], ...updatedData };
    setStoredData(STORAGE_KEY_TRANSACTIONS, transactions);
  }
};

// --- Receivables ---

export const getReceivables = () => {
  return getStoredData(STORAGE_KEY_RECEIVABLES).sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const addReceivable = (receivable) => {
  const list = getStoredData(STORAGE_KEY_RECEIVABLES);
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const newItem = {
    ...receivable,
    id: uuidv4(),
    status: 'unpaid',
    date: receivable.date || localDate
  };
  list.push(newItem);
  setStoredData(STORAGE_KEY_RECEIVABLES, list);
  return newItem;
};

export const updateReceivableStatus = (id, status) => {
  const list = getStoredData(STORAGE_KEY_RECEIVABLES);
  const index = list.findIndex(r => r.id === id);
  if (index !== -1) {
    list[index].status = status;
    setStoredData(STORAGE_KEY_RECEIVABLES, list);
  }
};

export const deleteReceivable = (id) => {
  const list = getStoredData(STORAGE_KEY_RECEIVABLES);
  const filtered = list.filter(r => r.id !== id);
  setStoredData(STORAGE_KEY_RECEIVABLES, filtered);
};

// --- Reporting & Calculations ---

export const getDonorList = () => {
  const transactions = getAllTransactions();
  // Filter for items that might be donor names (from sales)
  const donors = transactions
    .filter(t => t.category === TransactionType.SALES || t.category === 'sales')
    .map(t => t.item)
    .filter(i => i && typeof i === 'string' && i.trim() !== '');

  return [...new Set(donors)].sort((a, b) => a.localeCompare(b, 'ko'));
};

export const getSummary = (timeframe, date) => {
  // timeframe: 'day', 'month', 'year'
  // date: Date object or string
  const transactions = getAllTransactions();
  const targetDate = new Date(date);

  let filtered = transactions.filter(t => {
    const tDate = new Date(t.date);
    if (timeframe === 'day') {
      return tDate.toDateString() === targetDate.toDateString();
    } else if (timeframe === 'week') {
      const startOfWeek = new Date(targetDate);
      const day = startOfWeek.getDay(); // 0 (Sun) to 6 (Sat)
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return tDate >= startOfWeek && tDate <= endOfWeek;
    } else if (timeframe === 'month') {
      return tDate.getMonth() === targetDate.getMonth() && tDate.getFullYear() === targetDate.getFullYear();
    } else if (timeframe === 'year') {
      return tDate.getFullYear() === targetDate.getFullYear();
    }
    return false;
  });

  const sales = filtered.filter(t => t.category === TransactionType.SALES);
  const expenses = filtered.filter(t => t.category === TransactionType.EXPENSE);

  const calculateTotal = (list) => list.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // General Finance
  const generalSales = sales.filter(t => !t.financeType || t.financeType === FinanceType.GENERAL);
  const generalExpenses = expenses.filter(t => !t.financeType || t.financeType === FinanceType.GENERAL);
  const totalGeneralSales = calculateTotal(generalSales);
  const totalGeneralExpenses = calculateTotal(generalExpenses);
  const generalBalance = totalGeneralSales - totalGeneralExpenses;

  // Special Finance
  const specialSales = sales.filter(t => t.financeType === FinanceType.SPECIAL);
  const specialExpenses = expenses.filter(t => t.financeType === FinanceType.SPECIAL);
  const totalSpecialSales = calculateTotal(specialSales);
  const totalSpecialExpenses = calculateTotal(specialExpenses);
  const specialBalance = totalSpecialSales - totalSpecialExpenses;

  // Grand Total
  const totalSales = totalGeneralSales + totalSpecialSales;
  const totalExpenses = totalGeneralExpenses + totalSpecialExpenses;
  const totalBalance = totalSales - totalExpenses;

  // Breakdown by payment type for Sales (Total)
  const salesByType = sales.reduce((acc, t) => {
    acc[t.method] = (acc[t.method] || 0) + Number(t.amount || 0);
    return acc;
  }, {});

  // Breakdown by payment type for Expenses (Total)
  const expensesByType = expenses.reduce((acc, t) => {
    acc[t.method] = (acc[t.method] || 0) + Number(t.amount || 0);
    return acc;
  }, {});

  return {
    totalSales,
    totalExpenses,
    totalBalance,
    totalGeneralSales,
    totalGeneralExpenses,
    generalBalance,
    totalSpecialSales,
    totalSpecialExpenses,
    specialBalance,
    salesByType,
    expensesByType,
    transactions: filtered
  };
};

export const getYearlyComparison = (year) => {
  const currentYearData = getSummary('year', new Date(year, 0, 1));
  const lastYearData = getSummary('year', new Date(year - 1, 0, 1));

  return {
    currentTotal: currentYearData.totalSales,
    lastTotal: lastYearData.totalSales,
    growth: lastYearData.totalSales === 0 ? 100 : ((currentYearData.totalSales - lastYearData.totalSales) / lastYearData.totalSales) * 100
  };
};

export const getMonthlyComparison = (date) => {
  const targetDate = new Date(date);
  const currentMonthData = getSummary('month', targetDate);

  const lastYearDate = new Date(targetDate);
  lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
  const lastMonthData = getSummary('month', lastYearDate);

  return {
    currentTotal: currentMonthData.totalSales,
    lastTotal: lastMonthData.totalSales,
    growth: lastMonthData.totalSales === 0 ? 100 : ((currentMonthData.totalSales - lastMonthData.totalSales) / lastMonthData.totalSales) * 100
  };
};

export const getWeeklyComparison = (date) => {
  const targetDate = new Date(date);
  const currentWeekData = getSummary('week', targetDate);

  const lastYearDate = new Date(targetDate);
  lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
  const lastWeekData = getSummary('week', lastYearDate);

  return {
    currentTotal: currentWeekData.totalSales,
    lastTotal: lastWeekData.totalSales,
    growth: lastWeekData.totalSales === 0 ? 100 : ((currentWeekData.totalSales - lastWeekData.totalSales) / lastWeekData.totalSales) * 100
  };
};

export const getTotalReceivables = () => {
  const list = getReceivables();
  return list.filter(r => r.status === 'unpaid').reduce((sum, r) => sum + Number(r.amount || 0), 0);
};

export const getTrendData = (timeframe, date) => {
  const transactions = getAllTransactions();
  const targetDate = new Date(date);
  let labels = [];

  if (timeframe === 'week') {
    const startOfWeek = new Date(targetDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      labels.push({ date: d, label: `${d.getMonth() + 1}/${d.getDate()}` });
    }
  } else if (timeframe === 'month') {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      labels.push({ date: d, label: `${i}일` });
    }
  } else if (timeframe === 'year') {
    const year = targetDate.getFullYear();
    for (let i = 0; i < 12; i++) {
      const d = new Date(year, i, 1);
      labels.push({ date: d, label: `${i + 1}월`, type: 'month' });
    }
  } else {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() - i);
      labels.push({ date: d, label: `${d.getMonth() + 1}/${d.getDate()}` });
    }
  }

  // Calculate cumulative balance up to the points
  // Sort all transactions by date asc to calculate balance
  const allSorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  return labels.map(point => {
    const summary = point.type === 'month' ? getSummary('month', point.date) : getSummary('day', point.date);

    // Calculate cumulative balance up to the end of this point
    const pointEndOfDay = new Date(point.date);
    if (point.type === 'month') {
      pointEndOfDay.setMonth(pointEndOfDay.getMonth() + 1, 0); // Last day of month
    }
    pointEndOfDay.setHours(23, 59, 59, 999);

    const balanceUpToPoint = allSorted
      .filter(t => new Date(t.date) <= pointEndOfDay)
      .reduce((sum, t) => {
        const amount = Number(t.amount || 0);
        return t.category === TransactionType.SALES ? sum + amount : sum - amount;
      }, 0);

    return {
      label: point.label,
      sales: summary.totalSales,
      expenses: summary.totalExpenses,
      net: summary.totalBalance, // This is net for the period from summary
      balance: balanceUpToPoint // This is the cumulative total balance
    };
  });
};
// --- Database Management (Export/Import) ---

export const exportDatabase = () => {
  return {
    transactions: getStoredData(STORAGE_KEY_TRANSACTIONS),
    receivables: getStoredData(STORAGE_KEY_RECEIVABLES),
    version: '1.0',
    exportedAt: new Date().toISOString()
  };
};

export const importDatabase = (data) => {
  if (!data || !data.transactions || !data.receivables) {
    throw new Error('올바르지 않은 장부 데이터 형식입니다.');
  }
  setStoredData(STORAGE_KEY_TRANSACTIONS, data.transactions);
  setStoredData(STORAGE_KEY_RECEIVABLES, data.receivables);
};

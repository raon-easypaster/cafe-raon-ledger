import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY_TRANSACTIONS = 'cafe_raon_transactions';
const STORAGE_KEY_RECEIVABLES = 'cafe_raon_receivables';
const STORAGE_KEY_COFFEE_SUPPLY = 'cafe_raon_coffee_supply';

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

// --- Coffee Bean Supply ---

export const getCoffeeSupplies = () => {
    return getStoredData(STORAGE_KEY_COFFEE_SUPPLY).sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const addCoffeeSupply = (record) => {
    const list = getStoredData(STORAGE_KEY_COFFEE_SUPPLY);
    const newRecord = {
        ...record,
        id: uuidv4(),
        date: record.date || new Date().toISOString().split('T')[0]
    };
    list.push(newRecord);
    setStoredData(STORAGE_KEY_COFFEE_SUPPLY, list);
    return newRecord;
};

export const updateCoffeeSupply = (id, updatedData) => {
    const list = getStoredData(STORAGE_KEY_COFFEE_SUPPLY);
    const index = list.findIndex(r => r.id === id);
    if (index !== -1) {
        list[index] = { ...list[index], ...updatedData };
        setStoredData(STORAGE_KEY_COFFEE_SUPPLY, list);
    }
};

export const deleteCoffeeSupply = (id) => {
    const list = getStoredData(STORAGE_KEY_COFFEE_SUPPLY);
    const filtered = list.filter(r => r.id !== id);
    setStoredData(STORAGE_KEY_COFFEE_SUPPLY, filtered);
};

// --- Reporting & Calculations ---

export const getSummary = (timeframe, date) => {
    const transactions = getAllTransactions();
    const targetDate = new Date(date);

    let filtered = transactions.filter(t => {
        const tDate = new Date(t.date);
        if (timeframe === 'day') {
            return tDate.toDateString() === targetDate.toDateString();
        } else if (timeframe === 'week') {
            const startOfWeek = new Date(targetDate);
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
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

    const totalSales = sales.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const netIncome = totalSales - totalExpenses;

    const salesByType = sales.reduce((acc, t) => {
        acc[t.method] = (acc[t.method] || 0) + Number(t.amount || 0);
        return acc;
    }, {});

    const expensesByType = expenses.reduce((acc, t) => {
        acc[t.method] = (acc[t.method] || 0) + Number(t.amount || 0);
        return acc;
    }, {});

    return {
        totalSales,
        totalExpenses,
        netIncome,
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
        growth: lastYearData.totalSales === 0 ? 100 : ((currentYearData.totalSales - lastYearData.totalSales) / lastYearData.totalSales) * 100,
        currentNetIncome: currentYearData.netIncome,
        lastNetIncome: lastYearData.netIncome,
        netIncomeGrowth: lastYearData.netIncome === 0 ? (currentYearData.netIncome > 0 ? 100 : 0) :
            ((currentYearData.netIncome - lastYearData.netIncome) / Math.abs(lastYearData.netIncome)) * 100
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
        growth: lastMonthData.totalSales === 0 ? 100 : ((currentMonthData.totalSales - lastMonthData.totalSales) / lastMonthData.totalSales) * 100,
        currentNetIncome: currentMonthData.netIncome,
        lastNetIncome: lastMonthData.netIncome,
        netIncomeGrowth: lastMonthData.netIncome === 0 ? (currentMonthData.netIncome > 0 ? 100 : 0) :
            ((currentMonthData.netIncome - lastMonthData.netIncome) / Math.abs(lastMonthData.netIncome)) * 100
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
        growth: lastWeekData.totalSales === 0 ? 100 : ((currentWeekData.totalSales - lastWeekData.totalSales) / lastWeekData.totalSales) * 100,
        currentNetIncome: currentWeekData.netIncome,
        lastNetIncome: lastWeekData.netIncome,
        netIncomeGrowth: lastWeekData.netIncome === 0 ? (currentWeekData.netIncome > 0 ? 100 : 0) :
            ((currentWeekData.netIncome - lastWeekData.netIncome) / Math.abs(lastWeekData.netIncome)) * 100
    };
};

export const getTotalReceivables = () => {
    const list = getReceivables();
    return list.filter(r => r.status === 'unpaid').reduce((sum, r) => sum + Number(r.amount || 0), 0);
};

export const getTrendData = (timeframe, date) => {
    const targetDate = new Date(date);
    let data = [];

    if (timeframe === 'week') {
        const startOfWeek = new Date(targetDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);

        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            const daySummary = getSummary('day', d);
            data.push({
                label: `${d.getMonth() + 1}/${d.getDate()}`,
                sales: daySummary.totalSales,
                expenses: daySummary.totalExpenses,
                net: daySummary.netIncome
            });
        }
    } else if (timeframe === 'month') {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            const daySummary = getSummary('day', d);
            data.push({
                label: `${i}일`,
                sales: daySummary.totalSales,
                expenses: daySummary.totalExpenses,
                net: daySummary.netIncome
            });
        }
    } else if (timeframe === 'year') {
        const year = targetDate.getFullYear();
        for (let i = 0; i < 12; i++) {
            const d = new Date(year, i, 1);
            const monthSummary = getSummary('month', d);
            data.push({
                label: `${i + 1}월`,
                sales: monthSummary.totalSales,
                expenses: monthSummary.totalExpenses,
                net: monthSummary.netIncome
            });
        }
    } else if (timeframe === 'day') {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(targetDate);
            d.setDate(d.getDate() - i);
            const daySummary = getSummary('day', d);
            data.push({
                label: `${d.getMonth() + 1}/${d.getDate()}`,
                sales: daySummary.totalSales,
                expenses: daySummary.totalExpenses,
                net: daySummary.netIncome
            });
        }
    }

    return data;
};

// --- Database Management (Export/Import) ---

export const exportDatabase = () => {
    return {
        transactions: getStoredData(STORAGE_KEY_TRANSACTIONS),
        receivables: getStoredData(STORAGE_KEY_RECEIVABLES),
        coffeeSupply: getStoredData(STORAGE_KEY_COFFEE_SUPPLY),
        version: '1.1',
        exportedAt: new Date().toISOString()
    };
};

export const importDatabase = (data) => {
    if (!data || !data.transactions || !data.receivables) {
        throw new Error('올바르지 않은 장부 데이터 형식입니다.');
    }
    setStoredData(STORAGE_KEY_TRANSACTIONS, data.transactions);
    setStoredData(STORAGE_KEY_RECEIVABLES, data.receivables);
    if (data.coffeeSupply) {
        setStoredData(STORAGE_KEY_COFFEE_SUPPLY, data.coffeeSupply);
    }
};

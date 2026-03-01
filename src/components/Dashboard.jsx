
import React, { useState, useEffect } from 'react';
import { getSummary, getYearlyComparison, deleteTransaction, getTrendData, getTotalReceivables, getMonthlyComparison, updateTransaction, getWeeklyComparison, exportDatabase, importDatabase, getAllTransactions, getReceivables } from '../utils/storage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector, LineChart, Line, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Trash2, Coins, Search, Pencil, X, Printer, ChevronLeft, ChevronRight, Maximize2, Minimize2, FileDown, Cloud, Database, Upload, Download, Settings, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import * as GoogleDrive from '../utils/googleDrive';
import * as XLSX from 'xlsx';

const COLORS = ['#5D4037', '#8D6E63', '#A1887F', '#D7CCC8', '#EFEBE9', '#FFCC80'];
const METHOD_MAP = {
    card: '카드',
    cash: '현금',
    tax_invoice: '세금계산서',
    online: '온라인(네이버/배달)',
    corporate_cash: '거래처 현금',
    other: '기타',
    proof: '지출증빙'
};

const Dashboard = ({ refreshTrigger }) => {
    const [period, setPeriod] = useState('day');
    const [date, setDate] = useState(new Date());
    const [dateHistory, setDateHistory] = useState([new Date()]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [summary, setSummary] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [totalReceivables, setTotalReceivables] = useState(0);
    const [comparison, setComparison] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingTx, setEditingTx] = useState(null);
    const [maximizedChart, setMaximizedChart] = useState(null);
    const [searchType, setSearchType] = useState('all');

    const [showSettings, setShowSettings] = useState(false);
    const [googleClientId, setGoogleClientId] = useState(localStorage.getItem('cafe_raon_google_client_id') || '');
    const [syncStatus, setSyncStatus] = useState('idle');
    const [lastSync, setLastSync] = useState(localStorage.getItem('cafe_raon_last_sync') || null);
    const [categoryBreakdown, setCategoryBreakdown] = useState({ sales: [], expenses: [] });
    const [pendingAction, setPendingAction] = useState(null); // 'upload' or 'download'

    const dateInputRef = React.useRef(null);

    const getLocalDateString = (d) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    useEffect(() => {
        loadData();
        if (refreshTrigger > 0 && syncStatus === 'success') {
            handleCloudUpload();
        }
    }, [period, date, refreshTrigger]);

    useEffect(() => {
        const init = () => {
            if (googleClientId && window.google) {
                GoogleDrive.initGoogleDrive(googleClientId, (status, detail) => {
                    if (status === 'authenticated') {
                        if (pendingAction === 'upload') {
                            handleCloudUpload();
                        } else {
                            setSyncStatus('syncing');
                            handleCloudDownload();
                        }
                        setPendingAction(null);
                    } else if (status === 'error') {
                        setSyncStatus('error');
                        alert('구글 연동 중 오류가 발생했습니다: ' + detail);
                    }
                });
            }
        };

        if (window.google) {
            init();
        } else {
            const checkGoogle = setInterval(() => {
                if (window.google) {
                    init();
                    clearInterval(checkGoogle);
                }
            }, 500);
            return () => clearInterval(checkGoogle);
        }
    }, [googleClientId, pendingAction]);

    // 5-minute auto-sync mechanism
    useEffect(() => {
        let interval;
        if (syncStatus === 'success' && googleClientId) {
            interval = setInterval(() => {
                console.log('Auto-syncing to Google Drive...');
                handleCloudUpload();
            }, 5 * 60 * 1000); // 5 minutes
        }
        return () => clearInterval(interval);
    }, [syncStatus, googleClientId]);

    const handleCloudSync = async () => {
        if (!googleClientId) {
            setShowSettings(true);
            return;
        }
        setSyncStatus('authenticating');
        GoogleDrive.authenticate();
    };

    const handleCloudDownload = async () => {
        try {
            const file = await GoogleDrive.findSyncFile();
            if (file) {
                const cloudData = await GoogleDrive.downloadFromDrive(file.id);
                if (window.confirm('구글 드라이브에서 최신 장부 데이터를 발견했습니다. 불러오시겠습니까?')) {
                    importDatabase(cloudData);
                    const now = new Date().toLocaleString();
                    setLastSync(now);
                    localStorage.setItem('cafe_raon_last_sync', now);
                    loadData();
                    setSyncStatus('success');
                } else {
                    handleCloudUpload();
                }
            } else {
                handleCloudUpload();
            }
        } catch (err) {
            setSyncStatus('error');
        }
    };

    const handleCloudUpload = async () => {
        try {
            // Check if authenticated first
            if (!googleClientId) {
                setShowSettings(true);
                return;
            }

            setSyncStatus('syncing');
            const data = exportDatabase();

            try {
                await GoogleDrive.syncToDrive(data);
            } catch (err) {
                if (err.message === 'Not authenticated' || err.message === 'AUTH_EXPIRED') {
                    setSyncStatus('authenticating');
                    setPendingAction('upload');
                    GoogleDrive.authenticate();
                    return;
                }
                throw err;
            }

            const now = new Date().toLocaleString();
            setLastSync(now);
            localStorage.setItem('cafe_raon_last_sync', now);
            setSyncStatus('success');
        } catch (err) {
            console.error('Cloud upload error:', err);
            setSyncStatus('error');
            alert('동기화에 실패했습니다: ' + err.message);
        }
    };

    const loadData = () => {
        const data = getSummary(period, date);
        setSummary(data);
        setTrendData(getTrendData(period, date));
        setTotalReceivables(getTotalReceivables());

        // Calculate category breakdown
        const salesItems = {};
        const expenseItems = {};

        data.transactions.forEach(t => {
            if (t.category === 'sales') {
                const key = t.item || '기타';
                salesItems[key] = (salesItems[key] || 0) + Number(t.amount);
            } else if (t.category === 'expense') {
                const key = t.item || '기타';
                expenseItems[key] = (expenseItems[key] || 0) + Number(t.amount);
            }
        });

        const salesBreakdown = Object.keys(salesItems)
            .map(key => ({ name: key, value: salesItems[key] }))
            .sort((a, b) => b.value - a.value);

        const expenseBreakdown = Object.keys(expenseItems)
            .map(key => ({ name: key, value: expenseItems[key] }))
            .sort((a, b) => b.value - a.value);

        setCategoryBreakdown({ sales: salesBreakdown, expenses: expenseBreakdown });

        if (period === 'year') {
            setComparison(getYearlyComparison(date.getFullYear()));
        } else if (period === 'month') {
            setComparison(getMonthlyComparison(date));
        } else if (period === 'week') {
            setComparison(getWeeklyComparison(date));
        } else {
            setComparison(null);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            deleteTransaction(id);
            loadData();
            if (syncStatus === 'success') handleCloudUpload();
        }
    };

    const handleEditSave = (e) => {
        e.preventDefault();
        updateTransaction(editingTx.id, {
            ...editingTx,
            amount: Number(editingTx.amount)
        });
        setEditingTx(null);
        loadData();
        if (syncStatus === 'success') handleCloudUpload();
        alert('수정되었습니다.');
    };

    const shiftDate = (amount) => {
        const newDate = new Date(date);

        if (amount === -1) {
            // Going backward - always calculate and prepend
            if (period === 'day') newDate.setDate(newDate.getDate() - 1);
            else if (period === 'week') newDate.setDate(newDate.getDate() - 7);
            else if (period === 'month') newDate.setMonth(newDate.getMonth() - 1);
            else if (period === 'year') newDate.setFullYear(newDate.getFullYear() - 1);

            // Add to beginning, current date shifts to index 1
            setDateHistory([newDate, ...dateHistory]);
            setHistoryIndex(0);
            setDate(newDate);
        } else if (amount === 1) {
            // Going forward
            if (historyIndex < dateHistory.length - 1) {
                // Move forward in history
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setDate(new Date(dateHistory[newIndex]));
            } else {
                // At the end, calculate new future date
                if (period === 'day') newDate.setDate(newDate.getDate() + 1);
                else if (period === 'week') newDate.setDate(newDate.getDate() + 7);
                else if (period === 'month') newDate.setMonth(newDate.getMonth() + 1);
                else if (period === 'year') newDate.setFullYear(newDate.getFullYear() + 1);

                setDateHistory([...dateHistory, newDate]);
                setHistoryIndex(dateHistory.length);
                setDate(newDate);
            }
        }
    };

    const handleDateChange = (e) => {
        const newDate = new Date(e.target.value);
        // Reset history when manually selecting a date
        setDate(newDate);
        setDateHistory([newDate]);
        setHistoryIndex(0);
    };

    const handleExportExcel = () => {
        if (!summary || !summary.transactions.length) {
            alert('내역이 없습니다.');
            return;
        }

        const excelData = summary.transactions.map(t => ({
            '날짜': t.date,
            '구분': t.category === 'sales' ? '매출' : '지출',
            '품목': t.item || '-',
            '거래처': t.vendor || '-',
            '결제수단': METHOD_MAP[t.method] || t.method,
            '금액': t.amount
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '내역');

        const maxWidths = {};
        excelData.forEach(row => {
            Object.keys(row).forEach(key => {
                const val = String(row[key]);
                maxWidths[key] = Math.max(maxWidths[key] || 10, val.length * 2);
            });
        });
        worksheet['!cols'] = Object.keys(maxWidths).map(key => ({ wch: maxWidths[key] }));

        const fileName = `카페_라온트리_내역_${getPeriodLabel().replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const handleExportBackup = () => {
        const data = exportDatabase();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        a.href = url;
        a.download = `라온트리_장부_백업_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportBackup = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (window.confirm('기존 데이터가 모두 삭제되고 백업 데이터로 대체됩니다. 계속하시겠습니까?')) {
                    importDatabase(data);
                    alert('장부 데이터를 성공적으로 불러왔습니다.');
                    window.location.reload();
                }
            } catch (err) {
                alert('파일을 읽는 중 오류가 발생했습니다: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    const getPeriodLabel = () => {
        if (period === 'day') return date.toLocaleDateString();
        if (period === 'week') {
            const start = new Date(date);
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return `${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()}`;
        }
        if (period === 'month') return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
        if (period === 'year') return `${date.getFullYear()}년`;
    };

    const formatCurrency = (num) => new Intl.NumberFormat('ko-KR').format(num) + '원';
    const formatShortCurrency = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
        return num;
    };

    if (!summary) return <div>로딩 중...</div>;

    const renderSummaryCards = () => (
        <div className="grid grid-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
            <div className="card" style={{ marginBottom: 0, borderLeft: '5px solid green' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>총 매출</p>
                <h2 style={{ margin: '5px 0 0 0', color: 'green' }}>{formatCurrency(summary.totalSales)}</h2>
                {comparison && (
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: comparison.growth >= 0 ? 'green' : 'red' }}>
                        {comparison.growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        전년 동기 대비 {Math.abs(comparison.growth).toFixed(1)}% {comparison.growth >= 0 ? '증가' : '감소'}
                    </p>
                )}
            </div>
            <div className="card" style={{ marginBottom: 0, borderLeft: '5px solid #d32f2f' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>총 지출</p>
                <h2 style={{ margin: '5px 0 0 0', color: '#d32f2f' }}>{formatCurrency(summary.totalExpenses)}</h2>
            </div>
            <div className="card" style={{ marginBottom: 0, borderLeft: '5px solid var(--primary-color)' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>순수익 (매출-지출)</p>
                <h2 style={{ margin: '5px 0 0 0', color: 'var(--primary-color)' }}>{formatCurrency(summary.netIncome)}</h2>
                {comparison && comparison.netIncomeGrowth !== undefined && (
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: comparison.netIncomeGrowth >= 0 ? 'green' : 'red' }}>
                        {comparison.netIncomeGrowth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        전년 동기 대비 {Math.abs(comparison.netIncomeGrowth).toFixed(1)}% {comparison.netIncomeGrowth >= 0 ? '증가' : '감소'}
                    </p>
                )}
            </div>
            <div className="card" style={{ marginBottom: 0, borderLeft: '5px solid #ef6c00' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>미수금 총액</p>
                <h2 style={{ margin: '5px 0 0 0', color: '#ef6c00' }}>{formatCurrency(totalReceivables)}</h2>
            </div>
        </div>
    );

    const periodTabs = [
        { id: 'day', label: '일간' },
        { id: 'week', label: '주간' },
        { id: 'month', label: '월간' },
        { id: 'year', label: '연간' }
    ];

    const pieDataSales = Object.keys(summary.salesByType).map(key => ({
        name: METHOD_MAP[key] || key,
        value: summary.salesByType[key]
    }));

    const pieDataExpenses = Object.keys(summary.expensesByType).map(key => ({
        name: METHOD_MAP[key] || key,
        value: summary.expensesByType[key]
    }));

    const handleChartClick = (type) => {
        setMaximizedChart(maximizedChart === type ? null : type);
    };

    return (
        <div className="flex-col">
            <div className="no-print flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div className="flex" style={{ gap: '10px', alignItems: 'center' }}>
                    <div className="tab-nav">
                        {periodTabs.map(tab => (
                            <button
                                key={tab.id}
                                className={period === tab.id ? 'primary' : 'secondary'}
                                onClick={() => setPeriod(tab.id)}
                                style={{ padding: '8px 15px', fontSize: '0.9rem' }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ width: '1px', backgroundColor: '#ddd', height: '24px' }}></div>
                    <div className="flex" style={{ gap: '5px', alignItems: 'center' }}>
                        <button className="secondary" onClick={() => shiftDate(-1)} style={{ padding: '5px' }}><ChevronLeft size={20} /></button>
                        <div style={{ position: 'relative' }}>
                            <h3
                                onClick={() => dateInputRef.current?.showPicker?.()}
                                style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Calendar size={18} /> {getPeriodLabel()}
                            </h3>
                            <input
                                ref={dateInputRef}
                                type="date"
                                style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', pointerEvents: 'none' }}
                                value={getLocalDateString(date)}
                                onChange={handleDateChange}
                            />
                        </div>
                        <button className="secondary" onClick={() => shiftDate(1)} style={{ padding: '5px' }}><ChevronRight size={20} /></button>
                    </div>
                </div>
                <div className="flex" style={{ gap: '10px' }}>
                    <div className="flex" style={{ gap: '5px' }}>
                        <button
                            className={`secondary flex ${syncStatus === 'syncing' ? 'loading' : ''}`}
                            onClick={handleCloudSync}
                            style={{
                                alignItems: 'center',
                                backgroundColor: syncStatus === 'success' ? '#e8f5e9' : (syncStatus === 'error' ? '#ffebee' : '#f5f5f5'),
                                borderColor: syncStatus === 'success' ? '#c8e6c9' : (syncStatus === 'error' ? '#ffcdd2' : '#ddd')
                            }}
                        >
                            {syncStatus === 'syncing' ? <RefreshCw size={16} className="spin" style={{ marginRight: 5 }} /> :
                                syncStatus === 'success' ? <CheckCircle size={16} color="green" style={{ marginRight: 5 }} /> :
                                    syncStatus === 'error' ? <AlertCircle size={16} color="red" style={{ marginRight: 5 }} /> :
                                        <Cloud size={16} style={{ marginRight: 5 }} />}
                            {syncStatus === 'success' ? '동기화됨' : syncStatus === 'error' ? '연동 오류' : '클라우드 연동'}
                        </button>
                        <button className="secondary" onClick={() => setShowSettings(true)} style={{ padding: '8px' }} title="연동 설정">
                            <Settings size={18} />
                        </button>
                    </div>
                    <div style={{ width: '1px', backgroundColor: '#ddd', margin: '0 5px' }}></div>
                    <div className="flex" style={{ gap: '5px' }}>
                        <button className="secondary flex" onClick={handleExportBackup} title="장부 데이터 백업 내려받기" style={{ alignItems: 'center', backgroundColor: '#f5f5f5' }}>
                            <Download size={16} style={{ marginRight: 5 }} /> 백업
                        </button>
                        <label className="secondary flex" style={{ alignItems: 'center', backgroundColor: '#f5f5f5', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid #ddd' }}>
                            <Upload size={16} style={{ marginRight: 5 }} /> 복원
                            <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
                        </label>
                    </div>
                    <div style={{ width: '1px', backgroundColor: '#ddd', margin: '0 5px' }}></div>
                    <button className="secondary flex" onClick={handleExportExcel} style={{ alignItems: 'center', backgroundColor: '#e3f2fd', color: '#1976d2', border: '1px solid #bbdefb' }}>
                        <FileDown size={18} style={{ marginRight: 5 }} /> 엑셀 저장
                    </button>
                    <button className="secondary flex" onClick={() => window.print()} style={{ alignItems: 'center', backgroundColor: '#eee' }}>
                        <Printer size={18} style={{ marginRight: 5 }} /> PDF / 인쇄
                    </button>
                </div>
            </div>

            {!maximizedChart && renderSummaryCards()}

            <div className="grid grid-2" style={{ gridTemplateColumns: maximizedChart ? '1fr' : '1.5fr 1fr' }}>
                {(!maximizedChart || maximizedChart === 'trend') && (
                    <div className="card">
                        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 onClick={() => handleChartClick('trend')} style={{ margin: 0, cursor: 'pointer' }}>활동 추이 그래프</h3>
                            <button className="secondary" onClick={() => handleChartClick('trend')} style={{ padding: '5px' }}>
                                {maximizedChart === 'trend' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>
                        </div>
                        <div style={{ height: maximizedChart === 'trend' ? '600px' : '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" />
                                    <YAxis tickFormatter={formatShortCurrency} width={60} />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend />
                                    <Area type="monotone" dataKey="sales" name="매출" stroke="#5D4037" fill="#D7CCC8" fillOpacity={0.6} activeDot={{ r: 8 }} />
                                    <Area type="monotone" dataKey="expenses" name="지출" stroke="#d32f2f" fill="#ffebee" fillOpacity={0.4} />
                                    <Area type="monotone" dataKey="net" name="순수익" stroke="#388e3c" fill="#e8f5e9" fillOpacity={0.3} strokeDasharray="5 5" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {!maximizedChart && (
                    <div className="flex-col" style={{ gap: '20px' }}>
                        <div className="card" style={{ marginBottom: 0 }}>
                            <h3 onClick={() => handleChartClick('sales')} style={{ marginBottom: '15px', cursor: 'pointer' }}>매출 수단 비중</h3>
                            <div style={{ height: '220px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieDataSales} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {pieDataSales.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="card" style={{ marginBottom: 0 }}>
                            <h3 onClick={() => handleChartClick('expense')} style={{ marginBottom: '15px', cursor: 'pointer' }}>지출 수단 비중</h3>
                            <div style={{ height: '220px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieDataExpenses} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {pieDataExpenses.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {maximizedChart === 'sales' && (
                    <div className="card">
                        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 onClick={() => handleChartClick('sales')} style={{ margin: 0, cursor: 'pointer' }}>매출 상세 분석</h3>
                            <button className="secondary" onClick={() => handleChartClick('sales')} style={{ padding: '5px' }}><Minimize2 size={18} /></button>
                        </div>
                        <div style={{ height: '500px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pieDataSales} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tickFormatter={formatShortCurrency} />
                                    <YAxis dataKey="name" type="category" width={100} />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Bar dataKey="value" name="금액" fill="#5D4037" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {maximizedChart === 'expense' && (
                    <div className="card">
                        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 onClick={() => handleChartClick('expense')} style={{ margin: 0, cursor: 'pointer' }}>지출 상세 분석</h3>
                            <button className="secondary" onClick={() => handleChartClick('expense')} style={{ padding: '5px' }}><Minimize2 size={18} /></button>
                        </div>
                        <div style={{ height: '500px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pieDataExpenses} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tickFormatter={formatShortCurrency} />
                                    <YAxis dataKey="name" type="category" width={100} />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Bar dataKey="value" name="금액" fill="#d32f2f" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {!maximizedChart && (
                <div className="grid grid-2" style={{ marginTop: '20px' }}>
                    <div className="card">
                        <h3 style={{ marginBottom: '15px', color: 'green' }}>📊 매출 항목별 분석</h3>
                        <div className="table-responsive" style={{ marginBottom: '20px' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>항목</th>
                                        <th style={{ textAlign: 'right' }}>금액</th>
                                        <th style={{ textAlign: 'right' }}>비율</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoryBreakdown.sales.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.name}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'green' }}>
                                                {formatCurrency(item.value)}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                {summary.totalSales > 0 ? ((item.value / summary.totalSales) * 100).toFixed(1) : 0}%
                                            </td>
                                        </tr>
                                    ))}
                                    {categoryBreakdown.sales.length === 0 && (
                                        <tr><td colSpan="3" style={{ textAlign: 'center', color: '#999' }}>매출 내역이 없습니다</td></tr>
                                    )}
                                    {categoryBreakdown.sales.length > 0 && (
                                        <tr style={{ borderTop: '2px solid #5D4037', fontWeight: 'bold' }}>
                                            <td>합계</td>
                                            <td style={{ textAlign: 'right', color: 'green' }}>{formatCurrency(summary.totalSales)}</td>
                                            <td style={{ textAlign: 'right' }}>100%</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {categoryBreakdown.sales.length > 0 && (
                            <div style={{ height: '250px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryBreakdown.sales} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tickFormatter={formatShortCurrency} />
                                        <YAxis dataKey="name" type="category" width={100} />
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Bar dataKey="value" name="금액" fill="#388e3c" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <h3 style={{ marginBottom: '15px', color: '#d32f2f' }}>📊 지출 항목별 분석</h3>
                        <div className="table-responsive" style={{ marginBottom: '20px' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>항목</th>
                                        <th style={{ textAlign: 'right' }}>금액</th>
                                        <th style={{ textAlign: 'right' }}>비율</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoryBreakdown.expenses.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.name}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#d32f2f' }}>
                                                {formatCurrency(item.value)}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                {summary.totalExpenses > 0 ? ((item.value / summary.totalExpenses) * 100).toFixed(1) : 0}%
                                            </td>
                                        </tr>
                                    ))}
                                    {categoryBreakdown.expenses.length === 0 && (
                                        <tr><td colSpan="3" style={{ textAlign: 'center', color: '#999' }}>지출 내역이 없습니다</td></tr>
                                    )}
                                    {categoryBreakdown.expenses.length > 0 && (
                                        <tr style={{ borderTop: '2px solid #d32f2f', fontWeight: 'bold' }}>
                                            <td>합계</td>
                                            <td style={{ textAlign: 'right', color: '#d32f2f' }}>{formatCurrency(summary.totalExpenses)}</td>
                                            <td style={{ textAlign: 'right' }}>100%</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {categoryBreakdown.expenses.length > 0 && (
                            <div style={{ height: '250px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryBreakdown.expenses} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tickFormatter={formatShortCurrency} />
                                        <YAxis dataKey="name" type="category" width={100} />
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Bar dataKey="value" name="금액" fill="#d32f2f" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!maximizedChart && (
                <div className="card" style={{ marginTop: '20px' }}>
                    <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>거래 내역 상세 목록</h3>
                        <div className="flex" style={{ gap: '10px' }}>
                            <div className="flex" style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '2px 8px', backgroundColor: '#fff', alignItems: 'center' }}>
                                <Search size={16} style={{ color: '#999', marginRight: '5px' }} />
                                <select
                                    style={{ border: 'none', borderRight: '1px solid #eee', fontSize: '0.85rem', width: 'auto', padding: '5px' }}
                                    value={searchType}
                                    onChange={(e) => setSearchType(e.target.value)}
                                >
                                    <option value="all">전체</option>
                                    <option value="item">품목</option>
                                    <option value="vendor">거래처</option>
                                    <option value="method">결제수단</option>
                                    <option value="category">구분</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="검색어 입력..."
                                    style={{ border: 'none', padding: '5px', fontSize: '0.85rem', width: '150px' }}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', padding: '5px' }}><X size={14} /></button>}
                            </div>
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>날짜</th>
                                    <th>구분</th>
                                    <th>품목 / 내용</th>
                                    <th>수단</th>
                                    <th>금액</th>
                                    <th className="no-print">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.transactions
                                    .filter(t => {
                                        const term = searchTerm.toLowerCase();
                                        if (!term) return true;

                                        const item = (t.item || '').toLowerCase();
                                        const vendor = (t.vendor || '').toLowerCase();
                                        const method = (METHOD_MAP[t.method] || t.method).toLowerCase();
                                        const category = (t.category === 'sales' ? '매출' : '지출').toLowerCase();

                                        if (searchType === 'item') return item.includes(term);
                                        if (searchType === 'vendor') return vendor.includes(term);
                                        if (searchType === 'method') return method.includes(term);
                                        if (searchType === 'category') return category.includes(term);
                                        return item.includes(term) || vendor.includes(term) || method.includes(term) || category.includes(term);
                                    })
                                    .map((t) => (
                                        <tr key={t.id}>
                                            <td>{t.date}</td>
                                            <td><span className="tag" style={{ backgroundColor: t.category === 'sales' ? '#e8f5e9' : '#ffebee', color: t.category === 'sales' ? 'green' : 'red' }}>{t.category === 'sales' ? '매출' : '지출'}</span></td>
                                            <td>{t.category === 'sales' ? (t.item || '-') : `${t.item} ${t.vendor ? `(${t.vendor})` : ''}`}</td>
                                            <td>{METHOD_MAP[t.method] || t.method}</td>
                                            <td style={{ fontWeight: 'bold', color: (t.category === 'sales' ? t.amount : -t.amount) >= 0 ? 'green' : 'red' }}>
                                                {(() => {
                                                    const val = t.category === 'sales' ? t.amount : -t.amount;
                                                    return (val >= 0 ? '+' : '') + formatCurrency(val);
                                                })()}
                                            </td>
                                            <td className="no-print">
                                                <div className="flex" style={{ gap: '5px' }}>
                                                    <button className="secondary" onClick={() => setEditingTx(t)} style={{ padding: '4px', color: 'var(--primary-color)', border: 'none' }}>
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button className="secondary" onClick={() => handleDelete(t.id)} style={{ padding: '4px', color: 'var(--danger)', border: 'none' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                {summary.transactions.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center' }}>내역이 없습니다.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {editingTx && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '400px', margin: 0 }}>
                        <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>내역 수정</h3>
                            <button onClick={() => setEditingTx(null)} style={{ background: 'none', color: '#666' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleEditSave} className="flex-col">
                            <div>
                                <label>날짜</label>
                                <input type="date" value={editingTx.date} onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })} required />
                            </div>
                            {(editingTx.category === 'expense' || editingTx.category === 'sales') && (
                                <>
                                    <div>
                                        <label>{editingTx.category === 'sales' ? '내용/메모' : '품목'}</label>
                                        <input type="text" value={editingTx.item} onChange={(e) => setEditingTx({ ...editingTx, item: e.target.value })} required={editingTx.category === 'expense'} />
                                    </div>
                                    {editingTx.category === 'expense' && (
                                        <div>
                                            <label>거래처</label>
                                            <input type="text" value={editingTx.vendor} onChange={(e) => setEditingTx({ ...editingTx, vendor: e.target.value })} />
                                        </div>
                                    )}
                                </>
                            )}
                            <div>
                                <label>결제수단</label>
                                <select value={editingTx.method} onChange={(e) => setEditingTx({ ...editingTx, method: e.target.value })}>
                                    <option value="card">카드</option>
                                    <option value="cash">현금</option>
                                    <option value="tax_invoice">세금계산서</option>
                                    <option value="online">온라인(네이버/배달)</option>
                                    <option value="corporate_cash">거래처 현금</option>
                                    <option value="other">기타</option>
                                    <option value="proof">지출증빙</option>
                                </select>
                            </div>
                            <div>
                                <label>금액</label>
                                <input type="number" value={editingTx.amount} onChange={(e) => setEditingTx({ ...editingTx, amount: e.target.value })} required />
                            </div>
                            <button type="submit" className="primary" style={{ marginTop: '10px' }}>수정 사항 저장</button>
                        </form>
                    </div>
                </div>
            )}

            {showSettings && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
                    <div className="card" style={{ width: '450px', margin: 0 }}>
                        <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>클라우드 연동 설정</h3>
                            <button onClick={() => setShowSettings(false)} style={{ background: 'none', color: '#666' }}><X size={20} /></button>
                        </div>
                        <div className="flex-col" style={{ gap: '15px' }}>
                            <div className="alert-info" style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '8px', fontSize: '0.9rem', color: '#0d47a1', border: '1px solid #bbdefb', overflowY: 'auto', maxHeight: '300px' }}>
                                <strong>💡 구글 드라이브 자동 저장 설정 가이드</strong><br /><br />
                                <strong>1단계: 구글 클라우드 설정 (최초 1회)</strong><br />
                                1. <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>에 접속하여 새 프로젝트 생성 (예: cafe-raon-ledger)<br />
                                2. [API 및 서비스] &gt; [사용자 인증 정보] &gt; [+ 사용자 인증 정보 만들기] &gt; <strong>[OAuth 클라이언트 ID]</strong> 선택<br />
                                3. 애플리케이션 유형: <strong>[웹 애플리케이션]</strong><br />
                                4. "승인된 자바스크립트 원본"에 아래 주소 추가:<br />
                                <code style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '2px 4px', borderRadius: '4px', userSelect: 'all' }}>https://raon-easypaster.github.io</code><br />
                                5. [만들기] 후 생성된 <strong>클라이언트 ID</strong>를 복사<br /><br />
                                <strong>2단계: 연결</strong><br />
                                아래 입력창에 복사한 클라이언트 ID를 붙여넣고 [연동 시작하기]를 눌러주세요.
                            </div>
                            <div>
                                <label style={{ fontWeight: 'bold' }}>Google 클라이언트 ID (Client ID)</label>
                                <input
                                    type="text"
                                    placeholder="your-client-id.apps.googleusercontent.com"
                                    value={googleClientId}
                                    onChange={(e) => {
                                        setGoogleClientId(e.target.value);
                                        localStorage.setItem('cafe_raon_google_client_id', e.target.value);
                                    }}
                                    style={{ width: '100%', marginTop: '5px' }}
                                />
                            </div>
                            {lastSync && (
                                <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                                    최종 동기화 시간: {lastSync}
                                </p>
                            )}
                            {syncStatus !== 'idle' && (
                                <div className="flex" style={{ gap: '10px', alignItems: 'center', fontSize: '0.9rem' }}>
                                    {syncStatus === 'syncing' && <><RefreshCw size={16} className="spin" /> <span>동기화 중...</span></>}
                                    {syncStatus === 'authenticating' && <><Settings size={16} className="spin" /> <span>인증 확인 중...</span></>}
                                    {syncStatus === 'success' && <><CheckCircle size={16} color="green" /> <span style={{ color: 'green' }}>동기화 완료</span></>}
                                    {syncStatus === 'error' && <><AlertCircle size={16} color="red" /> <span style={{ color: 'red' }}>동기화 실패</span></>}
                                </div>
                            )}
                            <div className="flex" style={{ gap: '10px', marginTop: '10px' }}>
                                <button className="primary flex-1" onClick={() => { setShowSettings(false); handleCloudSync(); }}>연동 시작하기</button>
                                {googleClientId && (
                                    <button className="secondary flex-1" style={{ backgroundColor: '#f0f4f8', color: '#1a73e8', border: '1px solid #1a73e8' }} onClick={handleCloudUpload}>지금 동기화</button>
                                )}
                                <button className="secondary" onClick={() => setShowSettings(false)}>닫기</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;

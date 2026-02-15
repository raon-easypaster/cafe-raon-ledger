
import React, { useState, useEffect } from 'react';
import { getSummary, getYearlyComparison, deleteTransaction, getTrendData, getTotalReceivables, getMonthlyComparison, updateTransaction, getWeeklyComparison, exportDatabase, importDatabase, getAllTransactions, getReceivables, FinanceType, getDonorList } from '../utils/storage';
import { DonorSearchInput } from './TransactionForms';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector, LineChart, Line, AreaChart, Area, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Trash2, Coins, Search, Pencil, X, Printer, ChevronLeft, ChevronRight, Maximize2, Minimize2, FileDown, Cloud, Database, Upload, Download, Settings, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import * as GoogleDrive from '../utils/googleDrive';
import * as XLSX from 'xlsx';

const COLORS = ['#5D4037', '#8D6E63', '#A1887F', '#D7CCC8', '#EFEBE9', '#FFCC80'];

const formatCurrency = (val) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);
const formatShortCurrency = (val) => new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 }).format(val);

const METHOD_MAP = {
    'card': '카드',
    'cash': '현금',
    'tax_invoice': '세금계산서',
    'online': '온라인(네이버/배달)',
    'corporate_cash': '거래처 현금',
    'other': '기타',
    'proof': '지출증빙'
};

const FINANCE_TYPE_MAP = {
    [FinanceType.GENERAL]: '일반재정',
    [FinanceType.SPECIAL]: '특별재정'
};

export const Dashboard = ({ refreshTrigger }) => {
    const [summary, setSummary] = useState(null);
    const [comparison, setComparison] = useState(null);
    const [totalReceivables, setTotalReceivables] = useState(0);
    const [trendData, setTrendData] = useState([]);
    const [period, setPeriod] = useState('day'); // 'day', 'month', 'year'
    const [date, setDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [editingTx, setEditingTx] = useState(null);
    const [maximizedChart, setMaximizedChart] = useState(null); // 'trend', 'sales', 'expense'
    const [searchType, setSearchType] = useState('all'); // 'all', 'item', 'vendor', 'method', 'category'
    const [donors, setDonors] = useState([]);

    // Cloud Sync States
    const [showSettings, setShowSettings] = useState(false);
    const [googleClientId, setGoogleClientId] = useState(localStorage.getItem('cafe_raon_google_client_id') || '');
    const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'authenticating', 'syncing', 'success', 'error'
    const [lastSync, setLastSync] = useState(localStorage.getItem('cafe_raon_last_sync') || null);

    const getLocalDateString = (d) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    useEffect(() => {
        loadData();
        // If data was updated via forms (refreshTrigger), upload to cloud
        if (refreshTrigger > 0 && syncStatus === 'success') {
            handleCloudUpload();
        }
    }, [period, date, refreshTrigger]);

    useEffect(() => {
        if (googleClientId && window.google) {
            GoogleDrive.initGoogleDrive(googleClientId, (status, detail) => {
                if (status === 'authenticated') {
                    setSyncStatus('syncing');
                    handleCloudDownload();
                } else if (status === 'error') {
                    setSyncStatus('error');
                    console.error('Drive Error:', detail);
                }
            });
        }
    }, [googleClientId]);

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
                // Simple logic: if cloud data exists, ask user OR just merge.
                // For now, let's ask if they want to overwrite local with cloud.
                if (window.confirm('구글 드라이브에서 최신 장부 데이터를 발견했습니다. 불러오시겠습니까?')) {
                    importDatabase(cloudData);
                    const now = new Date().toLocaleString();
                    setLastSync(now);
                    localStorage.setItem('cafe_raon_last_sync', now);
                    loadData();
                    setSyncStatus('success');
                } else {
                    // If not downloading, maybe upload local to cloud?
                    handleCloudUpload();
                }
            } else {
                // No file on drive, upload local
                handleCloudUpload();
            }
        } catch (err) {
            setSyncStatus('error');
            console.error(err);
        }
    };

    const handleCloudUpload = async () => {
        try {
            setSyncStatus('syncing');
            const data = exportDatabase();
            await GoogleDrive.syncToDrive(data);
            const now = new Date().toLocaleString();
            setLastSync(now);
            localStorage.setItem('cafe_raon_last_sync', now);
            setSyncStatus('success');
        } catch (err) {
            setSyncStatus('error');
            console.error(err);
        }
    };

    const loadData = () => {
        const data = getSummary(period, date);
        setSummary(data);
        setTrendData(getTrendData(period, date));
        setTotalReceivables(getTotalReceivables());
        setDonors(getDonorList());

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
        if (period === 'day') newDate.setDate(newDate.getDate() + amount);
        else if (period === 'week') newDate.setDate(newDate.getDate() + (amount * 7));
        else if (period === 'month') newDate.setMonth(newDate.getMonth() + amount);
        else if (period === 'year') newDate.setFullYear(newDate.getFullYear() + amount);
        setDate(newDate);
    };

    const handleExportExcel = () => {
        if (!summary || !summary.transactions.length) {
            alert('내역이 없습니다.');
            return;
        }

        const excelData = summary.transactions.map(t => ({
            '날짜': t.date,
            '재정': FINANCE_TYPE_MAP[t.financeType] || FINANCE_TYPE_MAP[FinanceType.GENERAL],
            '구분': t.category === 'sales' ? '매출' : '지출',
            '품목': t.item || '-',
            '거래처': t.vendor || '-',
            '결제수단': METHOD_MAP[t.method] || t.method,
            '금액': t.amount
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '내역');

        // Auto-size columns (rough approximation)
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

    if (!summary) return <div>로딩 중...</div>;

    // Prepare chart data
    const salesByTypeData = Object.keys(summary.salesByType).map(key => ({
        name: METHOD_MAP[key] || key, value: summary.salesByType[key]
    }));

    const expensesByTypeData = Object.keys(summary.expensesByType).map(key => ({
        name: METHOD_MAP[key] || key, value: summary.expensesByType[key]
    }));

    return (
        <div className="flex-col">
            {!maximizedChart && (
                <>
                    <div className="card calendar-header">
                        <div className="flex" style={{ alignItems: 'center' }}>
                            <button className="secondary" onClick={() => shiftDate(-1)} style={{ padding: '5px' }}><ChevronLeft size={20} /></button>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <h2 style={{ margin: 0 }}>
                                    <Calendar size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                    {getPeriodLabel()}
                                </h2>
                                <input
                                    type={period === 'day' || period === 'week' ? 'date' : period === 'month' ? 'month' : 'number'}
                                    value={period === 'year' ? date.getFullYear() : (period === 'day' || period === 'week' ? getLocalDateString(date) : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (!val) return;
                                        const newDate = new Date(date);
                                        if (period === 'day') setDate(new Date(val));
                                        else if (period === 'month') {
                                            const [y, m] = val.split('-');
                                            newDate.setFullYear(parseInt(y), parseInt(m) - 1);
                                            setDate(newDate);
                                        } else if (period === 'year') {
                                            newDate.setFullYear(parseInt(val));
                                            setDate(newDate);
                                        }
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: 0, left: 0, width: '100%', height: '100%',
                                        opacity: 0, cursor: 'pointer'
                                    }}
                                />
                            </div>
                            <button className="secondary" onClick={() => shiftDate(1)} style={{ padding: '5px' }}><ChevronRight size={20} /></button>
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
                            <div className="tab-nav" style={{ margin: 0 }}>
                                <button className={`tab-btn ${period === 'day' ? 'active' : ''}`} onClick={() => setPeriod('day')}>일간</button>
                                <button className={`tab-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>주간</button>
                                <button className={`tab-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>월간</button>
                                <button className={`tab-btn ${period === 'year' ? 'active' : ''}`} onClick={() => setPeriod('year')}>연간</button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                        <div className="card" style={{ borderLeft: '5px solid #66bb6a', backgroundColor: '#f1f8e9' }}>
                            <h4>일반재정 잔액</h4>
                            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2e7d32' }}>{formatCurrency(summary.generalBalance)}</p>
                        </div>
                        <div className="card" style={{ borderLeft: '5px solid #ffa726', backgroundColor: '#fff3e0' }}>
                            <h4>특별재정 잔액</h4>
                            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e65100' }}>{formatCurrency(summary.specialBalance)}</p>
                        </div>
                        <div className="card" style={{ borderLeft: '5px solid var(--primary-color)', backgroundColor: '#e8eaf6' }}>
                            <h4>전체 합계 (잔액)</h4>
                            <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{formatCurrency(summary.totalBalance)}</p>
                        </div>
                        <div className="card" style={{ borderLeft: '5px solid var(--success)' }}>
                            <h4>기간 매출</h4>
                            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>{formatCurrency(summary.totalSales)}</p>
                        </div>
                        <div className="card" style={{ borderLeft: '5px solid var(--danger)' }}>
                            <h4>기간 지출</h4>
                            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{formatCurrency(summary.totalExpenses)}</p>
                        </div>
                    </div>

                    {comparison && (
                        <div className="card" style={{ backgroundColor: '#fff8e1', border: '1px solid var(--warning)' }}>
                            <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ margin: 0 }}>전년 {(period === 'year' ? '연간' : (period === 'month' ? '동월' : (period === 'week' ? '전년 동주' : '전일')))} 대비 매출 비교</h4>
                                    <p style={{ color: '#666', fontSize: '0.9rem' }}>작년: {formatCurrency(comparison.lastTotal)} → 올해: {formatCurrency(comparison.currentTotal)}</p>
                                </div>
                                <div className="flex" style={{ alignItems: 'center' }}>
                                    {comparison.growth >= 0 ? <TrendingUp color="green" /> : <TrendingDown color="red" />}
                                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', marginLeft: '8px', color: comparison.growth >= 0 ? 'green' : 'red' }}>
                                        {comparison.growth.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Back Button for MaxView */}
            {maximizedChart && (
                <div className="flex" style={{ marginBottom: '15px' }}>
                    <button className="secondary flex" onClick={() => setMaximizedChart(null)} style={{ alignItems: 'center' }}>
                        <ChevronLeft size={20} /> 전체 대시보드로 돌아가기
                    </button>
                </div>
            )}

            {(!maximizedChart || maximizedChart === 'trend') && (
                <div className="card" style={{ height: maximizedChart ? 'calc(100vh - 200px)' : '350px' }}>
                    <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 onClick={() => setMaximizedChart(maximizedChart === 'trend' ? null : 'trend')} style={{ cursor: 'pointer', flex: 1 }}>
                            {period === 'day' ? '최근 7일 추이' : period === 'week' ? '이번 주 추이' : period === 'month' ? '이번 달 추이' : '올해 월별 추이'}
                        </h3>
                        <button className="secondary" onClick={() => setMaximizedChart(maximizedChart === 'trend' ? null : 'trend')} style={{ padding: '5px' }}>
                            {maximizedChart === 'trend' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={trendData}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis width={80} tickFormatter={formatShortCurrency} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Area type="monotone" dataKey="sales" name="매출" stroke="var(--success)" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                            <Area type="monotone" dataKey="expenses" name="지출" stroke="var(--danger)" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                            <Line type="monotone" dataKey="balance" name="현재 잔액(누적)" stroke="var(--primary-color)" strokeWidth={4} dot={{ r: 4 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}

            {!maximizedChart && (
                <div className="grid grid-2">
                    <div className="card" style={{ height: '300px' }}>
                        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 onClick={() => setMaximizedChart('sales')} style={{ cursor: 'pointer', flex: 1 }}>매출 상세 (결제수단별)</h3>
                            <button className="secondary" onClick={() => setMaximizedChart('sales')} style={{ padding: '5px' }}><Maximize2 size={18} /></button>
                        </div>
                        {salesByTypeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={salesByTypeData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {salesByTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <p>데이터가 없습니다.</p>}
                    </div>

                    <div className="card" style={{ height: '300px' }}>
                        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 onClick={() => setMaximizedChart('expense')} style={{ cursor: 'pointer', flex: 1 }}>지출 상세 (결제수단별)</h3>
                            <button className="secondary" onClick={() => setMaximizedChart('expense')} style={{ padding: '5px' }}><Maximize2 size={18} /></button>
                        </div>
                        {expensesByTypeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={expensesByTypeData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis width={60} tickFormatter={formatShortCurrency} />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Bar dataKey="value" fill="#8D6E63" name="지출액" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p>데이터가 없습니다.</p>}
                    </div>
                </div>
            )}

            {maximizedChart === 'sales' && (
                <div className="card" style={{ height: 'calc(100vh - 200px)' }}>
                    <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>매출 상세 (결제수단별)</h3>
                        <button className="secondary" onClick={() => setMaximizedChart(null)} style={{ padding: '5px' }}><Minimize2 size={18} /></button>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={salesByTypeData} cx="50%" cy="50%" outerRadius={200} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                                {salesByTypeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            {maximizedChart === 'expense' && (
                <div className="card" style={{ height: 'calc(100vh - 200px)' }}>
                    <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>지출 상세 (결제수단별)</h3>
                        <button className="secondary" onClick={() => setMaximizedChart(null)} style={{ padding: '5px' }}><Minimize2 size={18} /></button>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={expensesByTypeData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={formatShortCurrency} domain={[0, 'auto']} width={80} />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="value" fill="#8D6E63" name="지출액" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {!maximizedChart && (
                <div className="card">
                    <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', gap: '10px' }}>
                        <h3 style={{ margin: 0 }}>내역 목록</h3>
                        <div className="flex" style={{ gap: '5px' }}>
                            <select
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value)}
                                style={{ width: '100px', padding: '8px' }}
                            >
                                <option value="all">전체</option>
                                <option value="item">품목</option>
                                <option value="vendor">거래처</option>
                                <option value="method">결제수단</option>
                                <option value="category">구분</option>
                            </select>
                            <div className="flex" style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                                <input
                                    type="text"
                                    placeholder="내역 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ paddingLeft: '35px', width: '200px' }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>날짜</th>
                                    <th>재정</th>
                                    <th>구분</th>
                                    <th>항목/거래처</th>
                                    <th>결제수단</th>
                                    <th>금액</th>
                                    <th>관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.transactions
                                    .filter(t => {
                                        if (!searchTerm) return true;
                                        const term = searchTerm.toLowerCase();
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
                                            <td>
                                                <span className="tag" style={{
                                                    backgroundColor: t.financeType === FinanceType.SPECIAL ? '#fff3e0' : '#e8eaf6',
                                                    color: t.financeType === FinanceType.SPECIAL ? '#e65100' : 'var(--primary-color)',
                                                    border: `1px solid ${t.financeType === FinanceType.SPECIAL ? '#ffcc80' : '#c5cae9'}`
                                                }}>
                                                    {FINANCE_TYPE_MAP[t.financeType] || '일반재정'}
                                                </span>
                                            </td>
                                            <td><span className="tag" style={{ backgroundColor: t.category === 'sales' ? '#e8f5e9' : '#ffebee', color: t.category === 'sales' ? 'green' : 'red' }}>{t.category === 'sales' ? '매출' : '지출'}</span></td>
                                            <td>{t.category === 'sales' ? (t.item || '-') : `${t.item} ${t.vendor ? `(${t.vendor})` : ''}`}</td>
                                            <td>{METHOD_MAP[t.method] || t.method}</td>
                                            <td style={{ fontWeight: 'bold', color: t.category === 'sales' ? 'green' : 'red' }}>
                                                {t.category === 'sales' ? '+' : '-'}{formatCurrency(t.amount)}
                                            </td>
                                            <td>
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
                                {summary.transactions.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center' }}>내역이 없습니다.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Simple Edit Modal Overlay */}
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
                                        <label>{editingTx.category === 'sales' ? '헌금자/항목' : '품목'}</label>
                                        {editingTx.category === 'sales' ? (
                                            <DonorSearchInput
                                                value={editingTx.item}
                                                donors={donors}
                                                onChange={(val) => setEditingTx({ ...editingTx, item: val })}
                                                placeholder="이름 또는 항목 입력"
                                            />
                                        ) : (
                                            <input type="text" value={editingTx.item} onChange={(e) => setEditingTx({ ...editingTx, item: e.target.value })} required />
                                        )}
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
                                <label>재정 구분</label>
                                <select value={editingTx.financeType || FinanceType.GENERAL} onChange={(e) => setEditingTx({ ...editingTx, financeType: e.target.value })}>
                                    <option value={FinanceType.GENERAL}>일반재정</option>
                                    <option value={FinanceType.SPECIAL}>특별재정</option>
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
            {/* Settings Modal */}
            {showSettings && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
                    <div className="card" style={{ width: '450px', margin: 0 }}>
                        <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>클라우드 연동 설정</h3>
                            <button onClick={() => setShowSettings(false)} style={{ background: 'none', color: '#666' }}><X size={20} /></button>
                        </div>
                        <div className="flex-col" style={{ gap: '15px' }}>
                            <div className="alert-info" style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '8px', fontSize: '0.9rem', color: '#0d47a1', border: '1px solid #bbdefb' }}>
                                <strong>💡 자동 동기화 안내</strong><br />
                                구글 클라우드 콘솔에서 발급받은 <strong>Client ID</strong>를 입력하면 모든 기기에서 장부를 연동할 수 있습니다.
                                <br /><br />
                                1. 구글 클라우드 콘솔 접속<br />
                                2. 프로젝트 생성 및 Google Drive API 활성화<br />
                                3. OAuth 동의 화면 설정 및 사용자 인증 정보 생성 (Web application)<br />
                                4. 승인된 JavaScript원본에 이 앱의 주소 추가
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
                            <div className="flex" style={{ gap: '10px', marginTop: '10px' }}>
                                <button className="primary flex-1" onClick={() => { setShowSettings(false); handleCloudSync(); }}>연동 시작하기</button>
                                <button className="secondary" onClick={() => setShowSettings(false)}>닫기</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

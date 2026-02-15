
import React, { useState, useEffect, useRef } from 'react';
import { addTransaction, TransactionType, FinanceType, getDonorList } from '../utils/storage';
import { PlusCircle, Save, Trash2, Plus, Minus } from 'lucide-react';

export const ExpenseForm = ({ onSave }) => {
    // ... (no changes to ExpenseForm for now)
    const getLocalDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const [commonData, setCommonData] = useState({
        date: getLocalDate(),
        vendor: '',
        method: 'card',
        financeType: FinanceType.GENERAL,
    });

    const [items, setItems] = useState([{ id: Date.now(), item: '', quantity: 1, amount: '' }]);

    const handleCommonChange = (e) => {
        const { name, value } = e.target;
        setCommonData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (id, field, value) => {
        setItems(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const addItemRow = () => {
        setItems(prev => [...prev, { id: Date.now(), item: '', quantity: 1, amount: '' }]);
    };

    const removeItemRow = (id) => {
        if (items.length > 1) {
            setItems(prev => prev.filter(row => row.id !== id));
        }
    };

    const shiftCommonDate = (amount) => {
        const d = new Date(commonData.date);
        d.setDate(d.getDate() + amount);
        setCommonData(prev => ({ ...prev, date: getLocalDate(d) }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validItems = items.filter(i => i.item && i.amount);
        if (validItems.length === 0) return alert('적어도 하나의 품목과 금액을 입력해주세요.');

        validItems.forEach(item => {
            addTransaction({
                ...commonData,
                item: item.item,
                quantity: item.quantity,
                amount: Number(item.amount),
                category: TransactionType.EXPENSE,
            });
        });

        setItems([{ id: Date.now(), item: '', quantity: 1, amount: '' }]);
        alert(`${validItems.length}건의 지출이 저장되었습니다.`);
        if (onSave) onSave();
    };

    return (
        <div className="card">
            <h3><PlusCircle size={20} style={{ verticalAlign: 'bottom' }} /> 지출(매입) 일괄 등록</h3>
            <form onSubmit={handleSubmit} className="flex-col">
                <div className="grid grid-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div>
                        <label>날짜</label>
                        <div className="flex" style={{ gap: '5px' }}>
                            <button type="button" onClick={() => shiftCommonDate(-1)} className="secondary" style={{ padding: '5px' }}><Minus size={16} /></button>
                            <input type="date" name="date" value={commonData.date} onChange={handleCommonChange} required />
                            <button type="button" onClick={() => shiftCommonDate(1)} className="secondary" style={{ padding: '5px' }}><Plus size={16} /></button>
                        </div>
                    </div>
                    <div>
                        <label>거래처</label>
                        <input type="text" name="vendor" value={commonData.vendor} onChange={handleCommonChange} placeholder="공통 거래처" />
                    </div>
                    <div>
                        <label>결제수단</label>
                        <select name="method" value={commonData.method} onChange={handleCommonChange}>
                            <option value="card">카드</option>
                            <option value="cash">현금</option>
                            <option value="proof">지출증빙</option>
                        </select>
                    </div>
                    <div>
                        <label>재정 구분</label>
                        <select name="financeType" value={commonData.financeType} onChange={handleCommonChange}>
                            <option value={FinanceType.GENERAL}>일반재정</option>
                            <option value={FinanceType.SPECIAL}>특별재정</option>
                        </select>
                    </div>
                </div>

                <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #eee' }} />

                <div className="flex-col">
                    {items.map((row, index) => (
                        <div key={row.id} className="grid" style={{ gridTemplateColumns: '3fr 1fr 2fr 40px', alignItems: 'end' }}>
                            <div>
                                {index === 0 && <label>품목</label>}
                                <input type="text" value={row.item} onChange={(e) => handleItemChange(row.id, 'item', e.target.value)} placeholder="품목명" required />
                            </div>
                            <div>
                                {index === 0 && <label>수량</label>}
                                <input type="number" value={row.quantity} onChange={(e) => handleItemChange(row.id, 'quantity', e.target.value)} min="1" />
                            </div>
                            <div>
                                {index === 0 && <label>금액</label>}
                                <input type="number" value={row.amount} onChange={(e) => handleItemChange(row.id, 'amount', e.target.value)} placeholder="원" required />
                            </div>
                            <button type="button" onClick={() => removeItemRow(row.id)} style={{ backgroundColor: 'transparent', color: '#666', padding: '10px' }}>
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex" style={{ justifyContent: 'space-between', marginTop: '10px' }}>
                    <button type="button" className="secondary flex" onClick={addItemRow} style={{ alignItems: 'center' }}>
                        <Plus size={18} /> 항목 추가
                    </button>
                    <button type="submit" className="primary flex" style={{ alignItems: "center" }}>
                        <Save size={18} style={{ marginRight: 5 }} /> 모두 저장하기
                    </button>
                </div>
            </form>
        </div>
    );
};

// Help component for searchable donor dropdown
const getChoseong = (str) => {
    const choseongs = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    let result = '';
    for (let char of str) {
        const code = char.charCodeAt(0) - 0xAC00;
        if (code > -1 && code < 11172) result += choseongs[Math.floor(code / 588)];
        else result += char;
    }
    return result;
};

export const DonorSearchInput = ({ value, onChange, donors = [], placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const safeDonors = Array.isArray(donors) ? donors : [];

    // Filter logic including Choseong search
    const filtered = safeDonors.filter(d => {
        if (!value) return true;
        const lowerValue = value.toLowerCase();
        const lowerName = d.toLowerCase();
        const choseongName = getChoseong(lowerName);

        return lowerName.includes(lowerValue) || choseongName.includes(lowerValue);
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (name) => {
        onChange(name);
        setIsOpen(false);
    };

    return (
        <div className="dropdown-container" ref={containerRef}>
            <input
                type="text"
                value={value}
                autoComplete="off"
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onClick={() => setIsOpen(true)}
                placeholder={placeholder}
                style={{ width: '100%' }}
            />
            {isOpen && filtered.length > 0 && (
                <div className="dropdown-menu" style={{ zIndex: 9999 }}>
                    {filtered.map((name) => (
                        <div
                            key={name}
                            className="dropdown-item"
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevents focus loss before selection
                                handleSelect(name);
                            }}
                        >
                            {name}
                        </div>
                    ))}
                </div>
            )}
            {isOpen && filtered.length === 0 && (value || safeDonors.length === 0) && (
                <div className="dropdown-menu" style={{ padding: '10px', fontSize: '0.85rem', color: '#666', zIndex: 9999 }}>
                    {safeDonors.length === 0 ? "목록이 비어있습니다." : `기존 목록에 없음: "${value}"`}
                </div>
            )}
        </div>
    );
};

export const SalesForm = ({ onSave }) => {
    const getLocalDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const [date, setDate] = useState(getLocalDate());
    const [financeType, setFinanceType] = useState(FinanceType.GENERAL);
    const [rows, setRows] = useState([{ id: Date.now(), method: 'card', amount: '', item: '' }]);
    const [donors, setDonors] = useState([]);

    useEffect(() => {
        setDonors(getDonorList());
    }, []);

    const handleRowChange = (id, field, value) => {
        setRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const addRow = () => {
        setRows(prev => [...prev, { id: Date.now(), method: 'card', amount: '', item: '' }]);
    };

    const removeRow = (id) => {
        if (rows.length > 1) {
            setRows(prev => prev.filter(row => row.id !== id));
        }
    };

    const shiftDate = (amount) => {
        const d = new Date(date);
        d.setDate(d.getDate() + amount);
        setDate(getLocalDate(d));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validRows = rows.filter(r => r.amount);
        if (validRows.length === 0) return alert('금액을 입력해주세요.');

        validRows.forEach(row => {
            addTransaction({
                date,
                method: row.method,
                amount: Number(row.amount),
                item: row.item,
                category: TransactionType.SALES,
                financeType: financeType,
            });
        });

        setRows([{ id: Date.now(), method: 'card', amount: '', item: '' }]);
        setDonors(getDonorList()); // Refresh donors list after save
        alert(`${validRows.length}건의 매출이 저장되었습니다.`);
        if (onSave) onSave();
    };

    return (
        <div className="card">
            <h3><PlusCircle size={20} style={{ verticalAlign: 'bottom' }} /> 매출 일괄 등록</h3>
            <form onSubmit={handleSubmit} className="flex-col">
                <div>
                    <label>날짜</label>
                    <div className="flex" style={{ gap: '5px', maxWidth: '300px' }}>
                        <button type="button" onClick={() => shiftDate(-1)} className="secondary" style={{ padding: '5px' }}><Minus size={16} /></button>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                        <button type="button" onClick={(e) => shiftDate(1)} className="secondary" style={{ padding: '5px' }}><Plus size={16} /></button>
                    </div>
                </div>
                <div>
                    <label>재정 구분</label>
                    <select value={financeType} onChange={(e) => setFinanceType(e.target.value)} style={{ maxWidth: '200px' }}>
                        <option value={FinanceType.GENERAL}>일반재정</option>
                        <option value={FinanceType.SPECIAL}>특별재정</option>
                    </select>
                </div>

                <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #eee' }} />

                <div className="flex-col">
                    {rows.map((row, index) => (
                        <div key={row.id} className="grid" style={{ gridTemplateColumns: '2fr 2fr 2fr 40px', alignItems: 'end' }}>
                            <div>
                                {index === 0 && <label>매출 구분</label>}
                                <select value={row.method} onChange={(e) => handleRowChange(row.id, 'method', e.target.value)}>
                                    <option value="card">카드</option>
                                    <option value="cash">현금</option>
                                    <option value="tax_invoice">세금계산서</option>
                                    <option value="online">온라인(네이버/배달)</option>
                                    <option value="corporate_cash">거래처 현금</option>
                                    <option value="other">기타</option>
                                </select>
                            </div>
                            <div>
                                {index === 0 && <label>헌금자/항목 (클릭 시 목록)</label>}
                                <DonorSearchInput
                                    value={row.item}
                                    donors={donors}
                                    onChange={(val) => handleRowChange(row.id, 'item', val)}
                                    placeholder="이름 또는 항목 입력"
                                />
                            </div>
                            <div>
                                {index === 0 && <label>금액</label>}
                                <input type="number" value={row.amount} onChange={(e) => handleRowChange(row.id, 'amount', e.target.value)} placeholder="원" required />
                            </div>
                            <button type="button" onClick={() => removeRow(row.id)} style={{ backgroundColor: 'transparent', color: '#666', padding: '10px' }}>
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex" style={{ justifyContent: 'space-between', marginTop: '10px' }}>
                    <button type="button" className="secondary flex" onClick={addRow} style={{ alignItems: 'center' }}>
                        <Plus size={18} /> 항목 추가
                    </button>
                    <button type="submit" className="primary flex" style={{ alignItems: "center" }}>
                        <Save size={18} style={{ marginRight: 5 }} /> 모두 저장하기
                    </button>
                </div>
            </form>
        </div>
    );
};

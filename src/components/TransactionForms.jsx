
import React, { useState } from 'react';
import { addTransaction, TransactionType } from '../utils/storage';
import { PlusCircle, Save, Trash2, Plus, Minus } from 'lucide-react';

export const ExpenseForm = ({ onSave }) => {
    const getLocalDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const [commonData, setCommonData] = useState({
        date: getLocalDate(),
        vendor: '',
        method: 'card',
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
                <div className="grid grid-3">
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
                </div>

                <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #eee' }} />

                <div className="flex-col">
                    {items.map((row, index) => (
                        <div key={row.id} className="grid grid-expense-items">
                            <div>
                                {index === 0 && <label>품목</label>}
                                <input type="text" value={row.item} onChange={(e) => handleItemChange(row.id, 'item', e.target.value)} placeholder="품목명" required />
                            </div>
                            <div>
                                {index === 0 && <label>수량</label>}
                                <input type="number" value={row.quantity} onChange={(e) => handleItemChange(row.id, 'quantity', e.target.value)} placeholder="1" />
                            </div>
                            <div>
                                {index === 0 && <label>금액</label>}
                                <input type="number" value={row.amount} onChange={(e) => handleItemChange(row.id, 'amount', e.target.value)} placeholder="원 (음수 가능)" required />
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

export const SalesForm = ({ onSave }) => {
    const getLocalDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const [date, setDate] = useState(getLocalDate());
    const [rows, setRows] = useState([{ id: Date.now(), method: 'card', amount: '', item: '' }]);

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
            });
        });

        setRows([{ id: Date.now(), method: 'card', amount: '', item: '' }]);
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
                        <button type="button" onClick={() => shiftDate(1)} className="secondary" style={{ padding: '5px' }}><Plus size={16} /></button>
                    </div>
                </div>

                <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #eee' }} />

                <div className="flex-col">
                    {rows.map((row, index) => (
                        <div key={row.id} className="grid grid-sales">
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
                                {index === 0 && <label>내용/메모 (선택)</label>}
                                <input type="text" value={row.item} onChange={(e) => handleRowChange(row.id, 'item', e.target.value)} placeholder="기타 내용 등" />
                            </div>
                            <div>
                                {index === 0 && <label>금액</label>}
                                <input type="number" value={row.amount} onChange={(e) => handleRowChange(row.id, 'amount', e.target.value)} placeholder="원 (음수 가능)" required />
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


import React, { useState, useEffect } from 'react';
import { getReceivables, addReceivable, updateReceivableStatus } from '../utils/storage';
import { PlusCircle, CheckCircle, XCircle } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);

const getLocalDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const Receivables = () => {
    const [items, setItems] = useState([]);
    const [formData, setFormData] = useState({
        date: getLocalDate(),
        debtor: '',
        amount: '',
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setItems(getReceivables());
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.debtor || !formData.amount) return alert('필수 항목을 입력해주세요.');

        addReceivable({ ...formData, amount: Number(formData.amount) });
        setFormData({
            date: getLocalDate(),
            debtor: '',
            amount: '',
            notes: ''
        });
        loadData();
    };

    const toggleStatus = (id, currentStatus) => {
        const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
        updateReceivableStatus(id, newStatus);
        loadData();
    };

    return (
        <div className="flex-col">
            <div className="card">
                <h3><PlusCircle size={20} style={{ verticalAlign: 'bottom' }} /> 미수금 등록</h3>
                <form onSubmit={handleSubmit} className="grid grid-4" style={{ alignItems: 'end' }}>
                    <div>
                        <label>날짜</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange} required />
                    </div>
                    <div>
                        <label>거래처/고객명</label>
                        <input type="text" name="debtor" value={formData.debtor} onChange={handleChange} placeholder="이름" required />
                    </div>
                    <div>
                        <label>금액</label>
                        <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="원" required />
                    </div>
                    <button type="submit" className="primary">등록</button>
                </form>
            </div>

            <div className="card">
                <h3>미수금 현황</h3>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>상태</th>
                                <th>날짜</th>
                                <th>거래처/고객명</th>
                                <th>금액</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id} style={{ opacity: item.status === 'paid' ? 0.6 : 1 }}>
                                    <td>
                                        {item.status === 'paid' ?
                                            <span className="tag" style={{ backgroundColor: '#e8f5e9', color: 'green' }}>완료</span> :
                                            <span className="tag" style={{ backgroundColor: '#ffebee', color: 'red' }}>미수</span>
                                        }
                                    </td>
                                    <td>{item.date}</td>
                                    <td>{item.debtor}</td>
                                    <td style={{ fontWeight: 'bold' }}>{formatCurrency(item.amount)}</td>
                                    <td>
                                        <button
                                            className={item.status === 'paid' ? 'secondary' : 'primary'}
                                            onClick={() => toggleStatus(item.id, item.status)}
                                            style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                                        >
                                            {item.status === 'paid' ? '미수 처리' : '입금 확인'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center' }}>내역이 없습니다.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

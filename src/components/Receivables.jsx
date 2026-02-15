
import React, { useState, useEffect } from 'react';
import { getReceivables, addReceivable, updateReceivableStatus, deleteReceivable } from '../utils/storage';
import { PlusCircle, Trash2, CheckCircle, Clock } from 'lucide-react';

const Receivables = () => {
    const getLocalDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const [receivables, setReceivables] = useState([]);
    const [formData, setFormData] = useState({
        date: getLocalDate(),
        customer: '',
        amount: '',
        memo: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setReceivables(getReceivables());
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.customer || !formData.amount) return;
        addReceivable(formData);
        setFormData({
            date: getLocalDate(),
            customer: '',
            amount: '',
            memo: ''
        });
        loadData();
    };

    const handleToggleStatus = (id, currentStatus) => {
        const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
        updateReceivableStatus(id, newStatus);
        loadData();
    };

    const handleDelete = (id) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            deleteReceivable(id);
            loadData();
        }
    };

    const formatCurrency = (num) => new Intl.NumberFormat('ko-KR').format(num) + '원';

    return (
        <div className="flex-col">
            <div className="card">
                <h3><PlusCircle size={20} style={{ verticalAlign: 'bottom' }} /> 미수금 등록</h3>
                <form onSubmit={handleSubmit} className="grid grid-receivables">
                    <div>
                        <label>날짜</label>
                        <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                    </div>
                    <div>
                        <label>거래처/주문자</label>
                        <input type="text" value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} placeholder="이름" required />
                    </div>
                    <div>
                        <label>금액</label>
                        <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="원" required />
                    </div>
                    <div>
                        <label>메모</label>
                        <input type="text" value={formData.memo} onChange={(e) => setFormData({ ...formData, memo: e.target.value })} placeholder="상세 내용" />
                    </div>
                    <button type="submit" className="primary">추가</button>
                </form>
            </div>

            <div className="card">
                <h3>미수금 현황</h3>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>날짜</th>
                                <th>거래처</th>
                                <th>금액</th>
                                <th>상태</th>
                                <th>메모</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receivables.map((r) => (
                                <tr key={r.id}>
                                    <td>{r.date}</td>
                                    <td>{r.customer}</td>
                                    <td style={{ fontWeight: 'bold' }}>{formatCurrency(r.amount)}</td>
                                    <td>
                                        <button
                                            onClick={() => handleToggleStatus(r.id, r.status)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '5px',
                                                backgroundColor: r.status === 'paid' ? '#e8f5e9' : '#fff3e0',
                                                color: r.status === 'paid' ? 'green' : '#ef6c00',
                                                border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'
                                            }}
                                        >
                                            {r.status === 'paid' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                            {r.status === 'paid' ? '정산완료' : '미정산'}
                                        </button>
                                    </td>
                                    <td>{r.memo}</td>
                                    <td>
                                        <button onClick={() => handleDelete(r.id)} style={{ backgroundColor: 'transparent', color: '#666' }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {receivables.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center' }}>미수금 내역이 없습니다.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Receivables;

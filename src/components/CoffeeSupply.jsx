
import React, { useState, useEffect } from 'react';
import { getCoffeeSupplies, addCoffeeSupply, updateCoffeeSupply, deleteCoffeeSupply } from '../utils/storage';
import { Plus, Trash2, Pencil, X, Save, TrendingUp, BarChart3 } from 'lucide-react';

const CoffeeSupply = () => {
    const [supplies, setSupplies] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        client: '',
        item: '',
        quantity: '',
        amount: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setSupplies(getCoffeeSupplies());
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = {
            ...formData,
            quantity: Number(formData.quantity),
            amount: Number(formData.amount)
        };

        if (editingId) {
            updateCoffeeSupply(editingId, data);
            setEditingId(null);
        } else {
            addCoffeeSupply(data);
        }

        setFormData({
            date: new Date().toISOString().split('T')[0],
            client: '',
            item: '',
            quantity: '',
            amount: ''
        });
        setIsAdding(false);
        loadData();
    };

    const handleEdit = (supply) => {
        setFormData({
            date: supply.date,
            client: supply.client,
            item: supply.item,
            quantity: supply.quantity,
            amount: supply.amount
        });
        setEditingId(supply.id);
        setIsAdding(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            deleteCoffeeSupply(id);
            loadData();
        }
    };

    const formatCurrency = (num) => new Intl.NumberFormat('ko-KR').format(num) + '원';

    // Statistics calculations
    const stats = supplies.reduce((acc, s) => {
        const month = s.date.substring(0, 7); // YYYY-MM
        if (!acc[month]) acc[month] = { totalQuantity: 0, totalAmount: 0, clients: {} };

        acc[month].totalQuantity += s.quantity;
        acc[month].totalAmount += s.amount;

        if (!acc[month].clients[s.client]) acc[month].clients[s.client] = 0;
        acc[month].clients[s.client] += s.amount;

        return acc;
    }, {});

    const sortedMonths = Object.keys(stats).sort().reverse();

    return (
        <div className="flex-col" style={{ gap: '20px' }}>
            <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: '#5D4037' }}>🚚 원두 납품 현황</h2>
                {!isAdding && (
                    <button className="primary" onClick={() => setIsAdding(true)}>
                        <Plus size={18} style={{ marginRight: 5 }} /> 신규 등록
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="card">
                    <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>{editingId ? '납품 내역 수정' : '새 납품 내역 등록'}</h3>
                        <button className="secondary" onClick={() => { setIsAdding(false); setEditingId(null); }} style={{ padding: '5px' }}>
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-2">
                        <div className="flex-col">
                            <label>날짜</label>
                            <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
                        </div>
                        <div className="flex-col">
                            <label>거래처</label>
                            <input type="text" name="client" value={formData.client} onChange={handleInputChange} placeholder="거래처명" required />
                        </div>
                        <div className="flex-col">
                            <label>품목</label>
                            <input type="text" name="item" value={formData.item} onChange={handleInputChange} placeholder="예: 하우스 블렌드" required />
                        </div>
                        <div className="flex-col">
                            <label>수량 (kg)</label>
                            <input type="number" step="0.1" name="quantity" value={formData.quantity} onChange={handleInputChange} placeholder="0.0" required />
                        </div>
                        <div className="flex-col">
                            <label>금액</label>
                            <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="0" required />
                        </div>
                        <div className="flex" style={{ gridColumn: 'span 2', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button type="submit" className="primary">
                                <Save size={18} style={{ marginRight: 5 }} /> {editingId ? '수정 완료' : '등록하기'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-2" style={{ alignItems: 'flex-start' }}>
                <div className="card" style={{ marginBottom: 0 }}>
                    <h3 style={{ marginBottom: '15px' }}>📋 최근 납품 내역</h3>
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>날짜</th>
                                    <th>거래처</th>
                                    <th>품목</th>
                                    <th>수량</th>
                                    <th style={{ textAlign: 'right' }}>금액</th>
                                    <th className="no-print">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {supplies.map(s => (
                                    <tr key={s.id}>
                                        <td>{s.date}</td>
                                        <td>{s.client}</td>
                                        <td>{s.item}</td>
                                        <td>{s.quantity}kg</td>
                                        <td style={{ textAlign: 'right' }}>{formatCurrency(s.amount)}</td>
                                        <td className="no-print">
                                            <div className="flex" style={{ gap: '5px' }}>
                                                <button className="secondary" onClick={() => handleEdit(s)} style={{ padding: '5px' }}>
                                                    <Pencil size={14} />
                                                </button>
                                                <button className="secondary" onClick={() => handleDelete(s.id)} style={{ padding: '5px', color: '#d32f2f' }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {supplies.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>납품 내역이 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex-col">
                    <div className="card" style={{ marginBottom: 0 }}>
                        <h3 style={{ marginBottom: '15px' }}><BarChart3 size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> 월별 통계 요약</h3>
                        {sortedMonths.map(month => (
                            <div key={month} style={{ borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' }}>
                                <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{month.replace('-', '년 ')}월</span>
                                    <span style={{ color: '#5D4037', fontWeight: 'bold' }}>{formatCurrency(stats[month].totalAmount)}</span>
                                </div>
                                <div className="flex" style={{ gap: '20px', fontSize: '0.9rem', color: '#666' }}>
                                    <span>총 수량: {stats[month].totalQuantity.toFixed(1)}kg</span>
                                    <span>거래처 수: {Object.keys(stats[month].clients).length}곳</span>
                                </div>
                            </div>
                        ))}
                        {sortedMonths.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>데이터가 없습니다.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoffeeSupply;

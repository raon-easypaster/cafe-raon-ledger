
import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import { ExpenseForm, SalesForm } from './components/TransactionForms';
import Receivables from './components/Receivables';
import CoffeeSupply from './components/CoffeeSupply';
import { LayoutDashboard, Receipt, ShoppingBag, Wallet, Coffee } from 'lucide-react';

function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleSave = () => {
        setRefreshTrigger(prev => prev + 1);
        setActiveTab('dashboard');
    };

    return (
        <div className="container">
            <header className="no-print">
                <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h1 style={{ color: '#5D4037', margin: 0 }}>☕ 카페 라온트리 장부</h1>
                    <nav className="flex" style={{ gap: '10px' }}>
                        <button
                            className={activeTab === 'dashboard' ? 'primary' : 'secondary'}
                            onClick={() => setActiveTab('dashboard')}
                        >
                            <LayoutDashboard size={18} style={{ marginRight: 5, verticalAlign: 'text-bottom' }} /> 대시보드
                        </button>
                        <button
                            className={activeTab === 'sales' ? 'primary' : 'secondary'}
                            onClick={() => setActiveTab('sales')}
                        >
                            <Receipt size={18} style={{ marginRight: 5, verticalAlign: 'text-bottom' }} /> 매출 등록
                        </button>
                        <button
                            className={activeTab === 'expense' ? 'primary' : 'secondary'}
                            onClick={() => setActiveTab('expense')}
                        >
                            <ShoppingBag size={18} style={{ marginRight: 5, verticalAlign: 'text-bottom' }} /> 지출 등록
                        </button>
                        <button
                            className={activeTab === 'receivables' ? 'primary' : 'secondary'}
                            onClick={() => setActiveTab('receivables')}
                        >
                            <Wallet size={18} style={{ marginRight: 5, verticalAlign: 'text-bottom' }} /> 미수금 관리
                        </button>
                        <button
                            className={activeTab === 'coffee' ? 'primary' : 'secondary'}
                            onClick={() => setActiveTab('coffee')}
                        >
                            <Coffee size={18} style={{ marginRight: 5, verticalAlign: 'text-bottom' }} /> 원두 납품
                        </button>
                    </nav>
                </div>
            </header>

            <main>
                {activeTab === 'dashboard' && <Dashboard refreshTrigger={refreshTrigger} />}
                {activeTab === 'sales' && <SalesForm onSave={handleSave} />}
                {activeTab === 'expense' && <ExpenseForm onSave={handleSave} />}
                {activeTab === 'receivables' && <Receivables />}
                {activeTab === 'coffee' && <CoffeeSupply />}
            </main>

            <footer className="no-print" style={{ textAlign: 'center', marginTop: '40px', color: '#8D6E63', fontSize: '0.9rem' }}>
                &copy; 2025 Cafe Raon Tree Accounting Ledger
            </footer>
        </div>
    );
}

export default App;


import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ExpenseForm, SalesForm } from './components/TransactionForms';
import { Receivables } from './components/Receivables';
import { LayoutDashboard, Wallet, ShoppingCart, CreditCard } from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTransactionSave = () => {
    setRefreshTrigger(prev => prev + 1);
    // Optionally switch to dashboard or stay
    // setActiveTab('dashboard'); 
  };

  return (
    <div>
      <header style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '15px 20px' }}>
        <div className="container flex" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>☕ 카페 라온트리 회계장부</h1>
          <nav className="flex">
            <button
              className={activeTab === 'dashboard' ? 'primary' : 'secondary'}
              style={activeTab === 'dashboard' ? { backgroundColor: 'white', color: 'var(--primary-color)' } : { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.8)', border: 'none' }}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={18} style={{ verticalAlign: 'middle', marginRight: 5 }} /> 대시보드
            </button>
            <button
              className={activeTab === 'sales' ? 'primary' : 'secondary'}
              style={activeTab === 'sales' ? { backgroundColor: 'white', color: 'var(--primary-color)' } : { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.8)', border: 'none' }}
              onClick={() => setActiveTab('sales')}
            >
              <Wallet size={18} style={{ verticalAlign: 'middle', marginRight: 5 }} /> 매출 등록
            </button>
            <button
              className={activeTab === 'expenses' ? 'primary' : 'secondary'}
              style={activeTab === 'expenses' ? { backgroundColor: 'white', color: 'var(--primary-color)' } : { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.8)', border: 'none' }}
              onClick={() => setActiveTab('expenses')}
            >
              <ShoppingCart size={18} style={{ verticalAlign: 'middle', marginRight: 5 }} /> 지출 등록
            </button>
            <button
              className={activeTab === 'receivables' ? 'primary' : 'secondary'}
              style={activeTab === 'receivables' ? { backgroundColor: 'white', color: 'var(--primary-color)' } : { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.8)', border: 'none' }}
              onClick={() => setActiveTab('receivables')}
            >
              <CreditCard size={18} style={{ verticalAlign: 'middle', marginRight: 5 }} /> 미수금 관리
            </button>
          </nav>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '30px' }}>
        {activeTab === 'dashboard' && <Dashboard refreshTrigger={refreshTrigger} />}

        {activeTab === 'sales' && (
          <div className="flex-col">
            <h2 className="flex" style={{ alignItems: "center" }}><Wallet /> 매출 등록</h2>
            <SalesForm onSave={handleTransactionSave} />
            {/* Show recent transactions could be added here if needed, but Dashboard has it */}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="flex-col">
            <h2 className="flex" style={{ alignItems: "center" }}><ShoppingCart /> 지출 등록</h2>
            <ExpenseForm onSave={handleTransactionSave} />
          </div>
        )}

        {activeTab === 'receivables' && (
          <div className="flex-col">
            <h2 className="flex" style={{ alignItems: "center" }}><CreditCard /> 미수금 관리</h2>
            <Receivables />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

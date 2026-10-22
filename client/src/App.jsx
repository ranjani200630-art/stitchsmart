import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { CustomerDashboard } from './components/CustomerDashboard';
import { CustomerProfile } from './components/CustomerProfile';
import { MeasurementForm } from './components/MeasurementForm';
import { NewOrder } from './components/NewOrder';
import { MyOrders } from './components/MyOrders';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { AdminOrders } from './components/AdminOrders';
import { FabricManagement } from './components/FabricManagement';
import { FabricPrediction } from './components/FabricPrediction';
import { HealthCard } from './components/HealthCard';
import './App.css';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('login');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (!loading) {
      const protectedTabs = [
        'dashboard',
        'profile',
        'measurements',
        'new-order',
        'orders',
        'admin-orders',
        'fabric-management',
        'fabric-prediction'
      ];

      const adminTabs = [
        'admin-orders',
        'fabric-management',
        'fabric-prediction'
      ];

      if (user && (currentTab === 'login' || currentTab === 'register')) {
        setCurrentTab('dashboard');
      } else if (!user && protectedTabs.includes(currentTab)) {
        setCurrentTab('login');
      } else if (
        user &&
        user.role !== 'admin' &&
        adminTabs.includes(currentTab)
      ) {
        setCurrentTab('dashboard');
      }
    }
  }, [user, loading, currentTab]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading StitchSmart session...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onSelectOrder={(order) => setSelectedOrder(order)}
      />

      <header className="header">
        <div className="badge">
          MERN Stack • Fabric Management &amp; Demand Prediction
        </div>
        <h1>StitchSmart</h1>
        <p className="subtitle">
          Smart Tailoring Order &amp; Fabric Demand Prediction System
        </p>
      </header>

      <main className="content">
        {currentTab === 'login' && !user && (
          <LoginForm
            onSwitchToRegister={() => setCurrentTab('register')}
          />
        )}

        {currentTab === 'register' && !user && (
          <RegisterForm
            onSwitchToLogin={() => setCurrentTab('login')}
          />
        )}

        {currentTab === 'dashboard' && user && (
          <CustomerDashboard setCurrentTab={setCurrentTab} />
        )}

        {currentTab === 'new-order' && user && (
          <NewOrder
            setCurrentTab={setCurrentTab}
            onOrderCreated={(order) => setSelectedOrder(order)}
          />
        )}

        {currentTab === 'orders' && user && (
          <MyOrders
            setCurrentTab={setCurrentTab}
            onSelectOrder={(order) => setSelectedOrder(order)}
          />
        )}

        {currentTab === 'admin-orders' &&
          user &&
          user.role === 'admin' && (
            <AdminOrders
              onSelectOrder={(order) => setSelectedOrder(order)}
            />
          )}

        {currentTab === 'fabric-management' &&
          user &&
          user.role === 'admin' && <FabricManagement />}

        {currentTab === 'fabric-prediction' &&
          user &&
          user.role === 'admin' && <FabricPrediction />}

        {currentTab === 'profile' && user && (
          <CustomerProfile />
        )}

        {currentTab === 'measurements' && user && (
          <MeasurementForm />
        )}

        {currentTab === 'health' && (
          <>
            <HealthCard />

            <div className="card info-card">
              <h2>System Architecture</h2>

              <div className="grid">
                <div className="tech-item">
                  <span className="tech-label">Frontend</span>
                  <strong>React.js (Vite)</strong>
                  <span className="tech-desc">
                    Online Order Lifecycle &amp; INR (₹)
                  </span>
                </div>

                <div className="tech-item">
                  <span className="tech-label">Backend</span>
                  <strong>Node.js + Express</strong>
                  <span className="tech-desc">
                    Order State Management and Fabric Prediction
                  </span>
                </div>

                <div className="tech-item">
                  <span className="tech-label">Database</span>
                  <strong>MongoDB + Mongoose</strong>
                  <span className="tech-desc">
                    Orders, Measurements, Users and Fabrics
                  </span>
                </div>

                <div className="tech-item">
                  <span className="tech-label">Security</span>
                  <strong>JWT Authentication</strong>
                  <span className="tech-desc">
                    Customer and Admin Access Control
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </main>

      <footer className="footer">
        <p>
          StitchSmart &copy; 2026 • Final-Year Project • Fabric Demand Prediction
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
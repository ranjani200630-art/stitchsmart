import React from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

export const Navbar = ({ currentTab, setCurrentTab, onSelectOrder }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div
        className="nav-brand"
        onClick={() => setCurrentTab(user ? 'dashboard' : 'login')}
      >
        <span className="brand-icon">&#129697;</span>
        <span className="brand-name">StitchSmart</span>
      </div>

      <div className="nav-links">
        {user ? (
          <>
            <button
              className={`nav-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentTab('dashboard')}
            >
              Dashboard
            </button>

            {user.role === 'admin' ? (
              <>
                <button
                  className={`nav-btn ${currentTab === 'admin-orders' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('admin-orders')}
                >
                  Tailor Orders
                </button>

                <button
                  className={`nav-btn ${currentTab === 'fabric-management' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('fabric-management')}
                >
                  Fabric Management
                </button>

                <button
                  className={`nav-btn ${currentTab === 'fabric-prediction' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('fabric-prediction')}
                >
                  Fabric Demand Prediction
                </button>
              </>
            ) : (
              <>
                <button
                  className={`nav-btn ${currentTab === 'new-order' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('new-order')}
                >
                  New Order
                </button>

                <button
                  className={`nav-btn ${currentTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('orders')}
                >
                  My Orders
                </button>
              </>
            )}

            <button
              className={`nav-btn ${currentTab === 'profile' ? 'active' : ''}`}
              onClick={() => setCurrentTab('profile')}
            >
              My Profile
            </button>

            {user.role !== 'admin' && (
              <button
                className={`nav-btn ${currentTab === 'measurements' ? 'active' : ''}`}
                onClick={() => setCurrentTab('measurements')}
              >
                My Measurements
              </button>
            )}

            <button
              className={`nav-btn ${currentTab === 'health' ? 'active' : ''}`}
              onClick={() => setCurrentTab('health')}
            >
              System Health
            </button>

            <NotificationBell
              onSelectOrder={onSelectOrder}
              currentTab={currentTab}
            />

            <div className="nav-user-info">
              <span className="user-greeting">
                Hi, {user.name ? user.name.split(' ')[0] : 'User'}
              </span>

              <span
                className={`role-pill ${
                  user.role === 'admin' ? 'role-admin' : 'role-customer'
                }`}
              >
                {user.role}
              </span>
            </div>

            <button className="nav-btn nav-logout-btn" onClick={logout}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <button
              className={`nav-btn ${currentTab === 'login' ? 'active' : ''}`}
              onClick={() => setCurrentTab('login')}
            >
              Sign In
            </button>

            <button
              className={`nav-btn ${currentTab === 'register' ? 'active' : ''}`}
              onClick={() => setCurrentTab('register')}
            >
              Register
            </button>

            <button
              className={`nav-btn ${currentTab === 'health' ? 'active' : ''}`}
              onClick={() => setCurrentTab('health')}
            >
              System Health
            </button>
          </>
        )}
      </div>
    </nav>
  );
};
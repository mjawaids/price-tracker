import React, { useState } from 'react';
import { ShoppingCart, Package, Home, DollarSign, Menu, X } from '@geist-ui/icons';
import { ViewMode } from '../types';
import { useAuth } from '../contexts/AuthContext';
import UserMenu from './UserMenu';

interface NavigationProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  shoppingListCount: number;
  onShowAuth: () => void;
}

const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
  shoppingListCount,
  onShowAuth,
}) => {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as ViewMode, icon: Home, label: 'Dashboard' },
    { id: 'products' as ViewMode, icon: Package, label: 'Products' },
    { id: 'stores' as ViewMode, icon: ShoppingCart, label: 'Stores' },
    { id: 'price-manager' as ViewMode, icon: DollarSign, label: 'Prices' },
    { id: 'shopping-list' as ViewMode, icon: ShoppingCart, label: 'Shopping List', badge: shoppingListCount },
    { id: 'shopping-lists' as ViewMode, icon: ShoppingCart, label: 'My Lists' },
  ];

  return (
    <>
      {/* Glass Navigation Bar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ height: '32px', width: '32px', background: 'linear-gradient(to right, #3b82f6, #9333ea)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
                <ShoppingCart size={20} color="#ffffff" />
              </div>
              <span style={{ marginLeft: '8px', fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>
                SpendLess Price Tracker
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div style={{ display: 'none', gap: '4px' }} className="md:flex">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  style={{
                    position: 'relative',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    backgroundColor: currentView === item.id ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    color: currentView === item.id ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                    border: 'none',
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)',
                    boxShadow: currentView === item.id ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (currentView !== item.id) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentView !== item.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: 'linear-gradient(to right, #ec4899, #ef4444)',
                      color: '#ffffff',
                      fontSize: '12px',
                      borderRadius: '9999px',
                      height: '20px',
                      width: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            {/* Desktop Actions */}
            <div style={{ display: 'none', alignItems: 'center', gap: '12px' }} className="md:flex">
              {user ? (
                <>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => onViewChange('add-product')}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>+</span>
                      <span>Product</span>
                    </button>
                    <button
                      onClick={() => onViewChange('add-store')}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>+</span>
                      <span>Store</span>
                    </button>
                  </div>
                  <UserMenu />
                </>
              ) : (
                <button
                  onClick={onShowAuth}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    padding: '8px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  transition: 'all 0.2s',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} className="md:hidden">
          <div 
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div style={{ position: 'fixed', top: '64px', left: 0, right: 0, backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Mobile Navigation Items */}
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    backgroundColor: currentView === item.id ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    color: currentView === item.id ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: currentView === item.id ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (currentView !== item.id) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentView !== item.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <item.icon size={20} />
                    <span style={{ fontWeight: 500 }}>{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span style={{
                      background: 'linear-gradient(to right, #ec4899, #ef4444)',
                      color: '#ffffff',
                      fontSize: '12px',
                      borderRadius: '9999px',
                      height: '24px',
                      width: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}

              {/* Mobile Actions */}
              <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {user ? (
                  <>
                    <button
                      onClick={() => {
                        onViewChange('add-product');
                        setIsMobileMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>+</span>
                      <span>Add Product</span>
                    </button>
                    <button
                      onClick={() => {
                        onViewChange('add-store');
                        setIsMobileMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>+</span>
                      <span>Add Store</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      onShowAuth();
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Credits Bar */}
      <div style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ padding: '8px 0', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
              Made with <span style={{ color: '#ef4444', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>❤️</span> by{' '}
              <a 
                href="https://jawaid.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500, transition: 'color 0.2s', textDecoration: 'none' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                Jawaid.dev
              </a>
              {' '}• Crafted with passion for smart shoppers everywhere
            </p>
          </div>
        </div>
      </div>

      {/* Legal & Info Links */}
      <footer style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }} className="md:flex-row md:justify-between">
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>© {new Date().getFullYear()} SpendLess</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 16px', fontSize: '14px' }}>
              <a href="/pricing" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.textDecoration = 'underline'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'; e.currentTarget.style.textDecoration = 'none'; }}>Pricing</a>
              <a href="/privacy" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.textDecoration = 'underline'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'; e.currentTarget.style.textDecoration = 'none'; }}>Privacy Policy</a>
              <a href="/refund" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.textDecoration = 'underline'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'; e.currentTarget.style.textDecoration = 'none'; }}>Refund Policy</a>
              <a href="/terms" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.textDecoration = 'underline'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'; e.currentTarget.style.textDecoration = 'none'; }}>Terms & Conditions</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Navigation;

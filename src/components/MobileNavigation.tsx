import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Package, Home, Menu, X, User, Save } from '@geist-ui/icons';
import { ViewMode } from '../types';
import { useAuth } from '../contexts/AuthContext';
import UserMenu from './UserMenu';

interface MobileNavigationProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  shoppingListCount: number;
  onShowAuth: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentView,
  onViewChange,
  shoppingListCount,
  onShowAuth,
}) => {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const primaryNavItems = [
    { id: 'dashboard' as ViewMode, icon: Home, label: 'Home' },
    { id: 'products' as ViewMode, icon: Package, label: 'Products' },
    { id: 'shopping-list' as ViewMode, icon: ShoppingCart, label: 'Cart', badge: shoppingListCount },
  ];

  const secondaryNavItems = [
    { id: 'stores' as ViewMode, icon: '🏪', label: 'Stores' },
    { id: 'price-manager' as ViewMode, icon: '💰', label: 'Prices' },
    { id: 'shopping-lists' as ViewMode, icon: '📋', label: 'Lists' },
  ];

  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  // Handle keyboard events (escape key and focus trap)
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        return;
      }

      // Handle Tab key for focus trapping
      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus first element when drawer opens
    if (drawerRef.current) {
      const focusableElements = drawerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement?.focus();
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile Top App Bar */}
      <header style={{
        display: 'block',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 30, 0.95))',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)'
      }} className="md:hidden">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          height: '56px',
          padding: '0 16px',
          gap: '8px'
        }}>
          {/* Mobile Menu Button - Left Side */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                padding: '8px',
                borderRadius: '8px',
                color: 'rgba(255, 255, 255, 0.7)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                minWidth: '44px',
                minHeight: '44px'
              }}
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          
          {/* Logo - Center */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{
              height: '32px',
              width: '32px',
              background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}>
              <ShoppingCart size={20} color="white" />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>SpendLess</span>
          </div>
          
          {/* User Menu - Right Side */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            {user ? (
              <UserMenu />
            ) : (
              <button
                onClick={onShowAuth}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  minWidth: '44px',
                  minHeight: '44px'
                }}
                aria-label="Sign in"
              >
                <User size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Top Navigation Bar */}
      <nav style={{
        display: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 30, 0.95))',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)'
      }} className="md:block">
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '64px'
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                height: '32px',
                width: '32px',
                background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}>
                <ShoppingCart size={20} color="white" />
              </div>
              <span style={{ marginLeft: '8px', fontSize: '20px', fontWeight: 'bold', color: 'white' }}>SpendLess</span>
            </div>
            
            {/* Desktop Navigation */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {allNavItems.map((item) => {
                const IconComponent = typeof item.icon === 'string' ? null : item.icon;
                return (
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
                      minHeight: '44px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      ...(currentView === item.id ? {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                      } : {
                        backgroundColor: 'transparent',
                        color: 'rgba(255, 255, 255, 0.7)'
                      })
                    }}
                  >
                    {IconComponent ? <IconComponent size={16} /> : <span>{item.icon}</span>}
                    <span>{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: 'linear-gradient(to right, #EC4899, #EF4444)',
                        color: 'white',
                        fontSize: '12px',
                        borderRadius: '50%',
                        height: '20px',
                        width: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Desktop Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {user ? (
                <>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => onViewChange('add-product')}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        minHeight: '44px',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>➕</span>
                      <span>Product</span>
                    </button>
                    <button
                      onClick={() => onViewChange('add-store')}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        minHeight: '44px',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>➕</span>
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
                    color: 'white',
                    padding: '8px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    minHeight: '44px',
                    cursor: 'pointer'
                  }}
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay and Drawer */}
      {isMobileMenuOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50
        }} className="md:hidden">
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)'
            }}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <nav 
            ref={drawerRef}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '320px',
              maxWidth: '85vw',
              background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 30, 0.95))',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              overflowY: 'auto'
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Drawer Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: '56px',
                padding: '0 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    height: '32px',
                    width: '32px',
                    background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                  }}>
                    <ShoppingCart size={20} color="white" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>SpendLess</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    minWidth: '44px',
                    minHeight: '44px'
                  }}
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Content */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Mobile Navigation Items */}
                  {allNavItems.map((item) => {
                    const IconComponent = typeof item.icon === 'string' ? null : item.icon;
                    return (
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
                          minHeight: '44px',
                          border: 'none',
                          cursor: 'pointer',
                          ...(currentView === item.id ? {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                          } : {
                            backgroundColor: 'transparent',
                            color: 'rgba(255, 255, 255, 0.7)'
                          })
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {IconComponent ? <IconComponent size={20} /> : <span style={{ fontSize: '20px' }}>{item.icon}</span>}
                          <span style={{ fontWeight: 500 }}>{item.label}</span>
                        </div>
                        {item.badge && item.badge > 0 && (
                          <span style={{
                            background: 'linear-gradient(to right, #EC4899, #EF4444)',
                            color: 'white',
                            fontSize: '12px',
                            borderRadius: '50%',
                            height: '24px',
                            width: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                            flexShrink: 0
                          }}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Mobile Actions */}
                  <div style={{
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
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
                            color: 'white',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            fontWeight: 500,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            minHeight: '44px',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>➕</span>
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
                            color: 'white',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            fontWeight: 500,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            minHeight: '44px',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>➕</span>
                          <span>Add Store</span>
                        </button>
                        <div style={{
                          paddingTop: '16px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <UserMenu />
                        </div>
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
                          color: 'white',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          fontWeight: 500,
                          transition: 'all 0.2s',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          minHeight: '44px',
                          cursor: 'pointer'
                        }}
                      >
                        Sign In
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 30, 0.95))',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.4)'
      }} className="md:hidden">
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: '64px',
          padding: '0 8px'
        }}>
          {primaryNavItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  gap: '4px',
                  transition: 'all 0.2s',
                  position: 'relative',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  ...(currentView === item.id ? {
                    color: 'white'
                  } : {
                    color: 'rgba(255, 255, 255, 0.6)'
                  })
                }}
              >
                <div style={{ position: 'relative' }}>
                  <IconComponent size={24} />
                  {item.badge && item.badge > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: 'linear-gradient(to right, #EC4899, #EF4444)',
                      color: 'white',
                      fontSize: '12px',
                      borderRadius: '50%',
                      height: '20px',
                      width: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      fontWeight: 'bold'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileNavigation;

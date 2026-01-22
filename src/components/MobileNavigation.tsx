import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Package, Store, Home, Plus, DollarSign, List, Menu, X } from 'lucide-react';
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
    { id: 'stores' as ViewMode, icon: Store, label: 'Stores' },
    { id: 'price-manager' as ViewMode, icon: DollarSign, label: 'Prices' },
    { id: 'shopping-lists' as ViewMode, icon: List, label: 'Lists' },
  ];

  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  // Handle escape key to close drawer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  // Focus trap for accessibility
  useEffect(() => {
    if (isMobileMenuOpen && drawerRef.current) {
      const focusableElements = drawerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

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
      };

      document.addEventListener('keydown', handleTab);
      firstElement?.focus();

      return () => document.removeEventListener('keydown', handleTab);
    }
  }, [isMobileMenuOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile Top App Bar */}
      <header className="app-header md:hidden">
        <div className="flex justify-between items-center h-14 px-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-bold text-white truncate">SpendLess</span>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 touch-target"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Desktop Top Navigation Bar */}
      <nav className="hidden md:block sticky top-0 z-40 glass-card border-b border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-white">SpendLess</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-1">
              {allNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 touch-target ${
                    currentView === item.id
                      ? 'bg-white/20 text-white shadow-md backdrop-blur-sm'
                      : 'text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-lg">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-3">
              {user ? (
                <>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onViewChange('add-product')}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm border border-white/20 touch-target"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Product</span>
                    </button>
                    <button
                      onClick={() => onViewChange('add-store')}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm border border-white/20 touch-target"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Store</span>
                    </button>
                  </div>
                  <UserMenu />
                </>
              ) : (
                <button
                  onClick={onShowAuth}
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm border border-white/20 touch-target"
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
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <nav 
            ref={drawerRef}
            className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] glass-card border-r border-white/20 shadow-2xl animate-slide-left overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex flex-col h-full">
              {/* Drawer Header */}
              <div className="flex justify-between items-center h-14 px-4 border-b border-white/20 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-bold text-white">SpendLess</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 touch-target"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="space-y-2">
                  {/* Mobile Navigation Items */}
                  {allNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onViewChange(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200 touch-target ${
                        currentView === item.id
                          ? 'bg-white/20 text-white shadow-md'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {item.badge && item.badge > 0 && (
                        <span className="bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse shadow-lg">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}

                  {/* Mobile Actions */}
                  <div className="pt-4 border-t border-white/20 space-y-2">
                    {user ? (
                      <>
                        <button
                          onClick={() => {
                            onViewChange('add-product');
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg backdrop-blur-sm border border-white/20 touch-target"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Product</span>
                        </button>
                        <button
                          onClick={() => {
                            onViewChange('add-store');
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg backdrop-blur-sm border border-white/20 touch-target"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Store</span>
                        </button>
                        <div className="pt-4 border-t border-white/20">
                          <UserMenu />
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          onShowAuth();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg backdrop-blur-sm border border-white/20 touch-target"
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
      <nav className="app-footer md:hidden">
        <div className="flex justify-around items-center h-16 px-2">
          {primaryNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 relative ${
                currentView === item.id
                  ? 'text-white'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <div className="relative">
                <item.icon className="h-6 w-6" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-lg font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};

export default MobileNavigation;

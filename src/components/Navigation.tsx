import React, { useState } from 'react';
import { ShoppingCart, Package, Store, Home, Plus, DollarSign, List, Menu, X } from 'lucide-react';
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
    { id: 'stores' as ViewMode, icon: Store, label: 'Stores' },
    { id: 'price-manager' as ViewMode, icon: DollarSign, label: 'Prices' },
    { id: 'shopping-list' as ViewMode, icon: ShoppingCart, label: 'Shopping List', badge: shoppingListCount },
    { id: 'shopping-lists' as ViewMode, icon: List, label: 'My Lists' },
  ];

  return (
    <>
      {/* Glass Navigation Bar */}
      <nav className="sticky top-0 z-40 glass-card border-b border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                <span className="text-white">PriceTracker</span>
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
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
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm border border-white/20"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Product</span>
                    </button>
                    <button
                      onClick={() => onViewChange('add-store')}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm border border-white/20"
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
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm border border-white/20"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-16 left-0 right-0 glass-card border-b border-white/20 shadow-2xl animate-slide-up">
            <div className="px-4 py-6 space-y-4">
              {/* Mobile Navigation Items */}
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200 ${
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
              <div className="pt-4 border-t border-white/20 space-y-3">
                {user ? (
                  <>
                    <button
                      onClick={() => {
                        onViewChange('add-product');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg backdrop-blur-sm border border-white/20"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Product</span>
                    </button>
                    <button
                      onClick={() => {
                        onViewChange('add-store');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg backdrop-blur-sm border border-white/20"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Store</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      onShowAuth();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg backdrop-blur-sm border border-white/20"
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
      <div className="glass-card border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-2 text-center">
            <p className="text-white/60 text-xs">
              Made with <span className="text-red-500 animate-pulse">❤️</span> by{' '}
              <a 
                href="https://jawaid.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white font-medium transition-colors duration-200 hover:underline"
              >
                Jawaid.dev
              </a>
              {' '}• Crafted with passion for smart shoppers everywhere
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;
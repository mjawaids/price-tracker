import React from 'react';
import { ShoppingCart, Package, Store, Home, Plus, DollarSign, List } from 'lucide-react';
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

  const navItems = [
    { id: 'dashboard' as ViewMode, icon: Home, label: 'Dashboard' },
    { id: 'products' as ViewMode, icon: Package, label: 'Products' },
    { id: 'stores' as ViewMode, icon: Store, label: 'Stores' },
    { id: 'price-manager' as ViewMode, icon: DollarSign, label: 'Prices' },
    { id: 'shopping-list' as ViewMode, icon: ShoppingCart, label: 'Shopping List', badge: shoppingListCount },
    { id: 'shopping-lists' as ViewMode, icon: List, label: 'My Lists' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">PriceTracker</span>
            </div>
          </div>
          
          <div className="flex space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  currentView === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <item.icon className="h-5 w-5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </div>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onViewChange('add-product')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Product</span>
                  </button>
                  <button
                    onClick={() => onViewChange('add-store')}
                    className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Store</span>
                  </button>
                </div>
                <UserMenu />
              </>
            ) : (
              <button
                onClick={onShowAuth}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
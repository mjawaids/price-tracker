import React from 'react';
import { Package, Store, ShoppingCart, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { Product, Store as StoreType, ShoppingList } from '../types';
import { ViewMode } from '../types';
import { findCheapestPrice } from '../utils/price-comparison';
import { formatPrice } from '../utils/currency';
import { useSettings } from '../contexts/SettingsContext';

interface DashboardProps {
  products: Product[];
  stores: StoreType[];
  shoppingLists: ShoppingList[];
  onViewChange: (view: ViewMode) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ products, stores, shoppingLists, onViewChange }) => {
  const { settings } = useSettings();
  const totalProducts = products.length;
  const totalStores = stores.length;
  const totalShoppingListItems = shoppingLists.reduce((sum, list) => sum + list.items.length, 0);
  
  // Calculate actual metrics
  const totalVariants = products.reduce((sum, product) => sum + product.variants.length, 0);
  const productsWithPrices = products.filter(product => 
    product.variants.some(variant => variant.prices && variant.prices.length > 0)
  ).length;
  const storesWithDelivery = stores.filter(store => store.hasDelivery).length;
  
  // Calculate potential savings by comparing highest vs lowest prices
  const calculatePotentialSavings = () => {
    let totalSavings = 0;
    products.forEach(product => {
      product.variants.forEach(variant => {
        if (variant.prices && variant.prices.length > 1) {
          const prices = variant.prices.filter(p => p.isAvailable).map(p => p.price);
          if (prices.length > 1) {
            const highest = Math.max(...prices);
            const lowest = Math.min(...prices);
            totalSavings += (highest - lowest);
          }
        }
      });
    });
    return totalSavings;
  };
  
  const potentialSavings = calculatePotentialSavings();
  
  const stats = [
    {
      name: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: 'bg-blue-500',
      change: `${totalVariants} variants`,
      changeType: 'neutral'
    },
    {
      name: 'Available Stores',
      value: totalStores,
      icon: Store,
      color: 'bg-green-500',
      change: `${storesWithDelivery} with delivery`,
      changeType: 'neutral'
    },
    {
      name: 'Shopping List Items',
      value: totalShoppingListItems,
      icon: ShoppingCart,
      color: 'bg-purple-500',
      change: `${shoppingLists.length} lists`,
      changeType: 'neutral'
    },
    {
      name: 'Potential Savings',
      value: formatPrice(potentialSavings, settings.currency),
      icon: DollarSign,
      color: 'bg-yellow-500',
      change: `${productsWithPrices} products tracked`,
      changeType: 'neutral'
    }
  ];

  const recentProducts = products.slice(0, 5);
  const recentStores = stores.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="relative gradient-border overflow-hidden shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group gradient-border-hover">
            {/* Gradient Border */}
            {/* Content */}
            <div className="relative z-10">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} rounded-xl p-3 shadow-lg`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      <span className="text-white/70">{stat.name}</span>
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {stat.value}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm text-white/60">
                        <span>{stat.change}</span>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Recent Products */}
        <div className="relative gradient-border shadow-xl rounded-2xl group hover:shadow-2xl transition-all duration-300 gradient-border-hover">
          {/* Gradient Border */}
          {/* Content */}
          <div className="relative z-10">
          <div className="px-6 py-4 border-b border-white/20">
            <h3 className="text-lg font-medium text-white">Recent Products</h3>
          </div>
          <div className="divide-y divide-white/10">
            {recentProducts.map((product) => (
              <div key={product.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">{product.name}</h4>
                    <p className="text-sm text-white/60">{product.category}</p>
                  </div>
                  <div className="text-sm text-white/60">
                    {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
            {recentProducts.length === 0 && (
              <div className="p-6 text-center text-white/60">
                No products added yet
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Recent Stores */}
        <div className="relative gradient-border shadow-xl rounded-2xl group hover:shadow-2xl transition-all duration-300 gradient-border-hover">
          {/* Gradient Border */}
          {/* Content */}
          <div className="relative z-10">
          <div className="px-6 py-4 border-b border-white/20">
            <h3 className="text-lg font-medium text-white">Recent Stores</h3>
          </div>
          <div className="divide-y divide-white/10">
            {recentStores.map((store) => (
              <div key={store.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">{store.name}</h4>
                    <p className="text-sm text-white/60 capitalize">{store.type}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {store.hasDelivery && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                        Delivery
                      </span>
                    )}
                    {store.type === 'online' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Online
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {recentStores.length === 0 && (
              <div className="p-6 text-center text-white/60">
                No stores added yet
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="relative gradient-border shadow-xl rounded-2xl group hover:shadow-2xl transition-all duration-300 gradient-border-hover">
        {/* Gradient Border */}
        {/* Content */}
        <div className="relative z-10">
        <div className="px-6 py-4 border-b border-white/20">
          <h3 className="text-lg font-medium text-white">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button 
              onClick={() => onViewChange('add-product')}
              className="p-6 border border-white/20 rounded-xl hover:bg-white/10 transition-all duration-200 transform hover:scale-105 hover:shadow-lg backdrop-blur-sm group"
            >
              <Package className="h-8 w-8 text-blue-500 mx-auto mb-3 group-hover:scale-110 transition-transform duration-200" />
              <h4 className="text-sm font-medium text-white mb-1">Add Product</h4>
              <p className="text-xs text-white/60">Track prices for a new product</p>
            </button>
            <button 
              onClick={() => onViewChange('add-store')}
              className="p-6 border border-white/20 rounded-xl hover:bg-white/10 transition-all duration-200 transform hover:scale-105 hover:shadow-lg backdrop-blur-sm group"
            >
              <Store className="h-8 w-8 text-green-500 mx-auto mb-3 group-hover:scale-110 transition-transform duration-200" />
              <h4 className="text-sm font-medium text-white mb-1">Add Store</h4>
              <p className="text-xs text-white/60">Register a new store location</p>
            </button>
            <button 
              onClick={() => onViewChange('shopping-lists')}
              className="p-6 border border-white/20 rounded-xl hover:bg-white/10 transition-all duration-200 transform hover:scale-105 hover:shadow-lg backdrop-blur-sm group sm:col-span-2 lg:col-span-1"
            >
              <ShoppingCart className="h-8 w-8 text-purple-500 mx-auto mb-3 group-hover:scale-110 transition-transform duration-200" />
              <h4 className="text-sm font-medium text-white mb-1">Manage Lists</h4>
              <p className="text-xs text-white/60">Start a new shopping list</p>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;
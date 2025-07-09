import React from 'react';
import { Package, Store, ShoppingCart, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { Product, Store as StoreType, ShoppingList } from '../types';
import { ViewMode } from '../types';
import { findCheapestPrice } from '../utils/price-comparison';
import { formatPrice } from '../utils/currency';

interface DashboardProps {
  products: Product[];
  stores: StoreType[];
  shoppingLists: ShoppingList[];
  onViewChange: (view: ViewMode) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ products, stores, shoppingLists, onViewChange }) => {
  const totalProducts = products.length;
  const totalStores = stores.length;
  const totalShoppingListItems = shoppingLists.reduce((sum, list) => sum + list.items.length, 0);
  
  const stats = [
    {
      name: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Available Stores',
      value: totalStores,
      icon: Store,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'positive'
    },
    {
      name: 'Shopping List Items',
      value: totalShoppingListItems,
      icon: ShoppingCart,
      color: 'bg-purple-500',
      change: '+15%',
      changeType: 'positive'
    },
    {
      name: 'Potential Savings',
      value: '$127.50',
      icon: DollarSign,
      color: 'bg-yellow-500',
      change: '+5%',
      changeType: 'positive'
    }
  ];

  const recentProducts = products.slice(0, 5);
  const recentStores = stores.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} rounded-md p-3`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.changeType === 'positive' ? (
                          <TrendingUp className="h-4 w-4 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-1" />
                        )}
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Products */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Products</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recentProducts.map((product) => (
              <div key={product.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{product.name}</h4>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
            {recentProducts.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No products added yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Stores */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Stores</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recentStores.map((store) => (
              <div key={store.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{store.name}</h4>
                    <p className="text-sm text-gray-500 capitalize">{store.type}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {store.hasDelivery && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Delivery
                      </span>
                    )}
                    {store.type === 'online' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Online
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {recentStores.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No stores added yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => onViewChange('add-product')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <Package className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h4 className="text-sm font-medium text-gray-900">Add Product</h4>
              <p className="text-xs text-gray-500">Track prices for a new product</p>
            </button>
            <button 
              onClick={() => onViewChange('add-store')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <Store className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h4 className="text-sm font-medium text-gray-900">Add Store</h4>
              <p className="text-xs text-gray-500">Register a new store location</p>
            </button>
            <button 
              onClick={() => onViewChange('shopping-lists')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <ShoppingCart className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <h4 className="text-sm font-medium text-gray-900">Manage Lists</h4>
              <p className="text-xs text-gray-500">Start a new shopping list</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
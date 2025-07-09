import React, { useState } from 'react';
import { Package, Edit, Trash2, Plus, Search } from 'lucide-react';
import { Product, Store } from '../types';
import { findCheapestPrice } from '../utils/price-comparison';

interface ProductListProps {
  products: Product[];
  stores: Store[];
  onDeleteProduct: (id: string) => void;
}

const ProductList: React.FC<ProductListProps> = ({ products, stores, onDeleteProduct }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', ...new Set(products.map(p => p.category))];
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Products</h2>
            <div className="flex space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredProducts.map((product) => (
            <div key={product.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.brand} • {product.category}</p>
                    <p className="text-sm text-gray-500">
                      {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDeleteProduct(product.id)}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors duration-200"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Variants */}
              <div className="mt-4 space-y-2">
                {product.variants.map((variant) => {
                  const cheapestPrice = findCheapestPrice(variant.prices, stores);
                  return (
                    <div key={variant.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{variant.name}</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {Object.entries(variant.specifications).map(([key, value]) => (
                              <span key={key} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          {cheapestPrice ? (
                            <div>
                              <div className="text-lg font-semibold text-green-600">
                                ${cheapestPrice.price.price.toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500">
                                at {cheapestPrice.store?.name}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">No prices available</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          {filteredProducts.length === 0 && (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500">Get started by adding your first product to track prices.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductList;
import React, { useState } from 'react';
import { Package, Edit, Trash2, Plus, Search } from 'lucide-react';
import { Product, Store } from '../types';
import { findCheapestPrice } from '../utils/price-comparison';
import { formatPrice } from '../utils/currency';
import EditProduct from './EditProduct';
import { useSettings } from '../contexts/SettingsContext';

interface ProductListProps {
  products: Product[];
  stores: Store[];
  onDeleteProduct: (id: string) => void;
  onUpdateProduct: (product: Product) => void;
}

const ProductList: React.FC<ProductListProps> = ({ products, stores, onDeleteProduct, onUpdateProduct }) => {
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const categories = ['all', ...new Set(products.map(p => p.category))];
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="gradient-border shadow-xl rounded-2xl group hover:shadow-2xl transition-all duration-300 gradient-border-hover">
        <div className="px-6 py-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">Products</h2>
            <div className="flex space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-white/20 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white/10 backdrop-blur-sm text-white placeholder-white/60"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-white/20 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white/10 backdrop-blur-sm text-white"
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
        
        <div className="divide-y divide-white/10">
          {filteredProducts.map((product) => (
            <div key={product.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <Package className="h-6 w-6 text-white/60" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">{product.name}</h3>
                    <p className="text-sm text-white/60">{product.brand} • {product.category}</p>
                    <p className="text-sm text-white/60">
                      {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setEditingProduct(product)}
                    className="p-2 text-white/40 hover:text-white/80 transition-colors duration-200"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDeleteProduct(product.id)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors duration-200"
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
                    <div key={variant.id} className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-white">{variant.name}</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {Object.entries(variant.specifications).map(([key, value]) => (
                              <span key={key} className="text-xs bg-white/20 text-white/80 px-2 py-1 rounded backdrop-blur-sm">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          {cheapestPrice ? (
                            <div>
                              <div className="text-lg font-semibold text-green-600">
                                {formatPrice(cheapestPrice.price.price, settings.currency)}
                              </div>
                              <div className="text-sm text-white/60">
                                at {cheapestPrice.store?.name}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-white/60">No prices available</div>
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
              <Package className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No products found</h3>
              <p className="text-white/60">Get started by adding your first product to track prices.</p>
            </div>
          )}
        </div>
      </div>
      
      {editingProduct && (
        <EditProduct
          product={editingProduct}
          onUpdateProduct={(updatedProduct) => {
            onUpdateProduct(updatedProduct);
            setEditingProduct(null);
          }}
          onCancel={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
};

export default ProductList;
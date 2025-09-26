import React, { useState } from 'react';
import { CreditCard as Edit, Trash2, DollarSign, Package, Store } from 'lucide-react';
import { Product, Store as StoreType } from '../types';
import { formatPrice } from '../utils/currency';
import { useSettings } from '../contexts/SettingsContext';
import EditProduct from './EditProduct';
import { trackUserAction } from '../utils/analytics';

interface ProductListProps {
  products: Product[];
  stores: StoreType[];
  onDeleteProduct: (id: string) => void;
  onUpdateProduct: (product: Product) => void;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  stores,
  onDeleteProduct,
  onUpdateProduct,
}) => {
  const { settings } = useSettings();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    onUpdateProduct(updatedProduct);
    setEditingProduct(null);
  };

  const getCheapestPrice = (product: Product) => {
    let cheapestPrice = Infinity;
    let cheapestStore = '';
    
    product.variants.forEach(variant => {
      variant.prices.forEach(price => {
        if (price.price < cheapestPrice) {
          cheapestPrice = price.price;
          const store = stores.find(s => s.id === price.storeId);
          cheapestStore = store?.name || 'Unknown Store';
        }
      });
    });
    
    return cheapestPrice === Infinity ? null : { price: cheapestPrice, store: cheapestStore };
  };

  if (products.length === 0) {
    return (
      <div className="relative gradient-border shadow-xl rounded-2xl group hover:shadow-2xl transition-all duration-300 gradient-border-hover overflow-hidden">
        <div className="relative z-10 bg-white dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl">
          <div className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 dark:text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No products yet</h3>
            <p className="text-gray-500 dark:text-white/60">Add your first product to start tracking prices across different stores.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="relative gradient-border shadow-xl rounded-2xl group hover:shadow-2xl transition-all duration-300 gradient-border-hover overflow-hidden">
          <div className="relative z-10 bg-white dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/20">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Products</h2>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-white/10">
              {products.map((product) => {
                const cheapestPrice = getCheapestPrice(product);
                
                return (
                  <div key={product.id} className="p-6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{product.name}</h3>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-sm text-gray-500 dark:text-white/60">{product.brand}</span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                                {product.category}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Variants:</span>
                            <span className="text-sm text-gray-500 dark:text-white/60">{product.variants.length} available</span>
                          </div>
                          
                          {cheapestPrice && (
                            <div className="flex items-center space-x-2">
                              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Best price: <span className="font-medium text-green-600 dark:text-green-400">
                                  {formatPrice(cheapestPrice.price, settings.currency)}
                                </span> at {cheapestPrice.store}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="p-2 text-gray-400 dark:text-white/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteProduct(product.id)}
                          className="p-2 text-gray-400 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {editingProduct && (
        <EditProduct
          product={editingProduct}
          stores={stores}
          onUpdateProduct={handleUpdateProduct}
          onCancel={() => setEditingProduct(null)}
        />
      )}
    </>
  );
};

export default ProductList;
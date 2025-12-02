import React, { useState } from 'react';
import { CreditCard as Edit, Trash2, DollarSign, Package, Store, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    onUpdateProduct(updatedProduct);
    setEditingProduct(null);
  };

  const toggleExpandProduct = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
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

  const getVariantPricesInStores = (variantId: string) => {
    const pricesByStore: Record<string, { price: number; discount?: number; available: boolean }> = {};

    products.forEach(product => {
      const variant = product.variants.find(v => v.id === variantId);
      if (variant) {
        variant.prices.forEach(price => {
          const store = stores.find(s => s.id === price.storeId);
          if (store) {
            pricesByStore[store.id] = {
              price: price.price,
              discount: price.discountPercentage,
              available: price.isAvailable
            };
          }
        });
      }
    });

    return pricesByStore;
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
      <div className="space-y-3 md:space-y-6">
        <div className="relative gradient-border shadow-lg md:shadow-xl rounded-2xl group md:hover:shadow-2xl transition-all duration-300 gradient-border-hover overflow-hidden">
          <div className="relative z-10 bg-white dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 dark:border-white/20">
              <h2 className="text-base md:text-lg font-medium text-gray-900 dark:text-white">Products</h2>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-white/10">
              {products.map((product) => {
                const cheapestPrice = getCheapestPrice(product);
                const isExpanded = expandedProducts.has(product.id);

                return (
                  <div key={product.id}>
                    <div className="p-3 md:p-6 md:hover:bg-gray-50 dark:md:hover:bg-white/5 transition-colors duration-200 active:bg-white/5 md:active:bg-transparent touch-target">
                      <div className="flex items-start justify-between gap-2 md:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 md:gap-3">
                            <button
                              onClick={() => toggleExpandProduct(product.id)}
                              className="p-1 md:p-0 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 transition-colors duration-200 flex-shrink-0 touch-target"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 md:h-5 w-4 md:w-5" />
                              ) : (
                                <ChevronRight className="h-4 md:h-5 w-4 md:w-5" />
                              )}
                            </button>
                            <div className="flex-shrink-0">
                              <Package className="h-5 md:h-8 w-5 md:w-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm md:text-lg font-medium text-gray-900 dark:text-white truncate">{product.name}</h3>
                              <div className="flex items-center gap-1 md:gap-4 mt-1 flex-wrap">
                                {product.brand && <span className="text-xs md:text-sm text-gray-500 dark:text-white/60 truncate">{product.brand}</span>}
                                <span className="inline-flex items-center px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 flex-shrink-0">
                                  {product.category}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 md:mt-4 ml-7 md:ml-11">
                            <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                              <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Variants:</span>
                              <span className="text-xs md:text-sm text-gray-500 dark:text-white/60">{product.variants.length} available</span>
                            </div>

                            {cheapestPrice && (
                              <div className="flex items-center gap-1 md:gap-2">
                                <DollarSign className="h-3 md:h-4 w-3 md:w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300 truncate">
                                  Best: <span className="font-medium text-green-600 dark:text-green-400">
                                    {formatPrice(cheapestPrice.price, settings.currency)}
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-2 text-gray-400 dark:text-white/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 touch-target"
                          >
                            <Edit className="h-4 md:h-5 w-4 md:w-5" />
                          </button>
                          <button
                            onClick={() => onDeleteProduct(product.id)}
                            className="p-2 text-gray-400 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 touch-target"
                          >
                            <Trash2 className="h-4 md:h-5 w-4 md:w-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-3 md:px-6 py-3 md:py-4 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10">
                        <div className="space-y-3 md:space-y-6">
                          {product.variants.map((variant) => (
                            <div key={variant.id} className="border border-gray-200 dark:border-white/10 rounded-lg p-3 md:p-4 bg-white dark:bg-gray-800/50">
                              <div className="mb-3 md:mb-4">
                                <h4 className="font-semibold text-sm md:text-base text-gray-900 dark:text-white">{variant.name}</h4>
                                {Object.keys(variant.specifications).length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {Object.entries(variant.specifications).map(([key, value]) => (
                                      <p key={key} className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">{key}:</span> {value}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2">
                                <p className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Prices by Store:</p>
                                {variant.prices.length === 0 ? (
                                  <p className="text-sm text-gray-500 dark:text-white/60">No prices recorded yet</p>
                                ) : (
                                  <div className="space-y-2">
                                    {variant.prices.map((price) => {
                                      const store = stores.find(s => s.id === price.storeId);
                                      const displayPrice = price.discountPercentage
                                        ? price.price * (1 - price.discountPercentage / 100)
                                        : price.price;

                                      return (
                                        <div key={price.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded">
                                          <div className="flex items-center space-x-2">
                                            <Store className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{store?.name || 'Unknown'}</span>
                                          </div>
                                          <div className="flex items-center space-x-3">
                                            <div className="text-right">
                                              {price.discountPercentage ? (
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-sm line-through text-gray-500 dark:text-gray-400">
                                                    {formatPrice(price.price, settings.currency)}
                                                  </span>
                                                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                                    {formatPrice(displayPrice, settings.currency)}
                                                  </span>
                                                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                                                    -{price.discountPercentage}%
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                  {formatPrice(price.price, settings.currency)}
                                                </span>
                                              )}
                                            </div>
                                            {!price.isAvailable && (
                                              <span className="text-xs bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                                                Out of Stock
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
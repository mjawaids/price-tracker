import React, { useState } from 'react';
import { Plus, Edit, Trash2, DollarSign, Calendar, CheckCircle, X } from 'lucide-react';
import { Product, Store, Price } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { CURRENCIES, formatPrice } from '../utils/currency';

interface PriceManagerProps {
  products: Product[];
  stores: Store[];
  onUpdateProduct: (product: Product) => void;
}

const PriceManager: React.FC<PriceManagerProps> = ({ products, stores, onUpdateProduct }) => {
  const { settings } = useSettings();
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [showAddPriceModal, setShowAddPriceModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<Price | null>(null);
  const [newPrice, setNewPrice] = useState({
    storeId: '',
    price: '',
    currency: settings.currency,
    isAvailable: true,
    discountPercentage: ''
  });

  const selectedProductData = products.find(p => p.id === selectedProduct);
  const selectedVariantData = selectedProductData?.variants.find(v => v.id === selectedVariant);

  const handleAddPrice = () => {
    if (!selectedProduct || !selectedVariant || !newPrice.storeId || !newPrice.price) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const updatedProduct = { ...product };
    const variantIndex = updatedProduct.variants.findIndex(v => v.id === selectedVariant);
    
    if (variantIndex === -1) return;

    const priceData: Price = {
      id: Date.now().toString(),
      storeId: newPrice.storeId,
      price: parseFloat(newPrice.price),
      currency: newPrice.currency,
      lastUpdated: new Date(),
      isAvailable: newPrice.isAvailable,
      discountPercentage: newPrice.discountPercentage ? parseFloat(newPrice.discountPercentage) : undefined
    };

    // Remove existing price for this store if it exists
    updatedProduct.variants[variantIndex].prices = updatedProduct.variants[variantIndex].prices.filter(
      p => p.storeId !== newPrice.storeId
    );

    // Add new price
    updatedProduct.variants[variantIndex].prices.push(priceData);
    updatedProduct.updatedAt = new Date();

    onUpdateProduct(updatedProduct);
    resetForm();
  };

  const handleEditPrice = (price: Price) => {
    setEditingPrice(price);
    setNewPrice({
      storeId: price.storeId,
      price: price.price.toString(),
      currency: price.currency,
      isAvailable: price.isAvailable,
      discountPercentage: price.discountPercentage?.toString() || ''
    });
    setShowAddPriceModal(true);
  };

  const handleUpdatePrice = () => {
    if (!selectedProduct || !selectedVariant || !editingPrice) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const updatedProduct = { ...product };
    const variantIndex = updatedProduct.variants.findIndex(v => v.id === selectedVariant);
    
    if (variantIndex === -1) return;

    const priceIndex = updatedProduct.variants[variantIndex].prices.findIndex(p => p.id === editingPrice.id);
    if (priceIndex === -1) return;

    updatedProduct.variants[variantIndex].prices[priceIndex] = {
      ...editingPrice,
      storeId: newPrice.storeId,
      price: parseFloat(newPrice.price),
      currency: newPrice.currency,
      isAvailable: newPrice.isAvailable,
      discountPercentage: newPrice.discountPercentage ? parseFloat(newPrice.discountPercentage) : undefined,
      lastUpdated: new Date()
    };

    updatedProduct.updatedAt = new Date();
    onUpdateProduct(updatedProduct);
    resetForm();
  };

  const handleDeletePrice = (priceId: string) => {
    if (!selectedProduct || !selectedVariant) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const updatedProduct = { ...product };
    const variantIndex = updatedProduct.variants.findIndex(v => v.id === selectedVariant);
    
    if (variantIndex === -1) return;

    updatedProduct.variants[variantIndex].prices = updatedProduct.variants[variantIndex].prices.filter(
      p => p.id !== priceId
    );

    updatedProduct.updatedAt = new Date();
    onUpdateProduct(updatedProduct);
  };

  const resetForm = () => {
    setNewPrice({
      storeId: '',
      price: '',
      currency: settings.currency,
      isAvailable: true,
      discountPercentage: ''
    });
    setEditingPrice(null);
    setShowAddPriceModal(false);
  };

  const getStoreName = (storeId: string) => {
    return stores.find(s => s.id === storeId)?.name || 'Unknown Store';
  };

  return (
    <div className="space-y-6">
      <div className="relative gradient-border shadow-xl rounded-2xl group hover:shadow-2xl transition-all duration-300 gradient-border-hover overflow-hidden">
        {/* Content */}
        <div className="relative z-10 bg-white dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/20">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Price Management</h2>
          <p className="text-sm text-gray-500 dark:text-white/60 mt-1">Add and update prices for your products across different stores</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Product and Variant Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Product
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => {
                  setSelectedProduct(e.target.value);
                  setSelectedVariant('');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Choose a product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.brand}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedProduct && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Variant
                </label>
                <select
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Choose a variant</option>
                  {selectedProductData?.variants.map(variant => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Current Prices */}
          {selectedVariant && selectedVariantData && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Current Prices</h3>
                <button
                  onClick={() => setShowAddPriceModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Price</span>
                </button>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  {selectedProductData?.name} - {selectedVariantData.name}
                </h4>
                
                {selectedVariantData.prices.length === 0 ? (
                  <p className="text-gray-500 dark:text-white/60 text-center py-8">No prices added yet</p>
                ) : (
                  <div className="space-y-3">
                    {selectedVariantData.prices.map((price) => (
                      <div key={price.id} className="bg-white dark:bg-gray-900/50 rounded-lg p-4 flex items-center justify-between border border-gray-200 dark:border-white/10">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${price.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white">{getStoreName(price.storeId)}</h5>
                            <p className="text-sm text-gray-500 dark:text-white/60">
                              Updated {new Date(price.lastUpdated).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {formatPrice(price.price, settings.currency)}
                            </div>
                            {price.discountPercentage && (
                              <div className="text-sm text-green-600">
                                {price.discountPercentage}% off
                              </div>
                            )}
                          </div>
                          
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleEditPrice(price)}
                              className="p-2 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/80 transition-colors duration-200"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePrice(price.id)}
                              className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Add/Edit Price Modal */}
      {showAddPriceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl max-w-md w-full shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {editingPrice ? 'Edit Price' : 'Add New Price'}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Store
                </label>
                <select
                  value={newPrice.storeId}
                  onChange={(e) => setNewPrice({ ...newPrice, storeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select a store</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store.type})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPrice.price}
                    onChange={(e) => setNewPrice({ ...newPrice, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Currency
                  </label>
                  <select
                    value={newPrice.currency}
                    onChange={(e) => setNewPrice({ ...newPrice, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {CURRENCIES.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.flag} {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discount Percentage (Optional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newPrice.discountPercentage}
                  onChange={(e) => setNewPrice({ ...newPrice, discountPercentage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="flex items-center text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={newPrice.isAvailable}
                    onChange={(e) => setNewPrice({ ...newPrice, isAvailable: e.target.checked })}
                    className="mr-2"
                  />
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Available in stock
                </label>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 rounded-b-2xl flex justify-end space-x-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={editingPrice ? handleUpdatePrice : handleAddPrice}
                disabled={!newPrice.storeId || !newPrice.price}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {editingPrice ? 'Update Price' : 'Add Price'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceManager;
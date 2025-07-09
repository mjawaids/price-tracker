import React, { useState } from 'react';
import { Plus, Minus, ShoppingCart, Trash2, DollarSign, CheckCircle } from 'lucide-react';
import { Product, Store, ShoppingListItem } from '../types';
import { findCheapestPrice } from '../utils/price-comparison';
import { formatPrice } from '../utils/currency';
import { useSettings } from '../contexts/SettingsContext';

interface ShoppingListProps {
  products: Product[];
  stores: Store[];
  shoppingList: ShoppingListItem[];
  onAddToList: (item: Omit<ShoppingListItem, 'id' | 'addedAt'>) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveFromList: (id: string) => void;
  onClearList: () => void;
}

const ShoppingList: React.FC<ShoppingListProps> = ({
  products,
  stores,
  shoppingList,
  onAddToList,
  onUpdateQuantity,
  onRemoveFromList,
  onClearList,
}) => {
  const { settings } = useSettings();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const handleAddToList = () => {
    if (selectedProduct && selectedVariant) {
      onAddToList({
        productId: selectedProduct,
        variantId: selectedVariant,
        quantity,
        priority,
      });
      setShowAddModal(false);
      setSelectedProduct('');
      setSelectedVariant('');
      setQuantity(1);
      setPriority('medium');
    }
  };

  const getProductAndVariant = (productId: string, variantId: string) => {
    const product = products.find(p => p.id === productId);
    const variant = product?.variants.find(v => v.id === variantId);
    return { product, variant };
  };

  const calculateTotal = () => {
    return shoppingList.reduce((total, item) => {
      const { variant } = getProductAndVariant(item.productId, item.variantId);
      if (!variant) return total;
      
      const cheapestPrice = findCheapestPrice(variant.prices, stores);
      return total + (cheapestPrice?.price.price || 0) * item.quantity;
    }, 0);
  };

  const groupByStore = () => {
    const storeGroups: Record<string, { store: Store; items: Array<ShoppingListItem & { product: Product; variant: any; price: any }> }> = {};
    
    shoppingList.forEach(item => {
      const { product, variant } = getProductAndVariant(item.productId, item.variantId);
      if (!product || !variant) return;
      
      const cheapestPrice = findCheapestPrice(variant.prices, stores);
      if (!cheapestPrice) return;
      
      const storeId = cheapestPrice.store!.id;
      if (!storeGroups[storeId]) {
        storeGroups[storeId] = {
          store: cheapestPrice.store!,
          items: []
        };
      }
      
      storeGroups[storeId].items.push({
        ...item,
        product,
        variant,
        price: cheapestPrice.price
      });
    });
    
    return storeGroups;
  };

  const storeGroups = groupByStore();

  return (
    <div className="space-y-6">
      <div className="gradient-border shadow-xl rounded-2xl group hover:shadow-2xl transition-all duration-300 gradient-border-hover">
        <div className="px-6 py-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">Shopping List</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm border border-white/20"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </button>
              {shoppingList.length > 0 && (
                <button
                  onClick={onClearList}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm border border-red-500/30"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear List</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {shoppingList.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="h-12 w-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Your shopping list is empty</h3>
            <p className="text-white/60">Add items to start comparing prices and planning your shopping trip.</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Summary */}
            <div className="bg-green-500/20 rounded-lg p-4 mb-6 backdrop-blur-sm border border-green-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-green-300">Total Estimated Cost</h3>
                  <p className="text-sm text-green-400">{shoppingList.length} items</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-300">
                    {formatPrice(calculateTotal(), settings.currency)}
                  </div>
                  <div className="text-sm text-green-400">Best prices selected</div>
                </div>
              </div>
            </div>

            {/* Store Groups */}
            <div className="space-y-6">
              {Object.entries(storeGroups).map(([storeId, group]) => (
                <div key={storeId} className="border border-white/20 rounded-lg backdrop-blur-sm">
                  <div className="bg-white/10 px-4 py-3 border-b border-white/20 rounded-t-lg backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{group.store.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{group.store.type}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                    className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors duration-200"
                        </div>
                        <div className="text-sm text-gray-500">
                          {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {group.items.map((item) => (
                      <div key={item.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                    <div key={variant.id} className="bg-gray-50 dark:bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          <h4 className="font-medium text-gray-900 dark:text-white">{variant.name}</h4>
                                item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              <span key={key} className="text-xs bg-gray-200 dark:bg-white/20 text-gray-700 dark:text-white/80 px-2 py-1 rounded backdrop-blur-sm">
                                {item.priority} priority
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <button
                                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            
                            <div className="text-right">
                              <div className="font-medium text-gray-900">
                                {formatPrice(item.price.price * item.quantity, settings.currency)}
                              </div>
                              <div className="text-sm text-gray-500">
                                <span className="text-gray-500 dark:text-white/60">at {cheapestPrice.store?.name}</span>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => onRemoveFromList(item.id)}
                              className="p-1 text-red-400 hover:text-red-600 transition-colors duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            <div className="text-sm text-gray-500 dark:text-white/60">No prices available</div>
                          </div>
                        </div>
                      </div>
                    ))}
              <Package className="h-12 w-12 text-gray-400 dark:text-white/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No products found</h3>
              <p className="text-gray-500 dark:text-white/60">Get started by adding your first product to track prices.</p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Add Item to Shopping List</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => {
                    setSelectedProduct(e.target.value);
                    setSelectedVariant('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.brand}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedProduct && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Variant
                  </label>
                  <select
                    value={selectedVariant}
                    onChange={(e) => setSelectedVariant(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a variant</option>
                    {products.find(p => p.id === selectedProduct)?.variants.map(variant => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToList}
                disabled={!selectedProduct || !selectedVariant}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Add to List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingList;
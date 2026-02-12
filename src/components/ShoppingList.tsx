import React, { useState } from 'react';
import { Plus, Minus, ShoppingCart, Trash, Truck } from '@geist-ui/icons';
import { Card, Text, Button, Modal, Input, Select } from '@geist-ui/core';
import { Product, Store, ShoppingListItem, ProductVariant, Price } from '../types';
import { findCheapestPriceWithDelivery } from '../utils/price-comparison';
import { formatPrice } from '../utils/currency';
import { useSettings } from '../contexts/SettingsContext';
import { trackUserAction } from '../utils/analytics';

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
      trackUserAction('add_to_shopping_list', { 
        productId: selectedProduct, 
        variantId: selectedVariant,
        quantity,
        priority 
      });
      
      trackUserAction('add_to_shopping_list', { 
        productId: selectedProduct, 
        variantId: selectedVariant,
        quantity,
        priority 
      });
      
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

      const cheapestOption = findCheapestPriceWithDelivery(variant.prices, stores);
      return total + (cheapestOption?.totalPrice || 0) * item.quantity;
    }, 0);
  };

  const groupByStore = () => {
    const storeGroups: Record<string, { store: Store; items: Array<ShoppingListItem & { product: Product; variant: ProductVariant; price: Price; priceWithDelivery: number }>; deliveryFee: number }> = {};

    shoppingList.forEach(item => {
      const { product, variant } = getProductAndVariant(item.productId, item.variantId);
      if (!product || !variant) return;

      const cheapestOption = findCheapestPriceWithDelivery(variant.prices, stores);
      if (!cheapestOption) return;

      const storeId = cheapestOption.store!.id;
      if (!storeGroups[storeId]) {
        storeGroups[storeId] = {
          store: cheapestOption.store!,
          items: [],
          deliveryFee: (cheapestOption.store?.hasDelivery && cheapestOption.store?.deliveryFee) ? cheapestOption.store.deliveryFee : 0
        };
      }

      storeGroups[storeId].items.push({
        ...item,
        product,
        variant,
        price: cheapestOption.price,
        priceWithDelivery: cheapestOption.totalPrice
      });
    });

    return storeGroups;
  };

  const storeGroups = groupByStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <Card width="100%">
        <Card.Content style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <Text h3 my={0}>Shopping List</Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <Button
                  auto
                  onClick={() => setShowAddModal(true)}
                  icon={<Plus size={16} />}
                  style={{ minHeight: '44px' }}
                >
                  <span style={{ display: 'inline', '@media (max-width: 640px)': { display: 'none' } }}>Add Item</span>
                  <span style={{ display: 'none', '@media (max-width: 640px)': { display: 'inline' } }}>Add</span>
                </Button>
                {shoppingList.length > 0 && (
                  <Button
                    auto
                    type="error"
                    onClick={onClearList}
                    icon={<Trash size={16} />}
                    style={{ minHeight: '44px' }}
                  >
                    <span style={{ display: 'inline', '@media (max-width: 640px)': { display: 'none' } }}>Clear List</span>
                    <span style={{ display: 'none', '@media (max-width: 640px)': { display: 'inline' } }}>Clear</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {shoppingList.length === 0 ? (
            <div style={{ padding: '96px 32px', textAlign: 'center' }}>
              <ShoppingCart size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
              <Text h4 my={0} style={{ marginBottom: '8px' }}>Your shopping list is empty</Text>
              <Text style={{ opacity: 0.6, fontSize: '14px' }}>Add items to start comparing prices and planning your shopping trip.</Text>
            </div>
          ) : (
            <div style={{ padding: '16px 24px' }}>
              {/* Summary */}
              <div style={{ 
                backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '24px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <Text h4 my={0} style={{ color: '#10B981', marginBottom: '4px' }}>Total Estimated Cost</Text>
                    <Text small style={{ color: '#34D399' }}>{shoppingList.length} items</Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981', marginBottom: '4px' }}>
                      {formatPrice(calculateTotal(), settings.currency)}
                    </div>
                    <Text small style={{ color: '#34D399' }}>Best prices selected</Text>
                  </div>
                </div>
              </div>

              {/* Store Groups */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {Object.entries(storeGroups).map(([storeId, group]) => (
                  <div key={storeId} style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                    <div style={{ 
                      backgroundColor: 'rgba(255,255,255,0.1)', 
                      padding: '12px 16px', 
                      borderBottom: '1px solid rgba(255,255,255,0.2)',
                      borderTopLeftRadius: '8px',
                      borderTopRightRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <Text h4 my={0}>{group.store.name}</Text>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                            <Text small style={{ opacity: 0.7, textTransform: 'capitalize' }}>{group.store.type}</Text>
                            {group.deliveryFee > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Truck size={12} style={{ opacity: 0.7 }} />
                                <Text small style={{ opacity: 0.7 }}>Delivery: {formatPrice(group.deliveryFee, settings.currency)}</Text>
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <Text small style={{ opacity: 0.7 }}>
                            {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                          </Text>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      {group.items.map((item) => (
                        <div key={item.id} style={{ 
                          padding: '16px', 
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          borderBottom: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ flex: '1', minWidth: '200px' }}>
                              <Text b my={0}>{item.product.name}</Text>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <span style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  padding: '2px 10px', 
                                  borderRadius: '16px', 
                                  fontSize: '12px', 
                                  fontWeight: 500,
                                  backgroundColor: item.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' :
                                    item.priority === 'medium' ? 'rgba(234, 179, 8, 0.2)' :
                                    'rgba(16, 185, 129, 0.2)',
                                  color: item.priority === 'high' ? '#EF4444' :
                                    item.priority === 'medium' ? '#EAB308' :
                                    '#10B981',
                                  border: item.priority === 'high' ? '1px solid rgba(239, 68, 68, 0.3)' :
                                    item.priority === 'medium' ? '1px solid rgba(234, 179, 8, 0.3)' :
                                    '1px solid rgba(16, 185, 129, 0.3)'
                                }}>
                                  {item.priority} priority
                                </span>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                  style={{
                                    padding: '8px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    opacity: 0.7,
                                    transition: 'all 0.2s',
                                    minWidth: '44px',
                                    minHeight: '44px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={16} />
                                </button>
                                <span style={{ width: '32px', textAlign: 'center', fontWeight: 500 }}>{item.quantity}</span>
                                <button
                                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                  style={{
                                    padding: '8px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    opacity: 0.7,
                                    transition: 'all 0.2s',
                                    minWidth: '44px',
                                    minHeight: '44px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                              
                              <div style={{ textAlign: 'right' }}>
                                <Text b my={0}>
                                  {formatPrice(item.priceWithDelivery * item.quantity, settings.currency)}
                                </Text>
                                <Text small style={{ opacity: 0.7 }}>
                                  {formatPrice(item.priceWithDelivery, settings.currency)} each
                                </Text>
                              </div>
                              
                              <button
                                onClick={() => onRemoveFromList(item.id)}
                                style={{
                                  padding: '8px',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  color: '#EF4444',
                                  transition: 'all 0.2s',
                                  minWidth: '44px',
                                  minHeight: '44px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                aria-label="Remove item"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Add Item Modal */}
      <Modal visible={showAddModal} onClose={() => setShowAddModal(false)}>
        <Modal.Title>Add Item to Shopping List</Modal.Title>
        <Modal.Content>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <Text small b style={{ marginBottom: '8px', display: 'block' }}>Product</Text>
              <Select
                placeholder="Select a product"
                value={selectedProduct}
                onChange={(val) => {
                  setSelectedProduct(val as string);
                  setSelectedVariant('');
                }}
                width="100%"
              >
                {products.map(product => (
                  <Select.Option key={product.id} value={product.id}>
                    {product.name} - {product.brand}
                  </Select.Option>
                ))}
              </Select>
            </div>
            
            {selectedProduct && (
              <div>
                <Text small b style={{ marginBottom: '8px', display: 'block' }}>Variant</Text>
                <Select
                  placeholder="Select a variant"
                  value={selectedVariant}
                  onChange={(val) => setSelectedVariant(val as string)}
                  width="100%"
                >
                  {products.find(p => p.id === selectedProduct)?.variants.map(variant => (
                    <Select.Option key={variant.id} value={variant.id}>
                      {variant.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            )}
            
            <div>
              <Text small b style={{ marginBottom: '8px', display: 'block' }}>Quantity</Text>
              <Input
                type="number"
                min={1}
                value={quantity.toString()}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                width="100%"
              />
            </div>
            
            <div>
              <Text small b style={{ marginBottom: '8px', display: 'block' }}>Priority</Text>
              <Select
                value={priority}
                onChange={(val) => setPriority(val as 'low' | 'medium' | 'high')}
                width="100%"
              >
                <Select.Option value="low">Low</Select.Option>
                <Select.Option value="medium">Medium</Select.Option>
                <Select.Option value="high">High</Select.Option>
              </Select>
            </div>
          </div>
        </Modal.Content>
        <Modal.Action passive onClick={() => setShowAddModal(false)}>Cancel</Modal.Action>
        <Modal.Action onClick={handleAddToList} disabled={!selectedProduct || !selectedVariant}>
          Add to List
        </Modal.Action>
      </Modal>
    </div>
  );
};

export default ShoppingList;
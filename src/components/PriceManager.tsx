import React, { useState } from 'react';
import { Plus, Edit, Trash, DollarSign, Calendar, Check, X } from '@geist-ui/icons';
import { Card, Button, Input, Select, Modal, Text } from '@geist-ui/core';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card width="100%">
        <Card.Content style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Text h3 my={0}>Price Management</Text>
            <Text small style={{ opacity: 0.6, marginTop: '4px' }}>Add and update prices for your products across different stores</Text>
          </div>
          
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: selectedProduct ? 'repeat(auto-fit, minmax(250px, 1fr))' : '1fr', 
              gap: '24px' 
            }}>
              <div>
                <Text small b style={{ marginBottom: '8px', display: 'block' }}>Select Product</Text>
                <Select
                  value={selectedProduct}
                  onChange={(val) => {
                    setSelectedProduct(val as string);
                    setSelectedVariant('');
                  }}
                  placeholder="Choose a product"
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
                  <Text small b style={{ marginBottom: '8px', display: 'block' }}>Select Variant</Text>
                  <Select
                    value={selectedVariant}
                    onChange={(val) => setSelectedVariant(val as string)}
                    placeholder="Choose a variant"
                    width="100%"
                  >
                    {selectedProductData?.variants.map(variant => (
                      <Select.Option key={variant.id} value={variant.id}>
                        {variant.name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            {selectedVariant && selectedVariantData && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                  <Text h4 my={0}>Current Prices</Text>
                  <Button
                    onClick={() => setShowAddPriceModal(true)}
                    type="success"
                    icon={<Plus size={16} />}
                    auto
                  >
                    Add Price
                  </Button>
                </div>
                
                <Card style={{ padding: '16px' }}>
                  <Text b style={{ marginBottom: '12px', display: 'block' }}>
                    {selectedProductData?.name} - {selectedVariantData.name}
                  </Text>
                  
                  {selectedVariantData.prices.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px' }}>
                      <Text style={{ opacity: 0.6 }}>No prices added yet</Text>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {selectedVariantData.prices.map((price) => (
                        <div key={price.id} style={{
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '200px' }}>
                            <div style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: price.isAvailable ? '#10B981' : '#f31260',
                              flexShrink: 0
                            }} />
                            <div style={{ minWidth: 0 }}>
                              <Text b style={{ marginBottom: '4px', display: 'block' }}>{getStoreName(price.storeId)}</Text>
                              <Text small style={{ opacity: 0.6 }}>
                                Updated {new Date(price.lastUpdated).toLocaleDateString()}
                              </Text>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <Text b style={{ fontSize: '18px', display: 'block' }}>
                                {formatPrice(price.price, settings.currency)}
                              </Text>
                              {price.discountPercentage && (
                                <Text small style={{ color: '#10B981' }}>
                                  {price.discountPercentage}% off
                                </Text>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => handleEditPrice(price)}
                                style={{
                                  padding: '8px',
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  opacity: 0.6,
                                  transition: 'opacity 0.2s'
                                }}
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeletePrice(price.id)}
                                style={{
                                  padding: '8px',
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#f31260',
                                  opacity: 0.8,
                                  transition: 'opacity 0.2s'
                                }}
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      <Modal visible={showAddPriceModal} onClose={resetForm}>
        <Modal.Title>{editingPrice ? 'Edit Price' : 'Add New Price'}</Modal.Title>
        <Modal.Content>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
            <div>
              <Text small b style={{ marginBottom: '8px', display: 'block' }}>Store</Text>
              <Select
                value={newPrice.storeId}
                onChange={(val) => setNewPrice({ ...newPrice, storeId: val as string })}
                placeholder="Select a store"
                width="100%"
              >
                {stores.map(store => (
                  <Select.Option key={store.id} value={store.id}>
                    {store.name} ({store.type})
                  </Select.Option>
                ))}
              </Select>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <Text small b style={{ marginBottom: '8px', display: 'block' }}>Price</Text>
                <Input
                  type="number"
                  step="0.01"
                  value={newPrice.price}
                  onChange={(e) => setNewPrice({ ...newPrice, price: e.target.value })}
                  placeholder="0.00"
                  width="100%"
                />
              </div>
              
              <div>
                <Text small b style={{ marginBottom: '8px', display: 'block' }}>Currency</Text>
                <Select
                  value={newPrice.currency}
                  onChange={(val) => setNewPrice({ ...newPrice, currency: val as string })}
                  width="100%"
                >
                  {CURRENCIES.map(currency => (
                    <Select.Option key={currency.code} value={currency.code}>
                      {currency.flag} {currency.code}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            </div>
            
            <div>
              <Text small b style={{ marginBottom: '8px', display: 'block' }}>Discount Percentage (Optional)</Text>
              <Input
                type="number"
                step="0.1"
                value={newPrice.discountPercentage}
                onChange={(e) => setNewPrice({ ...newPrice, discountPercentage: e.target.value })}
                placeholder="0"
                width="100%"
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={newPrice.isAvailable}
                onChange={(e) => setNewPrice({ ...newPrice, isAvailable: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <Check size={16} style={{ opacity: 0.6 }} />
              <Text small>Available in stock</Text>
            </div>
          </div>
        </Modal.Content>
        <Modal.Action passive onClick={resetForm}>Cancel</Modal.Action>
        <Modal.Action 
          onClick={editingPrice ? handleUpdatePrice : handleAddPrice}
          disabled={!newPrice.storeId || !newPrice.price}
        >
          {editingPrice ? 'Update Price' : 'Add Price'}
        </Modal.Action>
      </Modal>
    </div>
  );
};

export default PriceManager;
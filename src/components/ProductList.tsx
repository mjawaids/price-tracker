import React, { useState } from 'react';
import { Edit, Trash, DollarSign, Package, Home as Store, ChevronDown, ChevronRight } from '@geist-ui/icons';
import { Card, Text, Button } from '@geist-ui/core';
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
      <Card width="100%">
        <Card.Content>
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
            <Text h3 my={0} style={{ marginBottom: '8px' }}>No products yet</Text>
            <Text style={{ opacity: 0.6 }}>Add your first product to start tracking prices across different stores.</Text>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Card width="100%">
          <Card.Content style={{ padding: 0 }}>
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <Text h4 my={0}>Products</Text>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {products.map((product) => {
                const cheapestPrice = getCheapestPrice(product);
                const isExpanded = expandedProducts.has(product.id);

                return (
                  <div key={product.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <button
                              onClick={() => toggleExpandProduct(product.id)}
                              style={{
                                padding: '8px',
                                opacity: 0.4,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'opacity 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown size={20} />
                              ) : (
                                <ChevronRight size={20} />
                              )}
                            </button>
                            <div style={{ flexShrink: 0 }}>
                              <Package size={32} color="#3B82F6" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Text b style={{ marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{product.name}</Text>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                {product.brand && <Text small style={{ opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.brand}</Text>}
                                <span style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  padding: '2px 10px', 
                                  borderRadius: '16px', 
                                  fontSize: '12px', 
                                  fontWeight: 500,
                                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                  color: '#3B82F6'
                                }}>
                                  {product.category}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: '16px', marginLeft: '52px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <Text small b style={{ opacity: 0.8 }}>Variants:</Text>
                              <Text small style={{ opacity: 0.6 }}>{product.variants.length} available</Text>
                            </div>

                            {cheapestPrice && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <DollarSign size={16} color="#10B981" />
                                <Text small style={{ opacity: 0.8 }}>
                                  Best: <Text small b style={{ color: '#10B981', display: 'inline' }}>
                                    {formatPrice(cheapestPrice.price, settings.currency)}
                                  </Text>
                                </Text>
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <button
                            onClick={() => handleEditProduct(product)}
                            style={{
                              padding: '8px',
                              opacity: 0.4,
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'opacity 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Edit size={20} color="#3B82F6" />
                          </button>
                          <button
                            onClick={() => onDeleteProduct(product.id)}
                            style={{
                              padding: '8px',
                              opacity: 0.4,
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'opacity 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash size={20} color="#EF4444" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          {product.variants.map((variant) => (
                            <div key={variant.id} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                              <div style={{ marginBottom: '16px' }}>
                                <Text b style={{ marginBottom: '8px', display: 'block' }}>{variant.name}</Text>
                                {Object.keys(variant.specifications).length > 0 && (
                                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {Object.entries(variant.specifications).map(([key, value]) => (
                                      <Text small key={key} style={{ opacity: 0.6 }}>
                                        <Text small b style={{ display: 'inline' }}>{key}:</Text> {value}
                                      </Text>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <Text small b style={{ opacity: 0.8 }}>Prices by Store:</Text>
                                {variant.prices.length === 0 ? (
                                  <Text small style={{ opacity: 0.6 }}>No prices recorded yet</Text>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {variant.prices.map((price) => {
                                      const store = stores.find(s => s.id === price.storeId);
                                      const displayPrice = price.discountPercentage
                                        ? price.price * (1 - price.discountPercentage / 100)
                                        : price.price;

                                      return (
                                        <div key={price.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Store size={16} style={{ opacity: 0.6 }} />
                                            <Text small b>{store?.name || 'Unknown'}</Text>
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ textAlign: 'right' }}>
                                              {price.discountPercentage ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                  <Text small style={{ opacity: 0.4, textDecoration: 'line-through' }}>
                                                    {formatPrice(price.price, settings.currency)}
                                                  </Text>
                                                  <Text small b style={{ color: '#10B981' }}>
                                                    {formatPrice(displayPrice, settings.currency)}
                                                  </Text>
                                                  <span style={{ 
                                                    fontSize: '12px',
                                                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                                    color: '#10B981',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px'
                                                  }}>
                                                    -{price.discountPercentage}%
                                                  </span>
                                                </div>
                                              ) : (
                                                <Text small b>
                                                  {formatPrice(price.price, settings.currency)}
                                                </Text>
                                              )}
                                            </div>
                                            {!price.isAvailable && (
                                              <span style={{ 
                                                fontSize: '12px',
                                                backgroundColor: 'rgba(255,255,255,0.1)',
                                                opacity: 0.8,
                                                padding: '2px 8px',
                                                borderRadius: '4px'
                                              }}>
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
          </Card.Content>
        </Card>
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
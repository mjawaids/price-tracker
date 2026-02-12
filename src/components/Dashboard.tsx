import React from 'react';
import { Package, Home, ShoppingCart, TrendingDown, TrendingUp, DollarSign } from '@geist-ui/icons';
import { Card, Grid, Text } from '@geist-ui/core';
import { Product, Store as StoreType, ShoppingList } from '../types';
import { ViewMode } from '../types';
import { findCheapestPrice } from '../utils/price-comparison';
import { formatPrice } from '../utils/currency';
import { useSettings } from '../contexts/SettingsContext';

interface DashboardProps {
  products: Product[];
  stores: StoreType[];
  shoppingLists: ShoppingList[];
  onViewChange: (view: ViewMode) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ products, stores, shoppingLists, onViewChange }) => {
  const { settings } = useSettings();
  const totalProducts = products.length;
  const totalStores = stores.length;
  const totalShoppingListItems = shoppingLists.reduce((sum, list) => sum + list.items.length, 0);
  
  // Calculate actual metrics
  const totalVariants = products.reduce((sum, product) => sum + product.variants.length, 0);
  const productsWithPrices = products.filter(product => 
    product.variants.some(variant => variant.prices && variant.prices.length > 0)
  ).length;
  const storesWithDelivery = stores.filter(store => store.hasDelivery).length;
  
  // Calculate potential savings by comparing highest vs lowest prices
  const calculatePotentialSavings = () => {
    let totalSavings = 0;
    products.forEach(product => {
      product.variants.forEach(variant => {
        if (variant.prices && variant.prices.length > 1) {
          const prices = variant.prices.filter(p => p.isAvailable).map(p => p.price);
          if (prices.length > 1) {
            const highest = Math.max(...prices);
            const lowest = Math.min(...prices);
            totalSavings += (highest - lowest);
          }
        }
      });
    });
    return totalSavings;
  };
  
  const potentialSavings = calculatePotentialSavings();
  
  const stats = [
    {
      name: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: '#3291FF',
      change: `${totalVariants} variants`,
      changeType: 'neutral'
    },
    {
      name: 'Available Stores',
      value: totalStores,
      icon: Home,
      color: '#0070F3',
      change: `${storesWithDelivery} with delivery`,
      changeType: 'neutral'
    },
    {
      name: 'Shopping List Items',
      value: totalShoppingListItems,
      icon: ShoppingCart,
      color: '#7928CA',
      change: `${shoppingLists.length} lists`,
      changeType: 'neutral'
    },
    {
      name: 'Potential Savings',
      value: formatPrice(potentialSavings, settings.currency),
      icon: DollarSign,
      color: '#F5A623',
      change: `${productsWithPrices} products tracked`,
      changeType: 'neutral'
    }
  ];

  const recentProducts = products.slice(0, 5);
  const recentStores = stores.slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats Grid */}
      <Grid.Container gap={2} justify="flex-start">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Grid xs={24} sm={12} md={12} lg={6} key={index}>
              <Card hoverable width="100%" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    flexShrink: 0,
                    backgroundColor: stat.color,
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconComponent size={24} color="white" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text small style={{ opacity: 0.7, marginBottom: '4px' }}>{stat.name}</Text>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                      <Text h4 my={0}>{stat.value}</Text>
                      <Text small style={{ opacity: 0.6 }}>{stat.change}</Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Grid>
          );
        })}
      </Grid.Container>

      {/* Recent Activity */}
      <Grid.Container gap={2}>
        {/* Recent Products */}
        <Grid xs={24} lg={12}>
          <Card width="100%" style={{ height: '100%' }}>
            <Card.Content style={{ padding: 0 }}>
              <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Text h4 my={0}>Recent Products</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentProducts.map((product) => (
                  <div key={product.id} style={{ 
                    padding: '16px', 
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Text b style={{ marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{product.name}</Text>
                        <Text small style={{ opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{product.category}</Text>
                      </div>
                      <Text small style={{ opacity: 0.6, flexShrink: 0 }}>
                        {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                      </Text>
                    </div>
                  </div>
                ))}
                {recentProducts.length === 0 && (
                  <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <Text style={{ opacity: 0.6 }}>No products added yet</Text>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        </Grid>

        {/* Recent Stores */}
        <Grid xs={24} lg={12}>
          <Card width="100%" style={{ height: '100%' }}>
            <Card.Content style={{ padding: 0 }}>
              <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Text h4 my={0}>Recent Stores</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentStores.map((store) => (
                  <div key={store.id} style={{ 
                    padding: '16px', 
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Text b style={{ marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{store.name}</Text>
                        <Text small style={{ opacity: 0.6, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{store.type}</Text>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {store.hasDelivery && (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            padding: '4px 10px', 
                            borderRadius: '16px', 
                            fontSize: '12px', 
                            fontWeight: 500,
                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                            color: '#10B981',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            whiteSpace: 'nowrap'
                          }}>
                            Delivery
                          </span>
                        )}
                        {store.type === 'online' && (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            padding: '4px 10px', 
                            borderRadius: '16px', 
                            fontSize: '12px', 
                            fontWeight: 500,
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            color: '#3B82F6',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            whiteSpace: 'nowrap'
                          }}>
                            Online
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {recentStores.length === 0 && (
                  <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <Text style={{ opacity: 0.6 }}>No stores added yet</Text>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        </Grid>
      </Grid.Container>

      {/* Quick Actions */}
      <Card width="100%">
        <Card.Content style={{ padding: 0 }}>
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Text h4 my={0}>Quick Actions</Text>
          </div>
          <div style={{ padding: '24px' }}>
            <Grid.Container gap={2}>
              <Grid xs={24} sm={12} lg={8}>
                <button 
                  onClick={() => onViewChange('add-product')}
                  style={{
                    width: '100%',
                    padding: '24px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Package size={32} color="#3B82F6" style={{ marginBottom: '12px' }} />
                  <Text b style={{ marginBottom: '4px' }}>Add Product</Text>
                  <Text small style={{ opacity: 0.6, textAlign: 'center' }}>Track prices for a new product</Text>
                </button>
              </Grid>
              <Grid xs={24} sm={12} lg={8}>
                <button 
                  onClick={() => onViewChange('add-store')}
                  style={{
                    width: '100%',
                    padding: '24px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Home size={32} color="#10B981" style={{ marginBottom: '12px' }} />
                  <Text b style={{ marginBottom: '4px' }}>Add Store</Text>
                  <Text small style={{ opacity: 0.6, textAlign: 'center' }}>Register a new store location</Text>
                </button>
              </Grid>
              <Grid xs={24} sm={24} lg={8}>
                <button 
                  onClick={() => onViewChange('shopping-lists')}
                  style={{
                    width: '100%',
                    padding: '24px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ShoppingCart size={32} color="#8B5CF6" style={{ marginBottom: '12px' }} />
                  <Text b style={{ marginBottom: '4px' }}>Manage Lists</Text>
                  <Text small style={{ opacity: 0.6, textAlign: 'center' }}>Start a new shopping list</Text>
                </button>
              </Grid>
            </Grid.Container>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default Dashboard;
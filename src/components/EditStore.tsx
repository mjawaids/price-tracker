import React, { useState } from 'react';
import { Save, X } from '@geist-ui/icons';
import { Card, Button, Input, Modal, Text } from '@geist-ui/core';
import { Store } from '../types';

interface EditStoreProps {
  store: Store;
  onUpdateStore: (store: Store) => void;
  onCancel: () => void;
}

const EditStore: React.FC<EditStoreProps> = ({ store, onUpdateStore, onCancel }) => {
  const [name, setName] = useState(store.name);
  const [type, setType] = useState<'physical' | 'online'>(store.type);
  const [address, setAddress] = useState(store.location?.address || '');
  const [city, setCity] = useState(store.location?.city || '');
  const [hasDelivery, setHasDelivery] = useState(store.hasDelivery);
  const [deliveryRadius, setDeliveryRadius] = useState(store.deliveryRadius?.toString() || '');
  const [deliveryFee, setDeliveryFee] = useState(store.deliveryFee?.toString() || '');
  const [website, setWebsite] = useState(store.website || '');
  const [phone, setPhone] = useState(store.phone || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const updatedStore: Store = {
      ...store,
      name,
      type,
      location: type === 'physical' && address && city ? {
        address,
        city,
        coordinates: store.location?.coordinates || [0, 0]
      } : undefined,
      hasDelivery,
      deliveryRadius: deliveryRadius ? parseInt(deliveryRadius) : undefined,
      deliveryFee: deliveryFee && hasDelivery ? parseFloat(deliveryFee) : undefined,
      website: website || undefined,
      phone: phone || undefined,
    };

    onUpdateStore(updatedStore);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'var(--geist-background)',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Text h3 my={0}>Edit Store</Text>
          <button
            onClick={onCancel}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              opacity: 0.6,
              transition: 'opacity 0.2s'
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <Text small b style={{ marginBottom: '8px', display: 'block' }}>Store Name *</Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter store name"
              width="100%"
              required
            />
          </div>
          
          <div>
            <Text small b style={{ marginBottom: '8px', display: 'block' }}>Store Type *</Text>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="physical"
                  checked={type === 'physical'}
                  onChange={(e) => setType(e.target.value as 'physical')}
                  style={{ cursor: 'pointer' }}
                />
                <Text small>Physical Store</Text>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="online"
                  checked={type === 'online'}
                  onChange={(e) => setType(e.target.value as 'online')}
                  style={{ cursor: 'pointer' }}
                />
                <Text small>Online Store</Text>
              </label>
            </div>
          </div>

          {type === 'physical' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
              <div>
                <Text small b style={{ marginBottom: '8px', display: 'block' }}>Address</Text>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter store address"
                  width="100%"
                />
              </div>
              
              <div>
                <Text small b style={{ marginBottom: '8px', display: 'block' }}>City</Text>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter city"
                  width="100%"
                />
              </div>
            </div>
          )}

          {type === 'online' && (
            <div>
              <Text small b style={{ marginBottom: '8px', display: 'block' }}>Website</Text>
              <Input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                width="100%"
              />
            </div>
          )}

          <div>
            <Text small b style={{ marginBottom: '8px', display: 'block' }}>Phone Number</Text>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
              width="100%"
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasDelivery}
                onChange={(e) => setHasDelivery(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <Text small>Offers Delivery</Text>
            </label>
          </div>

          {hasDelivery && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
              <div>
                <Text small b style={{ marginBottom: '8px', display: 'block' }}>Delivery Radius (km)</Text>
                <Input
                  type="number"
                  value={deliveryRadius}
                  onChange={(e) => setDeliveryRadius(e.target.value)}
                  placeholder="Enter delivery radius"
                  width="100%"
                />
              </div>
              <div>
                <Text small b style={{ marginBottom: '8px', display: 'block' }}>Delivery Fee</Text>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  placeholder="Enter delivery fee"
                  width="100%"
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px' }}>
            <Button
              type="success"
              htmlType="submit"
              icon={<Save size={16} />}
            >
              Update Store
            </Button>
            <Button
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStore;

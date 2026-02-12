import React, { useState } from 'react';
import { X, MapPin, Globe, Truck } from '@geist-ui/icons';
import { Save } from '@geist-ui/icons';
import { Card, Button, Input, Radio, Text, Checkbox } from '@geist-ui/core';
import { Store } from '../types';

interface AddStoreProps {
  onAddStore: (store: Omit<Store, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

const AddStore: React.FC<AddStoreProps> = ({ onAddStore, onCancel }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'physical' | 'online'>('physical');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryRadius, setDeliveryRadius] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const store = {
      name,
      type,
      location: type === 'physical' && address && city ? {
        address,
        city,
        coordinates: [0, 0] as [number, number]
      } : undefined,
      hasDelivery,
      deliveryRadius: deliveryRadius ? parseInt(deliveryRadius) : undefined,
      deliveryFee: deliveryFee && hasDelivery ? parseFloat(deliveryFee) : undefined,
      website: website || undefined,
      phone: phone || undefined,
    };

    onAddStore(store);
  };

  return (
    <div style={{ maxWidth: '672px', margin: '0 auto' }}>
      <Card style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Text h3 style={{ margin: 0 }}>Add New Store</Text>
          <Button
            icon={<X />}
            auto
            scale={0.8}
            px={0.6}
            onClick={onCancel}
            type="abort"
          />
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Store Name *</Text>
              <Input
                width="100%"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter store name"
                required
              />
            </div>
            
            <div>
              <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Store Type *</Text>
              <Radio.Group value={type} onChange={(val) => setType(val as 'physical' | 'online')}>
                <Radio value="physical">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={16} />
                    Physical Store
                  </div>
                </Radio>
                <Radio value="online">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Globe size={16} />
                    Online Store
                  </div>
                </Radio>
              </Radio.Group>
            </div>

            {type === 'physical' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Address</Text>
                  <Input
                    width="100%"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter store address"
                  />
                </div>
                
                <div>
                  <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>City</Text>
                  <Input
                    width="100%"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter city"
                  />
                </div>
              </div>
            )}

            {type === 'online' && (
              <div>
                <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Website</Text>
                <Input
                  width="100%"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            )}

            <div>
              <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Phone Number</Text>
              <Input
                width="100%"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <Checkbox 
                checked={hasDelivery} 
                onChange={(e) => setHasDelivery(e.target.checked)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Truck size={16} />
                  Offers Delivery
                </div>
              </Checkbox>
            </div>

            {hasDelivery && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Delivery Radius (km)</Text>
                  <Input
                    width="100%"
                    type="number"
                    value={deliveryRadius}
                    onChange={(e) => setDeliveryRadius(e.target.value)}
                    placeholder="Enter delivery radius"
                  />
                </div>
                <div>
                  <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Delivery Fee</Text>
                  <Input
                    width="100%"
                    type="number"
                    step="0.01"
                    min="0"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    placeholder="Enter delivery fee"
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button
                icon={<Save />}
                type="success"
                htmlType="submit"
              >
                Save Store
              </Button>
              <Button
                type="abort"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddStore;
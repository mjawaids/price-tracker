import React, { useState } from 'react';
import { Save, X, MapPin, Globe, Truck } from 'lucide-react';
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
        coordinates: [0, 0] as [number, number] // In a real app, you'd geocode the address
      } : undefined,
      hasDelivery,
      deliveryRadius: deliveryRadius ? parseInt(deliveryRadius) : undefined,
      website: website || undefined,
      phone: phone || undefined,
    };

    onAddStore(store);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Add New Store</h2>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter store name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Type *
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="physical"
                  checked={type === 'physical'}
                  onChange={(e) => setType(e.target.value as 'physical')}
                  className="mr-2"
                />
                <MapPin className="h-4 w-4 mr-1" />
                Physical Store
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="online"
                  checked={type === 'online'}
                  onChange={(e) => setType(e.target.value as 'online')}
                  className="mr-2"
                />
                <Globe className="h-4 w-4 mr-1" />
                Online Store
              </label>
            </div>
          </div>

          {type === 'physical' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter store address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter city"
                />
              </div>
            </div>
          )}

          {type === 'online' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hasDelivery}
                onChange={(e) => setHasDelivery(e.target.checked)}
                className="mr-2"
              />
              <Truck className="h-4 w-4 mr-1" />
              Offers Delivery
            </label>
          </div>

          {hasDelivery && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Radius (km)
              </label>
              <input
                type="number"
                value={deliveryRadius}
                onChange={(e) => setDeliveryRadius(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter delivery radius"
              />
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              <Save className="h-4 w-4" />
              <span>Save Store</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStore;
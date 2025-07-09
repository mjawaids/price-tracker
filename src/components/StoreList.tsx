import React, { useState } from 'react';
import { Store, MapPin, Globe, Truck, Phone, Edit, Trash2, Search } from 'lucide-react';
import { Store as StoreType } from '../types';

interface StoreListProps {
  stores: StoreType[];
  onDeleteStore: (id: string) => void;
}

const StoreList: React.FC<StoreListProps> = ({ stores, onDeleteStore }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const filteredStores = stores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || store.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Stores</h2>
            <div className="flex space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search stores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="physical">Physical Stores</option>
                <option value="online">Online Stores</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredStores.map((store) => (
            <div key={store.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                      store.type === 'online' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {store.type === 'online' ? (
                        <Globe className={`h-6 w-6 ${store.type === 'online' ? 'text-blue-600' : 'text-green-600'}`} />
                      ) : (
                        <Store className={`h-6 w-6 ${store.type === 'online' ? 'text-blue-600' : 'text-green-600'}`} />
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{store.name}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        store.type === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {store.type === 'online' ? 'Online' : 'Physical'}
                      </span>
                      {store.hasDelivery && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <Truck className="h-3 w-3 mr-1" />
                          Delivery
                        </span>
                      )}
                    </div>
                    {store.location && (
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <MapPin className="h-4 w-4 mr-1" />
                        {store.location.address}, {store.location.city}
                      </div>
                    )}
                    {store.phone && (
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <Phone className="h-4 w-4 mr-1" />
                        {store.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDeleteStore(store.id)}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors duration-200"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredStores.length === 0 && (
            <div className="p-12 text-center">
              <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No stores found</h3>
              <p className="text-gray-500">Get started by adding your first store to track prices.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreList;
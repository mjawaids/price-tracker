import React, { useState } from 'react';
import { Store, MapPin, Globe, Truck, Phone, Edit, Trash2, Search } from 'lucide-react';
import { Store as StoreType } from '../types';
import EditStore from './EditStore';

interface StoreListProps {
  stores: StoreType[];
  onDeleteStore: (id: string) => void;
  onUpdateStore: (store: StoreType) => void;
}

const StoreList: React.FC<StoreListProps> = ({ stores, onDeleteStore, onUpdateStore }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);

  const handleEditStore = (store: StoreType) => {
    setEditingStore(store);
  };

  const handleUpdateStore = (updatedStore: StoreType) => {
    onUpdateStore(updatedStore);
    setEditingStore(null);
  };

  const filteredStores = stores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || store.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="glass-card shadow-xl rounded-2xl md:hover:shadow-2xl transition-all duration-300 overflow-hidden">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-white/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            <h2 className="text-base md:text-lg font-medium text-white">Stores</h2>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search stores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 md:py-2 border border-white/20 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white/10 backdrop-blur-sm text-white placeholder-white/60 min-h-[48px]"
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-3 md:py-2 border border-white/20 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white/10 backdrop-blur-sm text-white min-h-[48px]"
              >
                <option value="all" className="bg-gray-900 text-white">All Types</option>
                <option value="physical" className="bg-gray-900 text-white">Physical Stores</option>
                <option value="online" className="bg-gray-900 text-white">Online Stores</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-white/10">
          {filteredStores.map((store) => (
            <div key={store.id} className="p-4 md:p-6 md:hover:bg-white/5 transition-colors duration-200 active:bg-white/5 md:active:bg-transparent">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                      store.type === 'online' ? 'bg-blue-500/20' : 'bg-green-500/20'
                    }`}>
                      {store.type === 'online' ? (
                        <Globe className={`h-6 w-6 ${store.type === 'online' ? 'text-blue-400' : 'text-green-400'}`} />
                      ) : (
                        <Store className={`h-6 w-6 ${store.type === 'online' ? 'text-blue-400' : 'text-green-400'}`} />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-medium text-white truncate">{store.name}</h3>
                    <div className="flex items-center gap-2 md:gap-4 mt-1 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        store.type === 'online' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'
                      }`}>
                        {store.type === 'online' ? 'Online' : 'Physical'}
                      </span>
                      {store.hasDelivery && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          <Truck className="h-3 w-3 mr-1" />
                          Delivery
                        </span>
                      )}
                    </div>
                    {store.location && (
                      <div className="flex items-center mt-1 text-xs md:text-sm text-white/60 truncate">
                        <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{store.location.address}, {store.location.city}</span>
                      </div>
                    )}
                    {store.phone && (
                      <div className="flex items-center mt-1 text-xs md:text-sm text-white/60">
                        <Phone className="h-4 w-4 mr-1 flex-shrink-0" />
                        {store.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEditStore(store)}
                    className="p-3 md:p-2 text-white/40 hover:text-blue-400 transition-colors duration-200 touch-target active:scale-95"
                  >
                    <Edit className="h-4 md:h-5 w-4 md:w-5" />
                  </button>
                  <button
                    onClick={() => onDeleteStore(store.id)}
                    className="p-3 md:p-2 text-white/40 hover:text-red-400 transition-colors duration-200 touch-target active:scale-95"
                  >
                    <Trash2 className="h-4 md:h-5 w-4 md:w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredStores.length === 0 && (
            <div className="p-12 text-center">
              <Store className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No stores found</h3>
              <p className="text-white/60">Get started by adding your first store to track prices.</p>
            </div>
          )}
        </div>
      </div>

      {editingStore && (
        <EditStore
          store={editingStore}
          onUpdateStore={handleUpdateStore}
          onCancel={() => setEditingStore(null)}
        />
      )}
    </div>
  );
};

export default StoreList;
import React, { useState } from 'react';
import { Home as Store, MapPin, Globe, Truck, Phone, Edit, Trash, Search } from '@geist-ui/icons';
import { Card, Text, Input, Select } from '@geist-ui/core';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card width="100%">
        <Card.Content style={{ padding: 0 }}>
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Text h4 my={0}>Stores</Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                    <Search size={16} style={{ opacity: 0.4 }} />
                  </div>
                  <Input
                    placeholder="Search stores..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    width="100%"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
                <Select
                  value={selectedType}
                  onChange={(val) => setSelectedType(val as string)}
                  width="100%"
                >
                  <Select.Option value="all">All Types</Select.Option>
                  <Select.Option value="physical">Physical Stores</Select.Option>
                  <Select.Option value="online">Online Stores</Select.Option>
                </Select>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredStores.map((store) => (
              <div key={store.id} style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                    <div style={{ flexShrink: 0 }}>
                      <div style={{
                        height: '48px',
                        width: '48px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: store.type === 'online' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'
                      }}>
                        {store.type === 'online' ? (
                          <Globe size={24} color={store.type === 'online' ? '#3B82F6' : '#10B981'} />
                        ) : (
                          <Store size={24} color={store.type === 'online' ? '#3B82F6' : '#10B981'} />
                        )}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text b style={{ marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{store.name}</Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 10px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: store.type === 'online' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: store.type === 'online' ? '#3B82F6' : '#10B981',
                          border: store.type === 'online' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          {store.type === 'online' ? 'Online' : 'Physical'}
                        </span>
                        {store.hasDelivery && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 10px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: 'rgba(139, 92, 246, 0.2)',
                            color: '#8B5CF6',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            gap: '4px'
                          }}>
                            <Truck size={12} />
                            Delivery
                          </span>
                        )}
                      </div>
                      {store.location && (
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <MapPin size={16} style={{ marginRight: '4px', flexShrink: 0 }} />
                          <Text small style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.location.address}, {store.location.city}</Text>
                        </div>
                      )}
                      {store.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px', opacity: 0.6 }}>
                          <Phone size={16} style={{ marginRight: '4px', flexShrink: 0 }} />
                          <Text small>{store.phone}</Text>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleEditStore(store)}
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
                      onClick={() => onDeleteStore(store.id)}
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
            ))}
            
            {filteredStores.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <Store size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                <Text h3 my={0} style={{ marginBottom: '8px' }}>No stores found</Text>
                <Text style={{ opacity: 0.6 }}>Get started by adding your first store to track prices.</Text>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

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
import React, { useState } from 'react';
import { Plus, Edit, Trash, ShoppingCart, Calendar, Check } from '@geist-ui/icons';
import { Card, Button, Input, Modal, Text } from '@geist-ui/core';
import { ShoppingList, ShoppingListItem } from '../types';

interface ShoppingListManagerProps {
  shoppingLists: ShoppingList[];
  onCreateList: (name: string) => void;
  onDeleteList: (id: string) => void;
  onSelectList: (list: ShoppingList) => void;
  onRenameList: (id: string, newName: string) => void;
}

const ShoppingListManager: React.FC<ShoppingListManagerProps> = ({
  shoppingLists,
  onCreateList,
  onDeleteList,
  onSelectList,
  onRenameList,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [editingList, setEditingList] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreateList = () => {
    if (newListName.trim()) {
      onCreateList(newListName.trim());
      setNewListName('');
      setShowCreateModal(false);
    }
  };

  const handleStartEdit = (list: ShoppingList) => {
    setEditingList(list.id);
    setEditName(list.name);
  };

  const handleSaveEdit = () => {
    if (editingList && editName.trim()) {
      onRenameList(editingList, editName.trim());
      setEditingList(null);
      setEditName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingList(null);
    setEditName('');
  };

  const calculateListTotal = (items: ShoppingListItem[]) => {
    // This would need access to products and stores to calculate actual total
    // For now, return item count
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card width="100%">
        <Card.Content style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <Text h3 my={0}>My Shopping Lists</Text>
                <Text small style={{ opacity: 0.6, marginTop: '4px' }}>Manage and organize your shopping lists</Text>
              </div>
              <Button
                onClick={() => setShowCreateModal(true)}
                type="success"
                icon={<Plus size={16} />}
                auto
              >
                New List
              </Button>
            </div>
          </div>
          
          <div style={{ padding: '24px' }}>
            {shoppingLists.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <ShoppingCart size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                <Text h4 my={0} style={{ marginBottom: '8px' }}>No shopping lists yet</Text>
                <Text style={{ opacity: 0.6, marginBottom: '16px' }}>Create your first shopping list to start organizing your purchases</Text>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  type="success"
                  icon={<Plus size={16} />}
                  auto
                >
                  Create List
                </Button>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '24px' 
              }}>
                {shoppingLists.map((list) => (
                  <Card key={list.id} hoverable width="100%" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editingList === list.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSaveEdit()}
                              width="100%"
                              autoFocus
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <Button
                                onClick={handleSaveEdit}
                                type="success"
                                scale={0.5}
                                auto
                              >
                                Save
                              </Button>
                              <Button
                                onClick={handleCancelEdit}
                                scale={0.5}
                                auto
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Text h4 my={0} style={{ marginBottom: '4px' }}>{list.name}</Text>
                        )}
                      </div>
                      
                      {editingList !== list.id && (
                        <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                          <button
                            onClick={() => handleStartEdit(list)}
                            style={{
                              padding: '4px',
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
                            onClick={() => onDeleteList(list.id)}
                            style={{
                              padding: '4px',
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
                      )}
                    </div>
                    
                    {editingList !== list.id && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <ShoppingCart size={16} style={{ marginRight: '8px', opacity: 0.6 }} />
                            <Text small style={{ opacity: 0.6 }}>{list.items.length} items</Text>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Calendar size={16} style={{ marginRight: '8px', opacity: 0.6 }} />
                            <Text small style={{ opacity: 0.6 }}>Updated {new Date(list.updatedAt).toLocaleDateString()}</Text>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                          {list.items.slice(0, 3).map((item, index) => (
                            <div key={index} style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.1)',
                              backgroundColor: 'rgba(255,255,255,0.05)'
                            }}>
                              <Text small>Qty: {item.quantity} • Priority: {item.priority}</Text>
                            </div>
                          ))}
                          {list.items.length > 3 && (
                            <Text small style={{ opacity: 0.6 }}>
                              +{list.items.length - 3} more items
                            </Text>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => onSelectList(list)}
                          type="success"
                          style={{ width: '100%' }}
                        >
                          View & Edit
                        </Button>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      <Modal visible={showCreateModal} onClose={() => {
        setShowCreateModal(false);
        setNewListName('');
      }}>
        <Modal.Title>Create New Shopping List</Modal.Title>
        <Modal.Content>
          <div style={{ padding: '8px 0' }}>
            <Text small b style={{ marginBottom: '8px', display: 'block' }}>List Name</Text>
            <Input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Enter list name"
              onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleCreateList()}
              width="100%"
              autoFocus
            />
          </div>
        </Modal.Content>
        <Modal.Action passive onClick={() => {
          setShowCreateModal(false);
          setNewListName('');
        }}>Cancel</Modal.Action>
        <Modal.Action onClick={handleCreateList} disabled={!newListName.trim()}>Create List</Modal.Action>
      </Modal>
    </div>
  );
};

export default ShoppingListManager;
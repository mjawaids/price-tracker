import React, { useState } from 'react';
import { Plus, Edit, Trash2, ShoppingCart, Calendar, Eye, Users } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">My Shopping Lists</h2>
              <p className="text-sm text-gray-500 mt-1">Manage and organize your shopping lists</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>New List</span>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {shoppingLists.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shopping lists yet</h3>
              <p className="text-gray-500 mb-4">Create your first shopping list to start organizing your purchases</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                <Plus className="h-4 w-4" />
                <span>Create List</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shoppingLists.map((list) => (
                <div key={list.id} className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      {editingList === list.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-1 text-lg font-medium border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                            autoFocus
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEdit}
                              className="text-sm px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-200"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-sm px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <h3 className="text-lg font-medium text-gray-900 mb-1">{list.name}</h3>
                      )}
                    </div>
                    
                    {editingList !== list.id && (
                      <div className="flex space-x-1 ml-2">
                        <button
                          onClick={() => handleStartEdit(list)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteList(list.id)}
                          className="p-1 text-red-400 hover:text-red-600 transition-colors duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {editingList !== list.id && (
                    <>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-2" />
                          <span>{list.items.length} items</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Updated {new Date(list.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {list.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="text-sm text-gray-700 bg-white rounded px-2 py-1">
                            Qty: {item.quantity} • Priority: {item.priority}
                          </div>
                        ))}
                        {list.items.length > 3 && (
                          <div className="text-sm text-gray-500">
                            +{list.items.length - 3} more items
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => onSelectList(list)}
                        className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View & Edit</span>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create New Shopping List</h3>
            </div>
            
            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  List Name
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter list name"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateList()}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewListName('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateList}
                disabled={!newListName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Create List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingListManager;
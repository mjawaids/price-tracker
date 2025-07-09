import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import LandingPage from './components/LandingPage';
import Navigation from './components/Navigation';
import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import StoreList from './components/StoreList';
import ShoppingList from './components/ShoppingList';
import ShoppingListManager from './components/ShoppingListManager';
import PriceManager from './components/PriceManager';
import AddProduct from './components/AddProduct';
import AddStore from './components/AddStore';
import { Product, Store, ShoppingList as ShoppingListType, ShoppingListItem, ViewMode } from './types';
import { useSupabaseData } from './hooks/useSupabaseData';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [currentShoppingList, setCurrentShoppingList] = useState<ShoppingListItem[]>([]);

  // Use Supabase data hook
  const {
    products,
    stores,
    shoppingLists,
    addProduct,
    updateProduct,
    deleteProduct,
    addStore,
    deleteStore,
    createShoppingList,
    deleteShoppingList,
    renameShoppingList,
    loading: dataLoading
  } = useSupabaseData();

  // Show auth modal if user tries to access protected features
  const handleViewChange = (view: ViewMode) => {
    if (!user && ['products', 'stores', 'price-manager', 'shopping-list', 'shopping-lists', 'add-product', 'add-store'].includes(view)) {
      setShowAuthModal(true);
      return;
    }
    setCurrentView(view);
  };

  // Load the first shopping list when data changes
  useEffect(() => {
    if (shoppingLists.length > 0) {
      setCurrentShoppingList(shoppingLists[0].items);
    }
  }, [shoppingLists]);

  const handleAddProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    addProduct(productData);
    setCurrentView('products');
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    updateProduct(updatedProduct);
  };

  const handleAddStore = (storeData: Omit<Store, 'id' | 'createdAt'>) => {
    addStore(storeData);
    setCurrentView('stores');
  };

  const handleDeleteProduct = (id: string) => {
    deleteProduct(id);
  };

  const handleDeleteStore = (id: string) => {
    deleteStore(id);
  };

  const handleAddToShoppingList = (itemData: Omit<ShoppingListItem, 'id' | 'addedAt'>) => {
    const newItem: ShoppingListItem = {
      ...itemData,
      id: Date.now().toString(),
      addedAt: new Date(),
    };
    
    setCurrentShoppingList([...currentShoppingList, newItem]);
    
    // Update the shopping list in the lists array
    const updatedLists = [...shoppingLists];
    if (updatedLists.length === 0) {
      const newList: ShoppingListType = {
        id: Date.now().toString(),
        name: 'My Shopping List',
        items: [newItem],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      updatedLists.push(newList);
    } else {
      updatedLists[0].items = [...currentShoppingList, newItem];
      updatedLists[0].updatedAt = new Date();
    }
    setShoppingLists(updatedLists);
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    const updatedList = currentShoppingList.map(item =>
      item.id === id ? { ...item, quantity } : item
    );
    setCurrentShoppingList(updatedList);
    
    // Update the shopping list in the lists array
    const updatedLists = [...shoppingLists];
    if (updatedLists.length > 0) {
      updatedLists[0].items = updatedList;
      updatedLists[0].updatedAt = new Date();
      setShoppingLists(updatedLists);
    }
  };

  const handleRemoveFromShoppingList = (id: string) => {
    const updatedList = currentShoppingList.filter(item => item.id !== id);
    setCurrentShoppingList(updatedList);
    
    // Update the shopping list in the lists array
    const updatedLists = [...shoppingLists];
    if (updatedLists.length > 0) {
      updatedLists[0].items = updatedList;
      updatedLists[0].updatedAt = new Date();
      setShoppingLists(updatedLists);
    }
  };

  const handleClearShoppingList = () => {
    setCurrentShoppingList([]);
    
    // Update the shopping list in the lists array
    const updatedLists = [...shoppingLists];
    if (updatedLists.length > 0) {
      updatedLists[0].items = [];
      updatedLists[0].updatedAt = new Date();
      setShoppingLists(updatedLists);
    }
  };

  const handleCreateShoppingList = (name: string) => {
    createShoppingList(name);
  };

  const handleDeleteShoppingList = (id: string) => {
    deleteShoppingList(id);
    // If we're deleting the current list, clear the current shopping list
    if (shoppingLists.find(list => list.id === id)?.items === currentShoppingList) {
      setCurrentShoppingList([]);
    }
  };

  const handleSelectShoppingList = (list: ShoppingListType) => {
    setCurrentShoppingList(list.items);
    setCurrentView('shopping-list');
  };

  const handleRenameShoppingList = (id: string, newName: string) => {
    renameShoppingList(id, newName);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            products={products}
            stores={stores}
            shoppingLists={shoppingLists}
            onViewChange={handleViewChange}
          />
        );
      case 'products':
        return (
          <ProductList
            products={products}
            stores={stores}
            onDeleteProduct={handleDeleteProduct}
            onUpdateProduct={handleUpdateProduct}
          />
        );
      case 'stores':
        return (
          <StoreList
            stores={stores}
            onDeleteStore={handleDeleteStore}
          />
        );
      case 'shopping-list':
        return (
          <ShoppingList
            products={products}
            stores={stores}
            shoppingList={currentShoppingList}
            onAddToList={handleAddToShoppingList}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveFromList={handleRemoveFromShoppingList}
            onClearList={handleClearShoppingList}
          />
        );
      case 'shopping-lists':
        return (
          <ShoppingListManager
            shoppingLists={shoppingLists}
            onCreateList={handleCreateShoppingList}
            onDeleteList={handleDeleteShoppingList}
            onSelectList={handleSelectShoppingList}
            onRenameList={handleRenameShoppingList}
          />
        );
      case 'price-manager':
        return (
          <PriceManager
            products={products}
            stores={stores}
            onUpdateProduct={handleUpdateProduct}
          />
        );
      case 'add-product':
        return (
          <AddProduct
            onAddProduct={handleAddProduct}
            onCancel={() => setCurrentView('products')}
          />
        );
      case 'add-store':
        return (
          <AddStore
            onAddStore={handleAddStore}
            onCancel={() => setCurrentView('stores')}
          />
        );
      default:
        return null;
    }
  };

  // Show loading screen while checking authentication
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page if user is not authenticated
  if (!user) {
    return (
      <>
        <LandingPage onShowAuth={(mode) => {
          setAuthMode(mode);
          setShowAuthModal(true);
        }} />
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation
        currentView={currentView}
        onViewChange={handleViewChange}
        shoppingListCount={currentShoppingList.length}
        onShowAuth={() => setShowAuthModal(true)}
      />
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentView()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
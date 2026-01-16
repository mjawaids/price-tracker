import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AnalyticsProvider, useAnalytics } from './contexts/AnalyticsContext';
import LandingPage from './components/LandingPage';
import MobileNavigation from './components/MobileNavigation';
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
import { trackPageView, trackUserAction, trackAuth } from './utils/analytics';

function AppContent() {
  const { user, loading } = useAuth();
  const { isInitialized } = useAnalytics();
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [currentShoppingList, setCurrentShoppingList] = useState<ShoppingListItem[]>([]);

  // Use Supabase data hook
  const {
    products,
    stores,
    shoppingLists,
    setShoppingLists,
    addProduct,
    updateProduct,
    deleteProduct,
    addStore,
    updateStore,
    deleteStore,
    createShoppingList,
    deleteShoppingList,
    renameShoppingList,
    updateShoppingListItems,
    loading: dataLoading
  } = useSupabaseData();

  // Show auth modal if user tries to access protected features
  const handleViewChange = (view: ViewMode) => {
    // Track page navigation
    trackPageView(`/${view}`, `${view.charAt(0).toUpperCase() + view.slice(1)} Page`);
    trackUserAction('navigate', { destination: view });
    
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

  const handleUpdateStore = (updatedStore: Store) => {
    updateStore(updatedStore);
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
    
    const updatedList = [...currentShoppingList, newItem];
    setCurrentShoppingList(updatedList);
    
    // Update the shopping list in the lists array
    if (shoppingLists.length === 0) {
      // Create a new shopping list if none exists
      createShoppingList('My Shopping List').then((newList) => {
        if (newList) {
          updateShoppingListItems(newList.id, updatedList);
        }
      });
    } else {
      // Update existing shopping list
      updateShoppingListItems(shoppingLists[0].id, updatedList);
    }
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    const updatedList = currentShoppingList.map(item =>
      item.id === id ? { ...item, quantity } : item
    );
    setCurrentShoppingList(updatedList);
    
    // Update in database
    if (shoppingLists.length > 0) {
      updateShoppingListItems(shoppingLists[0].id, updatedList);
    }
  };

  const handleRemoveFromShoppingList = (id: string) => {
    const updatedList = currentShoppingList.filter(item => item.id !== id);
    setCurrentShoppingList(updatedList);
    
    // Update in database
    if (shoppingLists.length > 0) {
      updateShoppingListItems(shoppingLists[0].id, updatedList);
    }
  };

  const handleClearShoppingList = () => {
    setCurrentShoppingList([]);
    
    // Update in database
    if (shoppingLists.length > 0) {
      updateShoppingListItems(shoppingLists[0].id, []);
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
            onUpdateStore={handleUpdateStore}
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
      <div className="min-h-screen static-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60 mx-auto mb-4"></div>
          <p className="text-white/80 text-sm md:text-base">Loading...</p>
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
    <div className="min-h-screen static-gradient">
      <MobileNavigation
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
      
      <main className="app-content">
        {renderCurrentView()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AnalyticsProvider>
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <AppContent />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    </AnalyticsProvider>
  );
}

export default App;
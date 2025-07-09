import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import { storage } from './utils/storage';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingListType[]>([]);
  const [currentShoppingList, setCurrentShoppingList] = useState<ShoppingListItem[]>([]);

  // Show auth modal if user tries to access protected features
  const handleViewChange = (view: ViewMode) => {
    if (!user && ['products', 'stores', 'price-manager', 'shopping-list', 'shopping-lists', 'add-product', 'add-store'].includes(view)) {
      setShowAuthModal(true);
      return;
    }
    setCurrentView(view);
  };

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedProducts = storage.getProducts();
    const savedStores = storage.getStores();
    const savedShoppingLists = storage.getShoppingLists();
    
    setProducts(savedProducts);
    setStores(savedStores);
    setShoppingLists(savedShoppingLists);
    
    // Load the first shopping list or create a default one
    if (savedShoppingLists.length > 0) {
      setCurrentShoppingList(savedShoppingLists[0].items);
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    storage.saveProducts(products);
  }, [products]);

  useEffect(() => {
    storage.saveStores(stores);
  }, [stores]);

  useEffect(() => {
    storage.saveShoppingLists(shoppingLists);
  }, [shoppingLists]);

  const handleAddProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProduct: Product = {
      ...productData,
      id: Date.now().toString(),
      variants: productData.variants.map(variant => ({
        ...variant,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        prices: []
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setProducts([...products, newProduct]);
    setCurrentView('products');
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleAddStore = (storeData: Omit<Store, 'id' | 'createdAt'>) => {
    const newStore: Store = {
      ...storeData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    
    setStores([...stores, newStore]);
    setCurrentView('stores');
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const handleDeleteStore = (id: string) => {
    setStores(stores.filter(s => s.id !== id));
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
    const newList: ShoppingListType = {
      id: Date.now().toString(),
      name,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setShoppingLists([...shoppingLists, newList]);
  };

  const handleDeleteShoppingList = (id: string) => {
    setShoppingLists(shoppingLists.filter(list => list.id !== id));
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
    setShoppingLists(shoppingLists.map(list => 
      list.id === id 
        ? { ...list, name: newName, updatedAt: new Date() }
        : list
    ));
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            products={products}
            stores={stores}
            shoppingLists={shoppingLists}
          />
        );
      case 'products':
        return (
          <ProductList
            products={products}
            stores={stores}
            onDeleteProduct={handleDeleteProduct}
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
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
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
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user || currentView === 'dashboard' ? renderCurrentView() : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to PriceTracker</h2>
            <p className="text-gray-600 mb-8">Sign in to start tracking prices and managing your shopping lists</p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-blue-700 transition-colors duration-200"
            >
              Get Started
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import StoreList from './components/StoreList';
import ShoppingList from './components/ShoppingList';
import AddProduct from './components/AddProduct';
import AddStore from './components/AddStore';
import { Product, Store, ShoppingList as ShoppingListType, ShoppingListItem, ViewMode } from './types';
import { storage } from './utils/storage';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingListType[]>([]);
  const [currentShoppingList, setCurrentShoppingList] = useState<ShoppingListItem[]>([]);

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
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setProducts([...products, newProduct]);
    setCurrentView('products');
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

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation
        currentView={currentView}
        onViewChange={setCurrentView}
        shoppingListCount={currentShoppingList.length}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;
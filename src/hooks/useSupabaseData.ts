import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Product, Store, ShoppingList } from '../types';

export const useSupabaseData = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(false);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadAllData();
    } else {
      // Clear data when user logs out
      setProducts([]);
      setStores([]);
      setShoppingLists([]);
    }
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadProducts(),
        loadStores(),
        loadShoppingLists()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading products:', error);
      return;
    }

    const formattedProducts: Product[] = data.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      brand: item.brand,
      variants: item.variants || [],
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));

    setProducts(formattedProducts);
  };

  const loadStores = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading stores:', error);
      return;
    }

    const formattedStores: Store[] = data.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      location: item.location,
      hasDelivery: item.has_delivery,
      deliveryRadius: item.delivery_radius,
      website: item.website,
      phone: item.phone,
      createdAt: new Date(item.created_at)
    }));

    setStores(formattedStores);
  };

  const loadShoppingLists = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading shopping lists:', error);
      return;
    }

    const formattedLists: ShoppingList[] = data.map(item => ({
      id: item.id,
      name: item.name,
      items: item.items || [],
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));

    setShoppingLists(formattedLists);
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    const newProduct = {
      user_id: user.id,
      name: productData.name,
      category: productData.category,
      brand: productData.brand,
      variants: productData.variants.map(variant => ({
        ...variant,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        prices: []
      }))
    };

    const { data, error } = await supabase
      .from('products')
      .insert(newProduct)
      .select()
      .single();

    if (error) {
      console.error('Error adding product:', error);
      return;
    }

    const formattedProduct: Product = {
      id: data.id,
      name: data.name,
      category: data.category,
      brand: data.brand,
      variants: data.variants || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };

    setProducts(prev => [formattedProduct, ...prev]);
  };

  const updateProduct = async (updatedProduct: Product) => {
    if (!user) return;

    const { error } = await supabase
      .from('products')
      .update({
        name: updatedProduct.name,
        category: updatedProduct.category,
        brand: updatedProduct.brand,
        variants: updatedProduct.variants,
        updated_at: new Date().toISOString()
      })
      .eq('id', updatedProduct.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating product:', error);
      return;
    }

    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const deleteProduct = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting product:', error);
      return;
    }

    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addStore = async (storeData: Omit<Store, 'id' | 'createdAt'>) => {
    if (!user) return;

    const newStore = {
      user_id: user.id,
      name: storeData.name,
      type: storeData.type,
      location: storeData.location,
      has_delivery: storeData.hasDelivery,
      delivery_radius: storeData.deliveryRadius,
      website: storeData.website,
      phone: storeData.phone
    };

    const { data, error } = await supabase
      .from('stores')
      .insert(newStore)
      .select()
      .single();

    if (error) {
      console.error('Error adding store:', error);
      return;
    }

    const formattedStore: Store = {
      id: data.id,
      name: data.name,
      type: data.type,
      location: data.location,
      hasDelivery: data.has_delivery,
      deliveryRadius: data.delivery_radius,
      website: data.website,
      phone: data.phone,
      createdAt: new Date(data.created_at)
    };

    setStores(prev => [formattedStore, ...prev]);
  };

  const deleteStore = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting store:', error);
      return;
    }

    setStores(prev => prev.filter(s => s.id !== id));
  };

  const createShoppingList = async (name: string) => {
    if (!user) return;

    const newList = {
      user_id: user.id,
      name,
      items: []
    };

    const { data, error } = await supabase
      .from('shopping_lists')
      .insert(newList)
      .select()
      .single();

    if (error) {
      console.error('Error creating shopping list:', error);
      return;
    }

    const formattedList: ShoppingList = {
      id: data.id,
      name: data.name,
      items: data.items || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };

    setShoppingLists(prev => [formattedList, ...prev]);
  };

  const deleteShoppingList = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('shopping_lists')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting shopping list:', error);
      return;
    }

    setShoppingLists(prev => prev.filter(list => list.id !== id));
  };

  const renameShoppingList = async (id: string, newName: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('shopping_lists')
      .update({
        name: newName,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error renaming shopping list:', error);
      return;
    }

    setShoppingLists(prev => prev.map(list => 
      list.id === id 
        ? { ...list, name: newName, updatedAt: new Date() }
        : list
    ));
  };

  return {
    products,
    stores,
    shoppingLists,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    addStore,
    deleteStore,
    createShoppingList,
    deleteShoppingList,
    renameShoppingList
  };
};
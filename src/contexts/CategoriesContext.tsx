import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  Category,
  DEFAULT_CATEGORIES,
  getCategories,
  makeCategory,
  setCategories as persistCategories,
} from '../lib/categories';

interface CategoriesApi {
  categories: Category[];
  /** Add a category by name. Returns false if the name is empty or a duplicate. */
  addCategory: (name: string) => boolean;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  resetCategories: () => void;
}

const CategoriesContext = createContext<CategoriesApi | undefined>(undefined);

export const useCategories = () => {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within a CategoriesProvider');
  return ctx;
};

export const CategoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCats] = useState<Category[]>(() => getCategories());

  // Persist to localStorage + module cache, then update React state so the
  // tree re-renders with the new list.
  const commit = useCallback((list: Category[]) => {
    persistCategories(list);
    setCats(list);
  }, []);

  const addCategory = useCallback(
    (name: string) => {
      const cat = makeCategory(name);
      if (!cat.name) return false;
      if (categories.some((c) => c.id === cat.id || c.name.toLowerCase() === cat.name.toLowerCase())) {
        return false;
      }
      commit([...categories, cat]);
      return true;
    },
    [categories, commit],
  );

  const renameCategory = useCallback(
    (id: string, name: string) => {
      const next = name.trim();
      if (!next) return;
      commit(categories.map((c) => (c.id === id ? { ...c, name: next } : c)));
    },
    [categories, commit],
  );

  const deleteCategory = useCallback(
    (id: string) => commit(categories.filter((c) => c.id !== id)),
    [categories, commit],
  );

  const resetCategories = useCallback(() => commit(DEFAULT_CATEGORIES), [commit]);

  const value: CategoriesApi = {
    categories,
    addCategory,
    renameCategory,
    deleteCategory,
    resetCategories,
  };

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
};

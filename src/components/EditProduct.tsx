import React, { useState } from 'react';
import { Plus, Minus, Save, X } from 'lucide-react';
import { Product, ProductVariant } from '../types';

interface EditProductProps {
  product: Product;
  onUpdateProduct: (product: Product) => void;
  onCancel: () => void;
}

const EditProduct: React.FC<EditProductProps> = ({ product, onUpdateProduct, onCancel }) => {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [brand, setBrand] = useState(product.brand || '');
  const [variants, setVariants] = useState<Omit<ProductVariant, 'prices'>[]>(
    product.variants.map(v => ({ id: v.id, name: v.name, specifications: v.specifications }))
  );

  const categories = [
    'Groceries', 'Electronics', 'Clothing', 'Home & Garden', 'Health & Beauty',
    'Sports & Outdoors', 'Books & Media', 'Toys & Games', 'Automotive', 'Pet Supplies'
  ];

  const addVariant = () => {
    setVariants([...variants, { 
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: '', 
      specifications: {} 
    }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: string, value: string) => {
    const updated = [...variants];
    if (field === 'name') {
      updated[index].name = value;
    }
    setVariants(updated);
  };

  const addSpecification = (variantIndex: number, key: string, value: string) => {
    const updated = [...variants];
    updated[variantIndex].specifications[key] = value;
    setVariants(updated);
  };

  const removeSpecification = (variantIndex: number, key: string) => {
    const updated = [...variants];
    delete updated[variantIndex].specifications[key];
    setVariants(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || variants.some(v => !v.name)) return;

    const updatedProduct: Product = {
      ...product,
      name,
      category,
      brand: brand || undefined,
      variants: variants.map(v => {
        const existingVariant = product.variants.find(ev => ev.id === v.id);
        return {
          ...v,
          prices: existingVariant?.prices || []
        };
      }),
      updatedAt: new Date(),
    };

    onUpdateProduct(updatedProduct);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Edit Product</h2>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter product name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter brand name"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Product Variants</h3>
              <button
                type="button"
                onClick={addVariant}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                <Plus className="h-4 w-4" />
                <span>Add Variant</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div key={variant.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Variant {index + 1}</h4>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="p-1 text-red-400 hover:text-red-600 transition-colors duration-200"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Variant Name *
                      </label>
                      <input
                        type="text"
                        value={variant.name}
                        onChange={(e) => updateVariant(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 500ml, Large, Red"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Specifications
                      </label>
                      <div className="space-y-2">
                        {Object.entries(variant.specifications).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={key}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Property"
                              readOnly
                            />
                            <input
                              type="text"
                              value={value}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Value"
                              readOnly
                            />
                            <button
                              type="button"
                              onClick={() => removeSpecification(index, key)}
                              className="p-2 text-red-400 hover:text-red-600 transition-colors duration-200"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <SpecificationInput
                          onAdd={(key, value) => addSpecification(index, key, value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              <Save className="h-4 w-4" />
              <span>Update Product</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SpecificationInput: React.FC<{ onAdd: (key: string, value: string) => void }> = ({ onAdd }) => {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');

  const handleAdd = () => {
    if (key && value) {
      onAdd(key, value);
      setKey('');
      setValue('');
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        type="text"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        placeholder="Property (e.g., Size, Color, Weight)"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        placeholder="Value (e.g., 500ml, Red, 1kg)"
      />
      <button
        type="button"
        onClick={handleAdd}
        className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
};

export default EditProduct;
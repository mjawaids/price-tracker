import React, { useState } from 'react';
import { Plus, Minus, Save, X } from '@geist-ui/icons';
import { Card, Button, Input, Select, Modal, Text } from '@geist-ui/core';
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
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'var(--geist-background)',
        borderRadius: '12px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Text h3 my={0}>Edit Product</Text>
          <button
            onClick={onCancel}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              opacity: 0.6,
              transition: 'opacity 0.2s'
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <div>
              <Text small b style={{ marginBottom: '8px', display: 'block' }}>Product Name *</Text>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter product name"
                width="100%"
                required
              />
            </div>
            
            <div>
              <Text small b style={{ marginBottom: '8px', display: 'block' }}>Category *</Text>
              <Select
                value={category}
                onChange={(val) => setCategory(val as string)}
                placeholder="Select a category"
                width="100%"
              >
                {categories.map(cat => (
                  <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                ))}
              </Select>
            </div>
            
            <div>
              <Text small b style={{ marginBottom: '8px', display: 'block' }}>Brand</Text>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Enter brand name"
                width="100%"
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <Text h4 my={0}>Product Variants</Text>
              <Button
                type="success"
                icon={<Plus size={16} />}
                auto
                onClick={addVariant}
              >
                Add Variant
              </Button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {variants.map((variant, index) => (
                <Card key={variant.id} style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <Text b>Variant {index + 1}</Text>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
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
                        <Minus size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <Text small b style={{ marginBottom: '8px', display: 'block' }}>Variant Name *</Text>
                      <Input
                        value={variant.name}
                        onChange={(e) => updateVariant(index, 'name', e.target.value)}
                        placeholder="e.g., 500ml, Large, Red"
                        width="100%"
                        required
                      />
                    </div>
                    
                    <div>
                      <Text small b style={{ marginBottom: '8px', display: 'block' }}>Specifications</Text>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.entries(variant.specifications).map(([key, value]) => (
                          <div key={key} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Input
                              value={key}
                              placeholder="Property"
                              width="100%"
                              readOnly
                            />
                            <Input
                              value={value}
                              placeholder="Value"
                              width="100%"
                              readOnly
                            />
                            <button
                              type="button"
                              onClick={() => removeSpecification(index, key)}
                              style={{
                                padding: '8px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#f31260',
                                opacity: 0.8,
                                transition: 'opacity 0.2s',
                                flexShrink: 0
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <SpecificationInput
                          onAdd={(key, value) => addSpecification(index, key, value)}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Button
              type="success"
              htmlType="submit"
              icon={<Save size={16} />}
            >
              Update Product
            </Button>
            <Button
              onClick={onCancel}
            >
              Cancel
            </Button>
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
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Property (e.g., Size, Color, Weight)"
        width="100%"
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Value (e.g., 500ml, Red, 1kg)"
        width="100%"
      />
      <button
        type="button"
        onClick={handleAdd}
        style={{
          padding: '8px',
          background: '#10B981',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.2s'
        }}
      >
        <Plus size={16} />
      </button>
    </div>
  );
};

export default EditProduct;
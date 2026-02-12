import React, { useState } from 'react';
import { Plus, Minus, X } from '@geist-ui/icons';
import { Save } from '@geist-ui/icons';
import { Card, Button, Input, Select, Text, Spacer } from '@geist-ui/core';
import { Product, ProductVariant } from '../types';

interface AddProductProps {
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const AddProduct: React.FC<AddProductProps> = ({ onAddProduct, onCancel }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [variants, setVariants] = useState<Omit<ProductVariant, 'id' | 'prices'>[]>([
    { name: '', specifications: {} }
  ]);

  const categories = [
    'Groceries', 'Electronics', 'Clothing', 'Home & Garden', 'Health & Beauty',
    'Sports & Outdoors', 'Books & Media', 'Toys & Games', 'Automotive', 'Pet Supplies'
  ];

  const addVariant = () => {
    setVariants([...variants, { name: '', specifications: {} }]);
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

    const product = {
      name,
      category,
      brand: brand || undefined,
      variants: variants.map(v => ({
        ...v,
        prices: []
      }))
    };

    onAddProduct(product);
  };

  return (
    <div style={{ maxWidth: '896px', margin: '0 auto' }}>
      <Card style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Text h3 style={{ margin: 0 }}>Add New Product</Text>
          <Button
            icon={<X />}
            auto
            scale={0.8}
            px={0.6}
            onClick={onCancel}
            type="abort"
          />
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div>
                <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Product Name *</Text>
                <Input
                  width="100%"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter product name"
                  required
                />
              </div>
              
              <div>
                <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Category *</Text>
                <Select
                  placeholder="Select a category"
                  value={category}
                  onChange={(val) => setCategory(val as string)}
                  width="100%"
                >
                  {categories.map(cat => (
                    <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                  ))}
                </Select>
              </div>
              
              <div>
                <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Brand</Text>
                <Input
                  width="100%"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Enter brand name"
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <Text h4 style={{ margin: 0 }}>Product Variants</Text>
                <Button
                  icon={<Plus />}
                  auto
                  scale={0.75}
                  onClick={addVariant}
                  type="secondary"
                >
                  Add Variant
                </Button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {variants.map((variant, index) => (
                  <Card key={index} style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <Text b>Variant {index + 1}</Text>
                      {variants.length > 1 && (
                        <Button
                          icon={<Minus />}
                          auto
                          scale={0.6}
                          px={0.6}
                          onClick={() => removeVariant(index)}
                          type="error"
                        />
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Variant Name *</Text>
                        <Input
                          width="100%"
                          value={variant.name}
                          onChange={(e) => updateVariant(index, 'name', e.target.value)}
                          placeholder="e.g., 500ml, Large, Red"
                          required
                        />
                      </div>
                      
                      <div>
                        <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Specifications</Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {Object.entries(variant.specifications).map(([key, value]) => (
                            <div key={key} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <Input
                                width="100%"
                                value={key}
                                placeholder="Property"
                                readOnly
                              />
                              <Input
                                width="100%"
                                value={value}
                                placeholder="Value"
                                readOnly
                              />
                              <Button
                                icon={<X />}
                                auto
                                scale={0.6}
                                px={0.6}
                                onClick={() => removeSpecification(index, key)}
                                type="error"
                              />
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

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button
                icon={<Save />}
                type="success"
                htmlType="submit"
              >
                Save Product
              </Button>
              <Button
                type="abort"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </Card>
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
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <Input
        width="100%"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Property (e.g., Size, Color, Weight)"
      />
      <Input
        width="100%"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Value (e.g., 500ml, Red, 1kg)"
      />
      <Button
        icon={<Plus />}
        auto
        scale={0.6}
        px={0.6}
        onClick={handleAdd}
        type="success"
      />
    </div>
  );
};

export default AddProduct;
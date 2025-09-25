/*
  # Create missing tables for products, stores, and shopping lists

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, required)
      - `category` (text, required)
      - `brand` (text, optional)
      - `variants` (jsonb, default empty array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `stores`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, required)
      - `type` (text, required with check constraint)
      - `location` (jsonb, optional)
      - `has_delivery` (boolean, default false)
      - `delivery_radius` (integer, optional)
      - `website` (text, optional)
      - `phone` (text, optional)
      - `created_at` (timestamp)
    
    - `shopping_lists`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, required)
      - `items` (jsonb, default empty array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    
  3. Indexes
    - Add performance indexes for common queries
    
  4. Triggers
    - Add updated_at triggers for products and shopping_lists
*/

-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  brand text,
  variants jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  location jsonb,
  has_delivery boolean DEFAULT false,
  delivery_radius integer,
  website text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Add check constraint for store type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stores_type_check' AND table_name = 'stores'
  ) THEN
    ALTER TABLE stores ADD CONSTRAINT stores_type_check 
    CHECK (type = ANY (ARRAY['physical'::text, 'online'::text]));
  END IF;
END $$;

-- Create shopping_lists table
CREATE TABLE IF NOT EXISTS shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for products
CREATE POLICY "Users can manage their own products"
  ON products
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for stores
CREATE POLICY "Users can manage their own stores"
  ON stores
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for shopping_lists
CREATE POLICY "Users can manage their own shopping lists"
  ON shopping_lists
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function for updating updated_at column if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopping_lists_updated_at ON shopping_lists;
CREATE TRIGGER update_shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS products_user_id_idx ON products(user_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);
CREATE INDEX IF NOT EXISTS stores_user_id_idx ON stores(user_id);
CREATE INDEX IF NOT EXISTS stores_type_idx ON stores(type);
CREATE INDEX IF NOT EXISTS shopping_lists_user_id_idx ON shopping_lists(user_id);
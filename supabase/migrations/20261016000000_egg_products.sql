-- Shared products the old name parser read wrongly (see src/lib/compare/productName.ts):
-- * "Omega 3 Eggs 12 Pieces" was read as a pack of 3 (the "3" of Omega-3);
-- * things that only mention an egg were typed as eggs: a pudding, dog food, a
--   biscuit, and "Cocos World Egg" (not eggs; what it is isn't clear from the
--   name, so it's left untyped).
-- The parser now gets these right for new imports, but the importer only rewrites
-- a stored type when a listing is that product's alone, so these rows are fixed
-- here. Each update is guarded by the old value, so it does nothing if the row has
-- changed since (or on a second run). No prices are touched.

-- Omega-3 eggs: the real pack size.
UPDATE spendless.catalog_products SET pack_count = 12
WHERE owner_id IS NULL AND item_type = 'eggs' AND pack_count = 3
  AND id IN ('e08fd7e2-b526-4e56-b43e-52a29d0e80b2',  -- Appie Farms Omega 3 Eggs 12S Large
             '3547698e-7fec-4948-96b2-043f0f18a420'); -- Farm Fresh Omega 3 Eggs 12 Pieces
UPDATE spendless.catalog_products SET pack_count = 6
WHERE owner_id IS NULL AND item_type = 'eggs' AND pack_count = 3
  AND id IN ('c7c0c863-4cd4-4343-97ed-1aee67639afa',  -- Appie Farms Omega 3 Eggs 6S Large
             'fc4b448a-e391-4fdb-85fc-5a4bc03b9536'); -- Farm Fresh Omega 3 Eggs 6 Pieces

-- Not eggs.
UPDATE spendless.catalog_products SET item_type = 'dessert-mix', category = 'pantry'
WHERE owner_id IS NULL AND item_type = 'eggs'
  AND id = '51bc3c4d-4ce7-4c51-af70-42e44cd6294c'; -- Rafhan Egg Pudding 78g
UPDATE spendless.catalog_products SET item_type = 'pet-food', category = 'household'
WHERE owner_id IS NULL AND item_type = 'eggs'
  AND id IN ('36cdd751-1e01-40a5-aa27-aa76ccb406dc',  -- Target Chicken & Egg Adult Dog Food 1kg
             '487af120-6634-47f9-959d-7e6c794d3e37'); -- Target Dog Food 3Kg Chicken & Egg
UPDATE spendless.catalog_products SET item_type = 'biscuits', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'eggs'
  AND id = 'ef4e9851-3c11-4518-9c8a-e5c6a9e4a424'; -- LU Gala Egg 10 Packets
UPDATE spendless.catalog_products SET item_type = NULL, category = NULL
WHERE owner_id IS NULL AND item_type = 'eggs'
  AND id IN ('ddd45d19-fdda-481a-a680-8c12f255ca2f',  -- Dewdrop Cocos World Egg Blooming Yellow 1 Unit
             '2896bf3b-cfd7-49f1-973b-ef11ea9fa9a6',  -- Dewdrop Cocos World Egg Bold Blue 55g
             '83515892-1288-4d5c-af48-e4d74f3aff79',  -- Dewdrop Cocos World Egg Cool Blue 1 Unit
             'ef68f66a-33ca-401c-b1e6-c17f88b275d6',  -- Dewdrop Cocos World Egg Magical Purple 1 Unit
             'aaa5f181-0d38-43eb-a993-56f90c597599'); -- Dewdrop Cocos World Egg Mighty Red 55g

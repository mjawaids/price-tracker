-- Shared products whose stored item type the name parser (src/lib/compare/productName.ts,
-- itemTypes.ts) now reads differently, set to what the importer reads for them today
-- (except five rows no store lists, set by hand: noted where they are):
--
-- 1. Misread types (180 rows). A type word after the pack size is usually the flavour
--    ("Shan Masala 50gm Shami Kabab" is a spice mix, not kebabs; "Toblerone Chocolate
--    100gm Fruit&Nut" is chocolate; "Safari Potato Grills 60gm Salt" is chips, not salt);
--    "Potato Slims" / "Potato Stix" / "Potato Crisps" are chips, not potatoes, and
--    "Crispy Potato Nuggets" are nuggets; Bisconni Cocomo "Milk" pouches are biscuits
--    (milk is their flavour; the parser can't tell from "Milk Family Pouch", so these two
--    are set by hand, like the potato slims and the wafers no store lists).
-- 2. Missing types (692 rows). The importer left these untyped when the type it read
--    didn't fit the store's aisle; it now reads every category an aisle names ("Biscuits &
--    Cakes" is bakery and snacks), so a biscuit there is biscuits. The app no longer
--    guesses a type that doesn't fit a product's category, so without this they'd drop
--    out of "Which biscuits?".
--
-- The importer rewrites a product's type only when its listing's key changes or is blank
-- (never for a product no store lists), so these are fixed here. Their keys change with
-- the new reading too: the next import re-keys a product one store lists in place, and
-- moves the listings of one that several stores list (or people priced elsewhere) to a
-- new product, which the nightly merge then joins. Each update is guarded by the
-- old value, so it does nothing if the row has changed since (or on a second run). The
-- category follows the type, as the importer sets it. No prices are touched.

-- 1. Misread types

-- nuts → chocolate
UPDATE spendless.catalog_products SET item_type = 'chocolate', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'nuts' AND id IN (
  '2a1d7959-e354-4e57-a668-9da00ded23ce', -- B&B CHOCOLATE BEANS PEANUT 40GM
  'ed36f4ee-6236-411d-8191-7abdd67e96d2', -- BELCO CHOCOLATE 100GM FRUITS & NUTS
  'ac5e7096-a036-41b9-a32d-714a5cc033d7', -- BELCO CHOCOLATE 100GM ROASTED ALMONDS
  'e44f22f9-7ee9-47d0-9d07-3489f59b6907', -- BELCO CHOCOLATE 100GM ROASTED PEANUTS
  'b8317249-5bc9-48c6-9376-d4a3f64ceaec', -- Candyland Flick Chocolate With Caramel Peanut Rs 100
  'e9dc3ff3-e743-48ea-83de-a2dce5feab12', -- CENTURY CHOCOLATE MINI BAR 26GM CHOCO NUTS
  'f1ebd250-9d46-4848-afa6-76c5527fbb02', -- CENTURY CHOCOLATE MINI BAR 52GM CHOCO NUTS
  'b44e8328-7e4d-4e36-8bf7-daa8a1be042d', -- CENTURY CHOCOLATE SMART BAR 130GM CHOCO NUTS
  'b03f33be-a4a7-4eb3-98ea-d52b8df88a16', -- DELICES DE BELGIQUE SUGAR FREE CHOCOLATE 100GM DARK ALMOND CRUNCH
  '3b19da1c-1d01-4c1f-9c83-486899dc91f7', -- GALAXY CHOCOLATE 36GM FRUIT&NUT
  '2b582d00-3cfd-4bac-97e2-f25ae913e3cd', -- GALAXY JEWELS CHOCOLATE 140GM POUCH NUT COLLECTION
  '072fc64c-3be2-446c-a0c5-d90735ee3f8d', -- Hersheys Extra Creamy Milk Chocolate With Almonds 40g
  '5fdbdc5a-46c6-4cb3-916f-f1b01d04312b', -- HERSHEYS NUGGETS DARK CHOCOLATE WITH ALMOND 28GM
  'db209e3e-7d31-47d2-a5d0-f3d89400c084', -- HERSHEYS NUGGETS MILK CHOCOLATE ALMONDS 28GM
  'a0b2a961-654b-4509-b611-e484fd9f6568', -- MAJESTIC CHOCOLATE WITH PEANUT 40GM
  '8783f301-ec8e-4d1e-a183-e7c539299b30', -- MR BEAST FEASTABLES CHOCOLATE 60GM ALMOND
  'e7633b24-f69c-4b9c-9bb4-5daccb91a667', -- QUANTA YONKERS CHOCOLATE PEANUT POWER 16GM
  '139730dd-9ee0-4b96-b0e2-5c7bde0afb65', -- SALYSOL CHOCOLATE PEANUTS 60GM TIN
  '2af69968-8167-4c8c-a4ec-60f908a11a0c', -- SALYSOL CHOCOLATE PEANUTS COLOUR 60GM TIN
  'bfd7b6c6-bfe5-4d91-a66c-795aace269cd', -- Snicker Crips Fruit & Nut Bars 4x32 128g
  'fb4480fc-195d-4162-9adf-27670b2762e4', -- SNICKERS CHOCOLATE 45GM ALMOND
  'f8beaf41-7499-4963-b2e1-95fdb6fe9fa5', -- SNICKERS CHOCOLATE 50GM ALMOND 7PCS PACK
  '19254ddb-5fe5-4dc3-977a-c46934a42a83', -- TOBLERONE CHOCOLATE 100GM FRUIT&NUT
  '98a26814-4484-4d00-8154-81cf21650355', -- Toblerone Chocolate 100gm Honey&Almond
  'eb9f9306-645f-4d17-8395-a7e084f4d736', -- Toblerone Of Switzerland Swiss Milk Chocolate With Honey & Almonds Nougat 25g
  'f422f6bc-889d-4273-96b6-6fe16ff9b93b', -- Toblerone Swiss Dark Chocolate with Honey & Almond Nougat 100g
  '40a77e5d-8663-4192-b39a-a53f4ef74975', -- Toblerone Swiss Milk Chocolate with Honey & Almond Nougat & Salted Caramelised Almonds 35g
  '4ac816e3-ee51-468e-af88-fc3e882b5eac', -- Toblerone Swiss Milk Chocolate With Honey & Almond Nougat 100g
  '93c8c7b3-2998-4bca-a291-9afd88db3e27', -- TOREN CLASSIC CHOCOLATE 52GM PEANUT
  '7a437c1d-f3a2-432a-8f32-7429f9ba0296', -- VALOR CHOCOLATE 150GM DARK WITH ALMONDS
  'f6d553c0-5c2f-4fe6-935d-6c9cb1eccd2d'); -- VALOR CHOCOLATE 150GM MILK CHOCOLATE WITH ALMOND

-- chocolate → biscuits
UPDATE spendless.catalog_products SET item_type = 'biscuits', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'chocolate' AND id IN (
  'eda8c7b4-0ee8-4dd9-806a-ae26dff92d5f', -- Bisconni Amor By Chocolate Premium Cookies With Rich Chocolate Inside 8 Packs
  'a8cd56cf-5833-4e3b-8d63-47dae10bae68', -- Bisconni Day Dream Premium Coffee Cookies With Rich Chocolate Inside 10 Packs
  'b1d213a0-96ad-492a-857f-d92f16bea94a', -- Bisconni Mi Amor By Chocolato Premium Cookies With Rich Chocolate Inside 180g
  '025e73e7-ad43-48b5-a801-3fef83aaddb8', -- Biscotto Delicious Wafer Sticks Chocolate 370g
  '00d52d74-b522-4e2f-bbc5-61b348a0517f', -- Biscotto Delicious Wafer Sticks Chocolate Hazelnut 125g
  'f1b732a5-b420-42c8-8383-2203756eb910', -- Biscotto Delicious Wafer Sticks Chocolate Hazelnut 370g
  'e08ce65b-bed6-49d5-84ed-b08b72d9fc93', -- Biscotto Wafer Sticks 125Gm Chocolate
  'f67b749f-a0ca-4b8a-ab49-ff9f107f8ed2', -- Biscotto Wafer Sticks 125Gm Chocolate Hazelnut
  'a4a5cb00-3e02-4ed6-8061-fcebc83f6449', -- Candyland Bisca Biscuit With Chocolate & Caramel 2x Sticks 12 Bars
  'aca958fa-895f-4dc3-8788-25bdb8935491', -- Hilal Wispy Wafer 24S Box Crispy Chocolate Cream
  '14188a17-ff8c-4b99-af8f-e243e8c290c5', -- Innovative Choco Ring Biscuit Coated With Chocolate Rs.20
  '3e84090e-35d3-4d6d-84b2-cba107eea0bb', -- Inovative Snapp Wafer Chocolate 24S
  '112caa0b-1501-4e57-b612-0b9bcc1d2532', -- LOACKER QUADRATINI WAFER 125GM CHOCOLATE
  '015e34e6-c669-4e4b-aa84-a8841634ce49', -- LOACKER WAFER 25GM CHOCOLATE
  '89304062-288f-4251-9ae3-f561a592a6bb', -- LOACKER WAFER 25GM DARK CHOCOLATE
  '56ee1733-b7e0-4595-88dd-cfc797eeeace', -- Lu Mini Oreo Chocolate Sandwich Cookies With Chocolate Flavored Cream 30 Packs
  'ba81b078-bdbf-41d3-9889-c36c4952c664', -- LU Prince Coco Choc Coconut Biscuit Covered With Rich Creamy Chocolate 6Pcs
  '56fe570a-2ead-43dc-9e40-07a2770a174b', -- M&M COOKIES DOUBLE CHOCOLATE 180GM POUCH
  '1dedcd34-b63a-42da-84a9-39de593e8a72', -- MONESCO GOLDEN CRACKERS 120GM CHOCOLATE
  '0295a399-f6fd-4931-84e1-5ac4b682d41b', -- NUTRO WAFERS 150GM CHOCOLATE
  'cfb03a1f-aacf-42cb-a03d-7164afe83d83', -- Ola Ola Pillow wafers Chocolate (Rs.10)
  '09824ae8-0b7f-4a09-8fad-5b1ef07fe21a', -- Peek Freans Sooper Biscuit Classic Chocolate 16s Snack Packs 25.2Gm
  '58c0756e-3446-4192-9328-589d66d5a0cc', -- Snakitos Wafer Roll Dark Chocolate Can 80gm
  '49abfa6b-0fb4-4496-836f-523901a0bb9a', -- Tiffany Cream Wafers 150G Chocolate
  '79a56e7a-40a8-4c38-8bce-bf879a1460be', -- Tiffany Wafers 150Gm Chocolate (by hand: no store lists it)
  '74f9318b-dba4-40f3-a4aa-b0039fd1dc04', -- TRESORDORE WAFER CHOCOLATE 100GM HAZELNUT CREAM
  'bd9a58c6-d4cc-4726-9cd5-ef92b6b06e6a', -- TRESORDORE WAFER CHOCOLATE 125GM HAZELNUT CREAM
  '912e228c-f746-4253-a6a8-2dd240c76183', -- TRESORDORE WAFER CHOCOLATE TRUFFLES 200GM HAZELNUT CREAM
  'f716db39-738d-4729-8c73-ba17b4b19417'); -- WHITE CASTLE WAFER STICK 300GM CHOCOLATE

-- kebab → spice-mix
UPDATE spendless.catalog_products SET item_type = 'spice-mix', category = 'spices'
WHERE owner_id IS NULL AND item_type = 'kebab' AND id IN (
  '04626cc4-3eca-449e-a78d-60e8e767ba08', -- ALMARWAH MASALA 50GM SEEKH KABAB
  '459685c6-a2c4-41ef-8670-affe94d6007f', -- FALAK MASALA 45GM SEEKH KABAB
  '09360c60-8f46-44e1-a5f2-fcdaeca3794f', -- JAZAA MASALA 100GM CHAPLI KABAB
  '725ba850-61e8-4a65-a5c1-a3bfe11ec197', -- JAZAA MASALA 100GM SHAHI SEEKH KABAB
  '8cb3ba25-aa95-424c-bf41-6008734d4f36', -- JAZAA MASALA 100GM SHAMI KABAB
  '8e42eb84-8e6e-4435-b000-b2b134d6362d', -- JAZAA MASALA 50GM SHAHI SEEKH KABAB
  'b102ed7e-cc46-45b2-9e30-d0f3e8dfc334', -- JAZAA MASALA 50GM SHAMI KABAB
  '7f7ec60e-3143-436c-90c1-d946893ab687', -- MALKA MASALA 100GM SEEKH KABAB
  '5bb99689-c8f1-4b0e-815e-77e8befed755', -- MALKA MASALA 50GM CHAPLI KABAB
  '265ac672-fe24-4136-b4d4-bea00d868b49', -- MALKA MASALA 50GM SEEKH KABAB
  'd57eb18d-b9d7-4ac3-b971-2c477cfaaa51', -- MALKA MASALA 50GM SHAMI KABAB
  '7e616d6e-2c71-4dda-9b12-32620ddbcf78', -- MEHRAN MASALA 100GM CHAPLI KABAB
  'd86beb83-f18c-4834-a7d0-f2ce7ddcadf7', -- MEHRAN MASALA 45GM SEEKH KABAB
  '7fccc43d-f91a-44bf-998f-bc26446381e4', -- NATIONAL MASALA 100GM SHAMI KABAB
  '42d9b09e-ef7b-4fff-a611-d03b7553c4d9', -- NATIONAL MASALA 45GM SHAMI KABAB
  'de53068c-9b71-4370-be37-732883c668e1', -- NATIONAL MASALA 46GM SEEKH KABAB
  '8f63c089-9a82-4859-b7a9-a46995ceaf1b', -- NATIONAL MASALA 72GM CHAPLI KABAB
  '1c47a90a-11c3-4dae-bb82-56b0a15d610a', -- SHAN MASALA 100GM SHAMI KABAB
  'b210927d-1a80-4ba7-8fc6-72a7189683ff', -- SHAN MASALA 45GM SEEKH KABAB
  '6008af54-39d1-4ef8-aece-70830e1b19d0', -- SHAN MASALA 45GM TIKKA SEEKH KABAB
  '5f42897c-200b-4508-8a0b-ad7e607a8e9c'); -- SHAN MASALA 90GM TIKKA SEEKH KABAB

-- pickle → spice-mix
UPDATE spendless.catalog_products SET item_type = 'spice-mix', category = 'spices'
WHERE owner_id IS NULL AND item_type = 'pickle' AND id IN (
  'b88da903-b7ab-49db-b789-4e29486a6306', -- FALAK MASALA 50GM ACHAR GOSHT
  '96d97daf-1c44-4995-80e5-04113db3944e', -- JAZAA MASALA 100GM RIWAITI ACHAR GOSHT
  '1a91da77-1819-40a6-a86e-23db68111f17', -- JAZAA MASALA 50GM RIWAITI ACHAR GOSHT
  '5dbd4a4f-d666-4ba8-adea-2e5134d344eb', -- MALKA MASALA 100GM ACHAR GOSHT
  '9906eea8-aca1-4811-9a4e-63e6f6619c9d', -- MALKA MASALA 50GM ACHAR GOSHT
  'cc9702aa-c268-4c2a-a5a1-6e62b1ea8158', -- MEHRAN MASALA 100GM ACHAR GOSHT
  'fa74ce89-40a7-4576-b5ef-44e35e7465d0', -- MEHRAN MASALA 50GM ACHAR GOSHT
  'b716cd64-577d-4cda-b6c3-f331e61f291a', -- NATIONAL MASALA 43GM ACHAR GOSHT (KARACHI KHAAS)
  '4ec07088-58f8-4ea4-933d-37d76ff7e5d3', -- NATIONAL MASALA 43GM ACHAR GOSHT 4S PACK
  '8cd94bc2-ff31-45f4-a174-fcc90cd8c682', -- NATIONAL MASALA 86GM ACHAR GOSHT (KARACHI KHAAS)
  '75b6fad9-86d0-4a6e-a687-dd0a765e338b', -- SHAN MASALA 100GM ACHAR GOSHT
  '51f0fe2e-0f10-4cd7-b2dc-294e5bf78987', -- SHAN MASALA 50GM ACHAR GOSHT
  '324a7ae4-b4aa-4f46-8507-8d1dd5431379'); -- SHAN MASALA 50GM ACHAR GOSHT 4S PACK

-- biscuits → chocolate
UPDATE spendless.catalog_products SET item_type = 'chocolate', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'biscuits' AND id IN (
  'f0af2d55-b7d2-4c6d-ab69-b7b6ffcb8b86', -- BELCO CHOCOLATE 100GM WAFERS
  '6fd2cfcb-6606-4893-9081-401eefac11c2', -- GALAXY CHOCOLATE MINIS 137.5GM COOKIE CRUMBLE
  '6bcf9b14-44e3-40af-bd1e-76349325f603', -- Hershey's Kisses Cookies 'n' Creme 33 Pieces 150g
  '59cc18b7-7550-433c-9bb9-c88d43e42539', -- HERSHEYS CHOCOLATE COOKIES N CREME 267GM POUCH
  '8fd4a654-6f0c-4435-9cae-c9b465e7a497', -- HERSHEYS KISSES CHOCOLATE POUCH 100GM COOKIES N CREME
  '772dc3fd-ee3d-413e-8444-ebc29599a812', -- HERSHEYS KISSES COOKIES N CREME POUCH 146GM
  '604407b6-880c-4012-afac-616cc56a54e7', -- LUXENS MILK CHOCOLATE 70GM BISCUIT
  '8f37e59b-df8e-4fda-995c-4a4fde61071f', -- MR BEAST FEASTABLES CHOCOLATE 60GM COOKIES&CREME
  'e383acfd-231a-4c4f-88f0-05ec54c0fd3a'); -- TOREN DELLA MILK CHOCOLATE 52GM COOKIE

-- chocolate → candy
UPDATE spendless.catalog_products SET item_type = 'candy', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'chocolate' AND id IN (
  '11baa7d2-1542-4f94-aca7-858b8d7757ff', -- CORNICHE TEDDY MARSHMALLOWS 70GM CHOCOLATE
  '9d979a60-5df1-4ffb-aa45-ff0b87d4a43f', -- ELIF ECLAIRS CANDY POUCH 225GM CHOCOLATE
  '25daa3b1-fce4-4790-98ba-9abe504dc20a', -- TIANS MARSHMALLOW CONE 15GM CHOCOLATE
  'c7fa6145-563f-4f21-8685-25e835ef2ff0', -- TRACK SENSATIONS CANDY 125GM CHOCOLATE
  '677bc55d-ffc1-4c8a-9d0f-790d34d8d7a7', -- TRACK SENSATIONS TOFFEE 125GM CHOCOLATE
  '72e425c2-f3e0-465e-bc89-82102f150705'); -- TREO ENGLISH TOFFEE 100GM CHOCOLATE

-- ketchup → chips
UPDATE spendless.catalog_products SET item_type = 'chips', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'ketchup' AND id IN (
  '918f35f9-3e60-4879-94a1-37653e2abc24', -- LAYS CHIPS 170GM TOMATO KETCHUP IMP
  '8bf3e401-6c64-4fce-9f82-1e098fc64ef2', -- LAYS CHIPS 21GM TOMATO KETCHUP IMP
  'e0d24218-4a87-442b-9998-273487041ff5', -- POPPIN TAXOS POTATO CRISPS 110GM TOMATO KETCHUP
  'd3729a53-b2b1-4cd8-98a7-42902a8fa784', -- POPPIN TAXOS POTATO CRISPS 45GM TOMATO KETCHUP
  '6e689268-cc3a-42ff-9454-2adfc971738c', -- SUPER CRISP TWISTER CHIPS 10GM TOMATO KETCHUP
  'f4a6d8f0-a532-4f13-8a60-0528dafb9238'); -- SUPER CRISP TWISTER CHIPS 16GM TOMATO KETCHUP

-- red-chilli → chips
UPDATE spendless.catalog_products SET item_type = 'chips', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'red-chilli' AND id IN (
  '354cc04c-79df-4931-89a1-3a10eaa3c905', -- KURKURE CHIPS 10GM RED CHILLI JHATKA
  '522dc8da-bfc9-46b6-a49b-3ba8e786fdcf', -- KURKURE CHIPS 15GM RED CHILLI JHATKA
  '3490e971-2c69-4660-85c3-c41555170f03', -- KURKURE CHIPS 34GM RED CHILLI JHATKA
  '99331884-43cb-4197-9653-f12a0e06ad30', -- KURKURE CHIPS 40GM RED CHILLI JHATKA
  '2cbfc365-979f-4aef-ba6e-de9a7534925d', -- KURKURE CHIPS 58GM RED CHILLI JHATKA
  'cc7296fc-58cc-4480-8171-ddae5ac8f286'); -- KURKURE CHIPS 86GM RED CHILLI JHATKA

-- coconut-milk → conditioner
UPDATE spendless.catalog_products SET item_type = 'conditioner', category = 'personal-care'
WHERE owner_id IS NULL AND item_type = 'coconut-milk' AND id IN (
  'e413a440-1940-4198-a191-af6715dbeaa3', -- COSMO CONDITIONER 480ML COCONUT MILK
  'ab485054-7a34-4819-b60b-8ef500ce5a68', -- HERBAL ESS CONDITIONER 400ML COCONUT MILK
  'fd5cf64c-7de3-4525-a7d1-935f482ea66f', -- HERBAL ESSENCES CONDITIONER 275ML COCONUT MILK
  '1b4d4efc-255d-4ef7-b432-cccca1e7849c'); -- OGX CONDITIONER 385ML COCONUT MILK

-- coconut-milk → shampoo
UPDATE spendless.catalog_products SET item_type = 'shampoo', category = 'personal-care'
WHERE owner_id IS NULL AND item_type = 'coconut-milk' AND id IN (
  '010d8c8c-25ec-4abe-8e5d-1dd0329a5b5f', -- COSMO Shampoo 480ml Coconut Milk (Sulfate Free)
  '6fd8a9c2-0fe0-4a43-ae34-19d546324d16', -- HAIR ENERGY HAIR SHAMPOO 250ML COCONUT MILK&SHEA
  '13628eca-4ef1-4d5a-b9af-90dfc5158b8a'); -- HERBAL ESS SHAMPOO 400ML COCONUT MILK

-- olive-oil → shampoo
UPDATE spendless.catalog_products SET item_type = 'shampoo', category = 'personal-care'
WHERE owner_id IS NULL AND item_type = 'olive-oil' AND id IN (
  'e1e3d126-197b-4687-805c-02dac2761862', -- BODY LUXURIES SHAMPOO 400ML OLIVE OIL
  '2b69ad89-82ba-4732-ba78-d75b6b7c1eeb', -- COSMO Shampoo 480ml Olive Oil (Sulfate Free)
  '02cd5473-d2ac-47b7-b034-e8bbca430d22'); -- Palmolive Shampoo 680ml Silky Straight Olive Oil & Keratin

-- black-pepper → chips
UPDATE spendless.catalog_products SET item_type = 'chips', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'black-pepper' AND id IN (
  'b14f3b8d-4e99-4852-86d5-21cb91c44bfb', -- LAYS CHIPS FORNO 43GM BLACK PEPPER IMP
  '525daad9-2fb3-4887-a7a0-ad993558b273'); -- UNITED KING POTATO SLIMS BLACK PEPPER 17GM

-- bread → biscuits
UPDATE spendless.catalog_products SET item_type = 'biscuits', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'bread' AND id IN (
  '973435a1-d41b-4f8c-a240-afd8078d501c', -- FARM HOUSE SHORT BREAD COOKIES FAMILY
  '97818e8b-84ac-48ba-95ee-960589568b3e'); -- FARM HOUSE SHORT BREAD COOKIES HALF ROLL

-- candy → chocolate
UPDATE spendless.catalog_products SET item_type = 'chocolate', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'candy' AND id IN (
  '881e4998-79f1-462a-bed6-99acb82461fe', -- TOREN DELLA MILK CHOCOLATE 52GM CANDIES
  'cee2baa9-dcd9-42ce-a15f-4a2b87bd7e39'); -- VALOR CHOCOLATE 100GM DARK MINT

-- chocolate → ice-cream
UPDATE spendless.catalog_products SET item_type = 'ice-cream', category = 'frozen'
WHERE owner_id IS NULL AND item_type = 'chocolate' AND id IN (
  '9b008447-026c-4dda-b46b-e7c8ea9dfcde', -- WALLS ICE CREAM 100ML CORNETTO DOUBLE CHOCOLATE
  '269c7976-51c4-4acc-b443-9f68d4ccfe20'); -- WALLS ICE CREAM 105ML CORNETTO HAZELNUT CHOCOLATE DISC

-- conditioner → shampoo
UPDATE spendless.catalog_products SET item_type = 'shampoo', category = 'personal-care'
WHERE owner_id IS NULL AND item_type = 'conditioner' AND id IN (
  'c2b9256f-133e-4a62-a55c-5e0f4ca022e9', -- DOCTOR SHAMPOO 100ML ANTI-LICE WITH CONDITIONER
  '2c32407b-40a6-4b6e-9d73-f1ee9620aa38'); -- DOCTOR SHAMPOO 200ML ANTI-LICE WITH CONDITIONER

-- cooking-oil → sunscreen
UPDATE spendless.catalog_products SET item_type = 'sunscreen', category = 'personal-care'
WHERE owner_id IS NULL AND item_type = 'cooking-oil' AND id IN (
  'b90a8ce3-6144-4fe4-b2cb-5bd2a615388b', -- HERBION SUNBLOCK 100ML SUNFLOWER OIL SPF50
  'b0f46078-1c98-4d83-b8c0-9f950d62717f'); -- HERBION SUNBLOCK 25GM SUNFLOWER OIL SPF50

-- ice-cream → squash
UPDATE spendless.catalog_products SET item_type = 'squash', category = 'beverages'
WHERE owner_id IS NULL AND item_type = 'ice-cream' AND id IN (
  'e6c4b8fc-7822-48b9-8332-d25c0e8eadee', -- Al Burhan Sharbat 800Ml Ice Cream Soda
  '6d64dd3b-bc20-4fa0-8c9e-75a94ec3e026'); -- PAKOLA SHARBAT 800ML ICE CREAM CORDIAL

-- milk → biscuits
UPDATE spendless.catalog_products SET item_type = 'biscuits', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'milk' AND id IN (
  '19cfdc29-a4fe-4e89-98fa-f55380fc382d', -- Bisconni Cocomo Milk Family Pouch (by hand: no store lists it)
  '6b604355-965b-4850-952c-a93d330dc037'); -- Bisconni Cocomo Milk Small Pouch (by hand: no store lists it)

-- olive-oil → conditioner
UPDATE spendless.catalog_products SET item_type = 'conditioner', category = 'personal-care'
WHERE owner_id IS NULL AND item_type = 'olive-oil' AND id IN (
  '3239a998-a86c-49af-89ba-8a23168f7ccd', -- COSMO CONDITIONER 480ML OLIVE OIL
  'f3be37d2-7604-4c1f-a016-f18ca023e28f'); -- PALMERS LEAVE IN CONDITIONER 250ML OLIVE OIL

-- potato → chips
UPDATE spendless.catalog_products SET item_type = 'chips', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'potato' AND id IN (
  '0e7ad0d5-f6aa-416e-93e9-6207ad395516', -- Chipsino Paprika Potato Slims Pocket Pack 1 Unit (by hand: no store lists it)
  '906f38cb-7a19-4bc0-b48a-1e090babae5e'); -- Kababjees Potato Slims Spicy 50g (by hand: no store lists it)

-- salt → chips
UPDATE spendless.catalog_products SET item_type = 'chips', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'salt' AND id IN (
  '1e7c8a7d-726c-4250-9c68-27892161bcd3', -- MD TIME SQUARE CHIPS 26GM PINK SALT
  '1b9a87f7-9323-43bc-87de-d3a562dae6bd'); -- SAFARI POTATO GRILLS 60GM SALT

-- toothbrush → toothpaste
UPDATE spendless.catalog_products SET item_type = 'toothpaste', category = 'personal-care'
WHERE owner_id IS NULL AND item_type = 'toothbrush' AND id IN (
  '73c92fa9-72dc-4a9f-badf-efd4b888e01b', -- Herbal English Fluoride Toothpaste 70g & English Pro Action Toothbrush
  'b73ee824-2390-4765-b0ee-98f24fad57f5'); -- Soda White Toothpaste 65g With Pro Active Toothbrush

-- biscuits → ice-cream
UPDATE spendless.catalog_products SET item_type = 'ice-cream', category = 'frozen'
WHERE owner_id IS NULL AND item_type = 'biscuits' AND id IN (
  'e31fbf57-81bc-46f4-869e-f67fe3a90f01'); -- WALLS ICE CREAM 100ML CORNETTO COOKIES

-- cake → biscuits
UPDATE spendless.catalog_products SET item_type = 'biscuits', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'cake' AND id IN (
  '6df0b77c-16b8-4372-aecd-ab144da03d73'); -- EURO CAKE CHOCOLATE CHIP COOKIES BOX 6S

-- candy → toothpaste
UPDATE spendless.catalog_products SET item_type = 'toothpaste', category = 'personal-care'
WHERE owner_id IS NULL AND item_type = 'candy' AND id IN (
  'f8fbbd62-0132-407b-9e47-d3d514567c9e'); -- Protect ABC Toothpaste 60gm Bubble Gum

-- chips → chocolate
UPDATE spendless.catalog_products SET item_type = 'chocolate', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'chips' AND id IN (
  '07945953-498a-4131-94b6-1fc30114d7b2'); -- MILKA CHOCOLATE 100GM CHIPS AHOY

-- coconut-milk → biscuits
UPDATE spendless.catalog_products SET item_type = 'biscuits', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'coconut-milk' AND id IN (
  'fef9b854-000d-4543-af94-4c0fef313365'); -- ALDIVA COCODIVA WAFER ROLLS 50GM COCONUT CREAM

-- cooking-oil → canned
UPDATE spendless.catalog_products SET item_type = 'canned', category = 'pantry'
WHERE owner_id IS NULL AND item_type = 'cooking-oil' AND id IN (
  '57436f8a-b371-4821-9d69-6109d7e4a62b'); -- HAUT NOTCH LIGHT CHUNKS TUNA 170GM TIN VEGETABLE OIL

-- cream → ice-cream
UPDATE spendless.catalog_products SET item_type = 'ice-cream', category = 'frozen'
WHERE owner_id IS NULL AND item_type = 'cream' AND id IN (
  'b3033f8d-b9c7-48a0-ac12-047f25eeebfa'); -- WALLS ICE CREAM 105ML CORNETTO STRAWBERRY CREAM

-- flavoured-milk → candy
UPDATE spendless.catalog_products SET item_type = 'candy', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'flavoured-milk' AND id IN (
  'e0969776-ecd7-4f7d-8f47-a3776ce17a7b'); -- EVLIYA GOOL CANDY 350GM CHOCOLATE MILK

-- green-tea → conditioner
UPDATE spendless.catalog_products SET item_type = 'conditioner', category = 'personal-care'
WHERE owner_id IS NULL AND item_type = 'green-tea' AND id IN (
  '0db18cb7-40c8-4e2e-96c2-d630c7753499'); -- XHC CONDITIONER 400ML GREEN TEA

-- green-tea → shampoo
UPDATE spendless.catalog_products SET item_type = 'shampoo', category = 'personal-care'
WHERE owner_id IS NULL AND item_type = 'green-tea' AND id IN (
  'ac6e5814-b131-48e9-b373-88f3fd3b885a'); -- XHC SHAMPOO 400ML GREEN TEA

-- hair-colour → conditioner
UPDATE spendless.catalog_products SET item_type = 'conditioner', category = 'personal-care'
WHERE owner_id IS NULL AND item_type = 'hair-colour' AND id IN (
  'bedfb66a-8287-456a-9ef6-513bb2682c90'); -- VATIKA CONDITIONER 180ML OLIVE&HENNA NOURISH & PROTECT

-- hair-colour → shampoo
UPDATE spendless.catalog_products SET item_type = 'shampoo', category = 'personal-care'
WHERE owner_id IS NULL AND item_type = 'hair-colour' AND id IN (
  'a0054ef9-daab-4d92-8b06-f3b4f04451aa'); -- VATIKA SHAMPOO 650ML OLIVE&HENNA

-- ice-cream → biscuits
UPDATE spendless.catalog_products SET item_type = 'biscuits', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'ice-cream' AND id IN (
  '2172f0ac-ce4b-4023-aad2-e32f80c886e6'); -- OREO COOKIES 110.4GM ICE CREAM

-- ice-cream → chocolate
UPDATE spendless.catalog_products SET item_type = 'chocolate', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'ice-cream' AND id IN (
  'a83616a2-9181-4e06-8467-f98c92f837ed'); -- Godiva Chocolate 35GM Creamy Choc Bar

-- lotion → shampoo
UPDATE spendless.catalog_products SET item_type = 'shampoo', category = 'personal-care'
WHERE owner_id IS NULL AND item_type = 'lotion' AND id IN (
  '38189638-57dc-49b8-8efa-1fdff36b36e3'); -- HEMANI SHAMPOO 400ML GARLIC+HAIR LOTION (OFFER PACK)

-- milk → flavoured-milk
UPDATE spendless.catalog_products SET item_type = 'flavoured-milk', category = 'dairy'
WHERE owner_id IS NULL AND item_type = 'milk' AND id IN (
  '0e5e4049-c506-4007-a4c3-2734706af8f7'); -- ALMARAI NAJOOM FLAVOUR MILK 150ML

-- nimko → chips
UPDATE spendless.catalog_products SET item_type = 'chips', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'nimko' AND id IN (
  '215a850a-b481-4777-9acf-e35faf06f5d2'); -- Shahi Chilli Chips 200Gm Nimco

-- pasta → noodles
UPDATE spendless.catalog_products SET item_type = 'noodles', category = 'grains'
WHERE owner_id IS NULL AND item_type = 'pasta' AND id IN (
  '981cb2bd-0c50-43eb-8d1c-d9dbe366d2bb'); -- SHAN SHOOP NOODLES 77GM PASTA

-- peanut-butter → biscuits
UPDATE spendless.catalog_products SET item_type = 'biscuits', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'peanut-butter' AND id IN (
  '8e6c74e5-eb07-4e75-aa94-71e87f163cb9'); -- OREO COOKIES 110.4GM PEANUT BUTTER & CHOCOLATE

-- peanut-butter → chocolate
UPDATE spendless.catalog_products SET item_type = 'chocolate', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'peanut-butter' AND id IN (
  '00232751-195b-4615-a391-ee72c0144920'); -- MR BEAST FEASTABLES CHOCOLATE 60GM PEANUT BUTTER

-- peanut-butter → chocolate-spread
UPDATE spendless.catalog_products SET item_type = 'chocolate-spread', category = 'pantry'
WHERE owner_id IS NULL AND item_type = 'peanut-butter' AND id IN (
  'd6ccc597-9060-4310-b6b9-8cd7a8612408'); -- SWITZELLA CHOCOLATE SPREAD 350GM PEANUT BUTTER

-- potato → nuggets
UPDATE spendless.catalog_products SET item_type = 'nuggets', category = 'frozen'
WHERE owner_id IS NULL AND item_type = 'potato' AND id IN (
  '500035f4-7d9c-4432-8a7d-454f99d52232'); -- Mon Salwa Crispy Potato Nuggets 700Gm

-- samosa → spice-mix
UPDATE spendless.catalog_products SET item_type = 'spice-mix', category = 'spices'
WHERE owner_id IS NULL AND item_type = 'samosa' AND id IN (
  '6b6e9b2e-43bb-486f-a3d8-4b87e6d81eb1'); -- SHAN MASALA 35GM SPRING ROLL

-- vinegar → chips
UPDATE spendless.catalog_products SET item_type = 'chips', category = 'snacks'
WHERE owner_id IS NULL AND item_type = 'vinegar' AND id IN (
  '34cabfd0-198b-4f11-9c21-7eba4d44ec0b'); -- SAFARI POTATO GRILLS 60GM SALT & VINEGAR

-- vinegar → pickle
UPDATE spendless.catalog_products SET item_type = 'pickle', category = 'spices'
WHERE owner_id IS NULL AND item_type = 'vinegar' AND id IN (
  'e96b57ea-4135-46bc-92b4-2e48310657bf'); -- AHMED PICKLE 300GM CHILLI IN VINEGAR

-- 2. Missing types

-- → biscuits
UPDATE spendless.catalog_products SET item_type = 'biscuits', category = 'snacks'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  'da11335a-249a-4636-b11c-efb9ac93b6aa', -- ABU WALAD SANDWICH BISCUITS 90GM BOX
  '2fe15758-01a7-4ed0-a360-d7a6beecc62d', -- ALDIVA PORLEO WAFER ROLLS 50GM CHOCOLATE CREAM
  '387993ef-8be3-43b3-a548-a8fa909bc10e', -- ALDIVA PORLEO WAFER ROLLS 50GM MILK CREAM
  '65fdaeaa-ed24-48eb-b012-613b3adc4733', -- ALDIVA ROLLO WAFER ROLLS 50GM STRAWBERRY
  'c5ccca25-5428-4e87-96dd-18aa810ba25a', -- ALDIVA WAFFO WAFER 200GM HAZELNUT BITES
  '699aaf44-7df5-41b1-9a8c-4bc53d8f57a9', -- ALDIVA WAFFO WAFER 200GM LEMON BITES
  '58f8fff2-b27d-4b60-aaed-5ddb296b8c61', -- ALDIVA WAFFO WAFER 200GM VANILLA BITES
  '281168fb-4eda-4441-a70d-19a97ef6224c', -- ALDIVA WOFLERS WAFER 175GM LEMON BITES
  'c0250ed0-e60a-4341-bc3b-8cbb1619572f', -- ALDIVA WOFLERS WAFER 175GM MILK BITES
  'c7d832ce-382b-4553-b04c-997695fde119', -- ALDIVA WOFLERS WAFER 175GM STRAWBERRY BITES
  'ddaf128f-aa1e-49cf-a41d-821e202a9115', -- ALDIVA WOFLERS WAFER 175GM VANILLA BITES
  '43d72b4c-5118-4c8e-a687-aa18e4950f9e', -- ALDIVA WOFLERS WAFER 80GM 2+1 (OFFER PACK)
  'b9d2261f-e80f-4da2-a407-7dd49267985f', -- AMADA CHOCOLOVE WAFER 18GM
  '22d8ca01-e527-44b5-ae09-679e22fe94b8', -- AMADA STARZ BISCUITS 37.5GM DARK CHOCOLATE
  'f5fdccb4-55cd-4f0d-a2a9-487c91363f12', -- AMADA STARZ BISCUITS 44GM MILKY
  'e42848d6-ff0d-4f5f-81a7-916788c8996f', -- AMADA STIX BISCUIT STICKS 32GM HAZELNUT
  'b8ef1926-5660-4d37-b8d2-736b8360a0f7', -- AMADA STIX BISCUIT STICKS 40GM MILK CHOCOLATE
  'f6e94183-4675-4b46-887a-59d0253ada36', -- AMERICAN KUISINE BUTTER COOKIES 40GM
  'df57dff2-6b08-41f9-ac1f-5005cd8d2ee5', -- AMERICAN KUISINE BUTTER COOKIES 80GM
  '101d3bc1-cab2-440c-ab5c-fd531c42b2fd', -- AMERICAN KUISINE OATS COOKIES 160GM APPLE&CINNAMON
  '602c41c8-b5ce-4d8f-91ec-520d4214c53c', -- AMERICAN KUISINE OATS COOKIES 160GM COCONUT
  'a7d68185-0cc9-47ee-9795-79240b05afb9', -- AMERICAN KUISINE OATS COOKIES 160GM HONEY
  '678037fb-26ce-4397-a6ee-10ce119f028e', -- AMERICAN KUISINE OATS COOKIES 160GM RAISIN
  'e68f2799-53bb-4f88-a4fd-93a62667d2a6', -- AMERICAN KUISINE OATS COOKIES 1760GM CHOCOLATE CHIP
  '7ace0f22-e4a9-4f91-a2e8-7a0c6ec55d8b', -- AMERICAN KUISINE SOFT COOKIES 160GM CHOCO
  '1ed70e0e-c8ed-4a67-95d3-ed41e5072fb2', -- AMERICAN KUISINE SOFT COOKIES 176GM B&B
  '16223ffe-bc17-4d30-af12-ee059aa73bd5', -- AMERICAN KUISINE SOFT COOKIES 176GM COCONUTY
  '8530658a-8a59-4810-a534-b262d27662be', -- AMERICAN KUISINE WAFER 100GM CHOCTELLA
  '3d132d87-4f9f-48c1-bad1-ed47d7f52d5b', -- AMERICAN KUISINE WAFER 100GM COCOTELLA
  'ca0ad4fb-ddd7-4d4f-b44d-c2443f3db276', -- AMERICAN KUISINE WAFER 100GM HAZELTELLA
  'badcaf2b-0306-488a-8e52-a1527a371138', -- AMERICAN KUISINE WAFER 100GM MILKTELLA
  'f4c6f428-f4ca-4320-8084-bd20fd95c6b6', -- AMERICAN KUISINE WAFER 100GM STRAWBELLA
  '594c72eb-4c38-42a5-867e-77c4574bc7e2', -- AMERICAN KUISINE WAFER 100GM VANTELLA
  'cd68b7a3-cfd5-4f50-aa2b-6914c9076394', -- ASTOR MINI WAFERS STICK 20GM
  '9765001c-52c3-4b50-8102-31b39235dc7f', -- ASTOR SKINNY ROLL WAFER 50GM BOX MIX
  'a9d5541e-8321-460c-aaea-b3f9d3343f00', -- ASTOR WAFER STICK 150GM CHOCOLATE BOX
  'c36eeb6a-f815-4580-b647-043fc6844c6e', -- ASTOR WAFER STICK 330GM CHOCOLATE TIN
  '67a0fc69-d782-46a2-8a7f-62cd27e01bc2', -- ASTOR WAFER STICK 40GM BOX
  '1fa1b119-46c9-4cba-b6d6-193b5dd81ea7', -- BAKERI BISTIKS COOKIES FAMILY PACK
  '3182546c-e32f-48bd-ae9a-ffb9cc353c73', -- BAKERI BUTTER COOKIES FAMILY PACK
  '4c3014f8-0548-4fca-96d9-e67cad97cd3e', -- BAKERI BUTTER COOKIES TICKY PACK
  '78548c7b-ba34-4b23-a9e0-48f04619815e', -- BAKERI COCONUT COOKIES FAMILY PACK
  '5fcbf056-73c6-47ef-a4c5-028d412e97be', -- BAKERI COCONUT COOKIES TICKY PACK
  '96b07c0e-f29c-4f6e-aa51-06a4e5f775a0', -- BAKERI KHAAS COOKIES EGG&MILK TICKY PACK 24S
  'f140d0da-f536-44aa-b928-e8eaf31c4ca3', -- BALOCCO CUBES WAFERS 125GM COCOA
  '28842ead-9577-47f0-b0ef-506c12749618', -- BALOCCO CUBES WAFERS 125GM HAZELNUT
  'a302f9d2-cb7b-4d55-ad6e-c6785c17b33d', -- BALOCCO CUBES WAFERS 125GM VANILLA
  'acc4c70d-029a-4eb4-bef0-fe2c0ad89acb', -- BALOCCO WAFERS 45GM COCOA
  'b94563ea-7162-4b5f-9ffb-83d6a32a5837', -- BALOCCO WAFERS 45GM VANILLA
  '3a9ea9e6-540e-4b9d-99cd-c7122dd8fdc6', -- BEN 10 CHOCO SNACK BISCUIT
  '30cb4cab-05ac-42f2-baa6-00a515df7c91', -- BISCOLATA DUOMAX CHOCOLATE COATED WAFER 44GM HAZELNUT
  '0e94ec0c-afe8-430c-b2ae-6f580f5d9cfd', -- BISCOLATA DUOMAX CHOCOLATE COATED WAFER 44GM MILKY
  '106530d3-79c0-40a4-8d56-1e8d3c495001', -- BISCONNI DIGESTIVE BISCUIT 234GM CHOCOLATE
  '6933a96e-f2a8-49a3-b313-7e4f063e84f2', -- BISCONNI DIGESTIVE BISCUIT 270GM
  '23a0d613-bcea-4580-b60e-fe48f382ba30', -- BISCONNI DIGESTIVE BISCUIT 270GM HONEY
  '373f98b1-260a-4fa1-b466-4ec530a749d5', -- BISCONNI DIGESTIVE BISCUIT 270GM SUGAR FREE
  '4ef04a7e-d5b9-4b75-90bb-5a79a474b493', -- BISCONNI ECLIPSE SANDWICH BISCUITS 196GM
  'd6e181c4-79a5-4a63-8533-e0b7bf2452a5', -- Bisconni Novita Chocolate Wafers 39Gm (10)
  '9c8effc8-9e4c-4521-9d29-58279872c667', -- Bisconni Novita Chocolate Wafers 40Gm (20)
  '57098883-01da-47e7-bc74-583c94b627e5', -- BISCOTTO LUXURY WAFERS 400GM (OFFER PACK)
  'a9436ed3-b70d-4c9e-a433-d640c2be8adf', -- BISCOTTO WAFERS 125GM TIN CAPPUCCINO
  '3b4c85f7-6087-4074-b4fb-611ceae28be2', -- BISCOTTO WAFERS 125GM TIN CHOCOLATE
  'e3dfc81c-4e0c-4a56-a235-b74a90a9c340', -- BISCOTTO WAFERS 125GM TIN CHOCOLATE HAZLENUT
  '52f2eb15-3411-4da1-b0fc-96a03dd08281', -- BISCOTTO WAFERS 125GM TIN VANILLA
  '50bae1dc-e42d-4a73-af94-eae827f51939', -- BISCOTTO WAFERS 370GM TIN CAPPUCCINO
  'a661f67b-1408-4538-b466-85ffe5e5493c', -- BISCOTTO WAFERS 370GM TIN CHOCOLATE
  'e4292895-b0ff-4e1e-8461-8d8abc7f6ec3', -- BISCOTTO WAFERS 370GM TIN CHOCOLATE HAZLENUT
  '610901b8-bc66-49bb-bc90-502ca2ed6ee2', -- BISCOTTO WAFERS 370GM TIN STRAWBERRY & CREAM
  '542235be-5c1d-47c1-901a-3f1953861116', -- BISCOTTO WAFERS 370GM TIN VANILLA
  '1fee3e03-403b-4ee4-badb-163d622f9b36', -- BISKREM CARAMEL BISCUIT 36GM
  '31d34ed8-9a16-4344-a1e8-6c3027300a07', -- BISKREM COCOA BISCUIT 36GM
  '92cce9eb-8b48-4e99-9166-1a96a0a54114', -- BISMARK COOKIES 126GM BROWNIE
  '82453411-70e9-4ceb-a543-71670e724602', -- BISMARK COOKIES 126GM BUTTER
  'b1b580f8-1910-448d-b514-4455bb277e2f', -- BISMARK COOKIES 126GM CHOCOLATE CHUNK
  'e4f31135-d60a-419e-b16a-53929565d79f', -- BISMARK COOKIES 126GM ROLLED OATS
  '089c642d-c9e3-410a-900c-d45972a674cf', -- BISMARK COOKIES 28GM BROWNIE
  'a97e531b-e4a0-46c0-9bb9-8199af30c5b9', -- BISMARK COOKIES 28GM CHOCOLATE CHUNK
  'c2e615cb-bf63-44f9-81cd-d32ed957906c', -- BISMARK COOKIES 70GM BUTTER
  'e90c22c1-d6e5-4138-b124-29663a8990bb', -- BISMARK COOKIES 70GM CHOCOLATE CHUNK
  '221d9ad3-6a94-484f-b078-12721060bf37', -- BISMARK COOKIES 70GM ROLLED OATS
  '1c7fa176-ef65-4e53-a266-51c3ee09addc', -- BISMARK DIGESTIVE BISCUIT 160GM FLAXSEEDS
  '74d717e0-2943-4770-9243-99b7e82174b6', -- BISMARK DIGESTIVE BISCUIT 160GM ORIGINAL
  'efc99ad9-0f0d-4c5c-ba66-6fc65a7bbd10', -- BISMARK SANDWICH BISCUITS 88GM CHOCOLATE FAMILY PACK
  '5710a52c-78b6-4a95-8689-bbf3d8bd0c6c', -- BISMARK SANDWICH BISCUITS 88GM STRAWBERRY FAMILY PACK
  'e9d015e9-d4e0-494f-8bf9-9a1bb4d4c25d', -- BONOMI SAVOIARDI LADYFINGERS BISCUITS 200GM
  '162d5e99-398a-43f1-a644-fa8bfac3ef70', -- BONOMI SAVOIARDI LADYFINGERS BISCUITS 400GM
  '153cd3ef-1e36-4842-ad93-93e249673379', -- BONY-O WAFERS MASTER 80GM BLUEBERRY
  '9f9f6a30-4001-49da-8fa6-7441ee373e8d', -- BONY-O WAFERS MASTER 80GM CHOCOLATE
  '95e4d7d1-7bb9-4822-b22e-c2259ba49b24', -- BONY-O WAFERS MASTER 80GM MANGO
  '99103614-2f5a-4bd1-90b8-4a9b71bbeb5f', -- BONY-O WAFERS MASTER 80GM STRAWBERRY
  'f0850ee1-115c-4a71-ba86-5f3e457050a6', -- BONY-O WAFERS MASTER 80GM VANILLA
  '3cab0e53-66f4-4a7c-b1fd-782dbca766f7', -- BONY-O WAFERS MASTER SINGLE STICK CHOCOLATE
  'e5a8628d-b553-4a0b-9510-6da2651424cd', -- BONY-O WAFERS MASTER SINGLE STICK STRAWBERRY
  '01ba9dd1-ffcd-47d7-a6f9-0abf0387c656', -- BONY-O WAFERS MASTER SINGLE STICK VANILLA
  'eb47fcb8-d117-4b68-b35e-b46642b72760', -- BOUNTY CHOC BISCUIT 132GM
  '96aec319-d721-471a-9a55-45d6fb0936f0', -- BOUNTY SOFT BAKED COOKIES 180GM
  '0f5ba307-9d09-4642-912d-307152c00499', -- BRAVO BISCUIT TICKY PACK
  'b4977290-a67a-4dc6-85fa-e55061d899d3', -- BRITANNIA BISCUIT 40GM TIME PASS 50-50
  'e1717e52-032d-4302-a600-9ea95a2f86d7', -- BRITANNIA BISCUIT 71GM MASKA CHASKA
  'd0ce8a1e-5ed7-4b35-ac86-67b0764fd57e', -- BRITANNIA DIGESTIVE BISCUIT 225GM REGULAR
  '713a26a5-3500-4d12-aa35-820424ef5fdc', -- BRITANNIA DIGESTIVE BISCUIT 350GM BLACK SEED
  'f6f0b0ef-f147-48d8-8b38-14ac12b288b0', -- BRITANNIA DIGESTIVE BISCUIT 350GM SUGARFREE
  'c4a67319-9e16-4309-9d56-87a593ca142f', -- BRITANNIA DIGESTIVE BISCUIT 400GM REGULAR
  'e5a314cc-7a75-4d4d-8608-337c2eb00ab0', -- BRITANNIA GOOD DAY BISCUIT 120GM CHOCO ALMOND
  'd35b9d62-d2bc-4741-869f-1afd9165fcc0', -- BRITANNIA GOOD DAY BISCUIT 90GM BUTTER
  'f2882a0a-4f55-4b85-9cde-82ed59969060', -- BRITANNIA GOOD DAY BISCUIT 90GM CASHEW
  '62a0774a-6dc5-4c38-ad3b-ef4d884c263a', -- BRITANNIA GOOD DAY BISCUIT 90GM PISTACHIO&ALMOND
  '00a04fe4-88ac-4840-9106-431213b2bf7a', -- BRITANNIA NUTRI CHOICE BISCUITS 75GM ALMOND&MILK
  '885b7c64-90f3-4499-86cc-17f88316afde', -- BRITANNIA NUTRI CHOICE BISCUITS 75GM CHOCOLATE&ALMOND
  'f2a573b8-3b97-43b4-85e0-3582a3ebe97c', -- BRITANNIA NUTRI CHOICE BISCUITS 75GM ORANGE
  '3a7e8fc4-da6d-4bc9-a974-d72f8173ca48', -- BRITANNIA TREAT BISCUIT 40GM FUNKY CHOCO
  'cb13ee94-d9e1-42a8-9bdd-79701c7944f3', -- BRITANNIA TREAT BISCUIT 60GM VANILLA
  '5f2bbe33-0566-4bb1-91ec-74f1d12b0465', -- BRITANNIA TREAT WAFER 150GM CHOCOLATE
  '6780aa0e-3035-42b1-a129-1ce058ea97df', -- BRITANNIA TREAT WAFER 150GM ORANGE
  '8149d68a-6896-4b56-b38f-ea8c32d925ac', -- BRITANNIA TREAT WAFER 150GM STRAWBERRY
  'a7fbcc44-6a6e-432d-832c-425b18791536', -- BRITANNIA TREAT WAFER 150GM VANILLA
  'e5ac7519-1d83-47f9-a81c-a0d1585b3fa2', -- BRITANNIA TREAT WAFER 75GM CHOCOLATE
  '1de410c6-96a9-434e-ab47-7d0e76e5e939', -- BRITANNIA TREAT WAFER 75GM ORANGE
  'dbeae3c1-2afb-41f6-82a6-436f99fc3ba0', -- BRITANNIA TREAT WAFER 75GM STRAWBERRY
  '71e745a9-2fd6-4496-8df1-1f54e644c72c', -- BRITANNIA TREAT WAFER 75GM VANILLA
  'b5fd8abe-a894-4930-ac3c-b23862ecf600', -- BURHANI ALMOND BISCUITS 250GM
  'ac2b885e-5a34-417d-958c-66ec6e6e66bc', -- BURHANI CHOCOLATE COOKIES 250GM
  'c74412f1-41f1-4de4-b822-5fea043fde8b', -- BURHANI CHOCOLATE RING BISCUITS 250GM
  'e760ee14-b376-4605-bf73-9ff90c0343e1', -- BURHANI MIX BISCUIT 250GM
  '2ae067e4-b718-4d5b-8c59-12e0302961ff', -- BURHANI ZEERA BISCUITS 250GM
  '7a31f4c1-2074-42d4-8c52-689bc7fc6834', -- BUTTER COOKIES TIN 454GM IMP
  '17691e4c-6b72-4a76-928c-43126fd679a7', -- BUTTER PUFF CRACKER FAMILY PACK
  '711686c7-2456-4f50-8970-183966374a40', -- BUTTER PUFF CRACKER TICKY PACK ORIGINAL
  '73dcc6ff-0328-4bec-8b6b-fe46b667bd15', -- BUTTER PUFF CRACKERS TICKY PACK VEGGIE
  'ae0539fe-aa85-4027-98bf-bbdd7f4ced31', -- CADBURY 114GM FINGERS BISCUITS IMP
  '68474ff8-7aa5-4a76-8075-d524b5ac1a70', -- CADBURY 200GM CHOCO CHIP COOKIES IMP
  'c1e82e8a-a659-4375-bc15-8c1d8ce98617', -- CANDI ORIGINAL COOKIES FAMILY PACK
  '3e5d0b46-f429-48df-9f55-d53364423296', -- CAPRICE CLASSIC WAFER ROLLS TIN 115GM
  '2eeb0cf8-9643-4283-ad6d-86a72c4f8653', -- CARRS MELTS SNACKABLE BISCUITS 150GM CHEESE
  '4dd55277-e4ab-43a3-a1c6-4edf21065f72', -- CARRS MELTS SNACKABLE BISCUITS 150GM ORIGINAL
  'aa5afd1a-7dcf-454b-aea0-6d20574abf03', -- CHIP HOP COOKIES 156GM CHOCOLATE
  '2692a4a2-a926-4ec9-94d9-e46ab68c4216', -- CHIP HOP COOKIES 156GM VANILLA
  '49661eaf-bbed-44c5-a8c9-7791ea8395bf', -- CHIPS MORE COOKIES 135GM DOUBLE CHOCOLATE
  '0fdabd34-2d52-481a-9c8c-6efeb22d7166', -- CHIPS MORE COOKIES 135GM HAZELNUT
  '855a0d31-8427-478e-bec7-57460c933407', -- CHIPS MORE COOKIES 135GM ORIGINAL
  '22281322-d916-46e2-b1aa-6996cc5eb8b5', -- CHO CHO SNACKS BISCUIT
  'd1095f84-c9b9-42ab-a32e-69adf88228b3', -- CHOCOLATE CHIP COOKIES (PROMO PACK)
  '505aed85-dc45-4bec-b257-3241e534f067', -- CHOCOLATE CHIP COOKIES FAMILY PACK
  'b665d784-9092-4b7a-9180-cbe70ca0e3da', -- CHOCOLATE CHIP COOKIES MIGHTY TICKY PACK
  '2cc010c4-db38-4746-8a79-08b37abc7c8f', -- CHOCOLATE CHIP COOKIES TICKY PACK
  '1ed75949-d0aa-4938-b850-41f17d55d253', -- CHOCOLATE CHIP COOKIES TICKY PACK 24S
  'f5eabbc6-cc80-4f99-897f-668ab083b46c', -- CHOCOLATE CHIP COOKIES TICKY PACK 30S
  'bc96887b-03dd-4bf0-b4fa-2bae74793909', -- CHOCOLATE CHIP MINI COOKIES 30S
  'f5dc18ce-a751-4730-bab2-a312a1b4243a', -- CHOCOLATE CHIP MINI COOKIES 60GM POUCH
  'd4de7877-5c7b-42b9-b924-9cd2f52ed427', -- CHOCOLATE SANDWICH BISCUIT MINI PACK
  'e5973f85-c925-44ec-bb3d-07d1c8285be4', -- CHOCOLATE SANDWICH BISCUIT TICKY PACK
  '97cf7fd6-3eb1-444d-9a6b-272950949097', -- CHOCOLATTO BISCUITS FAMILY PACK
  '0b10d5b5-e019-4750-8528-21891f113eb2', -- CLICK BISCUIT FAMILY PACK
  '18803bb3-d43b-44e0-a6ac-f0aac610c348', -- CLICK BISCUIT TICKY PACK
  '7a469b81-9c55-43af-baae-72be4b098428', -- COCOMO BISCUIT CHOCOLATE POUCH 30GM
  'de2e02a1-cb42-4893-a482-34862af5d065', -- COCOMO BISCUIT CHOCOLATE POUCH 42.5GM
  'e0dc9057-58d2-4d54-90a8-2582018278bd', -- COCOMO BISCUIT MILK POUCH 25.5GM
  '2eb05ed3-5622-4c0d-b153-e90166c8dbde', -- COCOMO BISCUIT MILK POUCH 90GM
  '99e52d3e-da20-499b-b2b3-66bfd7b6d571', -- COCOMO BISCUIT ORANGE POUCH 30GM
  '2a59a4db-4492-45e0-b512-89e8868605d5', -- COCOMO BISCUIT STRAWBERRY POUCH 30GM
  '8b7a780b-faa8-41fe-b6a9-dc1255fe3447', -- COCOMO BISCUIT TRIPLE CHOCOLATE POUCH 39.6GM
  'f8b6497d-3478-40b6-8615-2e3beebcfcc7', -- COCOMO BISCUIT TRIPLE CHOCOLATE POUCH 79.2GM
  '6d095ddf-2362-454e-a3a6-3aa44bafd6d7', -- COCOMO BISCUIT TRIPLE CREAM MILK POUCH 79.2GM
  '3ba6aa2e-6315-4037-8320-5d129001c72e', -- CRAVING COCONUT BISCUITS TICKY PACK
  '2f07a9d6-2315-4ec3-8cb1-a81ba231c873', -- CRUX BISCUIT FAMILY PACK
  '1fc8e497-5709-4465-b30d-9081f4ba2bae', -- DANISA BUTTER COOKIES TIN 200GM
  '887f0413-0873-4898-8d11-5118bfe461dc', -- DANISA BUTTER COOKIES TIN 454GM
  'e940627a-8ad1-4d76-8f9d-abb9e7f90e7d', -- DANISA BUTTER COOKIES TIN 750GM
  'ffff658b-3c00-4440-a1e7-7fae79be408e', -- DANISH STYLE BUTTER COOKIES TIN 400GM
  '19599603-47f1-4642-aa36-2b0507de4290', -- DAYDREAM COOKIES 150GM COFFEE
  'c3ac8e16-97f6-42e9-b818-746ff1c174d4', -- DITO SMOOTH WAFER 160GM STRAWBERRY
  'a55133b9-3c93-46a2-8cef-08f8aa172b23', -- DITO SMOOTH WAFER 160GM VANILLA
  '5dfb7e4f-4dd6-49e7-846b-9ad14e14d37a', -- DIVINE WAFERS 166GM CHOCOLATE
  '9c0ef39f-8eb2-454c-bc9e-3a08eefe67b8', -- DORIVA CRISPY WAFERS 45GM CHOCOLATE
  'bdb36e23-b300-43e6-ab6b-4e91d35cc106', -- DORIVA CRISPY WAFERS 45GM MILK
  'cfa39dd7-9c62-497b-ac6a-4622824aaaf0', -- DORIVA CRISPY WAFERS 45GM ORANGE
  '6fc52a6f-2b30-4e6e-b00a-5f0c0f3a4f05', -- DORIVA CRISPY WAFERS 45GM STRAWBERRY
  'c186a572-e73d-4eba-b734-628a19dc77e1', -- EAZU HAPPY BITES COOKIES 90GM ALMOND
  'e3ec2329-9b0b-4a0b-990c-0cc62a5772cf', -- EAZU HAPPY BITES COOKIES 90GM BUTTER
  '7993fe32-b3d3-40c0-8282-119a67692f22', -- EAZU HAPPY BITES COOKIES 90GM CASHEW
  '000502be-60b7-415b-9d23-860a90cae273', -- EAZU HAPPY BITES COOKIES 90GM PISTACHIO
  '1447cf28-d8fa-457b-8467-8be54e9cbddf', -- EAZU ROLL STIX WAFER 80GM CHOCOLATE SMART PACK
  '49851ad6-6e6c-44e1-a72f-fe3a2302c3a4', -- EAZU ROLL STIX WAFER 80GM ORANGE SMART PACK
  '403464b7-e1e7-44f4-8abd-d58e326f11f2', -- EAZU ROLL STIX WAFER 80GM STRAWBERRY SMART PACK
  '1441d720-9cdb-4ca6-a83b-b214519abfce', -- ELIT MILO DARK CHOCOLATE BISCUITS CUP 125GM
  '63ad1ab1-447b-4ae1-9cfd-d5a4bbea20cc', -- ELIT MILO MILK CHOCOLATE BISCUITS CUP 125GM
  '22241867-4807-4dd4-99e8-4b60f241f08e', -- ETI CIN BISCUIT 53GM ORANGE JELLY 2+1 (OFFER PACK)
  '638f967a-8caa-4fdf-baf8-777d40d2c0f2', -- ETI KOMBO BISCUIT 100GM COCOA CREAM 2+1 (OFFER PACK)
  'd386b4bf-948a-4b56-b2cb-21d7580a1ae1', -- ETI WAFEUP WAFER 40GM 2+1 (OFFER PACK)
  'dad9166f-5d64-40d3-950f-e0f430af46ef', -- EURO BAKE DANISH BUTTER COOKIES 35GM
  '77c5167b-860f-46a1-a152-8b552918b1f5', -- FARM HOUSE CHOCOLATE CHIPS COOKIES HALF ROLL
  '4caa6840-750c-43bc-a4e9-0b1280d4549a', -- FARM HOUSE COCONUT CRUNCH COOKIES FAMILY
  '5e05115b-223b-499c-943a-79b12c86d504', -- FARM HOUSE COCONUT CRUNCH COOKIES HALF ROLL
  'dcba8db0-9de3-40a4-82de-25efa9341fa2', -- FOX COOKIES 175GM HALF COATED MILK CHOCOLATE
  '2163ebce-00fc-4bf1-aff0-33356ed5df7b', -- FOX COOKIES 175GM MILK CHOCOLATE
  '2aa6a02b-a3e0-41f2-8b03-dda1019100b8', -- FOX COOKIES 175GM TRIPLE CHOCOLATE
  '7a9c4d79-e685-44ba-aea5-3d445acfc03c', -- FOX COOKIES 175GM WHITE CHOCOLATE
  '779f1309-8ab0-41bd-a3e0-b93a1a3656f5', -- FULLO WAFER STICK CHOCOLATE 5S
  '5bc7fe9d-9a91-49ef-9a62-d6a2e38a4c17', -- FULLO WAFER STICK VANILLA MILK 5S
  'fd086ff0-3232-4821-a3fe-20374e17f2ea', -- GALA BISCUIT FAMILY PACK
  'c2e550c0-efd7-4f63-8992-4b333a646c7e', -- GALA BISCUIT TICKY PACK
  '328add45-a233-4e78-9969-0d8f231c8731', -- GLUCO BISCUIT TICKY PACK
  '6a64d4bc-a47e-448c-b498-168723414bab', -- GLUCO BISCUIT TICKY PACK 36S
  '78def005-abc8-447e-a0d0-86aa7502b55d', -- GOLDEN BREAK TREAT WAFER 135GM CAPPUCCINO
  'b8386002-6771-4a69-8642-aa9ecd701cdf', -- GOLDEN BREAK TREAT WAFER 135GM DARK CHOCOLATE
  '46af8e39-5f3d-40fe-ab93-8c1bb2c042f6', -- GOLDEN BREAK TREAT WAFER 135GM HAZELNUT
  'ae555a1a-71f0-45a9-b86a-563428eb76a6', -- GOLDEN BREAK TREAT WAFER 135GM MIX
  '33d69fdc-3fd0-4727-9646-cde9ca7339f9', -- GOLDEN BREAK TREAT WAFER 135GM STRAWBERRY
  '2bb953a1-a9f4-4592-be19-185f8af1b18c', -- GOLDEN BREAK TREAT WAFER 135GM VANILLA
  'f3c3495b-b7b7-4e5a-becd-00ef182a9575', -- GULLON 170GM DIET FIBRA BISCUIT
  '7ae6e75e-11e8-4229-ba57-c75d579ef65f', -- GULLON 220GM DIBUS MAGIC BISCUITS
  '84516262-6628-4432-8fc4-88abce17d229', -- INOVATIVE DIGESTIVE BISCUITS 270GM ORIGINAL
  '1b3ac604-b6d2-4fc9-8696-47b964c4ca9c', -- INOVATIVE DIGESTIVE BISCUITS 270GM SUGAR FREE
  'd6ed7bfb-fa69-40d0-9e3b-5aac444b011a', -- INOVATIVE FABULOUS CHOCOLATE CHIP COOKIES 156GM
  '009049ba-169b-4a49-b0e3-d4b899a453e0', -- INOVATIVE FRISKY WAFER ROLLS 86.4GM CHOCOLATE
  '0bc07593-37b9-4ea7-b852-c0d49fe165f4', -- INOVATIVE FRISKY WAFER ROLLS 86.4GM HAZELNUT
  '73893e00-586c-4084-b031-8fa17eac68a4', -- INOVATIVE FRISKY WAFER ROLLS 86.4GM MILK
  '6340a658-dddd-4899-ae42-36d44b53e37c', -- INOVATIVE FRISKY WAFERS 68GM CHOCOLATE CREAM
  '8698b92a-29b5-40fc-b7ab-3e68e7c5ac74', -- INOVATIVE FRISKY WAFERS 68GM ORANGE CREAM
  '527b39d6-8845-470d-84ed-4436047026fd', -- INOVATIVE FRISKY WAFERS 68GM STRAWBERRY CREAM
  'c8f88841-77b8-4111-8f8f-c77df9d95ca0', -- INOVATIVE FRISKY WAFERS 68GM VANILLA CREAM
  '901d460a-aaa5-4549-919a-79d3132856cc', -- INOVATIVE GOLDEN LOTUS BISCUITS 96GM
  '459b2623-5160-42e5-9f71-da92fcbe68a2', -- INOVATIVE HAVEN COOKIES 132GM CHOCOLATE
  '6ca6b400-c083-498f-912c-f7d4186bfcc7', -- INOVATIVE HAVEN COOKIES 132GM COFFEE
  '73bbbdbb-a007-4e0e-ad70-f543e1548903', -- INOVATIVE PREMIUM BISCUITS JOY PACK
  'ba9c5bfa-14ab-4a7b-9332-5cf7b0659b84', -- ITALIANO COOKIE MIX 460GM CHOCOLATE CHIP
  '7b336c20-a79a-4e2d-a425-2d87adec2245', -- JAM HEARTS BISCUITS TICKY PACK CHOCOLATE
  'eb2a35c4-7bff-4a80-86d1-f787d18df0c3', -- JAM HEARTS BISCUITS TICKY PACK LEMON
  'f3c77156-d491-45e0-a934-d5bc33bbde15', -- JAM HEARTS BISCUITS TICKY PACK STRAWBERRY&VANILA
  '67a7bc3f-75d9-4995-a299-4de4ff33ee3e', -- JAM HEARTS BISCUITS TICKY PACK VANILLA
  'd393ea07-d1d3-46fe-bd1e-9a39224cf62a', -- JAZAA ASSORTED COOKIES 240GM BOX
  'dae213be-8ebb-460e-a8ce-3e30ec441f59', -- JAZAA COOKIES 240GM CLASSIC CHOCOLATE
  '287696db-967a-4dd3-a8d0-aa1d66954ce9', -- JAZAA COOKIES 240GM CUMIN DELIGHT
  '47e6fffc-2d9b-471a-aeab-ddb8e2fb0853', -- JAZAA COOKIES 240GM STRAWBERRY JAM
  '2df36b7e-0088-4a82-a142-9b3cecd0ef13', -- JOJO WAFER 40GM BANANA
  '3a32a6f7-fbac-4e03-88a6-962c6db6ba74', -- JOJO WAFER 40GM ORANGE
  'b5cf65d0-4755-49d8-910d-dd84fa08a243', -- JOJO WAFER 40GM STRAWBERRY
  'eba89816-675d-4a2a-8f52-286abe74f30c', -- K ROGERS COOKIES 105GM SUGAR FREE
  '31804bdd-29f3-4c43-8663-cc314a3f3cf5', -- KAERS COOKIES 100GM SUGAR FREE
  '65bbcdf4-81a4-44ac-9d80-4db5cc7c999e', -- KERNALPOP WAFER ROLLS 80GM CHOCO BANANA
  'b39e25f1-39bd-43ec-afd6-4d319fdc1ef0', -- KERNALPOP WAFER ROLLS 80GM HAZELNUT
  '87be760d-f838-497a-8470-538e4a5ba1d6', -- KERNALPOP WAFER ROLLS 80GM STRAWBERRY
  'da990472-93eb-407d-bec4-e6708ddaf6e1', -- KINDER CARDS BISCUIT 128GM 5PCS
  'fb2a3fc6-8d2b-4c47-b8d6-67059e63fd90', -- KINDER HAPPY HIPPO CHOCOLATE BISCUIT BOX 103.5GM
  'd38beb93-f652-47ff-9e9f-80f883744f00', -- KOKOLA MAJORICA WAFER ROLL 120GM CAPPUCCINO
  '9908576d-b5d3-4d95-897b-08bb3900f44f', -- KOKOLA MAJORICA WAFER ROLL 120GM CHOCOLATE
  'd2cb85af-2312-446b-9a71-6ab160fc8d07', -- KOKOLA MAJORICA WAFER ROLL 120GM STRAWBERRY YOGURT
  '6290d132-c434-4770-befb-0f6ed89ae7b6', -- KOKOLA MAJORICA WAFER ROLL 120GM WHITE CHOCOLATE
  '019acbac-f98b-4c6a-a01a-1c88d2b339c4', -- KRAVING MUNCH&KRUNCH WAFERS 150GM CHOCOLATE
  '63743a72-6825-41c5-af67-41d4c40e0dce', -- KRAVING MUNCH&KRUNCH WAFERS 150GM HAZELNUT
  '7b0eff89-d3b6-474d-880c-705d41a6b714', -- KRAVING MUNCH&KRUNCH WAFERS 150GM ORANGE
  '65330889-08a0-4215-a514-30c69b1000c4', -- KRAVING MUNCH&KRUNCH WAFERS 150GM STRAWBERRY
  '602f70fc-fede-4e84-8d1b-c39880c13156', -- KRAVING MUNCH&KRUNCH WAFERS 150GM VANILLA
  '4bc3ddef-e60d-4f11-8617-cbfa5d98add7', -- KRAVING MUNCH&KRUNCH WAFERS 75GM CHOCOLATE
  'd4a54a7f-bc61-4df1-b919-c7e4178c628a', -- KRAVING MUNCH&KRUNCH WAFERS 75GM HAZELNUT
  '8870b9a5-7c24-4db1-9e00-031be1633d42', -- KRAVING MUNCH&KRUNCH WAFERS 75GM ORANGE
  'b2a0ef2a-2153-4a11-99bb-353797f50f52', -- KRAVING MUNCH&KRUNCH WAFERS 75GM STRAWBERRY
  '645cd42a-2b8c-4a88-b1bc-edada05944ca', -- KRAVING MUNCH&KRUNCH WAFERS 75GM VANILLA
  'a38a0bfa-2a15-460a-847e-3faccb40e507', -- KRUNCHEES BISCUIT 100GM GLUCOSE
  'c984644f-442e-4173-92cc-7e51a5a5c787', -- KRUNCHEES BISCUIT 100GM NICE
  '16dd3ad3-3f8b-42a0-a110-056cf6f82506', -- KRUNCHEES BISCUIT 120GM MILK
  '15924379-e97d-438e-a2a3-516cf7bafd9e', -- KRUNCHEES BUTTER COOKIES 40GM
  '6c3e9c26-f857-4d91-8f2c-dae7f7bdd1c0', -- KRUNCHEES CHIPS MIX THINS COOKIES 100GM CHOCOLATE CHIP
  '43abb55c-b0ca-407e-a095-b93b3cc68037', -- KRUNCHEES CHIPS MIX THINS COOKIES 100GM CHOCOLATE CHIP & BUTTER
  'f2b571e4-15f7-49fe-a58e-b99d01c572f5', -- KRUNCHEES CHIPS MIX THINS COOKIES 100GM CHOCOLATE CHIP & PISTACHIO
  '4ceb5eab-18ba-4a18-86eb-fe4e30433359', -- KRUNCHEES CREAM BISCUIT 100GM CHOCOLATE
  '0bc2cb3d-57dc-4596-970b-6a59c8b71dd1', -- KRUNCHEES CREAM BISCUIT 100GM LEMON
  '47b50506-03e9-44ac-a21f-01fd076eb0f1', -- KRUNCHEES CREAM BISCUIT 100GM ORANGE
  '377f8e46-6cf4-45fe-9d42-80e6f0701257', -- KRUNCHEES CREAM BISCUIT 100GM STRAWBERRY
  '3f195ba5-28f7-46f4-9cba-dffa456cd4f4', -- KRUNCHEES CREAM BISCUIT 100GM VANILLA
  'e8467601-52fb-49dd-9aff-407a641e8d06', -- KRUNCHEES DIGESTIVE BISCUIT 150GM LIGHT
  'b34e62d4-0a52-4970-b76e-b21b27df5cce', -- KRUNCHEES DIGESTIVE THINS BISCUIT 100GM CAPPUCCINO
  '32e72420-3865-4ce5-a7fe-6794b77810e4', -- KRUNCHEES HAPPY DAY BISCUIT 100GM ALMOND BITES
  '0e1ea50c-89e7-4ffd-b44b-b166ae2f5b2b', -- KRUNCHEES HAPPY DAY BISCUIT 100GM BUTTER BITES
  '84257eab-e910-43ab-ba34-26974be2eb15', -- KRUNCHEES HAPPY DAY BISCUIT 100GM CASHEW BITES
  '53b26ef8-82f0-4189-889e-8938b7edc728', -- KRUNCHEES HAPPY DAY BISCUIT 100GM MIX NUTS BITES
  '41ff0ac9-880b-43eb-a3c7-d4ae5daed09f', -- KRUNCHEES SUGAR FREE BISCUIT 100GM APPLE
  '35c53cc1-eef5-481e-bc8d-72076f2e9ab6', -- KRUNCHEES SUGAR FREE BISCUIT 100GM CAPPUCCINO
  '565c9429-d83b-4a8f-919a-4bb402cff833', -- KRUNCHEES SUGAR FREE BISCUIT 100GM CHOCOLATE
  'c1a5ce5d-9855-4ce4-8502-898f7628a8a7', -- KRUNCHEES SUGAR FREE BISCUIT 100GM CRANBERRY
  '3895754b-57d3-401b-a158-348efa48ae49', -- KRUNCHEES SUGAR FREE BISCUIT 100GM LEMON
  '3cd72b01-5e85-44c8-8bbf-af933c2b85c5', -- KRUNCHEES SUGAR FREE BISCUIT 100GM ORANGE
  '7fbbb66e-bafa-4969-a26d-a9edd8051803', -- KRUNCHEES SUGAR FREE BISCUIT 100GM VANILLA
  'f80db5ad-6be3-4a43-946b-e35f53f99425', -- KRUNCHEES SUGAR FREE CREAM BISCUIT 140GM CHOCOLATE
  'd12fed5c-5239-4090-8c3a-a7d33d321296', -- KRUNCHEES SUGAR FREE CREAM BISCUIT 140GM LEMON
  'a694f6f5-ef40-4230-ba26-2191db15b864', -- LEMON SANDWICH BISCUIT MINI PACK
  'ef2d6c9d-9e9c-44aa-bb21-7428879aee41', -- LEMON SANDWICH BISCUIT TICKY PACK
  'c85306e6-2f91-4b1d-a626-832521c90d62', -- LOACKER QUADRATINI WAFER 125GM DARK CHOCOLATE
  '4216d20b-4e18-4ce5-821f-cf12fc5f7a03', -- LOACKER QUADRATINI WAFER 125GM DOUBLE CHOCOLATE
  'f3309459-105c-4935-aa07-3d1025c3258c', -- LOACKER QUADRATINI WAFER 125GM STRAWBERRY
  'cbaadbcc-96ae-4d83-9c1f-0ec5ebca88f6', -- LOACKER QUADRATINI WAFER 125GM VANILLA
  '0925b355-c6cc-4114-b7f1-cc5278294f19', -- LOACKER QUADRATINI WAFER 250GM CHOCOLATE
  'c489a3ae-6976-42ec-a160-af71d3511ee7', -- LOACKER QUADRATINI WAFER 250GM DARK CHOCOLATE
  'f5cd0f74-1110-4cce-aa8f-8ddc9ba14cc1', -- LOACKER QUADRATINI WAFER 250GM NAPOLITANER
  'ad1e9059-e55a-433d-a70f-795001d627e1', -- LOACKER QUADRATINI WAFER 250GM VANILLA
  '3f95c12b-477d-4130-877c-3f462f376513', -- LOACKER WAFER 175GM CREMKAKAO
  '1019ef35-8d90-45d9-8189-eb8bd6116ff2', -- LOACKER WAFER 175GM NAPOLITANER
  '780c0851-190f-4671-a974-ff4ba4c12c2b', -- LOACKER WAFER 175GM VANILLE
  '15b82ba4-187e-40be-b25a-c50e626b08e5', -- LOACKER WAFER 45GM ALPINE MILK
  '0a95bce2-1e0c-4c90-95df-a0b8d2e37b6f', -- LOACKER WAFER 45GM CREMKAKAO
  '8c6d6e1f-d594-4ad1-bf6a-3a3511baad5e', -- LOACKER WAFER 45GM NAPOLITANER
  'ae3c03f4-dc30-4853-8dad-89472b4e877a', -- LOACKER WAFER 45GM STRAWBERRY
  '5c946150-829b-4677-aae7-7db909670daf', -- LOACKER WAFER 45GM VANILLE
  'f70c6c13-a070-4d5f-8b73-aa0b740cceb1', -- LONDON BISCUITS CREAM CRACKERS 300GM
  '9ef04bb2-cee8-4f8f-b3af-43208feb9307', -- LONDON BISCUITS DIGESTIVES 400GM
  'c5249609-2594-4948-919b-9ac5184c31f8', -- LONDON BISCUITS RICH TEA 300GM
  '6d971937-b150-4879-b1bb-b4e3027d334b', -- LONDON BRIDGE WAFER ROLL 370GM TIN
  'c54731d1-5b89-4044-8d22-ddaf4bb461e8', -- LONDON MILK CHOCOLATE CHUNK COOKIES 160GM CLASSIC
  '268cadfc-fc76-4590-bec0-93e09f43a595', -- LONDON MILK CHOCOLATE CHUNK COOKIES 160GM HALF COATED
  '87e4286a-23d3-45fe-b77c-a66d67b53c4d', -- LONDON MILK CHOCOLATE CHUNK COOKIES 160GM TRIPLE
  '474fa130-e780-47fb-90ed-dc8a3b937c43', -- LOTUS BISCOFF BISCUIT 124GM
  '566ce98d-8910-45e3-8049-4a1f52a76fc9', -- LOTUS BISCOFF BISCUIT 250GM
  'd52457f5-5606-443e-8045-913af4af5633', -- LOTUS BISCOFF BISCUIT 312.5GM
  'f07fcc48-5ea0-4f12-b4d5-961b5d246624', -- MALIBAN 170GM KRISCO SNACK CRACKER
  '3ca492ce-029c-4646-839b-5f97358dcc13', -- MALIBAN 190GM CREAM CRACKER
  '9a7ce1dc-6b42-483d-aee8-330b4f38aa16', -- MARIE BISCUIT FAMILY PACK
  '2b730dac-3012-4574-995c-56a7e031dfc0', -- MARIE BISCUIT TICKY PACK
  'de6b97d5-b9fb-4b74-9d3b-53072dfd8cc5', -- MARS CHOC BISCUIT 132GM
  'c38b9016-0280-4d3e-8060-db19d203bc6d', -- MAYORA COFFEE JOY BISCUIT 90GM
  '2a4af2fe-742e-4da2-bdf7-51dd8efe8bff', -- MCVITIES DIGESTIVE BISCUIT 250GM DARK CHOCOLATE
  '448963b4-8e19-4fe0-960d-ed392f3831ad', -- MCVITIES DIGESTIVE BISCUIT 400GM
  '9cd4ddb5-2798-47b3-b259-d21f879410b2', -- MCVITIES DIGESTIVE BISCUIT LIGHT 250GM BOX
  'd4f0b951-a2e7-4bbf-ad36-28ac86ff6967', -- MILCOLU DOUBLE MILK SANDWICH BISCUIT TICKY PACK
  'cf548669-4589-4786-892d-3ca78a33bd13', -- MILO BISCUIT MILK 104GM
  '83adc2d9-ecf9-4910-890f-afaf65301558', -- MILO BISCUIT ORIGINAL 104GM
  '3c577dfd-d0d0-4928-8c91-dfcdfc617b4f', -- NABIL CREMORE BISCUITS 82GM CAPPUCCINO
  '51970db7-8f0a-491e-9043-e025af9fdb22', -- NABIL CREMORE BISCUITS 82GM CHOCOLATE
  '9297f4fe-0fec-46bf-8ff3-5149a859631d', -- NABIL CREMORE BISCUITS 82GM CUSTARD
  '1b0f545c-1b63-4838-b791-4c744c487914', -- NABIL CREMORE BISCUITS 82GM MANGO
  'e621126d-6f2a-4d9e-92aa-01c2eb3b4721', -- NABIL CREMORE BISCUITS 82GM ORANGE
  '081f7878-4383-441f-905c-cb593e8254c1', -- NOVITA BITES CHOCOLATE WAFERS 79.2GM POUCH
  'c3ed9246-76ac-4b91-b987-cc1569f093bd', -- NOVITA BITES ORANGE WAFERS 79.2GM POUCH
  'd068ea96-e34e-4930-8ca6-342893088fea', -- NOVITA BITES TUTTI FRUTTI WAFERS 79.2GM POUCH
  '199e13d0-bbe8-4fb1-8a05-9b2213b0341c', -- NUTELLA BISCUITS T12 166GM
  '8bb03232-a813-4a7f-aad0-4c3c3a7bba48', -- NUTRI GLUTEN FREE COOKIES 100GM APPLE&CINNAMON
  'caf105bc-9c5d-4b21-9695-1e901919689c', -- NUTRI GLUTEN FREE COOKIES 100GM CHOCOCHIP
  '2d97fe5a-3345-4e0c-97a8-c1ea37aaf4d8', -- NUTRI GLUTEN FREE COOKIES 100GM COCONUT
  '67baa978-9124-4aed-b9d9-937753498482', -- NUTRI GLUTEN FREE COOKIES 100GM DOUBLE CHOCOCHIP
  '5c21a6b5-99bd-4670-8eb8-112bc6e64137', -- NUTRI GLUTEN FREE COOKIES 100GM HONEY
  'acf5a896-126f-477f-9e00-b11e353edf0a', -- NUTRO WAFERS 150GM ORANGE
  '37b2f351-2324-40de-a2c3-8eb738f90116', -- NUTRO WAFERS 150GM STRAWBERRY
  'd7dc89d0-6404-475b-8fbc-9f2686f99a89', -- NUTRO WAFERS 150GM VANILLA
  '83f52845-59de-485c-8108-e07a39db6555', -- NUTRO WAFERS 75GM CHOCOLATE
  'b25b927e-1134-48f5-a021-e287dc9fc868', -- NUTRO WAFERS 75GM HAZELNUT
  '6e592633-a754-4eb4-ade6-5233619e1e80', -- NUTRO WAFERS 75GM ORANGE
  'aed0ddc4-1d11-43d8-8b44-723411e22651', -- OLO BISCUIT LEMON&GINGER TICKY PACK
  '499f2ec0-dc01-497d-a958-abd96e5d7558', -- OLO BISCUIT STRAWBERRY TICKY PACK
  '00270a09-299f-4b74-9245-ddef06306b85', -- OREO BISCUITS 2 BAR PACKS (OFFER PACK)
  'b3f7d658-c56e-4c99-ae50-0eede363aeb2', -- OREO BISCUITS FAMILY PACKS
  '000d748a-63b8-4396-87c7-59c6c5227ded', -- OREO COOKIES 110.4GM CHOCOLATE CREME
  '28009821-7d61-4141-8625-ba02ef1e0089', -- OREO COOKIES 110.4GM DARK&WHITE CHOCOLATE
  'b27f256f-947d-4eb4-9cef-27174ef8e17a', -- OREO COOKIES 110.4GM ORIGINAL
  'ca0f5b7e-c59f-42cb-a97f-c04d5f1ea5c1', -- OREO COOKIES 110.4GM STRAWBERRY CREME
  'ada8c463-b9b6-43dd-9878-48e4f2ed3025', -- OREO COOKIES 35.5GM GREEN CREAM
  'ee9c1bec-1a8d-45d3-a84a-c8da0f9648c0', -- OREO CRISPY COOKIES VANILLA TICKY PACK 30S
  '0bc0992d-9017-4c02-9065-f017a703a911', -- OREO DUTCH COCOA WAFER 117GM CHOCO VANILLA
  '764ea71e-0eaf-4f57-898c-b18200e72c46', -- OREO DUTCH COCOA WAFER 117GM DOUBLE CHOCO
  'b5face93-0184-478c-8e3d-e7dac4b787d6', -- OREO MINI COOKIES 61.3GM CHOCOLATE
  'c2737854-3849-4e30-a13a-0ab1e39cbc87', -- OREO MINI COOKIES 61.3GM ORIGINAL
  'f6ee0d53-238c-4392-bccd-ce135e322a77', -- OREO MINI COOKIES 61.3GM STRAWBERRY
  '0ee3bc51-07c6-4ee1-b5a6-2851e80d292b', -- OVALTINE CHOCO COOKIES BISCUITS 5PCS PACK
  '0f26ca66-9626-4d32-9040-de1669784407', -- OVALTINE CHOCO MALTY BITES WAFER 100GM POUCH
  '80225f0c-e5c1-414c-92e5-10c86e529b11', -- OVALTINE CHOCOLATE MALT COOKIES 120GM
  'a88ebcaa-b497-4e8e-ae82-6b9b623f969c', -- OVALTINE CHOCOLATE MALT COOKIES 40GM 3S
  '5131d6f9-d1f0-4b1b-bdbe-b4458d6086e7', -- OVALTINE CHOCOLATE MALT WAFER 133GM BOX
  'dc41d31e-f1fb-4167-a1d6-51934468b3df', -- PARTY BISCUIT FAMILY PACK
  '93f15341-7bcf-4bf0-b302-ea0b27f55d7d', -- PEANUT MAZA BISCUIT TICKY PACK
  'ee413cda-70af-4b35-9251-0aa284bfc6ba', -- PEANUT PIK BISCUIT FAMILY PACK
  '31f61b9b-a93a-4936-aad7-105d809650c2', -- PEANUT PIK BISCUIT TICKY PACK
  '69912f83-b136-4711-9e2c-d12d89be3452', -- PIPERS GOLD COOKIE CARAMEL DELIGHT FAMILY PACK
  'a23960d2-e253-4d07-a3f9-4c7bf372d671', -- PIPERS GOLD COOKIE CHOCOLATE CUP FAMILY PACK
  'd675b3e5-2d2c-4c47-b22e-f82a7e9329f9', -- PIPERS GOLD COOKIE CLASSIC SHORTBREAD FAMILY PACK
  '284be447-3b13-4f62-a4c2-a17af0b894b4', -- PIPERS GOLD COOKIE COCONUT CRUNCH FAMILY PACK
  'fa82ffc3-167a-469c-bac6-48c20a650db1', -- PIPERS GOLD COOKIE MOLTEN CHOCOLATE CHIP FAMILY PACK
  '82081483-a460-464f-94c6-7eaf6a59f413', -- PRINCE BISCUIT CHOCOLATE FAMILY PACK
  'f09054f8-28a1-4f5c-853b-08500d26f7e8', -- PRINCE BISCUIT CHOCOLATE JUNIOR TICKY PACK
  'ec23a249-6235-49c4-a366-92eb74445c5a', -- PRINCE BISCUIT CHOCOLATE TICKY PACK
  'c767339b-6cac-4b32-a68d-2c3e87d1c32a', -- RANA CHOCOLATE TRIANGULAR WAFER 18GM
  'b56207ad-4923-4157-8b98-aac053900015', -- RIO DOUBLE CHOCOLATE BISCUIT TICKY PACK
  '7233fb2b-6c4d-4531-adca-577c2e7ba2a0', -- RIO OBO MAGIC BISCUIT TICKY PACK 24S
  'f5af2f9f-9aa5-4c4e-a052-70c786d7157e', -- RIO STRAWBERRY&VANILLA BISCUIT FAMILY PACK
  '7629e1e2-cd5f-42ca-882d-a9a307e4ea62', -- RIO STRAWBERRY&VANILLA BISCUIT TICKY PACK
  '88e6a0b7-ffdc-4699-8854-aa7547905801', -- RITE BISCUITS CHOCOLATE FAMILY PACK
  '52189d7e-f66f-489a-9625-fdfe79e2fac3', -- RITE BISCUITS CHOCOLATE TICKY PACK
  '6d28a5e4-7824-4959-97e5-d4e192af46f6', -- RITE BISCUITS CHOCOLATE WITH VANILLA CREAM TICKY PACK
  'a930dc5f-7b91-4ac3-8d61-83c027033310', -- RITZ BISCUIT 118GM SANDWICH CRACKERS
  'abb12cc6-d016-4888-a961-018f441cfdf0', -- SALTISH BISCUIT FAMILY PACK
  '2b7f9ce5-5092-4588-8e24-7f2e32badf59', -- SOOPER BISCUIT ELAICHI TICKY PACK
  'b13e0cab-86f6-4053-8bd7-5e952fd80678', -- SOOPER BISCUIT FAMILY PACK
  'a49b11a9-3e75-491b-95c0-10996620d211', -- SOOPER BISCUIT FAMILY PACK CHOCOLATE
  '7c5a6ea4-182c-4a65-ba76-caff65bf7985', -- SOOPER BISCUIT HALF ROLL (TWIN PACK)
  'f46ecdc8-ab09-4eda-8953-1146e0908bd1', -- SOOPER BISCUIT TICKY PACK
  'dbdebd82-f70d-457f-8fbf-cd1ae266f041', -- SOOPER BISCUIT TICKY PACK 36S
  '1e75b27d-36ff-4136-9848-34c9d859e5ef', -- SOOPER BISCUIT TICKY PACK CHOCOLATE
  '5999069a-47bb-4f72-b7ff-04433dbb2c11', -- SWEET LIFE YAN YAM CHOCOLATE DIP BISCUIT 40GM
  '38d94c36-12e4-49fc-b819-d57c85a5e3bd', -- SWEET LIFE YAN YAM STRAWBERRY DIP BISCUIT 40GM
  '1a3985fd-4559-4dde-a9ea-571efe91d985', -- SWEET LIFE YAN YAM VANILLA DIP BISCUIT 40GM
  'ffc57af2-db31-4260-8715-817fb02306e6', -- SYED DIET CHOCO BISCUITS 100GM
  'bf17fe70-e65c-493e-a6ac-c79d58b10553', -- SYED DIET CHOCO CHIP COOKIES 100GM
  '8574c7ce-8a23-413f-a475-fb38ac19852d', -- SYED DIET COFFO BISCUITS 100GM
  '35697810-86b6-467a-af8a-a71c9a042408', -- SYED DIET CREAMER BISCUITS 100GM CHOCO
  '7f0891dc-f57f-4115-94c5-c5a3d9854421', -- SYED DIET CREAMER BISCUITS 100GM LEMON
  '14c63243-c134-40f3-b91b-16cf555d9e14', -- SYED DIET CREAMER BISCUITS 100GM STRAWBERRY
  '63d90292-ab2c-43d2-b108-92c8dc999c8b', -- SYED DIET MULTIGRAIN BISCUITS 200GM
  'c6ebb9b8-4196-4eaf-bc75-7034c73ebcc8', -- SYED DIET SALTISH BISCUITS 100GM
  'a2bf12d6-3eb5-4d6b-a44e-76848bfd864d', -- TIFFANY BOURBON BISCUIT 200GM
  '0811bd7e-81b5-4719-888a-80225d33b39c', -- TIFFANY BREAK RIZZO CRUNCHY WAFER CHOCOLATE 17GM
  '6a510783-13a4-40d6-99ae-811797a2eeac', -- TIFFANY CHUNKOS CHOCO CHIP COOKIES 40GM
  'a19cdb55-38e5-4458-a632-8d00031bd996', -- TIFFANY CREAM BISCUITS 80GM VANILLA
  '66ce74d4-c2e0-476e-b8e3-4a1ebb7e4758', -- TIFFANY CREAM BISCUITS 84GM CHOCOLATE
  '0e051267-0283-4846-83cb-f0007f2f34d8', -- TIFFANY CREAM BISCUITS 84GM COCONUT
  'd6d91e74-92cf-4c5a-a3d9-16bc982e2e74', -- TIFFANY CREAM BISCUITS 84GM MANGO
  '9bd937b1-1ce1-4ad0-9807-9d375943dffb', -- TIFFANY CREAM BISCUITS 84GM ORANGE
  '378335ea-39ce-4c5a-8432-32e773e9fcdd', -- TIFFANY CREAM BISCUITS 84GM STRAWBERRY
  '3b047e6f-f22f-4dbd-9e24-1553e58d780a', -- TIFFANY DELIGHT BUTTER COOKIES 405GM TIN
  '13eaa02d-aea8-4174-af8e-ee6e96fbc9c1', -- TIFFANY DELIGHT BUTTER COOKIES 40GM
  '408863ed-432b-40e7-93ff-e2daaee8de91', -- TIFFANY DELIGHT BUTTER COOKIES 80GM
  'fb5b96ac-565b-4488-a36a-3b83906f8428', -- TIFFANY DELIGHT BUTTER COOKIES 810GM TIN
  '1c1aca93-7627-4eb6-8b3a-a1920492e46f', -- TIFFANY DELIGHT CHOCOCHIP BISCUIT 100GM
  '9a28b2f9-9ff9-4f52-af55-f6ce39c6d3b7', -- TIFFANY DIGESTIVE LIGHT BISCUIT 250GM
  'fce01d45-54fc-48b1-8913-eb859b7f1f46', -- TIFFANY DIGESTIVE LIGHT BISCUIT 400GM
  '102eaad8-8a92-4742-aff1-28bbcb17f39e', -- TIFFANY DIGESTIVE SUGARFREE BISCUITS 225GM NATURAL
  '10f1dda5-0067-4913-be13-b1eafd4d44eb', -- TIFFANY DIGESTIVE SUGARFREE BISCUITS 350GM NATURAL
  '0ae2345f-a810-4ff1-b574-8e76fe7996ae', -- TIFFANY DIGESTIVE WHEAT BISCUIT 250GM
  '52b8b407-3e84-466c-813f-ad1552ba495d', -- TIFFANY DIGESTIVE WHEAT BISCUIT 400GM
  '7c35ce68-4410-4c98-8b6b-0e4e2ae65b8f', -- TIFFANY MARIE BISCUIT 200GM
  'c020b0f5-0714-4927-87af-41e8031bbaa1', -- TIFFANY MARIE BISCUIT 80GM
  '8c5869c8-89cf-45c9-a00f-034b7610c002', -- TIFFANY MONSTA COOKIES RAINBOW 32GM
  '4077c9fa-2ede-4728-a6c4-7a55cab8ece7', -- TIFFANY SUGAR FREE COOKIES CHOCOLATE CREAM 162GM
  '8897879e-4a55-4a36-8f4c-76cd05fa4333', -- TIFFANY SUGAR FREE COOKIES LEMON CREAM 162GM
  'd906a965-80e8-4a3e-add9-4b9db7b75d22', -- TIFFANY SUGAR FREE COOKIES OATMEAL 150GM
  '4bc442cf-21a1-4579-8535-e134dbd48ec9', -- TIFFANY SUGER FREE COOKIES ORANGE CREAM 162GM
  '96a9c8d3-728e-4cc1-8c6c-52287fd48787', -- TIFFANY WAFERS 135GM CHOCOLATE
  '5fa37bf2-5c24-41d0-8857-ae01adb9b2df', -- TIFFANY WAFERS 135GM HAZELNUT
  '20122471-cdca-48d7-8d70-fcbaaa27dfe7', -- TIFFANY WAFERS 135GM ORANGE
  'a2ca51a2-d36f-45ba-b6c3-16d89f7a3d37', -- TIFFANY WAFERS 135GM STRAWBERY
  '337033cc-d8eb-4f35-9d8f-9118fe3246ca', -- TIFFANY WAFERS 135GM VANILLA
  '2135447f-efd2-4c98-ab8f-b6cbe38f13f9', -- TIFFANY WAFERS 65GM CHOCOLATE
  'fae0282f-1453-45cb-8d35-52cfffdb6477', -- TIFFANY WAFERS 65GM HAZELNUT
  'f2cfd6cc-9ef5-4567-be07-29be59f9cc08', -- TIFFANY WAFERS 65GM ORANGE
  'bb64df2a-1bd9-40a3-9238-d59bb6ee28c4', -- TIFFANY WAFERS 65GM STRAWBERRY
  'b5526134-8a38-4257-8c1b-bb7c48afe0f3', -- TIFFANY WAFERS 65GM VANILLA
  '2ceb3a59-6653-4fa8-b6fe-3cb334ae08cf', -- TIGER BISCUIT ALPHA ATOZ TICKY PACK
  '3ca0a898-16d4-46c0-891d-7e5e91ceb771', -- TIGER BISCUIT MAX TICKY PACK
  '23790819-14bb-4126-a7cf-b118d55c7a21', -- TOREN NUSSO WAFERS 38GM HAZELNUT&CHOCO
  '1f90546e-85cd-4fd5-9c6d-d8667dbac357', -- TOREN TAMAM WAFERS 42GM DARK CHOCOLATE
  '240b655a-4f60-45fa-9599-d671acacfcfd', -- TOREN TAMAM WAFERS 42GM DOUBLE CHOCOLATE
  '338b815f-a75e-4504-b6a9-2812cf6df115', -- TOREN WAFERS 55GM BANANA
  'bbce7b8f-114d-404b-99c9-f15e18544f6a', -- TOREN WAFERS 55GM COCOA CREAM
  '3128c6ec-9c6a-4a2f-8ead-88ddf8bf1289', -- TOREN WAFERS 55GM CRUNCHY COCOA
  '3dabc79a-baf2-4879-809f-3e682d2c6f92', -- TOREN WAFERS 55GM EXTRA CREAM
  '03212f6d-3ba0-4bcd-b02f-927fa1036e34', -- TOREN WAFERS 55GM HAZELNUT
  '0b45aaf7-eed4-4f3f-ae14-8820e5e466c3', -- TOREN WAFERS 55GM MILK CREAM
  'a02ddb1c-ce35-41e7-863e-8e07c4c6843a', -- TOREN WAFERS 55GM ORANGE
  '0f139f69-1f04-475e-8af1-6efca9cf95d1', -- TOREN WAFERS 55GM STRAWBERRY
  'f481e4a5-3ddc-4975-8114-ee5b3c037bfa', -- TORKU FAVORIMO SANDWICH BISCUITS 244GM BANANA CREAM
  'ca9327d0-d3ad-4c54-a076-cf483e7a0441', -- TORKU FAVORIMO SANDWICH BISCUITS 244GM CHOCOLATE CREAM
  'e2eec627-25b2-4a6b-b95a-bc961ec5dc0b', -- TORKU KREMALI SANDWICH BISCUITS 244GM HAZELNUT CREAM
  '3a4fff71-f695-4cbc-9afb-95e7e50f3a1d', -- TORKU KREMALI SANDWICH BISCUITS 244GM PLAIN CREAM
  '8a796daf-39c1-46af-8f12-a31f38f678b2', -- TORKU TAM BISCUITS 393GM WHOLE WHEAT
  '6c0bf44e-0c07-4e90-9b37-a2f26b0d39b7', -- TORKU TAM KAKAOLU KREMALIM BISCUITS 249GM COCOA CREAM
  'c15b6dc3-7f72-4a0d-8fd6-2fff9ac9300b', -- TORKU TAM RUSEYMLI BISCUITS 252GM WHEAT&CHOCOLATE
  '226883bc-f0b4-4400-9b05-a2b474f0a1dc', -- TORKU TAM RUSEYMLI BISCUITS 252GM WHEAT/CHOCOLATE&FOREST FRUIT
  '42b1dc85-b079-41ad-a022-3a1cc0e745c7', -- TORKU TAM SUTLU KREMALIM BISCUITS 249GM MILK CREAM
  '3f824aab-d26f-496f-88c6-b6610a90e4ed', -- TORKU TURTACIK BISCUITS WITH ORANGE JELLY 306GM
  'fffa8674-0d6b-4d09-a8dc-a87490e95289', -- TRACK CRISPY WAFERS 150GM CHOCOLATE
  'c67bc7c0-acb7-404f-b19f-bde13af6b1da', -- TRACK CRISPY WAFERS 150GM HAZELNUT
  '9d23c172-97de-4c0e-8763-0c39c7b83cd0', -- TRACK CRISPY WAFERS 150GM MILKY
  'bcdd1007-cb48-4267-8c90-ec426ba146a2', -- TRACK CRISPY WAFERS 150GM ORANGE
  '9678cd29-9e88-4f1f-a3b5-c73da3445cfd', -- TRACK CRISPY WAFERS 150GM STRAWBERRY
  'b66f9482-b5f5-4680-8e49-75a399a9152b', -- TRACK CRISPY WAFERS 150GM VANILLA
  '5340390d-67ed-42be-ba3a-feba0413c430', -- TRACK CRISPY WAFERS 75GM CHOCOLATE
  '63e6d0d5-9368-454a-85b2-850c45db48d5', -- TRACK CRISPY WAFERS 75GM HAZELNUT
  '2212414a-e44c-4d31-a564-4a1f107cea63', -- TRACK CRISPY WAFERS 75GM MILKY
  '4addfb88-f510-48bc-a31e-51aa570195c1', -- TRACK CRISPY WAFERS 75GM ORANGE
  '20a5e2b5-fdcf-4acf-b42e-baf350494d1f', -- TRACK CRISPY WAFERS 75GM STRAWBERRY
  'd6dec742-3b89-4c0d-aada-4355c3b48edc', -- TRACK CRISPY WAFERS 75GM VANILLA
  '0e636446-9d3b-4bf5-b8c1-a3a39fc6de65', -- TROPICANA SLIM COOKIES SUGAR FREE 100GM BOX CHIA SEEDS
  '10856f67-7fb2-4de4-806b-e5df3232cae1', -- TROPICANA SLIM COOKIES SUGAR FREE BOX 10S
  '21d82a19-690d-4ebb-9050-0548953284b9', -- TUC BISCUIT FAMILY PACK
  '86e191b5-3e70-4944-81af-b4b5d03d924f', -- TUC BISCUIT TICKY PACKS
  '57967767-3cbd-43f0-9af2-b0e1f0c6010b', -- TWIX WAFER ROLLS 22.5GM
  '4b397c93-70a2-4f42-a806-12f972bbf2cf', -- ULKER CHOCO SANDWICH BISCUIT 23.5GM
  '2b8dd3fe-8049-4e13-a3a6-5cbc59e973e5', -- ULKER DELUXE CHOCO NUTS WAFER 35GM PISTACHIO
  'f89c429f-64fa-454d-9734-122c16fca0e3', -- ULKER DELUXE CHOCO WAFERS 28GM DARK CHOCOLATE
  'b98e967f-b986-432f-a9a7-d6ae52d3f1fc', -- ULKER DELUXE CHOCO WAFERS 28GM HAZELNUT
  'e0cd8180-5a00-477e-b2fb-d0bd66be75c1', -- ULKER DELUXE CHOCO WAFERS 28GM MILK
  'a18290c3-bcbd-4ec5-b951-0b84f5a31bc5', -- ULKER DELUXE WAFER ROLLS 24GM HAZELNUT CREAM
  'e5998429-961f-4a42-9766-deaebcf41ae9', -- ULKER DELUXE WAFER ROLLS 24GM VANILLA CREAM
  '129c3b09-7303-409e-ba18-31a0b8633b6c', -- ULKER HALLEY CHOCOLATE COATED BISCUIT 26GM
  '12c0e088-fa20-46be-8d79-1924f35f3efd', -- ULKER HAYLAYF BISCUIT 64GM
  'c8999326-f208-4e4d-8624-c213bbee9d88', -- ULKER SESAME BISCUIT 58GM
  '896aa26b-e50f-4f8c-946e-1a5c0ccc614a', -- ULKER STICK CRACKERS 30GM SALTED
  '5e231cac-76e8-4c85-a20b-637fe7fdae1e', -- ULKER TEA BISCUITS 70GM
  'a76d77b2-19f0-4ff4-9ac6-7ba413f57bc5', -- WAFEROLL DELICIOUS WAFER STICKS 370GM TIN
  'a857be99-40fa-4ad9-8eba-4551c6c2cd41', -- WHEATABLE BISCUIT FAMILY PACK
  '5e6544da-535d-4f13-8b2c-70b3012878c5', -- WHEATABLE BISCUIT FAMILY PACK SUGAR FREE
  '2c4c6c09-676c-4b99-ad8e-30cacca21ca1', -- WHEATABLE BISCUIT TICKY PACK
  'b6091271-c355-4c4a-a52a-0a94a9aecb9a', -- WHEATABLE BISCUIT TICKY PACK SUGAR FREE
  '5fd6e549-4f6d-498e-8c74-36568b3a2f02', -- WHISTLEZ BISCUIT SUJI TICKY PACK 36S
  '55de4864-d523-4350-b2ec-8d84b87fb451', -- WHISTLEZ BISCUIT WIZ TICKY PACK 36S
  '1ae91240-345b-4bd8-af9b-16aa200d5ed4', -- WHITE CASTLE BUTTER COOKIES 454GM TIN
  '8016ad1d-fa87-44e1-8091-c78c677f5425', -- WHITE CASTLE WAFER STICK 300GM CHOCOLATE HAZELNUT TIN
  '806472d5-8947-4286-b77d-a51dac095974', -- WHITE CASTLE WAFER STICK 300GM COOKIES & CREAM TIN
  '4d539313-2a4b-477d-b9ca-c2bf15d04b9f', -- WHITE CASTLE WAFER STICK 300GM STRAWBERRY TIN
  '24ea3eb4-a1cf-4e92-8ffe-001bf76be528', -- WHITE CASTLE WAFER STICK 300GM VANILLA TIN
  'f32d625d-d846-4d78-8f75-9b6316d83d26', -- WHOLE WHEAT PURE FIBRE SLICES BISCUIT FAMILY PACK
  '1cd335dc-37ae-492d-9117-644db872e119', -- WHOLE WHEAT SLICE BISCUIT SUGAR FREE FAMILY PACK
  'c0dd417a-caef-4918-9a80-1dc2d1295e62', -- YAN YAN CHOCO HAZELNET BISCUIT 44GM
  'd76008d2-da20-4b94-ad0a-7a11e8a89805', -- YAN YAN CHOCOLATE BISCUIT SNACK 50GM
  'de4c4b21-c2cc-492b-97de-4881a85f2e9f', -- YAN YAN STRAWBERRY BISCUITS 50GM
  '411ae399-da03-4336-ac5f-e42131705e8c', -- YAN YAN VANILA BISCUITS SNACK 44GM
  '5385c0b9-c8f2-4437-84c7-6b84afe2f076', -- YAN YAN YOGHURT BISCUITS 44GM
  'b878973b-d08e-433e-9eca-85ec29b8d65c', -- YUMAZING BISCUIT COCONUT&PINEAPPLE 24S TICKY PACK
  '077b75d5-a003-4af6-ba63-967845b5c393', -- YUMAZING BISCUIT MILK&HONEY 24S TICKY PACK
  '8d6d8199-4793-411f-956c-dd8f4af96a43', -- YUPPIE BISCUIT LEMON TICKY PACK 30S
  '36d9cad4-0885-4bb1-a92c-487667ec99f2', -- YUPPIE BISCUIT PINEAPPLE TICKY PACK 30S
  '156fc020-e262-47cb-81c1-34865f1752c4', -- YUPPIE BISCUIT STRAWBERRY TICKY PACK 30S
  '70e1a256-71f8-4303-a5ea-b029b83958d9', -- ZEERA PLUS BISCUIT FAMILY PACK
  '82a8d5ef-0daa-4aa1-9e7e-cd948112a8d3'); -- ZEERA PLUS BISCUIT TICKY PACK

-- → sugar
UPDATE spendless.catalog_products SET item_type = 'sugar', category = 'pantry'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  'e3b1ff66-8d22-4596-9c0d-7dc21b346564', -- Chase Up Sugar 1Kg
  '1d762ea8-afbb-4582-af17-230b79b879f7', -- Chase Up Sugar 5Kg
  'b09166f6-1a13-4d79-a89b-48617bcd17e2', -- Chashnik Extra Bold Grain Sugar 2Kg
  'dbb47d41-d30e-4614-a40c-c2e0d4d7c237', -- Chashnik Extra Bold Grain Sugar 5Kg
  '089954fc-de47-4ce6-9f26-0e0cecd85c58', -- Chashnik Sugar 1 Kg
  '790a82e6-fdfb-464d-a533-977dea955990', -- CHASHNIK WHITE SUGAR 100S SACHET BOX
  '0a8e646e-678c-4faa-8918-d376e114f3fd', -- CHASHNIK WHITE SUGAR 100S SACHET POUCH
  '63fb19c3-2cbc-4bb2-8d29-58b86eb84a8e', -- Chashnik Wite Refined Sugar 100 Sachets
  'd0dce173-9159-429b-a617-5640c068b074', -- Chasnik White Refined Sugar 100 Sachets
  'a8949a61-8b94-44dd-b3bc-dad62efb0f68', -- DESSERT LUKZ CASTER SUGAR 300GM
  '2e6f8940-6b0d-42da-be59-84f93b8a67d6', -- Faran Sugar 1 Kg
  '9bc132cb-bb62-406b-afa9-1e5cf4419bdf', -- Italiano Cuisine Caster Sugar 300g
  'a3577ebc-3cee-44b6-a2cf-0f51e66ced0a', -- Italiano Cuisine Icing Sugar 300g
  '74ea9ad9-cf84-4049-a301-5c48d88e6f58', -- Italiano Cuisine Jaggery Sugar 300g
  '4af99458-f073-4872-bfcf-384b03dc1e12', -- Mehran Sugar Mills Chashnik Bowrn Sugar 500g
  'fc324f1f-6af7-433d-81fa-c6fcdfd037bb', -- Mehran Sugaries Granulated Brown Pure Cane Sugar 1 Kg
  '2fb17991-e021-4655-8e6d-358c60b8def9', -- Mehran Sugaries Powdered Brown Pure Cane Sugar 1Kg
  '06b34cab-8773-441d-9568-13c5e5f7ad3c', -- Mother Choice Extra Fine Caster Sugar 300g
  '932ba1e8-0a92-4d7c-8800-eee845cc38f0', -- Mother Choice Super Fine Icing Sugar 300g
  '9a46c9a2-e7e1-4787-88d3-97f0c4089128', -- NATURES HUG SUGAR 200GM COCONUT
  'fca73355-6730-466f-b331-8012bcad3e0c', -- Spar Sugar - 2kg
  '054f8b33-55a4-4404-8354-d6b84f5de630', -- Spar Sugar 1Kg
  '5d3e4c45-d582-4c5d-acf0-26877fe47a78', -- Spar Sugar 5 Kg
  'feaa5acc-04de-4686-90f8-9177a6529c48', -- Spar Sugar 5Kg
  '2db95d2e-8b30-4482-bbb9-8dd4dad50a17', -- Sucral Zero Calorie Drops Sugar Substitute 5ml
  'd94f4cc3-28c1-4ef3-9f3c-6711ddbd4b4f', -- Sucral Zero Calorie Ideal For Cooking & Baking Tastes Like Sugar 100g
  '032c023d-c29e-420e-bd50-27a1d54a4c17', -- Sucral Zero Calorie Sugar Substitute 100 Tablets
  'd3b97cee-23ff-4b27-9abd-2eab67fb0a6a', -- Sucral Zero Calorie Sugar Substitute 200 Tablets
  'bee6c4fa-3e08-4f6c-a357-196dce07ee14', -- Sugari Powdered Brown Pure Cane Sugar 300g
  '5f4db887-7931-4592-bc2d-10c6a1899dcc', -- SUGARIE CASTER SUGAR 300GM
  '5ec05a71-8fc6-4196-bf5b-27af8c44f441', -- Sugarie Granulated Brown Pure Cane Sugar 100 Sachet
  'b6dfa4ed-4337-470e-bcb9-2e92c3a3efd9', -- Sugarie Granulated Brown Pure Cane Sugar 500g
  '4409318a-aa01-4ea9-a0ec-a132791d4b8e', -- Sugarie Granulated Sugar Pouch500Gm
  '8e44a874-a336-4207-ae43-705e96c626de', -- SUGARIE ICING SUGAR 300GM
  '0b4122c9-c0bd-44bc-a732-7ee856224927', -- Sugarie Powdered Brown Pure Cane Sugar 500g
  'eddeb8ec-9554-4f4c-86c5-6f216ab4484f', -- Sugarie Pure Cane Icing Sugar 300g
  'bbbab904-20c2-44bb-b0fe-1784208801d2'); -- Super Fine Mother Choice Confectioners Sugar Icing Sugar 900g

-- → chicken
UPDATE spendless.catalog_products SET item_type = 'chicken', category = 'meat'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '4b6bcebd-956b-4fcc-9470-9d8cd21a0553', -- Big Bird Budget Pack Chicken Rings 900Gm
  '91b541a9-ebed-4d69-8a19-2e527ac2644d', -- Big Bird Cheesy Chicken Croquettes 220Gm
  '33e798f3-d61c-4060-9acf-521c934ef8b0', -- Big Bird Chicken Bbq Tikka 480Gm
  '7c988c27-78e9-4b36-be2a-a8f79064bea9', -- Big Bird Chicken Chips 230Gm
  '2c5b014c-f339-472e-8acf-d22fb1519055', -- Big Bird Chicken Jalapeno 1250Gm
  '58ebdba4-24a2-4bae-996d-8522516b2e58', -- Big Bird Crunchy Chicken Drumstick L&H 1100Gm
  '18d411a1-407b-4cf4-abc2-7a771c1df3d8', -- Big Bird Juicy Chicken Tender 648Gm
  '71a95923-1500-48f3-af6b-7b4f653fe0f6', -- Big Bird Moroccan Chicken Wings 600Gm
  '13d4ccf9-6a9f-4fd3-87f9-aa686c94ed1d', -- K&Ns Chicken Burger Patties 1070Gm 16Pcs
  '5c1fb3ad-4592-4236-ba11-5ff9fc9773a5', -- K&Ns Fiery Chicken Fingers 780Gm
  'c8402208-208f-4016-81dc-32595d108147', -- K&Ns Thunder Chicken Fillet Economy Pack 550Gm
  '9dfc5eb2-0f5e-4b10-89ad-7ea1c2809df3', -- Menu Chicken Burger Patties 1075Gm
  'b8e9a893-97ed-4566-acc8-23518718500c', -- Menu Chicken Burger Patties Poly Bag 888Gm
  '00bf30aa-1c66-42d7-b9dd-ffe618256bae', -- Menu Chicken Croquettes Poly Bag 1Kg
  'fe979e15-8879-4f9c-bb2b-9a6e7845274d', -- Menu Chicken Hand Krafted Tenders 500Gm
  '9b045bff-227e-4960-9d22-fa8bd30ed107', -- Menu Chicken Popcorn 780Gm
  'd52bfe16-08f3-4c64-9c65-bdd79b0e4cb9', -- Menu Chicken Tulips 750Gm
  'f674371c-0d5f-4860-a6e3-25e9429be5ca', -- Mon Salwa Chicken Cheese Balls33Pcs
  '682acdbf-2726-40f3-851c-9f31a9d6c395', -- Mon Salwa Chicken French Fries425Gm
  '761519c9-9343-44bc-a0cc-6deea1b97782', -- Mon Salwa Chicken Seekh Kabab12Pcs
  '151a8838-a2e7-4f3b-a74f-3d0d1a03b89a', -- Mon Salwa Chicken Shami Kabab16Pcs
  '7d95bea9-9450-4639-a92f-0c2f710e39db', -- Mon Salwa Chicken Spring Roll20Pcs
  '0e65c02e-2cc3-4190-8f47-4997b8e10962', -- Mon Salwa Crispy Chicken Burger 18Pcs
  '87f07f8a-6472-4899-b8e6-fc65b0ca160b', -- Mon Salwa Crispy Chicken Burger Patties Poly Bag 990Gm
  '98c60639-95af-4289-a5a1-b4f08662a9ac', -- Mon Salwa Frankfurter Cheese Chicken Sausages
  '8b1c9377-66f1-4eae-bede-762d82b1f12c', -- Mon Salwa Juicy Chicken Burger9Pcs
  '63c1b0ab-7af4-4b22-9654-66b821b8d5f1', -- Mon Salwa Juicy Chicken Seekhkabab 18Pcs
  'a10f571c-ae14-4f7f-bdf5-a10fc6528ecd', -- Pk Chicken Burger 1Kg
  '63e52007-1e3b-4dff-966a-b6ab6a1e9239', -- Pk Chicken Fillet 900Gm
  'e4fdbd62-b2d2-4a31-a31b-b74b8fb0db18', -- Pk Chicken Popcorn
  'd919c1b2-02a2-433a-afce-e06508ebd1ab', -- Pk Chicken Popcorn 900Gm
  '868bb565-438d-4723-926e-de7f3ac95432', -- Pk Crispy Chicken Burger
  '6c746e3a-3058-4e97-9ac6-0e1337c2a158', -- Pk Crispy Chicken Burger 600Gm
  '13b3d783-c868-4d6e-a629-9925729445b8', -- Pk Crispy Chicken Burger 900Gm
  '6bb75f2a-1108-4966-9e84-8f555a1cb664', -- Pk Spring Chicken Fillet 900Gm
  '5bb24892-3f77-4660-a651-fc0431698c69'); -- Pk Spring Chicken Popcorn 900Gm

-- → chips
UPDATE spendless.catalog_products SET item_type = 'chips', category = 'snacks'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  'fa888d81-b609-4a6f-830a-3a60fe258b2c', -- ALADIN POTATO MUNCHIES 60GM CHEESE
  'd8fe346b-8294-4594-a55c-089440138e5a', -- ALADIN POTATO MUNCHIES 60GM KETCHUP
  '683e25a4-7aee-4e06-b450-f987e55b0f03', -- ALADIN POTATO MUNCHIES 60GM PIZZA
  'e613685c-008b-42cd-b0de-ee5f3b81fe6d', -- DLICIOUS PURE POTATO SNACKS 200GM
  '426d3338-3de7-4b79-a44b-a0d93bb4c452', -- FAIRCO POTATO STIX TIN 40GM FLAMIN HOT
  '7488b833-940d-4259-befb-9e5222807129', -- FAIRCO POTATO STIX TIN 40GM HOT PEPPER
  '41011ef8-df10-429c-856e-10f4aaa2711b', -- FAIRCO POTATO STIX TIN 40GM SALTED
  '19dc88a4-6356-433c-9380-ab909b9b054a', -- Kababjees Bakers Garlic Mayo Potato Slims 50Gm
  '25f77ca4-a71e-42de-998e-b7edd6c04ceb', -- Kababjees Bakers Paprika Potato Slims 50Gm
  '7fe61aa5-3db8-487b-9eef-55034abad8c7', -- SAFARI POTATO GRILLS 125GM CHEESE
  'a408d12f-52e5-43a2-b1d1-28776b3d176c', -- SAFARI POTATO GRILLS 125GM CHILLI
  'e3169752-9092-4399-9733-b02b9fe12c10', -- SAFARI POTATO GRILLS 125GM HOT & SWEET
  '492a713a-aebe-46dd-89f6-d95a0a8789ce', -- SAFARI POTATO GRILLS 125GM SALT
  'f376f806-b289-43f5-9443-4a6e39188ff3', -- SAFARI POTATO GRILLS 125GM SALT&VINEGAR
  '52bd1014-a3db-4008-9a93-22a1d598a4f5', -- SAFARI POTATO GRILLS 60GM CHEESE
  'bc562f6e-a0e9-4b01-87c0-a87a005e535b', -- SAFARI POTATO GRILLS 60GM CHILLI
  '6109fef8-5675-44af-acb8-f224ee1dd840', -- SAFARI POTATO GRILLS 60GM HOT & SWEET
  '2ade2749-1f4b-4601-87d3-c81d60dc08c6', -- SAFARI POTATO GRILLS 60GM PIZZA
  'a831438f-b3f4-4a5f-966e-13a24ad0eb6a', -- SAFARI POTATO GRILLS 60GM SOUR CREAM & ONION
  'efa107b9-3d60-43cf-9e71-a726c27a5bb1', -- Shahi Fry-O Potato Snacks Spicy 12g
  '2cc33faf-785d-4e9d-88eb-9c33bd004869', -- Shahi Fry-O Potato Snacks Sweet N' Sour 12g
  '536d2f65-2a55-4743-a209-ae4374d79d69'); -- UNITED KING POTATO SLIMS 45GM

-- → detergent
UPDATE spendless.catalog_products SET item_type = 'detergent', category = 'household'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '1be0e64d-bcee-44d9-9a49-c4fbb72df97e', -- Diamond Basic Detergent Powder 2KG
  '0843b518-657f-4ec7-86b8-1cce049b9398', -- Diamond Basic Detergent Powder 750gm
  'aeb4c800-7de8-466b-9baa-d6febf6f0ccc', -- Express Detergent 4.5kg
  'c7c78ad2-8ff5-4753-abc5-a7e971135c7d', -- Express Power detergent Bar 200G
  '2b229bcd-a06d-44dc-baa0-b33831e646a4', -- OXO Detergent Powder 500gm
  '91cc705a-1e23-4fa7-8131-8ab979f62cf0', -- Sufi Super Detergent Powder 105gm
  '6c08c760-a1ea-475d-a06c-c654ca971b5e', -- Sufi Super Liquid Detergent 2ltr
  'b29d4546-3f56-490c-95ee-7313f20d1fc1', -- Sufi Twin Detergent Powder 5kg
  '3d582233-9d5f-4448-be57-d2f60ad0ec86', -- Sunlight Detergent 190Gm Pink
  '2f6f5213-4d0d-4f24-a937-b6ad3ae17e35', -- Sunlight Detergent 1Kg Green
  '330289bf-13d6-4c46-80ac-1af1bf32dc9c', -- Sunlight Detergent 1Kg Pink
  'f751d7c5-5d6c-4f70-89d1-79755b469b4d', -- Sunlight Detergent 210Gm Green
  'bc886403-1f8a-4f6b-9f7e-d68695238a6f', -- Sunlight Detergent 770Gm Lemon&Rose
  '794c33a1-0402-4e9b-b437-7a8c8d032a8d', -- Sunlight Detergent 850Gm Green
  'baee6b60-2e78-40dd-b989-8132551df874', -- Sunlight Detergent 850Gm Pink
  '059caa8c-9eeb-481c-bef1-cf810d6f6f21', -- Surf Excel Detergent 2Kg
  '5adf986f-6aa5-4f7b-bff8-2d5c5fc014df'); -- Surf Excel Liquid Detergent 900ml bottle

-- → formula
UPDATE spendless.catalog_products SET item_type = 'formula', category = 'baby'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '9cbe042c-6798-478e-a15c-a851ae5e200a', -- Enfagrow A+ Nutrition Formula For Children Stage 3 for 1-3 Years Vanilla 800g
  '1ee82b84-7391-433d-a045-c22b7114afca', -- Enfagrow A+ Nutrition Formula For Children Stage 3 Vanilla 400g
  '35b04665-1281-4077-b35d-3891c67070b6', -- Enfamil Follow-Up-Formula 6-12 400g
  '518dfb59-7a69-4a28-a894-11194619c656', -- Meiji 2 FU Follow Up Formula 400g
  '5e54ae26-1998-4b89-b4b3-3739291d8d60', -- Meiji Fu Follow Up Formula 2 900g
  '0bd0c8b1-b550-4b05-9e72-8699c653e2b5', -- Meiji Pre Special Formula For Rapidly Growing Low Birth Weight Infants 400g
  '09902963-1384-4425-b871-2822b4fc4971', -- Morinaga BF grow Growing-Formula 3 Vanilla 900g
  'a81f36ca-4dbf-4d19-b353-fd3a17140d16', -- Morinaga BF-2 Follow Up Formula 6 to 12 Months 400g
  '9a07b6da-dce2-440e-bfba-24280b771ca6', -- Morinaga BF-2 Follow Up Formula 6 to 12 Months 900g
  '5cf567b0-9d77-438d-abbb-6278ef13d6b8', -- Morinaga BF-P Specialized Formula for Low Birth Weight Infant 400g
  '9f3b127a-bb50-4cec-8c8e-4719ac8840b1', -- Morinaga Nl-33 Lactose Free Formula 350g
  '1fe5ba1a-1030-487f-98db-5df1ca6c2359', -- Nestle NAN Optipro 2 Follow Up Formula From the 6th Month 400g
  'a8e8b7c3-de5c-473a-a9bc-5d5375919e92', -- Nestle NAN Optipro 2 Follow Up Formula From the 6th Month 400g
  '034026ca-8c49-454b-90ea-a55f5c17e436', -- Nestle Nan Optipro Formula 1 600g
  '8e3c3969-e6c6-4041-855f-f51da0e82be0'); -- Nutricia Cow & Gate Almirol Lactose Free Instant Formula From Birth Onwards 400g

-- → custard
UPDATE spendless.catalog_products SET item_type = 'custard', category = 'pantry'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '6ad3a625-8dc0-4161-b3e6-308ba2252fbc', -- Happy Home Custard 250Gm Banana
  '3686e335-6100-4d3c-bf4d-c7513fd23316', -- Happy Home Custard 250Gm Mango
  '89e0b4c9-2e7d-457a-bfd8-5cb4837daf6e', -- Happy Home Custard 250Gm Strawberry
  'b01996d1-ce33-4dd3-b955-6d5a654790b4', -- Happy Home Custard 250Gm Vanilla
  'b2e7db69-6db6-4456-adeb-70e80ce0cd48', -- National Banana Custard 120G
  '44531df9-bbb0-412d-9797-de8fba7d7d6d', -- National Mango Custard 120G
  '15af0134-a6ec-4d54-aa17-8b49a63868eb'); -- Rafhan Custard 275g Banana

-- → coffee
UPDATE spendless.catalog_products SET item_type = 'coffee', category = 'beverages'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '692e90d6-4376-4914-a9ad-9cd1db0ebcee', -- KOPIKO COFFEE LIQUID 240ML
  '6949130b-e225-441f-bf26-98ac4a40d69e', -- NESCAFE ICE COFFEE DRINK CAPPUCCINO 220ML TIN
  'f84c6670-248c-4579-8710-6a023f204620', -- NESCAFE ICE COFFEE DRINK CARAMEL MACCHIATO 220ML TIN
  '7e14d289-d29d-4153-838a-f65502a13408', -- NESCAFE ICE COFFEE DRINK ICE BLACK 220ML TIN
  'bafb6b4a-7914-43ef-ab62-a68bbdccc683'); -- NESCAFE ICE COFFEE DRINK LATTE 220ML TIN

-- → water
UPDATE spendless.catalog_products SET item_type = 'water', category = 'beverages'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '99d2b4dc-469a-4e4e-ae28-93b0c560e800', -- Britvic Tonic Water 300ml
  '6a5ea09a-ad1b-4bcf-97a2-c0bf42a32fac', -- CHABAA COCONUT WATER 330ML
  '8b9e3bed-7bbc-407d-a5b7-f8f48e12e5ed', -- COCO ROYAL COCONUT WATER 350ML
  '3372b1eb-a41d-41b2-816b-2a3797dcb172', -- Forest Tonic Water Can 250ml
  '3e53a414-0ccf-47cf-a224-2d9ba22d000d'); -- Water next 500ml

-- → bread
UPDATE spendless.catalog_products SET item_type = 'bread', category = 'bakery'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '4c5896cc-7dcb-46f3-b946-66db9c12d865', -- Chaseup Plain Bread Large
  '1422148d-3b8c-4153-89ec-b39abec19edc', -- Chaseup Plain Bread Medium
  '61fa6862-cc62-42e7-b0e1-72d69931758f', -- Dawn Fortified Bread Large
  '7046fb5e-0fc0-4df3-83ea-14cd71f01c07'); -- Dawn Fortified Bread Small

-- → eggs
UPDATE spendless.catalog_products SET item_type = 'eggs', category = 'dairy'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '37b9afd2-0c2f-4eac-9ed5-ae16a950b2f6', -- EGG 12PCS CLASSIC
  'a0c5527c-42e6-4beb-b806-5dc7823996cc', -- EGG 6PCS CLASSIC
  'bc93869e-22c2-4b13-91b3-fedc674988c9'); -- EGG 6PCS KIDS

-- → fish
UPDATE spendless.catalog_products SET item_type = 'fish', category = 'meat'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '757378e7-2628-4fce-8f0e-874d1ca6d844', -- Big Bird Finger Fish 800Gm
  'fdaad814-01d6-4316-a686-0a82d2c6909f', -- Menu Fish Popcorn 500Gm
  '21e426a7-7735-47e6-a00d-d82794da918d'); -- Mon Salwa Breaded Fish Fillet300Gm

-- → shampoo
UPDATE spendless.catalog_products SET item_type = 'shampoo', category = 'personal-care'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '15d03501-7616-4ec1-942e-d7c2f7b72c7e', -- Dabur Vatika Shampoo 185Ml Hair Fall
  '849cc918-d43d-40d2-8317-e0581c6d6d49', -- Disney Minnie Kids Shampoo & Bath Gel 475Ml
  'cc889396-be1d-4a63-9285-4b5a24cd932a'); -- Disney Star Wars Kids Shampoo& Bath Gel 475Ml

-- → dessert-mix
UPDATE spendless.catalog_products SET item_type = 'dessert-mix', category = 'pantry'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  'b40f6935-ab43-44bb-91f6-56da981a00da', -- Fruitamin Falooda Strawberry Drink 290ml
  '6db2e3ac-28dc-4240-affc-38e4590fc772'); -- Happy Home Rabri Falooda 185Gm

-- → gur
UPDATE spendless.catalog_products SET item_type = 'gur', category = 'pantry'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '9b78f595-17dc-4215-bd5c-002d6043914e', -- Falak Desi Shakkar Jaggery Powder Jar 500Gm
  'b77ae423-0412-4c79-b47e-bbd6fa92d5ea'); -- Falak Desi Shakkar Jaggery Powder Not Bleached 500g

-- → baking
UPDATE spendless.catalog_products SET item_type = 'baking', category = 'pantry'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '6201b8f7-9177-4a08-999c-00a71aee1f96'); -- Essence Bush Vanilla 28ml

-- → beef
UPDATE spendless.catalog_products SET item_type = 'beef', category = 'meat'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '01e13a75-e2e0-401d-bd7f-50ec6d1594e2'); -- Pk Beef Burger 1Kg

-- → candy
UPDATE spendless.catalog_products SET item_type = 'candy', category = 'snacks'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '7e2484ac-66f6-4ede-ae08-98494c38bd90'); -- Candy Land Party Pack

-- → cheese
UPDATE spendless.catalog_products SET item_type = 'cheese', category = 'dairy'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  'e1964264-fa7b-444c-ad81-05f1890544ed'); -- PUCK CHEESE PORTION 6S 108GM

-- → honey
UPDATE spendless.catalog_products SET item_type = 'honey', category = 'pantry'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  'b7e73710-e2b4-497f-bc81-bb8e3aa218a0'); -- SUEBEE HONEY 227GM

-- → jam
UPDATE spendless.catalog_products SET item_type = 'jam', category = 'pantry'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '449146dc-eb77-4cb9-8d61-1686eec418a0'); -- Ahmed Foods Pineapple Jam 200gm

-- → lotion
UPDATE spendless.catalog_products SET item_type = 'lotion', category = 'personal-care'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  'cdded177-a42e-484a-a49f-af147c1c0a04'); -- Johnsons Soft Cream 200Ml Moisturizer

-- → milk
UPDATE spendless.catalog_products SET item_type = 'milk', category = 'dairy'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  'f373cdf3-b7a6-48cd-a5ff-5ef72cbf8403'); -- Day Fresh Long Life Full Fat Liquid Milk Bottle 1Ltr

-- → nuggets
UPDATE spendless.catalog_products SET item_type = 'nuggets', category = 'frozen'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '7d0411ce-6f71-4273-9d27-bf99de738e6f'); -- Mon Salwa Crispy Potato Nuggets

-- → squash
UPDATE spendless.catalog_products SET item_type = 'squash', category = 'beverages'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '64937c4c-cfd4-4b6a-93dd-7a98291ba6df'); -- Qarshi Jam-E-Shirin Pet Bottle500Ml

-- → tea
UPDATE spendless.catalog_products SET item_type = 'tea', category = 'beverages'
WHERE owner_id IS NULL AND item_type IS NULL AND id IN (
  '79a7da7f-9fd2-41e6-9ce4-7dbc9cb8f458'); -- Organic Lemon Grass Tea 35gm

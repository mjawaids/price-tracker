// Generic item types ("bread", "milk", "masoor daal") — the bridge between what
// people type on a list and the products stores sell. A curated vocabulary for
// shopping in Pakistan (English + romanized Urdu); `catalog_products.item_type`
// stores the id. Plain TS with no app imports so scripts can use it too.
//
// Matching picks the most specific keyword phrase in a name (most words), then
// the one that appears last (the head noun: "Dairy Milk Chocolate" → chocolate).

export type Basis = 'g' | 'ml' | 'pc';
/** How unit prices are shown: per 100 g, per kg, per litre, per piece, per dozen. */
export type PriceDisplay = '100g' | 'kg' | '100ml' | 'L' | 'pc' | 'dozen';

export interface ItemType {
  id: string;
  name: string;
  /** Canonical category id from src/lib/categories.ts. */
  category: string;
  basis: Basis;
  display: PriceDisplay;
  keywords: string[];
  /** A broader type this one belongs to ("masoor-daal" → "daal"). */
  parent?: string;
  /**
   * When someone just writes the generic name, may we suggest other brands of
   * a similar size? Off for things people tend to be loyal to (personal care,
   * baby, pharmacy) — there we assume their usual product only.
   */
  swapBrands: boolean;
}

const LOYAL = new Set(['personal-care', 'baby', 'pharmacy']);
const DEFAULT_DISPLAY: Record<Basis, PriceDisplay> = { g: '100g', ml: '100ml', pc: 'pc' };

function t(
  id: string,
  name: string,
  category: string,
  basis: Basis,
  keywords: string[],
  extra: { display?: PriceDisplay; parent?: string; swapBrands?: boolean } = {},
): ItemType {
  return {
    id,
    name,
    category,
    basis,
    display: extra.display ?? DEFAULT_DISPLAY[basis],
    keywords,
    parent: extra.parent,
    swapBrands: extra.swapBrands ?? !LOYAL.has(category),
  };
}

export const ITEM_TYPES: ItemType[] = [
  // Fruits & vegetables
  t('tomato', 'Tomatoes', 'fruits-veg', 'g', ['tomato', 'tomatoes', 'tamatar', 'timatar'], { display: 'kg' }),
  t('onion', 'Onions', 'fruits-veg', 'g', ['onion', 'onions', 'pyaz', 'piyaz', 'payaz'], { display: 'kg' }),
  t('potato', 'Potatoes', 'fruits-veg', 'g', ['potato', 'potatoes', 'aloo', 'alu'], { display: 'kg' }),
  t('garlic', 'Garlic', 'fruits-veg', 'g', ['garlic', 'lehsan', 'lahsan', 'lehsun'], { display: 'kg' }),
  t('ginger', 'Ginger', 'fruits-veg', 'g', ['ginger', 'adrak'], { display: 'kg' }),
  t('green-chilli', 'Green chillies', 'fruits-veg', 'g', ['green chilli', 'green chillies', 'green chili', 'green chilies', 'hari mirch'], { display: 'kg' }),
  t('lemon', 'Lemons', 'fruits-veg', 'g', ['lemon', 'lemons', 'lime', 'limes', 'nimbu', 'leemu'], { display: 'kg' }),
  t('banana', 'Bananas', 'fruits-veg', 'pc', ['banana', 'bananas', 'kela', 'kele'], { display: 'dozen' }),
  t('apple', 'Apples', 'fruits-veg', 'g', ['apple', 'apples', 'seb'], { display: 'kg' }),
  t('mango', 'Mangoes', 'fruits-veg', 'g', ['mango', 'mangoes', 'aam'], { display: 'kg' }),
  t('orange', 'Oranges', 'fruits-veg', 'g', ['orange', 'oranges', 'kinno', 'kinnow', 'malta'], { display: 'kg' }),
  t('grapes', 'Grapes', 'fruits-veg', 'g', ['grape', 'grapes', 'angoor'], { display: 'kg' }),
  t('guava', 'Guava', 'fruits-veg', 'g', ['guava', 'guavas', 'amrood'], { display: 'kg' }),
  t('pomegranate', 'Pomegranate', 'fruits-veg', 'g', ['pomegranate', 'anar'], { display: 'kg' }),
  t('melon', 'Melon', 'fruits-veg', 'g', ['melon', 'watermelon', 'tarbooz', 'kharbooza'], { display: 'kg' }),
  t('dates', 'Dates', 'fruits-veg', 'g', ['dates', 'khajoor', 'khajur'], { display: 'kg' }),
  t('carrot', 'Carrots', 'fruits-veg', 'g', ['carrot', 'carrots', 'gajar'], { display: 'kg' }),
  t('cucumber', 'Cucumbers', 'fruits-veg', 'g', ['cucumber', 'cucumbers', 'kheera', 'khira'], { display: 'kg' }),
  t('spinach', 'Spinach', 'fruits-veg', 'g', ['spinach', 'palak'], { display: 'kg' }),
  t('cauliflower', 'Cauliflower', 'fruits-veg', 'g', ['cauliflower', 'phool gobi', 'gobi'], { display: 'kg' }),
  t('cabbage', 'Cabbage', 'fruits-veg', 'g', ['cabbage', 'band gobi', 'bund gobi'], { display: 'kg' }),
  t('okra', 'Okra', 'fruits-veg', 'g', ['okra', 'bhindi', 'lady finger'], { display: 'kg' }),
  t('peas', 'Peas', 'fruits-veg', 'g', ['peas', 'green peas', 'matar', 'mattar'], { display: 'kg' }),
  t('capsicum', 'Capsicum', 'fruits-veg', 'g', ['capsicum', 'bell pepper', 'shimla mirch'], { display: 'kg' }),
  t('eggplant', 'Eggplant', 'fruits-veg', 'g', ['eggplant', 'brinjal', 'baingan', 'bengan'], { display: 'kg' }),
  t('pumpkin', 'Pumpkin', 'fruits-veg', 'g', ['pumpkin', 'kaddu', 'lauki', 'bottle gourd'], { display: 'kg' }),
  t('mint', 'Mint', 'fruits-veg', 'g', ['mint', 'podina', 'pudina'], { display: 'kg' }),
  t('coriander', 'Coriander leaves', 'fruits-veg', 'g', ['coriander leaves', 'fresh coriander', 'hara dhania', 'dhania'], { display: 'kg' }),
  t('mushroom', 'Mushrooms', 'fruits-veg', 'g', ['mushroom', 'mushrooms']),
  t('beetroot', 'Beetroot', 'fruits-veg', 'g', ['beetroot', 'chukandar'], { display: 'kg' }),
  t('radish', 'Radish', 'fruits-veg', 'g', ['radish', 'mooli'], { display: 'kg' }),
  t('corn', 'Corn', 'fruits-veg', 'g', ['corn', 'sweet corn', 'baby corn', 'makai', 'bhutta']),
  t('lettuce', 'Lettuce', 'fruits-veg', 'g', ['lettuce', 'salad leaves']),

  // Meat & poultry
  t('chicken', 'Chicken', 'meat', 'g', ['chicken', 'murghi', 'murgh', 'broiler', 'chicken whole'], { display: 'kg' }),
  t('chicken-breast', 'Chicken breast', 'meat', 'g', ['chicken breast', 'breast fillet', 'boneless chicken'], { display: 'kg', parent: 'chicken' }),
  t('mutton', 'Mutton', 'meat', 'g', ['mutton', 'bakra', 'goat meat', 'veal'], { display: 'kg' }),
  t('beef', 'Beef', 'meat', 'g', ['beef', 'bara gosht', 'bari boti'], { display: 'kg' }),
  t('mince', 'Mince', 'meat', 'g', ['mince', 'minced meat', 'qeema', 'keema', 'qima'], { display: 'kg' }),
  t('fish', 'Fish', 'meat', 'g', ['fish', 'machli', 'machhli', 'surmai', 'pomfret', 'rohu', 'snapper', 'fish fillet'], { display: 'kg' }),
  t('prawns', 'Prawns', 'meat', 'g', ['prawn', 'prawns', 'shrimp', 'shrimps', 'jhinga'], { display: 'kg' }),

  // Dairy & eggs
  t('milk', 'Milk', 'dairy', 'ml', ['milk', 'doodh', 'full cream milk', 'uht milk', 'packet milk', 'fresh milk'], { display: 'L' }),
  t('flavoured-milk', 'Flavoured milk', 'dairy', 'ml', ['flavoured milk', 'flavored milk', 'chocolate milk', 'milk drink']),
  t('milk-powder', 'Milk powder', 'dairy', 'g', ['milk powder', 'powder milk', 'powdered milk', 'dry milk']),
  t('yogurt', 'Yogurt', 'dairy', 'g', ['yogurt', 'yoghurt', 'dahi', 'curd'], { display: 'kg' }),
  t('butter', 'Butter', 'dairy', 'g', ['butter', 'makhan', 'makkhan', 'maska']),
  t('cheese', 'Cheese', 'dairy', 'g', ['cheese', 'cheddar', 'mozzarella', 'cheese slices', 'slice cheese', 'cream cheese']),
  t('cream', 'Cream', 'dairy', 'ml', ['cream', 'dairy cream', 'cooking cream', 'malai', 'whipping cream']),
  t('eggs', 'Eggs', 'dairy', 'pc', ['egg', 'eggs', 'anda', 'anday', 'andey', 'desi eggs'], { display: 'dozen' }),
  t('paneer', 'Paneer', 'dairy', 'g', ['paneer', 'cottage cheese']),
  t('lassi', 'Lassi', 'dairy', 'ml', ['lassi', 'raita']),
  t('condensed-milk', 'Condensed milk', 'dairy', 'g', ['condensed milk', 'evaporated milk', 'milkmaid']),
  t('tea-whitener', 'Tea whitener', 'dairy', 'g', ['tea whitener', 'whitener', 'coffee creamer', 'creamer']),

  // Bakery & bread
  t('bread', 'Bread', 'bakery', 'g', ['bread', 'double roti', 'sandwich bread', 'milky bread', 'brown bread', 'white bread']),
  t('bun', 'Buns', 'bakery', 'pc', ['bun', 'buns', 'burger bun', 'fruit bun']),
  t('rusk', 'Rusk', 'bakery', 'g', ['rusk', 'rusks', 'papay', 'pape', 'cake rusk']),
  t('naan', 'Naan', 'bakery', 'pc', ['naan', 'kulcha', 'garlic naan']),
  t('roti', 'Roti', 'bakery', 'pc', ['roti', 'chapati', 'chapatti', 'tortilla', 'tortillas']),
  t('paratha', 'Paratha', 'bakery', 'pc', ['paratha', 'parathas', 'frozen paratha', 'lachha paratha']),
  t('cake', 'Cake', 'bakery', 'g', ['cake', 'cakes', 'cupcake', 'cup cake', 'sponge cake']),
  t('croissant', 'Croissants', 'bakery', 'pc', ['croissant', 'croissants']),
  t('bakarkhani', 'Bakarkhani', 'bakery', 'g', ['bakarkhani', 'baqarkhani', 'kulchay']),

  // Rice, atta & pulses
  t('atta', 'Atta (wheat flour)', 'grains', 'g', ['atta', 'chakki atta', 'wheat flour', 'whole wheat flour', 'flour', 'aata'], { display: 'kg' }),
  t('maida', 'Maida', 'grains', 'g', ['maida', 'all purpose flour', 'plain flour', 'fine flour'], { display: 'kg' }),
  t('besan', 'Besan', 'grains', 'g', ['besan', 'baisan', 'gram flour', 'chickpea flour'], { display: 'kg' }),
  t('sooji', 'Sooji', 'grains', 'g', ['sooji', 'suji', 'semolina', 'rava'], { display: 'kg' }),
  t('rice', 'Rice', 'grains', 'g', ['rice', 'chawal', 'basmati', 'sella', 'basmati rice', 'brown rice'], { display: 'kg' }),
  t('daal', 'Daal', 'grains', 'g', ['daal', 'dal', 'dhal', 'lentil', 'lentils', 'pulses'], { display: 'kg' }),
  t('masoor-daal', 'Masoor daal', 'grains', 'g', ['masoor', 'masoor daal', 'masoor dal', 'red lentil', 'red lentils'], { display: 'kg', parent: 'daal' }),
  t('moong-daal', 'Moong daal', 'grains', 'g', ['moong', 'mung', 'moong daal', 'moong dal', 'yellow lentil', 'yellow lentils'], { display: 'kg', parent: 'daal' }),
  t('mash-daal', 'Mash daal', 'grains', 'g', ['mash', 'maash', 'urad', 'mash daal', 'mash dal', 'urad dal'], { display: 'kg', parent: 'daal' }),
  t('chana-daal', 'Chana daal', 'grains', 'g', ['chana daal', 'chana dal', 'split chickpea', 'split chickpeas'], { display: 'kg', parent: 'daal' }),
  t('chickpeas', 'Chickpeas', 'grains', 'g', ['chickpea', 'chickpeas', 'cholay', 'chole', 'kabuli chana', 'white chana', 'safaid chana', 'kala chana', 'black chickpeas'], { display: 'kg' }),
  t('oats', 'Oats', 'grains', 'g', ['oats', 'oatmeal', 'porridge', 'daliya', 'dalia']),
  t('pasta', 'Pasta', 'grains', 'g', ['pasta', 'macaroni', 'spaghetti', 'penne', 'fusilli', 'lasagne', 'lasagna']),
  t('noodles', 'Noodles', 'grains', 'g', ['noodle', 'noodles', 'ramen', 'instant noodles']),
  t('vermicelli', 'Vermicelli', 'grains', 'g', ['vermicelli', 'seviyan', 'sawaiyan', 'sewaiyan']),
  t('cereal', 'Cereal', 'grains', 'g', ['cereal', 'cornflakes', 'corn flakes', 'rice flakes', 'muesli', 'granola', 'choco flakes']),

  // Cooking oil & ghee
  t('cooking-oil', 'Cooking oil', 'cooking-oil', 'ml', ['cooking oil', 'oil', 'canola oil', 'sunflower oil', 'vegetable oil', 'corn oil', 'tel'], { display: 'L' }),
  t('ghee', 'Ghee', 'cooking-oil', 'g', ['ghee', 'banaspati', 'desi ghee', 'vegetable ghee', 'cooking ghee'], { display: 'kg' }),
  t('olive-oil', 'Olive oil', 'cooking-oil', 'ml', ['olive oil', 'extra virgin', 'pomace oil'], { display: 'L' }),

  // Spices & condiments
  t('salt', 'Salt', 'spices', 'g', ['salt', 'namak', 'rock salt', 'pink salt', 'iodized salt'], { display: 'kg' }),
  t('red-chilli', 'Red chilli powder', 'spices', 'g', ['red chilli', 'red chili', 'lal mirch', 'chilli powder', 'chili powder', 'red pepper'], { display: 'kg' }),
  t('turmeric', 'Turmeric', 'spices', 'g', ['turmeric', 'haldi'], { display: 'kg' }),
  t('cumin', 'Cumin', 'spices', 'g', ['cumin', 'zeera', 'jeera', 'zira'], { display: 'kg' }),
  t('coriander-powder', 'Coriander powder', 'spices', 'g', ['coriander powder', 'dhania powder', 'coriander seeds'], { display: 'kg' }),
  t('black-pepper', 'Black pepper', 'spices', 'g', ['black pepper', 'kali mirch', 'pepper powder']),
  t('garam-masala', 'Garam masala', 'spices', 'g', ['garam masala']),
  t('spice-mix', 'Spice mix', 'spices', 'g', ['masala', 'spice mix', 'recipe mix', 'biryani masala', 'karahi masala', 'nihari masala', 'tikka masala', 'qorma masala', 'korma masala']),
  t('ketchup', 'Ketchup', 'spices', 'g', ['ketchup', 'tomato ketchup', 'tomato sauce']),
  t('mayonnaise', 'Mayonnaise', 'spices', 'g', ['mayonnaise', 'mayo']),
  t('chilli-sauce', 'Chilli sauce', 'spices', 'g', ['chilli sauce', 'chili sauce', 'hot sauce', 'chilli garlic sauce', 'chili garlic sauce', 'garlic chili sauce', 'sriracha']),
  t('soy-sauce', 'Soy sauce', 'spices', 'ml', ['soy sauce', 'soya sauce']),
  t('vinegar', 'Vinegar', 'spices', 'ml', ['vinegar', 'sirka']),
  t('ginger-garlic-paste', 'Ginger garlic paste', 'spices', 'g', ['ginger garlic paste', 'garlic paste', 'ginger paste', 'lehsan adrak paste']),
  t('pickle', 'Pickle', 'spices', 'g', ['pickle', 'pickles', 'achar', 'achaar']),
  t('chutney', 'Chutney', 'spices', 'g', ['chutney', 'imli chutney']),
  t('mustard', 'Mustard', 'spices', 'g', ['mustard', 'rai']),

  // Pantry
  t('sugar', 'Sugar', 'pantry', 'g', ['sugar', 'cheeni', 'chini', 'brown sugar', 'shakar'], { display: 'kg' }),
  t('gur', 'Gur', 'pantry', 'g', ['gur', 'jaggery'], { display: 'kg' }),
  t('honey', 'Honey', 'pantry', 'g', ['honey', 'shahad', 'shehad']),
  t('jam', 'Jam', 'pantry', 'g', ['jam', 'marmalade', 'fruit spread']),
  t('peanut-butter', 'Peanut butter', 'pantry', 'g', ['peanut butter']),
  t('chocolate-spread', 'Chocolate spread', 'pantry', 'g', ['chocolate spread', 'hazelnut spread', 'nutella']),
  t('baking', 'Baking supplies', 'pantry', 'g', ['baking powder', 'baking soda', 'yeast', 'cocoa powder', 'food colour', 'food color', 'essence', 'vanilla essence', 'cooking chocolate']),
  t('custard', 'Custard', 'pantry', 'g', ['custard', 'custard powder']),
  t('dessert-mix', 'Dessert mix', 'pantry', 'g', ['kheer mix', 'sheer khurma', 'gulab jamun mix', 'gulaab jamun mix', 'cake mix', 'dessert mix', 'jelly crystals', 'falooda', 'kulfa']),
  t('tomato-paste', 'Tomato paste', 'pantry', 'g', ['tomato paste', 'tomato puree', 'pizza sauce', 'pasta sauce']),
  t('coconut-milk', 'Coconut milk', 'pantry', 'ml', ['coconut milk', 'coconut cream']),
  t('corn-flour', 'Corn flour', 'pantry', 'g', ['corn flour', 'cornflour', 'corn starch', 'cornstarch']),
  t('canned', 'Canned food', 'pantry', 'g', ['canned', 'baked beans', 'fruit cocktail', 'pineapple slice', 'pineapple slices', 'tuna', 'sweet corn kernels']),

  // Frozen
  t('nuggets', 'Nuggets', 'frozen', 'g', ['nugget', 'nuggets', 'tender pops', 'chicken pops', 'bites']),
  t('kebab', 'Kebabs', 'frozen', 'g', ['kabab', 'kababs', 'kebab', 'kebabs', 'seekh kabab', 'chapli kabab', 'shami kabab', 'kofta']),
  t('samosa', 'Samosas', 'frozen', 'g', ['samosa', 'samosas', 'spring roll', 'spring rolls', 'roll patti', 'samosa patti', 'pastry patti']),
  t('fries', 'Fries', 'frozen', 'g', ['fries', 'french fries', 'potato wedges', 'potato bites', 'hash brown']),
  t('ice-cream', 'Ice cream', 'frozen', 'ml', ['ice cream', 'icecream', 'cornetto', 'kulfi', 'ice lolly', 'choc bar', 'cone']),

  // Snacks & biscuits
  t('biscuits', 'Biscuits', 'snacks', 'g', ['biscuit', 'biscuits', 'cookie', 'cookies', 'crackers', 'wafer', 'wafers', 'nan khatai', 'nankhatai']),
  t('chips', 'Chips', 'snacks', 'g', ['chips', 'crisps', 'nachos', 'potato sticks', 'puffs', 'cheese balls', 'chipsticks']),
  t('nimko', 'Nimko', 'snacks', 'g', ['nimko', 'nimco', 'namkeen', 'namkin', 'bhel puri', 'papdi', 'chewara', 'daal moong', 'dal moong']),
  t('chocolate', 'Chocolate', 'snacks', 'g', ['chocolate', 'chocolates', 'dairy milk', 'chocolate bar', 'kitkat', 'snickers']),
  t('candy', 'Sweets & candy', 'snacks', 'g', ['candy', 'candies', 'toffee', 'toffees', 'lollipop', 'jelly', 'jellies', 'gummy', 'gummies', 'bubble gum', 'chewing gum', 'marshmallow', 'mints']),
  t('nuts', 'Nuts', 'snacks', 'g', ['nuts', 'mixed nuts', 'almond', 'almonds', 'badam', 'pistachio', 'pistachios', 'pista', 'cashew', 'cashews', 'kaju', 'walnut', 'walnuts', 'akhrot', 'peanuts', 'moongphali'], { display: 'kg' }),
  t('dry-fruit', 'Dry fruit', 'snacks', 'g', ['dry fruit', 'dry fruits', 'raisins', 'kishmish', 'apricots', 'khubani', 'figs', 'anjeer'], { display: 'kg' }),
  t('popcorn', 'Popcorn', 'snacks', 'g', ['popcorn', 'kettle corn']),
  t('snack-bar', 'Snack bars', 'snacks', 'g', ['granola bar', 'protein bar', 'cereal bar', 'energy bar']),

  // Tea, coffee & beverages
  t('tea', 'Tea', 'beverages', 'g', ['tea', 'chai', 'patti', 'chai patti', 'black tea', 'danedar', 'tea bags'], { display: 'kg' }),
  t('green-tea', 'Green tea', 'beverages', 'pc', ['green tea', 'herbal tea', 'kahwa', 'qehwa', 'herbal infusion']),
  t('coffee', 'Coffee', 'beverages', 'g', ['coffee', 'instant coffee', 'nescafe', 'ground coffee', 'coffee beans']),
  t('juice', 'Juice', 'beverages', 'ml', ['juice', 'juices', 'nectar', 'juice pack'], { display: 'L' }),
  t('water', 'Water', 'beverages', 'ml', ['water', 'mineral water', 'drinking water', 'bottled water'], { display: 'L' }),
  t('soft-drink', 'Soft drinks', 'beverages', 'ml', ['soft drink', 'soft drinks', 'cola', 'pepsi', 'coke', 'coca cola', '7up', 'sprite', 'fanta', 'mountain dew', 'mirinda', 'fizzy drink'], { display: 'L' }),
  t('squash', 'Squash & sharbat', 'beverages', 'ml', ['squash', 'sharbat', 'rooh afza', 'roohafza', 'jam e shirin', 'cordial'], { display: 'L' }),
  t('energy-drink', 'Energy drinks', 'beverages', 'ml', ['energy drink', 'red bull', 'sting', 'monster']),

  // Baby & kids
  t('diapers', 'Diapers', 'baby', 'pc', ['diaper', 'diapers', 'pampers', 'nappies', 'baby pants', 'pant diapers']),
  t('baby-wipes', 'Baby wipes', 'baby', 'pc', ['baby wipes', 'wet wipes', 'wipes']),
  t('formula', 'Baby formula', 'baby', 'g', ['formula', 'infant formula', 'growing up formula', 'growing-up formula', 'follow on formula', 'baby milk']),
  t('baby-food', 'Baby food', 'baby', 'g', ['baby food', 'cerelac', 'baby cereal']),
  t('baby-care', 'Baby care', 'baby', 'ml', ['baby shampoo', 'baby lotion', 'baby oil', 'baby soap', 'baby powder', 'baby jelly', 'baby wash']),

  // Health & pharmacy
  t('pain-relief', 'Pain relief', 'pharmacy', 'pc', ['panadol', 'paracetamol', 'calpol', 'brufen', 'ibuprofen', 'disprin', 'aspirin']),
  t('ors', 'ORS', 'pharmacy', 'pc', ['ors', 'oral rehydration', 'rehydration salts']),
  t('vitamins', 'Vitamins', 'pharmacy', 'pc', ['vitamin', 'vitamins', 'multivitamin', 'multivitamins', 'calcium', 'supplement']),
  t('bandages', 'Bandages', 'pharmacy', 'pc', ['bandage', 'bandages', 'plaster', 'plasters', 'band aid', 'first aid']),
  t('cough-syrup', 'Cough syrup', 'pharmacy', 'ml', ['cough syrup', 'cough', 'lozenges']),
  t('antiseptic', 'Antiseptic', 'pharmacy', 'ml', ['antiseptic', 'antiseptic liquid', 'savlon']),
  t('sanitizer', 'Hand sanitizer', 'pharmacy', 'ml', ['sanitizer', 'sanitiser', 'hand sanitizer', 'hand sanitiser']),
  t('face-mask', 'Face masks', 'pharmacy', 'pc', ['face mask', 'face masks', 'surgical mask']),
  t('adult-diapers', 'Adult diapers', 'pharmacy', 'pc', ['adult diaper', 'adult diapers', 'adult pull-up', 'adult pants']),

  // Personal care
  t('shampoo', 'Shampoo', 'personal-care', 'ml', ['shampoo']),
  t('conditioner', 'Conditioner', 'personal-care', 'ml', ['conditioner', 'hair conditioner']),
  t('soap', 'Soap', 'personal-care', 'g', ['soap', 'sabun', 'bar soap', 'soap bar', 'beauty bar', 'bathing bar']),
  t('body-wash', 'Body wash', 'personal-care', 'ml', ['body wash', 'bodywash', 'shower gel', 'shower cream']),
  t('handwash', 'Hand wash', 'personal-care', 'ml', ['hand wash', 'handwash', 'liquid hand wash']),
  t('toothpaste', 'Toothpaste', 'personal-care', 'g', ['toothpaste', 'tooth paste']),
  t('toothbrush', 'Toothbrush', 'personal-care', 'pc', ['toothbrush', 'tooth brush', 'toothbrushes']),
  t('mouthwash', 'Mouthwash', 'personal-care', 'ml', ['mouthwash', 'mouth wash']),
  t('deodorant', 'Deodorant', 'personal-care', 'ml', ['deodorant', 'body spray', 'deo', 'roll on', 'antiperspirant']),
  t('face-wash', 'Face wash', 'personal-care', 'ml', ['face wash', 'facewash', 'facial wash', 'cleanser']),
  t('lotion', 'Lotion & cream', 'personal-care', 'ml', ['lotion', 'body lotion', 'moisturiser', 'moisturizer', 'face cream', 'heel cream', 'cold cream', 'petroleum jelly', 'vaseline']),
  t('sunscreen', 'Sunscreen', 'personal-care', 'ml', ['sunscreen', 'sunblock', 'sun block']),
  t('razor', 'Razors', 'personal-care', 'pc', ['razor', 'razors', 'blade', 'blades', 'shaving blade']),
  t('shaving-cream', 'Shaving cream', 'personal-care', 'ml', ['shaving cream', 'shaving foam', 'shaving gel', 'after shave', 'aftershave']),
  t('sanitary-pads', 'Sanitary pads', 'personal-care', 'pc', ['sanitary pads', 'sanitary pad', 'sanitary', 'pads', 'maxi pads', 'panty liners']),
  t('hair-oil', 'Hair oil', 'personal-care', 'ml', ['hair oil', 'coconut oil', 'amla oil', 'mustard oil']),
  t('hair-colour', 'Hair colour', 'personal-care', 'pc', ['hair colour', 'hair color', 'hair dye', 'mehndi', 'henna']),
  t('tissue', 'Tissues', 'personal-care', 'pc', ['tissue', 'tissues', 'facial tissue', 'tissue box', 'napkin', 'napkins']),
  t('toilet-paper', 'Toilet paper', 'personal-care', 'pc', ['toilet paper', 'toilet roll', 'toilet rolls', 'toilet tissue']),
  t('kitchen-roll', 'Kitchen roll', 'personal-care', 'pc', ['kitchen roll', 'kitchen towel', 'kitchen tissue', 'tissue roll']),
  t('cotton-buds', 'Cotton buds', 'personal-care', 'pc', ['cotton buds', 'ear buds', 'cotton swabs', 'cotton wool']),

  // Cleaning & household
  t('detergent', 'Washing powder', 'household', 'g', ['detergent', 'washing powder', 'surf', 'laundry powder', 'laundry detergent', 'washing liquid'], { display: 'kg' }),
  t('dishwash', 'Dishwash', 'household', 'g', ['dishwash', 'dish wash', 'dishwashing', 'dish soap', 'dishwashing liquid', 'dishwash bar', 'dishwash liquid']),
  t('bleach', 'Bleach', 'household', 'ml', ['bleach']),
  t('floor-cleaner', 'Floor cleaner', 'household', 'ml', ['floor cleaner', 'phenyl', 'surface cleaner', 'multi surface', 'daily mop']),
  t('toilet-cleaner', 'Toilet cleaner', 'household', 'ml', ['toilet cleaner', 'bathroom cleaner', 'harpic']),
  t('glass-cleaner', 'Glass cleaner', 'household', 'ml', ['glass cleaner', 'window cleaner']),
  t('garbage-bags', 'Garbage bags', 'household', 'pc', ['garbage bag', 'garbage bags', 'bin bag', 'bin bags', 'trash bag', 'trash bags', 'garbage roll']),
  t('foil', 'Foil & cling film', 'household', 'pc', ['aluminium foil', 'aluminum foil', 'foil', 'cling film', 'cling wrap', 'butter paper']),
  t('sponge', 'Sponges & scourers', 'household', 'pc', ['sponge', 'sponges', 'scourer', 'scouring pad', 'steel wool', 'sponge cloth']),
  t('insect-killer', 'Insect killer', 'household', 'ml', ['insect spray', 'insect killer', 'insecticide', 'mosquito', 'mosquito repellent', 'repellent', 'coil', 'coils', 'cockroach']),
  t('air-freshener', 'Air freshener', 'household', 'ml', ['air freshener', 'room freshener', 'air mist']),
  t('batteries', 'Batteries', 'household', 'pc', ['battery', 'batteries', 'aa battery', 'aaa battery']),
  t('light-bulb', 'Light bulbs', 'household', 'pc', ['light bulb', 'bulb', 'bulbs', 'led bulb', 'energy saver', 'tube light']),
  t('matches', 'Matches & lighters', 'household', 'pc', ['matches', 'matchbox', 'match box', 'lighter']),
];

export const ITEM_TYPE_BY_ID = new Map(ITEM_TYPES.map((it) => [it.id, it]));

// ── Matching ─────────────────────────────────────────────────────────────────

/** Lower-case words with simple plural folding, so "tomatoes" meets "tomato". */
export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singular);
}

export function singular(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (/(oes|sses|shes|ches|xes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) return w.slice(0, -1);
  return w;
}

interface KeywordEntry {
  words: string[];
  type: ItemType;
}

const KEYWORDS: KeywordEntry[] = ITEM_TYPES.flatMap((type) =>
  type.keywords.map((k) => ({ words: tokens(k), type })),
);
const BY_FIRST_WORD = new Map<string, KeywordEntry[]>();
for (const k of KEYWORDS) {
  const list = BY_FIRST_WORD.get(k.words[0]) || [];
  list.push(k);
  BY_FIRST_WORD.set(k.words[0], list);
}

const PHRASES = new Map<string, Set<string>>(
  ITEM_TYPES.map((type) => [type.id, new Set(type.keywords.map((k) => tokens(k).join(' ')))]),
);
const NAME_WORDS = new Map<string, Set<string>>(
  ITEM_TYPES.map((type) => [type.id, new Set([...tokens(type.name), ...tokens(type.id)])]),
);

// Longer keywords that are just how the plain item is named: their extra word
// doesn't make a different product ("Tomato Ketchup" is the ketchup).
const PLAIN_PHRASES = new Set(
  [
    'tomato ketchup', 'french fries', 'body lotion', 'mineral water', 'drinking water', 'bottled water',
    'bar soap', 'soap bar', 'chocolate bar', 'liquid hand wash', 'tissue box',
  ].map((p) => tokens(p).join(' ')),
);

// Keywords filed under one type that still name a different product: their own
// words stay in the variant ("Dipitt Hot Sauce" isn't "Dipitt Chilli Sauce").
const DISTINCT_PHRASES = new Set(['hot sauce'].map((p) => tokens(p).join(' ')));

/**
 * The words of a matched keyword that tell products apart: a word whose removal
 * leaves another keyword of the same type ("shami" in "shami kabab", "nihari" in
 * "nihari masala", "canola" in "canola oil"), or any word of a distinct phrase
 * ("hot" sauce). Words of a plain synonym ("shower gel", "tooth paste") and the
 * type's own name ("cooking" oil) don't count.
 */
export function modifierWords(typeId: string, words: string[]): string[] {
  const phrases = PHRASES.get(typeId);
  const own = NAME_WORDS.get(typeId);
  if (DISTINCT_PHRASES.has(words.join(' '))) return words.filter((w) => !own?.has(w));
  if (!phrases || words.length < 2 || PLAIN_PHRASES.has(words.join(' '))) return [];
  return words.filter(
    (w, i) => !own?.has(w) && phrases.has(words.filter((_, j) => j !== i).join(' ')),
  );
}

/** Phrases that look like an item but describe something else ("sugar free", "full cream milk"). */
const NOT_ITEMS = [['sugar', 'free'], ['fat', 'free'], ['gluten', 'free'], ['full', 'cream']];

export interface TypeMatch {
  type: ItemType;
  /** The matched phrase, as tokens. */
  words: string[];
  /** Words in the matched phrase (more = more specific). */
  specificity: number;
  /** Token index where the phrase ends (later = more likely the head noun). */
  end: number;
}

/** Every item-type phrase found in `text`, ignoring phrases inside the first `skipTokens` tokens. */
export function findTypes(text: string, skipTokens = 0): TypeMatch[] {
  const w = tokens(text);
  const skip = new Set<number>();
  for (let i = 0; i < w.length - 1; i++) {
    for (const p of NOT_ITEMS) if (w[i] === p[0] && w[i + 1] === p[1]) skip.add(i).add(i + 1);
  }
  const found: TypeMatch[] = [];
  for (let i = 0; i < w.length; i++) {
    if (skip.has(i)) continue;
    for (const k of BY_FIRST_WORD.get(w[i]) || []) {
      const end = i + k.words.length - 1;
      // A phrase wholly inside the brand ("Lemon Max") says nothing about the item.
      if (end < skipTokens) continue;
      if (k.words.every((word, j) => w[i + j] === word && !skip.has(i + j))) {
        found.push({ type: k.type, words: k.words, specificity: k.words.length, end });
      }
    }
  }
  return found;
}

/**
 * The item type a name is most likely about. `categoryHint` (a canonical
 * category id) breaks ties and flags doubtful matches; `skipTokens` is the
 * number of leading tokens that are the brand.
 */
export function matchItemType(
  text: string,
  categoryHint?: string | null,
  skipTokens = 0,
): { type: ItemType; words: string[]; confident: boolean } | null {
  const found = findTypes(text, skipTokens);
  if (!found.length) return null;
  const score = (m: TypeMatch) =>
    m.specificity * 100 + m.end + (categoryHint && m.type.category === categoryHint ? 50 : 0);
  found.sort((a, b) => score(b) - score(a));
  const best = found[0];
  const confident = !categoryHint || best.type.category === categoryHint || best.specificity > 1;
  return { type: best.type, words: best.words, confident };
}

/** The type and every type below it ("daal" → daal + masoor + moong …). */
export function typeFamily(id: string): Set<string> {
  const out = new Set([id]);
  for (const it of ITEM_TYPES) if (it.parent === id) out.add(it.id);
  return out;
}

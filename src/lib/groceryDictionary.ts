// Common grocery & household items → canonical category id (src/lib/categories.ts).
// English plus romanized Urdu names used when shopping in Pakistan. Used offline
// to sort quick-list items into aisles and to suggest items while typing.

const BY_CATEGORY: Record<string, string[]> = {
  'fruits-veg': [
    'apples', 'bananas', 'mangoes', 'oranges', 'grapes', 'guava', 'pomegranate', 'watermelon',
    'melon', 'strawberries', 'dates', 'lemons', 'limes', 'tomatoes', 'onions', 'potatoes',
    'garlic', 'ginger', 'green chillies', 'carrots', 'cucumbers', 'spinach', 'cauliflower',
    'cabbage', 'okra', 'peas', 'capsicum', 'eggplant', 'pumpkin', 'mint', 'coriander leaves',
    'lettuce', 'mushrooms', 'sweet potatoes', 'radish', 'turnip', 'beans', 'corn',
    'aloo', 'pyaz', 'tamatar', 'lehsan', 'adrak', 'hari mirch', 'palak', 'gobi', 'bhindi',
    'matar', 'kela', 'seb', 'aam', 'nimbu', 'podina', 'dhania', 'sabzi', 'kheera', 'gajar',
  ],
  meat: [
    'chicken', 'chicken breast', 'mutton', 'beef', 'mince', 'fish', 'prawns',
    'murghi', 'gosht', 'qeema', 'machli',
  ],
  dairy: [
    'milk', 'eggs', 'yogurt', 'butter', 'cheese', 'cream', 'paneer', 'cream cheese', 'lassi',
    'doodh', 'dahi', 'makhan', 'anday', 'condensed milk', 'milk powder',
  ],
  bakery: [
    'bread', 'brown bread', 'buns', 'rusk', 'naan', 'roti', 'paratha', 'cake', 'croissants',
    'double roti', 'papay', 'bakarkhani',
  ],
  grains: [
    'atta', 'flour', 'rice', 'basmati rice', 'daal', 'dal', 'lentils', 'chickpeas', 'besan',
    'maida', 'sooji', 'oats', 'pasta', 'noodles', 'vermicelli', 'chawal', 'cholay', 'masoor',
    'moong', 'chana daal', 'cornflakes', 'cereal',
  ],
  'cooking-oil': ['cooking oil', 'oil', 'ghee', 'olive oil', 'banaspati', 'tel', 'canola oil'],
  spices: [
    'salt', 'black pepper', 'red chilli', 'turmeric', 'cumin', 'coriander powder', 'garam masala',
    'ketchup', 'mayonnaise', 'vinegar', 'soy sauce', 'chilli sauce', 'mustard', 'namak',
    'haldi', 'lal mirch', 'zeera', 'mixed masala', 'biryani masala', 'karahi masala', 'imli',
  ],
  pantry: [
    'sugar', 'cheeni', 'honey', 'jam', 'peanut butter', 'chocolate spread', 'baking powder',
    'yeast', 'custard', 'jelly', 'canned beans', 'tomato paste', 'gur', 'shakar',
  ],
  frozen: [
    'frozen peas', 'nuggets', 'frozen parathas', 'samosas', 'kebabs', 'ice cream', 'fries',
    'frozen fries', 'shami kebab',
  ],
  snacks: [
    'biscuits', 'cookies', 'chips', 'crisps', 'nimko', 'chocolate', 'nuts', 'mixed nuts',
    'almonds', 'popcorn', 'cake rusk', 'chocolates', 'dry fruits',
  ],
  beverages: [
    'tea', 'chai', 'patti', 'green tea', 'coffee', 'juice', 'water', 'mineral water',
    'soft drinks', 'cola', 'squash', 'sharbat', 'rooh afza', 'doodh patti',
  ],
  baby: ['diapers', 'baby wipes', 'formula', 'baby food', 'baby shampoo', 'pampers'],
  pharmacy: [
    'panadol', 'paracetamol', 'ors', 'vitamins', 'bandages', 'plasters', 'cough syrup',
    'antiseptic', 'dettol', 'thermometer', 'medicine',
  ],
  'personal-care': [
    'shampoo', 'conditioner', 'soap', 'body wash', 'toothpaste', 'toothbrush', 'deodorant',
    'face wash', 'lotion', 'razors', 'shaving cream', 'sanitary pads', 'hair oil', 'sabun',
    'cotton buds', 'hand wash',
  ],
  household: [
    'dish soap', 'dishwashing liquid', 'detergent', 'washing powder', 'surf', 'bleach',
    'floor cleaner', 'toilet cleaner', 'tissue', 'tissue roll', 'toilet paper', 'kitchen roll',
    'bin bags', 'garbage bags', 'aluminium foil', 'cling film', 'sponges', 'matches',
    'light bulb', 'batteries', 'insect spray', 'air freshener', 'phenyl', 'jharoo',
  ],
};

export const GROCERY_DICTIONARY: Record<string, string> = Object.fromEntries(
  Object.entries(BY_CATEGORY).flatMap(([cat, names]) => names.map((n) => [n, cat])),
);

/** Chips shown on an empty list. */
export const STARTER_ITEMS = [
  'Milk', 'Bread', 'Eggs', 'Atta', 'Rice', 'Chai', 'Sugar', 'Tomatoes', 'Onions', 'Dahi',
];

export const normalizeName = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');

const singular = (s: string) =>
  s.endsWith('ies') ? `${s.slice(0, -3)}y` : s.endsWith('es') ? s.slice(0, -2) : s.endsWith('s') ? s.slice(0, -1) : s;

/** Best-guess category id for a free-text item name, or null if unknown. */
export function dictionaryCategory(name: string): string | null {
  const n = normalizeName(name);
  if (!n) return null;
  const last = n.split(' ').pop() || n;
  for (const candidate of [n, singular(n), `${n}s`, last, singular(last), `${last}s`]) {
    const hit = GROCERY_DICTIONARY[candidate];
    if (hit) return hit;
  }
  return null;
}

/** Dictionary names containing `query`, prefix matches first. */
export function dictionaryMatches(query: string, limit = 5): string[] {
  const q = normalizeName(query);
  if (!q) return [];
  return Object.keys(GROCERY_DICTIONARY)
    .filter((n) => n.includes(q))
    .sort((a, b) => Number(!a.startsWith(q)) - Number(!b.startsWith(q)) || a.length - b.length)
    .slice(0, limit);
}

// Client-side shapes of the Compare catalogue (spendless.catalog_* and friends).
import type { DeliveryRule } from '../../types/index.ts';

/** A store's delivery rule, plus an optional minimum order. */
export type StoreDeliveryRule = DeliveryRule & { minOrder?: number };

export interface Region {
  id: string;
  name: string;
  countryCode: string;
  currency: string;
  status: 'live' | 'gathering';
  sortOrder: number;
}

export interface CatalogStore {
  id: string;
  /** null = public (shared); otherwise private to that user. */
  ownerId: string | null;
  regionId: string | null;
  chain: string | null;
  name: string;
  kind: 'physical' | 'online';
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  deliveryRule: StoreDeliveryRule;
  website: string | null;
  phone: string | null;
  status: 'active' | 'closed';
  updatedAt: string;
}

export interface CatalogProduct {
  id: string;
  ownerId: string | null;
  name: string;
  brand: string | null;
  variant: string | null;
  /** Item type id (src/lib/compare/itemTypes.ts). */
  itemType: string | null;
  category: string | null;
  /** Size of one unit in g / ml / pieces, and how many units per pack. */
  sizeValue: number | null;
  sizeUnit: 'g' | 'ml' | 'pc' | null;
  packCount: number;
  unitLabel: string | null;
  gtin: string | null;
  imageUrl: string | null;
  status: 'active' | 'merged';
  mergedInto: string | null;
  updatedAt: string;
}

export interface CurrentPrice {
  storeId: string;
  productId: string;
  /** Price of one pack; null only when the latest report says out of stock. */
  price: number | null;
  currency: string | null;
  isAvailable: boolean;
  observedAt: string;
  nReports: number;
  confidence: number;
  /** True when this is the user's own latest report (it wins for them). */
  mine?: boolean;
  /** The user's own report that's held for a check (far from the usual price): only they use it until someone else agrees. */
  held?: boolean;
  /** At least two people said this shared price is wrong since it was last reported: Where to buy leaves it out. */
  disputed?: boolean;
}

/**
 * A person's own in-store shop suggested as a shared one (spendless.branch_suggestions).
 * open → promoted (moved into `promotedStoreId`, a shared shop) or declined.
 */
export interface BranchSuggestion {
  id: string;
  /** Their own shop; null once deleted (a promoted row still says where they moved). */
  storeId: string | null;
  regionId: string;
  /** The chain or shop name, and its area: the shared shop is "<chain> · <area>". */
  chain: string;
  area: string;
  status: 'open' | 'promoted' | 'declined';
  promotedStoreId: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export type PreferenceMode = 'exact' | 'brand_size' | 'any_size';

/** A user's "usual" for a list item name. */
export interface ItemPreference {
  itemKey: string;
  mode: PreferenceMode;
  productIds: string[];
  refProductId: string | null;
  updatedAt: string;
}

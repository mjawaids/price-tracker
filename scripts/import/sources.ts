// The stores we import, with where each rule comes from (see docs/data-sources.md).
// Store ids are fixed so every run updates the same public store.
import type { StoreDeliveryRule } from '../../src/lib/compare/types.ts';
import type { BlinkOptions } from './adapters/blink-pages.ts';
import type { ImtiazOptions } from './adapters/imtiaz-menu.ts';
import type { MagentoOptions } from './adapters/magento-graphql.ts';

export type Adapter =
  | { kind: 'magento-graphql'; options: MagentoOptions }
  | { kind: 'hydri' }
  | { kind: 'imtiaz-menu'; options: ImtiazOptions }
  | { kind: 'blink-pages'; options: BlinkOptions };

export interface Source {
  /** Short id for the CLI, logs and import_runs.source. */
  id: string;
  store: { id: string; name: string; chain: string; region_id: string; website: string; delivery_rule: StoreDeliveryRule };
  adapter: Adapter;
  /** Most requests one run may make to this site. */
  maxPages: number;
  /** Why this store is left out of `--source all` for now (it still runs on its own with `--source <id>`). */
  paused?: string;
}

export const SOURCES: Source[] = [
  {
    id: 'diamond',
    store: {
      id: '87eef6a5-8c64-4eba-8aaa-467dd982717f',
      name: 'Diamond Super Market',
      chain: 'Diamond Super Market',
      region_id: 'karachi',
      website: 'https://www.dsmonline.pk',
      // Site FAQ: "We deliver across Karachi in Rs. 150/- only per order".
      delivery_rule: { type: 'flat', fee: 150 },
    },
    adapter: {
      kind: 'magento-graphql',
      options: {
        // Prices are the same at every branch (checked); stock differs. Clifton's are used.
        storeCode: 'clifton',
        // Breakfast & Dairy, Beverages & Snacks, Desserts & Baking, Household & Laundry,
        // Beauty & Personal Care, Kids & Babies, Grocery, Frozen Food, Fresh Products.
        categoryIds: ['24', '38', '54', '61', '76', '114', '176', '193', '196'],
      },
    },
    maxPages: 400,
  },
  {
    id: 'hydri',
    store: {
      id: '23273933-930c-4a28-9e7a-00410a7c0007',
      name: 'Hydri Super Market',
      chain: 'Hydri Super Market',
      region_id: 'karachi',
      website: 'https://www.hydrisupermarket.com.pk',
      // /shipping-delivery: "Delivery Charges: Rs. 200 per order · Free Shipping above 2000+".
      delivery_rule: { type: 'over', threshold: 2000, fee: 200 },
    },
    adapter: { kind: 'hydri' },
    maxPages: 1500,
    // Allowed this importer from a test machine, but refused GitHub's runners (403 on the
    // home page) on the first scheduled run. We don't work around that (docs/data-sources.md).
    paused: 'refuses GitHub runners (403, 2026-10-05)',
  },
  {
    id: 'imtiaz',
    store: {
      id: '7a68c531-b557-4984-99a6-7252a0d7b5c6',
      name: 'Imtiaz',
      chain: 'Imtiaz',
      region_id: 'karachi',
      website: 'https://shop.imtiaz.com.pk',
      // Site's Karachi delivery areas (branch 54934): Rs 199, min order Rs 500.
      // Free at Rs 3,000 or more (confirmed by the owner, 2026-10-05).
      delivery_rule: { type: 'over', threshold: 3000, fee: 199, minOrder: 500 },
    },
    adapter: { kind: 'imtiaz-menu', options: { restId: 55126, branchId: 54934, appName: 'imtiazsuperstore' } },
    maxPages: 10,
  },
  {
    id: 'chase-up',
    store: {
      id: 'e85d7160-bb28-4f88-b98e-b29caa76019b',
      name: 'Chase Up',
      chain: 'Chase Up',
      region_id: 'karachi',
      website: 'https://www.chaseupgrocery.com',
      // Site's Karachi delivery areas (branches 56119, 56246, 56247): Rs 150, min order Rs 1,000.
      delivery_rule: { type: 'flat', fee: 150, minOrder: 1000 },
    },
    // North Nazimabad serves the most Karachi areas; the three Karachi branches priced alike in samples.
    adapter: { kind: 'blink-pages', options: { branchId: 56247 } },
    maxPages: 3000,
  },
  {
    id: 'spar',
    store: {
      id: '223030ad-85fc-4d36-94cc-817f4272e881',
      name: 'Spar',
      chain: 'Spar',
      region_id: 'karachi',
      website: 'https://store.spar.pk',
      // Site's delivery areas (branch 54346, Sharfabad): Rs 150 in most areas (61 of 112),
      // Rs 290–500 farther out. No minimum.
      delivery_rule: { type: 'flat', fee: 150 },
    },
    adapter: { kind: 'blink-pages', options: { branchId: 54346 } },
    maxPages: 3000,
  },
  {
    id: 'bin-hashim',
    store: {
      id: 'aedd9987-2331-4e8c-93f4-7d165c7f7d64',
      name: 'Bin Hashim',
      chain: 'Bin Hashim',
      region_id: 'karachi',
      website: 'https://www.binhashimonline.pk',
      // Site's delivery areas (one branch, 55203): Rs 299. No minimum.
      delivery_rule: { type: 'flat', fee: 299 },
    },
    // One branch; its item prices are the ones shown. Grocery and household only (aisle rules).
    adapter: { kind: 'blink-pages', options: { branchId: null } },
    maxPages: 5000,
  },
];

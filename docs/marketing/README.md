# SpendLess — Marketing Asset Kit

This folder is a single source of truth for marketing, distribution, and content
generation for **SpendLess** (https://spendless.ibexoft.com). Every claim here was
verified against the actual codebase — features that exist in the UI but are not
wired up (push notifications, favorites, multiple lists) are deliberately excluded.

## How to use this kit
Hand any of these files to an AI (or a writer) as context. Each is self-contained.

| File | What it's for |
|------|---------------|
| `01-product-brief.md` | The master brief. The one file to paste into any AI before asking it to write anything. Pitch, positioning, what the app is. |
| `02-features-and-benefits.md` | Verified feature list mapped to user benefits. Source for feature pages, comparison tables, ad copy. |
| `03-use-cases-and-personas.md` | Who it's for and the real jobs-to-be-done. Source for use-case pages, targeting, testimonials framing. |
| `04-landing-page.md` | A ready-to-build landing page: hero, sections, CTAs, FAQ, meta. Drop into WordPress. |
| `05-blog-and-seo.md` | 25+ blog/article titles with angles, plus SEO keyword clusters and a content calendar. |
| `06-social-media.md` | Ready-to-post Twitter/X and Facebook copy, campaign themes, a 2-week starter schedule. |
| `07-screenshot-shotlist.md` | Exactly which screens/states to capture, framing, and captions for each. |
| `08-brand-and-messaging.md` | Voice, tone, visual identity (colors/fonts), boilerplate, and a "DO NOT CLAIM" guardrail list. |

## ⚠️ Guardrails (read before generating anything)
Do **not** advertise these — they are not implemented:
- Price-drop / deal **push notifications** (toggle exists, no backend)
- **Favorites / wishlist** (heart icon is non-functional)
- **Multiple shopping lists** (only "My Cart" is active)
- **Price history / trends over time** (only current prices are stored)
- **Offline mode** (installable PWA, but not offline-first)
- **Location-based store filtering** (location is informational only)
- **Dark mode** (light theme by design)

See `08-brand-and-messaging.md` for the full list and approved phrasing.

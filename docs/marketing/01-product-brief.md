# SpendLess — Master Product Brief

> Paste this file into any AI as context before asking it to write landing pages,
> blog posts, ads, or social content. Everything here is verified against the app.

## One-liner
**SpendLess is a mobile-first app that tracks prices across the stores you actually
shop at, then builds the cheapest way to buy your whole cart — delivery fees included.**

## Elevator pitch (≈50 words)
Groceries and essentials cost different amounts at different stores, and delivery
fees quietly eat your savings. SpendLess lets you track what each store charges,
build a cart, and instantly get an optimized shopping plan that splits your items
across stores for the lowest possible total — including delivery.

## Short pitch (≈25 words)
Track prices across your stores, build a cart, and let SpendLess split it across
stores for the cheapest total — delivery fees factored in.

## Tagline options
- Spend less on the same stuff.
- The cheapest way to buy your whole cart.
- Shop smarter across every store.
- Stop overpaying. Start planning.
- Your cart, optimized.

## What it is
A price-comparison and shopping optimizer for everyday buying (groceries, household,
pharmacy, baby, personal care). Unlike generic "compare prices" sites that scrape big
retailers, SpendLess is **your personal price book**: you decide which stores matter
(your local kiryana, the supermarket down the road, your favorite online grocer), you
record what they charge, and the app does the math to minimize your total spend.

## The problem it solves
1. **Prices vary store to store** and people can't track it in their heads.
2. **The cheapest item isn't the cheapest trip** — buying every item at its lowest
   price often means paying delivery to three different stores.
3. **Delivery fees are sneaky** — "free over $40" thresholds and flat fees change
   which split is actually cheapest.
4. **Mental math doesn't scale** — with a 15-item cart across 4 stores there are
   millions of combinations. Nobody optimizes this by hand.

SpendLess turns that into a one-tap answer.

## How it works (the core loop)
1. **Add your stores** — physical or online, each with its delivery rule
   (no delivery, always free, flat fee, or free-over-a-threshold).
2. **Add products & prices** — record what each store charges for each item.
3. **Build a cart** — browse or search your catalog and tap to add, set quantities.
4. **Build my cheapest plan** — SpendLess evaluates how to split the cart across
   stores to minimize the **grand total including delivery**, and shows you the
   per-store breakdown and how much you saved versus the naive "buy-each-item-cheapest"
   approach.

## The headline feature: the cart optimizer
This is the differentiator. The optimizer is **delivery-aware**:
- It considers every store that stocks each item.
- It computes each store's delivery fee based on that store's rule and your subtotal
  there (e.g., a store with "free over $40" charges nothing once you cross $40).
- It finds the assignment of items → stores that minimizes the **total** cost.
- For carts within a tractable size it brute-forces every combination for a provably
  cheapest plan; for very large carts it falls back to a fast greedy method.
- It compares the result to a "naive baseline" (each item at its lowest price, then
  add up every store's delivery) so it can show real savings.

Result: a clear plan like "Buy these 6 things at Store A (free delivery), these 3 at
Store B — total $X, you saved $Y."

## Who it's for
- **Budget-conscious households** managing a weekly grocery run.
- **Inflation-hit shoppers** in emerging markets where price differences are large.
- **Multi-store shoppers** who already split between a supermarket and an online grocer.
- **Deal-trackers** who keep a mental "this is cheaper there" list and want it organized.
- **Anyone in a market with delivery-fee complexity** (thresholds, flat fees).

## What makes it different
- **Your stores, your prices** — not a fixed list of big retailers. Works for local
  shops, online grocers, anywhere you buy.
- **Delivery-fee-aware optimization** — most comparison tools ignore delivery; this is
  exactly where the savings hide.
- **Whole-cart thinking** — optimizes the trip, not just one item.
- **Truly global** — 50+ currencies with automatic detection; tuned for emerging
  markets (default categories and currency reflect Pakistan, but it works anywhere).
- **Mobile-first & installable** — works like a native app on your phone; clean,
  fast, no clutter, no ads.
- **Private by design** — your data is yours, isolated per-user with row-level security.

## Verified facts (safe to quote)
- 50+ currencies supported, auto-detected from your device locale.
- 15 built-in shopping categories (plus unlimited custom categories).
- Four delivery-rule types: none, always free, flat fee, free-over-threshold.
- Stores typed as physical or online.
- Sign in with email/password or Google.
- Installable progressive web app (add to home screen, runs full-screen).
- Adaptive layout: phone (bottom tab bar), tablet, and desktop (sidebar).
- Live at https://spendless.ibexoft.com

## Brand basics
- **Name:** SpendLess
- **Maker/Brand:** Ibexoft
- **Accent color:** magenta `#df3798`
- **Background:** warm cream `#fcfaf6`
- **Voice:** practical, friendly, money-smart, no hype. (See `08-brand-and-messaging.md`.)

## ⚠️ Do not claim
Push notifications / price-drop alerts, favorites/wishlist, multiple shopping lists,
price history/trends, offline mode, location-based store filtering, dark mode, or
automatic price scraping. None of these are implemented. See `08-brand-and-messaging.md`.

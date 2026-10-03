# Testing Guide

SpendLess has no automated test suite (by design — see `CLAUDE.md`). Every change is
checked with `npm run lint`, `npm run build` and a manual pass of the relevant
sections below.

## Setup for a test pass

```bash
npm run build && npm run preview   # service worker + offline only work in a build
```

Test at three widths (browser device toolbar): **375px** (phone), **768px**
(tablet, collapsed sidebar) and **1280px** (desktop, full sidebar).

## Lists (default section)

- [ ] First sign-in lands on an empty **Groceries** list with "Tap to add" chips.
- [ ] Typing `bread` + Enter adds it; the field stays focused for the next item.
- [ ] Quantities parse: `2 milk` → Milk ×2, `milk x2`, `eggs 12`, `atta 10 kg`, `1kg sugar`.
- [ ] Adding an item that's already on the list bumps its quantity (toast says so).
- [ ] Typing shows suggestions (your history first, then common items) with their aisle.
- [ ] Pasting several lines (`- milk`, `1. bread`) adds them all.
- [ ] Items are grouped by aisle; unknown items go under **Other**.
- [ ] Tapping the circle ticks an item → it moves to **In cart**, with **Undo**.
- [ ] Phone only: swipe right ticks, swipe left deletes (with Undo).
- [ ] Tapping an item opens details: rename, quantity, unit, aisle, note, delete.
- [ ] **Clear** hides ticked items; they still appear under **Often** next time.
- [ ] Shopping progress ("3 of 10 in cart") shows once something is ticked;
      ticking everything shows **All picked up**.
- [ ] List switcher: create, rename, delete lists; counts are right.

## Offline (Lists)

- [ ] Go offline (DevTools → Network → Offline): banner and "Offline" badge appear.
- [ ] Add, tick, edit and delete items while offline — all work instantly.
- [ ] Reload while offline: the app opens and the changes are still there.
- [ ] Go back online: the badge returns to **Synced** and the pending count clears.
- [ ] Open the app on a second device/browser with the same account: changes appear.
- [ ] Sign out with unsynced changes shows a warning before discarding them.

## Tips

- [ ] A fresh account sees tips one at a time (tick, aisles, details, clear, often…).
- [ ] **Got it** dismisses a tip for good (survives reload); **Hide tips** turns all off.
- [ ] Profile → Help → **Tips** toggles them; **Show tips again** resets them.
- [ ] The add box placeholder rotates through examples when idle.

## Compare

- [ ] The tab bar shows **Lists · Compare · Profile**; Compare has Browse · Cart · Catalogue.
- [ ] The Compare walkthrough appears the first time Compare is opened (not on sign-in).
- [ ] Catalogue → Products / Stores / Prices: add, edit and delete work.
- [ ] Cart → **Build my cheapest plan** produces a plan.
- [ ] Catalogue → Products: add, replace and remove a product photo (stored in the
      `spendless-product-images` bucket).
- [ ] Offline, Compare shows the "prices may be out of date" notice instead of breaking.

## Data separation (Supabase)

- [ ] Network requests to `/rest/v1/…` send `Accept-Profile: spendless` /
      `Content-Profile: spendless` headers (the client is pinned to the `spendless` schema).
- [ ] `node scripts/check-migrations.mjs` passes (no migration touches `public`).
- [ ] Profile: upload a new photo, then remove it. Uploads go to `spendless-avatars`
      under your own `<user id>/` folder; a Google photo is never deleted.

## After a production deploy

- [ ] The GitHub Actions run is green and a `vYYYY.M.N` release was created.
- [ ] Profile shows the same version (`SpendLess · v2026.10.N (commit)`).
- [ ] https://spendless.ibexoft.com/privacy loads directly (SPA redirect works).
- [ ] Sign in, add a list item on one device, see it on another.
- [ ] Compare data (products, stores, cart) is still there.

## Accessibility & design

- [ ] Keyboard: every control is reachable with Tab and shows a visible focus ring.
- [ ] Icon-only buttons have labels (screen reader or `aria-label`).
- [ ] Touch targets are at least 44–48px.
- [ ] `node scripts/check-contrast.mjs` passes after any colour token change.
- [ ] With "reduce motion" enabled in the OS, animations are effectively off.

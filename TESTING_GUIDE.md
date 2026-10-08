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
On tablet and desktop, the sidebar's profile button (and "Get the app" card) stay pinned
and fully visible on a short window or with many lists; the nav above them scrolls.
When nav items are hidden, the nav fades at the edge and a **More ⌄** button sits at the
bottom (tap it to scroll down; a top fade appears once scrolled). Windows ≤860px tall
show the install card as a single "Install the app" row.

## Lists (default section)

- [ ] First sign-in lands on an empty **Groceries** list with "Tap to add" chips.
- [ ] Typing `bread` + Enter adds it; the field stays focused for the next item.
- [ ] Quantities parse: `2 milk` → Milk ×2, `milk x2`, `eggs 12`, `atta 10 kg`, `1kg sugar`.
- [ ] Adding an item that's already on the list bumps its quantity (toast says so).
- [ ] Typing shows suggestions (your history first, then common items) with their aisle.
- [ ] Pasting several lines (`- milk`, `1. bread`) adds them all.
- [ ] Items are grouped by aisle; unknown items go under **Other**.
- [ ] List options (⋯) → turning off **Group by aisle** shows one list in the order items were added
      (no aisle headings, one column on desktop), each item showing its aisle (dot + name) under its
      name with any note after a "·"; it stays off after a reload and offline, and turning
      it on brings the aisles back.
- [ ] Tapping the circle ticks an item → it moves to **In cart**, with **Undo**.
- [ ] Phone only: swipe right ticks, swipe left deletes (with Undo).
- [ ] Tapping an item opens details: rename, quantity, unit, aisle, note, delete.
- [ ] In details, the aisle row opens on the current aisle and can be scrolled freely (it doesn't
      jump back while you scroll or type); **Delete** / **Done** stay visible at the bottom even on a
      short window (the fields scroll above them).
- [ ] **Clear** hides ticked items; they still appear under **Often** next time.
- [ ] Shopping progress ("3 of 10 in cart") shows once something is ticked;
      ticking everything shows **All picked up**.
- [ ] List switcher: create, rename, delete lists; counts are right.

## App updates (new deploy)

- [ ] Build and serve version A (`npm run build && npm run preview`), open the app.
- [ ] Stop the server, change anything, rebuild and serve again (version B).
- [ ] Back in the open tab, switch away and back (or wait an hour): a toast at the top
      says **A new version is ready** with **Update** and a close button.
- [ ] **Update** reloads into version B (Profile shows the new version on a CI build);
      Lists data and unsynced changes are still there.
- [ ] Closing the toast hides it; closing every tab and reopening runs version B.
- [ ] With an update waiting, leaving the app for 30+ min and coming back applies it
      without a prompt.

## Installing the app

Use a production build (`npm run build && npm run preview`) — the dev server has no
service worker.
- [ ] Signed out: the sign-in screen shows **Install the app**; it opens the install sheet.
- [ ] Chrome/Edge (desktop or Android): **Install SpendLess** opens the browser's dialog;
      accepting shows "Installed!" and the app opens in its own window.
- [ ] Inside the installed app: no install button or banner; Profile → App says
      **Installed on this device**.
- [ ] Uninstall it, reload in the browser: the banner and **Install the app** come back
      and install it again.
- [ ] iPhone/iPad (Safari and Chrome): the sheet shows Share → Add to Home Screen steps;
      the banner shows on first visit, and closing the sheet or **Not now** hides it.
- [ ] Mac Safari shows File → Add to Dock; Firefox desktop shows the "other browser" tip.
- [ ] Signed in: Profile → App → **Install the app** (or **Install the app again**) works.
- [ ] Desktop (≥1100px): a **Get the app** card sits above the profile button; tablet
      (768–1099px) shows a download icon button there instead. Both open the install.
- [ ] Mobile Lists header shows a **Get app** pill next to ⋯ — but not while the banner
      is showing; after **Not now** on the banner the pill appears.

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

## Where to buy

- [ ] A list with open items shows the **Where to buy** chip; tapping it opens the plan.
      The walkthrough appears the first time (and can be replayed from Profile → Help).
- [ ] No city chosen yet: the plan asks for a city, then the stores to compare (Skip works).
- [ ] The plan shows Cheapest and, when they exist and differ, One stop, Delivered
      (online stores only) and Fewer stops; totals include delivery fees; savings compare
      with the best single store.
- [ ] "We picked these" lists assumed items; tapping one opens the item choice sheet
      (Exactly this one / *Brand*, similar size / Any brand, similar size). *Just this
      time* changes only this item; *Save as my usual* applies to every list.
- [ ] **Use this plan** returns to the list split by store, with a plan banner
      (Change / Clear), a Stores/Aisles switch and *Shop here* on each store.
      *Open* on an online store opens its website in a new tab.
- [ ] Renaming a planned item clears its plan and pinned product.
- [ ] Offline: the plan still opens from saved prices, with an offline note.
- [ ] Profile → Shopping features → Where to buy **off**: no chip, no store sections,
      lists look as before. Ask for prices shows "Coming soon".
- [ ] The **x** on the chip turns Where to buy off (with a toast saying where to turn it on).

## Compare

- [ ] The tab bar shows **Lists · Compare · Profile**; Compare has Prices · Stores ·
      Contribute (desktop: sidebar items + a top bar with search and the city).
- [ ] Prices: search, browse by aisle, your usuals; a product page shows prices at your
      stores and other stores with unit prices and how old each price is.
- [ ] Product page → **Add to list** adds it to the active list with that product pinned;
      adding it again bumps the quantity.
- [ ] Stores: choose your city; *Choose* picks the stores to compare (left as it is = the
      online stores and your own); add, edit and delete a store of your own (website must
      be http(s)).
- [ ] Contribute: find a product → add a price (or mark out of stock); "Not here? Add …"
      creates your own product (brand, type and size are read from the name), then asks
      for its price. Your products: add, edit, delete, and add/replace/remove a photo
      (stored in `spendless-product-images` under your `<user id>/` folder).
- [ ] A price more than 40% off the current price at a shared store says it's kept for you.
- [ ] Add a price: the store chips are the stores you compare; *Another store…* opens the
      store picker (Online / In a shop, search, branches grouped by chain).
- [ ] Offline, Compare shows the offline notice and saved prices; adding is disabled.
- [ ] Profile → Help → **How SpendLess works** opens the help topics; the "?" buttons in
      the plan open the matching topic.

## Receipts (Compare → Contribute → Add a receipt)

Use a recent order of your own (under 90 days). Nothing is uploaded: check the Network
tab — reading fetches only `/ocr/<version>/…` (first picture or scanned PDF only) and
`/pdf/<version>-legacy/…` (first PDF only); Save makes one `rpc/save_receipt` call (new
medicine products and all the prices, in one transaction) and re-reads those prices.
- [ ] **Screenshot or image**: pick one or more screenshots of one online order (more than
      6: the review says how many weren't read). The
      first time, "Get the receipt reader" shows the size (≈6 MB) and Data Saver / offline
      notes; *Download and read* shows progress, *Cancel* stops it. Later pictures don't ask.
- [ ] **Take a photo** (phone/tablet): the camera opens; a flat, well-lit till receipt
      reads; a blurry one says "We couldn't find any prices" with what to try.
- [ ] **PDF**: an order invoice PDF goes straight to the review (no reader download); a
      scanned PDF (pages that are pictures) asks for the reader first ("This PDF is a
      scan…"), then reads. A password-protected PDF says "This PDF is locked"; a damaged
      one "We couldn't open that PDF"; over 10 MB "This PDF is too big"; on an old
      browser (before Chrome 125 / Safari 18) "PDFs can't be read on this browser".
      The first PDF while offline says "The reader didn't start"; *Try again* works once
      back online.
- [ ] **Paste text**: an order email's text reads the same way.
- [ ] Review: store, date and "Adds up" chips. Online orders pick the online store;
      in-store receipts never go to the online store (the store picker opens instead).
      *Where was this?* → Online / In a shop, search, *Add a shop that isn't listed*
      (private, only you see its prices).
- [ ] Ready lines are ticked; *Check this* (cut-off names, unsure, hard to read) and
      *Which product is this?* lines aren't. *Choose* → suggestions, search, *Add as my
      product*, *Not a product*, "Remember this for …". Tap a line to edit its price for
      one, quantity bought, and *Save this price*.
- [ ] A pharmacy receipt puts medicines under **Medicines · only for you**; saving makes
      them your own products (another account can't see them or their prices). Saving
      a medicine again — the same receipt, another shop, another device — reuses that
      product (Compare → Contribute → Your products shows it once).
- [ ] When a save is refused (daily limit, a date over 90 days), no new products appear
      under Your products.
- [ ] *Save N prices* → "N prices saved" with what was shared, kept for you (far from the
      usual price), remembered, and not added. **Undo** takes them back and returns to
      the review. Adding the same receipt again shows its lines under **Already added**,
      and lines you chose last time match on their own.
- [ ] A receipt older than 90 days says "Too old to add", with *Wrong date?*.
- [ ] Offline at review: "Connect to save N prices" (nothing lost); back online, Save works.
- [ ] Leave the screen while reading or reviewing: Contribute shows *Finish your
      receipt*, and the review is still there. An app update doesn't auto-reload while
      a receipt is open.
- [ ] Profile → Shopping features → Receipt import **off**: Contribute's card says it's
      off and opens Profile; the screen shows "Receipt import is off" with *Turn on*.
- [ ] Sign out and back in: remembered choices are gone (IndexedDB
      `spendless-receipts-<uid>` deleted).

### Share to SpendLess (installed app on Android)

Needs a deployed build, installed from Chrome. Android picks up a changed share menu
when the installed app is opened and its manifest is a day old, or on a fresh install.
- [ ] Gallery → a screenshot → Share → SpendLess: the app opens with "Read this
      receipt?" ("You shared 1 image…"); *Read receipt* reads it (asking for the reader
      the first time); *Not now* drops it.
- [ ] Files or WhatsApp → a PDF invoice → Share → SpendLess: "You shared a PDF…" → review.
- [ ] Share a PDF and a screenshot together: "You shared 1 image and a PDF…" → one review
      with the items from both. More than 6 pages and pictures in all: the review says
      "Only the first 6 pages were read · N more weren't". Two different orders shared
      together: the review says "1 file wasn't added" (a separate receipt). Files shared
      with text: the sheet says the text isn't read.
- [ ] Gmail → an order email → Share (text) → SpendLess: "You shared some text…" → review.
- [ ] Share while signed out: sign in, and the question is still asked (within 30 minutes).
- [ ] Sharing reloads the app: an unsaved receipt you were checking is gone (expected).
- [ ] Profile → Shopping features → Receipt import off: the sheet offers *Turn on and read*.
- [ ] Sign out with a share waiting: it's gone (Cache Storage `spendless-share-inbox`).
- [ ] iPhone: SpendLess isn't in the share menu (no web share target on iOS); the PDF
      tile and Paste text work.

## Store price import

- [ ] Dry run of each changed source (no database needed):
      `NODE_USE_ENV_PROXY=1 node --experimental-strip-types scripts/import/run.ts --dry-run --source <id> --max-pages 20`
      — robots.txt line shows the group used; type, size and match-key coverage look sane;
      the sample prices match the store's website; pharmacy/cosmetics aisles are "left out".
- [ ] Against a local copy of the schema (`SUPABASE_DB_URL=…`), run a source twice: the
      second run reports `changed 0` and `new_products 0`, and adds no rows to `price_reports`.
- [ ] As `anon`/`authenticated`, `select` from `spendless.store_listings` and
      `spendless.import_runs` is refused.
- [ ] `/bot` loads (also signed out) and its contact links carry `utm_content=bot_page`.
- [ ] After the first real run: Compare → Stores lists the new Karachi stores with their
      delivery fees, and Where to buy can pick them.

## In-store branches (Karachi)

- [ ] Catalog jobs → `add-branches` dry run against a local copy of the schema
      (`SUPABASE_DB_URL=… node --experimental-strip-types scripts/seed/add-branches.ts`)
      lists 26 new; `--apply` adds them; a second run says "Nothing to write"; a branch set
      to `"status": "closed"` reports one change. A file outside `scripts/seed/branches/`,
      a duplicate id, an 81-character name, or a chain with no public online store in the
      city is refused before anything is written.
- [ ] Compare → Stores: *Online in Karachi*, then *Branches · 26* with a search and one
      card per chain ("Imtiaz · 14 branches"); a card opens on tap; searching "gulshan"
      shows Imtiaz · Gulshan. Each branch says "In My stores" or "Not compared".
- [ ] A branch's sheet shows its address (or that none is published) and phone, and
      *Add to My stores* / *Remove from My stores*.
- [ ] With nothing picked, Where to buy compares the online stores (and your own) only.
      *Choose* → *In a shop near you* → tick a branch → Save: plans can now use it, and
      the header says "Comparing N of M". Unticking it again saves no picks.
- [ ] A product page lists branch prices under *Other stores*: the cheapest 6, then
      *Show all N*; "Out of stock lately at" lists three names, then "+N more".
- [ ] A till receipt from Imtiaz that prints "Nazimabad" picks Imtiaz · Nazimabad; one
      that names only the chain opens *Where was this?* on the Imtiaz branches.

## Shared shops (suggested by people)

Use generic test accounts and shops only. The job runs as a rehearsal (rolled back)
unless `--apply` is given.

- [ ] Compare → Stores → edit one of your in-store shops: *Share this shop* (not on an
      online shop, nor in a city without shared prices). The sheet prefills the shop's
      name and the area its address starts with; typing "joh" offers Gulistan-e-Jauhar.
      The preview reads "Shared as <shop> · <area>" with what's shared; the copy says
      "enough people", never a number.
- [ ] Picking a chain with shared shops (Imtiaz) lists them under *Already shared*;
      "That's my shop" (or an area that matches one) turns the button into *Move my
      shop into it*.
- [ ] After *Suggest this shop*, the shop's sheet says "Suggested as …" with *Withdraw*
      and its row on Stores shows *Suggested*; *Withdraw* brings *Share this shop* back.
      A shop without a city gets the current one first. Offline, the button is disabled.
- [ ] A receipt saved at your own shop: the "just for you" banner has *Share this shop*.
- [ ] As a signed-in user (RLS), against a local copy of the schema: suggesting someone
      else's, a shared, an online or a closed shop, or one in a city that isn't live, is
      refused (42501); a second suggestion for the same shop is refused (23505); the
      11th waiting one is refused (54000); names with "·", a web address, a phone number
      or control characters are refused (23514); a client-sent status, user or city is
      overridden; updates change nothing; a promoted suggestion can't be withdrawn.
- [ ] `SUPABASE_DB_URL=… node --experimental-strip-types scripts/seed/promote-suggestions.ts
      [--min-people N]`: one person fewer than the minimum → nothing; reaching it → a new
      shared shop; an account or shop under 7 days old, a suggestion under a day old, or
      prices for fewer than 3 products don't count. A suggestion matching an existing
      shared shop moves into it (once it's a day old), whatever the minimum; one matching a closed shared shop is declined.
- [ ] After `--apply`: each person's latest prices there are copied to the shared shop
      (`created_at` ≥ 25 h back, an outlier `pending`), their own products' prices stay
      visible to them only, My stores swaps only where the shop was picked, planned list
      items point at the shared shop, the private copy is closed, and a second run adds
      nothing. A planned item set back to the old shop is re-pointed on the next run.
- [ ] In the app afterwards: "Your shop is now shared" shows once on Prices (and Stores);
      *See the shop* opens it with *Remove from My stores* (a user without picks has it in
      the default set); Contribute's count doesn't double; a receipt never picks the
      closed copy; the product page shows no prices at the closed copy.
- [ ] `close-branch.ts --store-id <id>` (dry run, then `--apply`): the shop closes,
      private copies reopen, picks and list items go back, suggestions are declined, and
      the next nightly run declines new suggestions for that shop.

## Price checks (held prices, Wrong price?, reporter trust)

Use generic test accounts. Against a local copy of the schema unless noted.

- [ ] A price more than 40% from a shared store's current price is saved as held: the
      toast says "Saved for you … counts for everyone once someone else sees the same",
      the product page row says "your price" with "Only you for now", and other people
      still see the old price.
- [ ] A second account reports within 10% of it (within 14 days): both reports become
      `accepted` at once and the shared price moves; the first account's row loses
      "Only you for now" after a refresh. More than 10% apart, more than 14 days apart, or
      the same account again: still held. An import report at about the same price
      accepts it too.
- [ ] Product page → *Wrong price?* (only on a shared store's price, not your own price or
      shop; disabled offline): *It's a different price* saves a normal price (held when
      far off); *They don't sell it any more* marks it out of stock; *It's wrong, I don't
      know the price* says "once someone else says so too…".
- [ ] A second account says the same price is wrong: the toast says it's now marked, the
      row is listed last with "Some people say this is wrong" and no BEST badge, and the
      price is left out of Where to buy, Prices and Search (the user's own newer price
      there still counts). A newer price (or the next import's) clears it.
- [ ] `SUPABASE_DB_URL=… node --experimental-strip-types scripts/seed/reporter-trust.ts`
      (dry run, then `--apply`): fewer than 5 comparable prices → weight 1; an account
      whose prices match others' → up to 1.2; one whose prices are far off → down to 0.5;
      one wrong account can't pull down people who agree with everyone else. The log
      shows counts only. `reporter_trust` can't be read as `anon` or `authenticated`,
      nor can they run `refresh_current_prices()`.

## Upgrading an existing account

- [ ] An account with an old Compare cart gets a new list "From Compare cart" (once, with
      pinned products and quantities); its old stores, products and prices appear as
      private ones.
- [ ] "New: Where to buy" shows once for an account with earlier activity, and never for
      a new account.

## Support link

- [ ] **Contact support** opens https://ibexoft.com/contact in a new tab with
      `utm_source=spendless&utm_medium=referral&utm_campaign=support` and `utm_content`
      `auth` (sign-in screen), `site_footer` (Pricing/Privacy/Refund/Terms footer),
      `app_profile` (Profile → Help), or `pricing_page` / `privacy_page` / `refund_page` /
      `bot_page` (the "Contact us" links in those pages' text). No page shows an email address.
- [ ] Sign-in screen: "By continuing you agree to Terms & Privacy Policy" links to the
      app's own `/terms` and `/privacy` pages (new tab).

## Data separation (Supabase)

- [ ] Network requests to `/rest/v1/…` send `Accept-Profile: spendless` /
      `Content-Profile: spendless` headers (the client is pinned to the `spendless` schema).
- [ ] `node scripts/check-migrations.mjs` passes (no migration touches `public`).
- [ ] Profile: upload a new photo, then remove it. Uploads go to `spendless-avatars`
      under your own `<user id>/` folder; a Google photo is never deleted.

## After a production deploy

- [ ] The GitHub Actions run is green and a `vYYYY.M.N` release was created.
- [ ] Profile shows the same version (`SpendLess · v2026.10.N (commit)`).
- [ ] https://spendless.ibexoft.com/privacy and `/bot` load directly (SPA redirect works).
- [ ] Sign in, add a list item on one device, see it on another.
- [ ] Compare data (your stores, products and prices) is still there; an old cart is now
      the "From Compare cart" list.

## Accessibility & design

- [ ] Keyboard: every control is reachable with Tab and shows a visible focus ring.
- [ ] Icon-only buttons have labels (screen reader or `aria-label`).
- [ ] Touch targets are at least 44–48px.
- [ ] `node scripts/check-contrast.mjs` passes after any colour token change.
- [ ] With "reduce motion" enabled in the OS, animations are effectively off.

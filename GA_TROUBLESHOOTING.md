# Google Analytics Troubleshooting Guide

## What Was Fixed

The Google Analytics integration has been completely rebuilt to:
1. **Load directly in HTML** - gtag script now loads in the HTML `<head>` before React
2. **Bypass Cloudflare Rocket Loader** - Using `data-cfasync="false"` to prevent interference
3. **Environment variable replacement** - Vite plugin replaces `__GA_MEASUREMENT_ID__` at build time
4. **Comprehensive logging** - Debug messages to verify initialization

### The Cloudflare Rocket Loader Problem
Your site uses Cloudflare Rocket Loader which delays JavaScript execution. The new implementation bypasses this using `data-cfasync="false"` so Google Analytics loads immediately.

## Critical Requirements

### Environment Variable
Your hosting platform **MUST** have this environment variable set:
```
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Replace `G-XXXXXXXXXX` with your actual Google Analytics 4 Measurement ID.

### Where to Set Environment Variables

**For most hosting platforms (Vercel, Netlify, etc.):**
1. Go to your project settings
2. Find "Environment Variables" section
3. Add: `VITE_GA_MEASUREMENT_ID` = `your-actual-GA-ID`
4. Redeploy your site

## How to Verify It's Working

### Step 1: Check View Source
1. Visit https://spendless.ibexoft.com
2. Right-click → "View Page Source"
3. Look in the `<head>` section for:
   ```html
   <script data-cfasync="false">
     (function() {
       var gaId = 'G-XXXXXXXXXX';
   ```
4. **If `gaId` is empty (`var gaId = '';`)**, the environment variable is not set!

### Step 2: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for:
   ```
   Analytics Context: { gtagExists: true, ... }
   Google Analytics already loaded from HTML
   ```

### Step 3: Check Network Requests
1. In DevTools, go to Network tab
2. Filter by "gtag" or "google-analytics"
3. You should see requests to:
   - `https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`
   - `https://www.google-analytics.com/g/collect`

### Step 4: Check Google Analytics Dashboard
1. Go to https://analytics.google.com
2. Select your property
3. Go to Reports → Realtime
4. Open your site in another tab
5. You should see your visit appear within 30 seconds

## Common Issues

### Issue 1: "CRITICAL: VITE_GA_MEASUREMENT_ID environment variable is not set!"
**Solution:** The environment variable is missing. Add it to your hosting platform's environment variables.

### Issue 2: No network requests to Google Analytics
**Solution:** Check if the measurement ID is correct and not empty.

### Issue 3: Requests blocked by ad blocker
**Solution:** Disable ad blocker temporarily to test. This is expected behavior for users with ad blockers.

### Issue 4: Old build cached
**Solution:**
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check deployment timestamp to ensure new build is deployed

## Testing Locally

To test Google Analytics in development:
1. Add to your `.env` file:
   ```
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   VITE_GA_ENABLE_IN_DEV=true
   ```
2. Run `npm run dev`
3. Check console for initialization messages

## Next Steps

1. **Verify environment variable is set** on your hosting platform
   - Make sure `VITE_GA_MEASUREMENT_ID` is set to your actual GA4 measurement ID (e.g., `G-ABC123XYZ`)
2. **Redeploy** your site to pick up the code changes
3. **Check view source** first (Step 1 above) - this is the fastest way to verify the GA ID is in the HTML
4. **Check browser console** for the diagnostic messages (Step 2 above)
5. **Test in Google Analytics** realtime view (Step 4 above)

## Quick Diagnosis

**Problem**: View source shows `var gaId = '';` (empty)
**Solution**: Environment variable not set or not picked up during build. Verify `VITE_GA_MEASUREMENT_ID` in hosting platform and redeploy.

**Problem**: View source shows correct GA ID but no network requests
**Solution**: Ad blocker is blocking requests. Test in incognito mode without extensions.

**Problem**: Network requests happening but not showing in GA dashboard
**Solution**: Check that the GA ID in the HTML matches your GA property. There may be a 5-10 minute delay for first-time setup.

If you still see issues after following these steps, share the view source HTML and console output for further debugging.

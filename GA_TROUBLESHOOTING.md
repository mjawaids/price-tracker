# Google Analytics Troubleshooting Guide

## What Was Fixed

The Google Analytics integration has been updated to:
1. Load the gtag.js script dynamically from JavaScript
2. Add comprehensive console logging to debug initialization
3. Verify the measurement ID is properly set

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

### Step 1: Check Browser Console
1. Visit https://spendless.ibexoft.com
2. Open browser DevTools (F12)
3. Go to Console tab
4. Look for these messages:
   ```
   Analytics Context: { measurementId: "G-XXX...", isDevelopment: false, ... }
   Initializing Google Analytics with ID: G-XXXXXXXXXX
   Google Analytics initialized successfully
   Google Analytics setup complete
   ```

### Step 2: Check Network Requests
1. In DevTools, go to Network tab
2. Filter by "gtag" or "google-analytics"
3. You should see requests to:
   - `https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`
   - `https://www.google-analytics.com/g/collect`

### Step 3: Check Google Analytics Dashboard
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
2. **Redeploy** your site to pick up the code changes
3. **Check browser console** for the diagnostic messages above
4. **Test in Google Analytics** realtime view

If you still see issues after following these steps, share the console output and I can help further debug.

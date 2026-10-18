// OneSignal web push worker (still-to-buy reminders, src/lib/onesignal.ts). Registered
// with scope /onesignal/ so it never meets the app's own sw.js. Loaded from OneSignal's
// CDN: the one exception to "no scripts from CDNs" (CLAUDE.md → Security).
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

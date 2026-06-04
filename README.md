# SpendLess - Smart Shopping Price Comparison App

A modern, mobile-first price comparison and shopping management application built with React, TypeScript, and Supabase. Track prices across multiple stores, build smart shopping plans, and never overpay again.

> Formerly referred to as "PriceTracker" — the product is now branded **SpendLess**.

## ✨ Features

### 🛍️ Smart Price Tracking
- Track products and their prices across multiple stores
- Real-time price comparison with visual best-price indicators
- Per-store availability and delivery rules

### 📝 Smart Shopping Plans
- Build shopping lists and turn them into optimized plans
- Automatic store-by-store cost optimization (including delivery fees)
- Cart and plan screens for organizing what to buy and where

### 🏪 Store Management
- Support for both physical and online stores
- Delivery fee and delivery-rule tracking
- Store-specific pricing and availability

### 🎨 Beautiful Design
- Warm "paper" light theme with a magenta accent and custom design tokens
- Mobile-first, fully responsive layout with an adaptive app shell
- Custom typography (Bricolage Grotesque, Hanken Grotesk, Space Mono)
- Smooth animations and micro-interactions

### 📲 Installable PWA
- Web app manifest with maskable icons for Android/Chrome
- Apple touch icon and full favicon set for all devices
- Installable to the home screen with a branded splash screen

### 🔐 Secure & Private
- User authentication with Supabase Auth
- Row-level security (RLS) for all user data
- Privacy-first approach

### 🌍 Multi-Currency Support
- Support for 50+ global currencies
- Automatic currency detection based on locale
- Consistent price formatting across the app

### 📈 Analytics
- Optional Google Analytics integration (configurable via environment variables)

## 🚀 Live Demo

Visit the live application: [https://spendless.ibexoft.com](https://spendless.ibexoft.com)

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript
- **Routing**: React Router (marketing & legal pages)
- **Styling**: Tailwind CSS with custom design tokens (OKLCH color system)
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Analytics**: Google Analytics (gtag, optional)
- **Deployment**: Netlify

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 18 or higher)
- npm or yarn package manager
- Git

## 🔧 Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/mjawaids/price-tracker.git
cd price-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory (see `.env.example`) and add your credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Analytics Configuration (optional)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_GA_ENABLE_IN_DEV=false
```

You can find the Supabase values in your project dashboard under **Settings > API**.

### 4. Database Setup

The application uses Supabase as the backend. The core schema includes:

- **products**: Product catalog with flattened per-store pricing
- **stores**: Store information (physical and online) with delivery rules
- **shopping_lists**: User shopping lists and plan items

User profile data (name, avatar) is stored in Supabase Auth `user_metadata`,
so no separate profiles table is required by the app.

Migrations live in `supabase/migrations` and are applied when you connect to Supabase. They include proper RLS policies for every table.

### 5. Google Sign-In & Auth Security

Users can register and sign in with **email/password** or **Google**. A Google
login automatically links to an existing account with the same address via
Supabase's built-in identity linking (only when the email is verified), so users
don't end up with duplicate accounts.

The frontend uses only the **public anon key** — all data access is gated by
Row-Level Security, so the anon key cannot read or modify anyone's data on its
own. Never put the `service_role` key in the frontend.

#### One-time configuration

Google OAuth requires provider setup in the Google Cloud and Supabase dashboards
(these are not stored in this repo):

1. **Google Cloud Console** → APIs & Services → Credentials → create an OAuth
   client ID (type: *Web application*). Configure the consent screen, then set
   the **Authorized redirect URI** to your Supabase callback:
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback`. Copy the **Client ID**
   and **Client Secret**.
2. **Supabase** → Authentication → Providers → **Google**: enable it and paste
   the Client ID + Secret.
3. **Supabase** → Authentication → URL Configuration:
   - **Site URL**: your production URL (e.g. `https://spendless.ibexoft.com`)
   - **Redirect URLs**: add only your own domains (e.g.
     `https://spendless.ibexoft.com/**` and `http://localhost:5173/**`).

#### Security checklist (verify before going live)

- [ ] **Google redirect URI** is restricted to the Supabase callback only — this
      stops anyone from reusing your Google credentials in a different app.
- [ ] **Supabase Redirect URLs** list contains only your domains (no broad
      wildcards) — prevents OAuth open-redirect / session-token theft.
- [ ] **Confirm email** is ON (Authentication → Providers → Email) — required for
      safe automatic account linking; blocks account pre-hijacking.
- [ ] **RLS** is enabled on every table (it is, by default in the migrations).
- [ ] **CAPTCHA + rate limits** enabled (Authentication → Attack Protection) to
      deter abuse of the public anon key.
- [ ] The `service_role` key is **never** referenced in frontend code or `.env`
      files prefixed with `VITE_`.

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 7. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` directory.

### 8. Regenerate App Icons (optional)

Favicons and PWA icons are generated from the SVG sources in `public/`
(`favicon.svg` and `icon-maskable.svg`). After editing a source SVG, run:

```bash
npm run generate:icons
```

This produces the `.ico`, PNG favicons, apple-touch-icon, and maskable PWA
icons used by `index.html` and `public/site.webmanifest`.

## 🚀 Deployment

### Deploy to Netlify (Recommended)

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Connect your repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Add environment variables in the Netlify dashboard

3. **Environment Variables**:
   Add the following in your Netlify dashboard:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

### Deploy to Other Platforms

The application can be deployed to any static hosting service:

- **Vercel**: Connect repository and deploy
- **GitHub Pages**: Use GitHub Actions for automated deployment
- **AWS S3 + CloudFront**: Upload build files to S3 bucket
- **Firebase Hosting**: Use Firebase CLI to deploy

## 📁 Project Structure

```
public/                     # Static assets (favicons, PWA icons, manifest)
scripts/
└── generate-icons.mjs      # Generates favicon/PWA icons from SVG sources
src/
├── App.tsx                 # App root (auth gate + shell)
├── main.tsx                # Entry point + React Router routes
├── index.css               # Global styles, design tokens & Tailwind
├── components/
│   ├── shell/Shell.tsx     # Adaptive app shell (sidebar/nav + screens)
│   ├── screens/            # Feature screens
│   │   ├── AuthScreen.tsx      # Sign in / sign up
│   │   ├── BrowseScreen.tsx    # Browse products
│   │   ├── SearchScreen.tsx    # Search
│   │   ├── CartScreen.tsx      # Cart
│   │   ├── PlanScreen.tsx      # Optimized shopping plan
│   │   ├── DetailScreen.tsx    # Product detail
│   │   ├── ManageScreens.tsx   # Manage products / stores / prices
│   │   └── ProfileScreen.tsx   # User profile & settings
│   ├── ui/                 # Reusable UI primitives (Icon, Sheet, etc.)
│   ├── PageHeader.tsx      # Header for marketing/legal pages
│   └── PageFooter.tsx      # Footer with developer credits
├── pages/                  # Standalone routed pages
│   ├── Pricing.tsx
│   ├── Privacy.tsx
│   ├── Refund.tsx
│   └── Terms.tsx
├── contexts/               # React contexts
│   ├── AuthContext.tsx         # Authentication state
│   ├── AppContext.tsx          # App/navigation & cart state
│   ├── ThemeContext.tsx        # Theme management
│   ├── SettingsContext.tsx     # User settings
│   └── AnalyticsContext.tsx    # Analytics wiring
├── hooks/                  # Custom React hooks
│   ├── useSupabaseData.ts      # Supabase data management
│   ├── useBreakpoint.ts        # Responsive breakpoints
│   └── useFmt.ts               # Formatting helpers
├── lib/                    # Library configuration & data
│   ├── supabase.ts             # Supabase client setup
│   ├── supabaseClient.ts       # Supabase client instance
│   └── categories.ts           # Product categories
├── utils/                  # Utility functions
│   ├── currency.ts             # Currency formatting
│   ├── optimizer.ts            # Shopping plan optimization
│   ├── analytics.ts            # Analytics helpers
│   └── storage.ts              # Local storage utilities
└── types/
    └── index.ts            # TypeScript type definitions
```

## 🎨 Customization

### Theme & Design Tokens
SpendLess ships a single warm light theme. Colors are defined as OKLCH design
tokens (CSS variables) and surfaced to Tailwind via `tailwind.config.js`:
- `src/index.css` — design tokens, global styles and Tailwind layers
- `tailwind.config.js` — Tailwind theme mapping (colors, fonts, radii)

### App Icons
Edit `public/favicon.svg` (and `public/icon-maskable.svg`) and run
`npm run generate:icons` to regenerate the full icon set.

### Currencies
Add or modify supported currencies in `src/utils/currency.ts`. The app
automatically detects user locale and sets an appropriate default currency.

### Database Schema
Modify the schema by adding migration files in `supabase/migrations/`. Follow
the existing naming convention and include proper RLS policies.

## 🧪 Testing

Run the linter:
```bash
npm run lint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Made with ❤️ by [Jawaid](https://jawaid.dev)
- Powered by 🚀 [Ibexoft](https://ibexoft.com)
- Icons by [Lucide](https://lucide.dev)
- UI styled with [Tailwind CSS](https://tailwindcss.com)
- Backend powered by [Supabase](https://supabase.com)

## 📞 Support

For support, email support@jawaid.dev or create an issue in the repository.

---

**Made with passion for smart shoppers everywhere** 🛒✨

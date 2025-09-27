# PriceTracker - Smart Shopping Price Comparison App

A modern, full-featured price comparison and shopping management application built with React, TypeScript, and Supabase. Track prices across multiple stores, create intelligent shopping lists, and never overpay again.

## ✨ Features

### 🛍️ Smart Price Tracking
- Track products across multiple stores and variants
- Real-time price comparison with visual indicators
- Price history and trend analysis
- Automatic best price detection

### 📝 Intelligent Shopping Lists
- Create and manage multiple shopping lists
- Automatic price optimization for your lists
- Priority-based item organization
- Store-grouped shopping recommendations

### 🏪 Store Management
- Support for both physical and online stores
- Delivery tracking and radius management
- Store-specific pricing and availability

### 🎨 Beautiful Design
- Modern glass morphism UI with gradient backgrounds
- Fully responsive design for all devices
- Dark/light mode with system preference detection
- Smooth animations and micro-interactions

### 🔐 Secure & Private
- User authentication with Supabase Auth
- Row-level security for all user data
- Encrypted data storage
- Privacy-first approach

### 🌍 Multi-Currency Support
- Support for 50+ global currencies
- Automatic currency detection based on locale
- Consistent price formatting across the app

## 🚀 Live Demo

Visit the live application: [https://velvety-rabanadas-f4e189.netlify.app](https://velvety-rabanadas-f4e189.netlify.app)

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Deployment**: Netlify
- **Styling**: Tailwind CSS with custom glass morphism effects

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 18 or higher)
- npm or yarn package manager
- Git

## 🔧 Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd price-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory and add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project dashboard under Settings > API.

### 4. Database Setup

The application uses Supabase as the backend. The database schema includes:

- **profiles**: User profile information
- **products**: Product catalog with variants and specifications
- **stores**: Store information (physical and online)
- **shopping_lists**: User shopping lists with items
- **accounts**: Financial account tracking (if using financial features)
- **transactions**: Transaction history
- **goals**: Financial goals tracking

The database migrations are included in the `supabase/migrations` directory and will be automatically applied when you connect to Supabase.

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 6. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` directory.

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
   - Add environment variables in Netlify dashboard

3. **Environment Variables**:
   Add the following environment variables in your Netlify dashboard:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Deploy to Other Platforms

The application can be deployed to any static hosting service:

- **Vercel**: Connect repository and deploy
- **GitHub Pages**: Use GitHub Actions for automated deployment
- **AWS S3 + CloudFront**: Upload build files to S3 bucket
- **Firebase Hosting**: Use Firebase CLI to deploy

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── AddProduct.tsx   # Product creation form
│   ├── AddStore.tsx     # Store creation form
│   ├── AuthModal.tsx    # Authentication modal
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Navigation.tsx   # Navigation bar
│   ├── ProductList.tsx  # Product listing
│   ├── ShoppingList.tsx # Shopping list management
│   └── ...
├── contexts/           # React contexts
│   ├── AuthContext.tsx # Authentication state
│   ├── ThemeContext.tsx # Theme management
│   └── SettingsContext.tsx # User settings
├── hooks/              # Custom React hooks
│   └── useSupabaseData.ts # Supabase data management
├── lib/                # External library configurations
│   └── supabase.ts     # Supabase client setup
├── types/              # TypeScript type definitions
│   └── index.ts        # Main type definitions
├── utils/              # Utility functions
│   ├── currency.ts     # Currency formatting
│   ├── price-comparison.ts # Price comparison logic
│   └── storage.ts      # Local storage utilities
└── styles/
    └── index.css       # Global styles and Tailwind
```

## 🎨 Customization

### Themes
The application supports light, dark, and system themes. You can customize the theme colors in:
- `src/index.css` - Global CSS variables and Tailwind customizations
- `tailwind.config.js` - Tailwind theme configuration

### Currencies
Add or modify supported currencies in `src/utils/currency.ts`. The application automatically detects user locale and sets appropriate default currency.

### Database Schema
Modify the database schema by creating new migration files in `supabase/migrations/`. Follow the existing naming convention and include proper RLS policies.

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

- Built with ❤️ by [Jawaid.dev](https://jawaid.dev)
- Powered by [Ibexoft](https://ibexoft.com)
- Icons by [Lucide](https://lucide.dev)
- UI components styled with [Tailwind CSS](https://tailwindcss.com)
- Backend powered by [Supabase](https://supabase.com)

## 📞 Support

For support, email support@jawaid.dev or create an issue in the repository.

---

**Made with passion for smart shoppers everywhere** 🛒✨
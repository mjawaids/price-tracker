import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AnalyticsProvider } from './contexts/AnalyticsContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { AppProvider } from './contexts/AppContext';
import AuthScreen from './components/screens/AuthScreen';
import Shell from './components/shell/Shell';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper text-ink">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-ink-soft text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ height: '100dvh' }} className="bg-paper text-ink">
        <AuthScreen />
      </div>
    );
  }

  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function App() {
  return (
    <AnalyticsProvider>
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <OnboardingProvider>
              <AppContent />
            </OnboardingProvider>
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    </AnalyticsProvider>
  );
}

export default App;

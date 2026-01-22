import React from 'react';

const AppFooter: React.FC = () => {
  return (
    <>
      {/* Credits Bar - Desktop Only */}
      <div className="hidden md:block glass-card border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-2 text-center">
            <p className="text-white/60 text-xs">
              Made with <span className="text-red-500 animate-pulse">❤️</span> by{' '}
              <a 
                href="https://jawaid.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white font-medium transition-colors duration-200 hover:underline"
              >
                Jawaid.dev
              </a>
              {' '}• Crafted with passion for smart shoppers everywhere
            </p>
          </div>
        </div>
      </div>

      {/* Legal & Info Links - Desktop Only */}
      <footer className="hidden md:block glass-card border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex flex-col md:flex-row items-center justify-center md:justify-between gap-3">
            <div className="text-white/60 text-sm">© {new Date().getFullYear()} SpendLess</div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <a href="/pricing" className="text-white/70 hover:text-white hover:underline">Pricing</a>
              <a href="/privacy" className="text-white/70 hover:text-white hover:underline">Privacy Policy</a>
              <a href="/refund" className="text-white/70 hover:text-white hover:underline">Refund Policy</a>
              <a href="/terms" className="text-white/70 hover:text-white hover:underline">Terms & Conditions</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default AppFooter;
import React from 'react';
import { ShoppingCart } from 'lucide-react';

const PageFooter: React.FC = () => {
  return (
    <footer className="bg-black/40 backdrop-blur-sm text-white py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <span className="ml-2 text-xl font-bold">SpendLess</span>
          </div>
          <div className="text-white/60 text-sm">
            © {new Date().getFullYear()} SpendLess. All rights reserved.
          </div>
        </div>
        
        {/* Credits Section */}
        <div className="border-t border-white/20 pt-8">
          <div className="text-center">
            <p className="text-white/60 text-sm mb-2">
              Made with <span className="text-red-500 animate-pulse">❤️</span> by{' '}
              <a 
                href="https://jawaid.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white font-medium transition-colors duration-200 hover:underline"
              >
                Muhammad Jawaid Shamshad
              </a>
            </p>
            <p className="text-white/50 text-xs">
              Crafted with passion for smart shoppers everywhere
            </p>
          </div>
        </div>

        {/* Legal & Info Links */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
            <a href="/pricing" className="text-white/70 hover:text-white hover:underline">Pricing</a>
            <a href="/privacy" className="text-white/70 hover:text-white hover:underline">Privacy Policy</a>
            <a href="/refund" className="text-white/70 hover:text-white hover:underline">Refund Policy</a>
            <a href="/terms" className="text-white/70 hover:text-white hover:underline">Terms & Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PageFooter;
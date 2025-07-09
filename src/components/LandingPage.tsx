import React from 'react';
import { ShoppingCart, TrendingDown, Shield, Smartphone, Users, Star, ArrowRight, Check } from 'lucide-react';

interface LandingPageProps {
  onShowAuth: (mode: 'signin' | 'signup') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onShowAuth }) => {
  const features = [
    {
      icon: TrendingDown,
      title: 'Smart Price Tracking',
      description: 'Track prices across multiple stores and get alerts when prices drop on your favorite items.'
    },
    {
      icon: ShoppingCart,
      title: 'Intelligent Shopping Lists',
      description: 'Create smart shopping lists that automatically find the best deals and optimize your shopping route.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is encrypted and secure. We never share your shopping habits with third parties.'
    },
    {
      icon: Smartphone,
      title: 'Works Everywhere',
      description: 'Access your price comparisons on any device, anywhere. Fully responsive and mobile-optimized.'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Busy Mom',
      content: 'PriceTracker has saved me over $200 this month alone! I love how it finds the best deals automatically.',
      rating: 5
    },
    {
      name: 'Mike Chen',
      role: 'Tech Enthusiast',
      content: 'Finally, a price comparison tool that actually works. The interface is clean and the features are powerful.',
      rating: 5
    },
    {
      name: 'Emma Rodriguez',
      role: 'Budget Conscious Shopper',
      content: 'The shopping list optimization is incredible. It saves me time and money on every grocery trip.',
      rating: 5
    }
  ];

  const pricingFeatures = [
    'Unlimited product tracking',
    'Smart shopping lists',
    'Price drop alerts',
    'Multi-store comparison',
    'Mobile app access',
    'Data export',
    'Priority support'
  ];

  return (
    <div className="min-h-screen animated-gradient">
      {/* Navigation */}
      <nav className="glass-card border-b border-white/20 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">PriceTracker</span>
              <span className="ml-2 text-xl font-bold text-white">PriceTracker</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onShowAuth('signin')}
                className="text-white/70 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/10 backdrop-blur-sm"
              >
                Sign In
              </button>
              <button
                onClick={() => onShowAuth('signup')}
                className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm border border-white/20"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Never Overpay
              <span className="text-yellow-300"> Again</span>
            </h1>
            <p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed">
              Compare prices across thousands of stores, create smart shopping lists, and save money on everything you buy. 
              Join millions of smart shoppers who trust PriceTracker.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => onShowAuth('signup')}
                className="bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2 backdrop-blur-sm border border-white/20"
              >
                <span>Start Saving Today</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => onShowAuth('signin')}
                className="border-2 border-white/30 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:border-white/50 hover:bg-white/10 transition-all duration-200 backdrop-blur-sm"
              >
                Sign In
              </button>
            </div>
            <p className="text-sm text-white/60 mt-4">Free to start • No credit card required</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything You Need to Save Money
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Powerful features designed to help you find the best deals and optimize your shopping experience.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center group hover:transform hover:scale-105 transition-all duration-200">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-4 group-hover:shadow-lg transition-shadow duration-200 border border-white/20">
                  <feature.icon className="h-8 w-8 text-white mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/70 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="text-white">
              <div className="text-4xl font-bold mb-2">$2.5M+</div>
              <div className="text-white/70">Total Savings</div>
            </div>
            <div className="text-white">
              <div className="text-4xl font-bold mb-2">50K+</div>
              <div className="text-white/70">Happy Users</div>
            </div>
            <div className="text-white">
              <div className="text-4xl font-bold mb-2">1M+</div>
              <div className="text-white/70">Price Comparisons</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Loved by Smart Shoppers
            </h2>
            <p className="text-xl text-white/80">
              See what our users are saying about their savings
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white/20 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-200 border border-white/20">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.content}"</p>
                <p className="text-white/80 mb-4 italic">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-sm text-white/60">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white/10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-white/80">
              Start free, upgrade when you're ready
            </p>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 border-2 border-white/30">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Free Forever</h3>
              <div className="text-5xl font-bold text-yellow-300 mb-2">$0</div>
              <p className="text-white/70">Perfect for getting started</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {pricingFeatures.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-white/80">{feature}</span>
                </div>
              ))}
            </div>
            
            <div className="text-center">
              <button
                onClick={() => onShowAuth('signup')}
                className="bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 w-full md:w-auto backdrop-blur-sm border border-white/20"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-black/30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Start Saving?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
          <p className="text-xl text-white/80 mb-8">
            Join thousands of smart shoppers who save money every day with PriceTracker
          </p>
          <button
            onClick={() => onShowAuth('signup')}
            className="bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 shadow-lg backdrop-blur-sm border border-white/20"
          >
            Start Your Free Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-sm text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold">PriceTracker</span>
            </div>
            <div className="text-gray-400 text-sm">
            <div className="text-white/60 text-sm">
              © 2024 PriceTracker. All rights reserved.
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
                  Jawaid.dev
                </a>
              </p>
              <p className="text-white/50 text-xs">
                Crafted with passion for smart shoppers everywhere
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
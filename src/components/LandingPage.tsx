import React, { useState } from 'react';
import { ShoppingCart, TrendingDown, Shield, Star, ArrowRight, Check, User } from '@geist-ui/icons';
import { trackUserAction, trackPageView } from '../utils/analytics';

interface LandingPageProps {
  onShowAuth: (mode: 'signin' | 'signup') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onShowAuth }) => {
  const [hoverStates, setHoverStates] = useState<{[key: string]: boolean}>({});

  React.useEffect(() => {
    trackPageView('/', 'Landing Page');
  }, []);

  const handleAuthClick = (mode: 'signin' | 'signup', location: string) => {
    trackUserAction('auth_modal_open', { mode, location });
    onShowAuth(mode);
  };
  
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
      icon: User,
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Navigation */}
      <nav style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ height: '32px', width: '32px', background: 'linear-gradient(to right, #3b82f6, #9333ea)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingCart size={20} color="#ffffff" />
              </div>
              <span style={{ marginLeft: '8px', fontSize: '20px', fontWeight: 'bold', background: 'linear-gradient(to right, #2563eb, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SpendLess</span>
              <span style={{ marginLeft: '8px', fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>Price Tracker</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => handleAuthClick('signin', 'header')}
                style={{
                  color: hoverStates['header-signin'] ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(4px)',
                  backgroundColor: hoverStates['header-signin'] ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoverStates(prev => ({...prev, 'header-signin': true}))}
                onMouseLeave={() => setHoverStates(prev => ({...prev, 'header-signin': false}))}
              >
                Sign In
              </button>
              <button
                onClick={() => handleAuthClick('signup', 'header')}
                style={{
                  backgroundColor: hoverStates['header-signup'] ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  padding: '8px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  boxShadow: hoverStates['header-signup'] ? '0 10px 15px rgba(0, 0, 0, 0.15)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  transform: hoverStates['header-signup'] ? 'scale(1.05)' : 'scale(1)'
                }}
                onMouseEnter={() => setHoverStates(prev => ({...prev, 'header-signup': true}))}
                onMouseLeave={() => setHoverStates(prev => ({...prev, 'header-signup': false}))}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ position: 'relative', padding: '80px 0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '24px', lineHeight: 1.2 }}>
              Never Overpay
              <span style={{ color: '#fde047' }}> Again</span>
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '32px', maxWidth: '768px', margin: '0 auto 32px', lineHeight: 1.6 }}>
              Compare prices across thousands of stores, create smart shopping lists, and save money on everything you buy. 
              Join millions of smart shoppers who trust SpendLess Price Tracker.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleAuthClick('signup', 'hero')}
                style={{
                  backgroundColor: hoverStates['hero-signup'] ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  boxShadow: hoverStates['hero-signup'] ? '0 10px 15px rgba(0, 0, 0, 0.15)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  transform: hoverStates['hero-signup'] ? 'scale(1.05)' : 'scale(1)'
                }}
                onMouseEnter={() => setHoverStates(prev => ({...prev, 'hero-signup': true}))}
                onMouseLeave={() => setHoverStates(prev => ({...prev, 'hero-signup': false}))}
              >
                <span>Start Saving Today</span>
                <ArrowRight size={20} />
              </button>
              <button
                onClick={() => handleAuthClick('signin', 'hero')}
                style={{
                  border: hoverStates['hero-signin'] ? '2px solid rgba(255, 255, 255, 0.5)' : '2px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(4px)',
                  backgroundColor: hoverStates['hero-signin'] ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoverStates(prev => ({...prev, 'hero-signin': true}))}
                onMouseLeave={() => setHoverStates(prev => ({...prev, 'hero-signin': false}))}
              >
                Sign In
              </button>
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '16px' }}>Free to start • No credit card required</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '80px 0', backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(4px)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>
              Everything You Need to Save Money
            </h2>
            <p style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.8)', maxWidth: '672px', margin: '0 auto' }}>
              Powerful features designed to help you find the best deals and optimize your shopping experience.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
            {features.map((feature, index) => (
              <div 
                key={index} 
                style={{ 
                  textAlign: 'center', 
                  transition: 'all 0.2s',
                  transform: hoverStates[`feature-${index}`] ? 'scale(1.05)' : 'scale(1)'
                }} 
                onMouseEnter={() => setHoverStates(prev => ({...prev, [`feature-${index}`]: true}))}
                onMouseLeave={() => setHoverStates(prev => ({...prev, [`feature-${index}`]: false}))}
              >
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', borderRadius: '16px', padding: '24px', marginBottom: '16px', transition: 'box-shadow 0.2s', border: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', justifyContent: 'center' }}>
                  <feature.icon size={32} color="#ffffff" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>{feature.title}</h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6 }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '80px 0', backgroundColor: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(4px)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px', textAlign: 'center' }}>
            <div style={{ color: '#ffffff' }}>
              <div style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '8px' }}>$2.5M+</div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Total Savings</div>
            </div>
            <div style={{ color: '#ffffff' }}>
              <div style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '8px' }}>50K+</div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Happy Users</div>
            </div>
            <div style={{ color: '#ffffff' }}>
              <div style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '8px' }}>1M+</div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Price Comparisons</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '80px 0', backgroundColor: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(4px)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>
              Loved by Smart Shoppers
            </h2>
            <p style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              See what our users are saying about their savings
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                  backdropFilter: 'blur(4px)', 
                  borderRadius: '12px', 
                  padding: '24px', 
                  boxShadow: hoverStates[`testimonial-${index}`] ? '0 10px 15px rgba(0, 0, 0, 0.15)' : '0 4px 6px rgba(0, 0, 0, 0.1)', 
                  transition: 'box-shadow 0.2s', 
                  border: '1px solid rgba(255, 255, 255, 0.2)' 
                }} 
                onMouseEnter={() => setHoverStates(prev => ({...prev, [`testimonial-${index}`]: true}))}
                onMouseLeave={() => setHoverStates(prev => ({...prev, [`testimonial-${index}`]: false}))}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={20} color="#facc15" fill="#facc15" />
                  ))}
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '16px', fontStyle: 'italic' }}>"{testimonial.content}"</p>
                <div>
                  <div style={{ fontWeight: 600, color: '#ffffff' }}>{testimonial.name}</div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{ padding: '80px 0', backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(4px)' }}>
        <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>
              Simple, Transparent Pricing
            </h2>
            <p style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              Start free, upgrade when you're ready
            </p>
          </div>
          
          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', borderRadius: '16px', padding: '32px', border: '2px solid rgba(255, 255, 255, 0.3)' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>Free Forever</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#fde047', marginBottom: '8px' }}>$0</div>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Perfect for getting started</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              {pricingFeatures.map((feature, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Check size={20} color="#22c55e" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{feature}</span>
                </div>
              ))}
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => onShowAuth('signup')}
                style={{
                  backgroundColor: hoverStates['pricing-cta'] ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '300px'
                }}
                onMouseEnter={() => setHoverStates(prev => ({...prev, 'pricing-cta': true}))}
                onMouseLeave={() => setHoverStates(prev => ({...prev, 'pricing-cta': false}))}
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '80px 0', backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}>
        <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '0 16px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>
            Ready to Start Saving?
          </h2>
          <p style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '32px' }}>
            Join thousands of smart shoppers who save money every day with SpendLess Price Tracker
          </p>
          <button
            onClick={() => handleAuthClick('signup', 'cta')}
            style={{
              backgroundColor: hoverStates['cta-button'] ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              padding: '16px 32px',
              borderRadius: '8px',
              fontSize: '1.125rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer'
            }}
            onMouseEnter={() => setHoverStates(prev => ({...prev, 'cta-button': true}))}
            onMouseLeave={() => setHoverStates(prev => ({...prev, 'cta-button': false}))}
          >
            Start Your Free Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', color: '#ffffff', padding: '48px 0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ height: '32px', width: '32px', background: 'linear-gradient(to right, #3b82f6, #9333ea)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingCart size={20} color="#ffffff" />
              </div>
              <span style={{ marginLeft: '8px', fontSize: '1.25rem', fontWeight: 'bold' }}>SpendLess Price Tracker</span>
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
              © {new Date().getFullYear()} SpendLess Price Tracker. All rights reserved.
            </div>
          </div>
          
          {/* Credits Section */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginBottom: '8px' }}>
                Made with <span style={{ color: '#ef4444' }}>❤️</span> by{' '}
                <a 
                  href="https://jawaid.dev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    color: hoverStates['footer-link'] ? '#ffffff' : 'rgba(255, 255, 255, 0.8)', 
                    fontWeight: 500, 
                    transition: 'color 0.2s', 
                    textDecoration: hoverStates['footer-link'] ? 'underline' : 'none'
                  }}
                  onMouseEnter={() => setHoverStates(prev => ({...prev, 'footer-link': true}))}
                  onMouseLeave={() => setHoverStates(prev => ({...prev, 'footer-link': false}))}
                >
                  Jawaid.dev
                </a>
              </p>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                Crafted with passion for smart shoppers everywhere
              </p>
            </div>
          </div>

          {/* Legal & Info Links */}
          <div style={{ marginTop: '32px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '24px', fontSize: '14px' }}>
              <a 
                href="/pricing" 
                style={{ 
                  color: hoverStates['link-pricing'] ? '#ffffff' : 'rgba(255, 255, 255, 0.7)', 
                  textDecoration: hoverStates['link-pricing'] ? 'underline' : 'none',
                  transition: 'all 0.2s'
                }} 
                onMouseEnter={() => setHoverStates(prev => ({...prev, 'link-pricing': true}))}
                onMouseLeave={() => setHoverStates(prev => ({...prev, 'link-pricing': false}))}
              >
                Pricing
              </a>
              <a 
                href="/privacy" 
                style={{ 
                  color: hoverStates['link-privacy'] ? '#ffffff' : 'rgba(255, 255, 255, 0.7)', 
                  textDecoration: hoverStates['link-privacy'] ? 'underline' : 'none',
                  transition: 'all 0.2s'
                }} 
                onMouseEnter={() => setHoverStates(prev => ({...prev, 'link-privacy': true}))}
                onMouseLeave={() => setHoverStates(prev => ({...prev, 'link-privacy': false}))}
              >
                Privacy Policy
              </a>
              <a 
                href="/refund" 
                style={{ 
                  color: hoverStates['link-refund'] ? '#ffffff' : 'rgba(255, 255, 255, 0.7)', 
                  textDecoration: hoverStates['link-refund'] ? 'underline' : 'none',
                  transition: 'all 0.2s'
                }} 
                onMouseEnter={() => setHoverStates(prev => ({...prev, 'link-refund': true}))}
                onMouseLeave={() => setHoverStates(prev => ({...prev, 'link-refund': false}))}
              >
                Refund Policy
              </a>
              <a 
                href="/terms" 
                style={{ 
                  color: hoverStates['link-terms'] ? '#ffffff' : 'rgba(255, 255, 255, 0.7)', 
                  textDecoration: hoverStates['link-terms'] ? 'underline' : 'none',
                  transition: 'all 0.2s'
                }} 
                onMouseEnter={() => setHoverStates(prev => ({...prev, 'link-terms': true}))}
                onMouseLeave={() => setHoverStates(prev => ({...prev, 'link-terms': false}))}
              >
                Terms & Conditions
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

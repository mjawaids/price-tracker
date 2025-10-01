import React, { useEffect, useState } from 'react';
import { Check, Star, Zap, Shield, Headphones as HeadphonesIcon } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import PageFooter from '../components/PageFooter';

const Pricing: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    document.title = 'Pricing • SpendLess';
    const metaDesc = document.querySelector('meta[name="description"]');
    const content = 'SpendLess pricing plans - Start free with up to 20 products. Upgrade to Pro for advanced features at $7/month or $70/year (save 16%).';
    if (metaDesc) {
      metaDesc.setAttribute('content', content);
    } else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = content;
      document.head.appendChild(m);
    }
  }, []);

  const freeFeatures = [
    'Track up to 20 products',
    'Create and manage shopping lists',
    'Compare prices across stores (basic)',
    'Save favorite items',
    'No payment details required'
  ];

  const proFeatures = [
    'Advanced price comparison across more stores',
    'Price history tracking',
    'Smart recommendations for cheaper alternatives',
    'Export lists (CSV/PDF)',
    'Priority email support',
    'Unlimited products',
    'Advanced analytics',
    'Custom alerts and notifications'
  ];

  return (
    <div className="min-h-screen static-gradient text-white">
      <PageHeader 
        title="Choose Your Plan" 
        description="Start free and upgrade when you're ready to unlock advanced features."
      />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/20">
            <div className="flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  billingCycle === 'monthly'
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                  billingCycle === 'yearly'
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Yearly
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Save 16%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="relative">
            <div className="glass-card rounded-2xl p-8 h-full border-2 border-white/20 hover:border-white/30 transition-all duration-300">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Free Tier</h3>
                <div className="text-5xl font-bold text-white mb-2">$0</div>
                <p className="text-white/60">Perfect for getting started</p>
              </div>

              <div className="space-y-4 mb-8">
                {freeFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white/80">{feature}</span>
                  </div>
                ))}
              </div>

              <button className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 border border-white/30 hover:border-white/50">
                Get Started Free
              </button>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="relative">
            {/* Popular Badge */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center space-x-2">
                <Star className="h-4 w-4" />
                <span>Most Popular</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-8 h-full border-2 border-blue-500/50 hover:border-blue-500/70 transition-all duration-300 shadow-2xl">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2 flex items-center justify-center space-x-2">
                  <Zap className="h-6 w-6 text-yellow-400" />
                  <span>Pro Plan</span>
                </h3>
                <div className="text-5xl font-bold text-white mb-2">
                  ${billingCycle === 'monthly' ? '7' : '70'}
                  <span className="text-lg text-white/60">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {billingCycle === 'yearly' && (
                  <div className="text-green-400 text-sm font-medium">
                    Save $14 per year (16% off)
                  </div>
                )}
                <p className="text-white/60 mt-2">For serious savers</p>
                <div className="inline-flex items-center space-x-1 bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm mt-3">
                  <span>🚀</span>
                  <span>Coming Soon</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {proFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white/80">{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                disabled
                className="w-full bg-gradient-to-r from-blue-500/50 to-purple-600/50 text-white/70 font-semibold py-3 px-6 rounded-xl transition-all duration-200 cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>

        {/* Billing Notes */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="glass-card rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-400" />
              <span>Billing Information</span>
            </h3>
            
            <div className="space-y-4 text-white/80">
              <div className="flex items-start space-x-3">
                <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                <p>Subscriptions auto-renew unless cancelled.</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></span>
                <p>You can manage or cancel anytime through your Paddle billing portal (link in order emails).</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></span>
                <p>
                  Refunds follow our{' '}
                  <a href="/refund" className="text-blue-300 hover:text-blue-200 underline transition-colors">
                    Refund Policy
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="glass-card rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
              <HeadphonesIcon className="h-5 w-5 text-green-400" />
              <span>Frequently Asked Questions</span>
            </h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-white mb-2">Can I upgrade or downgrade anytime?</h4>
                <p className="text-white/80">Yes, you can change your plan at any time. Changes take effect at your next billing cycle.</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-white mb-2">What payment methods do you accept?</h4>
                <p className="text-white/80">We accept all major credit cards, PayPal, and other payment methods through our secure payment processor, Paddle.</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-white mb-2">Is there a free trial for Pro?</h4>
                <p className="text-white/80">The Free tier gives you full access to core features. You can upgrade to Pro when you need advanced features.</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-white mb-2">Need help choosing?</h4>
                <p className="text-white/80">
                  Contact us at{' '}
                  <a 
                    href="mailto:jawaid@jawaid.dev" 
                    className="text-blue-300 hover:text-blue-200 underline transition-colors"
                  >
                    jawaid@jawaid.dev
                  </a>{' '}
                  and we'll help you find the right plan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <PageFooter />
    </div>
  );
};

export default Pricing;
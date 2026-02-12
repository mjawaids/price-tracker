import React, { useEffect, useState } from 'react';
import { Check, Star, ShieldCheck, User } from '@geist-ui/icons';
import PageHeader from '../components/PageHeader';
import PageFooter from '../components/PageFooter';

const Pricing: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [hoverStates, setHoverStates] = useState<{[key: string]: boolean}>({});

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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#ffffff' }}>
      <PageHeader 
        title="Choose Your Plan" 
        description="Start free and upgrade when you're ready to unlock advanced features."
      />
      
      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 16px 48px' }}>
        {/* Billing Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(4px)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <div style={{ display: 'flex' }}>
              <button
                onClick={() => setBillingCycle('monthly')}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  backgroundColor: billingCycle === 'monthly' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  color: billingCycle === 'monthly' ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  boxShadow: billingCycle === 'monthly' ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  position: 'relative',
                  backgroundColor: billingCycle === 'yearly' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  color: billingCycle === 'yearly' ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  boxShadow: billingCycle === 'yearly' ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Yearly
                <span style={{ 
                  position: 'absolute', 
                  top: '-8px', 
                  right: '-8px', 
                  backgroundColor: '#10b981', 
                  color: '#ffffff', 
                  fontSize: '10px', 
                  padding: '2px 8px', 
                  borderRadius: '9999px' 
                }}>
                  Save 16%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', maxWidth: '896px', margin: '0 auto' }}>
          {/* Free Plan */}
          <div style={{ position: 'relative' }}>
            <div style={{ 
              backdropFilter: 'blur(12px)', 
              backgroundColor: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: '16px', 
              padding: '32px', 
              height: '100%', 
              border: '2px solid rgba(255, 255, 255, 0.2)', 
              borderColor: hoverStates['free-card'] ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={() => setHoverStates(prev => ({...prev, 'free-card': true}))}
            onMouseLeave={() => setHoverStates(prev => ({...prev, 'free-card': false}))}
            >
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>Free Tier</h3>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>$0</div>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Perfect for getting started</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {freeFeatures.map((feature, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                style={{
                  width: '100%',
                  backgroundColor: hoverStates['free-button'] ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontWeight: 600,
                  padding: '12px 24px',
                  borderRadius: '12px',
                  transition: 'all 0.2s',
                  border: hoverStates['free-button'] ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoverStates(prev => ({...prev, 'free-button': true}))}
                onMouseLeave={() => setHoverStates(prev => ({...prev, 'free-button': false}))}
              >
                Get Started Free
              </button>
            </div>
          </div>

          {/* Pro Plan */}
          <div style={{ position: 'relative' }}>
            {/* Popular Badge */}
            <div style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
              <div style={{ background: 'linear-gradient(to right, #3b82f6, #9333ea)', color: '#ffffff', padding: '8px 24px', borderRadius: '9999px', fontSize: '14px', fontWeight: 600, boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={16} />
                <span>Most Popular</span>
              </div>
            </div>

            <div style={{ 
              backdropFilter: 'blur(12px)', 
              backgroundColor: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: '16px', 
              padding: '32px', 
              height: '100%', 
              border: '2px solid rgba(59, 130, 246, 0.5)', 
              borderColor: hoverStates['pro-card'] ? 'rgba(59, 130, 246, 0.7)' : 'rgba(59, 130, 246, 0.5)',
              boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={() => setHoverStates(prev => ({...prev, 'pro-card': true}))}
            onMouseLeave={() => setHoverStates(prev => ({...prev, 'pro-card': false}))}
            >
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '24px' }}>⚡</span>
                  <span>Pro Plan</span>
                </h3>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>
                  ${billingCycle === 'monthly' ? '7' : '70'}
                  <span style={{ fontSize: '1.125rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {billingCycle === 'yearly' && (
                  <div style={{ color: '#10b981', fontSize: '14px', fontWeight: 500 }}>
                    Save $14 per year (16% off)
                  </div>
                )}
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>For serious savers</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#fbbf24', padding: '4px 12px', borderRadius: '9999px', fontSize: '14px', marginTop: '12px' }}>
                  <span>🚀</span>
                  <span>Coming Soon</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {proFeatures.map((feature, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                disabled
                style={{
                  width: '100%',
                  background: 'linear-gradient(to right, rgba(59, 130, 246, 0.5), rgba(147, 51, 234, 0.5))',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 600,
                  padding: '12px 24px',
                  borderRadius: '12px',
                  transition: 'all 0.2s',
                  cursor: 'not-allowed',
                  border: 'none'
                }}
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>

        {/* Billing Notes */}
        <div style={{ marginTop: '64px', maxWidth: '768px', margin: '64px auto 0' }}>
          <div style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '32px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="#60a5fa" />
              <span>Billing Information</span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'rgba(255, 255, 255, 0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#60a5fa', borderRadius: '50%', marginTop: '8px', flexShrink: 0 }}></span>
                <p>Subscriptions auto-renew unless cancelled.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', marginTop: '8px', flexShrink: 0 }}></span>
                <p>You can manage or cancel anytime through your Paddle billing portal (link in order emails).</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#a855f7', borderRadius: '50%', marginTop: '8px', flexShrink: 0 }}></span>
                <p>
                  Refunds follow our{' '}
                  <a 
                    href="/refund" 
                    style={{ 
                      color: hoverStates['refund-link'] ? '#93c5fd' : '#60a5fa', 
                      textDecoration: 'underline', 
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={() => setHoverStates(prev => ({...prev, 'refund-link': true}))}
                    onMouseLeave={() => setHoverStates(prev => ({...prev, 'refund-link': false}))}
                  >
                    Refund Policy
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{ marginTop: '64px', maxWidth: '768px', margin: '64px auto 0' }}>
          <div style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '32px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} color="#10b981" />
              <span>Frequently Asked Questions</span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h4 style={{ fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>Can I upgrade or downgrade anytime?</h4>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Yes, you can change your plan at any time. Changes take effect at your next billing cycle.</p>
              </div>
              
              <div>
                <h4 style={{ fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>What payment methods do you accept?</h4>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>We accept all major credit cards, PayPal, and other payment methods through our secure payment processor, Paddle.</p>
              </div>
              
              <div>
                <h4 style={{ fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>Is there a free trial for Pro?</h4>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>The Free tier gives you full access to core features. You can upgrade to Pro when you need advanced features.</p>
              </div>
              
              <div>
                <h4 style={{ fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>Need help choosing?</h4>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Contact us at{' '}
                  <a 
                    href="mailto:jawaid@jawaid.dev" 
                    style={{ 
                      color: hoverStates['email-link'] ? '#93c5fd' : '#60a5fa', 
                      textDecoration: 'underline', 
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={() => setHoverStates(prev => ({...prev, 'email-link': true}))}
                    onMouseLeave={() => setHoverStates(prev => ({...prev, 'email-link': false}))}
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
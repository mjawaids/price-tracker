import React, { useState } from 'react';
import { ShoppingCart } from '@geist-ui/icons';

const PageFooter: React.FC = () => {
  const [hoverStates, setHoverStates] = useState<{[key: string]: boolean}>({});

  return (
    <footer style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', color: '#ffffff', padding: '48px 0', marginTop: '64px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ height: '32px', width: '32px', background: 'linear-gradient(to right, #3b82f6, #9333ea)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={20} color="#ffffff" />
            </div>
            <span style={{ marginLeft: '8px', fontSize: '1.25rem', fontWeight: 'bold' }}>SpendLess</span>
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
            © {new Date().getFullYear()} SpendLess. All rights reserved.
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
                  color: hoverStates['credit-link'] ? '#ffffff' : 'rgba(255, 255, 255, 0.8)', 
                  fontWeight: 500, 
                  transition: 'all 0.2s',
                  textDecoration: hoverStates['credit-link'] ? 'underline' : 'none'
                }}
                onMouseEnter={() => setHoverStates(prev => ({...prev, 'credit-link': true}))}
                onMouseLeave={() => setHoverStates(prev => ({...prev, 'credit-link': false}))}
              >
                Muhammad Jawaid Shamshad
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
  );
};

export default PageFooter;
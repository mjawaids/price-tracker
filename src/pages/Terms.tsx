import React, { useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import PageFooter from '../components/PageFooter';

const Terms: React.FC = () => {
  useEffect(() => {
    document.title = 'Terms & Conditions • SpendLess';
    const metaDesc = document.querySelector('meta[name="description"]');
    const content = 'SpendLess Terms & Conditions - By using our services, you agree to these terms. Owned and operated by Muhammad Jawaid Shamshad.';
    if (metaDesc) {
      metaDesc.setAttribute('content', content);
    } else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = content;
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen static-gradient text-white">
      <PageHeader 
        title="Terms & Conditions" 
        description="By using our services, you agree to these Terms & Conditions."
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-card p-8 space-y-8">
          <div className="text-sm text-white/60 mb-6">
            <strong>Effective Date:</strong> January 1st, 2025
          </div>
          
          <div className="prose prose-invert max-w-none">
            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
                <p className="text-white/80 leading-relaxed">
                  Welcome to SpendLess (https://SpendLess.ibexoft.com), a product owned and operated by{' '}
                  <strong>Muhammad Jawaid Shamshad</strong>. By using our services, you agree to these Terms & Conditions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Company & Payments</h2>
                <ul className="space-y-3 text-white/80">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    SpendLess is sold via Paddle, which acts as the Merchant of Record. Paddle handles billing, taxes, receipts, and compliance.
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    By purchasing, you also agree to Paddle's{' '}
                    <a 
                      href="https://paddle.com/legal/buyer-terms" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-300 hover:text-blue-200 underline transition-colors"
                    >
                      Buyer Terms
                    </a>.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Services</h2>
                <p className="text-white/80 leading-relaxed">
                  A shopping assistant that helps you create lists, compare prices, and find the best deals before you buy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Accounts & Usage</h2>
                <ul className="space-y-3 text-white/80">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    You must provide accurate information during signup.
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    You're responsible for maintaining your login credentials.
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Misuse (fraud, abuse, violating laws) may result in account suspension.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Refunds & Cancellations</h2>
                <ul className="space-y-3 text-white/80">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Refunds follow our{' '}
                    <a href="/refund" className="text-blue-300 hover:text-blue-200 underline transition-colors">
                      Refund Policy
                    </a>.
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    You may cancel your subscription anytime; access continues until the end of the billing period.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Liability</h2>
                <p className="text-white/80 leading-relaxed">
                  We provide SpendLess "as is" without warranties. We are not liable for indirect, incidental, or consequential damages.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
      
      <PageFooter />
    </div>
  );
};

export default Terms;
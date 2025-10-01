import React, { useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import PageFooter from '../components/PageFooter';

const Refund: React.FC = () => {
  useEffect(() => {
    document.title = 'Refund Policy • SpendLess';
    const metaDesc = document.querySelector('meta[name="description"]');
    const content = 'SpendLess Refund Policy - We want you to be satisfied. Request a refund within 30 days of purchase if you are not satisfied.';
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
        title="Refund Policy" 
        description="We want you to be satisfied with SpendLess."
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-card p-8 space-y-8">
          <div className="text-sm text-white/60 mb-6">
            <strong>Effective Date:</strong> January 1st, 2025
          </div>
          
          <div className="prose prose-invert max-w-none">
            <div className="space-y-6">
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-green-300 mb-3">30-Day Satisfaction Guarantee</h3>
                <p className="text-green-200/90 leading-relaxed">
                  We want you to be completely satisfied with SpendLess. If you're not happy with your purchase, 
                  we offer a full refund within 30 days.
                </p>
              </div>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Refund Process</h2>
                <ul className="space-y-4 text-white/80">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <div>
                      <strong className="text-white">Paddle processes all payments</strong> and issues refunds on our behalf.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <div>
                      You can request a refund within <strong className="text-white">30 days of purchase</strong> if you are not satisfied.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <div>
                      After 30 days, refunds are not guaranteed. Exceptions may apply for technical issues that prevent use of the service.
                    </div>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">How to Request a Refund</h2>
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6 backdrop-blur-sm">
                  <p className="text-blue-200/90 leading-relaxed mb-4">
                    To request a refund, please contact us directly:
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-300">📧</span>
                    <a 
                      href="mailto:jawaid@jawaid.dev?subject=SpendLess Refund Request"
                      className="text-blue-300 hover:text-blue-200 underline transition-colors font-medium"
                    >
                      jawaid@jawaid.dev
                    </a>
                  </div>
                  <p className="text-blue-200/70 text-sm mt-3">
                    Please include your order details and reason for the refund request.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Processing Time</h2>
                <p className="text-white/80 leading-relaxed">
                  Once approved, refunds are typically processed within 5-7 business days. 
                  The exact timing may depend on your payment method and bank processing times.
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

export default Refund;
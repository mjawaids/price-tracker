import React, { useEffect } from 'react';

const Terms: React.FC = () => {
  useEffect(() => {
    document.title = 'Terms & Conditions • SpendLess';
    const metaDesc = document.querySelector('meta[name="description"]');
    const content = 'By using SpendLess, you agree to lawful personal use. Subscriptions renew automatically unless canceled before billing. Orders are processed by Paddle.com.';
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>
        <div className="glass-card p-6 space-y-4">
          <p>
            By using SpendLess, you agree to use the app for lawful, personal, or family price tracking. Subscriptions renew automatically unless canceled before the billing date. You may correct order errors before confirming purchase. Once payment is completed, activation is immediate and a confirmation email will include links to our Terms, Refund Policy, and support.
          </p>
          <p>
            Our order process is conducted by Paddle.com, the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns.
          </p>
          <p>
            We reserve the right to update these terms, with notice to Paddle and updates published here.
          </p>
        </div>
        <div className="mt-8">
          <a href="/" className="text-white/80 hover:text-white underline">← Back to Home</a>
        </div>
      </div>
    </div>
  );
};

export default Terms;

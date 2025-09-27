import React, { useEffect } from 'react';

const Pricing: React.FC = () => {
  useEffect(() => {
    document.title = 'Pricing • SpendLess';
    const metaDesc = document.querySelector('meta[name="description"]');
    const content = 'SpendLess pricing: Free plan to track up to 20 products with weekly notifications. Pro for $7/month with unlimited products, real-time alerts, price history graphs, and email notifications.';
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
        <h1 className="text-3xl font-bold mb-6">Pricing</h1>
        <div className="glass-card p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Free</h2>
            <p className="text-white/80">Track up to 20 products, weekly notifications.</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Pro – $7/month</h2>
            <p className="text-white/80">Unlimited products, real-time alerts, price history graphs, email notifications.</p>
          </div>
        </div>
        <div className="mt-8">
          <a href="/" className="text-white/80 hover:text-white underline">← Back to Home</a>
        </div>
      </div>
    </div>
  );
};

export default Pricing;

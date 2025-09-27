import React, { useEffect } from 'react';

const Refund: React.FC = () => {
  useEffect(() => {
    document.title = 'Refund Policy • SpendLess';
    const metaDesc = document.querySelector('meta[name="description"]');
    const content = 'SpendLess offers a free plan. Paid subscriptions are non-refundable once billed, except for duplicate charges or billing errors within 30 days. Contact support@ibexoft.com.';
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
        <h1 className="text-3xl font-bold mb-6">Refund Policy</h1>
        <div className="glass-card p-6 space-y-4">
          <p>
            SpendLess includes a free plan to try the service. Paid subscriptions are non-refundable once billed, except in cases of duplicate charges or billing errors. Requests must be made within 30 days of the charge by contacting <a href="mailto:support@ibexoft.com" className="text-blue-300 underline">support@ibexoft.com</a>.
          </p>
          <p>
            Approved refunds will be processed within 7–10 business days.
          </p>
        </div>
        <div className="mt-8">
          <a href="/" className="text-white/80 hover:text-white underline">← Back to Home</a>
        </div>
      </div>
    </div>
  );
};

export default Refund;

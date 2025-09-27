import React, { useEffect } from 'react';

const Privacy: React.FC = () => {
  useEffect(() => {
    document.title = 'Privacy Policy • SpendLess';
    const metaDesc = document.querySelector('meta[name="description"]');
    const content = 'SpendLess collects minimal data to monitor products and send notifications. Data is never sold or shared, except as required by law. EU customers can request data access or deletion via support@ibexoft.com.';
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
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <div className="glass-card p-6 space-y-4">
          <p>
            SpendLess collects only the minimum information needed to monitor products and send notifications, such as account and preference data. Data is never sold or shared with third parties, except as required by law.
          </p>
          <p>
            EU customers may request access to, correction, or deletion of their personal data via <a href="mailto:support@ibexoft.com" className="text-blue-300 underline">support@ibexoft.com</a>.
            Our site uses SSL, and all payment processing is handled by Paddle.com — we do not collect or store credit card details.
          </p>
        </div>
        <div className="mt-8">
          <a href="/" className="text-white/80 hover:text-white underline">← Back to Home</a>
        </div>
      </div>
    </div>
  );
};

export default Privacy;

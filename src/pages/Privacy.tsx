import React, { useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import PageFooter from '../components/PageFooter';
import { supportUrl } from '../lib/links';

const Privacy: React.FC = () => {
  useEffect(() => {
    document.title = 'Privacy Policy • SpendLess';
    const metaDesc = document.querySelector('meta[name="description"]');
    const content = 'SpendLess Privacy Policy - Learn how we collect, use, and safeguard your personal information. Owned and operated by Muhammad Jawaid Shamshad.';
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
        title="Privacy Policy" 
        description="Your privacy matters, and this policy explains how we collect, use, and safeguard your personal information."
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-card p-8 space-y-8">
          <div className="text-sm text-white/60 mb-6">
            <strong>Effective Date:</strong> January 1st, 2025
          </div>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-white/80 text-lg leading-relaxed">
              SpendLess ("we", "our", "us") is owned and operated by <strong>Muhammad Jawaid Shamshad</strong>. 
              Your privacy matters, and this policy explains how we collect, use, and safeguard your personal information.
            </p>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>
                <ul className="space-y-3 text-white/80">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Account details (name, email, password) when you sign up.
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Payment details (handled securely by Paddle, our Merchant of Record).
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Usage data (e.g., features accessed, error logs).
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    What you add to the app: your lists, the city you choose, and the stores, products and prices you add.
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Receipts (pictures, PDFs or text) are read on your device and never uploaded — only the prices you choose to
                    save are. A receipt you share to SpendLess from another app stays on your device until you read it or tap Not
                    now (and is deleted when you sign out). The products you pick for a shop’s receipt lines are remembered on your
                    device only, and deleted when you sign out.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">How We Use Information</h2>
                <ul className="space-y-3 text-white/80">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    To provide and improve SpendLess.
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    To communicate with you about your account, support, or service updates.
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    To comply with legal obligations.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Sharing Your Information</h2>
                <ul className="space-y-3 text-white/80">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    We do not sell your data.
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Prices you add at shared stores are shown to other SpendLess users, without your name or account. Your lists, and
                    the stores and products you add yourself (with their prices), stay private to you. Medicines from a receipt are
                    saved as your own products, so their prices stay private too.
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    When you say a shared price is wrong, that’s shared without your name too: when another person says so as well,
                    the price is marked for everyone. To keep shared prices honest, prices from people whose prices often differ from
                    what others see count for less. This is worked out automatically from the prices themselves, is never shown to
                    anyone, and doesn’t change what you can do in the app.
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    If you choose to share a shop you added, and enough people who shop there suggest the same shop, it becomes a
                    shared shop: your prices there are shown with it to other SpendLess users, without your name or account, and your
                    own copy is closed. Until then you can withdraw the suggestion. Your own products stay private.
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Paddle processes all payments, and shares limited order information with us for account management.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Data Retention</h2>
                <p className="text-white/80 leading-relaxed">
                  We retain information as long as needed to deliver services, comply with laws, or resolve disputes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Your Rights</h2>
                <p className="text-white/80 leading-relaxed">
                  You may have rights to access, correct, or delete your personal data depending on your jurisdiction. 
                  <a
                    href={supportUrl('privacy_page')}
                    target="_blank"
                    rel="noopener"
                    className="text-blue-300 hover:text-blue-200 underline transition-colors"
                  >
                    Contact us
                  </a>{' '}
                  to make a request.
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

export default Privacy;
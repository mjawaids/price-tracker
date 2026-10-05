import React, { useEffect } from 'react';
import { Icon } from '../components/ui';
import { supportUrl } from '../lib/links';

// What SpendLessBot is (its user agent links here). Keep in step with
// scripts/import/http.ts and docs/data-sources.md.

const focus = 'rounded-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const link = `text-accent-ink font-semibold underline underline-offset-2 ${focus}`;

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="bg-surface rounded-card shadow-card p-5 sm:p-7">
    <h2 className="m-0 mb-3 font-display font-bold text-xl tracking-[-0.02em]">{title}</h2>
    <div className="text-ink-soft leading-relaxed space-y-3">{children}</div>
  </section>
);

const Bot: React.FC = () => {
  useEffect(() => {
    document.title = 'SpendLessBot • SpendLess';
    const metaDesc = document.querySelector('meta[name="description"]');
    const content = 'SpendLessBot reads public grocery prices once a day so SpendLess users can see where their list costs least. How it behaves and how to opt out.';
    if (metaDesc) {
      metaDesc.setAttribute('content', content);
    } else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = content;
      document.head.appendChild(m);
    }
  }, []);

  const contact = supportUrl('bot_page');

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="bg-surface border-b border-line">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className={`inline-flex items-center gap-2.5 ${focus}`}>
            <span className="grid place-items-center bg-accent text-accent-on" style={{ width: 34, height: 34, borderRadius: 11 }}>
              <Icon name="tag" size={19} stroke={2.4} />
            </span>
            <span className="font-display font-extrabold text-xl tracking-[-0.03em]">SpendLess</span>
          </a>
          <a href="/" className={`inline-flex items-center gap-1.5 min-h-[48px] px-2 text-sm font-semibold text-ink-soft hover:text-ink ${focus}`}>
            <Icon name="back" size={16} />
            Back to the app
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="m-0 font-display font-extrabold text-4xl sm:text-5xl tracking-[-0.035em]">SpendLessBot</h1>
        <p className="mt-3 mb-8 text-lg text-ink-soft leading-relaxed max-w-2xl">
          The crawler behind SpendLess&rsquo;s shared prices: what it reads, how it behaves, and how to opt out.
        </p>

        <div className="space-y-4">
          <Section title="What it does">
            <p className="m-0">
              Once a day, SpendLessBot reads the public product listings of a few online grocery stores in the cities SpendLess
              covers: each product&rsquo;s name, brand, size, price and whether it&rsquo;s in stock. SpendLess users then see which
              stores make their shopping list cheapest, with a link to the store.
            </p>
            <p className="m-0">
              It doesn&rsquo;t copy images, descriptions or reviews, and it never signs in, places orders or reads anything behind a
              login.
            </p>
          </Section>

          <Section title="How it behaves">
            <ul className="m-0 pl-5 space-y-2 list-disc marker:text-accent">
              <li>
                It says who it is:{' '}
                <code className="font-mono text-[13px] text-ink break-all">SpendLessBot/1.0 (+https://spendless.ibexoft.com/bot)</code>
              </li>
              <li>
                It reads your robots.txt on every visit and follows it, including Crawl-delay: the rules for
                &ldquo;SpendLessBot&rdquo;, or for &ldquo;*&rdquo; when there are none for it.
              </li>
              <li>One request at a time, at most one a second, once a day (early morning, Pakistan time).</li>
              <li>If your site refuses it (403, 429 or a challenge page), it stops for the day. It never tries to get around a block.</li>
            </ul>
          </Section>

          <Section title="Opting out">
            <p className="m-0">Add this to your robots.txt and it won&rsquo;t visit again:</p>
            <pre className="m-0 font-mono text-[13px] text-ink bg-paper border border-line rounded-btn p-4 overflow-x-auto">
              {'User-agent: SpendLessBot\nDisallow: /'}
            </pre>
            <p className="m-0">
              Or{' '}
              <a href={contact} target="_blank" rel="noopener" className={link}>
                contact us
              </a>{' '}
              and we&rsquo;ll stop and remove your store&rsquo;s prices.
            </p>
          </Section>

          <Section title="Store owners">
            <p className="m-0">
              Prefer to send us a price feed instead, or spotted a wrong price?{' '}
              <a href={contact} target="_blank" rel="noopener" className={link}>
                Get in touch
              </a>
              .
            </p>
          </Section>
        </div>

        <nav aria-label="More pages" className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-faint">
          <a href="/privacy" className={`hover:text-ink ${focus}`}>Privacy</a>
          <a href="/terms" className={`hover:text-ink ${focus}`}>Terms</a>
          <a href="/" className={`hover:text-ink ${focus}`}>SpendLess</a>
        </nav>
      </main>
    </div>
  );
};

export default Bot;

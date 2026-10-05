// Outbound links. UTM tags tell us (on ibexoft.com) where in SpendLess a visit came from.

const IBEXOFT = 'https://ibexoft.com';

const tagged = (url: string, campaign: string, content: string): string => {
  const params = new URLSearchParams({
    utm_source: 'spendless',
    utm_medium: 'referral',
    utm_campaign: campaign,
    utm_content: content,
  });
  return `${url}?${params.toString()}`;
};

/** Where the support link was clicked; becomes `utm_content`. */
export type SupportPlacement = 'auth' | 'site_footer' | 'app_profile' | 'pricing_page' | 'privacy_page' | 'refund_page' | 'bot_page';

export const supportUrl = (placement: SupportPlacement): string =>
  tagged(`${IBEXOFT}/contact`, 'support', placement);

/**
 * A store's website, tagged as a SpendLess referral — or null unless it's a
 * plain http(s) URL (never `javascript:` or anything else from stored data).
 */
export const storeLink = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    u.searchParams.set('utm_source', 'spendless');
    u.searchParams.set('utm_medium', 'referral');
    u.searchParams.set('utm_campaign', 'where_to_buy');
    return u.toString();
  } catch {
    return null;
  }
};

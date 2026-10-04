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
export type SupportPlacement = 'auth' | 'site_footer' | 'app_profile' | 'pricing_page' | 'privacy_page' | 'refund_page';

export const supportUrl = (placement: SupportPlacement): string =>
  tagged(`${IBEXOFT}/contact`, 'support', placement);

// Ibexoft's Terms and Privacy Policy cover all Ibexoft products, SpendLess included.
export const termsUrl = (placement: 'auth'): string => tagged(`${IBEXOFT}/terms-and-conditions/`, 'legal', placement);
export const privacyUrl = (placement: 'auth'): string => tagged(`${IBEXOFT}/privacy-policy/`, 'legal', placement);

// Outbound links. UTM tags tell us (on ibexoft.com) where in SpendLess a visit came from.

const SUPPORT_BASE = 'https://ibexoft.com/contact';

/** Where the support link was clicked; becomes `utm_campaign`. */
export type SupportPlacement = 'auth' | 'site_footer' | 'app_profile';

export const supportUrl = (placement: SupportPlacement): string => {
  const params = new URLSearchParams({
    utm_source: 'spendless',
    utm_medium: 'referral',
    utm_campaign: 'support',
    utm_content: placement,
  });
  return `${SUPPORT_BASE}?${params.toString()}`;
};

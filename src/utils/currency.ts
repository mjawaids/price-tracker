export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: '£', flag: '🇪🇬' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', flag: '🇧🇩' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: '₨', flag: '🇱🇰' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', flag: '🇳🇵' },
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K', flag: '🇲🇲' },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛', flag: '🇰🇭' },
  { code: 'LAK', name: 'Lao Kip', symbol: '₭', flag: '🇱🇦' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', flag: '🇹🇼' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'FJD', name: 'Fijian Dollar', symbol: 'FJ$', flag: '🇫🇯' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', flag: '🇨🇱' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', flag: '🇦🇷' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', flag: '🇨🇴' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', flag: '🇵🇪' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U', flag: '🇺🇾' },
  { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs', flag: '🇧🇴' },
  { code: 'PYG', name: 'Paraguayan Guarani', symbol: '₲', flag: '🇵🇾' },
];

export const getCurrencyByCode = (code: string): Currency | undefined => {
  return CURRENCIES.find(currency => currency.code === code);
};

export const formatPrice = (amount: number, currencyCode: string): string => {
  const currency = getCurrencyByCode(currencyCode);
  if (!currency) return `${amount.toFixed(2)} ${currencyCode}`;
  
  // For currencies with symbols that go before the amount
  const prefixSymbols = ['$', '€', '£', 'C$', 'A$', 'CHF', 'R$', 'S$', 'HK$', 'NZ$', 'FJ$', 'NT$', '$U'];
  
  if (prefixSymbols.includes(currency.symbol)) {
    return `${currency.symbol}${amount.toFixed(2)}`;
  } else {
    return `${amount.toFixed(2)} ${currency.symbol}`;
  }
};

export const getDefaultCurrency = (): string => {
  // Try to detect user's locale and return appropriate currency
  const locale = navigator.language || 'en-US';
  const countryCode = locale.split('-')[1];
  
  const countryToCurrency: Record<string, string> = {
    'US': 'USD',
    'GB': 'GBP',
    'DE': 'EUR',
    'FR': 'EUR',
    'IT': 'EUR',
    'ES': 'EUR',
    'JP': 'JPY',
    'CA': 'CAD',
    'AU': 'AUD',
    'CH': 'CHF',
    'CN': 'CNY',
    'IN': 'INR',
    'KR': 'KRW',
    'BR': 'BRL',
    'MX': 'MXN',
    'RU': 'RUB',
    'ZA': 'ZAR',
    'SG': 'SGD',
    'HK': 'HKD',
    'NO': 'NOK',
    'SE': 'SEK',
    'DK': 'DKK',
    'PL': 'PLN',
    'CZ': 'CZK',
    'HU': 'HUF',
    'TR': 'TRY',
    'IL': 'ILS',
    'AE': 'AED',
    'SA': 'SAR',
    'EG': 'EGP',
    'NG': 'NGN',
    'KE': 'KES',
    'GH': 'GHS',
    'TH': 'THB',
    'VN': 'VND',
    'ID': 'IDR',
    'MY': 'MYR',
    'PH': 'PHP',
    'PK': 'PKR',
    'BD': 'BDT',
    'LK': 'LKR',
    'NP': 'NPR',
    'MM': 'MMK',
    'KH': 'KHR',
    'LA': 'LAK',
    'TW': 'TWD',
    'NZ': 'NZD',
    'FJ': 'FJD',
    'CL': 'CLP',
    'AR': 'ARS',
    'CO': 'COP',
    'PE': 'PEN',
    'UY': 'UYU',
    'BO': 'BOB',
    'PY': 'PYG',
  };
  
  return countryToCurrency[countryCode] || 'USD';
};
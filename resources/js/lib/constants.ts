export type Country = {
    name: string;
    flag: string;
};

export const COUNTRIES: Country[] = [
    { name: 'United States', flag: '🇺🇸' },
    { name: 'United Kingdom', flag: '🇬🇧' },
    { name: 'Canada', flag: '🇨🇦' },
    { name: 'Australia', flag: '🇦🇺' },
    { name: 'Germany', flag: '🇩🇪' },
    { name: 'Ireland', flag: '🇮🇪' },
    { name: 'New Zealand', flag: '🇳🇿' },
    { name: 'Malaysia', flag: '🇲🇾' },
    { name: 'Singapore', flag: '🇸🇬' },
    { name: 'Netherlands', flag: '🇳🇱' },
    { name: 'France', flag: '🇫🇷' },
    { name: 'Italy', flag: '🇮🇹' },
    { name: 'Sweden', flag: '🇸🇪' },
    { name: 'Switzerland', flag: '🇨🇭' },
    { name: 'Japan', flag: '🇯🇵' },
    { name: 'South Korea', flag: '🇰🇷' },
    { name: 'China', flag: '🇨🇳' },
    { name: 'United Arab Emirates', flag: '🇦🇪' },
    { name: 'India', flag: '🇮🇳' },
    { name: 'Bangladesh', flag: '🇧🇩' },
    { name: 'Denmark', flag: '🇩🇰' },
    { name: 'Norway', flag: '🇳🇴' },
    { name: 'Finland', flag: '🇫🇮' },
    { name: 'Austria', flag: '🇦🇹' },
    { name: 'Spain', flag: '🇪🇸' },
    { name: 'Poland', flag: '🇵🇱' },
    { name: 'Turkey', flag: '🇹🇷' },
    { name: 'South Africa', flag: '🇿🇦' },
];

const COUNTRY_FLAG_LOOKUP: Record<string, string> = Object.fromEntries(
    COUNTRIES.map((country) => [country.name.toLowerCase(), country.flag]),
);

export function getCountryFlag(country?: string | null): string {
    if (!country) {
        return '🌐';
    }

    return COUNTRY_FLAG_LOOKUP[country.toLowerCase()] ?? '🌐';
}

export const CURRENCY_SYMBOL: Record<string, string> = {
    USD: '$',
    GBP: '£',
    EUR: '€',
    AUD: 'A$',
    CAD: 'C$',
    NZD: 'NZ$',
    MYR: 'RM',
    SGD: 'S$',
    JPY: '¥',
    CNY: '¥',
    AED: 'د.إ',
    INR: '₹',
    BDT: '৳',
    SEK: 'kr',
    CHF: 'CHF',
    DKK: 'kr',
    NOK: 'kr',
};

export const CURRENCIES = Object.keys(CURRENCY_SYMBOL);

export function formatCurrency(
    amount: number | string | null | undefined,
    currency?: string | null,
): string {
    if (amount === null || amount === undefined || amount === '') {
        return '—';
    }

    const symbol = currency
        ? (CURRENCY_SYMBOL[currency] ?? `${currency} `)
        : '';
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (Number.isNaN(value)) {
        return '—';
    }

    return `${symbol}${value.toLocaleString()}`;
}

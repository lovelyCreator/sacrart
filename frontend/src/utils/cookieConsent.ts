/**
 * Cookie Consent Utility
 * 
 * This utility helps check if the user has given consent for cookies.
 * Works with our custom cookie consent implementation.
 */

interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp?: string;
}

/**
 * Get cookie consent from localStorage
 */
const getCookieConsent = (): CookieConsent | null => {
  const consent = localStorage.getItem('cookie-consent');
  if (consent) {
    try {
      return JSON.parse(consent) as CookieConsent;
    } catch (e) {
      console.error('Error parsing cookie consent:', e);
      return null;
    }
  }
  return null;
};

/**
 * Check if user has consented to analytics cookies
 * This includes Google Analytics
 */
export const hasAnalyticsConsent = (): boolean => {
  const consent = getCookieConsent();
  return consent?.analytics === true;
};

/**
 * Check if user has consented to marketing cookies
 * This includes YouTube embeds
 */
export const hasMarketingConsent = (): boolean => {
  const consent = getCookieConsent();
  return consent?.marketing === true;
};
  
/**
 * Check if user has given any consent
 */
export const hasAnyConsent = (): boolean => {
  return hasAnalyticsConsent() || hasMarketingConsent();
};

/**
 * Check if user has explicitly rejected cookies
 */
export const hasRejectedCookies = (): boolean => {
  const consent = getCookieConsent();
  if (consent) {
    // If consent exists but analytics and marketing are both false, user rejected
    return consent.analytics === false && consent.marketing === false;
  }
  return false;
};

/**
 * Check if user has made a consent choice
 */
export const hasConsentChoice = (): boolean => {
  return getCookieConsent() !== null;
};
  
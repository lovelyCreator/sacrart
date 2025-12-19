import { useEffect } from 'react';
import { hasAnalyticsConsent } from '@/utils/cookieConsent';

/**
 * Hook to load Google Analytics only if user has consented
 * 
 * Usage:
 * ```tsx
 * useGoogleAnalytics('GA_MEASUREMENT_ID');
 * ```
 */
export const useGoogleAnalytics = (measurementId: string) => {
  useEffect(() => {
    // Only load if user has consented to analytics cookies
    if (!hasAnalyticsConsent()) {
      console.log('Google Analytics blocked: User has not consented to analytics cookies');
      return;
    }

    // Check if gtag is already loaded
    if (window.gtag) {
      return;
    }

    // Load Google Analytics script
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script1);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId);

    // Listen for consent updates
    const handleConsentUpdate = (event: CustomEvent) => {
      const consent = event.detail;
      if (consent.analytics === true && !window.gtag) {
        // Reload if consent was just given
        window.location.reload();
      }
    };

    window.addEventListener('cookieConsentUpdated', handleConsentUpdate as EventListener);
    
    return () => {
      window.removeEventListener('cookieConsentUpdated', handleConsentUpdate as EventListener);
    };
  }, [measurementId]);
};

// Extend Window interface
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}


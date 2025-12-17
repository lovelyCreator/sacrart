import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DEFAULT_LOCALE, SupportedLocale } from '@/hooks/useLocale';

/**
 * Component to redirect root path to default locale
 */
const LocaleRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Always redirect to default locale (es) when accessing root
    // The locale in the URL will determine the language
    if (location.pathname === '/' || location.pathname === '') {
      navigate(`/${DEFAULT_LOCALE}${location.search}`, { replace: true });
    }
  }, [navigate, location.pathname, location.search]); // Only depend on pathname and search, not entire location object

  return null;
};

export default LocaleRedirect;


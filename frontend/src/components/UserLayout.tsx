import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Home,
  Search,
  User,
  LogOut,
  Globe,
  Menu,
  X,
  Play,
  BookOpen,
  CreditCard,
  MessageSquare,
  HelpCircle,
  Settings,
  ChevronDown,
  Instagram,
  Facebook,
  Youtube
} from 'lucide-react';
import logoImage from '@/assets/logo-transparente.png';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { useLocale } from '@/hooks/useLocale';
import { settingsApi } from '@/services/settingsApi';

const UserLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { getPathWithLocale, pathname, locale } = useLocale();
  const [footerSettings, setFooterSettings] = useState<Record<string, string>>({});

  // Fetch footer settings from backend
  useEffect(() => {
    const fetchFooterSettings = async () => {
      try {
        const response = await settingsApi.getPublicSettings();
        if (response.success && response.data) {
          setFooterSettings(response.data);
        }
      } catch (error) {
        console.error('Error fetching footer settings:', error);
      }
    };
    fetchFooterSettings();
  }, [locale]); // Refetch when locale changes

  const handleLogout = async () => {
    await logout();
    navigate(getPathWithLocale('/'));
  };

  const handleLanguageChange = async (langCode: string) => {
    const locale = langCode.toLowerCase();
    await changeLanguage(locale);
  };

  const menuItems = [
    { path: '/', icon: Home, label: t('common.home'), exact: true },
    { path: '/explore', icon: Search, label: t('common.browse') },
    { path: '/library', icon: Play, label: t('common.continue_watching') },
    { path: '/subscription', icon: CreditCard, label: t('common.plans') },
    { path: '/support', icon: HelpCircle, label: t('common.support') },
  ];

  const isActive = (path: string, exact = false) => {
    const currentPath = pathname;
    if (exact) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Header - Streaming Platform Style */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-nav transition-all duration-300">
        <div className="container mx-auto px-4 lg:px-8 h-16 lg:h-18 flex items-center justify-between">
          {/* Logo */}
          <Link to={getPathWithLocale("/")} className="flex items-center space-x-2 hover:opacity-80 transition-all duration-300 hover:scale-105">
            <img 
              src={logoImage} 
              alt="SACRART Logo" 
              className="h-10 lg:h-11 w-auto"
            />
          </Link>

          {/* Desktop Navigation - Streaming Style - Only show for authenticated users */}
          {user && (
            <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={getPathWithLocale(item.path)}
                    className={`flex items-center space-x-2 text-sm font-medium transition-all duration-300 relative group ${
                      isActive(item.path, item.exact)
                        ? 'text-white font-semibold'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <Icon className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110`} />
                    <span>{item.label}</span>
                    {isActive(item.path, item.exact) && (
                      <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2 min-w-[60px] justify-center text-white/90 hover:text-white hover:bg-white/10">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm w-6 text-center">{currentLanguage.toUpperCase()}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black/95 border-white/20 text-white">
                {[
                  { code: 'EN', name: 'English', flag: '🇺🇸' },
                  { code: 'ES', name: 'Español', flag: '🇪🇸' },
                  { code: 'PT', name: 'Português', flag: '🇵🇹' },
                ].map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className="flex items-center space-x-2 hover:bg-white/10 focus:bg-white/10"
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                    {currentLanguage.toUpperCase() === lang.code && (
                      <span className="ml-auto text-primary">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            {user ? (
              <div className="flex items-center space-x-3">
                <Link to={getPathWithLocale("/profile")}>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-white/90 hover:text-white hover:bg-white/10">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user.name}</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white/90 hover:text-white hover:bg-white/10">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10">
                    {t('common.sign_in')}
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-semibold">
                    {t('auth.sign_up')}
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button - Only show for authenticated users */}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-300 ease-in-out lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <Link to={getPathWithLocale("/")} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <img 
              src={logoImage} 
              alt="SACRART Logo" 
              className="h-12 w-auto"
            />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {user && (
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                  <Link
                    key={item.path}
                    to={getPathWithLocale(item.path)}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                      isActive(item.path, item.exact)
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                  <Icon className={`mr-3 h-5 w-5 ${isActive(item.path, item.exact) ? 'text-primary-foreground' : ''}`} />
                  {item.label}
                  {isActive(item.path, item.exact) && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-primary-foreground rounded-full opacity-80"></div>
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        {user && (
          <div className="p-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('common.logout')}
            </Button>
          </div>
        )}
      </div>

      {/* Main content with padding for fixed header */}
      <main className="pt-16 lg:pt-20">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-black text-white border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="text-center">
            {/* Call to Action Section */}
            <div className="py-12 md:py-16">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 font-montserrat">
                    {t('footer.ready_to_start')}
                  </h2>
                  <p className="text-base md:text-lg text-gray-400 mb-8 max-w-2xl mx-auto font-montserrat">
                    {t('footer.join_description')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link to={getPathWithLocale("/explore")}>
                      <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-semibold px-8">
                        {t('footer.browse_all_videos')}
                      </Button>
                    </Link>
                    <Link to="/subscription">
                      <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white font-semibold px-8">
                        {t('footer.view_pricing_plans')}
                      </Button>
                    </Link>
                  </div>
            </div>

            {/* Footer Description */}
            {footerSettings.footer_description && (
              <p className="text-sm text-gray-400 mb-4 font-montserrat">
                {footerSettings.footer_description}
              </p>
            )}

            {/* Footer Address */}
            {footerSettings.footer_address && (
              <p className="text-sm text-gray-400 mb-4 font-montserrat">
                {footerSettings.footer_address}
              </p>
            )}

            {/* Social Media Icons */}
            <div className="flex justify-center space-x-6 mb-6 pt-8 border-t border-white/10">
              {footerSettings.footer_social_instagram && footerSettings.footer_social_instagram !== 'https://' && (
                <a 
                  href={footerSettings.footer_social_instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-all duration-300 hover:scale-110"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {footerSettings.footer_social_facebook && footerSettings.footer_social_facebook !== 'https://' && (
                <a 
                  href={footerSettings.footer_social_facebook} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-all duration-300 hover:scale-110"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {footerSettings.footer_social_twitter && footerSettings.footer_social_twitter !== 'https://' && (
                <a 
                  href={footerSettings.footer_social_twitter} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-all duration-300 hover:scale-110"
                  aria-label="Twitter"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
              )}
            </div>

            {/* Copyright */}
            <p className="text-sm text-gray-500 pb-8 font-montserrat">
              {footerSettings.footer_copyright || (
                <Trans
                  i18nKey="footer.copyright"
                  values={{ name: 'SACRART' }}
                  components={[<span key="sacrart" className="text-white font-semibold" />]}
                />
              )}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UserLayout;

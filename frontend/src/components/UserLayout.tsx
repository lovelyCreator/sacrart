import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Youtube,
  Store
} from 'lucide-react';
import logoImage from '@/assets/logo-transparente.png';
import angelitaImage from '@/assets/angelita.png';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation, Trans } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { useLocale } from '@/hooks/useLocale';
import { settingsApi } from '@/services/settingsApi';
import { categoryApi, videoApi, Category } from '@/services/videoApi';

const UserLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { getPathWithLocale, pathname, locale } = useLocale();
  const [footerSettings, setFooterSettings] = useState<Record<string, string>>({});

  // Handler for Directos - navigate to first video
  const handleDirectosClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      // Fetch the first published video
      const response = await videoApi.getPublic({ 
        status: 'published',
        per_page: 1,
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      
      const videosData = Array.isArray(response.data) 
        ? response.data 
        : response.data?.data || [];
      
      if (videosData.length > 0) {
        navigate(getPathWithLocale(`/video/${videosData[0].id}`));
      } else {
        // Fallback: navigate to browse if no videos found
        navigate(getPathWithLocale("/browse"));
      }
    } catch (error) {
      console.error('Error fetching video for Directos:', error);
      // Fallback: navigate to browse on error
      navigate(getPathWithLocale("/browse"));
    }
  };

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

  // Define static categories for header dropdown
  const staticCategories: Array<{ name: string; slug: string }> = [
    { name: 'Dibujo', slug: 'dibujo' },
    { name: 'Modelado', slug: 'modelado' },
    { name: 'Talla en Madera', slug: 'talla-en-madera' },
    { name: 'Policromía', slug: 'policromia' },
    { name: 'Dorado y Estofado', slug: 'dorado-y-estofado' },
    { name: 'Restauración', slug: 'restauracion' },
  ];

  // Helper to create Category from static data
  const createCategoryFromStatic = (staticCat: { name: string; slug: string }, backendCat?: Category): Category => {
    if (backendCat) return backendCat;
    return {
      id: 0,
      name: staticCat.name,
      slug: staticCat.slug,
      description: '',
      color: '#A05245',
      icon: '',
      is_active: true,
      sort_order: 0,
      cover_image: null,
      created_at: '',
      updated_at: '',
    };
  };

  // Fetch categories for dropdown and map to static categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryApi.getPublic(locale);
        if (response.success) {
          const backendCategories = response.data || [];
          // Map static categories to backend categories if they exist
          const mappedCategories = staticCategories.map(staticCat => {
            const backendCat = backendCategories.find((bc: Category) => 
              bc.name.toLowerCase() === staticCat.name.toLowerCase() ||
              bc.name.toLowerCase().includes(staticCat.slug)
            );
            return createCategoryFromStatic(staticCat, backendCat);
          });
          setCategories(mappedCategories);
        } else {
          // If fetch fails, use static categories
          setCategories(staticCategories.map(cat => createCategoryFromStatic(cat)));
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Use static categories on error
        setCategories(staticCategories.map(cat => createCategoryFromStatic(cat)));
      }
    };
    if (user) {
      fetchCategories();
    }
  }, [locale, user]);

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
    { path: '/browse', icon: Search, label: t('common.browse') },
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Header - Based on code.html */}
      <nav className="fixed top-0 z-50 w-full bg-gradient-to-b from-black/95 to-transparent transition-all duration-300 px-4 md:px-10 py-4 flex items-center justify-between border-b border-[#39282e]/30 backdrop-blur-md">
        <div className="flex items-center gap-4 sm:gap-8">
          {/* Logo */}
          <Link to={getPathWithLocale("/")} className="flex items-center cursor-pointer h-10 md:h-12 w-auto shrink-0 hover:opacity-80 transition-opacity">
            <img 
              alt="SACRART Logo" 
              src={logoImage}
              className="h-full w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation - Only show for authenticated users */}
          {user && (
            <div className="hidden xl:flex items-center gap-6">
              <Link 
                to={getPathWithLocale("/")}
                className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                  isActive('/', true) ? 'text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                {t('common.home', 'Inicio')}
              </Link>
              
              {/* Categories Dropdown */}
              <div 
                className="relative group"
                onMouseEnter={() => setCategoriesDropdownOpen(true)}
                onMouseLeave={() => setCategoriesDropdownOpen(false)}
              >
                <button 
                  className="text-gray-300 text-xs font-bold uppercase tracking-wider hover:text-white transition-colors flex items-center gap-1"
                >
                  {t('common.categories', 'Categorías')}
                  <i className="fa-solid fa-chevron-down text-[10px]"></i>
                </button>
                {categoriesDropdownOpen && categories.length > 0 && (
                  <div 
                    className="absolute top-full left-0 pt-2 w-56 z-50"
                  >
                    <div className="bg-[#181113] border border-white/10 rounded-lg shadow-xl py-2">
                      {categories.map((category, index) => (
                        <Link
                          key={category.id || index}
                          to={category.id ? getPathWithLocale(`/category/${category.id}`) : getPathWithLocale(`/browse?category=${category.slug || category.name}`)}
                          onClick={() => setCategoriesDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-300 hover:text-primary hover:bg-white/5"
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <a 
                href="#seguir-viendo"
                onClick={(e) => {
                  e.preventDefault();
                  // Navigate to home first if not already there
                  if (pathname !== '/' && !pathname.endsWith('/')) {
                    navigate(getPathWithLocale('/'));
                    // Wait for navigation then scroll
                    setTimeout(() => {
                      const element = document.getElementById('seguir-viendo');
                      if (element) {
                        const headerOffset = 80;
                        const elementPosition = element.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                        window.scrollTo({
                          top: offsetPosition,
                          behavior: 'smooth'
                        });
                      }
                    }, 100);
                  } else {
                    const element = document.getElementById('seguir-viendo');
                    if (element) {
                      const headerOffset = 80;
                      const elementPosition = element.getBoundingClientRect().top;
                      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      });
                    }
                  }
                }}
                className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                  pathname === '/' ? 'text-gray-300 hover:text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                {t('common.continue_watching', 'Seguir Viendo')}
              </a>
              
              <Link 
                to={getPathWithLocale("/browse")}
                className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                  isActive('/browse') ? 'text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                {t('common.browse', 'Browse')}
              </Link>
              
              <a
                href="#"
                onClick={handleDirectosClick}
                className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                  isActive('/video') ? 'text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                {t('common.live', 'Directos')}
              </a>
              
              <Link 
                to={getPathWithLocale("/kids")}
                className={`text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                  isActive('/kids') ? 'text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                {t('common.sacrart_kids', 'Sacrart Kids')}
                <img src={angelitaImage} alt="Angelita" className="h-6 w-6 object-contain animate-bounce" />
              </Link>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <>
              {/* Tienda Button - Desktop */}
              <button className="hidden md:block bg-white/10 border border-transparent text-[10px] font-bold px-4 py-1.5 rounded-[2px] hover:bg-white/20 transition-all uppercase tracking-widest text-white">
                {t('common.store', 'Tienda')}
              </button>

              {/* Search - Desktop */}
              <div className="hidden md:flex items-center bg-[#39282e]/50 rounded-full border border-white/10 px-3 py-1.5 w-48 lg:w-64 focus-within:bg-black/80 focus-within:border-primary transition-all">
                <i className="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
                <Input
                  type="text"
                  placeholder={t('common.search', 'Buscar...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      navigate(getPathWithLocale(`/browse?search=${encodeURIComponent(searchQuery.trim())}`));
                    }
                  }}
                  className="bg-transparent border-none text-sm text-white focus:ring-0 placeholder:text-gray-500 w-full ml-2"
                />
              </div>

              {/* Search - Mobile */}
              <button className="md:hidden text-white p-1">
                <i className="fa-solid fa-magnifying-glass text-lg"></i>
              </button>

              {/* User Avatar with Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="size-9 rounded-full bg-gradient-to-br from-primary to-[#783e34] p-[2px] cursor-pointer group shrink-0 hover:opacity-90 transition-opacity">
                    <div className="size-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                      {(user as any).avatar ? (
                        <img 
                          src={(user as any).avatar} 
                          alt={user.name || 'User'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#181113] border-white/10 text-white w-48">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link
                      to={getPathWithLocale("/profile")}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white/10 focus:bg-white/10"
                    >
                      <User className="h-4 w-4" />
                      <span>{t('common.profile', 'Perfil')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to={getPathWithLocale("/subscription")}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white/10 focus:bg-white/10"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>{t('common.plans', 'Planes')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to={getPathWithLocale("/support")}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white/10 focus:bg-white/10"
                    >
                      <HelpCircle className="h-4 w-4" />
                      <span>{t('common.support', 'Soporte')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <div className="border-t border-white/10 my-1"></div>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 cursor-pointer hover:bg-white/10 focus:bg-white/10 text-red-400 hover:text-red-300"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t('common.logout', 'Cerrar Sesión')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu button */}
              <button
                className="xl:hidden text-white p-1"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10 text-xs">
                  {t('common.sign_in')}
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs">
                  {t('common.sign_up')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#181113] border-r border-white/10 transform transition-transform duration-300 ease-in-out xl:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
          <Link to={getPathWithLocale("/")} className="flex items-center space-x-2 hover:opacity-80 transition-opacity" onClick={() => setSidebarOpen(false)}>
            <img 
              src={logoImage} 
              alt="SACRART Logo" 
              className="h-10 w-auto"
            />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {user && (
          <div className="flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Search Section */}
            <div className="px-4 py-4 border-b border-white/10">
              <div className="flex items-center bg-[#39282e]/50 rounded-full border border-white/10 px-3 py-2 focus-within:bg-black/80 focus-within:border-primary transition-all">
                <i className="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
                <Input
                  type="text"
                  placeholder={t('common.search', 'Buscar...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      navigate(getPathWithLocale(`/browse?search=${encodeURIComponent(searchQuery.trim())}`));
                      setSidebarOpen(false);
                    }
                  }}
                  className="bg-transparent border-none text-sm text-white focus:ring-0 placeholder:text-gray-500 w-full ml-2"
                />
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-4 py-4 space-y-1">
              <Link 
                to={getPathWithLocale("/")}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive('/', true)
                    ? 'bg-primary/20 text-white font-semibold'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Home className="mr-3 h-5 w-5" />
                {t('common.home', 'Inicio')}
              </Link>

              {/* Categories with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setCategoriesDropdownOpen(!categoriesDropdownOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    categoriesDropdownOpen
                      ? 'bg-primary/20 text-white'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <BookOpen className="mr-3 h-5 w-5" />
                    {t('common.categories', 'Categorías')}
                  </div>
                  <i className={`fa-solid fa-chevron-down text-xs transition-transform ${categoriesDropdownOpen ? 'rotate-180' : ''}`}></i>
                </button>
                {categoriesDropdownOpen && categories.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-4">
                    {categories.map((category, index) => (
                      <Link
                        key={category.id || index}
                        to={category.id ? getPathWithLocale(`/category/${category.id}`) : getPathWithLocale(`/browse?category=${category.slug || category.name}`)}
                        onClick={() => {
                          setSidebarOpen(false);
                          setCategoriesDropdownOpen(false);
                        }}
                        className="block px-3 py-2 text-sm text-gray-400 hover:text-primary hover:bg-white/5 rounded-lg transition-colors"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <a 
                href="#seguir-viendo"
                onClick={(e) => {
                  e.preventDefault();
                  setSidebarOpen(false);
                  // Navigate to home first if not already there
                  if (pathname !== '/' && !pathname.endsWith('/')) {
                    navigate(getPathWithLocale('/'));
                    // Wait for navigation then scroll
                    setTimeout(() => {
                      const element = document.getElementById('seguir-viendo');
                      if (element) {
                        const headerOffset = 80;
                        const elementPosition = element.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                        window.scrollTo({
                          top: offsetPosition,
                          behavior: 'smooth'
                        });
                      }
                    }, 100);
                  } else {
                    const element = document.getElementById('seguir-viendo');
                    if (element) {
                      const headerOffset = 80;
                      const elementPosition = element.getBoundingClientRect().top;
                      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      });
                    }
                  }
                }}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  pathname === '/' ? 'text-gray-300 hover:bg-white/5 hover:text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Play className="mr-3 h-5 w-5" />
                {t('common.continue_watching', 'Seguir Viendo')}
              </a>

              <Link 
                to={getPathWithLocale("/browse")}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive('/browse')
                    ? 'bg-primary/20 text-white font-semibold'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Search className="mr-3 h-5 w-5" />
                {t('common.browse', 'Browse')}
              </Link>

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setSidebarOpen(false);
                  handleDirectosClick(e);
                }}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive('/video')
                    ? 'bg-primary/20 text-white font-semibold'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Play className="mr-3 h-5 w-5" />
                {t('common.live', 'Directos')}
              </a>

              <Link 
                to={getPathWithLocale("/kids")}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive('/kids')
                    ? 'bg-primary/20 text-white font-semibold'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <img src={angelitaImage} alt="Angelita" className="h-5 w-5 mr-3 object-contain animate-bounce" />
                {t('common.sacrart_kids', 'Sacrart Kids')}
              </Link>

              <Link 
                to={getPathWithLocale("/store")}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive('/store')
                    ? 'bg-primary/20 text-white font-semibold'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-store mr-3 h-5 w-5"></i>
                {t('common.store', 'Tienda')}
              </Link>

              {/* <Link 
                to={getPathWithLocale("/subscription")}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive('/subscription')
                    ? 'bg-primary/20 text-white font-semibold'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <CreditCard className="mr-3 h-5 w-5" />
                {t('common.plans', 'Planes')}
              </Link>

              <Link 
                to={getPathWithLocale("/support")}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive('/support')
                    ? 'bg-primary/20 text-white font-semibold'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <HelpCircle className="mr-3 h-5 w-5" />
                {t('common.support', 'Soporte')}
              </Link> */}
            </nav>

            {/* User Section at Bottom */}
            <div className="px-4 py-4 border-t border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="size-10 rounded-full bg-gradient-to-br from-primary to-[#783e34] p-[2px] shrink-0">
                  <div className="size-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                    {(user as any).avatar ? (
                      <img 
                        src={(user as any).avatar} 
                        alt={user.name || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              <Link
                to={getPathWithLocale("/profile")}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors mb-2"
              >
                <User className="mr-3 h-4 w-4" />
                {t('common.profile', 'Perfil')}
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors"
              >
                <LogOut className="mr-3 h-4 w-4" />
                {t('common.logout', 'Cerrar Sesión')}
              </button>
            </div>
          </div>
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
      <main className="pt-16 sm:pt-20 flex-1">
        <Outlet />
      </main>

      {/* Footer - Only show when user is authenticated - Based on code.html */}
      {user && (
        <footer className="bg-[#0f0b0c] border-t border-white/5 pt-16 pb-8 px-4 md:px-16 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
            <div className="flex flex-col gap-4 max-w-xs">
              <div className="flex items-center gap-2">
                <div className="h-8 w-auto">
                  <img 
                    alt="SACRART Logo" 
                    className="h-full w-auto object-contain" 
                    src={logoImage}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {footerSettings.footer_description || t('footer.description', 'La primera plataforma de streaming dedicada exclusivamente a la enseñanza y difusión del arte sacro.')}
              </p>
              <div className="flex gap-4 text-gray-400 mt-2">
                {footerSettings.footer_social_instagram && footerSettings.footer_social_instagram !== 'https://' && (
                  <a 
                    href={footerSettings.footer_social_instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
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
                    className="hover:text-white transition-colors"
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
                    className="hover:text-white transition-colors"
                    aria-label="Twitter"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                )}
                {footerSettings.footer_social_youtube && footerSettings.footer_social_youtube !== 'https://' && (
                  <a 
                    href={footerSettings.footer_social_youtube} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                    aria-label="YouTube"
                  >
                    <Youtube className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full md:w-auto">
              <div className="flex flex-col gap-3">
                <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-1">{t('footer.explore', 'Explorar')}</h4>
                <Link to={getPathWithLocale("/browse")} className="text-gray-400 hover:text-primary text-sm transition-colors">
                  {t('footer.modeling', 'Modelado')}
                </Link>
                <Link to={getPathWithLocale("/browse")} className="text-gray-400 hover:text-primary text-sm transition-colors">
                  {t('footer.carving', 'Talla')}
                </Link>
                <Link to={getPathWithLocale("/browse")} className="text-gray-400 hover:text-primary text-sm transition-colors">
                  {t('footer.polychromy', 'Policromia')}
                </Link>
                <Link to={getPathWithLocale("/browse")} className="text-gray-400 hover:text-primary text-sm transition-colors">
                  {t('footer.materials', 'Materiales')}
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-1">{t('footer.account', 'Cuenta')}</h4>
                <Link to={getPathWithLocale("/profile")} className="text-gray-400 hover:text-primary text-sm transition-colors">
                  {t('footer.my_profile', 'Mi Perfil')}
                </Link>
                <Link to={getPathWithLocale("/library")} className="text-gray-400 hover:text-primary text-sm transition-colors">
                  {t('footer.my_list', 'Mi Lista')}
                </Link>
                <Link to={getPathWithLocale("/profile")} className="text-gray-400 hover:text-primary text-sm transition-colors">
                  {t('footer.certificates', 'Certificados')}
                </Link>
                <Link to={getPathWithLocale("/subscription")} className="text-gray-400 hover:text-primary text-sm transition-colors">
                  {t('footer.subscription', 'Suscripción')}
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-1">{t('footer.help', 'Ayuda')}</h4>
                <Link to={getPathWithLocale("/support")} className="text-gray-400 hover:text-primary text-sm transition-colors">
                  {t('footer.support', 'Soporte')}
                </Link>
                <Link to={getPathWithLocale("/support")} className="text-gray-400 hover:text-primary text-sm transition-colors">
                  {t('footer.faq', 'Preguntas Frecuentes')}
                </Link>
                <Link to={getPathWithLocale("/support")} className="text-gray-400 hover:text-primary text-sm transition-colors">
                  {t('footer.contact', 'Contacto')}
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-1">{t('footer.legal', 'Legal')}</h4>
                <a href="#" className="text-gray-400 hover:text-primary text-sm transition-colors">
                  {t('footer.terms', 'Términos')}
                </a>
                <a href="#" className="text-gray-400 hover:text-primary text-sm transition-colors">
                  {t('footer.privacy', 'Privacidad')}
                </a>
                <a href="#" className="text-gray-400 hover:text-primary text-sm transition-colors">
                  {t('footer.cookies', 'Cookies')}
                </a>
              </div>
            </div>
          </div>
          <div className="text-center text-xs text-gray-600 mt-16 pt-8 border-t border-white/5">
            {footerSettings.footer_copyright || `© ${new Date().getFullYear()} SACRART. ${t('footer.all_rights_reserved', 'Todos los derechos reservados.')}`}
          </div>
        </footer>
      )}
    </div>
  );
};

export default UserLayout;

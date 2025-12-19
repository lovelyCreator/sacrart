import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { userProgressApi, UserProgress } from '@/services/userProgressApi';
import { subscriptionPlanApi } from '@/services/subscriptionPlanApi';
import { videoApi } from '@/services/videoApi';
import { supportTicketApi, SupportTicket as TicketType } from '@/services/supportTicketApi';
import { faqApi, Faq } from '@/services/faqApi';
import { api } from '@/lib/api';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { getPathWithLocale, locale } = useLocale();
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const [activeTab, setActiveTab] = useState<'account' | 'activity' | 'support'>('account');
  const [activitySubTab, setActivitySubTab] = useState<'watching' | 'list'>('watching');
  const [loading, setLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [myList, setMyList] = useState<any[]>([]);
  const [subscriptionPlan, setSubscriptionPlan] = useState<any>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  
  // Support section states
  const [supportSearchTerm, setSupportSearchTerm] = useState('');
  const [supportTickets, setSupportTickets] = useState<TicketType[]>([]);
  const [supportFaqs, setSupportFaqs] = useState<Faq[]>([]);
  const [expandedSupportFAQ, setExpandedSupportFAQ] = useState<number | null>(null);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [isTicketDetailOpen, setIsTicketDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    category: 'general' as 'technical' | 'billing' | 'account' | 'content' | 'general',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  // Form states
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '********',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      loadContinueWatching();
      loadMyList();
      loadSubscriptionPlan();
      if (activeTab === 'support') {
        loadSupportData();
      }
    }
  }, [user, activeTab]);
  
  const loadSupportData = async () => {
    if (!user) return;
    setLoadingSupport(true);
    try {
      // Load tickets
      const ticketsResponse = await supportTicketApi.getUserTickets();
      if (ticketsResponse.success) {
        const ticketsData = Array.isArray(ticketsResponse.data) ? ticketsResponse.data : ticketsResponse.data?.data || [];
        setSupportTickets(ticketsData);
      }
      
      // Load FAQs
      const faqsResponse = await faqApi.getFaqs(undefined, locale);
      if (faqsResponse.success) {
        const faqData = faqsResponse.data || {};
        const allFaqs: Faq[] = [];
        Object.values(faqData).forEach((categoryFaqs: any) => {
          if (Array.isArray(categoryFaqs)) {
            allFaqs.push(...categoryFaqs);
          }
        });
        setSupportFaqs(allFaqs.slice(0, 4)); // Show first 4 FAQs like in code2.html
      }
    } catch (error) {
      console.error('Error loading support data:', error);
    } finally {
      setLoadingSupport(false);
    }
  };

  const loadContinueWatching = async () => {
    if (!user) return;
    setLoadingProgress(true);
    try {
      const response = await userProgressApi.continueWatching(10);
      if (response.success && response.data) {
        const progressData = Array.isArray(response.data) ? response.data : response.data.data || [];
        // Fetch full video details for each progress item
        const videosWithDetails = await Promise.all(
          progressData.map(async (progress: UserProgress) => {
            if (progress.video_id && progress.video) {
              return {
                ...progress,
                video: progress.video,
              };
            } else if (progress.video_id) {
              try {
                const videoResponse = await videoApi.get(progress.video_id);
                return {
                  ...progress,
                  video: videoResponse.data || videoResponse,
                };
              } catch {
                return null;
              }
            }
            return null;
          })
        );
        setContinueWatching(videosWithDetails.filter(Boolean));
      }
    } catch (error) {
      console.error('Error loading continue watching:', error);
      setContinueWatching([]);
    } finally {
      setLoadingProgress(false);
    }
  };

  const loadMyList = async () => {
    if (!user) return;
    try {
      const response = await userProgressApi.getFavoritesList();
      if (response.success && response.data) {
        const favoritesData = Array.isArray(response.data) ? response.data : [];
        setMyList(favoritesData);
      } else if (Array.isArray(response)) {
        setMyList(response);
      } else if (response.data && Array.isArray(response.data)) {
        setMyList(response.data);
      } else {
        setMyList([]);
      }
    } catch (error) {
      console.error('Error loading my list:', error);
      setMyList([]);
    }
  };

  const loadSubscriptionPlan = async () => {
    if (!user) return;
    setLoadingSubscription(true);
    try {
      const response = await subscriptionPlanApi.getPublic();
      if (response.success && response.data) {
        const plans = Array.isArray(response.data) ? response.data : [];
        const userPlan = plans.find((p: any) => 
          p.name?.toLowerCase() === user.subscription_type?.toLowerCase() ||
          p.id === user.subscription_type
        );
        setSubscriptionPlan(userPlan);
      }
    } catch (error) {
      console.error('Error loading subscription plan:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('profile.passwords_dont_match', 'Passwords don\'t match'));
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual password change API
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(t('profile.password_updated', 'Password updated successfully'));
      setShowPasswordDialog(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error(t('profile.password_update_failed', 'Failed to update password'));
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://72.61.297.64:8000/api';
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/payments/stripe/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          return_url: `${window.location.origin}${window.location.pathname}`,
        }),
      });

      const data = await response.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error(data.message || 'Failed to create billing portal session');
      }
    } catch (error: any) {
      console.error('Error opening billing portal:', error);
      toast.error(error.message || t('profile.billing_portal_error', 'Failed to open billing management'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePlan = () => {
    navigate(getPathWithLocale('/subscription'));
  };

  const handleCancelSubscription = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual cancellation API
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(t('profile.subscription_cancelled', 'Subscription cancelled successfully'));
    } catch (error) {
      toast.error(t('profile.cancel_failed', 'Failed to cancel subscription'));
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://72.61.297.64:8000';
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch {
      return '';
    }
  };

  const getMemberSince = () => {
    if (!user?.created_at) return '';
    try {
      const date = new Date(user.created_at);
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const monthName = months[date.getMonth()];
      const year = date.getFullYear();
      const now = new Date();
      const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
      return `${monthName} ${year} (${diffMonths} Meses)`;
    } catch {
      return '';
    }
  };

  const getPlanDisplayName = () => {
    if (!subscriptionPlan) {
      return user?.subscription_type || 'Aprendiz';
    }
    return subscriptionPlan.display_name || subscriptionPlan.name || 'Aprendiz';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">{t('auth.sign_in', 'Sign In')}</h1>
          <Button onClick={() => navigate('/auth')}>
            {t('auth.sign_in', 'Sign In')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-grow w-full flex flex-col lg:flex-row max-w-[1800px] mx-auto min-h-[calc(100vh-64px)] bg-[#0A0A0A]">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-[#151515] border-r border-white/5 flex-shrink-0 flex flex-col">
        <div className="p-8 flex flex-col items-center text-center border-b border-white/5">
          <div className="w-20 h-20 rounded-full p-1 border border-white/10 mb-4 relative group">
            <img 
              alt="Perfil" 
              className="w-full h-full rounded-full object-cover" 
              src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=A05245&color=fff`}
            />
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
              <i className="fa-solid fa-edit text-white text-sm"></i>
            </div>
          </div>
          <h2 className="text-white font-serif text-lg font-semibold tracking-wide mb-1">{user.name || 'Usuario'}</h2>
          <div className="flex items-center gap-1.5">
            <i className="fa-solid fa-star text-primary text-[14px]"></i>
            <span className="text-primary text-[10px] font-bold uppercase tracking-widest">Plan {getPlanDisplayName()}</span>
          </div>
        </div>
        <nav className="flex-grow py-6 px-4 space-y-1">
          <button
            onClick={() => setActiveTab('account')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-md border-l-2 transition-all group ${
              activeTab === 'account'
                ? 'bg-primary/10 text-primary border-primary'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/20'
            }`}
          >
            <i className="fa-solid fa-user text-[20px]"></i>
            <span className="text-xs font-medium uppercase tracking-wider">{t('profile.my_account', 'Mi Cuenta')}</span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-md border-l-2 transition-all group ${
              activeTab === 'activity'
                ? 'bg-primary/10 text-primary border-primary'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/20'
            }`}
          >
            <i className="fa-solid fa-tv text-[20px]"></i>
            <span className="text-xs font-medium uppercase tracking-wider">{t('profile.my_activity', 'Mi Actividad')}</span>
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-md border-l-2 transition-all group ${
              activeTab === 'support'
                ? 'bg-primary/10 text-primary border-primary'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/20'
            }`}
          >
            <i className="fa-solid fa-ticket text-[20px]"></i>
            <span className="text-xs font-medium uppercase tracking-wider">{t('profile.support', 'Soporte')}</span>
          </button>
        </nav>
        <div className="p-4 border-t border-white/5">
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-4 py-3 text-gray-500 hover:text-red-400 transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket text-[20px]"></i>
            <span className="text-xs font-medium uppercase tracking-wider">{t('profile.logout', 'Cerrar Sesión')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow p-6 lg:p-12 xl:p-16 relative overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Mi Cuenta Tab */}
          {activeTab === 'account' && (
            <>
              <div className="flex items-end justify-between border-b border-white/10 pb-6">
                <div>
                  <h1 className="text-3xl font-serif text-white mb-2">{t('profile.my_account', 'Mi Cuenta')}</h1>
                  <p className="text-gray-400 text-sm">{t('profile.manage_preferences', 'Gestiona tus preferencias regionales y suscripción.')}</p>
                </div>
              </div>

              {/* Regional Settings */}
              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                  {t('profile.regional_settings', 'Configuración Regional')}
                </h3>
                <div className="bg-[#151515] border border-white/5 rounded-lg p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      {t('profile.platform_language', 'Idioma de la Plataforma / Language')}
                    </label>
                    <p className="text-xs text-gray-500">
                      {t('profile.language_preference_note', 'Esta preferencia se guardará en tu perfil automáticamente.')}
                    </p>
                  </div>
                  <div className="relative w-full md:w-72">
                    <select
                      value={currentLanguage}
                      onChange={(e) => changeLanguage(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded px-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                    >
                      {languages.map((lang: any) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.native} {lang.code === 'es' ? '(Predeterminado)' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <i className="fa-solid fa-chevron-down text-sm"></i>
                    </div>
                  </div>
                </div>
              </section>

              {/* Subscription */}
              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                  {t('profile.my_subscription', 'Mi Suscripción')}
                </h3>
                <div className="bg-gradient-to-br from-[#121212] to-[#0f0f0f] border-l-4 border-primary rounded-r-lg p-6 lg:p-8 relative overflow-hidden shadow-lg group">
                  <div className="absolute top-0 right-0 w-64 h-full bg-primary/5 skew-x-12 pointer-events-none transition-all duration-500 group-hover:bg-primary/10"></div>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 bg-primary/20 border border-primary/30 rounded text-[10px] font-bold text-primary uppercase tracking-wider">
                          {t('profile.active', 'Activo')}
                        </span>
                      </div>
                      <h4 className="text-2xl font-serif text-white mb-3">PLAN: {getPlanDisplayName().toUpperCase()}</h4>
                      <div className="flex items-center gap-2 text-primary/90">
                        <i className="fa-solid fa-award text-lg"></i>
                        <p className="text-sm font-medium">
                          {t('profile.member_since', 'Miembro desde')}: {getMemberSince()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4">
                      <Button
                        onClick={handleUpgradePlan}
                        className="px-5 py-2.5 bg-primary hover:bg-[#8e493c] text-white text-xs font-bold uppercase tracking-widest rounded shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2"
                      >
                        <i className="fa-solid fa-arrow-up text-lg"></i>
                        {t('profile.upgrade_plan', 'Actualizar Plan')}
                      </Button>
                      <Button
                        onClick={handleManageBilling}
                        disabled={loading}
                        className="px-5 py-2.5 bg-[#222] hover:bg-[#333] border border-white/10 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-widest rounded transition-all flex items-center gap-2"
                      >
                        <i className="fa-solid fa-credit-card text-lg"></i>
                        {t('profile.update_card', 'Actualizar Tarjeta')}
                      </Button>
                      <Button
                        onClick={() => {}}
                        className="px-5 py-2.5 bg-white hover:bg-gray-200 text-black text-xs font-bold uppercase tracking-widest rounded shadow-lg shadow-white/5 hover:shadow-white/10 transition-all flex items-center gap-2"
                      >
                        <i className="fa-solid fa-download text-lg"></i>
                        {t('profile.download_invoices', 'Descargar Facturas')}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <button
                      onClick={handleCancelSubscription}
                      disabled={loading}
                      className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 uppercase tracking-wider font-medium transition-colors"
                    >
                      <i className="fa-solid fa-xmark text-lg"></i>
                      {t('profile.cancel_subscription', 'Cancelar Suscripción')}
                    </button>
                  </div>
                </div>
              </section>

              {/* Access Data */}
              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                  {t('profile.access_data', 'Datos de Acceso')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Email</label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="fa-solid fa-envelope text-gray-500 group-focus-within:text-primary transition-colors text-lg"></i>
                      </span>
                      <input
                        type="email"
                        value={formData.email}
                        readOnly
                        className="w-full bg-[#151515] border border-white/10 rounded px-3 py-3 pl-10 text-sm text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 placeholder-gray-600 transition-colors"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <i className="fa-solid fa-edit text-gray-600 text-sm"></i>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">{t('profile.password', 'Contraseña')}</label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="fa-solid fa-lock text-gray-500 group-focus-within:text-primary transition-colors text-lg"></i>
                      </span>
                      <input
                        type="password"
                        value={formData.password}
                        readOnly
                        className="w-full bg-[#151515] border border-white/10 rounded px-3 py-3 pl-10 text-sm text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 placeholder-gray-600 transition-colors"
                      />
                      <button
                        onClick={() => setShowPasswordDialog(true)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors"
                      >
                        <span className="text-[10px] uppercase font-bold">{t('profile.change', 'Cambiar')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Mi Actividad Tab */}
          {activeTab === 'activity' && (
            <>
              <div className="border-b border-white/10 mb-8">
                <h1 className="text-3xl font-serif text-white mb-8">{t('profile.creative_progress', 'Tu Progreso Creativo')}</h1>
                <div className="flex gap-8 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setActivitySubTab('watching')}
                    className={`relative pb-4 text-xs uppercase tracking-widest flex items-center gap-2 transition-colors ${
                      activitySubTab === 'watching'
                        ? 'text-white font-bold'
                        : 'text-gray-500 hover:text-white font-medium'
                    }`}
                  >
                    <i className={`fa-solid fa-eye text-lg ${activitySubTab === 'watching' ? 'text-white' : 'group-hover:text-primary transition-colors'}`}></i>
                    {t('profile.continue_watching', 'Siguiendo')}
                    {activitySubTab === 'watching' && (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>
                    )}
                  </button>
                  <button
                    onClick={() => setActivitySubTab('list')}
                    className={`relative pb-4 text-xs uppercase tracking-widest flex items-center gap-2 transition-colors group ${
                      activitySubTab === 'list'
                        ? 'text-white font-bold'
                        : 'text-gray-500 hover:text-white font-medium'
                    }`}
                  >
                    <i className={`fa-solid fa-heart text-lg ${activitySubTab === 'list' ? 'text-white' : 'group-hover:text-primary transition-colors'}`}></i>
                    {t('profile.my_list', 'Mi Lista')}
                    {activitySubTab === 'list' ? (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>
                    ) : (
                      <span className="absolute bottom-0 left-0 w-0 group-hover:w-full h-0.5 bg-white/20 transition-all duration-300"></span>
                    )}
                  </button>
                </div>
              </div>

              {/* Continue Watching */}
              {activitySubTab === 'watching' && (
                <section>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.5)]"></span>
                    {t('profile.continue_watching', 'Continuar Viendo')}
                  </h3>
                  {loadingProgress ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : continueWatching.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      {t('profile.no_continue_watching', 'No hay videos en progreso')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {continueWatching.map((item: any) => {
                        const video = item.video || item;
                        const progress = item.progress_percentage || 0;
                        const thumbnail = video.thumbnail_url || video.poster_url || '';
                        
                        return (
                          <div
                            key={item.id || video.id}
                            onClick={() => navigate(getPathWithLocale(`/video/${video.id}`))}
                            className="group relative bg-[#151515] rounded-lg overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1"
                          >
                            <div className="aspect-video relative overflow-hidden">
                              <img
                                alt={video.title || 'Video'}
                                className="object-cover w-full h-full opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                src={getImageUrl(thumbnail)}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center">
                                  <i className="fa-solid fa-play text-white text-2xl"></i>
                                </div>
                              </div>
                              <div className="absolute bottom-3 left-0 right-0 px-4 flex justify-between items-end">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-black/60 px-2 py-1 rounded backdrop-blur-md border border-white/10">
                                  {t('profile.resume', 'Reanudar')}: {video.title || 'Lección'}
                                </span>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                                <div
                                  className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)] relative"
                                  style={{ width: `${progress}%` }}
                                >
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-600 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                              </div>
                            </div>
                            <div className="p-4">
                              <h4 className="font-serif text-sm text-white mb-1 group-hover:text-primary transition-colors">
                                {video.title || 'Sin título'}
                              </h4>
                              <p className="text-[11px] text-gray-500 font-medium">
                                {video.series?.name || video.category?.name || 'Sin categoría'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* My List */}
              {activitySubTab === 'list' && (
                <section>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                    {t('profile.my_list', 'Mi Lista')}
                  </h3>
                  {myList.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      {t('profile.no_favorites', 'No hay videos en tu lista')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {myList.map((item: any) => {
                        const video = item.video || item;
                        const thumbnail = video.thumbnail_url || video.poster_url || '';
                        
                        return (
                          <div
                            key={item.id || video.id}
                            onClick={() => navigate(getPathWithLocale(`/video/${video.id}`))}
                            className="relative group cursor-pointer"
                          >
                            <div className="aspect-[2/3] rounded-lg overflow-hidden relative border border-white/5 hover:border-white/20 transition-all bg-[#151515]">
                              <img
                                alt={video.title || 'Video'}
                                className="object-cover w-full h-full hover:scale-110 transition-transform duration-700"
                                src={getImageUrl(thumbnail)}
                              />
                              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 translate-y-2 group-hover:translate-y-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Remove from favorites
                                  }}
                                  className="bg-black/60 hover:bg-red-600 text-white w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-md border border-white/10 transition-colors"
                                >
                                  <i className="fa-solid fa-xmark text-base"></i>
                                </button>
                              </div>
                              <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                                <h5 className="text-xs font-serif font-bold text-white leading-tight">
                                  {video.title || 'Sin título'}
                                </h5>
                                {video.duration && (
                                  <p className="text-[10px] text-gray-400 mt-1">
                                    {Math.floor(video.duration / 60)}h {video.duration % 60}m
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {/* Soporte Tab */}
          {activeTab === 'support' && (
            <>
              <div className="space-y-6">
                <h1 className="text-3xl font-serif text-white">
                  {t('profile.need_help', '¿Necesitas ayuda')}, {user.name || 'Usuario'}?
                </h1>
                <div className="relative w-full">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="fa-solid fa-search text-gray-500 text-xl"></i>
                  </span>
                  <input
                    value={supportSearchTerm}
                    onChange={(e) => setSupportSearchTerm(e.target.value)}
                    className="w-full bg-[#151515] border border-white/10 rounded-lg py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base"
                    placeholder={t('profile.search_doubt', 'Busca tu duda (ej: Factura, Vídeo no carga...)')}
                    type="text"
                  />
                </div>
              </div>

              {/* FAQ Section */}
              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                  {t('profile.faq', 'Preguntas Frecuentes')}
                </h3>
                <div className="bg-[#151515] border border-white/5 rounded-lg divide-y divide-white/5">
                  {supportFaqs.map((faq) => (
                    <details
                      key={faq.id}
                      className="group"
                      open={expandedSupportFAQ === faq.id}
                      onToggle={(e) => {
                        setExpandedSupportFAQ(e.currentTarget.open ? faq.id : null);
                      }}
                    >
                      <summary className="flex justify-between items-center p-5 cursor-pointer hover:bg-white/5 transition-colors">
                        <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                          {faq.question || ''}
                        </span>
                        <i className={`fa-solid fa-plus text-gray-500 group-hover:text-primary transition-colors transform ${expandedSupportFAQ === faq.id ? 'rotate-45' : ''}`}></i>
                      </summary>
                      <div className="px-5 pb-5 pt-0 text-sm text-gray-400 leading-relaxed">
                        {faq.answer || ''}
                      </div>
                    </details>
                  ))}
                  {supportFaqs.length === 0 && !loadingSupport && (
                    <div className="p-5 text-sm text-gray-400 text-center">
                      {t('profile.no_faqs_available', 'No hay preguntas frecuentes disponibles')}
                    </div>
                  )}
                </div>
              </section>

              {/* Recent Tickets */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    {t('profile.recent_queries', 'Tus Consultas Recientes')}
                  </h3>
                </div>
                <div className="flex flex-col gap-4">
                  {supportTickets.slice(0, 5).map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsTicketDetailOpen(true);
                      }}
                      className="bg-[#151515] border border-white/5 rounded-lg p-5 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                          <i className="fa-solid fa-ticket text-lg"></i>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-white">{ticket.subject || t('profile.no_subject', 'Sin asunto')}</span>
                            <span className="text-[10px] text-gray-500">#{ticket.id}</span>
                          </div>
                          <p className="text-xs text-gray-400">
                            {t('profile.last_update', 'Última actualización')}: {formatDate(ticket.updated_at || ticket.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {ticket.status === 'resolved' || ticket.status === 'closed' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded border border-green-500/20 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">
                            {t('profile.resolved', 'Resuelto')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase tracking-wider">
                            {t('profile.pending', 'Pendiente')}
                          </span>
                        )}
                        <i className="fa-solid fa-chevron-right text-gray-600 group-hover:text-white text-lg"></i>
                      </div>
                    </div>
                  ))}
                  {supportTickets.length === 0 && !loadingSupport && (
                    <div className="text-center py-8 text-gray-400">
                      {t('profile.no_tickets', 'No hay consultas recientes')}
                    </div>
                  )}
                </div>
              </section>

              {/* Create New Ticket Button */}
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={() => setIsCreateTicketOpen(true)}
                  className="fixed bottom-8 right-8 z-40 md:static md:w-auto shadow-lg shadow-primary/20 px-6 py-4 bg-primary hover:bg-[#8e493c] text-white rounded-full md:rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 flex items-center gap-3"
                >
                  <i className="fa-solid fa-envelope text-lg"></i>
                  <span>{t('profile.open_new_query', 'Abrir Nueva Consulta')}</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[500px] bg-[#141414] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{t('profile.change_password', 'Cambiar Contraseña')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('profile.enter_current_new_password', 'Ingresa tu contraseña actual y elige una nueva.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-white">{t('profile.current_password', 'Contraseña Actual')}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="bg-[#1a1a1a] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-white">{t('profile.new_password', 'Nueva Contraseña')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="bg-[#1a1a1a] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">{t('profile.confirm_password', 'Confirmar Nueva Contraseña')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="bg-[#1a1a1a] border-white/10 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} className="border-white/10">
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button onClick={handlePasswordChange} disabled={loading} className="bg-primary hover:bg-[#8e493e]">
              {t('profile.update_password', 'Actualizar Contraseña')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
        <DialogContent className="sm:max-w-[600px] bg-[#141414] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{t('profile.create_ticket', 'Crear Nueva Consulta')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('profile.describe_issue', 'Describe tu problema y nuestro equipo te ayudará')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ticket-subject" className="text-white">{t('profile.subject', 'Asunto')}</Label>
              <Input
                id="ticket-subject"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder={t('profile.brief_description', 'Breve descripción')}
                className="bg-[#1a1a1a] border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticket-category" className="text-white">{t('profile.category', 'Categoría')}</Label>
                <select
                  id="ticket-category"
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white"
                >
                  <option value="technical">{t('profile.technical', 'Técnico')}</option>
                  <option value="billing">{t('profile.billing', 'Facturación')}</option>
                  <option value="account">{t('profile.account', 'Cuenta')}</option>
                  <option value="content">{t('profile.content', 'Contenido')}</option>
                  <option value="general">{t('profile.general', 'General')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-priority" className="text-white">{t('profile.priority', 'Prioridad')}</Label>
                <select
                  id="ticket-priority"
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white"
                >
                  <option value="low">{t('profile.low', 'Baja')}</option>
                  <option value="medium">{t('profile.medium', 'Media')}</option>
                  <option value="high">{t('profile.high', 'Alta')}</option>
                  <option value="urgent">{t('profile.urgent', 'Urgente')}</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-description" className="text-white">{t('profile.description', 'Descripción')}</Label>
              <textarea
                id="ticket-description"
                value={ticketForm.description}
                onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('profile.provide_detail', 'Proporciona más detalles')}
                className="w-full min-h-[120px] bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white placeholder-gray-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTicketOpen(false)} className="border-white/10">
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button
              onClick={async () => {
                setLoading(true);
                try {
                  const response = await supportTicketApi.create({
                    subject: ticketForm.subject,
                    description: ticketForm.description,
                    category: ticketForm.category,
                    priority: ticketForm.priority,
                  });
                  
                  if (response.success) {
                    const newTicket = response.data;
                    setSupportTickets(prev => [newTicket, ...prev]);
                    setIsCreateTicketOpen(false);
                    setTicketForm({
                      subject: '',
                      description: '',
                      category: 'general',
                      priority: 'medium',
                    });
                    toast.success(t('profile.ticket_created', 'Consulta creada exitosamente'));
                  }
                } catch (error) {
                  console.error('Error creating ticket:', error);
                  toast.error(t('profile.failed_create', 'Error al crear consulta'));
                } finally {
                  setLoading(false);
                }
              }}
              disabled={!ticketForm.subject || !ticketForm.description || loading}
              className="bg-primary hover:bg-[#8e493e]"
            >
              {t('profile.create_ticket_btn', 'Crear Consulta')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Dialog */}
      <Dialog open={isTicketDetailOpen} onOpenChange={setIsTicketDetailOpen}>
        <DialogContent className="sm:max-w-[700px] bg-[#141414] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <span>{selectedTicket?.subject || t('profile.no_subject', 'Sin asunto')}</span>
              <span className="text-sm text-gray-400">#{selectedTicket?.id}</span>
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedTicket && (
                <div className="flex items-center space-x-4 mt-2">
                  {selectedTicket.status === 'resolved' || selectedTicket.status === 'closed' ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded border border-green-500/20 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">
                      {t('profile.resolved', 'Resuelto')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase tracking-wider">
                      {t('profile.pending', 'Pendiente')}
                    </span>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              {selectedTicket.description && (
                <div className="p-3 bg-[#1a1a1a] rounded-lg">
                  <p className="text-sm text-gray-300">{selectedTicket.description}</p>
                </div>
              )}
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedTicket.replies?.map((reply: any) => (
                  <div key={reply.id} className={`flex ${(reply.user_id === user?.id) ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      (reply.user_id === user?.id)
                        ? 'bg-primary text-white'
                        : 'bg-[#1a1a1a] text-gray-300'
                    }`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium">{reply.user?.name || t('profile.support_user', 'Soporte')}</span>
                        <span className="text-xs opacity-70">{formatDate(reply.created_at || reply.updated_at)}</span>
                      </div>
                      <p className="text-sm">{reply.message || ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTicketDetailOpen(false)} className="border-white/10">
              {t('profile.close', 'Cerrar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Profile;

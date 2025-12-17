import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { subscriptionPlanApi } from "@/services/subscriptionPlanApi";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/hooks/useLocale";
import logoSA from '@/assets/logoSA-negro.png';
import { settingsApi } from '@/services/settingsApi';

interface Plan {
  id: 'freemium' | 'basic' | 'premium';
  name: string;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
}

const SignupSubscription = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendPlans, setBackendPlans] = useState<any[]>([]);
  const [footerSettings, setFooterSettings] = useState<Record<string, any>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const { t } = useTranslation();
  const { navigateWithLocale } = useLocale();

  // Check if state contains signup data (email, password, name)
  const signupData = location.state as { email: string; password: string; name: string } | null;

  // Note: SignupSubscriptionProtectedRoute handles the redirect if no signup data
  // This is just a safety check
  useEffect(() => {
    if (!signupData || !signupData.email || !signupData.password || !signupData.name) {
      console.warn('No signup data found, redirecting to auth');
      navigate("/auth");
    }
  }, [signupData, navigate]);

  // Load footer settings
  useEffect(() => {
    const loadFooterSettings = async () => {
      try {
        const response = await settingsApi.getFooter();
        if (response?.success && response.data) {
          setFooterSettings(response.data);
        }
      } catch (error) {
        console.error('Failed to load footer settings:', error);
      }
    };
    loadFooterSettings();
  }, []);

  useEffect(() => {
    // Load active plans from backend so we can map to Stripe price via plan id
    const loadPlans = async () => {
      try {
        const response = await subscriptionPlanApi.getPublic();
        if (response?.success && Array.isArray(response.data)) {
          setBackendPlans(response.data);
          console.log('✅ Loaded subscription plans from backend:', response.data);
        } else {
          console.warn('⚠️ Backend plans response format unexpected:', response);
        }
      } catch (e) {
        // non-blocking
        console.error('❌ Failed to load backend plans:', e);
        toast.error(t('subscription.failed_load_backend_plans') || 'Failed to load subscription plans');
      }
    };
    loadPlans();
  }, [t]);

  const handleSelectPlan = async (plan: Plan) => {
    if (!signupData) {
      toast.error(t('subscription.missing_info'));
      navigate("/auth");
      return;
    }

    console.log('=== Plan Selected (Signup) ===');
    console.log('Plan:', plan.name, 'ID:', plan.id);
    
    setSelectedPlan(plan.name);
    setIsLoading(true);
    
    try {
      const { email, password, name } = signupData;
      console.log('Registration data:', { name, email, subscription: plan.id });
      
      // Register user first (always freemium, then upgrade via Stripe if paid)
      console.log('📝 Registering user as freemium...');
      await register(name, email, password, 'freemium');
      console.log('✅ Registration successful! User is now authenticated.');
      
      // Wait a moment to ensure auth state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // If it's a paid plan, trigger Stripe checkout after registration
      if (plan.id !== 'freemium') {
        console.log('💳 Paid plan selected, preparing Stripe checkout...');
        
        // Ensure backend plans are loaded
        if (backendPlans.length === 0) {
          console.warn('⚠️ Backend plans not loaded yet, fetching now...');
          try {
            const response = await subscriptionPlanApi.getPublic();
            if (response?.success && Array.isArray(response.data)) {
              setBackendPlans(response.data);
              console.log('✅ Backend plans loaded:', response.data);
            }
          } catch (e) {
            console.error('❌ Failed to load backend plans:', e);
            toast.error('Failed to load subscription plans. Please try again.');
            const locale = localStorage.getItem('i18nextLng') || 'en';
            navigate(`/${locale}`);
            return;
          }
        }
        
        // Find corresponding plan in backend
        const match = backendPlans.find(p => p.name?.toLowerCase() === plan.id.toLowerCase());
        console.log('🔍 Looking for plan match:', {
          searchingFor: plan.id,
          availablePlans: backendPlans.map(p => ({ id: p.id, name: p.name, display_name: p.display_name }))
        });
        
        if (!match) {
          console.error('❌ Plan not found in backend during signup:', {
            planId: plan.id,
            planName: plan.name,
            availablePlans: backendPlans.map(p => ({ id: p.id, name: p.name, display_name: p.display_name }))
          });
          toast.error(t('subscription.not_available') + ` - Plan "${plan.name}" not found. Please contact support.`);
          // Still navigate to home since registration succeeded
          const locale = localStorage.getItem('i18nextLng') || 'en';
          navigate(`/${locale}`);
          return;
        }

        console.log('✅ Plan found:', match);

        // Check if plan has Stripe price ID configured
        if (!match.stripe_price_id) {
          console.error('❌ Plan does not have Stripe price ID configured:', {
            planId: match.id,
            planName: match.name,
            stripe_price_id: match.stripe_price_id
          });
          toast.error(t('subscription.stripe_not_configured') || 'This plan is not configured for payment. Please contact support.');
          const locale = localStorage.getItem('i18nextLng') || 'en';
          navigate(`/${locale}`);
          return;
        }

        console.log('✅ Plan has Stripe price ID:', match.stripe_price_id);

        // Trigger Stripe checkout for paid plan
        const locale = localStorage.getItem('i18nextLng') || 'en';
        const successUrl = `${window.location.origin}/${locale}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${window.location.origin}/${locale}/subscription?payment=cancel`;

        console.log('🚀 Creating Stripe checkout session...', {
          planId: match.id,
          successUrl,
          cancelUrl
        });

        try {
          const data = await api.createStripeCheckoutSession(match.id, successUrl, cancelUrl);
          console.log('📦 Stripe checkout response:', data);
          
          if (data?.success && data.url) {
            console.log('✅ Stripe checkout URL received, redirecting...', data.url);
            // Redirect to Stripe Checkout
            window.location.href = data.url;
            return;
          } else {
            console.error('❌ Stripe checkout failed:', data);
            throw new Error(data?.message || t('subscription.failed_start_checkout'));
          }
        } catch (stripeError) {
          console.error('❌ Error creating Stripe checkout session:', stripeError);
          throw stripeError;
        }
      } else {
        // Freemium plan - just show success and navigate
        console.log('✅ Freemium plan selected, no payment needed');
        toast.success(`${t('subscription.account_created')} ${plan.name} ${t('subscription.plan_success')}`);
        const locale = localStorage.getItem('i18nextLng') || 'en';
        navigate(`/${locale}`);
      }
    } catch (error) {
      console.error('❌ Subscription error:', error);
      let errorMessage = t('subscription.failed_process');
      
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      } else if (typeof error === 'object' && error !== null) {
        console.error('Error object:', error);
        errorMessage = (error as any).message || JSON.stringify(error);
      }
      
      toast.error(errorMessage);
    } finally {
      console.log('✅ Subscription process complete');
      setIsLoading(false);
    }
  };

  // Parse features from description (one feature per line)
  const parseFeatures = (description: string | undefined | null): string[] => {
    if (!description) return [];
    return description
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  // Get plan features
  const getPlanFeatures = (backendPlan: any): string[] => {
    let features: string[] = [];
    
    // First, try to get features from the features field
    if (backendPlan.features) {
      if (Array.isArray(backendPlan.features)) {
        features = backendPlan.features;
      } else if (typeof backendPlan.features === 'string') {
        try {
          const parsed = JSON.parse(backendPlan.features);
          features = Array.isArray(parsed) ? parsed : [];
        } catch {
          // If not JSON, treat as single feature
          features = [backendPlan.features];
        }
      }
    }
    
    // If no features from features field, try parsing from description
    if (features.length === 0 && backendPlan.description) {
      features = parseFeatures(backendPlan.description);
    }
    
    // Add feature flags from plan settings
    const planFeatures: string[] = [];
    
    // Max Devices
    if (backendPlan.max_devices) {
      planFeatures.push(`${backendPlan.max_devices} ${t('subscription.devices', 'pantallas simultáneas')}`);
    }
    
    // Video Quality
    if (backendPlan.video_quality) {
      planFeatures.push(`${backendPlan.video_quality} ${t('subscription.quality', 'calidad')}`);
    }
    
    // Downloadable Content
    if (backendPlan.downloadable_content) {
      planFeatures.push(t('subscription.downloadable_content', 'Descargas para ver offline'));
    }
    
    // Certificates
    if (backendPlan.certificates) {
      planFeatures.push(t('subscription.certificates', 'Certificados de finalización'));
    }
    
    // Priority Support
    if (backendPlan.priority_support) {
      planFeatures.push(t('subscription.priority_support', 'Soporte prioritario'));
    }
    
    // Ad Free
    if (backendPlan.ad_free) {
      planFeatures.push(t('subscription.ad_free', 'Sin anuncios'));
    }
    
    // Combine custom features with plan features
    return [...features, ...planFeatures];
  };

  // Sort plans: freemium first, then basic, then premium
  const displayPlans = backendPlans.sort((a, b) => {
    const order = { 'freemium': 1, 'basic': 2, 'premium': 3 };
    const aOrder = order[a.name?.toLowerCase() as keyof typeof order] || 999;
    const bOrder = order[b.name?.toLowerCase() as keyof typeof order] || 999;
    return aOrder - bOrder;
  });

  const isFreemium = (plan: any) => plan.name?.toLowerCase() === 'freemium';
  const isBasic = (plan: any) => plan.name?.toLowerCase() === 'basic';
  const isPremium = (plan: any) => plan.name?.toLowerCase() === 'premium';

  if (!signupData) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-dark font-display">
      {/* Header - Signout Status */}
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-background-dark/80 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto flex h-16 sm:h-20 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              alt="SACRART Logo"
              src={logoSA}
              className="h-8 sm:h-10 md:h-12 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/')}
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/auth')}
              className="flex h-9 sm:h-10 items-center justify-center rounded-lg border border-white/20 bg-white/5 px-3 sm:px-5 text-xs sm:text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10"
            >
              <span className="hidden sm:inline">{t('common.sign_in')}</span>
              <span className="sm:hidden">{t('common.sign_in').split(' ')[0]}</span>
            </Button>
            <Button
              onClick={() => navigate('/auth')}
              className="flex h-9 sm:h-10 items-center justify-center rounded-lg bg-primary px-3 sm:px-5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-[#8a4539]"
            >
              {t('common.sign_up')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col justify-center items-center relative py-16 px-4 pt-24 sm:pt-32">
        {/* Background gradient effects */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]"></div>
          <div className="absolute top-[40%] -right-[10%] w-[500px] h-[500px] bg-black/20 rounded-full blur-[100px]"></div>
        </div>

        {/* Header Section */}
        <div className="relative z-10 max-w-5xl w-full mx-auto text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 text-white leading-tight" style={{ fontFamily: "'Cinzel', serif" }}>
            {t('subscription.hero_title', '¡Ya sabía yo que ibas a querer ver más!')}
          </h1>
          <p className="text-lg text-white font-light max-w-2xl mx-auto opacity-90">
            {t('subscription.hero_description', '...elige el plan que mejor se adapte a tu ritmo de aprendizaje y profundidad espiritual.')}
          </p>
        </div>

        {/* Plans Grid */}
        {displayPlans.length === 0 ? (
          <div className="relative z-10 text-center py-12">
            <p className="text-white opacity-80 text-lg mb-4">
              {t('subscription.no_plans') || 'No subscription plans available at the moment.'}
            </p>
          </div>
        ) : (
          <div className={`relative z-10 grid gap-6 max-w-6xl w-full mx-auto ${
            displayPlans.length === 1 ? 'grid-cols-1' : 
            displayPlans.length === 2 ? 'md:grid-cols-2' : 
            'md:grid-cols-3'
          }`}>
            {displayPlans.map((backendPlan) => {
              const isPopular = isBasic(backendPlan); // Second plan (Basic) is recommended
              const features = getPlanFeatures(backendPlan);
              
              const displayPrice = isFreemium(backendPlan)
                ? t('subscription.plan_prices.free', 'Gratis')
                : (() => {
                    try {
                      let price: number;
                      if (typeof backendPlan?.price === 'number' && !isNaN(backendPlan.price)) {
                        price = backendPlan.price;
                      } else if (backendPlan?.price != null) {
                        const parsed = parseFloat(String(backendPlan.price));
                        price = isNaN(parsed) ? 0 : parsed;
                      } else {
                        price = 0;
                      }
                      if (typeof price === 'number' && !isNaN(price) && isFinite(price)) {
                        return price.toFixed(2);
                      }
                      return '0.00';
                    } catch (error) {
                      console.error('Error formatting price:', error, backendPlan);
                      return '0.00';
                    }
                  })();

              const hasStripe = !!backendPlan.stripe_price_id;
              const isStripeReady = isFreemium(backendPlan) || hasStripe;

              return (
                <div
                  key={backendPlan.id}
                  className={`group relative ${
                    isPopular
                      ? 'bg-gradient-to-b from-[#2e2e2e] to-[#202020] border border-primary/30 shadow-[0_0_30px_rgba(160,82,69,0.1)] hover:border-primary/60 transform scale-100 md:scale-105 z-10'
                      : 'bg-[#262626] border border-white/10 hover:border-white/20'
                  } rounded-xl p-8 transition-all duration-300 flex flex-col hover:-translate-y-1`}
                >
                  {/* Recommended Badge */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                      {t('subscription.recommended', 'Recomendado')}
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-6">
                    <h3 className="text-white text-xs font-bold tracking-[0.2em] uppercase mb-2">
                      {isFreemium(backendPlan)
                        ? t('subscription.plan_freemium_label', 'Plan Gratuito')
                        : isBasic(backendPlan)
                        ? t('subscription.plan_basic_label', 'Plan Básico')
                        : t('subscription.plan_premium_label', 'Experiencia Completa')}
                    </h3>
                    <h2 className="text-2xl font-semibold text-white mb-4">
                      {backendPlan.display_name || backendPlan.name}
                    </h2>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">{displayPrice}</span>
                      {!isFreemium(backendPlan) && (
                        <span className="text-white text-sm">€ / {t('subscription.month', 'mes')}</span>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className={`w-full h-px mb-6 ${isPopular ? 'bg-primary/20' : 'bg-white/10'}`}></div>

                  {/* Features List */}
                  <ul className="space-y-4 mb-8 flex-grow">
                    {features.length > 0 ? (
                      features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-white">
                          <i className={`fa-solid ${idx === 0 && isPremium(backendPlan) ? 'fa-crown' : 'fa-check'} text-primary text-lg flex-shrink-0 mt-0.5`}></i>
                          <span>{feature}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-white opacity-60">
                        {t('subscription.no_features_listed', 'Características próximamente')}
                      </li>
                    )}
                  </ul>

                  {/* Action Button */}
                  {!isStripeReady && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-sm text-yellow-400">
                        ⚠️ {t('subscription.payment_not_configured', 'Pago no configurado')}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => handleSelectPlan({
                      id: backendPlan.name.toLowerCase() as 'freemium' | 'basic' | 'premium',
                      name: backendPlan.display_name || backendPlan.name,
                      price: isFreemium(backendPlan) ? displayPrice : `${displayPrice}€`,
                      period: isFreemium(backendPlan) ? '' : t('subscription.month', 'mes'),
                      features: features,
                      popular: isPopular
                    })}
                    disabled={isLoading || !isStripeReady}
                    className={`w-full py-3 px-6 rounded text-white font-medium hover:bg-primary-hover transition-colors duration-300 text-sm tracking-wide uppercase shadow-lg ${
                      isPopular
                        ? 'bg-primary shadow-[0_0_15px_rgba(160,82,69,0.3)] font-bold'
                        : 'bg-primary'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isLoading && selectedPlan === backendPlan.name
                      ? t('subscription.processing', 'Procesando...')
                      : isFreemium(backendPlan)
                        ? t('subscription.select_freemium', 'Seleccionar Plan Gratuito')
                        : isBasic(backendPlan)
                          ? t('subscription.select_plan', 'Seleccionar Plan')
                          : t('subscription.start_now', 'Comenzar Ahora')}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Note */}
        <p className="relative z-10 mt-12 text-center text-xs text-white opacity-80 max-w-2xl px-4">
          {t('subscription.auto_renewal_note', 'La suscripción se renueva automáticamente. Puedes cancelar en cualquier momento desde tu perfil.')}
          <br />
          {t('subscription.support_note', 'El arte sacro es patrimonio de todos, pero mantenerlo vivo requiere apoyo.')}
        </p>
      </main>

      {/* Footer - Signout Status */}
      <footer className="bg-black text-white pt-16 pb-8 border-t border-white/5 z-10 mt-auto">
        <div className="max-w-[1800px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
            <div className="col-span-2 md:col-span-1 lg:col-span-1">
              <div className="w-10 h-10 bg-white rounded flex items-center justify-center mb-6">
                <span className="text-black font-serif font-bold text-xl">S</span>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-xs tracking-widest uppercase mb-6 text-gray-400">
                {t('footer.explore', 'Explorar')}
              </h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.modeling', 'Modelado')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.carving', 'Talla')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.polychromy', 'Policromía')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.materials', 'Materiales')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xs tracking-widest uppercase mb-6 text-gray-400">
                {t('footer.account', 'Cuenta')}
              </h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.my_profile', 'Mi Perfil')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.my_list', 'Mi Lista')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.certificates', 'Certificados')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.subscription', 'Suscripción')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xs tracking-widest uppercase mb-6 text-gray-400">
                {t('footer.help', 'Ayuda')}
              </h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.support', 'Soporte')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.faq', 'Preguntas Frecuentes')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.contact', 'Contacto')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xs tracking-widest uppercase mb-6 text-gray-400">
                {t('footer.legal', 'Legal')}
              </h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.terms', 'Términos')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.privacy', 'Privacidad')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.cookies', 'Cookies')}</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
              {footerSettings.footer_social_instagram && footerSettings.footer_social_instagram !== 'https://' && (
                <a
                  href={footerSettings.footer_social_instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary transition-colors"
                  aria-label="Instagram"
                >
                  <i className="fa-brands fa-instagram text-lg"></i>
                </a>
              )}
              {footerSettings.footer_social_facebook && footerSettings.footer_social_facebook !== 'https://' && (
                <a
                  href={footerSettings.footer_social_facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary transition-colors"
                  aria-label="Facebook"
                >
                  <i className="fa-brands fa-facebook text-lg"></i>
                </a>
              )}
              {footerSettings.footer_social_youtube && footerSettings.footer_social_youtube !== 'https://' && (
                <a
                  href={footerSettings.footer_social_youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary transition-colors"
                  aria-label="YouTube"
                >
                  <i className="fa-brands fa-youtube text-lg"></i>
                </a>
              )}
            </div>
            <div className="text-xs text-gray-600 font-medium">
              © {new Date().getFullYear()} SACRART. {t('footer.all_rights_reserved', 'Todos los derechos reservados')}.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SignupSubscription;

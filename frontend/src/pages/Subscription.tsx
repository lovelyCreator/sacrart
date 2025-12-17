import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { subscriptionPlanApi } from "@/services/subscriptionPlanApi";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/hooks/useLocale";

interface Plan {
  id: 'freemium' | 'basic' | 'premium';
  name: string;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
}

const Subscription = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendPlans, setBackendPlans] = useState<any[]>([]);
  const navigate = useNavigate();
  const { isAuthenticated, updateUser } = useAuth();
  const { t } = useTranslation();
  const { getPathWithLocale } = useLocale();

  useEffect(() => {
    // Load active plans from backend so we can map to Stripe price via plan id
    const loadPlans = async () => {
      try {
        const response = await subscriptionPlanApi.getPublic();
        if (response?.success && Array.isArray(response.data)) {
          setBackendPlans(response.data);
          console.log('✅ Loaded subscription plans from backend:', response.data);
          console.log('Plans with Stripe config:', response.data.map(p => ({
            id: p.id,
            name: p.name,
            display_name: p.display_name,
            price: p.price,
            has_stripe: !!p.stripe_price_id,
            stripe_price_id: p.stripe_price_id
          })));
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
    console.log('=== Plan Selected (Authenticated User) ===');
    console.log('Plan:', plan.name, 'ID:', plan.id);
    
    if (!isAuthenticated) {
      console.log('❌ Not authenticated, redirecting to login');
      toast.error(t('subscription.please_login'));
      navigate("/auth");
      return;
    }
    
    setSelectedPlan(plan.name);
    setIsLoading(true);
    
    try {
      if (plan.id === 'freemium') {
        console.log('✅ Freemium plan selected, updating locally...');
        const response = await api.updateSubscription(plan.id);
        updateUser(response.user);
        toast.success(`${t('subscription.updated')} ${plan.name}!`);
        const locale = localStorage.getItem('i18nextLng') || 'en';
        navigate(`/${locale}`);
        return;
      }

      console.log('💳 Paid plan selected for upgrade, preparing Stripe checkout...');
      console.log('Backend plans available:', backendPlans.length);

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
          return;
        }
      }

      // Find corresponding plan in backend by plan ID (freemium, basic, premium)
      // Backend plans have 'name' field that matches plan.id
      const match = backendPlans.find(p => p.name?.toLowerCase() === plan.id.toLowerCase());
      console.log('🔍 Looking for plan match:', {
        searchingFor: plan.id,
        availablePlans: backendPlans.map(p => ({ id: p.id, name: p.name, display_name: p.display_name }))
      });

      if (!match) {
        console.error('❌ Plan not found in backend:', {
          planId: plan.id,
          planName: plan.name,
          availablePlans: backendPlans.map(p => ({ id: p.id, name: p.name, display_name: p.display_name }))
        });
        toast.error(t('subscription.not_available') + ` - Plan "${plan.name}" not found. Please contact support.`);
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
        return;
      }

      console.log('✅ Plan has Stripe price ID:', match.stripe_price_id);

      // Get current locale for proper URL construction
      const locale = localStorage.getItem('i18nextLng') || 'en';
      const successUrl = `${window.location.origin}/${locale}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/${locale}/subscription?payment=cancel`;

      console.log('🚀 Creating Stripe checkout session...', {
        planId: match.id,
        successUrl,
        cancelUrl
      });

      // Use API client method with authentication
      try {
        const data = await api.createStripeCheckoutSession(match.id, successUrl, cancelUrl);
        console.log('📦 Stripe checkout response:', data);
        
        if (data?.success && data.url) {
          console.log('✅ Stripe checkout URL received, redirecting...', data.url);
          // Redirect to Stripe Checkout
          window.location.href = data.url;
          return;
        } else {
          console.error('❌ Stripe checkout failed - no URL in response:', data);
          throw new Error(data?.message || t('subscription.failed_start_checkout'));
        }
      } catch (stripeError) {
        console.error('❌ Error creating Stripe checkout session:', stripeError);
        throw stripeError;
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

  return (
    <main className="flex-grow flex flex-col justify-center items-center relative py-16 px-4 bg-background-dark font-display min-h-screen">
      {/* Background gradient effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] -right-[10%] w-[500px] h-[500px] bg-black/20 rounded-full blur-[100px]"></div>
      </div>

      {/* Header Section */}
      <div className="relative z-10 max-w-5xl w-full mx-auto text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-bold mb-4 text-white leading-tight" style={{ fontFamily: "'Cinzel', serif" }}>
          {t('subscription.hero_title', '¡Ya sabía yo que iba a querer ver más!')}
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
  );
};

export default Subscription;

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { subscriptionPlanApi } from "@/services/subscriptionPlanApi";
import { useTranslation } from "react-i18next";

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

  return (
    <div className="min-h-screen py-12 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-playfair">
            {t('subscription.choose_plan')} <span className="text-primary">{t('subscription.plan')}</span>
          </h1>
          <p className="text-xl text-muted-foreground font-montserrat">
            {t('subscription.upgrade_learning')}
          </p>
        </div>

        {backendPlans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">
              {t('subscription.no_plans') || 'No subscription plans available at the moment.'}
            </p>
            {/* <p className="text-sm text-muted-foreground">
              {t('subscription.contact_support') || 'Please contact support or check back later.'}
            </p> */}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {backendPlans.map((backendPlan, index) => {
              const isFreemium = backendPlan.name?.toLowerCase() === 'freemium';
              const isBasic = backendPlan.name?.toLowerCase() === 'basic';
              const isPopular = isBasic; // Mark basic as popular by default
              
              // Parse features from description (one feature per line)
              const parseFeatures = (description: string | undefined | null): string[] => {
                if (!description) return [];
                return description
                  .split(/\r?\n/)
                  .map(line => line.trim())
                  .filter(line => line.length > 0);
              };
              
              // Get features - handle both array and JSON string formats
              let features: string[] = [];
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
                planFeatures.push(`${backendPlan.max_devices} ${backendPlan.max_devices === 1 ? 'Device' : 'Devices'}`);
              }
              
              // Video Quality
              if (backendPlan.video_quality) {
                planFeatures.push(`${backendPlan.video_quality} Quality`);
              }
              
              // Downloadable Content
              if (backendPlan.downloadable_content) {
                planFeatures.push('Downloadable Content');
              }
              
              // Certificates
              if (backendPlan.certificates) {
                planFeatures.push('Certificates of Completion');
              }
              
              // Priority Support
              if (backendPlan.priority_support) {
                planFeatures.push('Priority Support');
              }
              
              // Ad Free
              if (backendPlan.ad_free) {
                planFeatures.push('Ad-Free Experience');
              }
              
              // Combine custom features with plan features
              const allFeatures = [...features, ...planFeatures];
              
              const displayPrice = isFreemium 
                ? t('subscription.plan_prices.free')
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
                      // Double-check before calling toFixed
                      if (typeof price === 'number' && !isNaN(price) && isFinite(price)) {
                        return `€${price.toFixed(2)}`;
                      }
                      return '€0.00';
                    } catch (error) {
                      console.error('Error formatting price:', error, backendPlan);
                      return '€0.00';
                    }
                  })();
              
              const hasStripe = backendPlan.stripe_price_id || isFreemium;
              const isStripeReady = isFreemium || hasStripe;
              
              return (
                <Card
                  key={backendPlan.id}
                  className={`p-8 relative hover:shadow-2xl transition-all duration-300 animate-slide-up flex flex-col ${
                    isPopular ? "border-primary border-2 scale-105" : ""
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                      {t('subscription.most_popular')}
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2 font-playfair">
                      {backendPlan.display_name || backendPlan.name}
                    </h3>
                    <div className="flex items-baseline justify-center mb-3">
                      <span className="text-4xl font-bold text-primary font-playfair">{displayPrice}</span>
                      {!isFreemium && (
                        <span className="text-muted-foreground ml-1 font-montserrat">
                          /{t('subscription.plan_prices.monthly_period')}
                        </span>
                      )}
                    </div>
                    {backendPlan.description && (
                      <p className="text-sm text-muted-foreground font-montserrat px-2 line-clamp-3">
                        {backendPlan.description.split('\n')[0]}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-grow">
                    {allFeatures.length > 0 ? (
                      allFeatures.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-foreground/80 font-montserrat">{feature}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground text-sm">
                        {t('subscription.no_features_listed') || 'Features coming soon'}
                      </li>
                    )}
                  </ul>

                  {!isStripeReady && !isFreemium && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        ⚠️ Payment not configured. This plan requires Stripe setup.
                      </p>
                    </div>
                  )}
                  
                  <Button
                    variant={isPopular ? "hero" : "outline"}
                    className="w-full"
                    size="lg"
                    onClick={() => handleSelectPlan({
                      id: backendPlan.name.toLowerCase() as 'freemium' | 'basic' | 'premium',
                      name: backendPlan.display_name || backendPlan.name,
                      price: displayPrice,
                      period: isFreemium ? '' : t('subscription.plan_prices.monthly_period'),
                      features: features,
                      popular: isPopular
                    })}
                    disabled={isLoading || (!isStripeReady && !isFreemium)}
                  >
                    {isLoading && selectedPlan === backendPlan.name
                      ? t('subscription.processing')
                      : !isStripeReady && !isFreemium
                        ? 'Payment Not Available'
                      : isFreemium
                        ? t('subscription.select_freemium')
                      : isBasic
                        ? t('subscription.select_basic')
                        : t('subscription.select_premium')}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-center">
          {/* <p className="text-muted-foreground mb-2 font-montserrat">{t('subscription.all_plans_trial')}</p> */}
          <button
            onClick={() => {
              const locale = localStorage.getItem('i18nextLng') || 'en';
              navigate(`/${locale}`);
            }}
            className="text-primary hover:underline font-montserrat"
          >
            {t('subscription.maybe_later')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Subscription;

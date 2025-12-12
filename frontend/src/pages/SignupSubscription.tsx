import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
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

const SignupSubscription = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendPlans, setBackendPlans] = useState<any[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const { t } = useTranslation();

  // Check if state contains signup data (email, password, name)
  const signupData = location.state as { email: string; password: string; name: string } | null;

  // Redirect to auth if no signup data
  useEffect(() => {
    if (!signupData || !signupData.email || !signupData.password || !signupData.name) {
      console.warn('No signup data found, redirecting to auth');
      toast.error(t('subscription.missing_info') || 'Please complete registration first');
      navigate("/auth");
    }
  }, [signupData, navigate, t]);

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

  if (!signupData) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-playfair">
            {t('subscription.choose_plan')} <span className="text-primary">{t('subscription.plan')}</span>
          </h1>
          <p className="text-xl text-muted-foreground font-montserrat">
            {t('subscription.select_plan_complete')}
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
              
              const features = backendPlan.features && Array.isArray(backendPlan.features) 
                ? backendPlan.features 
                : parseFeatures(backendPlan.description);
              
              const displayPrice = isFreemium 
                ? t('subscription.plan_prices.free')
                : `€${Number(backendPlan.price).toFixed(2)}`;
              
              const hasStripe = backendPlan.stripe_price_id || isFreemium;
              const isStripeReady = isFreemium || hasStripe;
              
              return (
                <Card
                  key={backendPlan.id}
                  className={`p-8 relative hover:shadow-2xl transition-all duration-300 animate-slide-up ${
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
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-primary font-playfair">{displayPrice}</span>
                      {!isFreemium && (
                        <span className="text-muted-foreground ml-1 font-montserrat">
                          /{t('subscription.plan_prices.monthly_period')}
                        </span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {features.length > 0 ? (
                      features.map((feature, idx) => (
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
                        : `${t('subscription.start_with')} ${backendPlan.display_name || backendPlan.name}`}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-center">
          <p className="text-muted-foreground mb-2 font-montserrat">{t('subscription.all_plans_trial')}</p>
          <button
            onClick={() => navigate("/auth")}
            className="text-primary hover:underline font-montserrat"
          >
            {t('subscription.back_signup')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignupSubscription;



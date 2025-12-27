import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/hooks/useLocale";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import logoImage from "@/assets/logo-transparente.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { getPathWithLocale, navigateWithLocale } = useLocale();

  // Background image URL from code.html
  const backgroundImageUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuCVfyR5ZlrKMKk0bXi_PlREAZwG2wlaY06GKkG7vqFruULd0d0gpN0MEF6YiBqrbSFJT9ywwTfvnbw9hEiuchbe0vyFrJQ7DWQWu7HLcMBHpDhZE9ng1i26YkG_Zt-jK_MJCbqYiTwhboc2c51KKDBRTK0njNkXpZeJWUe1fZ6YDybG3E3Qot1WQs7Hyh9R0FGYNUoT_stmSZWEt9dX2HC7GztEg0Qp8z5hTL7z-72asg1TYvAZyUShP6cXQ3Wo1CNvZdA5V-40xFk";

  // Handle email from navigation state or localStorage, and signup mode
  useEffect(() => {
    const stateEmail = location.state?.email;
    const stateMode = location.state?.mode;
    const storedEmail = localStorage.getItem('signup_email');
    const urlParams = new URLSearchParams(location.search);
    const urlMode = urlParams.get('mode');
    
    // Check if signup mode is requested (from state, URL param, or email provided)
    if (stateMode === 'signup' || urlMode === 'signup') {
      setIsLogin(false);
    }
    
    if (stateEmail) {
      setEmail(stateEmail);
      setIsLogin(false); // Switch to signup mode if email is provided
    } else if (storedEmail) {
      setEmail(storedEmail);
      setIsLogin(false); // Switch to signup mode if email is provided
      localStorage.removeItem('signup_email'); // Clean up
    }
  }, [location.state, location.search]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.is_admin) {
        navigate("/admin");
      } else {
        const locale = localStorage.getItem('i18nextLng') || 'en';
        navigate(`/${locale}`);
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== Form submitted ===');
    console.log('Is Login:', isLogin);
    console.log('Email:', email);
    setIsLoading(true);
    
    try {
      if (isLogin) {
        console.log('Calling login function...');
               const loginResponse = await login(email, password);
               console.log('Login successful!');
               toast.success(t('auth.login_successful'));
               
               // Check if user is admin and redirect accordingly
               if (loginResponse?.is_admin) {
                 const locale = localStorage.getItem('i18nextLng') || 'en';
                 navigate(`/${locale}/admin`);
               } else {
                 const locale = localStorage.getItem('i18nextLng') || 'en';
                 navigate(`/${locale}`);
               }
      } else {
        // Validate passwords match
        if (password !== confirmPassword) {
          toast.error(t('auth.passwords_dont_match', 'Las contraseñas no coinciden'));
          setIsLoading(false);
          return;
        }

        // Validate terms accepted
        if (!acceptedTerms) {
          toast.error(t('auth.accept_terms', 'Debes aceptar los términos y condiciones'));
          setIsLoading(false);
          return;
        }

        // Combine first and last name
        const fullName = `${firstName} ${lastName}`.trim();
        if (!fullName) {
          toast.error(t('auth.name_required', 'El nombre es requerido'));
          setIsLoading(false);
          return;
        }

        console.log('Redirecting to signup subscription page...');
        // Redirect to signup subscription page for signup
        const locale = localStorage.getItem('i18nextLng') || 'en';
        navigate(`/${locale}/signup-subscription`, { state: { email, password, name: fullName } });
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : t('auth.authentication_failed');
      console.error('Error message:', errorMessage);
      toast.error(errorMessage);
    } finally {
      console.log('Form submission complete');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-white overflow-x-hidden flex flex-col">
      <main className="flex-1 flex flex-col md:flex-row min-h-screen pt-[72px] md:pt-0">
        {/* Left Side - Background Image (Desktop only) */}
        <div className="w-full md:w-1/2 relative min-h-[300px] md:min-h-screen hidden md:block">
          <div 
            className="absolute inset-0 bg-cover bg-center" 
            style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[#A05245]/10 mix-blend-overlay" />
          <div className="absolute top-8 left-10 z-20">
            <img 
              alt="SACRART Logo White" 
              className="h-16 w-auto object-contain opacity-90 drop-shadow-lg" 
                src={logoImage} 
            />
          </div>
          <div className="absolute bottom-12 left-10 z-20 max-w-lg">
            <p className="text-white/90 text-xl font-serif italic drop-shadow-md">
              {t('auth.quote', '"El arte es la oración hecha visible."')}
          </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 bg-[#0A0A0A] relative flex items-center justify-center p-6 md:p-12 lg:p-20">
          {/* Texture Pattern Overlay */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`
            }}
          />
          
          <div className="w-full max-w-md relative z-10">
            {/* Header */}
            <div className="mb-10 text-center md:text-left">
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                {isLogin 
                  ? t('auth.welcome_title', 'Bienvenido a Sacrart.')
                  : t('auth.create_account_title', 'Crea tu cuenta.')
                }
              </h1>
              <p className="text-[#b99da6] text-base font-light">
                {isLogin
                  ? t('auth.welcome_subtitle', 'Tu taller digital de arte sacro. Inicia sesión para continuar.')
                  : t('auth.create_account_subtitle', 'Únete a la comunidad de Sacrart y empieza a aprender.')
                }
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 mb-8">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`pb-3 px-4 text-sm font-bold uppercase tracking-wider transition-colors focus:outline-none w-1/2 md:w-auto text-center ${
                  isLogin
                    ? 'text-[#A05245] border-b-2 border-[#A05245]'
                    : 'text-gray-500 hover:text-white border-b-2 border-transparent'
                }`}
              >
                {t('auth.sign_in', 'Iniciar Sesión')}
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`pb-3 px-4 text-sm font-bold uppercase tracking-wider transition-colors focus:outline-none w-1/2 md:w-auto text-center ${
                  !isLogin
                    ? 'text-[#A05245] border-b-2 border-[#A05245]'
                    : 'text-gray-500 hover:text-white border-b-2 border-transparent'
                }`}
              >
                {t('auth.sign_up', 'Registrarse')}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Register: First Name and Last Name */}
          {!isLogin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400" htmlFor="firstname">
                      {t('auth.first_name', 'Nombre')}
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="text-gray-500 group-focus-within:text-[#A05245] transition-colors w-5 h-5" />
                      </div>
                      <input
                        className="block w-full pl-10 pr-3 py-3 bg-[#161616] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#A05245] focus:border-[#A05245] transition-all sm:text-sm"
                        id="firstname"
                        placeholder={t('auth.first_name_placeholder', 'Tu Nombre')}
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required={!isLogin}
                      />
                    </div>
                  </div>
            <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400" htmlFor="lastname">
                      {t('auth.last_name', 'Apellidos')}
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="text-gray-500 group-focus-within:text-[#A05245] transition-colors w-5 h-5" />
                      </div>
                      <input
                        className="block w-full pl-10 pr-3 py-3 bg-[#161616] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#A05245] focus:border-[#A05245] transition-all sm:text-sm"
                        id="lastname"
                        placeholder={t('auth.last_name_placeholder', 'Tus Apellidos')}
                type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required={!isLogin}
              />
                    </div>
                  </div>
            </div>
          )}

              {/* Email */}
          <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400" htmlFor="email">
                  {t('auth.email', 'Correo Electrónico')}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="text-gray-500 group-focus-within:text-[#A05245] transition-colors w-5 h-5" />
                  </div>
                  <input
                    className="block w-full pl-10 pr-3 py-3 bg-[#161616] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#A05245] focus:border-[#A05245] transition-all sm:text-sm"
              id="email"
                    placeholder={t('auth.email_placeholder', 'tu@email.com')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
                </div>
          </div>

              {/* Password */}
          <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400" htmlFor="password">
                  {t('auth.password', 'Contraseña')}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="text-gray-500 group-focus-within:text-[#A05245] transition-colors w-5 h-5" />
                  </div>
                  <input
                    className="block w-full pl-10 pr-10 py-3 bg-[#161616] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#A05245] focus:border-[#A05245] transition-all sm:text-sm"
              id="password"
                    placeholder={t('auth.password_placeholder', '••••••')}
                    type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
                  <div 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-500 hover:text-white transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </div>
                </div>
          </div>

              {/* Register: Confirm Password */}
              {!isLogin && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400" htmlFor="password_confirm">
                    {t('auth.confirm_password', 'Confirmar Contraseña')}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="text-gray-500 group-focus-within:text-[#A05245] transition-colors w-5 h-5" />
                    </div>
                    <input
                      className="block w-full pl-10 pr-3 py-3 bg-[#161616] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#A05245] focus:border-[#A05245] transition-all sm:text-sm"
                      id="password_confirm"
                      placeholder={t('auth.password_placeholder', '••••••')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              {/* Login: Remember Me and Forgot Password */}
              {isLogin && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      className="h-4 w-4 text-[#A05245] bg-[#161616] border-white/20 rounded focus:ring-[#A05245] focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer"
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <label className="ml-2 block text-sm text-gray-400 cursor-pointer select-none" htmlFor="remember-me">
                      {t('auth.remember_me', 'Recordarme')}
                    </label>
                  </div>
                  <div className="text-sm">
                    <Link
                      to={getPathWithLocale('/forgot-password')}
                      className="font-medium text-[#A05245] hover:text-[#A05245]/80 transition-colors"
                    >
                      {t('auth.forgot_password', '¿He olvidado mi contraseña?')}
                    </Link>
                  </div>
                </div>
              )}

              {/* Register: Terms Checkbox */}
              {!isLogin && (
                <div className="flex items-start mt-4">
                  <input
                    className="mt-1 h-4 w-4 text-[#A05245] bg-[#161616] border-white/20 rounded focus:ring-[#A05245] focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer"
                    id="terms"
                    name="terms"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    required={!isLogin}
                  />
                  <label className="ml-2 block text-xs text-gray-400 cursor-pointer select-none leading-relaxed" htmlFor="terms">
                    {t('auth.accept_terms_text', 'Acepto los')}{' '}
                    <Link to={getPathWithLocale('/terms')} className="text-[#A05245] hover:text-[#A05245]/80 underline">
                      {t('auth.terms', 'Términos y Condiciones')}
                    </Link>
                    {' '}{t('auth.and', 'y la')}{' '}
                    <Link to={getPathWithLocale('/privacy')} className="text-[#A05245] hover:text-[#A05245]/80 underline">
                      {t('auth.privacy_policy', 'Política de Privacidad')}
                    </Link>
                    .
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <div>
                <button
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-[#A05245] to-[#8a463b] hover:from-[#b35b4c] hover:to-[#9e5043] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A05245] focus:ring-offset-[#0A0A0A] transition-all transform hover:scale-[1.01] uppercase tracking-widest shadow-lg shadow-[#A05245]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            type="submit" 
            disabled={isLoading}
          >
                  {isLoading 
                    ? t('common.loading', 'Cargando...')
                    : isLogin 
                      ? t('auth.sign_in', 'Iniciar Sesión')
                      : t('auth.create_account', 'Crear Cuenta')
                  }
                </button>
              </div>
        </form>

            {/* Social Login */}
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#0A0A0A] text-gray-500">
                    {isLogin 
                      ? t('auth.or_login_with', 'O accede con')
                      : t('auth.or_register_with', 'O regístrate con')
                    }
                  </span>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <a
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-white/10 rounded-lg shadow-sm bg-[#161616] text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info(t('auth.social_login_coming_soon', 'Inicio de sesión social próximamente'));
                  }}
                >
                  <i className="fa-brands fa-google text-lg mr-2"></i>
                  <span className="hidden sm:inline">Google</span>
                </a>
                <a
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-white/10 rounded-lg shadow-sm bg-[#161616] text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info(t('auth.social_login_coming_soon', 'Inicio de sesión social próximamente'));
                  }}
                >
                  <i className="fa-brands fa-apple text-xl mr-2"></i>
                  <span className="hidden sm:inline">Apple</span>
                </a>
              </div>
            </div>

            {/* Terms Footer */}
            <p className="mt-8 text-center text-xs text-gray-500">
              {t('auth.terms_footer', 'Al continuar, aceptas nuestros')}{' '}
              <Link to={getPathWithLocale('/terms')} className="underline hover:text-white">
                {t('auth.terms', 'Términos de servicio')}
              </Link>
              {' '}{t('auth.and', 'y')}{' '}
              <Link to={getPathWithLocale('/privacy')} className="underline hover:text-white">
                {t('auth.privacy_policy', 'Política de privacidad')}
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
